// Tela de obrigado — o destino de quem acabou de pagar.
//
// Por que é uma TELA e não um bloco dentro do passo 3: até aqui, o sucesso era
// desenhado dentro do acordeão, com os passos 1 e 2 ainda ao lado, o resumo do
// pedido à direita e a barra do rodapé. Quem tinha acabado de pagar continuava
// olhando para um formulário — e a pergunta que essa pessoa faz ("deu certo? e
// agora?") não tinha resposta em destaque. Aqui a página inteira responde.
//
// ⚠️ A REGRA QUE ESTE ARQUIVO NÃO PODE QUEBRAR — o tempo do verbo.
//
// O texto anterior afirmava: "Acesso liberado. As credenciais de entrada FORAM
// ENVIADAS para <e-mail>". No instante em que essa tela aparece, isso não é
// verdade — e não é detalhe de redação:
//
//   `paid.handler.ts` provisiona a conta e dispara
//   `sendPurchaseConfirmationEmail` com `void ... .catch()`, DE PROPÓSITO e
//   fora da transação: SMTP fora do ar não pode desfazer um provisionamento
//   nem devolver o evento à fila. O envio é assíncrono, roda depois do
//   despacho do evento `paid` e PODE FALHAR — o `.catch` só escreve um aviso
//   no log do servidor.
//
// Ou seja: quando esta tela renderiza, o e-mail normalmente ainda não saiu.
// Prometer no passado uma entrega que ainda não aconteceu é a mesma classe de
// erro já registrada na wiki (§5.1 de `canais-de-venda-e-landings`), quando o
// `LeadModal` dizia "Enviamos as instruções de login" sobre um formulário que
// era `setTimeout` e não mandava nada a lugar nenhum.
//
// Por isso o texto aqui é **"em breve você vai receber"**, com prazo honesto e
// uma saída concreta se não chegar. Ao mexer nesta tela, mantenha o futuro.
import { useEffect } from 'react';
import { CheckCircle2, FlaskConical, Mail, ShieldCheck } from 'lucide-react';

import { formatBRL, pluralScreens } from './format';
import { Notice } from './primitives';
import { billedScreens } from '../lib/plans';
import type { CheckoutController } from './useCheckout';

/**
 * Mesmo canal comercial do passo 3 (`PaymentStep.tsx`). Repetido como constante
 * própria em vez de importado para não criar dependência entre duas telas que
 * podem seguir caminhos diferentes — mas vale a mesma regra: só entra aqui
 * caixa que alguém de fato lê.
 */
// Vem de `VITE_CONTACT_EMAIL`, como no passo 3. Sem a variável, o texto some.
const SUPPORT_EMAIL = ((import.meta as ImportMeta & { env?: { VITE_CONTACT_EMAIL?: string } }).env?.VITE_CONTACT_EMAIL ?? '').trim();

