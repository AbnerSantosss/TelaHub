import crypto from 'crypto';
import type { CheckoutEvent, CheckoutSession, Prisma } from '@prisma/client';

import prisma from '../lib/prisma';
import { planService } from './plan.service';
import { estimateMonthlyCents } from './subscription.service';
import type {
  CheckoutEventType,
  CheckoutStatus,
  CreateCheckoutSessionInput,
  ListCheckoutSessionsQuery,
  RegisterRecoveryInput,
  SubmitCheckoutSessionInput,
  UpdateCheckoutSessionInput,
} from '../schemas/checkout.schema';

/**
 * Validade de uma sessão de checkout. Depois disso ela vira `expired` e os
 * dados pessoais do lead são anonimizados (ver `anonymizeExpiredLeads`).
 * 30 dias é folgado o bastante para um link de recuperação funcionar e curto o
 * bastante para a base não virar um depósito eterno de dado pessoal.
 */
export const SESSION_TTL_DAYS = 30;

/**
 * Silêncio máximo antes de considerar o checkout abandonado. 30 min é o padrão
 * do mercado brasileiro para checkout transparente: menos que isso marca como
 * abandonado quem só foi buscar o cartão.
 */
export const ABANDON_AFTER_MS = 30 * 60 * 1000;

/** Passo do funil em que a sessão está/parou. Usado no relatório de abandono. */
export type CheckoutStep = 'view' | 'plan_selected' | 'identified' | 'payment_pending';

/** Erro de regra de negócio do checkout, com o status HTTP que a rota deve devolver. */
export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'CheckoutError';
  }
}

/** Sessão como o VISITANTE pode vê-la. Nada de id interno, org ou atribuição. */
export interface PublicCheckoutSession {
  publicToken: string;
  status: CheckoutStatus;
  planCode: string | null;
  screens: number;
  amountCents: number;
  amount: number;
  currency: 'BRL';
  /** Somente o que o próprio visitante digitou. */
  name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  companyName: string | null;
  startedAt: string;
  lastSeenAt: string;
  identifiedAt: string | null;
  paymentAt: string | null;
  expiresAt: string | null;
}

