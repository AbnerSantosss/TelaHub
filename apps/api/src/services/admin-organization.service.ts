import type { Prisma } from '@prisma/client';

import prisma from '../lib/prisma';
import type { ListOrganizationsQuery, OrganizationView } from '../schemas/admin.schema';
import { parseFeatures } from './plan.service';
import { isOverrideActive, subscriptionOverrideService } from './subscription-override.service';
import type { ResolvedEntitlements } from './subscription-override.service';
import {
  FREE_PLAN_CODE,
  billedScreens,
  estimateCycleCents,
  estimateMonthlyCents,
  graceEndsAt,
  isFreePlan,
  subscriptionService,
  type BillingInterval,
} from './subscription.service';

/**
 * ─── LISTAGEM E DETALHE DE CLIENTES PARA O BACKOFFICE ───────────────────────
 *
 * Este arquivo é o ÚNICO lugar onde as sete visões de §2.8 do plano existem.
 * Isso não é organização de código: é a defesa contra o problema que o próprio
 * plano nomeia — "para não haver duas leituras". No momento em que a UI puder
 * montar o filtro dela, "quantos clientes pagam?" passa a ter duas respostas
 * (uma na lista, outra no dashboard) e ninguém consegue dizer qual está errada.
 *
 * A regra vale para o `where`, para a ordenação padrão e para os números
 * derivados (telas cobradas, valor do ciclo): tudo sai daqui, e as funções de
 * cálculo são as MESMAS que a cobrança usa (`estimateCycleCents`,
 * `billedScreens`) — nunca uma reimplementação "só para o painel".
 */

/** Erro de operação administrativa, traduzido em resposta HTTP pela rota. */
export class AdminOrganizationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'AdminOrganizationError';
  }
}

/**
 * Motivo que caracteriza "não renovou".
 *
 * ⚠️ É `grace_expired` e SÓ ele. `period_end_unpaid` (cancelamento agendado que
 * venceu) fica de fora porque ali a pessoa PEDIU para sair — o ciclo apenas
 * terminou depois. Misturar os dois refaz exatamente a confusão que o
 * `cancelReason` foi criado para desfazer: "cobrança falhando" é problema
 * recuperável por e-mail e novo meio de pagamento; "pediu para sair" é problema
 * de produto. São listas com donos, prazos e ações diferentes.
 *
 * (O plano de backoffice, na tabela de §2.8, lista os dois motivos juntos. A
 * decisão registrada aqui é a mais restritiva, e é a que o dono pediu na
 * execução: quem cancelou voluntariamente NÃO aparece em "não renovaram".)
 */
export const NOT_RENEWED_CANCEL_REASON = 'grace_expired';

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * DAY_MS);
}

/** `billingInterval` é texto no banco; aqui vira o tipo fechado da cobrança. */
function toInterval(value: string | null | undefined): BillingInterval {
  return value === 'yearly' ? 'yearly' : 'monthly';
}

/** Plano como o backoffice o mostra numa linha de lista. */
export interface AdminRowPlan {
  code: string;
  name: string;
  pricePerScreenCents: number;
  priceAnnualPerScreenCents: number;
  minScreens: number;
  free: boolean;
}

export interface AdminRowSubscription {
  id: string;
  status: string;
  billingInterval: BillingInterval;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  cancelReason: string | null;
  pastDueSince: Date | null;
  /** Fim da carência de inadimplência. `null` fora de `past_due`. */
  graceEndsAt: Date | null;
  gateway: string | null;
  plan: AdminRowPlan;
}

export interface AdminRowPayment {
  id: string;
  amountCents: number;
  billingInterval: string;
  screens: number;
  method: string | null;
  provider: string;
  paidAt: Date | null;
  createdAt: Date;
  invoiceUrl: string | null;
  nfseStatus: string | null;
}

export interface AdminOrganizationRow {
  organization: {
    id: string;
    name: string;
    createdAt: Date;
    /** Atribuição congelada no cadastro. É a coluna "origem" da lista (§4.1). */
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
  };
  subscription: AdminRowSubscription | null;
  screens: {
    /** Telas efetivamente vinculadas (`Device.status = linked`). */
    inUse: number;
    /** Telas que ENTRAM NA FATURA — respeita o piso `minScreens` do plano. */
    billed: number;
  };
  billing: {
    interval: BillingInterval;
    /** Mensal EQUIVALENTE — o número que se compara entre planos (é o MRR). */
    monthlyEquivalentCents: number;
    /** CAIXA do ciclo — no anual, os 12 meses. Ver US-A-05. */
    cycleCents: number;
    free: boolean;
  };
  /** Último pagamento CONFIRMADO. `null` = nunca entrou dinheiro desta conta. */
  lastPayment: AdminRowPayment | null;
  /** `true` quando existe concessão manual VÁLIDA agora (não vencida). */
  hasActiveOverride: boolean;
}

