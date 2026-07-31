// Catálogo público de planos (`GET /api/plans`).
//
// O checkout NUNCA decide preço: quem calcula o valor da sessão é o servidor
// (`amountCents` do PATCH). As funções puras daqui existem só para PREVISÃO
// otimista enquanto a requisição está no ar — elas repetem de propósito a mesma
// fórmula do backend (`estimateMonthlyCents`), e quando o servidor responde o
// valor dele é o que fica na tela.
import { api } from './api';

export interface PlanLimits {
  maxDevices: number | null;
  maxUsers: number | null;
  maxOrganizations: number | null;
}

export interface Plan {
  code: string;
  name: string;
  /** Preço por tela/mês em centavos. `0` quando gratuito OU sob consulta. */
  pricePerScreenCents: number;
  pricePerScreen: number;
  /** Preço não é público: a contratação passa pelo comercial (Enterprise). */
  quoteOnly: boolean;
  /** Plano de entrada freemium: sem cobrança, sem prazo e sem cartão. */
  free: boolean;
  /** Piso de telas cobradas: a fatura nunca é menor que isso. */
  minScreens: number;
  limits: PlanLimits;
  features: string[];
}

/** Regras comerciais que valem para todo o catálogo. */
export interface BillingPolicy {
  entryPlanCode: string | null;
  freeScreens: number | null;
  chargesFromScreen: number | null;
  proration: string | null;
  /** `false` = período já usado nunca é cobrado depois. É argumento real. */
  retroactiveCharges: boolean | null;
}

export interface PlanCatalog {
  currency: string;
  billingUnit: string;
  billingPolicy: BillingPolicy;
  plans: Plan[];
}

const DEFAULT_POLICY: BillingPolicy = {
  entryPlanCode: null,
  freeScreens: null,
  chargesFromScreen: null,
  proration: null,
  retroactiveCharges: null,
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const str = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() !== '' ? value : fallback;

/**
 * Normaliza o catálogo. Defensivo de propósito: um campo faltando na resposta
 * não pode virar `NaN` no total nem tela branca — o checkout precisa continuar
 * de pé mesmo com um deploy do backend fora de sincronia.
 */
function normalizePlan(raw: unknown): Plan | null {
  const plan = asRecord(raw);
  const code = str(plan.code, '');
  if (!code) return null;

  const features = Array.isArray(plan.features)
    ? plan.features.filter((f): f is string => typeof f === 'string')
    : [];

  const cents = Math.max(0, Math.round(num(plan.pricePerScreenCents, 0)));
  const limits = asRecord(plan.limits);
  const optionalLimit = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

  return {
    code,
    name: str(plan.name, code),
    pricePerScreenCents: cents,
    pricePerScreen: num(plan.pricePerScreen, cents / 100),
    quoteOnly: plan.quoteOnly === true || features.includes('preco-sob-consulta'),
    free: plan.free === true,
    minScreens: Math.max(1, Math.round(num(plan.minScreens, 1))),
    limits: {
      maxDevices: optionalLimit(limits.maxDevices),
      maxUsers: optionalLimit(limits.maxUsers),
      maxOrganizations: optionalLimit(limits.maxOrganizations),
    },
    features,
  };
}

export async function fetchPlanCatalog(): Promise<PlanCatalog> {
  const payload = asRecord(await api.get<unknown>('/plans'));
  const rawPlans = Array.isArray(payload.plans) ? payload.plans : [];
  const plans = rawPlans.map(normalizePlan).filter((plan): plan is Plan => plan !== null);

  if (plans.length === 0) {
    throw new Error('O catálogo de planos voltou vazio.');
  }

  const policy = asRecord(payload.billingPolicy);

  return {
    currency: str(payload.currency, 'BRL'),
    billingUnit: str(payload.billingUnit, 'tela-ativa/mes'),
    billingPolicy: {
      ...DEFAULT_POLICY,
      entryPlanCode: typeof policy.entryPlanCode === 'string' ? policy.entryPlanCode : null,
      freeScreens: typeof policy.freeScreens === 'number' ? policy.freeScreens : null,
      chargesFromScreen:
        typeof policy.chargesFromScreen === 'number' ? policy.chargesFromScreen : null,
      proration: typeof policy.proration === 'string' ? policy.proration : null,
      retroactiveCharges:
        typeof policy.retroactiveCharges === 'boolean' ? policy.retroactiveCharges : null,
    },
    plans,
  };
}

/** Quantas telas entram na fatura — é aqui que o piso do plano aparece. */
export const billedScreens = (plan: Plan, screens: number): number =>
  Math.max(plan.minScreens, Math.max(1, Math.floor(screens)));

/** Previsão do mensal, só para o intervalo entre o clique e a resposta do servidor. */
export const estimateMonthlyCents = (plan: Plan | null, screens: number): number => {
  if (!plan || plan.quoteOnly || plan.pricePerScreenCents <= 0) return 0;
  return billedScreens(plan, screens) * plan.pricePerScreenCents;
};

/** Teto de telas do plano (`maxDevices`), quando existir. */
export const maxScreensOf = (plan: Plan | null): number => {
  if (!plan) return 1000;
  return plan.limits.maxDevices ?? 1000;
};
