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
  if (days === 1) return 'Teste promocional: falta 1 dia';
  return `Teste promocional: faltam ${days} dias`;
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
        className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-borda bg-warn-fundo px-4 py-3 shadow-card"
      >
        <AlertTriangle size={18} className="text-warn flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-base md:text-[15px] font-semibold text-tinta leading-snug">
            {invalidSubscriptionMessage(view.invalidReason)}
          </p>
          <p className="text-sm text-tinta-2 mt-0.5">
            Plano: <span className="font-semibold text-tinta">{view.planName}</span>
            {usageLabel ? <span className="text-tinta-2"> · {usageLabel}</span> : null}
          </p>
        </div>
        <Button
          variant="brand"
          onClick={onChoosePlan}
          className="flex-shrink-0 h-11 md:h-9 px-4 rounded-lg text-sm font-semibold"
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
            // Verde fica para "no ar" e sucesso. Plano é informação: marca
            // para grátis e teste, papel neutro para o plano pago.
            isFreePlan || view.isTrial
              ? 'border-borda bg-marca-fundo'
              : 'border-borda bg-papel'
          }`}
        >
          {isFreePlan ? (
            <Gift size={14} className="text-marca" aria-hidden="true" />
          ) : view.isTrial ? (
            <Sparkles size={14} className="text-marca" aria-hidden="true" />
          ) : (
            <BadgeCheck size={14} className="text-marca" aria-hidden="true" />
          )}
          <span
            className={`text-[13px] font-semibold ${
              isFreePlan || view.isTrial ? 'text-marca' : 'text-tinta'
            }`}
          >
            {badgeLabel(view.planName, view.isTrial, view.trialDaysRemaining)}
          </span>
        </span>

        {isFreePlan && (
          <span className="text-sm text-tinta-2">
            {typeof displaysLimit === 'number' && displaysLimit === 1
              ? '1 tela grátis para sempre'
              : 'Grátis para sempre'}
          </span>
        )}

        {view.isTrial && (
          <span className="text-sm text-tinta-2">
            Plano <span className="font-semibold text-tinta">{view.planName}</span>
          </span>
        )}

        {usageLabel && <span className="text-sm text-tinta-2">· {usageLabel}</span>}

        {mostrarVerPlanos && (
          <button
            type="button"
            onClick={onChoosePlan}
            className="inline-flex min-h-11 md:min-h-0 items-center text-sm font-semibold text-marca hover:text-marca-hover underline underline-offset-4 transition-colors rounded"
          >
            Ver planos
          </button>
        )}
      </div>

      {/* Convite para escalar — só quando a tela grátis já está em uso. */}
      {freeLimitReached && (
        <p className="text-base md:text-sm text-tinta-2 leading-snug">
          Precisa de outra tela? A cobrança começa na tela nova e é proporcional aos dias que faltam no período.
          Nada é cobrado de forma retroativa.
        </p>
      )}

      {/* Trial promocional encerrado: informativo, não bloqueio. */}
      {view.invalidReason === 'trial_expired' && (
        <p className="text-base md:text-sm text-tinta-2 leading-snug">
          Seu teste promocional terminou. Sua conta continua no plano grátis. Escolha um plano quando quiser ativar mais telas.
        </p>
      )}
    </div>
  );
};
