import type { Prisma } from '@prisma/client';

import prisma from '../lib/prisma';
import type { AdSpendChannel, AdSpendUpsertInput } from '../schemas/metrics.schema';
import { checkoutService, type CheckoutMetrics } from './checkout.service';
import { SEM_ATRIBUICAO, startOfUtcDay, utcDayKey } from './site-visit.service';
import {
  billedScreens,
  cycleCentsFromMonthly,
  estimateCycleCents,
  estimateMonthlyCents,
  isFreePlan,
  type BillingInterval,
} from './subscription.service';

/**
 * Métricas da PLATAFORMA para o backoffice — funil ponta a ponta, receita,
 * os cinco indicadores da estratégia e a tabela de origem.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ REGRA DE DINHEIRO — não negociável, e é o defeito US-A-05 visto do lado  ║
 * ║ do relatório:                                                            ║
 * ║                                                                          ║
 * ║   `*MrrCents`  → MENSAL EQUIVALENTE. É o que compara uma venda mensal    ║
 * ║                  com uma anual e responde "quanto de MRR eu tenho".      ║
 * ║   `*CashCents` → CAIXA. É o que o gateway cobrou de uma vez; no anual,   ║
 * ║                  os doze meses juntos (`Payment.amountCents`).           ║
 * ║                                                                          ║
 * ║ As duas colunas NUNCA se somam e nunca se substituem. Uma coluna só      ║
 * ║ obrigaria o painel a escolher entre subestimar o caixa em 12× ou inflar  ║
 * ║ o MRR em 12× — as duas versões erradas, e nenhuma com aviso. Foi         ║
 * ║ exatamente isso que fez o admin exibir R$ 117 onde tinham entrado        ║
 * ║ R$ 1.404. Ver [[medicao-e-atribuicao]] §5.                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * O trecho de checkout do funil NÃO é reimplementado aqui: vem de
 * `checkoutService.getMetrics`, que já resolve status, passos e UTM. Duas
 * contagens do mesmo funil divergiriam na primeira mudança de regra, e a
 * divergência apareceria como "o dashboard e o funil não batem" sem que
 * ninguém soubesse qual dos dois está certo.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;
const RENEWAL_HORIZON_DAYS = 30;

// ─── Semáforo dos 5 indicadores (Estrategia-Lucro-Trafego-2026-09 §5) ────────

export type Semaforo = 'verde' | 'amarelo' | 'vermelho';

export type IndicatorKey =
  | 'costPerConversation'
  | 'conversationToSale'
  | 'cacCash'
  | 'yearlyMix'
  | 'screensPerPaidAccount';

export interface IndicatorBand {
  label: string;
  /** `cents` = dinheiro; `ratio` = fração 0–1; `screens` = quantidade média. */
  unit: 'cents' | 'ratio' | 'screens';
  /** `lower`: menor é melhor (custo). `higher`: maior é melhor (taxa, mix). */
  direction: 'lower' | 'higher';
  green: number;
  yellow: number;
}

/**
 * As faixas do documento de estratégia, em UM lugar só.
 *
 * Ficam exportadas porque a tela precisa desenhar a régua ao lado do número: um
 * semáforo sem a faixa vira uma bolinha colorida que ninguém sabe contestar. E
 * ficam aqui, no servidor, para o painel não ter uma segunda cópia dos limites
 * que envelhece separada quando o dono mudar o teto de CAC (já mudou uma vez,
 * de R$ 560 para R$ 374).
 */
export const INDICATOR_BANDS: Record<IndicatorKey, IndicatorBand> = {
  costPerConversation: {
    label: 'Custo por conversa iniciada',
    unit: 'cents',
    direction: 'lower',
    green: 3_500, // R$ 35
    yellow: 5_000, // R$ 50
  },
  conversationToSale: {
    label: 'Conversa → venda',
    unit: 'ratio',
    direction: 'higher',
    green: 0.09,
    yellow: 0.05,
  },
  cacCash: {
    label: 'CAC (caixa)',
    unit: 'cents',
    direction: 'lower',
    green: 37_400, // R$ 374 — teto de CAC = 40% do caixa do primeiro ano
    yellow: 56_000, // R$ 560
  },
  yearlyMix: {
    label: 'Mix anual',
    unit: 'ratio',
    direction: 'higher',
    green: 0.7,
    yellow: 0.6,
  },
  screensPerPaidAccount: {
    label: 'Telas por conta paga',
    unit: 'screens',
    direction: 'higher',
    green: 1.8,
    yellow: 1.4,
  },
};

