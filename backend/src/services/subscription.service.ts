import prisma from '../lib/prisma';
import type { Plan, Prisma, Subscription } from '@prisma/client';
import { FEATURE_QUOTE_ONLY, parseFeatures, planService } from './plan.service';

/**
 * Duração de um período de avaliação, em dias.
 *
 * A entrada padrão do produto NÃO é mais trial (é freemium — ver
 * `FREE_PLAN_CODE`), mas o suporte a `trialing`/`trialEndsAt` continua vivo no
 * schema e neste serviço para um trial promocional futuro (ex.: 14 dias de
 * `rede` liberados numa campanha).
 */
export const TRIAL_DAYS = 14;

/**
 * Código do plano criado no auto-cadastro: freemium, 1 tela grátis para sempre,
 * sem prazo e sem cartão. Precisa existir no banco (`npm run db:seed-plans`).
 */
export const FREE_PLAN_CODE = 'gratis';

/**
 * @deprecated O plano `trial` de 14 dias foi descontinuado em 2026-07-25 e o
 * seed o marca `active: false`, remanejando as assinaturas para `gratis`.
 * Mantido apenas para código legado/migração se referir ao code antigo.
 */
export const LEGACY_TRIAL_PLAN_CODE = 'trial';

/**
 * Planos pagos oferecidos como upgrade a quem estourou o plano grátis, na ordem
 * do catálogo. Usado por `suggestUpgradeFor()`.
 */
export const UPGRADE_PLAN_CODES = ['loja', 'rede'] as const;

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export type SubscriptionWithPlan = Subscription & { plan: Plan };

/** Recursos sujeitos a quota. */
export type QuotaResource = 'device' | 'user' | 'organization';

export interface UsageEntry {
  used: number;
  /** `null` = ilimitado. */
  limit: number | null;
  /** `true` quando `limit` não é nulo e `used >= limit`. */
  atLimit: boolean;
}

export interface Usage {
  organizationId: string;
  planCode: string;
  planName: string;
  /** Preço por tela/mês do plano contratado, em centavos (0 = grátis/consulta). */
  pricePerScreenCents: number;
  /** Piso de telas cobradas no plano contratado. */
  minScreens: number;
  /** `true` quando o plano não gera fatura (plano `gratis`). */
  freePlan: boolean;
  devices: UsageEntry;
  users: UsageEntry;
  organizations: UsageEntry;
}

function entry(used: number, limit: number | null): UsageEntry {
  return { used, limit, atLimit: limit !== null && used >= limit };
}

/**
 * Data em que um trial promocional expira, contada a partir de `from`.
 * Não é usada no fluxo padrão de cadastro (que é freemium, sem prazo).
 */
export function trialEndDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

/** `true` quando o plano não gera fatura (plano grátis). */
export function isFreePlan(
  plan: { pricePerScreenCents: number; features?: string | null } | null | undefined
): boolean {
  if (!plan) return false;
  return plan.pricePerScreenCents === 0 && !parseFeatures(plan.features ?? null).includes(FEATURE_QUOTE_ONLY);
}

/**
 * Valor mensal previsto da assinatura, em centavos. Função pura.
 *
 *   max(telas ativas, plan.minScreens) × plan.pricePerScreenCents
 *
 * O piso `minScreens` existe porque o plano `rede` troca preço por tela mais
 * baixo por um compromisso mínimo de 5 telas — com 3 telas ativas, a fatura
 * ainda é de 5. Devolve `0` para plano grátis e para plano sob consulta
 * (Enterprise), onde `pricePerScreenCents = 0` não significa gratuito.
 */
export function estimateMonthlyCents(
  plan: { pricePerScreenCents: number; minScreens: number; features?: string | null },
  activeDevices: number
): number {
  const features = parseFeatures(plan.features ?? null);
  if (features.includes(FEATURE_QUOTE_ONLY)) return 0;
  if (plan.pricePerScreenCents <= 0) return 0;

  const billedScreens = Math.max(activeDevices, plan.minScreens, 0);
  return billedScreens * plan.pricePerScreenCents;
}

/** Quantas telas entram na fatura (piso de `minScreens`). Função pura. */
export function billedScreens(plan: { minScreens: number }, activeDevices: number): number {
  return Math.max(activeDevices, plan.minScreens, 0);
}