/** Campos que o painel (master) pode ver. `ipHash` fica fora: não serve à UI. */
const ADMIN_SESSION_SELECT = {
  id: true,
  publicToken: true,
  status: true,
  planCode: true,
  screens: true,
  amountCents: true,
  name: true,
  email: true,
  phone: true,
  document: true,
  companyName: true,
  organizationId: true,
  utmSource: true,
  utmMedium: true,
  utmCampaign: true,
  utmContent: true,
  utmTerm: true,
  referrer: true,
  userAgent: true,
  startedAt: true,
  lastSeenAt: true,
  identifiedAt: true,
  paymentAt: true,
  paidAt: true,
  abandonedAt: true,
  recoveryNotifiedAt: true,
  recoveryChannel: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CheckoutSessionSelect;

type AdminSession = Prisma.CheckoutSessionGetPayload<{ select: typeof ADMIN_SESSION_SELECT }>;

/**
 * Hash do IP do visitante — nunca o IP cru (exigência do comentário do schema:
 * minimização de dado / LGPD). O sal é `CHECKOUT_IP_SALT` ou, na falta dele, o
 * `JWT_SECRET`: sem sal, um hash de IPv4 é reversível por força bruta em
 * segundos (o espaço é de 2^32).
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.CHECKOUT_IP_SALT || process.env.JWT_SECRET;
  if (!salt) return null;
  return crypto.createHmac('sha256', salt).update(ip).digest('hex');
}

/**
 * Token público da sessão: 32 bytes aleatórios. NÃO é o `id` e não é
 * sequencial — este valor circula em link de recuperação por WhatsApp/e-mail, e
 * quem tem o token lê a sessão.
 */
export function generatePublicToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function truncate(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

/**
 * Passo do funil que a sessão alcançou, deduzido dos marcos gravados (e não do
 * `status`, que pode ser `abandoned`/`expired` e perder essa informação).
 */
export function stepOf(session: {
  planCode: string | null;
  identifiedAt: Date | null;
  paymentAt: Date | null;
}): CheckoutStep {
  if (session.paymentAt) return 'payment_pending';
  if (session.identifiedAt) return 'identified';
  if (session.planCode) return 'plan_selected';
  return 'view';
}

/**
 * Status para o qual uma sessão `abandoned` volta quando o visitante reaparece.
 * Tratar abandono como estado final perderia exatamente a conversão que o link
 * de recuperação existe para trazer de volta.
 */
export function statusAfterRecovery(session: {
  identifiedAt: Date | null;
  paymentAt: Date | null;
}): CheckoutStatus {
  if (session.paymentAt) return 'payment_pending';
  if (session.identifiedAt) return 'identified';
  return 'started';
}

function isPastExpiry(session: { expiresAt: Date | null }, now: Date): boolean {
  return !!session.expiresAt && session.expiresAt.getTime() <= now.getTime();
}

function toPublic(session: CheckoutSession): PublicCheckoutSession {
  return {
    publicToken: session.publicToken,
    status: session.status as CheckoutStatus,
    planCode: session.planCode,
    screens: session.screens,
    amountCents: session.amountCents,
    amount: session.amountCents / 100,
    currency: 'BRL',
    name: session.name,
    email: session.email,
    phone: session.phone,
    document: session.document,
    companyName: session.companyName,
    startedAt: session.startedAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
    identifiedAt: session.identifiedAt?.toISOString() ?? null,
    paymentAt: session.paymentAt?.toISOString() ?? null,
    expiresAt: session.expiresAt?.toISOString() ?? null,
  };
}

export interface CheckoutRequestContext {
  ip?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
}

export interface CheckoutMetrics {
  period: { startDate: string; endDate: string };
  /** Sessões criadas no período (denominador de todas as taxas). */
  total: number;
  /** Quantas sessões ALCANÇARAM cada passo, independente de onde pararam. */
  funnel: { viewed: number; planSelected: number; identified: number; submitted: number; paid: number };
  /** Em que status as sessões do período estão AGORA. */
  byStatus: Record<CheckoutStatus, number>;
  /** `paid / total`, entre 0 e 1. */
  conversionRate: number;
  /** `abandoned / total`, entre 0 e 1. */
  abandonmentRate: number;
  amounts: {
    currency: 'BRL';
    /** Valor efetivamente convertido. */
    paidCents: number;
    /** Oportunidade perdida: valor parado em sessões abandonadas. */
    abandonedCents: number;
    /** Valor em sessões aguardando pagamento (ainda recuperável). */
    pendingCents: number;
  };
  /** Onde o abandono aconteceu — a informação mais acionável do relatório. */
  abandonmentByStep: Array<{ step: CheckoutStep; count: number; amountCents: number }>;
  byUtmSource: Array<{ value: string; total: number; paid: number; abandoned: number; paidCents: number }>;
  byUtmCampaign: Array<{ value: string; total: number; paid: number; abandoned: number; paidCents: number }>;
}

export class CheckoutService {
  /**
   * Valor mensal da sessão, em centavos, SEMPRE recalculado no servidor a partir
   * do catálogo. Mesma fórmula de `subscriptionService.estimateMonthlyCents`
   * (`max(telas, minScreens) × pricePerScreenCents`, `0` para plano grátis ou
   * sob consulta) — se o checkout usasse outra conta, prometeria um preço que a
   * fatura não cumpre.
   */
  async computeAmountCents(planCode: string | null | undefined, screens: number): Promise<number> {
    if (!planCode) return 0;

    const plan = await planService.getByCode(planCode);
    if (!plan || !plan.active) {
      throw new CheckoutError(
        `Plano "${planCode}" não está disponível para contratação.`,
        400,
        'plan_unavailable'
      );
    }

    return estimateMonthlyCents(plan, screens);
  }

  /** Cria a sessão anônima da primeira visita e registra o evento `view`. */
  async createSession(
    input: CreateCheckoutSessionInput,
    context: CheckoutRequestContext = {}
  ): Promise<PublicCheckoutSession> {
    const now = new Date();
    const screens = input.screens ?? 1;
    const amountCents = await this.computeAmountCents(input.planCode ?? null, screens);

    const events: CheckoutEventType[] = input.planCode ? ['view', 'plan_selected'] : ['view'];

    const session = await prisma.checkoutSession.create({
      data: {
        publicToken: generatePublicToken(),
        status: 'started',
        planCode: input.planCode ?? null,
        screens,
        amountCents,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        utmContent: input.utmContent ?? null,
        utmTerm: input.utmTerm ?? null,
        referrer: truncate(input.referrer ?? context.referrer, 1000),
        userAgent: truncate(context.userAgent, 500),
        ipHash: hashIp(context.ip),
        startedAt: now,
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
        events: {
          create: events.map((type) => ({
            type,
            metadata: type === 'plan_selected' ? JSON.stringify({ planCode: input.planCode, screens }) : null,
          })),
        },
      },
    });

    return toPublic(session);
  }

  /** Sessão pelo token público, em formato mínimo. Lança 404/410. */
  async getPublicSession(publicToken: string): Promise<PublicCheckoutSession> {
    const session = await this.requireByToken(publicToken);

    // Leitura de sessão vencida ainda responde — só declara o status real, para
    // o front poder oferecer "começar de novo" em vez de um erro seco.
    if (isPastExpiry(session, new Date())) {
      return toPublic({ ...session, status: 'expired' });
    }

    return toPublic(session);
  }

  /** Enriquecimento por passo. Recalcula o valor e avança o status. */
  async updateSession(
    publicToken: string,
    input: UpdateCheckoutSessionInput
  ): Promise<PublicCheckoutSession> {
    const session = await this.requireByToken(publicToken);
    const now = new Date();
    this.assertMutable(session, now);

    const nextPlanCode = input.planCode ?? session.planCode;
    const nextScreens = input.screens ?? session.screens;
    const nextName = input.name ?? session.name;
    const nextEmail = input.email ?? session.email;

    const planChanged = input.planCode !== undefined && input.planCode !== session.planCode;
    const screensChanged = input.screens !== undefined && input.screens !== session.screens;

    // Recalcula sempre: qualquer PATCH é um passo novo e congela o preço atual
    // do catálogo para esta sessão.
    const amountCents = await this.computeAmountCents(nextPlanCode, nextScreens);

    const events: Array<{ type: CheckoutEventType; metadata?: unknown }> = [];

    // Abandono NÃO é estado final: atividade traz a sessão de volta.
    const recovered = session.status === 'abandoned';
    let status: CheckoutStatus = recovered
      ? statusAfterRecovery(session)
      : (session.status as CheckoutStatus);

    if (recovered) {
      events.push({ type: 'recovered', metadata: { from: 'abandoned', to: status } });
    }
    if (planChanged) {
      events.push({ type: 'plan_selected', metadata: { planCode: nextPlanCode, amountCents } });
    }
    if (screensChanged) {
      events.push({ type: 'screens_changed', metadata: { from: session.screens, to: nextScreens, amountCents } });
    }

    // `identifiedAt` marca a PRIMEIRA vez que temos nome + e-mail: é o passo em
    // que o visitante deixa de ser anônimo e passa a ser lead recuperável.
    let identifiedAt = session.identifiedAt;
    if (!identifiedAt && nextEmail && nextName) {
      identifiedAt = now;
      if (status === 'started') status = 'identified';
      events.push({ type: 'identify', metadata: { hasPhone: !!(input.phone ?? session.phone) } });
    }

    const updated = await prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        planCode: nextPlanCode,
        screens: nextScreens,
        amountCents,
        name: nextName,
        email: nextEmail,
        phone: input.phone ?? session.phone,
        document: input.document ?? session.document,
        companyName: input.companyName ?? session.companyName,
        status,
        identifiedAt,
        lastSeenAt: now,
        abandonedAt: recovered ? null : session.abandonedAt,
        events: events.length
          ? {
              create: events.map((event) => ({
                type: event.type,
                metadata: event.metadata === undefined ? null : JSON.stringify(event.metadata),
              })),
            }
          : undefined,
      },
    });

    return toPublic(updated);
  }

  /**
   * Finalização do checkout SEM cobrança. Marca `payment_pending` e registra o
   * `submit`; a contratação segue por contato comercial.
   *
   * NÃO cria nem altera `Subscription`. Conceder plano pago sem pagamento
   * confirmado entrega de graça o que deveria ser cobrado — é o erro que já
   * existe em outra parte do produto e não se repete aqui.
   */
  async submitSession(
    publicToken: string,
    input: SubmitCheckoutSessionInput = {}
  ): Promise<{ session: PublicCheckoutSession; payment: {
    status: 'manual';
    gateway: null;
    nextStep: 'contato-comercial';
    charged: false;
    message: string;
  } }> {
    const session = await this.requireByToken(publicToken);
    const now = new Date();
    this.assertMutable(session, now);

    if (!session.planCode || !session.email || !session.name) {
      throw new CheckoutError(
        'Escolha um plano e informe nome e e-mail antes de finalizar.',
        400,
        'incomplete_session'
      );
    }

    // Defensivo: o valor volta a ser calculado no servidor no ato do submit, para
    // uma mudança de catálogo entre passos não congelar um preço fantasma.
    const amountCents = await this.computeAmountCents(session.planCode, session.screens);

    const events: Array<{ type: CheckoutEventType; metadata?: unknown }> = [];
    if (session.status === 'abandoned') {
      events.push({ type: 'recovered', metadata: { from: 'abandoned', to: 'payment_pending' } });
    }
    if (input.paymentMethod) {
      events.push({ type: 'payment_selected', metadata: { paymentMethod: input.paymentMethod } });
    }
    events.push({
      type: 'submit',
      metadata: { amountCents, planCode: session.planCode, screens: session.screens, note: input.note ?? null },
    });

    const updated = await prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        status: 'payment_pending',
        amountCents,
        // Preserva o primeiro submit: é ele que datou a intenção de compra.
        paymentAt: session.paymentAt ?? now,
        lastSeenAt: now,
        abandonedAt: null,
        events: {
          create: events.map((event) => ({
            type: event.type,
            metadata: event.metadata === undefined ? null : JSON.stringify(event.metadata),
          })),
        },
      },
    });

    // TODO(gateway): a criação da cobrança entra AQUI, depois do update acima e
    // antes do return. Passos, quando houver gateway (Pagar.me/Asaas/Stripe):
    //   1. criar customer + charge/subscription no gateway com
    //      `updated.amountCents`, `updated.planCode` e os dados do lead;
    //   2. gravar os ids do gateway na sessão e devolver ao front o que ele
    //      precisa renderizar (QR Code do PIX, linha digitável, 3DS);
    //   3. NÃO mudar `status` para `paid` aqui — cobrança criada não é cobrança
    //      paga.
    // Quando o WEBHOOK de confirmação chegar (rota nova, com verificação de
    // assinatura do provedor e idempotência por id de evento):
    //   a. `status: 'paid'`, `paidAt: new Date()`, evento `paid`;
    //   b. criar a organização/usuário (reusar `signupService`) e só então a
    //      `Subscription` do plano contratado, gravando `organizationId` na
    //      sessão;
    //   c. tratar reembolso/chargeback revertendo a assinatura.
    // Enquanto isso não existir, `payment_pending` é o estado final possível.

    return {
      session: toPublic(updated),
      payment: {
        status: 'manual',
        gateway: null,
        nextStep: 'contato-comercial',
        charged: false,
        message:
          'Recebemos sua solicitação. Nenhuma cobrança foi feita: a contratação é concluída pelo nosso time comercial, ' +
          'que entra em contato pelo e-mail e telefone informados para confirmar o plano e enviar o pagamento.',
      },
    };
  }

  // ─── Painel (master) ───────────────────────────────────────────────────────

  async listSessions(query: ListCheckoutSessionsQuery): Promise<{
    sessions: AdminSession[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const where = this.buildWhere(query);

    const [total, sessions] = await Promise.all([
      prisma.checkoutSession.count({ where }),
      prisma.checkoutSession.findMany({
        where,
        select: ADMIN_SESSION_SELECT,
        // `lastSeenAt` desc: quem mexeu agora é quem ainda dá para recuperar.
        orderBy: { lastSeenAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      sessions,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async getSessionDetail(
    id: string
  ): Promise<{ session: AdminSession; step: CheckoutStep; events: CheckoutEvent[] }> {
    const session = await prisma.checkoutSession.findUnique({ where: { id }, select: ADMIN_SESSION_SELECT });
    if (!session) {
      throw new CheckoutError('Sessão de checkout não encontrada.', 404, 'session_not_found');
    }

    const events = await prisma.checkoutEvent.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
    });

    return { session, step: stepOf(session), events };
  }

  /**
   * Registra que o contato de recuperação foi FEITO. Não envia nada: não há
   * integração de WhatsApp/e-mail transacional nesta frente, e registrar um
   * envio que não aconteceu é pior que não registrar.
   */
  async registerRecovery(id: string, input: RegisterRecoveryInput): Promise<AdminSession> {
    const existing = await prisma.checkoutSession.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      throw new CheckoutError('Sessão de checkout não encontrada.', 404, 'session_not_found');
    }

    return prisma.checkoutSession.update({
      where: { id },
      data: {
        recoveryNotifiedAt: new Date(),
        recoveryChannel: input.channel,
        events: {
          create: {
            type: 'recovery_notified',
            metadata: JSON.stringify({ channel: input.channel, note: input.note ?? null }),
          },
        },
      },
      select: ADMIN_SESSION_SELECT,
    });
  }

  /**
   * Relatório do funil no período.
   *
   * LIMITAÇÃO CONHECIDA: as quebras (passo do abandono, UTM) são calculadas em
   * memória sobre as sessões do período, com um `select` enxuto. Isso é barato
   * na ordem de grandeza atual (milhares) e evita 6 queries de `groupBy`
   * divergentes; se o volume crescer para centenas de milhares, migrar as
   * quebras para `groupBy` no banco.
   */
  async getMetrics(range: { startDate?: Date; endDate?: Date } = {}): Promise<CheckoutMetrics> {
    const endDate = range.endDate ?? new Date();
    const startDate = range.startDate ?? new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const rows = await prisma.checkoutSession.findMany({
      where: { startedAt: { gte: startDate, lte: endDate } },
      select: {
        status: true,
        planCode: true,
        amountCents: true,
        identifiedAt: true,
        paymentAt: true,
        paidAt: true,
        utmSource: true,
        utmCampaign: true,
      },
    });

    const byStatus = CHECKOUT_STATUS_ZERO();
    const funnel = { viewed: rows.length, planSelected: 0, identified: 0, submitted: 0, paid: 0 };
    const amounts = { paidCents: 0, abandonedCents: 0, pendingCents: 0 };
    const steps = new Map<CheckoutStep, { count: number; amountCents: number }>();
    const utmSource = new Map<string, { total: number; paid: number; abandoned: number; paidCents: number }>();
    const utmCampaign = new Map<string, { total: number; paid: number; abandoned: number; paidCents: number }>();

    const bump = (
      map: Map<string, { total: number; paid: number; abandoned: number; paidCents: number }>,
      key: string | null,
      row: { status: string; amountCents: number }
    ) => {
      const value = key || '(sem atribuição)';
      const entry = map.get(value) ?? { total: 0, paid: 0, abandoned: 0, paidCents: 0 };
      entry.total += 1;
      if (row.status === 'paid') {
        entry.paid += 1;
        entry.paidCents += row.amountCents;
      }
      if (row.status === 'abandoned') entry.abandoned += 1;
      map.set(value, entry);
    };

    for (const row of rows) {
      if (row.status in byStatus) byStatus[row.status as CheckoutStatus] += 1;

      if (row.planCode) funnel.planSelected += 1;
      if (row.identifiedAt) funnel.identified += 1;
      if (row.paymentAt) funnel.submitted += 1;
      if (row.paidAt) funnel.paid += 1;

      if (row.status === 'paid') amounts.paidCents += row.amountCents;
      if (row.status === 'payment_pending') amounts.pendingCents += row.amountCents;
      if (row.status === 'abandoned') {
        amounts.abandonedCents += row.amountCents;
        const step = stepOf(row);
        const entry = steps.get(step) ?? { count: 0, amountCents: 0 };
        entry.count += 1;
        entry.amountCents += row.amountCents;
        steps.set(step, entry);
      }

      bump(utmSource, row.utmSource, row);
      bump(utmCampaign, row.utmCampaign, row);
    }

    const total = rows.length;
    const rate = (value: number) => (total === 0 ? 0 : Math.round((value / total) * 10000) / 10000);

    const stepOrder: CheckoutStep[] = ['view', 'plan_selected', 'identified', 'payment_pending'];

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      total,
      funnel,
      byStatus,
      conversionRate: rate(byStatus.paid),
      abandonmentRate: rate(byStatus.abandoned),
      amounts: { currency: 'BRL', ...amounts },
      abandonmentByStep: stepOrder.map((step) => ({
        step,
        count: steps.get(step)?.count ?? 0,
        amountCents: steps.get(step)?.amountCents ?? 0,
      })),
      byUtmSource: [...utmSource.entries()]
        .map(([value, entry]) => ({ value, ...entry }))
        .sort((a, b) => b.total - a.total),
      byUtmCampaign: [...utmCampaign.entries()]
        .map(([value, entry]) => ({ value, ...entry }))
        .sort((a, b) => b.total - a.total),
    };
  }

  // ─── Manutenção (job) ──────────────────────────────────────────────────────

  /**
   * Marca como `abandoned` as sessões em andamento sem atividade há mais de
   * `thresholdMs`, registrando o evento `abandoned` de cada uma.
   */
  async markAbandonedSessions(now: Date = new Date(), thresholdMs = ABANDON_AFTER_MS): Promise<number> {
    const cutoff = new Date(now.getTime() - thresholdMs);

    const stale = await prisma.checkoutSession.findMany({
      where: {
        status: { in: ['started', 'identified', 'payment_pending'] },
        lastSeenAt: { lt: cutoff },
      },
      select: { id: true, status: true, planCode: true, identifiedAt: true, paymentAt: true, amountCents: true },
    });

    if (stale.length === 0) return 0;

    await prisma.$transaction([
      prisma.checkoutSession.updateMany({
        where: { id: { in: stale.map((s) => s.id) } },
        data: { status: 'abandoned', abandonedAt: now },
      }),
      prisma.checkoutEvent.createMany({
        data: stale.map((session) => ({
          sessionId: session.id,
          type: 'abandoned',
          // O passo em que parou é a informação que o relatório precisa e que o
          // `status: 'abandoned'` apaga.
          metadata: JSON.stringify({
            fromStatus: session.status,
            step: stepOf(session),
            amountCents: session.amountCents,
          }),
        })),
      }),
    ]);

    return stale.length;
  }

  /** Marca como `expired` as sessões que passaram de `expiresAt` e não converteram. */
  async markExpiredSessions(now: Date = new Date()): Promise<number> {
    const result = await prisma.checkoutSession.updateMany({
      where: {
        expiresAt: { lt: now },
        status: { notIn: ['paid', 'expired'] },
      },
      data: { status: 'expired' },
    });

    return result.count;
  }

  /**
   * Purga LGPD: apaga os dados pessoais das sessões vencidas que não
   * converteram, preservando o que alimenta as métricas (plano, telas, valor,
   * marcos, UTM). Sessão abandonada não pode virar base de dados eterna.
   *
   * `companyName` é mantido de propósito — é dado de empresa, não de pessoa
   * natural, e é o que permite o comercial entender QUE tipo de conta abandona.
   * Se a política mudar, é aqui que se acrescenta o campo.
   */
  async anonymizeExpiredLeads(now: Date = new Date()): Promise<number> {
    const result = await prisma.checkoutSession.updateMany({
      where: {
        status: 'expired',
        // Sessão que converteu tem contrato: o dado dela pertence ao cadastro,
        // não a este funil, e é retido pela regra do cadastro.
        paidAt: null,
        expiresAt: { lt: now },
        OR: [
          { name: { not: null } },
          { email: { not: null } },
          { phone: { not: null } },
          { document: { not: null } },
        ],
      },
      data: { name: null, email: null, phone: null, document: null, ipHash: null },
    });

    return result.count;
  }

  // ─── Internos ──────────────────────────────────────────────────────────────

  private async requireByToken(publicToken: string): Promise<CheckoutSession> {
    const session = await prisma.checkoutSession.findUnique({ where: { publicToken } });
    if (!session) {
      throw new CheckoutError('Sessão de checkout não encontrada.', 404, 'session_not_found');
    }
    return session;
  }

  /** 409 para sessão já paga, 410 para vencida. */
  private assertMutable(session: CheckoutSession, now: Date): void {
    if (session.status === 'paid') {
      throw new CheckoutError(
        'Esta contratação já foi concluída e não pode ser alterada.',
        409,
        'session_already_paid'
      );
    }
    if (session.status === 'expired' || isPastExpiry(session, now)) {
      throw new CheckoutError(
        'Este link de checkout expirou. Inicie uma nova contratação.',
        410,
        'session_expired'
      );
    }
  }

  private buildWhere(query: ListCheckoutSessionsQuery): Prisma.CheckoutSessionWhereInput {
    const where: Prisma.CheckoutSessionWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.startedAt = {
        ...(query.startDate ? { gte: query.startDate } : {}),
        ...(query.endDate ? { lte: query.endDate } : {}),
      };
    }
    if (query.email) where.email = { contains: query.email, mode: 'insensitive' };

    return where;
  }
}

const CHECKOUT_STATUS_ZERO = (): Record<CheckoutStatus, number> => ({
  started: 0,
  identified: 0,
  payment_pending: 0,
  paid: 0,
  abandoned: 0,
  expired: 0,
});

export const checkoutService = new CheckoutService();