/**
 * Classifica um valor na faixa do indicador.
 *
 * `null` entra e `null` sai. Não existe "cinza vira verde": um indicador sem
 * dado não é um indicador bom, e pintá-lo de verde por omissão é a forma mais
 * barata de um painel mentir para melhor.
 */
export function classifyIndicator(key: IndicatorKey, value: number | null): Semaforo | null {
  if (value === null || !Number.isFinite(value)) return null;

  const band = INDICATOR_BANDS[key];
  if (band.direction === 'lower') {
    if (value <= band.green) return 'verde';
    if (value <= band.yellow) return 'amarelo';
    return 'vermelho';
  }
  if (value >= band.green) return 'verde';
  if (value >= band.yellow) return 'amarelo';
  return 'vermelho';
}

/** Motivos pelos quais um indicador vem sem valor. Texto exibido pela tela. */
export const SEM_GASTO = 'sem gasto informado';
export const SEM_CONVERSA = 'sem conversa iniciada na semana';
export const SEM_VENDA = 'sem venda na semana';

export interface IndicatorReading {
  key: IndicatorKey;
  label: string;
  unit: IndicatorBand['unit'];
  /** `null` quando não há como calcular — NUNCA zero. Ver `reason`. */
  value: number | null;
  status: Semaforo | null;
  reason: string | null;
  band: { direction: IndicatorBand['direction']; green: number; yellow: number };
}

// ─── Tipos de saída ──────────────────────────────────────────────────────────

export interface PlatformFunnel {
  period: { startDate: string; endDate: string };
  /** Contagem própria (`SiteVisit`), não GA4. Ver `site-visit.service`. */
  visits: { views: number; uniques: number };
  leads: number;
  checkout: {
    /** Sessões criadas no período — a boca do funil de compra. */
    started: number;
    identified: number;
    paymentPending: number;
    paid: number;
    abandoned: number;
    expired: number;
  };
  /** Frações entre etapas. `null` quando o denominador é zero (não "0%"). */
  rates: {
    visitToLead: number | null;
    leadToCheckout: number | null;
    checkoutToPaid: number | null;
    visitToPaid: number | null;
  };
  /** Relatório completo do checkout, como já era servido pelo admin do funil. */
  checkoutDetail: CheckoutMetrics;
}

export interface RevenueOverview {
  period: { startDate: string; endDate: string };
  currency: 'BRL';
  /** MENSAL EQUIVALENTE das assinaturas `active` de plano pago. */
  mrrCents: number;
  /** CAIXA confirmado no período (`Payment.status = confirmed`). Ciclo inteiro. */
  cashInPeriodCents: number;
  cashInPeriodByInterval: Record<BillingInterval, { payments: number; cashCents: number }>;
  payingAccounts: number;
  payingByPlan: Array<{
    planCode: string;
    planName: string;
    accounts: number;
    mrrCents: number;
    yearlyAccounts: number;
  }>;
  /** Fração de contas pagas no anual (0–1). `null` sem conta paga. */
  yearlyMixRate: number | null;
  screensPerPayingAccount: {
    /** Telas efetivamente vinculadas (`Device.status = linked`). */
    linked: number | null;
    /** Telas faturadas — respeita o piso `minScreens` do plano. */
    billed: number | null;
  };
  churn: {
    canceledInPeriod: number;
    /**
     * ESTIMATIVA: `ativas hoje + canceladas no período`. Não existe histórico
     * de status (nenhuma tabela guarda "quantas estavam ativas em 01/09"), e
     * reconstruir pela data de criação erraria para o outro lado. Serve para
     * tendência; não serve para relatório contratual.
     */
    activeAtPeriodStart: number;
    rate: number | null;
  };
  upcomingRenewals: {
    horizonDays: number;
    count: number;
    /** O que será COBRADO (ciclo inteiro). */
    cashCents: number;
    /** O mesmo dinheiro em mensal equivalente — para comparar com o MRR. */
    mrrCents: number;
    byInterval: Record<BillingInterval, { count: number; cashCents: number }>;
  };
}