export interface AdminOrganizationList {
  view: OrganizationView;
  organizations: AdminOrganizationRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

/**
 * Colunas que a listagem carrega da organização.
 *
 * Explícito e não `include` inteiro: o objeto `Organization` cresce (já tem
 * nove campos de atribuição) e mandar tudo para a tela é como um dado sensível
 * novo vaza sem ninguém decidir que ele deveria aparecer.
 */
const ORG_SELECT = {
  id: true,
  name: true,
  createdAt: true,
  utmSource: true,
  utmMedium: true,
  utmCampaign: true,
  subscription: {
    include: { plan: true, override: true },
  },
} satisfies Prisma.OrganizationSelect;

export class AdminOrganizationService {
  /**
   * Filtro de cada visão. É a tabela de §2.8 traduzida para Prisma, e a ordem
   * das cláusulas segue a da tabela para que a conferência seja linha a linha.
   */
  buildWhere(query: ListOrganizationsQuery, now: Date = new Date()): Prisma.OrganizationWhereInput {
    const clauses: Prisma.OrganizationWhereInput[] = [];

    switch (query.view) {
      case 'paying':
        // Pagante = assinatura ativa em plano que NÃO é o grátis. Comparar por
        // `pricePerScreenCents > 0` seria mais elegante e estaria errado: o
        // Enterprise tem preço 0 por ser sob consulta, e sumiria da lista de
        // quem paga justamente o cliente maior.
        clauses.push({
          subscription: { is: { status: 'active', plan: { is: { code: { not: FREE_PLAN_CODE } } } } },
        });
        break;

      case 'expiring':
        // Janela ABERTA no início e FECHADA no fim: `> agora` exclui quem já
        // venceu (esse é problema de outra lista, não de aviso de renovação).
        clauses.push({
          subscription: {
            is: {
              status: 'active',
              currentPeriodEnd: { gt: now, lte: addDays(now, query.days) },
            },
          },
        });
        break;

      case 'past_due':
        clauses.push({ subscription: { is: { status: 'past_due' } } });
        break;

      case 'not_renewed':
        clauses.push({
          subscription: { is: { status: 'canceled', cancelReason: NOT_RENEWED_CANCEL_REASON } },
        });
        break;

      case 'scheduled_cancel':
        // `status: active` junto de propósito: depois que vira `canceled` a
        // assinatura não está mais "de saída", ela saiu — e apareceria em duas
        // listas ao mesmo tempo.
        clauses.push({ subscription: { is: { status: 'active', cancelAtPeriodEnd: true } } });
        break;

      case 'free':
        clauses.push({ subscription: { is: { plan: { is: { code: FREE_PLAN_CODE } } } } });
        break;

      case 'all':
      default:
        break;
    }

    if (query.search) {
      // Busca no nome da organização OU no e-mail de qualquer usuário dela: o
      // operador quase sempre tem só o e-mail de quem abriu o chamado, e a
      // organização costuma se chamar outra coisa.
      clauses.push({
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { users: { some: { email: { contains: query.search, mode: 'insensitive' } } } },
        ],
      });
    }

    return clauses.length > 0 ? { AND: clauses } : {};
  }

  /**
   * Ordenação. O padrão MUDA com a visão de propósito: numa lista de "vencem em
   * N dias" ordenada por data de cadastro, o cliente que vence amanhã pode estar
   * na página 4 — a lista existe para agir por urgência.
   */
  buildOrderBy(query: ListOrganizationsQuery): Prisma.OrganizationOrderByWithRelationInput {
    const dir: Prisma.SortOrder = query.sortDir ?? (query.sort === 'name' ? 'asc' : 'desc');

    if (!query.sort) {
      if (query.view === 'expiring') return { subscription: { currentPeriodEnd: 'asc' } };
      if (query.view === 'past_due') return { subscription: { pastDueSince: 'asc' } };
      return { createdAt: 'desc' };
    }

    switch (query.sort) {
      case 'name':
        return { name: dir };
      case 'currentPeriodEnd':
        return { subscription: { currentPeriodEnd: dir } };
      case 'status':
        return { subscription: { status: dir } };
      case 'createdAt':
      default:
        return { createdAt: dir };
    }
  }

