// Catálogo público de planos (`GET /api/plans`).
//
// O checkout NUNCA decide preço: quem calcula o valor da sessão é o servidor
// (`amountCents` do PATCH). As funções puras daqui existem só para PREVISÃO
// otimista enquanto a requisição está no ar — elas repetem de propósito a mesma
// fórmula do backend (`estimateMonthlyCents`), e quando o servidor responde o
// valor dele é o que fica na tela.
//
// O INTERVALO entra nessa mesma fórmula, não ao lado dela. O servidor devolve
// `amountCents` sempre como valor MENSAL EQUIVALENTE — no anual ele já vem com o
// preço anual por tela/mês, e o que o cliente paga no ano é `amountCents × 12`.
// A previsão local precisa ter exatamente esse comportamento: se ela ignorasse o
// intervalo, a tela mostraria o preço mensal por um instante depois do clique em
// "anual" e o valor "pularia" quando a resposta chegasse — o tipo de piscada que
// a pessoa lê como pegadinha de preço.
import { api } from './api';

/** Como a assinatura é cobrada. O nome no corpo/query da API é `interval`. */
export type BillingInterval = 'monthly' | 'yearly';

/** Meses faturados de uma vez no anual. Existe para o `12` não ficar solto. */
export const MONTHS_PER_YEAR = 12;

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
  /**
   * Preço por tela/MÊS em centavos quando a assinatura é anual — não é o preço
   * do ano. `0` = o plano não tem oferta anual (grátis e Enterprise), e nesse
   * caso o seletor de intervalo nem aparece.
   */
  priceAnnualPerScreenCents: number;
  priceAnnualPerScreen: number;
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
  // Backend antigo (sem os campos do anual) cai em `0`, e `0` já significa
  // "sem oferta anual" — o seletor some e o checkout continua vendendo o
  // mensal, em vez de anunciar um desconto que o servidor não vai aplicar.
  const annualCents = Math.max(0, Math.round(num(plan.priceAnnualPerScreenCents, 0)));
  const limits = asRecord(plan.limits);
  const optionalLimit = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

  return {
    code,
    name: str(plan.name, code),
    pricePerScreenCents: cents,
    pricePerScreen: num(plan.pricePerScreen, cents / 100),
    priceAnnualPerScreenCents: annualCents,
    priceAnnualPerScreen: num(plan.priceAnnualPerScreen, annualCents / 100),
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

/** `true` quando o plano tem preço anual publicado — grátis e Enterprise não têm. */
export const hasAnnualOffer = (plan: Plan | null): boolean =>
  !!plan && !plan.quoteOnly && !plan.free && plan.priceAnnualPerScreenCents > 0;

/**
 * Preço unitário (por tela/mês) do intervalo escolhido.
 *
 * Pedir "anual" num plano sem oferta anual devolve o preço MENSAL, nunca `0`:
 * um total zerado numa tela de cobrança parece "de graça" e é o erro mais caro
 * que esta função poderia cometer.
 */
export const unitCentsFor = (plan: Plan | null, interval: BillingInterval): number => {
  if (!plan) return 0;
  if (interval === 'yearly' && hasAnnualOffer(plan)) return plan.priceAnnualPerScreenCents;
  return plan.pricePerScreenCents;
};

/**
 * Previsão do MENSAL EQUIVALENTE (a mesma grandeza do `amountCents` do
 * servidor), só para o intervalo entre o clique e a resposta.
 *
 * O `interval` é obrigatório de propósito: um valor padrão faria uma chamada
 * esquecida devolver preço mensal numa tela anual — em silêncio, e justamente
 * na tela onde a divergência de preço vira reclamação.
 */
export const estimateMonthlyCents = (
  plan: Plan | null,
  screens: number,
  interval: BillingInterval
): number => {
  if (!plan || plan.quoteOnly || plan.pricePerScreenCents <= 0) return 0;
  return billedScreens(plan, screens) * unitCentsFor(plan, interval);
};

/** O que sai da conta no anual: 12 × o mensal equivalente (do servidor, quando há). */
export const yearTotalCents = (monthlyEquivalentCents: number): number =>
  Math.max(0, Math.round(monthlyEquivalentCents)) * MONTHS_PER_YEAR;

/**
 * Economia do anual, em pontos percentuais inteiros e arredondada PARA BAIXO.
 * Prometer 20% e entregar 20,4% é diferente de prometer 21% e entregar 20,4% —
 * só o segundo é publicidade que não se sustenta (CDC, art. 37).
 * Devolve `0` quando não há oferta anual: a tela usa isso para não dizer
 * "economize 0%".
 */
export const annualSavingsPercent = (plan: Plan | null): number => {
  if (!hasAnnualOffer(plan) || !plan) return 0;
  const monthly = plan.pricePerScreenCents;
  const annual = plan.priceAnnualPerScreenCents;
  if (monthly <= 0 || annual >= monthly) return 0;
  return Math.floor(((monthly - annual) / monthly) * 100);
};

/** Teto de telas do plano (`maxDevices`), quando existir. */
export const maxScreensOf = (plan: Plan | null): number => {
  if (!plan) return 1000;
  return plan.limits.maxDevices ?? 1000;
};