export interface WeeklyCohort {
  /** Segunda-feira da semana, `YYYY-MM-DD`. */
  weekStart: string;
  /** Domingo da semana, `YYYY-MM-DD`. */
  weekEnd: string;
  /** `null` = nenhuma linha de `AdSpend` na semana. Zero seria "campanha de graça". */
  adSpendCents: number | null;
  adSpendByChannel: Array<{ channel: string; amountCents: number }>;
  /**
   * "Conversa iniciada" hoje = `Lead` criado na semana.
   *
   * É um PROXY declarado: a estratégia mede conversas de WhatsApp e não há
   * integração de WhatsApp neste produto. O formulário do site é o contato mais
   * próximo que o nosso banco registra. Trocar o proxy sem trocar o rótulo
   * faria a série histórica virar duas séries coladas.
   */
  conversations: number;
  sales: number;
  salesCashCents: number;
  yearlySales: number;
  indicators: IndicatorReading[];
}

export interface IndicatorsReport {
  period: { startDate: string; endDate: string };
  bands: Record<IndicatorKey, IndicatorBand>;
  weeks: WeeklyCohort[];
}

export interface SourceRow {
  utmSource: string;
  utmCampaign: string;
  visits: number;
  uniqueVisits: number;
  leads: number;
  paid: number;
  /** Caixa das vendas pagas atribuídas a esta origem (ciclo inteiro). */
  paidCashCents: number;
  /** As mesmas vendas em mensal equivalente. */
  paidMrrCents: number;
}

export interface SourcesReport {
  period: { startDate: string; endDate: string };
  /** Agregado por `utmSource` (campanha colapsada). */
  bySource: SourceRow[];
  /** Quebra fina `utmSource × utmCampaign`. */
  bySourceCampaign: SourceRow[];
}

export interface AdSpendRow {
  id: string;
  weekStart: string;
  channel: string;
  amountCents: number;
  note: string | null;
}

export interface PlatformOverview {
  period: { startDate: string; endDate: string };
  funnel: PlatformFunnel;
  revenue: RevenueOverview;
  indicators: IndicatorsReport;
  sources: SourcesReport;
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

interface ResolvedRange {
  startDate: Date;
  endDate: Date;
}

function resolveRange(range: { startDate?: Date; endDate?: Date } = {}): ResolvedRange {
  const endDate = range.endDate ?? new Date();
  const startDate = range.startDate ?? new Date(endDate.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);
  return { startDate, endDate };
}

function periodOf(range: ResolvedRange): { startDate: string; endDate: string } {
  return { startDate: range.startDate.toISOString(), endDate: range.endDate.toISOString() };
}

/**
 * `billingInterval` é `String` no banco (não enum), então qualquer linha antiga
 * ou vinda de um gateway pode trazer outra coisa. Tudo que não é `yearly` cai
 * em `monthly`: é o padrão de cobrança e, no pior caso, subestima o caixa —
 * jamais multiplica por 12 um valor que não é anual.
 */
function normalizeInterval(value: string | null | undefined): BillingInterval {
  return value === 'yearly' ? 'yearly' : 'monthly';
}

/** Fração, ou `null` quando não há denominador. Nunca devolve `0` por omissão. */
function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

/**
 * Segunda-feira (UTC) da semana da data. A coorte da estratégia é semanal e
 * começa na segunda; usar domingo deslocaria toda a série em um dia e a
 * comparação com o gasto informado (`AdSpend.weekStart`) casaria com a semana
 * errada.
 */
export function startOfUtcWeek(date: Date): Date {
  const day = startOfUtcDay(date);
  const offsetFromMonday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - offsetFromMonday * DAY_MS);
}

/**
 * Chave de merge das tabelas de origem.
 *
 * Baixa a caixa SÓ NA LEITURA porque as três fontes gravam a UTM como o
 * navegador mandou: `SiteVisit` pode ter `Facebook` e `Lead` ter `facebook`
 * para a mesma campanha. Sem esta unificação, a tabela "visita × lead × pagante"
 * mostraria duas linhas onde há uma, cada uma com metade da história — e a
 * conclusão seria "a campanha traz visita e não traz lead", que é falsa.
 */
function originKey(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim().toLowerCase();
  return trimmed === '' ? SEM_ATRIBUICAO : trimmed;
}

const PAID_PLAN_SELECT = {
  id: true,
  code: true,
  name: true,
  pricePerScreenCents: true,
  priceAnnualPerScreenCents: true,
  minScreens: true,
  features: true,
} satisfies Prisma.PlanSelect;

const ACTIVE_SUBSCRIPTION_SELECT = {
  organizationId: true,
  billingInterval: true,
  currentPeriodEnd: true,
  plan: { select: PAID_PLAN_SELECT },
} satisfies Prisma.SubscriptionSelect;

