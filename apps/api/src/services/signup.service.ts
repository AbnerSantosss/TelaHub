import crypto from 'crypto';
import type { Prisma } from '@prisma/client';

import prisma from '../lib/prisma';
import { generateToken, hashPassword } from './auth.service';
import { buildFbc, newEventId, sendMetaEventAsync } from './meta-capi.service';
import { sendWelcomeEmail } from './email.service';
import { FREE_PLAN_CODE, subscriptionService, trialDaysRemaining } from './subscription.service';
import { PRIVACY_VERSION, TERMS_VERSION, type SignupInput } from '../schemas/signup.schema';

/** Erro de negócio com status HTTP associado, para a rota apenas repassar. */
export class SignupError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'SignupError';
  }
}

/**
 * Dados da REQUISIÇÃO (não do formulário) que a medição precisa.
 *
 * IP e user-agent são o que permite a Meta casar este cadastro com o clique no
 * anúncio quando o cookie do Pixel foi bloqueado — que é exatamente o caso em
 * que a Conversions API existe para salvar o evento. Vêm da rota, nunca do
 * corpo: campo enviado pelo navegador é campo que alguém pode forjar.
 */
export interface SignupContext {
  ip?: string | null;
  userAgent?: string | null;
  /** URL da página onde o cadastro foi feito (cabeçalho `Referer`). */
  sourceUrl?: string | null;
}

export interface SignupResult {
  token: string;
  user: {
    id: string;
    username: string;
    name: string | null;
    email: string;
    role: string;
    organizationId: string | null;
  };
  organization: { id: string; name: string };
  subscription: {
    planCode: string;
    status: string;
    trialEndsAt: string | null;
    trialDaysRemaining: number;
  };
}

/**
 * Deriva um username livre a partir do e-mail. `username` é `@unique` no schema,
 * então precisamos resolver colisões antes de tentar inserir.
 */