/**
 * Uma assinatura é válida quando está `active`, ou `trialing` dentro do prazo.
 * `past_due`, `canceled` e trial vencido são inválidos.
 *
 * No mundo freemium, a assinatura do plano `gratis` nasce `active` com
 * `trialEndsAt: null` e portanto NUNCA expira — não existe mais "trial vencido"
 * no caminho padrão. O ramo `trialing` sobrevive apenas para trials
 * promocionais (ver `TRIAL_DAYS`).
 */
export function isActive(
  subscription: { status: string; trialEndsAt?: Date | null } | null | undefined,
  now: Date = new Date()
): boolean {
  if (!subscription) return false;

  switch (subscription.status) {
    case 'active':
      return true;
    case 'trialing':
      // Sem data de término registrada, tratamos como trial ainda aberto —
      // é preferível a bloquear um tenant por dado faltante.
      if (!subscription.trialEndsAt) return true;
      return subscription.trialEndsAt.getTime() > now.getTime();
    default:
      return false;
  }
}

/**
 * Dias restantes de trial (0 quando não está em trial ou já venceu).
 * Continua funcionando para quem tiver `trialEndsAt` preenchido — no plano
 * grátis o campo é `null` e o resultado é sempre 0.
 */
export function trialDaysRemaining(
  subscription: { status: string; trialEndsAt?: Date | null } | null | undefined,
  now: Date = new Date()
): number {
  if (!subscription || subscription.status !== 'trialing' || !subscription.trialEndsAt) return 0;
  const ms = subscription.trialEndsAt.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/** Motivo legível (pt-BR) pelo qual a assinatura está inválida. */
export function inactiveReason(
  subscription: { status: string; trialEndsAt?: Date | null } | null | undefined,
  now: Date = new Date()
): string {
  if (!subscription) {
    return 'Nenhuma assinatura encontrada para esta conta. Escolha um plano para continuar.';
  }
  if (subscription.status === 'trialing') {
    // Só alcançável em assinaturas de trial promocional (o plano grátis é
    // `active` e sem prazo).
    return 'Seu período promocional terminou. Escolha um plano para continuar usando o TelaHub — ou volte para o plano Grátis, que mantém 1 tela para sempre.';
  }
  if (subscription.status === 'past_due') {
    return 'Há uma fatura em aberto na sua conta. Regularize o pagamento para reativar o acesso.';
  }
  if (subscription.status === 'canceled') {
    return 'Sua assinatura foi cancelada. Reative um plano para voltar a usar o TelaHub.';
  }
  return 'Sua assinatura não está ativa. Verifique a área de cobrança.';
}

export class SubscriptionService {
  /**
   * Cria a assinatura de entrada de uma organização: plano `gratis`, `active` e
   * SEM prazo (`trialEndsAt: null`) — 1 tela grátis para sempre, sem cartão.
   *
   * Aceita um `Prisma.TransactionClient` para ser chamada de dentro da
   * transação do signup.
   */
  async createFreeSubscription(
    organizationId: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<Subscription> {
    const plan = await tx.plan.findUnique({ where: { code: FREE_PLAN_CODE } });
    if (!plan) {
      throw new Error(
        `Plano "${FREE_PLAN_CODE}" não encontrado. Rode "npm run db:seed-plans" antes de liberar cadastros.`
      );
    }

    return tx.subscription.create({
      data: {
        organizationId,
        planId: plan.id,
        status: 'active',
        // Freemium não expira. Nunca preencher aqui — `trialEndsAt` é
        // exclusivo de trials promocionais.
        trialEndsAt: null,
      },
    });
  }

  async getByOrganization(organizationId: string): Promise<SubscriptionWithPlan | null> {
    return prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });
  }

  /** Como `getByOrganization`, mas lança quando não existe. */
  async requireByOrganization(organizationId: string): Promise<SubscriptionWithPlan> {
    const subscription = await this.getByOrganization(organizationId);
    if (!subscription) {
      throw new Error('Nenhuma assinatura encontrada para esta organização.');
    }
    return subscription;
  }

  /**
   * Troca o plano da assinatura. Recusa downgrade quando o uso atual estoura
   * algum limite do plano de destino — o chamador deve mapear para 400.
   */
  async changePlan(organizationId: string, planCode: string): Promise<SubscriptionWithPlan> {
    const subscription = await this.requireByOrganization(organizationId);
    const plan = await planService.getByCode(planCode);

    if (!plan || !plan.active) {
      throw new Error(`Plano "${planCode}" não está disponível para contratação.`);
    }

    if (plan.id === subscription.planId) {
      return subscription;
    }

    const blocker = await this.findDowngradeBlocker(organizationId, plan);
    if (blocker) {
      throw new Error(blocker);
    }

    return prisma.subscription.update({
      where: { organizationId },
      data: { planId: plan.id },
      include: { plan: true },
    });
  }

  /**
   * Retorna a mensagem do primeiro recurso que impede a migração para `plan`,
   * ou `null` quando a troca é permitida.
   */
  async findDowngradeBlocker(organizationId: string, plan: Plan): Promise<string | null> {
    const counts = await this.countResources(organizationId);

    const checks: Array<{ label: string; used: number; limit: number | null }> = [
      { label: 'telas ativas', used: counts.devices, limit: plan.maxDevices },
      { label: 'usuários', used: counts.users, limit: plan.maxUsers },
      { label: 'organizações', used: counts.organizations, limit: plan.maxOrganizations },
    ];

    for (const check of checks) {
      if (check.limit !== null && check.used > check.limit) {
        return (
          `Não é possível mudar para o plano ${plan.name}: você usa ${check.used} ${check.label} ` +
          `e o limite do plano é ${check.limit}. Reduza para ${check.limit} ${check.label} antes de trocar.`
        );
      }
    }

    return null;
  }

  async cancel(organizationId: string): Promise<SubscriptionWithPlan> {
    await this.requireByOrganization(organizationId);
    return prisma.subscription.update({
      where: { organizationId },
      data: { status: 'canceled' },
      include: { plan: true },
    });
  }

  /** Contagem crua dos recursos consumidos por um tenant. */
  async countResources(
    organizationId: string
  ): Promise<{ devices: number; users: number; organizations: number }> {
    const [devices, users, organizations] = await Promise.all([
      // "Tela ativa" para fins de cobrança = device efetivamente vinculado.
      prisma.device.count({ where: { organizationId, status: 'linked' } }),
      prisma.user.count({ where: { organizationId } }),
      // LIMITAÇÃO CONHECIDA: o schema não tem hierarquia entre organizações
      // (nenhum `parentOrganizationId`), então não há como saber quais orgs
      // pertencem à mesma conta. Contamos apenas a própria org do tenant (= 1).
      // Quando a hierarquia existir, trocar por um count dos filhos + a raiz.
      prisma.organization.count({ where: { id: organizationId } }),
    ]);

    return { devices, users, organizations };
  }

  /**
   * Plano pago mais barato para operar `screens` telas: compara o valor mensal
   * previsto de cada plano de `UPGRADE_PLAN_CODES` (já respeitando `minScreens`)
   * e devolve o de menor fatura. Com 2 telas ganha o `loja` (2 × R$ 49 = R$ 98)
   * porque o `rede` cobraria o piso de 5 telas; a partir de 10 telas o `rede`
   * passa à frente (10 × R$ 39 = R$ 390 contra R$ 490).
   *
   * Considera apenas os códigos do catálogo comercial de propósito: a sugestão é
   * política de vendas, não um otimizador sobre qualquer linha que exista na
   * tabela `Plan`. Planos sob consulta (Enterprise) ficam fora — não há preço
   * público para comparar.
   */
  async suggestUpgradeFor(screens: number): Promise<Plan | null> {
    const plans = await Promise.all(UPGRADE_PLAN_CODES.map((code) => planService.getByCode(code)));

    const candidates = plans
      .filter((plan): plan is Plan => !!plan && plan.active && plan.pricePerScreenCents > 0)
      .filter((plan) => !parseFeatures(plan.features).includes(FEATURE_QUOTE_ONLY))
      .map((plan) => ({ plan, cents: estimateMonthlyCents(plan, screens) }))
      .sort((a, b) => a.cents - b.cents || a.plan.pricePerScreenCents - b.plan.pricePerScreenCents);

    return candidates[0]?.plan ?? null;
  }

  /** Consumo atual do tenant contra os limites do plano contratado. */
  async getUsage(organizationId: string): Promise<Usage> {
    const subscription = await this.requireByOrganization(organizationId);
    const counts = await this.countResources(organizationId);

    return {
      organizationId,
      planCode: subscription.plan.code,
      planName: subscription.plan.name,
      pricePerScreenCents: subscription.plan.pricePerScreenCents,
      minScreens: subscription.plan.minScreens,
      freePlan: isFreePlan(subscription.plan),
      devices: entry(counts.devices, subscription.plan.maxDevices),
      users: entry(counts.users, subscription.plan.maxUsers),
      organizations: entry(counts.organizations, subscription.plan.maxOrganizations),
    };
  }
}

export const subscriptionService = new SubscriptionService();