export class AdminMetricsService {
  /**
   * Tudo de uma vez, para a tela inicial do backoffice.
   *
   * As quatro seções rodam em paralelo e cada uma faz suas próprias consultas —
   * há sobreposição (leads e sessões pagas são lidos duas vezes). É deliberado:
   * a alternativa seria um método gigante com um `select` compartilhado, e o
   * primeiro relatório que precisasse de uma coluna a mais quebraria os outros
   * três. Na ordem de grandeza atual (milhares de linhas) a leitura repetida
   * custa milissegundos; quando custar, o remédio é cache de resposta, não
   * fundir os relatórios.
   */
  async getOverview(range: { startDate?: Date; endDate?: Date } = {}): Promise<PlatformOverview> {
    const resolved = resolveRange(range);

    const [funnel, revenue, indicators, sources] = await Promise.all([
      this.getFunnel(resolved),
      this.getRevenue(resolved),
      this.getIndicators(resolved),
      this.getSources(resolved),
    ]);

    return { period: periodOf(resolved), funnel, revenue, indicators, sources };
  }

  /**
   * Funil ponta a ponta numa fonte só: visita → lead → checkout → pago.
   *
   * O valor deste bloco não está em nenhuma das etapas isoladas — cada uma já
   * existia em algum lugar. Está em serem lidas do MESMO banco com o MESMO
   * recorte de tempo: é a única forma de a taxa "visita → pagante" significar
   * alguma coisa. Com visita vindo do GA4 (que subconta quem recusa cookie) e
   * pagante vindo daqui, o número seria otimista por construção.
   */
  async getFunnel(range: { startDate?: Date; endDate?: Date } = {}): Promise<PlatformFunnel> {
    const resolved = resolveRange(range);
    const { startDate, endDate } = resolved;

    const [visitAgg, leads, checkoutDetail] = await Promise.all([
      prisma.siteVisit.aggregate({
        _sum: { views: true, uniques: true },
        where: { day: { gte: startOfUtcDay(startDate), lte: startOfUtcDay(endDate) } },
      }),
      prisma.lead.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      checkoutService.getMetrics(resolved),
    ]);

    const visits = {
      views: visitAgg._sum.views ?? 0,
      uniques: visitAgg._sum.uniques ?? 0,
    };

    const checkout = {
      // `funnel.viewed` = sessões criadas no período; `funnel.identified` e
      // `funnel.submitted` são etapas ALCANÇADAS (não o status atual), que é o
      // que faz o funil ser decrescente em vez de somar 100%.
      started: checkoutDetail.funnel.viewed,
      identified: checkoutDetail.funnel.identified,
      paymentPending: checkoutDetail.funnel.submitted,
      paid: checkoutDetail.funnel.paid,
      abandoned: checkoutDetail.byStatus.abandoned,
      expired: checkoutDetail.byStatus.expired,
    };

    return {
      period: periodOf(resolved),
      visits,
      leads,
      checkout,
      rates: {
        // Denominador é a visita ÚNICA, não a página vista: quem abre quatro
        // páginas não é quatro oportunidades de virar lead, e usar `views`
        // faria a taxa cair sempre que o site melhorasse a navegação.
        visitToLead: ratio(leads, visits.uniques),
        leadToCheckout: ratio(checkout.started, leads),
        checkoutToPaid: ratio(checkout.paid, checkout.started),
        visitToPaid: ratio(checkout.paid, visits.uniques),
      },
      checkoutDetail,
    };
  }

