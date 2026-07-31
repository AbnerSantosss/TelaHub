// Passo 2 — SUA ASSINATURA.
//
// Substitui o "endereço/frete" da referência: aqui a variável é QUANTAS TELAS.
// O piso de telas do plano (`minScreens`) aparece em bloco próprio, não em letra
// miúda: se a pessoa escolhe 3 telas num plano que cobra 5, a conta precisa
// fechar na cabeça dela antes de chegar ao pagamento.
import { useEffect, useState } from 'react';
import { AlertCircle, Check, Info, Minus, Plus } from 'lucide-react';

import { billedScreens, maxScreensOf, type Plan } from '../lib/plans';
import { formatBRL, onlyDigits, pluralScreens } from './format';
import { Notice, PrimaryButton } from './primitives';
import type { CheckoutController } from './useCheckout';

/** Rótulos das features. O slug do backend não é texto de vitrine. */
const FEATURE_LABELS: Record<string, string> = {
  'widgets-basicos': 'Widgets essenciais',
  'alerta-offline': 'Alerta de tela offline',
  relatorios: 'Relatórios',
  auditoria: 'Registro de auditoria',
  powerbi: 'Painéis do Power BI',
  'api-externa': 'API externa',
  'agendamento-avancado': 'Agendamento avançado',
  'multi-org': 'Várias organizações',
  'white-label': 'Marca própria (white label)',
  sso: 'Login corporativo (SSO)',
  sla: 'SLA em contrato',
};

const featureLabel = (slug: string): string | null => FEATURE_LABELS[slug] ?? null;

const priceLine = (plan: Plan) => {
  if (plan.quoteOnly) return 'Preço sob consulta';
  if (plan.free) return 'Grátis, sem cartão';
  return `${formatBRL(plan.pricePerScreenCents)} por tela/mês`;
};

const PlanOption = ({
  plan,
  selected,
  onSelect,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
}) => {
  const labels = plan.features.map(featureLabel).filter((label): label is string => !!label);

  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors sm:p-4 ${
        selected
          ? 'border-accent bg-accent/6 ring-1 ring-accent'
          : 'border-line bg-surface hover:border-ink-subtle'
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
            {priceLine(plan)}
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

export const SubscriptionStep = ({ checkout }: { checkout: CheckoutController }) => {
  const {
    plans,
    policy,
    selectedPlan,
    planCode,
    screens,
    choosePlan,
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
              selected={plan.code === planCode}
              onSelect={() => choosePlan(plan.code)}
            />
          ))}
        </div>
      </fieldset>

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
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink transition-colors hover:border-ink-subtle disabled:cursor-not-allowed disabled:opacity-40"
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
            className="money w-20 rounded-lg border border-line bg-surface px-3 py-2.5 text-center text-sm font-bold text-ink outline-none focus-within:border-accent disabled:bg-app disabled:text-ink-subtle"
          />

          <button
            type="button"
            onClick={() => changeScreens(screens + 1)}
            disabled={screensLocked || screens >= maxScreens}
            aria-label="Mais uma tela"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink transition-colors hover:border-ink-subtle disabled:cursor-not-allowed disabled:opacity-40"
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

      {paid && selectedPlan ? (
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg bg-app px-3.5 py-3 text-sm text-ink-muted">
          <span className="money font-bold text-ink">{billed}</span>
          <span>{billed === 1 ? 'tela cobrada' : 'telas cobradas'} ×</span>
          <span className="money font-bold text-ink">{formatBRL(selectedPlan.pricePerScreenCents)}</span>
          <span>=</span>
          <span className="money font-extrabold text-success">
            {formatBRL(billed * selectedPlan.pricePerScreenCents)}
          </span>
          <span>por mês</span>
        </p>
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
          <strong className="font-bold">Não cobramos período retroativo</strong> — nada de fatura por
          tempo que já passou.
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
