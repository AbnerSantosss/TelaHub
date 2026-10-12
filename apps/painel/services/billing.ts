import { api, getApiErrorMessage, isApiError } from '../libs/api';

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

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA "ASSINATURA" + PAYWALL — leitura, cancelamento, reativação, checkout
//
// ⚠️ ARMADILHA DO CONTRATO: em 2026-09-05 `GET /api/billing/subscription`
// responde no formato ANTIGO (`{ subscription: {...}, usage: {...} }`, ver
// `apps/api/src/routes/billing.routes.ts`) e o formato NOVO — plano e cobrança
// achatados na raiz, com `payments[]` — está sendo escrito em paralelo.
//
// Por isso tudo aqui passa por `normalizeBillingAccount`, que aceita as DUAS
// formas. Sem isso a página "Assinatura" ficaria em branco em produção no dia
// em que uma das pontas subisse antes da outra — e página de cancelamento em
// branco é problema de CDC (direito de rescindir), não de layout.
//
// A segunda regra é igualmente dura: NADA aqui inventa número. Campo ausente
// vira `null`, e a tela mostra "—" em vez de um valor plausível. Assinatura é
// documento de cobrança: valor chutado na tela é promessa que a fatura não
// cumpre.
// ─────────────────────────────────────────────────────────────────────────────

export type BillingInterval = 'monthly' | 'yearly';

/** Uma cobrança do histórico. Tudo opcional: o gateway ainda não está no ar. */
export interface BillingPayment {
  id: string;
  /** `paid` | `pending` | `failed` | `refunded` | … — texto livre do gateway. */
  status: string;
  /** Meio de pagamento, quando o gateway informa. Nunca prometemos um aqui. */
  method: string | null;
  amountCents: number | null;
  billingInterval: BillingInterval | null;
  paidAt: string | null;
  dueDate: string | null;
  /** Link da fatura no gateway. `null` = não mostrar botão nenhum. */
  invoiceUrl: string | null;
  /** Link da nota fiscal de serviço. `null` = não prometer nota. */
  nfseUrl: string | null;
}

export interface BillingAccount {
  planCode: string | null;
  planName: string;
  /** `trialing` | `active` | `past_due` | `canceled` | … */
  status: string;
  billingInterval: BillingInterval | null;
  /** Telas que entram na fatura (respeita o piso do plano). */
  screensBilled: number | null;
  currentPeriodEnd: string | null;
  /** Cancelada, mas o acesso segue até `currentPeriodEnd`. */
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  /** Valor do CICLO (no anual, os 12 meses), em centavos. */
  cycleAmountCents: number | null;
  nextChargeAt: string | null;
  payments: BillingPayment[];
  /** `true` quando não existe cobrança nenhuma — o plano de entrada. */
  free: boolean;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

const asCount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const asInterval = (value: unknown): BillingInterval | null =>
  value === 'yearly' || value === 'monthly' ? value : null;

/** Primeiro valor não nulo entre os caminhos tentados. */
const firstOf = <T,>(...values: (T | null | undefined)[]): T | null => {
  for (const value of values) {
    if (value !== null && value !== undefined) return value;
  }
  return null;
};

const normalizePayment = (raw: unknown, index: number): BillingPayment | null => {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    id: asText(record.id) ?? `pagamento-${index}`,
    status: asText(record.status) ?? 'desconhecido',
    method: asText(record.method),
    amountCents: asCount(record.amountCents),
    billingInterval: asInterval(record.billingInterval),
    paidAt: asText(record.paidAt),
    dueDate: asText(record.dueDate),
    invoiceUrl: asText(record.invoiceUrl),
    nfseUrl: asText(record.nfseUrl),
  };
};

/**
 * Aceita o payload novo (achatado) e o antigo (`{subscription, usage}`).
 *
 * Devolve `null` só quando não há sequer um `status` — aí não é "formato
 * diferente", é resposta que não fala de assinatura nenhuma.
 */
