// `/c/:token` — o checkout que o comprador vê.
//
// Três passos em acordeão (identificação → assinatura → pagamento), resumo fixo
// à direita e, em telas estreitas, barra fixa no rodapé. Sem contador de oferta,
// sem depoimento e sem selo de aprovação imediata: nada disso é verdade hoje
// (DESIGN.md, "Dois padrões da referência que NÃO vamos reproduzir").
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Clock, Loader2, MonitorPlay, RefreshCw } from 'lucide-react';

import { formatBRL, pluralScreens } from './format';
import { IdentificationStep } from './IdentificationStep';
import { MobileSummaryBar, OrderSummary } from './OrderSummary';
import { PaymentStep } from './PaymentStep';
import { PrimaryButton, SecondaryButton } from './primitives';
import { StepCard } from './StepCard';
import { SubscriptionStep } from './SubscriptionStep';
import { ThankYouScreen } from './ThankYouScreen';
import { TrustBar } from './TrustBar';
import { useCheckout, type StepId } from './useCheckout';
import { billedScreens } from '../lib/plans';

const Shell = ({ children }: { children: ReactNode }) => (
  <div className="checkout-backdrop flex min-h-screen flex-col">
    <TrustBar />
    <header className="border-b border-line bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-3.5 sm:px-6">
        <MonitorPlay aria-hidden="true" size={20} className="text-accent" />
        <p className="text-sm font-extrabold tracking-tight text-ink">TelaHub</p>
        <p className="ml-auto text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
          Contratação
        </p>
      </div>
    </header>
    {children}
  </div>
);

/** Estado de erro com saída — nunca tela branca quando a API falha. */
const ErrorState = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  icon: ReactNode;
}) => (
  <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12 sm:px-6">
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-raised sm:p-6">
      <span aria-hidden="true" className="text-ink-subtle">
        {icon}
      </span>
      <h1 className="mt-3 text-xl font-extrabold text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</p>
      <div className="mt-5">
        <PrimaryButton onClick={onAction}>{actionLabel}</PrimaryButton>
      </div>
    </div>
  </main>
);

const LoadingState = () => (
  <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
    <p className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
      <Loader2 aria-hidden="true" size={16} className="animate-spin" />
      Carregando a contratação…
    </p>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-3" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-16 rounded-xl border border-line bg-surface/60" />
        ))}
      </div>
      <div aria-hidden="true" className="h-64 rounded-xl border border-line bg-surface/60" />
    </div>
  </main>
);

