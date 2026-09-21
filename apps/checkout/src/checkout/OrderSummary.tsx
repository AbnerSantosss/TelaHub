// RESUMO — coluna fixa à direita, e barra fixa no rodapé em telas estreitas.
//
// NO ANUAL O NÚMERO EM DESTAQUE É O DO ANO. O servidor devolve `amountCents`
// como valor mensal equivalente (no anual, já com o preço anual por tela), mas
// quem contrata 12 meses não é cobrado em "mensal equivalente" — é cobrado no
// total do ano. Destacar R$ 195,00 e debitar R$ 2.340,00 é a definição de
// cobrança inesperada: a pessoa não contesta o preço, contesta o susto, e o
// caminho disso é chargeback. Por isso o total do ano aparece por extenso, com a
// conta aberta ao lado, e não em letra miúda.
//
// SEM CAMPO DE CUPOM, de propósito: não existe desconto no backend (nenhum campo
// de cupom na sessão nem no cálculo do valor). Um campo que aceita texto e não
// faz nada é pior que não ter — ensina a pessoa a procurar cupom em outro site e
// abandonar o checkout aqui. Quando existir desconto de verdade, o campo entra
// entre as linhas de valor e o total.
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

import { billedScreens } from '../lib/plans';
import { formatBRL, pluralScreens } from './format';
import { ctaClass } from './primitives';
import type { CheckoutController } from './useCheckout';

/**
 * Garantias factuais. Nada aqui depende de cliente, prazo ou depoimento.
 *
 * A primeira linha MUDA com o intervalo. "Sem fidelidade" é verdade no mensal e
 * mentira ao lado de uma contratação de 12 meses — e uma garantia que a própria
 * cobrança desmente é pior do que garantia nenhuma (é o art. 37 do CDC, e é a
 * frase que o cliente cita ao pedir o dinheiro de volta).
 */
const guaranteesFor = (yearly: boolean): string[] => [
  yearly
    ? 'Contratação de 12 meses. O valor acima cobre o período inteiro.'
    : 'Sem fidelidade. Você cancela quando quiser.',
  'Cancelamento pelo próprio painel, sem ligar para ninguém.',
  'Direito de arrependimento de 7 dias (art. 49 do CDC).',
];

const summaryData = (checkout: CheckoutController) => {
  const { selectedPlan, screens, totalCents, yearCents, unitCents, billingInterval, policy } =
    checkout;
  const billed = selectedPlan ? billedScreens(selectedPlan, screens) : screens;
  const quoteOnly = !!selectedPlan?.quoteOnly;
  const yearly = billingInterval === 'yearly';

  return {
    plan: selectedPlan,
    billed,
    yearly,
    flooredByPlan: !!selectedPlan && billed > screens,
    quoteOnly,
    free: !!selectedPlan?.free,
    /** Preço por tela/mês do intervalo escolhido — 39 no anual, 49 no mensal. */
    unitCents,
    /** Mensal equivalente: o `amountCents` do servidor, em qualquer intervalo. */
    monthlyCents: totalCents,
    yearCents,
    /** O número grande é sempre o que sai da conta no ciclo contratado. */
    totalLabel: quoteOnly ? 'Sob consulta' : formatBRL(yearly ? yearCents : totalCents),
    totalCaption: yearly ? 'Total do ano' : 'Total por mês',
    noRetroactive: policy?.retroactiveCharges === false,
  };
};