export const normalizeBillingAccount = (raw: unknown): BillingAccount | null => {
  const root = asRecord(raw);
  if (!root) return null;

  // No formato antigo os campos moram um nível abaixo, em `subscription`.
  const flat = asRecord(root.subscription) ?? root;
  const status = asText(flat.status);
  if (!status) return null;

  const plan = asRecord(flat.plan);
  const estimated = asRecord(flat.estimatedMonthly);

  const planCode = plan ? asText(plan.code) : null;
  const planName = (plan ? asText(plan.name) : null) ?? asText(flat.planName) ?? 'Plano atual';

  const pricePerScreenCents = plan ? asCount(plan.pricePerScreenCents) : null;
  const quoteOnly = plan?.quoteOnly === true;
  const free =
    plan?.free === true ||
    estimated?.free === true ||
    (!quoteOnly && pricePerScreenCents === 0) ||
    (!quoteOnly && planCode === 'gratis');

  const rawPayments = Array.isArray(root.payments)
    ? root.payments
    : Array.isArray(flat.payments)
      ? flat.payments
      : [];

  return {
    planCode,
    planName,
    status,
    billingInterval: asInterval(flat.billingInterval),
    screensBilled: firstOf(
      asCount(flat.screensBilled),
      estimated ? asCount(estimated.billedScreens) : null
    ),
    currentPeriodEnd: asText(flat.currentPeriodEnd),
    cancelAtPeriodEnd: flat.cancelAtPeriodEnd === true,
    canceledAt: asText(flat.canceledAt),
    cycleAmountCents: firstOf(
      asCount(flat.cycleAmountCents),
      estimated ? asCount(estimated.cents) : null
    ),
    // Sem fallback para `currentPeriodEnd`: fim de período e próxima cobrança
    // coincidem no caso comum, mas NÃO coincidem em conta cancelada. A tela
    // rotula os dois separadamente em vez de adivinhar.
    nextChargeAt: asText(flat.nextChargeAt),
    payments: rawPayments
      .map((item, index) => normalizePayment(item, index))
      .filter((item): item is BillingPayment => item !== null),
    free,
  };
};

/**
 * Resultado plano em vez de união discriminada: o `tsconfig` do painel roda com
 * `strictNullChecks` desligado, e nesse modo o TypeScript não estreita união
 * por discriminante booleano — `resultado.reason` dentro do `else` vira erro de
 * compilação. Um objeto só, com `reason: 'ok'`, evita a armadilha.
 */
export interface BillingAccountResult {
  account: BillingAccount | null;
  reason: 'ok' | 'no_subscription' | 'unavailable';
  /** Texto para a tela quando `reason !== 'ok'`. */
  message: string | null;
}

/**
 * `GET /api/billing/subscription`, já normalizado.
 *
 * Diferente de `getBillingSnapshot`, este NÃO engole o erro em `null`: a página
 * de assinatura precisa distinguir "conta sem assinatura" (404) de "não
 * consegui falar com o servidor". Nos dois casos a tela diz a verdade, mas o
 * texto e o botão são outros.
 */
export const getBillingAccount = async (): Promise<BillingAccountResult> => {
  try {
    const raw = await api.get<unknown>('/billing/subscription');
    const account = normalizeBillingAccount(raw);
    if (!account) {
      return {
        account: null,
        reason: 'unavailable',
        message: 'O servidor respondeu, mas sem os dados da assinatura.',
      };
    }
    return { account, reason: 'ok', message: null };
  } catch (error) {
    if (isApiError(error) && error.status === 404) {
      return {
        account: null,
        reason: 'no_subscription',
        message: getApiErrorMessage(error, 'Nenhuma assinatura encontrada para esta conta.'),
      };
    }
    return {
      account: null,
      reason: 'unavailable',
      message: getApiErrorMessage(error, 'Não foi possível carregar sua assinatura agora.'),
    };
  }
};

export interface CancelOutcome {
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  status: string | null;
}

const normalizeCancelOutcome = (raw: unknown): CancelOutcome => {
  const root = asRecord(raw) ?? {};
  const flat = asRecord(root.subscription) ?? root;
  return {
    cancelAtPeriodEnd: flat.cancelAtPeriodEnd === true,
    currentPeriodEnd: asText(flat.currentPeriodEnd),
    status: asText(flat.status),
  };
};

/**
 * `POST /api/billing/cancel`. O erro SOBE — quem cancelou precisa saber que o
 * cancelamento não foi registrado, e um `catch` silencioso aqui faria a tela
 * mostrar "cancelado" sem nada ter sido cancelado.
 */
export const cancelSubscription = async (reason?: string): Promise<CancelOutcome> => {
  const trimmed = reason?.trim();
  const raw = await api.post<unknown>('/billing/cancel', trimmed ? { reason: trimmed } : {});
  return normalizeCancelOutcome(raw);
};

