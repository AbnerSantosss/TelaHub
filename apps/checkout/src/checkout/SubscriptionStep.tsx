// Passo 2 — SUA ASSINATURA.
//
// Substitui o "endereço/frete" da referência: aqui as variáveis são QUANTAS
// TELAS e COM QUE PERIODICIDADE. O piso de telas do plano (`minScreens`) aparece
// em bloco próprio, não em letra miúda: se a pessoa escolhe 3 telas num plano que
// cobra 5, a conta precisa fechar na cabeça dela antes de chegar ao pagamento.
//
// O seletor mensal × anual está aqui, e não no resumo, porque é ESCOLHA — o
// resumo só confere. Ele existe porque a página de vendas anuncia o preço anual
// em destaque: sem ele, quem clicou em "R$ 39 no anual" chegava a uma tela de
// R$ 49 e a contratação morria no último passo (e a divergência entre o anúncio
// e a oferta é o que os arts. 30 e 37 do CDC alcançam).
import { useEffect, useState } from 'react';
import { AlertCircle, Check, Info, Minus, Plus } from 'lucide-react';

import {
  billedScreens,
  hasAnnualOffer,
  maxScreensOf,
  unitCentsFor,
  type BillingInterval,
  type Plan,
} from '../lib/plans';
import { formatBRL, onlyDigits, pluralScreens } from './format';
import { Notice, PrimaryButton } from './primitives';
import type { CheckoutController } from './useCheckout';

/**
 * Rótulos das features. O slug do backend não é texto de vitrine.
 *
 * ⚠️ ESTA LISTA É UMA PROMESSA. Cada rótulo daqui vira um item com "✓" no card
 * do plano — ou seja, uma característica anunciada antes da contratação (CDC,
 * art. 30). Slug sem rótulo simplesmente NÃO aparece, e é assim que se tira uma
 * promessa do ar: apagando a linha, não escondendo com CSS.
 *
 * Limpeza de 2026-09-05:
 *
 * - `api-externa` e `multi-org` foram RETIRADAS do catálogo em 2026-08-30 (ver
 *   `apps/api/src/middlewares/feature.middleware.ts`) — eram vendidas sem
 *   existir. Continuar exibindo o rótulo mantinha viva no checkout uma oferta
 *   que o produto já tinha desfeito.
 * - `white-label`, `sso` e `sla` saíram: marca própria, login corporativo e SLA
 *   em contrato são compromissos que ninguém aqui pode cumprir hoje, e apareciam
 *   como item conferido no plano mais caro.
 * - "Widgets essenciais" virou "Blocos essenciais" e "Alerta de tela offline"
 *   passou a dizer o que de fato acontece (um e-mail quando a tela para de
 *   responder). Jargão não é sinônimo de precisão: quem compra fala "bloco" e
 *   "tela", não "widget" e "offline".
 */
const FEATURE_LABELS: Record<string, string> = {
  'widgets-basicos': 'Blocos essenciais (avisos, ofertas, agenda)',
  'alerta-offline': 'Aviso por e-mail quando uma tela para de responder',
  relatorios: 'Relatórios de exibição',
  documentos: 'Documentos na tela (PDF, Google Docs e Office)',
  auditoria: 'Registro de auditoria de publicação',
  powerbi: 'Painéis de gestão na tela',
  'agendamento-avancado': 'Agendamento por faixa de horário',
};

const featureLabel = (slug: string): string | null => FEATURE_LABELS[slug] ?? null;

/**
 * O card do plano mostra o preço DO INTERVALO ESCOLHIDO — se ele continuasse
 * fixo no mensal, a lista de planos contradiria o seletor logo abaixo dela.
 * Plano pago sem oferta anual diz isso na cara ("só no mensal") em vez de
 * mostrar o preço mensal como se fosse o anual.
 */
