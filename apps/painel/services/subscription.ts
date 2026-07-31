// ==============================================================================
// SUBSCRIPTION HELPERS
// Lógica derivada do estado de assinatura (`GET /api/billing/subscription`).
// Mantida fora dos componentes para ser reaproveitada por TopBar/Dashboard.
// ==============================================================================

import { Plan, Subscription, SubscriptionState, SubscriptionStatus } from '../types';

export interface SubscriptionView {
  status: SubscriptionStatus;
  /** Nome do plano, resolvido de `plan.name` ou `planName`. */
  planName: string;
  isTrial: boolean;
  /** Dias restantes de trial (>= 0). `null` quando não está em trial ou não há data. */
  trialDaysRemaining: number | null;
  /** `true` quando a assinatura permite operar (ativa ou trial ainda válido). */
  isValid: boolean;
  /** Motivo do bloqueio, quando `isValid === false`. */
  invalidReason: 'past_due' | 'canceled' | 'trial_expired' | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const resolvePlanName = (subscription: Subscription): string => {
  const plan: Plan | null | undefined = subscription.plan;
  if (plan && typeof plan.name === 'string' && plan.name.trim()) return plan.name;
  if (typeof subscription.planName === 'string' && subscription.planName.trim()) {
    return subscription.planName;
  }
  return 'Plano atual';
};

/** Dias inteiros restantes até `isoDate`, arredondando para cima. Nunca negativo. */
export const daysUntil = (isoDate: string | null | undefined): number | null => {
  if (!isoDate) return null;
  const target = new Date(isoDate).getTime();
  if (Number.isNaN(target)) return null;
  return Math.max(0, Math.ceil((target - Date.now()) / MS_PER_DAY));
};

/**
 * Normaliza o payload da API num objeto seguro para renderizar.
 * Tolera campos ausentes (`trialDaysRemaining` calculado de `trialEndsAt`,
 * plano vindo só como `planName`) sem recorrer a `any`.
 */
export const buildSubscriptionView = (
  state: SubscriptionState | null,
): SubscriptionView | null => {
  if (!state || !state.subscription || typeof state.subscription.status !== 'string') {
    return null;
  }

  const { subscription } = state;
  const status = subscription.status;
  const isTrial = status === 'trialing';

  const reportedDays =
    typeof state.trialDaysRemaining === 'number' && Number.isFinite(state.trialDaysRemaining)
      ? Math.max(0, Math.floor(state.trialDaysRemaining))
      : null;

  const trialDaysRemaining = isTrial
    ? (reportedDays ?? daysUntil(subscription.trialEndsAt))
    : null;

  const trialExpired = isTrial && trialDaysRemaining !== null && trialDaysRemaining <= 0;

  let invalidReason: SubscriptionView['invalidReason'] = null;
  if (status === 'past_due') invalidReason = 'past_due';
  else if (status === 'canceled' || status === 'expired') invalidReason = 'canceled';
  else if (trialExpired) invalidReason = 'trial_expired';

  return {
    status,
    planName: resolvePlanName(subscription),
    isTrial,
    trialDaysRemaining,
    isValid: invalidReason === null,
    invalidReason,
  };
};

/** Texto do aviso persistente quando a assinatura está inválida. */
export const invalidSubscriptionMessage = (
  reason: NonNullable<SubscriptionView['invalidReason']>,
): string => {
  switch (reason) {
    case 'past_due':
      return 'Pagamento pendente — regularize para continuar publicando nas suas telas.';
    case 'canceled':
      return 'Sua assinatura foi cancelada. Escolha um plano para reativar o acesso.';
    case 'trial_expired':
      // A entrada padrão é o plano grátis sem prazo, então este caso só ocorre
      // se um dia existir um trial promocional com data de fim.
      return 'Seu período promocional terminou. Escolha um plano para continuar publicando.';
  }
};

/**
 * Rótulo da faixa discreta. O caminho normal é o nome do plano — o plano grátis
 * não expira, então não há contagem regressiva. O ramo de trial existe apenas
 * para um eventual período promocional com data de fim.
 */
export const subscriptionBadgeLabel = (view: SubscriptionView): string => {
  if (view.isTrial) {
    const days = view.trialDaysRemaining;
    if (days === null) return 'Período promocional';
    if (days === 1) return 'Período promocional — 1 dia restante';
    return `Período promocional — ${days} dias restantes`;
  }
  return view.planName;
};