  async list(query: ListOrganizationsQuery, now: Date = new Date()): Promise<AdminOrganizationList> {
    const where = this.buildWhere(query, now);

    const [total, organizations] = await Promise.all([
      prisma.organization.count({ where }),
      prisma.organization.findMany({
        where,
        select: ORG_SELECT,
        orderBy: this.buildOrderBy(query),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    const ids = organizations.map((organization) => organization.id);

    // As duas agregações vêm em UMA consulta cada, para a página inteira. A
    // alternativa óbvia — contar telas dentro do laço — é o N+1 clássico: com
    // 100 linhas por página são 200 idas ao banco para desenhar uma tabela.
    const [deviceCounts, lastPayments] = await Promise.all([
      ids.length
        ? prisma.device.groupBy({
            by: ['organizationId'],
            where: { organizationId: { in: ids }, status: 'linked' },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      ids.length
        ? prisma.payment.findMany({
            // Só `confirmed`: "último pagamento" na tela do operador significa
            // "quando entrou dinheiro". Uma cobrança `pending` exibida nessa
            // coluna faria um inadimplente parecer em dia.
            where: { organizationId: { in: ids }, status: 'confirmed' },
            orderBy: { createdAt: 'desc' },
            // O `distinct` do Prisma é aplicado sobre o resultado já ordenado,
            // então sobra a linha mais recente de cada organização. Custo aceito:
            // a consulta traz o histórico das organizações da PÁGINA, não da
            // base — limitado por `pageSize` (máx. 100).
            distinct: ['organizationId'],
          })
        : Promise.resolve([]),
    ]);

    const devicesByOrg = new Map(
      deviceCounts.map((row) => [row.organizationId, row._count._all] as const)
    );
    const paymentByOrg = new Map(lastPayments.map((payment) => [payment.organizationId, payment]));

    return {
      view: query.view,
      organizations: organizations.map((organization) => {
        const subscription = organization.subscription;
        const inUse = devicesByOrg.get(organization.id) ?? 0;
        const interval = toInterval(subscription?.billingInterval);
        const plan = subscription?.plan ?? null;
        const payment = paymentByOrg.get(organization.id) ?? null;

        return {
          organization: {
            id: organization.id,
            name: organization.name,
            createdAt: organization.createdAt,
            utmSource: organization.utmSource,
            utmMedium: organization.utmMedium,
            utmCampaign: organization.utmCampaign,
          },
          subscription: subscription
            ? {
                id: subscription.id,
                status: subscription.status,
                billingInterval: interval,
                currentPeriodEnd: subscription.currentPeriodEnd,
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                canceledAt: subscription.canceledAt,
                cancelReason: subscription.cancelReason,
                pastDueSince: subscription.pastDueSince,
                graceEndsAt: subscription.pastDueSince ? graceEndsAt(subscription.pastDueSince) : null,
                gateway: subscription.gateway,
                plan: {
                  code: subscription.plan.code,
                  name: subscription.plan.name,
                  pricePerScreenCents: subscription.plan.pricePerScreenCents,
                  priceAnnualPerScreenCents: subscription.plan.priceAnnualPerScreenCents,
                  minScreens: subscription.plan.minScreens,
                  free: isFreePlan(subscription.plan),
                },
              }
            : null,
          screens: {
            inUse,
            billed: plan ? billedScreens(plan, inUse) : inUse,
          },
          billing: {
            interval,
            monthlyEquivalentCents: plan ? estimateMonthlyCents(plan, inUse, interval) : 0,
            cycleCents: plan ? estimateCycleCents(plan, inUse, interval) : 0,
            free: plan ? isFreePlan(plan) : false,
          },
          lastPayment: payment
            ? {
                id: payment.id,
                amountCents: payment.amountCents,
                billingInterval: payment.billingInterval,
                screens: payment.screens,
                method: payment.method,
                provider: payment.provider,
                paidAt: payment.paidAt,
                createdAt: payment.createdAt,
                invoiceUrl: payment.invoiceUrl,
                nfseStatus: payment.nfseStatus,
              }
            : null,
          hasActiveOverride: isOverrideActive(subscription?.override, now),
        };
      }),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  /**
   * Organização + assinatura, garantindo que existem. Usado por toda ação de
   * escrita antes de tocar em qualquer coisa: agir sobre organização que não
   * existe tem de ser 404, nunca 500 com stack no log.
   */
  async requireSubscription(organizationId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true, override: true, organization: true },
    });

    if (!subscription) {
      const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
      throw new AdminOrganizationError(
        organization
          ? 'Esta organização não tem assinatura. Nenhuma ação de cobrança se aplica a ela.'
          : 'Organização não encontrada.',
        organization ? 409 : 404,
        organization ? 'subscription_not_found' : 'organization_not_found'
      );
    }

    return subscription;
  }

  /**
   * Detalhe completo de um cliente (§4.1): assinatura, pagamentos, usuários,
   * uso, atribuição, concessão e trilha de auditoria.
   *
   * Uma chamada só, e não seis rotas: a pergunta do operador com o cliente ao
   * telefone é sempre "o que está acontecendo com esta conta?" — nunca "me traga
   * os pagamentos dela". Seis requisições dariam seis estados que chegam em
   * momentos diferentes, e a tela mostraria uma assinatura ativa ao lado de um
   * pagamento que a cancelou meio segundo antes.
   */
  async getDetail(organizationId: string, now: Date = new Date()) {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        utmContent: true,
        utmTerm: true,
        gclid: true,
        fbclid: true,
        referrer: true,
        landingPath: true,
        subscription: { include: { plan: true, override: true } },
      },
    });

    if (!organization) {
      throw new AdminOrganizationError('Organização não encontrada.', 404, 'organization_not_found');
    }

    const [payments, users, counts, auditLogs, entitlements] = await Promise.all([
      prisma.payment.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.user.findMany({
        where: { organizationId },
        // NUNCA `select: undefined` aqui: `User` tem `password`. O backoffice é
        // o lugar do produto com mais dado de outra pessoa na tela, e um hash de
        // senha trafegando para o navegador do operador não tem uso legítimo
        // nenhum — só risco.
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          lastLogin: true,
          mustChangePassword: true,
          termsAcceptedAt: true,
          marketingOptInAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      subscriptionService.countResources(organizationId),
      prisma.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      subscriptionOverrideService.resolveEntitlements(organizationId, now),
    ]);

    const subscription = organization.subscription;
    const interval = toInterval(subscription?.billingInterval);
    const plan = subscription?.plan ?? null;

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        createdAt: organization.createdAt,
      },
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            billingInterval: interval,
            trialEndsAt: subscription.trialEndsAt,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            canceledAt: subscription.canceledAt,
            cancelReason: subscription.cancelReason,
            pastDueSince: subscription.pastDueSince,
            graceEndsAt: subscription.pastDueSince ? graceEndsAt(subscription.pastDueSince) : null,
            gateway: subscription.gateway,
            // `gatewayCustomerId`/`gatewaySubscriptionId` ficam de fora, como já
            // acontece na rota de billing do cliente: id de gateway na tela é
            // material para engenharia social contra o suporte do Asaas.
            createdAt: subscription.createdAt,
            plan: {
              code: subscription.plan.code,
              name: subscription.plan.name,
              pricePerScreenCents: subscription.plan.pricePerScreenCents,
              priceAnnualPerScreenCents: subscription.plan.priceAnnualPerScreenCents,
              minScreens: subscription.plan.minScreens,
              maxDevices: subscription.plan.maxDevices,
              maxUsers: subscription.plan.maxUsers,
              features: parseFeatures(subscription.plan.features),
              free: isFreePlan(subscription.plan),
            },
          }
        : null,
      billing: {
        interval,
        monthlyEquivalentCents: plan ? estimateMonthlyCents(plan, counts.devices, interval) : 0,
        cycleCents: plan ? estimateCycleCents(plan, counts.devices, interval) : 0,
        billedScreens: plan ? billedScreens(plan, counts.devices) : counts.devices,
        free: plan ? isFreePlan(plan) : false,
      },
      usage: {
        devices: counts.devices,
        users: counts.users,
        organizations: counts.organizations,
      },
      /** Direitos EFETIVOS (plano ∪ concessão válida) — é o que o gate enxerga. */
      entitlements: entitlements satisfies ResolvedEntitlements,
      override: subscription?.override
        ? {
            extraFeatures: parseFeatures(subscription.override.extraFeatures),
            maxDevices: subscription.override.maxDevices,
            maxUsers: subscription.override.maxUsers,
            note: subscription.override.note,
            expiresAt: subscription.override.expiresAt,
            setByUserId: subscription.override.setByUserId,
            createdAt: subscription.override.createdAt,
            updatedAt: subscription.override.updatedAt,
            // A concessão VENCIDA continua sendo devolvida, marcada como
            // inativa: é o histórico de "este cliente teve Power BI em agosto",
            // e some da tela se a rota filtrasse por validade.
            active: isOverrideActive(subscription.override, now),
          }
        : null,
      attribution: {
        utmSource: organization.utmSource,
        utmMedium: organization.utmMedium,
        utmCampaign: organization.utmCampaign,
        utmContent: organization.utmContent,
        utmTerm: organization.utmTerm,
        gclid: organization.gclid,
        fbclid: organization.fbclid,
        referrer: organization.referrer,
        landingPath: organization.landingPath,
      },
      payments,
      users,
      auditLogs,
    };
  }
}

export const adminOrganizationService = new AdminOrganizationService();
