import type { SubscriptionOverride } from '@prisma/client';

import prisma from '../lib/prisma';
import { parseFeatures } from './plan.service';

/**
 * ─── CONCESSÃO MANUAL POR ORGANIZAÇÃO (`SubscriptionOverride`) ───────────────
 *
 * O problema que isto resolve está escrito no schema: até aqui, "libera o Power
 * BI para fechar a venda" só era possível editando a linha `Plan` — que vale
 * para TODOS os assinantes daquele plano. Uma concessão para um cliente virava
 * uma entrega gratuita para a base inteira, e ninguém percebia porque não existe
 * tela que mostre o catálogo efetivo por cliente.
 *
 * ── Três invariantes deste arquivo (nenhuma é estilo) ────────────────────────
 *
 * 1. **Override VENCIDO não vale, e não depende de job para deixar de valer.**
 *    Toda leitura compara `expiresAt` com o instante da consulta. Se a expiração
 *    dependesse de uma varredura periódica, um job parado (deploy, container
 *    reiniciado, cron esquecido) manteria a cortesia de 30 dias valendo para
 *    sempre — que é exatamente o vazamento de receita que `expiresAt` foi criado
 *    para fechar. A mesma lição de `isPastDueGraceExpired`: o relógio é o
 *    `SELECT`, nunca a memória do processo.
 *
 * 2. **Override só CONCEDE, nunca retira.** O schema diz que os limites
 *    "substituem" os do plano; a resolução aqui honra isso na direção que
 *    entrega, escolhendo sempre o limite mais permissivo entre plano e
 *    concessão. O motivo é operacional: este campo é preenchido por uma pessoa
 *    numa negociação, e um número menor digitado por engano derrubaria telas de
 *    um cliente pagante através de um recurso cuja razão de existir é dar. Quem
 *    reduz direito é a troca de plano, que tem `findDowngradeBlocker` para
 *    avisar o que vai quebrar; aqui não há aviso nenhum.
 *
 * 3. **Falha ao ler o override nunca nega o que o plano já dá.** Por isso os
 *    métodos consultados pelos gates engolem o próprio erro e devolvem "sem
 *    concessão": no pior caso o cliente perde a cortesia (recuperável com um
 *    F5), nunca o que ele contratou.
 */

/** Erro de concessão, com o material que a rota traduz em resposta HTTP. */
export class SubscriptionOverrideError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'SubscriptionOverrideError';
  }
}

/**
 * Direitos EFETIVOS de uma organização: plano ∪ concessão ativa.
 *
 * `null` em um limite significa ILIMITADO — mesma convenção de `Plan`. Não
 * confundir com "não sei": a ausência de dado aqui também resolve para
 * ilimitado, de propósito (ver `resolveEntitlements`).
 */
export interface ResolvedEntitlements {
  features: string[];
  maxDevices: number | null;
  maxUsers: number | null;
}

export interface UpsertOverrideInput {
  organizationId: string;
  /** Features SOMADAS às do plano. */
  extraFeatures: string[];
  maxDevices: number | null;
  maxUsers: number | null;
  /** Motivo da concessão — vai para `note`, obrigatório no schema. */
  note: string;
  /** `null` = sem prazo. Ver a invariante 1 no topo. */
  expiresAt: Date | null;
  setByUserId: string;
}

/**
 * `true` quando a concessão ainda vale. Função pura.
 *
 * Sem `expiresAt` a concessão é perpétua — é a leitura correta do schema
 * ("nulo = sem prazo"), e não um dado faltando.
 */
export function isOverrideActive(
  override: { expiresAt: Date | null } | null | undefined,
  now: Date = new Date()
): boolean {
  if (!override) return false;
  if (!override.expiresAt) return true;
  return override.expiresAt.getTime() > now.getTime();
}

/**
 * Features concedidas por um override, ou `[]` quando ele venceu. Função pura.
 *
 * `extraFeatures` usa o MESMO formato de `Plan.features` (JSON array em texto) e
 * o mesmo parser defensivo: um JSON corrompido vira lista vazia em vez de
 * exceção, porque o efeito de estourar aqui seria derrubar o gate de feature de
 * quem não tem nada a ver com a concessão.
 */
export function overrideFeatures(
  override: { extraFeatures: string; expiresAt: Date | null } | null | undefined,
  now: Date = new Date()
): string[] {
  if (!isOverrideActive(override, now)) return [];
  return parseFeatures(override?.extraFeatures ?? null);
}

/**
 * Limite mais permissivo entre plano e concessão. Função pura.
 *
 * `null` (ilimitado) vence qualquer número — inclusive um número da concessão:
 * um plano ilimitado com override de 5 telas continua ilimitado. Ver a
 * invariante 2 no topo; sem esta regra o override viraria uma trava, e nenhuma
 * tela do backoffice avisaria o operador disso.
 */
export function mostPermissiveLimit(
  planLimit: number | null,
  overrideLimit: number | null | undefined
): number | null {
  if (planLimit === null) return null;
  if (overrideLimit === null || overrideLimit === undefined) return planLimit;
  if (overrideLimit === 0) return planLimit;
  return Math.max(planLimit, overrideLimit);
}