/** `POST /api/billing/reactivate` — só faz sentido antes de o ciclo acabar. */
export const reactivateSubscription = async (): Promise<CancelOutcome> => {
  const raw = await api.post<unknown>('/billing/reactivate', {});
  return normalizeCancelOutcome(raw);
};

/**
 * `POST /api/billing/checkout` → URL hospedada do gateway.
 *
 * ⚠️ Hoje a rota responde 501 (`gateway_not_integrated`): o gateway não está
 * no ar. O erro é propagado de propósito para que a tela ofereça o caminho
 * alternativo (o app de checkout) em vez de fingir que a compra começou.
 */
export const startCheckout = async (
  input: { planCode?: string; screens?: number } = {}
): Promise<string> => {
  const body: Record<string, unknown> = {};
  if (input.planCode) body.planCode = input.planCode;
  if (input.screens && input.screens > 0) body.screens = input.screens;

  const raw = await api.post<unknown>('/billing/checkout', body);
  const url = asText(asRecord(raw)?.checkoutUrl);
  if (!url) throw new Error('O servidor não devolveu o endereço do checkout.');
  return url;
};

// ─── Plano sugerido no paywall ───────────────────────────────────────────────

export interface SuggestedUpgrade {
  code: string;
  name: string;
  pricePerScreenCents: number;
  minScreens: number;
  /** Telas efetivamente cobradas com a tela nova ligada. */
  billedScreens: number;
  /** Total mensal com essas telas, em centavos. */
  totalCents: number;
}

/**
 * Lê o plano sugerido de dentro do erro 403 do backend.
 *
 * O `enforceQuota` já devolve `billing.suggestedPlan` com preço, piso e total
 * JÁ CALCULADOS pela mesma função que gera a fatura (`estimateMonthlyCents`).
 * Usar esses números — em vez de recalcular no cliente — é o que garante que o
 * valor do paywall e o valor da cobrança sejam o mesmo número.
 */
export const suggestedUpgradeFromError = (payload: unknown): SuggestedUpgrade | null => {
  const billing = asRecord(asRecord(payload)?.billing);
  const suggested = asRecord(billing?.suggestedPlan);
  if (!suggested) return null;

  const code = asText(suggested.code);
  const name = asText(suggested.name);
  const price = asCount(suggested.pricePerScreenCents);
  const total = asCount(suggested.estimatedMonthlyCents);
  if (!code || !name || price === null || total === null) return null;

  return {
    code,
    name,
    pricePerScreenCents: price,
    minScreens: asCount(suggested.minScreens) ?? 1,
    billedScreens: asCount(suggested.billedScreens) ?? 0,
    totalCents: total,
  };
};

/**
 * Reserva quando o erro não trouxe sugestão: o plano pago mais barato que
 * comporta `screensWanted` telas. Planos sob consulta ficam de fora — não dá
 * para mostrar total de um preço que é negociado.
 */
export const suggestedUpgradeFromCatalog = (
  catalog: PlansCatalog | null,
  screensWanted: number
): SuggestedUpgrade | null => {
  if (!catalog) return null;

  const candidates = catalog.plans
    .filter((plan) => !plan.free && !plan.quoteOnly && plan.pricePerScreenCents > 0)
    .filter((plan) => plan.limits.maxDevices === null || plan.limits.maxDevices >= screensWanted)
    .sort((a, b) => monthlyCents(a, screensWanted) - monthlyCents(b, screensWanted));

  const plan = candidates[0];
  if (!plan) return null;

  return {
    code: plan.code,
    name: plan.name,
    pricePerScreenCents: plan.pricePerScreenCents,
    minScreens: plan.minScreens,
    billedScreens: billedScreens(plan, screensWanted),
    totalCents: monthlyCents(plan, screensWanted),
  };
};

// ─── Formatação ──────────────────────────────────────────────────────────────

/** `2026-09-05T…` → `05/09/2026`. `null` quando não há data — nunca "hoje". */
export const formatDateBR = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** Data por extenso, para a frase do cancelamento ("até 5 de outubro de 2026"). */
export const formatDateLongBR = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
};

/** Valor em centavos → `R$ 0,00`. `null` vira `—`, nunca `R$ 0,00`. */
export const formatCentsOrDash = (cents: number | null | undefined): string =>
  typeof cents === 'number' && Number.isFinite(cents) ? formatBRL(cents) : '-';

export const intervalLabel = (interval: BillingInterval | null): string => {
  if (interval === 'yearly') return 'Anual';
  if (interval === 'monthly') return 'Mensal';
  return '-';
};