async function deriveUsername(email: string, tx: Prisma.TransactionClient): Promise<string> {
  const base =
    email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '')
      .slice(0, 24) || 'usuario';

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${attempt + 1}`;
    const existing = await tx.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
  }

  // Fallback praticamente impossível de alcançar.
  return `${base}${Date.now()}`;
}

/**
 * E-mail de boas-vindas do auto-cadastro.
 *
 * Até 2026-09-09 esta função era uma CÓPIA local com `service: 'gmail'` fixo,
 * ignorando o provedor que o `master` configura no painel. Duas consequências,
 * ambas invisíveis: quem migrasse para Brevo/Resend continuaria mandando o
 * boas-vindas pelo Gmail (e só ele estouraria o limite de 500/dia), e o envio
 * não entrava em registro nenhum — "não recebi o e-mail de cadastro" não tinha
 * onde ser verificado.
 *
 * Agora delega para `email.service`, que enfileira: mesmo provedor, mesma fila,
 * mesmo histórico do resto do produto.
 */
export class SignupService {
  /** `true` quando o e-mail já pertence a alguma conta. */
  async isEmailTaken(email: string): Promise<boolean> {
    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true },
    });
    return !!existing;
  }

  /**
   * Auto-atendimento: cria organização + usuário admin + assinatura no plano
   * `gratis` (freemium, `active`, sem prazo) numa única transação e devolve
   * token de acesso (mesmo formato do login).
   */
  async signup(input: SignupInput, context: SignupContext = {}): Promise<SignupResult> {
    const email = input.email.trim().toLowerCase();

    if (await this.isEmailTaken(email)) {
      // Mensagem deliberadamente genérica: não revela nada sobre a conta existente.
      throw new SignupError(
        'Este e-mail já está cadastrado. Faça login ou use a opção "esqueci minha senha".',
        409,
        'email_taken'
      );
    }

    const passwordHash = await hashPassword(input.password);

    // Atribuição já chega limpa e truncada do schema. Gravada UMA vez, na
    // criação: é a primeira origem da conta e não se reescreve depois — se uma
    // visita posterior pudesse sobrescrever, todo remarketing levaria o crédito
    // das contas que a prospecção trouxe.
    const attribution = input.attribution ?? {};

    // O instante do aceite é AGORA, no servidor. Data vinda do cliente não
    // prova nada num litígio, e é justamente a prova que este campo existe para
    // produzir.
    const acceptedAt = new Date();

    const created = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: input.companyName.trim(),
          utmSource: attribution.utmSource ?? null,
          utmMedium: attribution.utmMedium ?? null,
          utmCampaign: attribution.utmCampaign ?? null,
          utmContent: attribution.utmContent ?? null,
          utmTerm: attribution.utmTerm ?? null,
          gclid: attribution.gclid ?? null,
          fbclid: attribution.fbclid ?? null,
          referrer: attribution.referrer ?? null,
          landingPath: attribution.landingPath ?? null,
        },
      });

      const username = await deriveUsername(email, tx);

      const user = await tx.user.create({
        data: {
          username,
          name: input.name.trim(),
          email,
          password: passwordHash,
          role: 'admin',
          organizationId: organization.id,
          // Prova do consentimento: quando, e sobre QUAL texto. O schema já
          // garantiu que `acceptedTerms` veio `true` — chegar aqui sem aceite
          // é impossível.
          termsAcceptedAt: acceptedAt,
          termsVersion: input.termsVersion || TERMS_VERSION,
          privacyVersion: input.privacyVersion || PRIVACY_VERSION,

          // Consentimento de marketing, separado do aceite dos Termos. Só é
          // gravado quando veio `true` explícito: `undefined` e `false` são a
          // mesma coisa aqui, "não consentiu", e o campo fica nulo.
          marketingOptInAt: input.marketingOptIn === true ? acceptedAt : null,

          // Token de descadastro para TODO usuário criado, mesmo quem não deu
          // opt-in agora. Gerar só para quem consentiu obrigaria a gerar depois,
          // no meio do envio da campanha — e é no envio que uma escrita a mais
          // no banco custa caro (uma por destinatário) e pode falhar deixando a
          // mensagem sair sem link de descadastro, que é o cenário que
          // Gmail/Yahoo punem desde 2024.
          unsubscribeToken: crypto.randomBytes(24).toString('base64url'),
        },
      });

      // Freemium: plano `gratis`, `active`, sem prazo e sem cartão.
      const subscription = await subscriptionService.createFreeSubscription(organization.id, tx);

      return { organization, user, subscription };
    });

    // Corrida entre dois cadastros simultâneos com o mesmo e-mail cai no unique
    // constraint do Prisma (P2002) e sobe como 409 pela rota.

    const token = generateToken({
      id: created.user.id,
      email: created.user.email,
      role: created.user.role,
      organizationId: created.user.organizationId,
    });

    // Conta criada = `CompleteRegistration`. É o evento pelo qual as campanhas
    // de topo otimizam, e o único jeito de a Meta saber que aquele clique virou
    // conta quando o Pixel do navegador está bloqueado.
    //
    // ARMADILHA: `metaEventId` tem que ser o MESMO uuid que o navegador usou no
    // `fbq(..., { eventID })`. Se o site não mandar, geramos um aqui — mas aí a
    // Meta conta duas conversões (uma do Pixel, outra daqui) e o custo por
    // cadastro do relatório cai pela metade sem nenhum erro aparecer.
    //
    // `Async`: medir não pode derrubar cadastrar. A função já engole exceção.
    try {
      sendMetaEventAsync({
        eventName: 'CompleteRegistration',
        eventId: input.metaEventId || newEventId(),
        actionSource: 'website',
        sourceUrl: context.sourceUrl ?? null,
        userData: {
          email,
          // Casa a conta com a pessoa nos públicos: o mesmo id vai no
          // `Purchase` quando ela assinar, e é assim que o lookalike de
          // pagante se forma.
          externalId: created.organization.id,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
          fbp: input.fbp ?? null,
          // Sem o cookie `_fbc` (bloqueador, Safari), reconstruímos a partir
          // do `fbclid` que veio na URL do anúncio — senão o clique pago se
          // perde.
          fbc: input.fbc || buildFbc(attribution.fbclid) || null,
        },
      });
    } catch (err) {
      // Blindagem: `sendMetaEventAsync` já engole erro de rede, mas um defeito
      // SÍNCRONO aqui (payload malformado, módulo quebrado) chegaria até este
      // ponto — e a conta já está criada. Perder o evento é aceitável; devolver
      // 500 para quem acabou de se cadastrar, não.
      console.warn(
        '[signup] falha ao medir CompleteRegistration (cadastro concluído):',
        err instanceof Error ? err.message : err
      );
    }

    // Não bloqueante: falha de SMTP nunca pode derrubar o cadastro. Hoje a
    // chamada só ENFILEIRA, então falhar aqui virou quase impossível — mas o
    // `catch` fica: gravar na fila também toca o banco.
    void sendWelcomeEmail(email, created.user.name || created.user.username, created.organization.name, {
      // Sem este contexto o histórico de e-mails da organização nasceria vazio
      // justamente na primeira mensagem que ela recebe.
      organizationId: created.organization.id,
      userId: created.user.id,
    }).catch(
      (err: unknown) => {
        console.warn(
          '[signup] falha ao enviar e-mail de boas-vindas (cadastro concluído):',
          err instanceof Error ? err.message : err
        );
      }
    );

    return {
      token,
      user: {
        id: created.user.id,
        username: created.user.username,
        name: created.user.name,
        email: created.user.email,
        role: created.user.role,
        organizationId: created.user.organizationId,
      },
      organization: { id: created.organization.id, name: created.organization.name },
      subscription: {
        planCode: FREE_PLAN_CODE,
        status: created.subscription.status,
        trialEndsAt: created.subscription.trialEndsAt?.toISOString() ?? null,
        trialDaysRemaining: trialDaysRemaining(created.subscription),
      },
    };
  }
}

export const signupService = new SignupService();