  /**
   * Receita: MRR, caixa do período, mix, churn e renovações.
   *
   * Leia o cabeçalho do arquivo antes de mexer em qualquer soma daqui.
   */
  async getRevenue(range: { startDate?: Date; endDate?: Date } = {}): Promise<RevenueOverview> {
    const resolved = resolveRange(range);
    const { startDate, endDate } = resolved;
    const now = new Date();
    const horizonEnd = new Date(now.getTime() + RENEWAL_HORIZON_DAYS * DAY_MS);

    const [subscriptions, deviceCounts, payments, canceledInPeriod] = await Promise.all([
      prisma.subscription.findMany({ where: { status: 'active' }, select: ACTIVE_SUBSCRIPTION_SELECT }),
      prisma.device.groupBy({
        by: ['organizationId'],
        where: { status: 'linked' },
        _count: { _all: true },
      }),
      prisma.payment.findMany({
        where: {
          status: 'confirmed',
          // `paidAt` é a data do dinheiro; `createdAt` é o fallback para linhas
          // confirmadas sem data de baixa (pagamento manual registrado pelo
          // backoffice, importação antiga). Filtrar só por `paidAt` esconderia
          // justamente o Pix manual do piloto — a receita que mais precisa
          // aparecer.
          OR: [
            { paidAt: { gte: startDate, lte: endDate } },
            { paidAt: null, createdAt: { gte: startDate, lte: endDate } },
          ],
        },
        select: { amountCents: true, billingInterval: true },
      }),
      prisma.subscription.count({
        where: {
          status: 'canceled',
          canceledAt: { gte: startDate, lte: endDate },
          // Só plano pago: a saída de uma conta grátis não é churn de receita.
          plan: { pricePerScreenCents: { gt: 0 } },
        },
      }),
    ]);

    const linkedByOrg = new Map<string, number>();
    for (const row of deviceCounts) {
      if (row.organizationId) linkedByOrg.set(row.organizationId, row._count._all);
    }

    let mrrCents = 0;
    let payingAccounts = 0;
    let yearlyAccounts = 0;
    let linkedScreens = 0;
    let billedScreensTotal = 0;

    const byPlan = new Map<string, { planCode: string; planName: string; accounts: number; mrrCents: number; yearlyAccounts: number }>();
    const renewals = {
      count: 0,
      cashCents: 0,
      mrrCents: 0,
      byInterval: {
        monthly: { count: 0, cashCents: 0 },
        yearly: { count: 0, cashCents: 0 },
      } as Record<BillingInterval, { count: number; cashCents: number }>,
    };

    for (const subscription of subscriptions) {
      // Definição de "pagante" do plano do backoffice §2.8: `active` e plano que
      // gera fatura. `isFreePlan` também exclui o Enterprise sob consulta, cujo
      // `pricePerScreenCents = 0` NÃO significa gratuito — contá-lo como
      // pagante de R$ 0 derrubaria o MRR médio sem que nada parecesse errado.
      if (isFreePlan(subscription.plan)) continue;

      const linked = linkedByOrg.get(subscription.organizationId) ?? 0;
      const interval = normalizeInterval(subscription.billingInterval);
      const monthly = estimateMonthlyCents(subscription.plan, linked, interval);
      if (monthly <= 0) continue;

      payingAccounts += 1;
      mrrCents += monthly;
      linkedScreens += linked;
      billedScreensTotal += billedScreens(subscription.plan, linked);
      if (interval === 'yearly') yearlyAccounts += 1;

      const entry = byPlan.get(subscription.plan.code) ?? {
        planCode: subscription.plan.code,
        planName: subscription.plan.name,
        accounts: 0,
        mrrCents: 0,
        yearlyAccounts: 0,
      };
      entry.accounts += 1;
      entry.mrrCents += monthly;
      if (interval === 'yearly') entry.yearlyAccounts += 1;
      byPlan.set(subscription.plan.code, entry);

      const periodEnd = subscription.currentPeriodEnd;
      if (periodEnd && periodEnd > now && periodEnd <= horizonEnd) {
        // Renovação é CAIXA: o que vai ser cobrado no dia. Uma assinatura anual
        // que renova em 12 dias traz doze meses de uma vez, e mostrar o mensal
        // equivalente aqui faria a previsão de caixa do mês vir 12× menor —
        // que é o US-A-05 numa tela nova.
        const cash = estimateCycleCents(subscription.plan, linked, interval);
        renewals.count += 1;
        renewals.cashCents += cash;
        renewals.mrrCents += monthly;
        renewals.byInterval[interval].count += 1;
        renewals.byInterval[interval].cashCents += cash;
      }
    }

    const cashInPeriodByInterval: Record<BillingInterval, { payments: number; cashCents: number }> = {
      monthly: { payments: 0, cashCents: 0 },
      yearly: { payments: 0, cashCents: 0 },
    };
    let cashInPeriodCents = 0;
    for (const payment of payments) {
      // `Payment.amountCents` JÁ É o ciclo inteiro. Não multiplique por 12 aqui:
      // é o erro simétrico ao de tratar `CheckoutSession.amountCents` como caixa.
      const interval = normalizeInterval(payment.billingInterval);
      cashInPeriodCents += payment.amountCents;
      cashInPeriodByInterval[interval].payments += 1;
      cashInPeriodByInterval[interval].cashCents += payment.amountCents;
    }

    const activeAtPeriodStart = payingAccounts + canceledInPeriod;

    return {
      period: periodOf(resolved),
      currency: 'BRL',
      mrrCents,
      cashInPeriodCents,
      cashInPeriodByInterval,
      payingAccounts,
      payingByPlan: [...byPlan.values()].sort((a, b) => b.mrrCents - a.mrrCents),
      yearlyMixRate: ratio(yearlyAccounts, payingAccounts),
      screensPerPayingAccount: {
        linked: ratio(linkedScreens, payingAccounts),
        billed: ratio(billedScreensTotal, payingAccounts),
      },
      churn: {
        canceledInPeriod,
        activeAtPeriodStart,
        rate: ratio(canceledInPeriod, activeAtPeriodStart),
      },
      upcomingRenewals: { horizonDays: RENEWAL_HORIZON_DAYS, ...renewals },
    };
  }

