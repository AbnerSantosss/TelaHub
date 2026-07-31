// RESUMO — coluna fixa à direita, e barra fixa no rodapé em telas estreitas.
//
// SEM CAMPO DE CUPOM, de propósito: não existe desconto no backend (nenhum campo
// de cupom na sessão nem no cálculo do valor). Um campo que aceita texto e não
// faz nada é pior que não ter — ensina a pessoa a procurar cupom em outro site e
// abandonar o checkout aqui. Quando existir desconto de verdade, o campo entra
// entre as linhas de valor e o total.
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

import { billedScreens } from '../lib/plans';
import { formatBRL, pluralScreens } from './format';
import type { CheckoutController } from './useCheckout';

/** Garantias factuais. Nada aqui depende de cliente, prazo ou depoimento. */
const GUARANTEES = [
  'Sem fidelidade: você cancela quando quiser.',
  'Cancelamento pelo próprio painel, sem ligar para ninguém.',
  'Direito de arrependimento de 7 dias (art. 49 do CDC).',
];

const summaryData = (checkout: CheckoutController) => {
  const { selectedPlan, screens, totalCents, policy } = checkout;
  const billed = selectedPlan ? billedScreens(selectedPlan, screens) : screens;
  return {
    plan: selectedPlan,
    billed,
    flooredByPlan: !!selectedPlan && billed > screens,
    quoteOnly: !!selectedPlan?.quoteOnly,
    free: !!selectedPlan?.free,
    totalLabel: selectedPlan?.quoteOnly ? 'Sob consulta' : formatBRL(totalCents),
    noRetroactive: policy?.retroactiveCharges === false,
  };
};

export const OrderSummary = ({ checkout }: { checkout: CheckoutController }) => {
  const { amountSyncing, syncFailed, retrySync, screens } = checkout;
  const { plan, billed, flooredByPlan, quoteOnly, free, totalLabel, noRetroactive } =
    summaryData(checkout);

  return (
    <aside
      aria-labelledby="checkout-summary-title"
      className="rounded-xl border border-line bg-surface p-4 sm:p-5"
    >
      <h2 id="checkout-summary-title" className="eyebrow mb-3">
        Resumo
      </h2>

      {plan ? (
        <>
          <div className="flex gap-3 border-b border-line pb-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-ink">Plano {plan.name}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {pluralScreens(billed)} {billed === 1 ? 'cobrada' : 'cobradas'}
                {flooredByPlan ? ` (você escolheu ${screens})` : ''}
              </p>
            </div>
            <p className="money shrink-0 text-sm font-bold text-ink">
              {quoteOnly ? '—' : formatBRL(plan.pricePerScreenCents * billed)}
            </p>
          </div>

          <dl className="flex flex-col gap-2 border-b border-line py-3.5 text-xs">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-muted">Preço por tela/mês</dt>
              <dd className="money font-bold text-ink">
                {quoteOnly ? 'Sob consulta' : free ? formatBRL(0) : formatBRL(plan.pricePerScreenCents)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-muted">Telas cobradas</dt>
              <dd className="money font-bold text-ink">{billed}</dd>
            </div>
            {flooredByPlan ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-warning">Mínimo do plano</dt>
                <dd className="money font-bold text-warning">{plan.minScreens}</dd>
              </div>
            ) : null}
          </dl>
        </>
      ) : (
        <p className="border-b border-line pb-3.5 text-xs leading-relaxed text-ink-muted">
          Escolha o plano e o número de telas no passo <strong className="font-bold">2</strong> para
          o valor aparecer aqui.
        </p>
      )}

      <div className="flex items-end justify-between gap-3 pt-3.5">
        <div>
          <p className="eyebrow">Total por mês</p>
          {free && plan ? (
            <p className="mt-0.5 text-[11px] font-semibold text-success">Sem cartão de crédito</p>
          ) : null}
        </div>
        <p
          aria-live="polite"
          className={`money text-2xl font-extrabold leading-none sm:text-[28px] ${
            quoteOnly ? 'text-ink-muted' : 'text-success'
          }`}
        >
          {totalLabel}
        </p>
      </div>

      {amountSyncing ? (
        <p className="mt-2 flex items-center justify-end gap-1.5 text-[11px] font-semibold text-ink-subtle">
          <Loader2 aria-hidden="true" size={12} className="animate-spin" />
          Confirmando valor…
        </p>
      ) : null}

      {syncFailed ? (
        <div
          role="alert"
          className="mt-3 flex flex-col gap-2 rounded-lg border border-danger/40 bg-danger/8 px-3 py-2.5 text-xs text-ink"
        >
          <p className="flex items-start gap-1.5 font-semibold">
            <AlertTriangle aria-hidden="true" size={14} className="mt-px shrink-0 text-danger" />
            Não conseguimos confirmar o valor com o servidor.
          </p>
          <button
            type="button"
            onClick={retrySync}
            className="flex items-center gap-1.5 self-start rounded-md border border-line bg-surface px-2.5 py-1.5 font-bold text-ink transition-colors hover:border-ink-subtle"
          >
            <RefreshCw aria-hidden="true" size={13} />
            Tentar de novo
          </button>
        </div>
      ) : null}

      <ul className="mt-4 flex flex-col gap-2 border-t border-line pt-3.5">
        {GUARANTEES.map((item) => (
          <li key={item} className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted">
            <ShieldCheck aria-hidden="true" size={13} className="mt-px shrink-0 text-success" />
            <span>{item}</span>
          </li>
        ))}
        {noRetroactive ? (
          <li className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted">
            <ShieldCheck aria-hidden="true" size={13} className="mt-px shrink-0 text-success" />
            <span>Nada de cobrança retroativa: período já usado nunca vira fatura depois.</span>
          </li>
        ) : null}
      </ul>
    </aside>
  );
};

/**
 * Em telas estreitas o resumo sai da lateral e vira barra fixa no rodapé com o
 * total e o CTA do passo aberto — o mesmo botão, não um segundo caminho.
 */
export const MobileSummaryBar = ({
  checkout,
  actionLabel,
  onAction,
  busy,
}: {
  checkout: CheckoutController;
  actionLabel: string;
  onAction: () => void;
  busy: boolean;
}) => {
  const { quoteOnly, totalLabel, billed, plan } = summaryData(checkout);

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-[10px]">Total por mês</p>
          <p
            aria-live="polite"
            className={`money truncate text-lg font-extrabold leading-tight ${
              quoteOnly ? 'text-ink-muted' : 'text-success'
            }`}
          >
            {totalLabel}
          </p>
          <p className="truncate text-[11px] text-ink-subtle">
            {plan ? `${plan.name} · ${pluralScreens(billed)}` : 'Nenhum plano escolhido'}
          </p>
        </div>

        <button
          type="button"
          onClick={onAction}
          disabled={busy}
          aria-busy={busy || undefined}
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-success px-4 py-3 text-xs font-extrabold uppercase tracking-[0.06em] text-white transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:bg-success/45"
        >
          {busy ? <Loader2 aria-hidden="true" size={14} className="animate-spin" /> : null}
          {actionLabel}
        </button>
      </div>
    </div>
  );
};