export class SubscriptionOverrideService {
  /**
   * Concessão da organização COMO ESTÁ NO BANCO — inclusive vencida.
   *
   * O backoffice precisa enxergar a concessão expirada (é o histórico de "este
   * cliente teve Power BI por 30 dias em agosto"); quem NÃO pode enxergá-la é o
   * gate, e para isso existe `getActive`. Ter os dois separados evita a
   * tentação de apagar a linha vencida — o que apagaria junto a resposta de "por
   * que este cliente usou isso".
   */
  async getByOrganization(organizationId: string): Promise<SubscriptionOverride | null> {
    return prisma.subscriptionOverride.findFirst({
      where: { subscription: { organizationId } },
    });
  }

  /**
   * Concessão VÁLIDA agora, ou `null`.
   *
   * Nunca lança: é o método que os gates chamam, e a invariante 3 diz que uma
   * falha de leitura aqui não pode virar negação de acesso. O erro é logado
   * porque uma concessão que sumiu em silêncio é um chamado de suporte
   * insolúvel ("ontem funcionava").
   */
  async getActive(
    organizationId: string,
    now: Date = new Date()
  ): Promise<SubscriptionOverride | null> {
    try {
      const override = await this.getByOrganization(organizationId);
      return isOverrideActive(override, now) ? override : null;
    } catch (error) {
      console.error(`[override] falha ao ler concessão de ${organizationId}:`, error);
      return null;
    }
  }

  /**
   * `true` quando a CONCESSÃO libera `featureKey`.
   *
   * Responde só pela concessão, nunca pelo plano — quem chama já verificou o
   * plano antes e só chega aqui quando ia negar. Essa ordem é o que garante a
   * invariante 3 estruturalmente, em vez de por disciplina: se o override não
   * for consultado no caminho de quem TEM direito pelo plano, nenhuma falha
   * dele pode tirar esse direito.
   */
  async grantsFeature(
    organizationId: string,
    featureKey: string,
    now: Date = new Date()
  ): Promise<boolean> {
    const override = await this.getActive(organizationId, now);
    return overrideFeatures(override, now).includes(featureKey);
  }

  /**
   * Direitos efetivos da organização: plano ∪ concessão ativa.
   *
   * Organização SEM assinatura devolve `{ [], null, null }` — features nenhuma e
   * limites ilimitados. Não é descuido: é a mesma decisão já registrada em
   * `entitlement.service.ts` e no `requireFeature` (fail-open para organização
   * legada, anterior à cobrança). Quem barra conta sem assinatura é
   * `requireActiveSubscription`; responder "0 telas" aqui derrubaria contas
   * antigas por dado ausente, não por decisão comercial.
   */
  async resolveEntitlements(
    organizationId: string,
    now: Date = new Date()
  ): Promise<ResolvedEntitlements> {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true, override: true },
    });

    if (!subscription) {
      return { features: [], maxDevices: null, maxUsers: null };
    }

    const planFeatures = parseFeatures(subscription.plan.features);
    const extra = overrideFeatures(subscription.override, now);
    const active = isOverrideActive(subscription.override, now) ? subscription.override : null;

    return {
      // `Set` e não `concat`: o operador pode conceder uma feature que o plano
      // já tem (acontece quando ele não sabe o que o plano inclui), e a lista
      // duplicada apareceria duas vezes na tela de detalhe do cliente.
      features: [...new Set([...planFeatures, ...extra])],
      maxDevices: mostPermissiveLimit(subscription.plan.maxDevices, active?.maxDevices),
      maxUsers: mostPermissiveLimit(subscription.plan.maxUsers, active?.maxUsers),
    };
  }

  /**
   * Cria ou substitui a concessão da organização.
   *
   * SUBSTITUI, não mescla: o corpo enviado é o estado completo da concessão. É a
   * semântica de `PUT` e é a única que o operador consegue prever — um merge
   * faria "remover uma feature" ser impossível pela tela, e a lista cresceria
   * para sempre a cada edição.
   */
  async upsert(input: UpsertOverrideInput): Promise<SubscriptionOverride> {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: input.organizationId },
      select: { id: true },
    });

    if (!subscription) {
      throw new SubscriptionOverrideError(
        'Esta organização não tem assinatura, então não há o que conceder. Crie a assinatura antes.',
        409,
        'subscription_not_found'
      );
    }

    const data = {
      extraFeatures: JSON.stringify(input.extraFeatures),
      maxDevices: input.maxDevices,
      maxUsers: input.maxUsers,
      note: input.note,
      expiresAt: input.expiresAt,
      setByUserId: input.setByUserId,
    };

    return prisma.subscriptionOverride.upsert({
      where: { subscriptionId: subscription.id },
      create: { subscriptionId: subscription.id, ...data },
      update: data,
    });
  }

  /**
   * Remove a concessão. `false` quando não havia nenhuma.
   *
   * Devolver `false` em vez de lançar é deliberado: a rota é idempotente e o
   * operador que clica duas vezes em "remover" não deve ver um erro por ter
   * conseguido o que queria. O registro do que existiu fica no `AuditLog` que a
   * rota grava ANTES de apagar — depois do `delete` a linha não existe mais para
   * ser descrita.
   */
  async remove(organizationId: string): Promise<boolean> {
    const existing = await this.getByOrganization(organizationId);
    if (!existing) return false;

    await prisma.subscriptionOverride.delete({
      where: { subscriptionId: existing.subscriptionId },
    });
    return true;
  }
}

export const subscriptionOverrideService = new SubscriptionOverrideService();
