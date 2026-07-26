import React from 'react';
import { AlertTriangle, Sparkles, BadgeCheck, Gift } from 'lucide-react';
import { SubscriptionState } from '../../types';
import {
  buildSubscriptionView,
  invalidSubscriptionMessage,
} from '../../services/subscription';
import { Button } from '../ui/button';

// ==============================================================================
// SUBSCRIPTION BANNER
// A entrada do TelaHub é freemium, não trial: 1 tela grátis PARA SEMPRE.
// Por isso este componente:
//   • nunca fala em "dias restantes" como estado padrão;
//   • só mostra aviso persistente (role="alert") quando a assinatura está
//     realmente bloqueada por pagamento — `past_due` ou `canceled`;
//   • no plano grátis mostra o plano atual e, quando a tela grátis já está
//     em uso, o convite para escalar — com a regra de cobrança proporcional
//     e não retroativa, que é o que prometemos na landing;
//   • mantém suporte a `trialDaysRemaining` para o caso de existir um trial
//     promocional no futuro, mas isso é exceção, não o texto padrão.
// ==============================================================================

interface SubscriptionBannerProps {
  /** `null` = endpoint indisponível/erro — nada é renderizado. */
  subscription: SubscriptionState | null;
  onChoosePlan: () => void;
}

/** Rótulo do badge: nome do plano — ou trial promocional, se houver. */
const badgeLabel = (planName: string, isTrial: boolean, days: number | null): string => {
  if (!isTrial) return planName;
  if (days === null) return 'Teste promocional';
  if (days === 1) return 'Teste promocional — 1 dia restante';
  return `Teste promocional — ${days} dias restantes`;
};

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  subscription,
  onChoosePlan,
}) => {
  const view = buildSubscriptionView(subscription);

  // Sem dados de assinatura (backend de billing ainda não disponível):
  // não renderiza nada e não mostra erro ao usuário.
  if (!view) return null;

  const plan = subscription?.subscription.plan;
  const usage = subscription?.usage;
  const displaysLimit = plan?.maxDisplays;
  const displaysUsed = typeof usage?.displays === 'number' ? usage.displays : null;
  const usageLabel =
    displaysUsed !== null
      ? typeof displaysLimit === 'number'
        ? `${displaysUsed}/${displaysLimit} telas`
        : `${displaysUsed} telas`
      : null;

  /** Plano gratuito: preço zero (e não é trial). Sem prazo, sem expiração. */
  const isFreePlan =
    !view.isTrial &&
    ((typeof plan?.priceCents === 'number' && plan.priceCents === 0) ||
      /gr[aá]tis|free/i.test(view.planName));

  /** A tela grátis já está ocupada — momento natural para convidar a escalar. */
  const freeLimitReached =
    isFreePlan &&
    typeof displaysLimit === 'number' &&
    displaysUsed !== null &&
    displaysUsed >= displaysLimit;

  // Aviso persistente APENAS quando a cobrança trava o acesso.
  // (Plano grátis não expira, então nunca cai aqui.)
  const isBlocked = view.invalidReason === 'past_due' || view.invalidReason === 'canceled';

  if (isBlocked && view.invalidReason) {
    return (
      <div
        role="alert"
        className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3"
      >
        <AlertTriangle size={16} className="text-[#f59e0b] flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-[#fbbf24] leading-snug">
            {invalidSubscriptionMessage(view.invalidReason)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Plano: <span className="font-semibold text-slate-300">{view.planName}</span>
            {usageLabel ? <span className="text-slate-400"> · {usageLabel}</span> : null}
          </p>
        </div>
        <Button
          variant="brand"
          onClick={onChoosePlan}
          className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider"
        >
          Escolher plano
        </Button>
      </div>
    );
  }

  const mostrarVerPlanos = isFreePlan || view.isTrial || view.invalidReason === 'trial_expired';

  // Faixa discreta — plano grátis, plano pago ativo ou trial promocional.
  return (
    <div className="mb-4 flex flex-col gap-1.5 px-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${
            isFreePlan
              ? 'border-[#22c55e]/25 bg-[#22c55e]/10'
              : view.isTrial
                ? 'border-[#0ea5e9]/25 bg-[#0ea5e9]/10'
                : 'border-white/10 bg-white/5'
          }`}
        >
          {isFreePlan ? (
            <Gift size={12} className="text-[#4ade80]" aria-hidden="true" />
          ) : view.isTrial ? (
            <Sparkles size={12} className="text-[#0ea5e9]" aria-hidden="true" />
          ) : (
            <BadgeCheck size={12} className="text-[#22c55e]" aria-hidden="true" />
          )}
          <span
            className={`text-[11px] font-bold tracking-wide ${
              isFreePlan ? 'text-[#86efac]' : view.isTrial ? 'text-[#7dd3fc]' : 'text-slate-300'
            }`}
          >
            {badgeLabel(view.planName, view.isTrial, view.trialDaysRemaining)}
          </span>
        </span>

        {isFreePlan && (
          <span className="text-[11px] text-slate-400">
            {typeof displaysLimit === 'number' && displaysLimit === 1
              ? '1 tela grátis para sempre'
              : 'Grátis para sempre'}
          </span>
        )}

        {view.isTrial && (
          <span className="text-[11px] text-slate-400">
            Plano <span className="font-semibold text-slate-300">{view.planName}</span>
          </span>
        )}

        {usageLabel && <span className="text-[11px] text-slate-400">· {usageLabel}</span>}

        {mostrarVerPlanos && (
          <button
            type="button"
            onClick={onChoosePlan}
            className="text-[11px] font-semibold text-[#38bdf8] hover:text-[#7dd3fc] underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0ea5e9]/50 rounded"
          >
            Ver planos
          </button>
        )}
      </div>

      {/* Convite para escalar — só quando a tela grátis já está em uso. */}
      {freeLimitReached && (
        <p className="text-[11px] text-slate-400 leading-snug">
          Precisa de outra tela? A cobrança começa na tela nova e é proporcional aos dias que faltam no período —
          nunca retroativa.
        </p>
      )}

      {/* Trial promocional encerrado: informativo, não bloqueio. */}
      {view.invalidReason === 'trial_expired' && (
        <p className="text-[11px] text-slate-400 leading-snug">
          Seu teste promocional terminou. Sua conta segue no plano grátis — escolha um plano quando quiser ativar mais telas.
        </p>
      )}
    </div>
  );
};