  /**
   * Os cinco indicadores da estratégia, POR COORTE SEMANAL.
   *
   * Coorte, e nunca média acumulada: a média esconde a piora recente atrás do
   * bom começo, e o gatilho de corte da estratégia ("dois indicadores no
   * vermelho na MESMA semana") não existe sem a série semanal. Um painel que
   * mostrasse a média do trimestre continuaria verde durante o mês inteiro em
   * que o dinheiro está sendo queimado.
   */
  async getIndicators(range: { startDate?: Date; endDate?: Date } = {}): Promise<IndicatorsReport> {
    const resolved = resolveRange(range);
    const { startDate, endDate } = resolved;

    const firstWeek = startOfUtcWeek(startDate);
    const lastWeek = startOfUtcWeek(endDate);

    const [spendRows, leads, paidSessions] = await Promise.all([
      prisma.adSpend.findMany({
        where: { weekStart: { gte: firstWeek, lte: lastWeek } },
        select: { weekStart: true, channel: true, amountCents: true },
      }),
      prisma.lead.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { createdAt: true },
      }),
      prisma.checkoutSession.findMany({
        // Filtra por `paidAt`, não por `status`: a coorte é a semana em que o
        // DINHEIRO entrou. Uma sessão paga que depois expirou continua sendo
        // uma venda daquela semana.
        where: { paidAt: { gte: startDate, lte: endDate } },
        select: { paidAt: true, billingInterval: true, screens: true, amountCents: true },
      }),
    ]);

    interface Bucket {
      spendCents: number | null;
      byChannel: Map<string, number>;
      conversations: number;
      sales: number;
      salesCashCents: number;
      yearlySales: number;
      screens: number;
    }

    const buckets = new Map<string, Bucket>();
    const emptyBucket = (): Bucket => ({
      // `null`, não `0`: a distinção entre "não gastei" e "não informei" é o
      // ponto inteiro deste bloco.
      spendCents: null,
      byChannel: new Map<string, number>(),
      conversations: 0,
      sales: 0,
      salesCashCents: 0,
      yearlySales: 0,
      screens: 0,
    });

    const bucketFor = (date: Date): Bucket => {
      const key = utcDayKey(startOfUtcWeek(date));
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = emptyBucket();
        buckets.set(key, bucket);
      }
      return bucket;
    };

    // Toda semana do período existe na saída, mesmo vazia: uma semana ausente
    // seria lida como "não aconteceu nada" quando o que houve foi nenhuma
    // venda — e é justamente essa a semana que precisa aparecer vermelha.
    for (let cursor = firstWeek.getTime(); cursor <= lastWeek.getTime(); cursor += 7 * DAY_MS) {
      buckets.set(utcDayKey(new Date(cursor)), emptyBucket());
    }

    for (const row of spendRows) {
      const bucket = bucketFor(row.weekStart);
      bucket.spendCents = (bucket.spendCents ?? 0) + row.amountCents;
      bucket.byChannel.set(row.channel, (bucket.byChannel.get(row.channel) ?? 0) + row.amountCents);
    }

    for (const lead of leads) {
      bucketFor(lead.createdAt).conversations += 1;
    }

    for (const session of paidSessions) {
      if (!session.paidAt) continue;
      const bucket = bucketFor(session.paidAt);
      const interval = normalizeInterval(session.billingInterval);
      bucket.sales += 1;
      // `CheckoutSession.amountCents` é MENSAL EQUIVALENTE — a conversão para
      // caixa passa por `cycleCentsFromMonthly`, e por lugar nenhum mais.
      bucket.salesCashCents += cycleCentsFromMonthly(session.amountCents, interval);
      if (interval === 'yearly') bucket.yearlySales += 1;
      bucket.screens += session.screens;
    }

    const weeks: WeeklyCohort[] = [...buckets.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([weekStart, bucket]) => {
        const start = new Date(`${weekStart}T00:00:00.000Z`);
        const end = new Date(start.getTime() + 6 * DAY_MS);

        return {
          weekStart,
          weekEnd: utcDayKey(end),
          adSpendCents: bucket.spendCents,
          adSpendByChannel: [...bucket.byChannel.entries()]
            .map(([channel, amountCents]) => ({ channel, amountCents }))
            .sort((a, b) => b.amountCents - a.amountCents),
          conversations: bucket.conversations,
          sales: bucket.sales,
          salesCashCents: bucket.salesCashCents,
          yearlySales: bucket.yearlySales,
          indicators: buildIndicators(bucket),
        };
      });

    return { period: periodOf(resolved), bands: INDICATOR_BANDS, weeks };
  }

  /**
   * Visitas, leads e pagantes lado a lado por origem.
   *
   * É a tabela que separa "a campanha traz visita" de "a campanha traz
   * pagante" — duas coisas que o relatório de mídia junta e que decidem
   * orçamentos opostos.
   */
  async getSources(range: { startDate?: Date; endDate?: Date } = {}): Promise<SourcesReport> {
    const resolved = resolveRange(range);
    const { startDate, endDate } = resolved;

    const [visitRows, leadRows, paidRows] = await Promise.all([
      prisma.siteVisit.groupBy({
        by: ['utmSource', 'utmCampaign'],
        where: { day: { gte: startOfUtcDay(startDate), lte: startOfUtcDay(endDate) } },
        _sum: { views: true, uniques: true },
      }),
      prisma.lead.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { utmSource: true, utmCampaign: true },
      }),
      prisma.checkoutSession.findMany({
        where: { paidAt: { gte: startDate, lte: endDate } },
        select: { utmSource: true, utmCampaign: true, amountCents: true, billingInterval: true },
      }),
    ]);

    const rows = new Map<string, SourceRow>();
    const rowFor = (source: string, campaign: string): SourceRow => {
      const key = `${source}\u0000${campaign}`;
      let row = rows.get(key);
      if (!row) {
        row = {
          utmSource: source,
          utmCampaign: campaign,
          visits: 0,
          uniqueVisits: 0,
          leads: 0,
          paid: 0,
          paidCashCents: 0,
          paidMrrCents: 0,
        };
        rows.set(key, row);
      }
      return row;
    };

    for (const visit of visitRows) {
      const row = rowFor(originKey(visit.utmSource), originKey(visit.utmCampaign));
      row.visits += visit._sum.views ?? 0;
      row.uniqueVisits += visit._sum.uniques ?? 0;
    }

    for (const lead of leadRows) {
      rowFor(originKey(lead.utmSource), originKey(lead.utmCampaign)).leads += 1;
    }

    for (const session of paidRows) {
      const row = rowFor(originKey(session.utmSource), originKey(session.utmCampaign));
      const interval = normalizeInterval(session.billingInterval);
      row.paid += 1;
      row.paidMrrCents += session.amountCents;
      row.paidCashCents += cycleCentsFromMonthly(session.amountCents, interval);
    }

    const bySourceCampaign = [...rows.values()].sort(
      (a, b) => b.paidCashCents - a.paidCashCents || b.visits - a.visits
    );

    const collapsed = new Map<string, SourceRow>();
    for (const row of bySourceCampaign) {
      const entry = collapsed.get(row.utmSource) ?? {
        utmSource: row.utmSource,
        utmCampaign: '(todas)',
        visits: 0,
        uniqueVisits: 0,
        leads: 0,
        paid: 0,
        paidCashCents: 0,
        paidMrrCents: 0,
      };
      entry.visits += row.visits;
      entry.uniqueVisits += row.uniqueVisits;
      entry.leads += row.leads;
      entry.paid += row.paid;
      entry.paidCashCents += row.paidCashCents;
      entry.paidMrrCents += row.paidMrrCents;
      collapsed.set(row.utmSource, entry);
    }

    return {
      period: periodOf(resolved),
      bySource: [...collapsed.values()].sort(
        (a, b) => b.paidCashCents - a.paidCashCents || b.visits - a.visits
      ),
      bySourceCampaign,
    };
  }

  // ─── Gasto de mídia (entrada manual) ───────────────────────────────────────

  /**
   * Gasto informado no período. O filtro é pela SEMANA que contém as bordas —
   * pedir "de 10 a 20 de setembro" e não ver a linha da semana do dia 8, que
   * cobre o dia 10, faria o CAC dessas semanas aparecer como "sem gasto".
   */
  async listAdSpend(range: { startDate?: Date; endDate?: Date } = {}): Promise<AdSpendRow[]> {
    const { startDate, endDate } = resolveRange(range);

    const rows = await prisma.adSpend.findMany({
      where: { weekStart: { gte: startOfUtcWeek(startDate), lte: startOfUtcWeek(endDate) } },
      orderBy: [{ weekStart: 'desc' }, { channel: 'asc' }],
      select: { id: true, weekStart: true, channel: true, amountCents: true, note: true },
    });

    return rows.map((row) => ({
      id: row.id,
      weekStart: utcDayKey(row.weekStart),
      channel: row.channel,
      amountCents: row.amountCents,
      note: row.note,
    }));
  }

  /**
   * Grava (ou substitui) o gasto de uma semana e canal.
   *
   * A data é NORMALIZADA para a segunda-feira antes de tocar no banco. Sem
   * isso, o operador que digitasse quarta criaria um segundo balde para a mesma
   * semana: a chave única `(weekStart, channel)` não colidiria, o valor não
   * substituiria o anterior, e a coorte semanal — que procura pela segunda —
   * continuaria mostrando "sem gasto informado" com o dinheiro já lançado.
   */
  async upsertAdSpend(input: AdSpendUpsertInput): Promise<AdSpendRow> {
    const weekStart = startOfUtcWeek(input.weekStart);
    const channel: AdSpendChannel = input.channel;

    const row = await prisma.adSpend.upsert({
      where: { weekStart_channel: { weekStart, channel } },
      create: { weekStart, channel, amountCents: input.amountCents, note: input.note ?? null },
      update: { amountCents: input.amountCents, note: input.note ?? null },
      select: { id: true, weekStart: true, channel: true, amountCents: true, note: true },
    });

    return {
      id: row.id,
      weekStart: utcDayKey(row.weekStart),
      channel: row.channel,
      amountCents: row.amountCents,
      note: row.note,
    };
  }
}