export const OrderSummary = ({ checkout }: { checkout: CheckoutController }) => {
  const { amountSyncing, syncFailed, retrySync, screens } = checkout;
  const {
    plan,
    billed,
    yearly,
    flooredByPlan,
    quoteOnly,
    free,
    unitCents,
    monthlyCents,
    yearCents,
    totalLabel,
    totalCaption,
    noRetroactive,
  } = summaryData(checkout);

  return (
    <aside
      aria-labelledby="checkout-summary-title"
      // Duas camadas, na linha do "Payment Summary" do 21st.dev: o cartão com
      // sombra curta e, dentro dele, o total numa placa rebaixada. A sombra só
      // separa o resumo do formulário — não é para o card "flutuar".
      className="overflow-hidden rounded-2xl border border-line bg-surface shadow-raised"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line bg-app/60 px-4 py-3 sm:px-5">
        <h2 id="checkout-summary-title" className="eyebrow">
          Resumo
        </h2>
        <ShieldCheck aria-hidden="true" size={15} className="text-ink-subtle" />
      </div>

      <div className="p-4 sm:p-5">
        {plan ? (
          <>
            <div className="flex gap-3 border-b border-dashed border-line pb-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-ink">
                  Plano {plan.name}
                  {yearly ? ' · anual' : ''}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {pluralScreens(billed)} {billed === 1 ? 'cobrada' : 'cobradas'}
                  {flooredByPlan ? ` (você escolheu ${screens})` : ''}
                </p>
              </div>
              {/* Valor do servidor, não uma multiplicação local: as duas contas
                  precisam ser a MESMA conta. */}
              <p className="money shrink-0 text-sm font-bold text-ink">
                {quoteOnly ? '-' : formatBRL(monthlyCents)}
              </p>
            </div>

            <dl className="flex flex-col gap-2.5 border-b border-dashed border-line py-3.5 text-xs">
              {!quoteOnly && !free ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-muted">Periodicidade</dt>
                  <dd className="font-bold text-ink">{yearly ? 'Anual (12 meses)' : 'Mensal'}</dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">Preço por tela/mês</dt>
                <dd className="money font-bold text-ink">
                  {quoteOnly ? 'Sob consulta' : free ? formatBRL(0) : formatBRL(unitCents)}
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
              {yearly && !quoteOnly ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-muted">Equivalente por mês</dt>
                  <dd className="money font-bold text-ink">{formatBRL(monthlyCents)}</dd>
                </div>
              ) : null}
            </dl>
          </>
        ) : (
          <p className="border-b border-dashed border-line pb-3.5 text-xs leading-relaxed text-ink-muted">
            Escolha o plano e o número de telas no passo <strong className="font-bold">2</strong> para
            o valor aparecer aqui.
          </p>
        )}

        {/* Placa do total: rebaixada (fundo `--app` + borda interna) para o número
            que sai da conta ser o ponto mais estável do resumo. */}
        <div className="mt-3.5 flex flex-wrap items-end justify-between gap-x-3 gap-y-1 rounded-xl border border-line bg-app/70 px-3.5 py-3 shadow-[inset_0_1px_2px_rgb(22_24_29/0.04)]">
          <div>
            <p className="eyebrow">{totalCaption}</p>
            {free && plan ? (
              <p className="mt-0.5 text-[11px] font-semibold text-cta">Sem cartão de crédito</p>
            ) : null}
          </div>
          <p
            aria-live="polite"
            className={`money ml-auto text-2xl font-extrabold leading-none sm:text-[28px] ${
              quoteOnly ? 'text-ink-muted' : 'text-cta'
            }`}
          >
            {totalLabel}
          </p>
        </div>

        {/* A conta aberta do anual, por extenso. É o parágrafo que impede a
            reclamação de "vi R$ 39 e me cobraram R$ 468": ele repete o preço
            unitário anunciado, as telas cobradas, o equivalente mensal e o valor
            do ano, nessa ordem, ANTES do botão de pagar. */}
        {yearly && plan && !quoteOnly ? (
          <p className="mt-3 rounded-lg border border-accent/35 bg-accent/8 px-3 py-2.5 text-[11px] leading-relaxed text-ink">
            Assinatura de <strong className="font-bold">12 meses</strong>: {formatBRL(unitCents)} por
            tela/mês × {pluralScreens(billed)} {billed === 1 ? 'cobrada' : 'cobradas'} ={' '}
            {formatBRL(monthlyCents)} por mês, o que dá{' '}
            <strong className="font-bold">{formatBRL(yearCents)} no ano</strong>. É este o valor da
            contratação anual, e não {formatBRL(monthlyCents)}.
          </p>
        ) : null}

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
              className="flex min-h-11 items-center gap-1.5 self-start rounded-md border border-line bg-surface px-3 py-1.5 font-bold text-ink transition-colors hover-fine:border-ink-subtle"
            >
              <RefreshCw aria-hidden="true" size={13} />
              Tentar de novo
            </button>
          </div>
        ) : null}

        <ul className="mt-4 flex flex-col gap-2 border-t border-dashed border-line pt-3.5">
          {guaranteesFor(yearly).map((item) => (
            <li key={item} className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted">
              <ShieldCheck aria-hidden="true" size={13} className="mt-px shrink-0 text-success" />
              <span>{item}</span>
            </li>
          ))}
          {noRetroactive ? (
            <li className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted">
              <ShieldCheck aria-hidden="true" size={13} className="mt-px shrink-0 text-success" />
              <span>Não cobramos retroativo. O período já usado não vira fatura depois.</span>
            </li>
          ) : null}
        </ul>
      </div>
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
  // A barra do rodapé é o último lugar onde o valor aparece antes do clique em
  // telas estreitas: ela mostra o MESMO número do resumo (no anual, o do ano) e
  // repete o intervalo na linha de baixo.
  const { quoteOnly, totalLabel, totalCaption, yearly, billed, plan } = summaryData(checkout);

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 py-3 shadow-[0_-8px_24px_-16px_rgb(22_24_29/0.25)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-[10px]">{totalCaption}</p>
          <p
            aria-live="polite"
            className={`money truncate text-lg font-extrabold leading-tight ${
              quoteOnly ? 'text-ink-muted' : 'text-cta'
            }`}
          >
            {totalLabel}
          </p>
          <p className="truncate text-[11px] text-ink-subtle">
            {plan
              ? `${plan.name} · ${pluralScreens(billed)}${yearly ? ' · 12 meses' : ''}`
              : 'Nenhum plano escolhido'}
          </p>
        </div>

        <button
          type="button"
          onClick={onAction}
          disabled={busy}
          aria-busy={busy || undefined}
          className={`${ctaClass} min-h-12 shrink-0 px-4 py-3 text-xs tracking-[0.06em]`}
        >
          <span aria-hidden="true" className="cta-sheen motion-effect" />
          <span className="relative flex items-center gap-2">
            {busy ? <Loader2 aria-hidden="true" size={14} className="animate-spin" /> : null}
            {actionLabel}
          </span>
        </button>
      </div>
    </div>
  );
};