const priceLine = (plan: Plan, interval: BillingInterval) => {
  if (plan.quoteOnly) return 'Preço sob consulta';
  if (plan.free) return 'Grátis, sem cartão';
  const onlyMonthly = interval === 'yearly' && !hasAnnualOffer(plan);
  return `${formatBRL(unitCentsFor(plan, interval))} por tela/mês${onlyMonthly ? ' (só no mensal)' : ''}`;
};

const PlanOption = ({
  plan,
  interval,
  selected,
  onSelect,
}: {
  plan: Plan;
  interval: BillingInterval;
  selected: boolean;
  onSelect: () => void;
}) => {
  const labels = plan.features.map(featureLabel).filter((label): label is string => !!label);

  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors sm:p-4 ${
        selected
          ? 'border-accent bg-accent/6 ring-1 ring-accent'
          : 'border-line bg-surface hover-fine:border-ink-subtle'
      }`}
    >
      <input
        type="radio"
        name="checkout-plan"
        value={plan.code}
        checked={selected}
        onChange={onSelect}
        className="mt-0.5 size-4 shrink-0 accent-accent"
      />

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-sm font-extrabold text-ink">{plan.name}</span>
          <span className={`money text-sm font-bold ${plan.quoteOnly ? 'text-ink-muted' : 'text-ink'}`}>
            {priceLine(plan, interval)}
          </span>
        </span>

        {plan.minScreens > 1 ? (
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-warning/12 px-2 py-1 text-[11px] font-bold text-warning">
            <AlertCircle aria-hidden="true" size={12} />
            Cobrança mínima de {pluralScreens(plan.minScreens)}
          </span>
        ) : null}

        {plan.free ? (
          <span className="mt-1.5 block text-xs leading-relaxed text-ink-muted">
            1 tela para sempre, sem prazo e sem cartão.
          </span>
        ) : null}

        {labels.length > 0 ? (
          <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {labels.map((label) => (
              <span key={label} className="flex items-center gap-1 text-[11px] text-ink-muted">
                <Check aria-hidden="true" size={12} className="text-success" />
                {label}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </label>
  );
};

/**
 * Um dos dois cartões do seletor de periodicidade.
 *
 * É `radio` de verdade, e não um switch: são duas ofertas com preços e prazos
 * diferentes, e as duas precisam estar visíveis com o preço ao lado. Um toggle
 * esconde metade da comparação justamente na hora em que a pessoa decide se
 * assume 12 meses.
 */
const IntervalOption = ({
  interval,
  label,
  unitCents,
  note,
  badge,
  selected,
  onSelect,
}: {
  interval: BillingInterval;
  label: string;
  unitCents: number;
  note: string;
  badge?: string;
  selected: boolean;
  onSelect: () => void;
}) => (
  <label
    className={`flex cursor-pointer gap-2.5 rounded-xl border p-3.5 transition-colors ${
      selected
        ? 'border-accent bg-accent/6 ring-1 ring-accent'
        : 'border-line bg-surface hover-fine:border-ink-subtle'
    }`}
  >
    <input
      type="radio"
      name="checkout-interval"
      value={interval}
      checked={selected}
      onChange={onSelect}
      className="mt-0.5 size-4 shrink-0 accent-accent"
    />
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-extrabold text-ink">{label}</span>
        {badge ? (
          <span className="rounded-md bg-success/14 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-success">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="money mt-1 block text-sm font-bold text-ink">
        {formatBRL(unitCents)} <span className="text-xs font-semibold text-ink-muted">por tela/mês</span>
      </span>
      <span className="mt-1 block text-[11px] leading-relaxed text-ink-muted">{note}</span>
    </span>
  </label>
);

export const SubscriptionStep = ({ checkout }: { checkout: CheckoutController }) => {
  const {
    plans,
    policy,
    selectedPlan,
    planCode,
    screens,
    totalCents,
    yearCents,
    unitCents,
    billingInterval,
    annualAvailable,
    annualDropped,
    annualSavings,
    choosePlan,
    chooseInterval,
    changeScreens,
    confirmPlan,
    savingPlan,
    planError,
  } = checkout;

  // Texto local para o campo poder ficar vazio enquanto a pessoa digita, sem o
  // valor "pular" para 1 no meio da digitação.
  const [screensText, setScreensText] = useState(String(screens));
  useEffect(() => setScreensText(String(screens)), [screens]);

  const maxScreens = maxScreensOf(selectedPlan);
  const screensLocked = maxScreens <= 1;
  const billed = selectedPlan ? billedScreens(selectedPlan, screens) : screens;
  const flooredByPlan = !!selectedPlan && billed > screens;
  const paid = !!selectedPlan && !selectedPlan.free && !selectedPlan.quoteOnly;
  const yearly = billingInterval === 'yearly';

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void confirmPlan();
      }}
      className="flex flex-col gap-4"
    >
      <fieldset className="min-w-0">
        <legend className="eyebrow mb-2">Escolha o plano</legend>
        <div className="flex flex-col gap-2.5">
          {plans.map((plan) => (
            <PlanOption
              key={plan.code}
              plan={plan}
              interval={billingInterval}
              selected={plan.code === planCode}
              onSelect={() => choosePlan(plan.code)}
            />
          ))}
        </div>
      </fieldset>

      {/* O seletor só existe quando há de fato duas ofertas para comparar.
          Plano grátis e Enterprise vêm com `priceAnnualPerScreenCents: 0` e aqui
          o bloco inteiro some — melhor do que um controle desabilitado que a
          pessoa tenta clicar, e muito melhor do que anunciar "economize 0%". */}
      {annualAvailable && selectedPlan ? (
        <fieldset className="min-w-0 border-t border-line pt-4">
          <legend className="eyebrow mb-2">Como você quer pagar</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <IntervalOption
              interval="yearly"
              label="Anual"
              unitCents={selectedPlan.priceAnnualPerScreenCents}
              badge={annualSavings > 0 ? `Economize ${annualSavings}%` : undefined}
              note={`12 meses de assinatura, cobrados de uma vez. Sai ${formatBRL(
                selectedPlan.pricePerScreenCents - selectedPlan.priceAnnualPerScreenCents
              )} mais barato por tela em cada mês.`}
              selected={yearly}
              onSelect={() => chooseInterval('yearly')}
            />
            <IntervalOption
              interval="monthly"
              label="Mensal"
              unitCents={selectedPlan.pricePerScreenCents}
              note="Mês a mês, sem fidelidade. Você cancela quando quiser pelo painel."
              selected={!yearly}
              onSelect={() => chooseInterval('monthly')}
            />
          </div>
        </fieldset>
      ) : null}

      {/* A pessoa pediu o anual (clicou, ou veio da landing com
          `?interval=yearly`) e trocou para um plano que não tem anual. Desmarcar
          em silêncio faria o total mudar sem motivo aparente. */}
      {annualDropped && selectedPlan ? (
        <Notice tone="info" role="status" icon={<Info size={15} />}>
          O plano {selectedPlan.name} não tem oferta anual, então a cobrança voltou a ser{' '}
          <strong className="font-bold">mensal</strong>. Os planos com preço anual aparecem com as
          duas opções logo abaixo da lista.
        </Notice>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <label htmlFor="checkout-screens" className="eyebrow">
          Quantas telas
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeScreens(screens - 1)}
            disabled={screensLocked || screens <= 1}
            aria-label="Menos uma tela"
            className="motion-press flex size-11 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink transition-[border-color,transform] duration-150 hover-fine:border-ink-subtle active:scale-95 disabled:active:scale-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus aria-hidden="true" size={16} />
          </button>

          <input
            id="checkout-screens"
            value={screensText}
            onChange={(event) => {
              const digits = onlyDigits(event.target.value).slice(0, 4);
              setScreensText(digits);
              if (digits) changeScreens(Number.parseInt(digits, 10));
            }}
            onBlur={() => {
              if (!screensText) setScreensText(String(screens));
            }}
            disabled={screensLocked}
            inputMode="numeric"
            autoComplete="off"
            aria-describedby="checkout-screens-hint"
            className="money min-h-11 w-20 rounded-lg border border-line bg-surface px-3 py-2.5 text-center text-base font-bold sm:text-sm focus:ring-3 focus:ring-accent/15 text-ink outline-none focus-within:border-accent disabled:bg-app disabled:text-ink-subtle"
          />

          <button
            type="button"
            onClick={() => changeScreens(screens + 1)}
            disabled={screensLocked || screens >= maxScreens}
            aria-label="Mais uma tela"
            className="motion-press flex size-11 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink transition-[border-color,transform] duration-150 hover-fine:border-ink-subtle active:scale-95 disabled:active:scale-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus aria-hidden="true" size={16} />
          </button>

          <span id="checkout-screens-hint" className="text-xs leading-snug text-ink-subtle">
            {screensLocked
              ? 'O plano de entrada é de 1 tela. Para mais telas, escolha um plano pago.'
              : 'Telas que vão exibir conteúdo ao mesmo tempo.'}
          </span>
        </div>
      </div>

      {flooredByPlan && selectedPlan ? (
        <Notice tone="warning" role="status" icon={<AlertCircle size={15} />}>
          <strong className="font-bold">
            A cobrança é de {pluralScreens(billed)}, não de {pluralScreens(screens)}.
          </strong>{' '}
          O plano {selectedPlan.name} tem preço por tela mais baixo em troca de um mínimo de{' '}
          {pluralScreens(selectedPlan.minScreens)} na fatura. Se você vai usar {pluralScreens(screens)}
          , compare com os outros planos acima antes de seguir.
        </Notice>
      ) : null}

      {/* A conta aberta usa o `totalCents` do controlador, não uma multiplicação
          feita aqui: assim que o PATCH responde, quem aparece é o valor do
          SERVIDOR. Duas contas do mesmo total em telas diferentes é como um
          arredondamento vira uma reclamação. */}
      {paid && selectedPlan ? (
        <div className="flex flex-col gap-1.5 rounded-lg bg-app px-3.5 py-3">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-ink-muted">
            <span className="money font-bold text-ink">{billed}</span>
            <span>{billed === 1 ? 'tela cobrada' : 'telas cobradas'} ×</span>
            <span className="money font-bold text-ink">{formatBRL(unitCents)}</span>
            <span>=</span>
            <span className="money font-extrabold text-cta">{formatBRL(totalCents)}</span>
            <span>por mês</span>
          </p>
          {yearly ? (
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-line pt-1.5 text-sm text-ink-muted">
              <span>Total do ano:</span>
              <span className="money font-extrabold text-cta">{formatBRL(yearCents)}</span>
              <span className="text-xs">
                (12 × {formatBRL(totalCents)}). Esse é o valor da contratação anual.
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {selectedPlan?.quoteOnly ? (
        <Notice tone="info" icon={<Info size={15} />}>
          O plano {selectedPlan.name} é sob consulta: o valor sai de uma proposta com o time
          comercial, e por isso não aparece total aqui.
        </Notice>
      ) : null}

      {policy?.retroactiveCharges === false ? (
        <Notice tone="success" icon={<Check size={15} />}>
          Você pode mudar de plano ou de número de telas depois.{' '}
          <strong className="font-bold">Não cobramos período retroativo</strong>, ou seja, não sai fatura
          por tempo que já passou.
        </Notice>
      ) : null}

      {planError ? (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-danger">
          <AlertCircle aria-hidden="true" size={14} />
          {planError}
        </p>
      ) : null}

      <PrimaryButton type="submit" busy={savingPlan} busyLabel="Salvando…">
        Continuar
      </PrimaryButton>
    </form>
  );
};