/**
 * Monta as cinco leituras de uma semana.
 *
 * ⚠️ A REGRA QUE NÃO PODE SER RELAXADA: sem linha de `AdSpend` na semana, os
 * indicadores que dependem de gasto devolvem `null` com `reason: 'sem gasto
 * informado'` — JAMAIS zero. Zero seria lido como "campanha de graça": custo
 * por conversa R$ 0,00 e CAC R$ 0,00 pintam dois indicadores de verde e
 * disparam o gatilho de escala da estratégia em cima de uma semana sobre a qual
 * não se sabe nada.
 */
function buildIndicators(bucket: {
  spendCents: number | null;
  conversations: number;
  sales: number;
  yearlySales: number;
  screens: number;
}): IndicatorReading[] {
  const reading = (key: IndicatorKey, value: number | null, reason: string | null): IndicatorReading => {
    const band = INDICATOR_BANDS[key];
    return {
      key,
      label: band.label,
      unit: band.unit,
      value,
      status: classifyIndicator(key, value),
      reason: value === null ? reason : null,
      band: { direction: band.direction, green: band.green, yellow: band.yellow },
    };
  };

  const spend = bucket.spendCents;

  // 1 — Custo por conversa iniciada.
  const costPerConversation =
    spend === null || bucket.conversations <= 0 ? null : spend / bucket.conversations;

  // 3 — CAC (caixa): gasto ÷ novos pagantes da semana.
  const cacCash = spend === null || bucket.sales <= 0 ? null : spend / bucket.sales;

  return [
    reading(
      'costPerConversation',
      costPerConversation,
      // A ordem importa: "sem gasto" é a informação acionável (falta lançar o
      // valor); "sem conversa" com gasto lançado é um resultado ruim, não uma
      // lacuna de cadastro.
      spend === null ? SEM_GASTO : SEM_CONVERSA
    ),
    reading('conversationToSale', ratio(bucket.sales, bucket.conversations), SEM_CONVERSA),
    reading('cacCash', cacCash, spend === null ? SEM_GASTO : SEM_VENDA),
    reading('yearlyMix', ratio(bucket.yearlySales, bucket.sales), SEM_VENDA),
    reading('screensPerPaidAccount', ratio(bucket.screens, bucket.sales), SEM_VENDA),
  ];
}

export const adminMetricsService = new AdminMetricsService();