export const ThankYouScreen = ({ checkout }: { checkout: CheckoutController }) => {
  const {
    payment,
    identity,
    selectedPlan,
    screens,
    totalCents,
    yearCents,
    billingInterval,
    simulatedPayment,
    trackPurchaseNow,
  } = checkout;

  // `purchase` / `Purchase` — a conversão que paga a mídia.
  //
  // Dispara AQUI, e não no momento da resposta da API, porque esta tela só
  // aparece com pagamento confirmado: é o instante em que a compra existe para
  // quem comprou. O `value` enviado é o CAIXA DO CICLO (no anual, os 12 meses),
  // montado em `analytics.ts` — nunca o mensal equivalente.
  //
  // A trava contra repetição mora no controlador, não aqui: no StrictMode este
  // efeito roda duas vezes e uma trava local sairia duas conversões.
  useEffect(() => {
    trackPurchaseNow();
  }, [trackPurchaseNow]);
  // O comprovante repete o intervalo contratado. Dizer "/mês" aqui depois de uma
  // cobrança anual transformaria a tela de confirmação na primeira fonte de
  // dúvida sobre o valor — exatamente onde ela precisa encerrar a dúvida.
  const yearly = billingInterval === 'yearly';

  const billed = selectedPlan ? billedScreens(selectedPlan, screens) : screens;
  const buyerEmail = identity.email?.trim() || '';
  const firstName = identity.name?.trim().split(/\s+/)[0] ?? '';

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col items-center text-center">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-success/12 text-success"
        >
          <CheckCircle2 size={30} strokeWidth={2.25} />
        </span>

        {/*
          `role="status"` + `tabIndex={-1}`: quem usa leitor de tela estava no
          botão "Concluir" do passo 3 quando a página inteira trocou. Sem isto,
          a troca acontece em silêncio e a pessoa não sabe que pagou.
        */}
        <h1
          role="status"
          tabIndex={-1}
          className="mt-4 text-2xl font-extrabold tracking-tight text-ink sm:text-[1.75rem]"
        >
          {firstName ? `Obrigado, ${firstName}!` : 'Obrigado!'}
        </h1>
        <p className="mt-2 text-sm font-semibold text-success-ink">
          {simulatedPayment ? 'Pagamento simulado aprovado' : 'Pagamento confirmado'}
        </p>
        {payment?.message ? (
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{payment.message}</p>
        ) : null}
      </div>

      {/* O bloco mais importante da tela: o que acontece a seguir. */}
      <div className="mt-8 rounded-xl border border-accent/35 bg-accent/8 p-5">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-0.5 shrink-0 text-accent">
            <Mail size={19} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-ink">
              Em breve você vai receber o e-mail com os acessos
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
              Estamos preparando a sua conta. Dentro de alguns minutos chega em{' '}
              {buyerEmail ? (
                <strong className="font-bold text-ink">{buyerEmail}</strong>
              ) : (
                'no e-mail que você informou'
              )}{' '}
              uma mensagem com o endereço do painel, o seu login e uma senha provisória. Você
              troca essa senha no primeiro acesso.
            </p>
            <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">
              Não precisa ficar nesta página, pode fechar a aba. Se em alguns minutos nada chegar,
              confira o spam e a lixeira
              {SUPPORT_EMAIL ? (
                <>
              {' '}antes de falar com a gente em{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                  'Não recebi o e-mail de acesso ao TelaHub'
                )}`}
                className="font-bold text-accent-ink underline underline-offset-2"
              >
                {SUPPORT_EMAIL}
              </a>
                </>
              ) : null}
              .
            </p>
          </div>
        </div>
      </div>

      {simulatedPayment ? (
        <div className="mt-4">
          <Notice tone="warning" icon={<FlaskConical size={15} />}>
            <strong className="font-bold">Nenhum valor foi cobrado.</strong> Esta contratação foi
            processada por um provedor de pagamento simulado. Não houve cobrança em cartão, Pix ou
            fatura, e nada vai aparecer no seu extrato.
          </Notice>
        </div>
      ) : null}

      {/* Comprovante do que foi contratado. Fica DEPOIS do "o que acontece
          agora": é informação de conferência, não a resposta que a pessoa
          procura ao chegar aqui. */}
      <div className="mt-6 rounded-xl border border-line bg-surface p-5">
        <p className="eyebrow mb-3">O que você contratou</p>
        <dl className="flex flex-col gap-2.5 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Plano</dt>
            <dd className="font-bold text-ink">
              {selectedPlan?.name ?? '-'} · {pluralScreens(billed)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Valor</dt>
            <dd className="money font-extrabold text-ink">
              {yearly ? `${formatBRL(yearCents)}/ano` : `${formatBRL(totalCents)}/mês`}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Forma de pagamento</dt>
            <dd className="font-bold text-ink">
              {payment?.method === 'pix'
                ? 'Pix'
                : payment?.card
                  ? `${payment.card.brand} •••• ${payment.card.last4}`
                  : 'Cartão de crédito'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-5">
        <Notice tone="info" icon={<ShieldCheck size={15} />}>
          {yearly ? (
            <>
              Assinatura anual por tela ativa,{' '}
              <strong className="font-bold">contratada por 12 meses</strong> ({formatBRL(totalCents)}{' '}
              por mês equivalente). O cancelamento é feito pelo próprio painel e vale a partir do
              ciclo seguinte; o art. 49 do CDC garante 7 dias para desistir de uma contratação feita
              pela internet.
            </>
          ) : (
            <>
              Assinatura mensal por tela ativa, <strong className="font-bold">sem fidelidade</strong>.
              O cancelamento é feito pelo próprio painel e vale a partir do ciclo seguinte; o art. 49
              do CDC garante 7 dias para desistir de uma contratação feita pela internet.
            </>
          )}
        </Notice>
      </div>
    </main>
  );
};

export default ThankYouScreen;
