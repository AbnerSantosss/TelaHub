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

/** Feature do catálogo que libera os widgets de BI/documento. */
export const BI_FEATURE_KEY = 'powerbi';

/**
 * Widgets cobertos pela feature `powerbi`. Precisa ser IGUAL a
 * `BI_WIDGET_TYPES` em `backend/src/services/entitlement.service.ts` — se as
 * duas listas divergirem, o editor libera um widget que o servidor recusa (ou
 * esconde um que ele aceitaria).
 */
export const BI_WIDGET_TYPES = [
  'POWER_BI',
  'AIRTABLE',
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

/** `true` quando o widget exige uma feature que o plano atual não tem. */
export const isWidgetLocked = (
  widgetType: string,
  features: string[] | undefined | null
): boolean =>
  (BI_WIDGET_TYPES as readonly string[]).includes(widgetType) &&
  !hasFeature(features, BI_FEATURE_KEY);
