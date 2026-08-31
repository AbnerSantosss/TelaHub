import { api } from '../libs/api';

// ==============================================================================
// Contrato real de `GET /api/plans` e `GET /api/billing/subscription`.
//
// O tipo `Plan` antigo em `types.ts` (com `priceCents`) NÃO corresponde ao que a
// API devolve — a cobrança é por tela ativa, então o preço unitário é
// `pricePerScreenCents` e existe um piso de faturamento (`minScreens`). Este
// arquivo é a fonte de verdade do contrato de cobrança no cliente.
// ==============================================================================

export interface PlanLimits {
  /** `null` = ilimitado. */
  maxDevices: number | null;
  maxUsers: number | null;
  maxOrganizations: number | null;
}

export interface PublicPlan {
  code: string;
  name: string;
  /** Preço por tela ativa, em centavos. 0 no plano grátis e no sob-consulta. */
  pricePerScreenCents: number;
  pricePerScreen: number;
  /** `true` quando o preço é negociado (Enterprise) — não somar na fatura. */
  quoteOnly: boolean;
  /** `true` só no plano de entrada gratuito. */
  free: boolean;
  /** Piso de faturamento: cobra-se pelo menos este número de telas. */
  minScreens: number;
  limits: PlanLimits;
  features: string[];
}

export interface BillingPolicy {
  entryPlanCode: string;
  freeScreens: number;
  trialDays: number;
  creditCardRequired: boolean;
  /** A partir de qual tela a cobrança começa. */
  chargesFromScreen: number;
  proration: string;
  /** Sempre `false`: é a promessa pública do produto. */
  retroactiveCharges: boolean;
}

export interface PlansCatalog {
  currency: string;
  billingUnit: string;
  billingPolicy: BillingPolicy;
  plans: PublicPlan[];
}

export interface EstimatedMonthly {
  currency: string;
  activeScreens: number;
  billedScreens: number;
  cents: number;
  amount: number;
  free: boolean;
  quoteOnly: boolean;
}

export interface UsageEntry {
  used: number;
  limit: number | null;
  atLimit: boolean;
}

export interface BillingUsage {
  organizationId: string;
  planCode: string;
  planName: string;
  pricePerScreenCents: number;
  minScreens: number;
  freePlan: boolean;
  devices: UsageEntry;
  users: UsageEntry;
  organizations: UsageEntry;
}

export interface CurrentSubscription {
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | string;
  isActive: boolean;
  trialEndsAt: string | null;
  trialDaysRemaining: number;
  currentPeriodEnd: string | null;
  gateway: string | null;
  plan: PublicPlan | null;
  estimatedMonthly: EstimatedMonthly | null;
}

export interface BillingSnapshot {
  subscription: CurrentSubscription;
  usage: BillingUsage;
}

/** `GET /api/plans` — pública. Devolve `null` se a API não responder. */
export const getPlansCatalog = async (): Promise<PlansCatalog | null> => {
  try {
    return await api.get<PlansCatalog>('/plans');
  } catch {
    return null;
  }
};

/** `GET /api/billing/subscription` — autenticada. */
export const getBillingSnapshot = async (): Promise<BillingSnapshot | null> => {
  try {
    return await api.get<BillingSnapshot>('/billing/subscription');
  } catch {
    return null;
  }
};

// ─── Cálculo da fatura ────────────────────────────────────────────────────────
//
// Espelha `estimateMonthlyCents` em `backend/src/services/subscription.service.ts`.
// Se a regra mudar lá, muda aqui — divergência faz a tela prometer um valor que
// a fatura não cumpre.

/** Telas efetivamente cobradas: respeita o piso do plano. */
export const billedScreens = (plan: PublicPlan, activeScreens: number): number => {
  if (plan.free || plan.quoteOnly) return activeScreens;
  return Math.max(activeScreens, plan.minScreens);
};

/** Valor mensal em centavos. `0` no grátis e no sob-consulta. */
export const monthlyCents = (plan: PublicPlan, activeScreens: number): number => {
  if (plan.free || plan.quoteOnly) return 0;
  return billedScreens(plan, activeScreens) * plan.pricePerScreenCents;
};