const CheckoutPage = () => {
  const params = useParams<{ token?: string }>();
  const checkout = useCheckout(params.token);

  const {
    activeStep,
    stepState,
    editStep,
    identity,
    selectedPlan,
    screens,
    totalCents,
    yearCents,
    billingInterval,
    catalogError,
    catalogLoading,
    sessionError,
    expired,
    booting,
    retryCatalog,
    retrySession,
    startOver,
    submitIdentify,
    confirmPlan,
    finish,
    savingIdentity,
    savingPlan,
    submitting,
    result,
    concluded,
  } = checkout;

  const panels: Record<StepId, RefObject<HTMLDivElement>> = {
    identify: useRef<HTMLDivElement>(null),
    plan: useRef<HTMLDivElement>(null),
    payment: useRef<HTMLDivElement>(null),
  };

  // O passo que abre recebe o foco: sem isso, quem usa teclado ou leitor de tela
  // continua no botão do passo anterior e não percebe que o conteúdo mudou.
  const firstRenderRef = useRef(true);
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    const panel = panels[activeStep].current;
    if (!panel) return;
    const focusable = panel.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
    );
    (focusable ?? panel).focus();
    // `panels` só contém refs estáveis; o efeito reage à troca de passo.
  }, [activeStep, panels]);

  if (expired) {
    return (
      <Shell>
        <ErrorState
          icon={<Clock size={24} />}
          title="Este link de contratação expirou"
          description="Links de checkout valem por 30 dias. Você pode começar uma contratação nova agora, e o que já digitou nesta tela fica guardado."
          actionLabel="Começar uma nova contratação"
          onAction={startOver}
        />
      </Shell>
    );
  }

  if (sessionError) {
    return (
      <Shell>
        <ErrorState
          icon={<AlertTriangle size={24} />}
          title="Não conseguimos abrir sua contratação"
          description={`${sessionError} Você pode tentar de novo ou iniciar uma contratação nova.`}
          actionLabel="Iniciar uma nova contratação"
          onAction={startOver}
        />
        <div className="mx-auto -mt-8 w-full max-w-lg px-4 pb-12 sm:px-6">
          <SecondaryButton onClick={retrySession}>Tentar abrir de novo</SecondaryButton>
        </div>
      </Shell>
    );
  }

  if (catalogError) {
    return (
      <Shell>
        <ErrorState
          icon={<AlertTriangle size={24} />}
          title="Não conseguimos carregar os planos"
          description={`${catalogError} Sem o catálogo não temos como mostrar o preço certo.`}
          actionLabel="Tentar de novo"
          onAction={retryCatalog}
        />
      </Shell>
    );
  }

  if (concluded) {
    return (
      <Shell>
        <ErrorState
          icon={<MonitorPlay size={24} />}
          title="Esta contratação já está concluída"
          // Quem reabre um link pago quase sempre volta pela MESMA dúvida de
          // quem acabou de pagar ("e o acesso?"). Antes esta tela não dizia
          // nada sobre o e-mail e mandava a pessoa para o painel, onde ela não
          // consegue entrar sem a senha provisória que veio por e-mail.
          description="O pagamento desta sessão já foi confirmado, e as credenciais de acesso são enviadas por e-mail para o endereço informado na contratação. Se elas não chegaram, confira o spam antes de falar com o nosso time."
          actionLabel="Iniciar outra contratação"
          onAction={startOver}
        />
      </Shell>
    );
  }

  if (booting || catalogLoading) {
    return (
      <Shell>
        <LoadingState />
      </Shell>
    );
  }

  // Pagou: a página inteira vira a tela de obrigado.
  //
  // Vem DEPOIS de `concluded` de propósito. Os dois falam de sessão paga, mas
  // respondem a perguntas diferentes: `concluded` é quem REABRE um link já
  // pago (`session.status === 'paid'`, vindo do servidor) e precisa de uma
  // saída; este aqui é quem ACABOU de pagar nesta visita (`payment.paid`, do
  // resultado da cobrança) e precisa saber o que acontece a seguir. Inverter a
  // ordem faria quem paga cair no aviso seco de "contratação já concluída".
  if (checkout.payment?.paid) {
    return (
      <Shell>
        <ThankYouScreen checkout={checkout} />
      </Shell>
    );
  }

  const billed = selectedPlan ? billedScreens(selectedPlan, screens) : screens;

  const identitySummary = [
    identity.name,
    identity.email,
    identity.phone ? `+55 ${identity.phone}` : null,
    identity.document,
    identity.documentKind === 'cnpj' ? identity.companyName : null,
  ]
    .filter((part): part is string => !!part && part.trim() !== '')
    .join(' · ');

  // O resumo fechado do passo 2 precisa dizer o MESMO valor do resumo lateral:
  // no anual, o do ano. Dois números diferentes para a mesma contratação, na
  // mesma página, é o que faz a pessoa parar e desistir de conferir.
  const yearly = billingInterval === 'yearly';
  const planSummary = selectedPlan
    ? `Plano ${selectedPlan.name} · ${pluralScreens(billed)} ${
        billed === 1 ? 'cobrada' : 'cobradas'
      }${
        selectedPlan.quoteOnly
          ? ' · sob consulta'
          : yearly
            ? ` · ${formatBRL(yearCents)}/ano (12 meses)`
            : ` · ${formatBRL(totalCents)}/mês`
      }`
    : '';

  const actions: Record<StepId, { label: string; run: () => void; busy: boolean }> = {
    identify: { label: 'Continuar', run: () => void submitIdentify(), busy: savingIdentity },
    plan: { label: 'Continuar', run: () => void confirmPlan(), busy: savingPlan },
    payment: {
      label: selectedPlan?.quoteOnly ? 'Solicitar' : 'Concluir',
      run: () => void finish(),
      busy: submitting,
    },
  };
  const action = actions[activeStep];

  return (
    <Shell>
      {/* `pb-32` reserva o espaço da barra fixa do rodapé em telas estreitas. */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-6 sm:px-6 lg:pb-12">
        <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
          Contratar o TelaHub
        </h1>
        {/*
          O subtítulo acompanha o que a página REALMENTE faz. Antes ele era
          fixo em "a cobrança não está integrada", e ao ligar o pagamento
          passou a contradizer o passo 3 logo abaixo, que cobra. Página que se
          contradiz sobre cobrança é o caso que os arts. 30 e 37 do CDC
          alcançam — e é a mesma armadilha que já custou retrabalho na landing.
          Derivar do `canPayOnline` mantém os dois em acordo por construção.
        */}
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">
          {checkout.canPayOnline
            ? 'Três passos: identificação, plano e pagamento. O acesso ao painel é liberado assim que o pagamento é confirmado.'
            : 'Três passos. A cobrança automática ainda não está integrada, então nada é debitado nesta tela. Ao concluir, nosso time comercial fecha a contratação com você.'}
        </p>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-3">
            <StepCard
              index={1}
              title="Identificação"
              state={stepState('identify')}
              summary={identitySummary}
              onEdit={() => editStep('identify')}
              panelId="checkout-step-identify"
              panelRef={panels.identify}
            >
              <IdentificationStep checkout={checkout} />
            </StepCard>

            <StepCard
              index={2}
              title="Sua assinatura"
              state={stepState('plan')}
              summary={planSummary}
              caption={
                yearly
                  ? 'Você paga por tela ativa. No anual, os 12 meses vêm em uma contratação só.'
                  : 'Você paga por tela ativa, por mês. Pode mudar depois.'
              }
              onEdit={() => editStep('plan')}
              panelId="checkout-step-plan"
              panelRef={panels.plan}
            >
              <SubscriptionStep checkout={checkout} />
            </StepCard>

            <StepCard
              index={3}
              title="Pagamento"
              state={stepState('payment')}
              summary="Solicitação enviada. Aguardando contato do comercial."
              onEdit={() => editStep('payment')}
              panelId="checkout-step-payment"
              panelRef={panels.payment}
            >
              <PaymentStep checkout={checkout} />
            </StepCard>
          </div>

          {/* Um único resumo: coluna fixa à direita no desktop e, em telas
              estreitas, o mesmo bloco depois dos passos (o total e o CTA ficam
              sempre visíveis na barra fixa do rodapé). */}
          <div className="lg:sticky lg:top-6">
            <OrderSummary checkout={checkout} />
          </div>
        </div>
      </main>

      {result ? null : (
        <MobileSummaryBar
          checkout={checkout}
          actionLabel={action.label}
          onAction={action.run}
          busy={action.busy}
        />
      )}

      {/*
        O rodapé fala do que está sendo contratado NESTA tela, não de um plano
        genérico. Duas correções que não podem voltar:

        1. "sem fidelidade" só vale no MENSAL — dizer isso embaixo de uma
           contratação de 12 meses é a frase que o cliente cita ao pedir o
           dinheiro de volta (CDC, art. 37).
        2. Não existe renovação automática hoje: o provedor é simulado e o fluxo
           de assinatura recorrente ainda não foi ligado (ver o comentário em
           `payment.service.ts::startPayment`). Prometer débito automático que
           não acontece é tão errado quanto esconder um que acontece.
      */}
      <footer className="border-t border-line bg-surface px-4 py-5 sm:px-6 lg:pb-5">
        <p className="mx-auto max-w-6xl text-[11px] leading-relaxed text-ink-subtle">
          {yearly
            ? 'Contratação anual por tela ativa, com os 12 meses numa cobrança só.'
            : 'Assinatura mensal por tela ativa, sem fidelidade.'}{' '}
          O cancelamento é feito pelo próprio painel e vale a partir do ciclo seguinte; o art. 49 do
          CDC garante 7 dias para desistir de uma contratação feita pela internet.{' '}
          <span className="flex items-center gap-1.5 pt-1">
            <RefreshCw aria-hidden="true" size={11} />
            {checkout.simulatedPayment
              ? 'Ambiente de demonstração. Nenhum valor é cobrado.'
              : checkout.canPayOnline
                ? 'Esta cobrança é do período contratado. A renovação é combinada com você antes de qualquer nova cobrança.'
                : 'Nenhuma cobrança automática é feita nesta tela.'}
          </span>
        </p>
      </footer>
    </Shell>
  );
};

export default CheckoutPage;