export const formatBRL = (cents: number): string =>
  (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

/**
 * Quantas telas o plano ainda permite ligar. `null` = ilimitado.
 * Só o plano grátis tem trava real; nos pagos o que cresce é a fatura.
 */
export const remainingScreens = (plan: PublicPlan, activeScreens: number): number | null => {
  if (plan.limits.maxDevices === null) return null;
  return Math.max(0, plan.limits.maxDevices - activeScreens);
};

// ─────────────────────────────────────────────────────────────────────────────
// FEATURES DE PLANO — ESPELHO DE LEITURA, NÃO O GATE
//
// O gate de verdade é o servidor (`requireFeature` no backend). O que estas
// funções fazem é evitar que a pessoa monte uma tela inteira com um widget que
// será recusado no salvamento — é cortesia de UX, não fronteira de segurança.
// Nunca tratar `hasFeature` daqui como proteção: quem chama a API direto passa
// por cima dela.
// ─────────────────────────────────────────────────────────────────────────────

/** Feature do catálogo que libera os painéis de gestão (plano Rede). */
export const BI_FEATURE_KEY = 'powerbi';

/** Feature do catálogo que libera documentos (plano Loja). */
export const DOC_FEATURE_KEY = 'documentos';

/**
 * Widgets cobertos pela feature `powerbi`. Precisa ser IGUAL a
 * `BI_WIDGET_TYPES` em `apps/api/src/services/entitlement.service.ts` — se as
 * duas listas divergirem, o editor libera um widget que o servidor recusa (ou
 * esconde um que ele aceitaria).
 *
 * ⚠️ A lista MUDOU em 2026-08-31, nos dois sentidos, junto com o empacotamento
 * v2 (§5.1b do plano comercial): documento saiu daqui para o Loja, e cotações,
 * snapshot e HTML próprio entraram, porque a página de vendas passou a
 * anunciá-los como "painel de resultados — plano Rede". Antes eles estavam de
 * fora justamente por nunca terem sido vendidos como pagos; o critério não
 * mudou (o gate só alcança o que a oferta publicada diz ser pago), a oferta é
 * que mudou.
 */
export const BI_WIDGET_TYPES = [
  'POWER_BI',
  'AIRTABLE',
  'MARKET_WATCH',
  'BROWSER_SNAPSHOT',
  'EMBED_HTML',
] as const;

/**
 * Widgets de documento, cobertos pela feature `documentos` (plano Loja).
 * Espelha `DOC_WIDGET_TYPES` do backend. Eles saíram do grupo de BI porque
 * "o comunicado que já está no Word e a tabela que já está no Sheets" é o que
 * uma clínica ou um escritório de 1 tela precisa — cobrá-los no plano de piso
 * de 5 telas vendia o degrau errado.
 */
export const DOC_WIDGET_TYPES = [
  'GOOGLE_DOCS',
  'OFFICE_DOCS',
  'PDF_DOCUMENT',
] as const;

/**
 * `true` se a lista de features do plano inclui `featureKey`.
 *
 * `features` indefinido devolve `true` (fail-open): quando a assinatura ainda
 * não carregou, ou a conta é legada e não tem assinatura, o certo é deixar
 * passar e deixar o servidor decidir — bloquear por dado ausente esconderia
 * recurso de quem tem direito a ele.
 */
export const hasFeature = (features: string[] | undefined | null, featureKey: string): boolean =>
  !features || features.includes(featureKey);

/**
 * Qual feature o widget exige, ou `null` quando ele é de todos os planos.
 *
 * Existe separada de `isWidgetLocked` porque a mensagem de bloqueio precisa
 * dizer o plano CERTO: documento destrava no Loja, painel de gestão só no Rede.
 * Um aviso genérico ("assine o Rede") mandaria para o plano de 5 telas alguém
 * que resolveria o problema com o de 1 — e essa é a diferença entre uma venda e
 * um abandono.
 */
export const widgetFeatureKey = (widgetType: string): string | null => {
  if ((DOC_WIDGET_TYPES as readonly string[]).includes(widgetType)) return DOC_FEATURE_KEY;
  if ((BI_WIDGET_TYPES as readonly string[]).includes(widgetType)) return BI_FEATURE_KEY;
  return null;
};

/** `true` quando o widget exige uma feature que o plano atual não tem. */
export const isWidgetLocked = (
  widgetType: string,
  features: string[] | undefined | null
): boolean => {
  const key = widgetFeatureKey(widgetType);
  return key !== null && !hasFeature(features, key);
};
