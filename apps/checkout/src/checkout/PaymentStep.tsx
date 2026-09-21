// Passo 3 — PAGAMENTO.
//
// A etapa COBRA de verdade quando há provedor, mas o que ela pode oferecer não
// é decisão dela: vem de `GET /checkout/payment-config`. Pix e cartão aparecem
// se o provedor ativo os aceitar.
//
// ⚠️ O CARD DE BOLETO FOI REMOVIDO (2026-09-05). Ele ficava na lista como
// "Indisponível", com data de vencimento e tudo, para "já estar pronto quando
// existir" — mas boleto não é emitido por nenhum provedor aqui, e `PaymentMethod`
// (em `lib/session.ts`) nem admite esse valor: era uma opção que NUNCA poderia
// acender. Uma forma de pagamento anunciada e inexistente é oferta que não se
// cumpre (CDC, arts. 30 e 37) e ainda faz a pessoa esperar por uma alternativa
// que não vai chegar. Quando o boleto existir de verdade, ele volta com o
// provedor que o emitir — e não antes.
//
// Duas regras que este arquivo não pode quebrar:
//
// 1. Quando o provedor é SIMULADO, o aviso de que nada será cobrado é
//    permanente e fica no topo. Encenar uma cobrança sem dizer que é encenação
//    seria enganoso — e é justamente na tela de pagamento que isso pesa mais.
// 2. Nenhum selo de "aprovação imediata" (DESIGN.md). Pix aqui nasce PENDENTE;
//    prometer aprovação instantânea seria promessa que a tela não cumpre.
import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  CreditCard,
  FlaskConical,
  Info,
  Mail,
  QrCode,
  RotateCcw,
} from 'lucide-react';

import { formatBRL, pluralScreens } from './format';
import { billedScreens } from '../lib/plans';
import { Notice, PrimaryButton, SecondaryButton, TextField } from './primitives';
import type { CheckoutController } from './useCheckout';
import type { PaymentMethod } from '../lib/session';

/**
 * Canal comercial real, confirmado pelo dono em 2026-07-31.
 *
 * O endereço anterior (`comercial@telahub.com.br`) era INVENTADO — existia só
 * para não deixar link morto, e a wiki o registrava como bloqueador de
 * publicação. Um CTA que aponta para caixa inexistente perde o lead em
 * silêncio, o que é pior do que não ter o botão. Regra ao mexer aqui: só entra
 * endereço que alguém de fato lê.
 *
 * Vem de `VITE_CONTACT_EMAIL` (build arg da stack no Portainer), nunca do
 * código: o repositório é público. Sem a variável, o botão não aparece.
 */
const SALES_EMAIL = ((import.meta as ImportMeta & { env?: { VITE_CONTACT_EMAIL?: string } }).env?.VITE_CONTACT_EMAIL ?? '').trim();

interface MethodCard {
  id: PaymentMethod;
  label: string;
  icon: typeof QrCode;
  detail: string;
}

const METHODS: MethodCard[] = [
  {
    id: 'pix',
    label: 'Pix',
    icon: QrCode,
    detail: 'Pagamento à vista pelo QR Code ou copia e cola.',
  },
  {
    id: 'credit_card',
    label: 'Cartão de crédito',
    icon: CreditCard,
    // Sem "renovação automática": o fluxo de assinatura recorrente ainda não
    // existe (ver `payment.service.ts::startPayment`) e o provedor de hoje é
    // simulado. Anunciar débito automático que não acontece é o mesmo tipo de
    // promessa não cumprida que esconder um que acontece.
    detail: 'Cobrança do período que você está contratando agora.',
  },
];

/** Só a hora local do vencimento do Pix — a data completa polui o bloco. */
const formatExpiry = (iso: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
};

/** Aviso permanente de ambiente de demonstração. Obrigatório quando simulado. */
const DemoBanner = () => (
  <Notice tone="warning" icon={<FlaskConical size={15} />}>
    <strong className="font-bold">Ambiente de demonstração.</strong> O provedor de pagamento é
    simulado: <strong className="font-bold">nenhum valor será cobrado</strong> de cartão ou Pix, e
    nenhum dado de cartão é armazenado.
  </Notice>
);

/**
 * Bloco de total, repetido nas telas do passo para o valor nunca sumir.
 *
 * No anual o número grande é o DO ANO, com o equivalente mensal na linha de
 * baixo. Esta é a última tela antes do clique que cobra: um "/mês" aqui, ao lado
 * de um botão que fecha 12 meses, seria a divergência de preço acontecendo no
 * pior lugar possível.
 */
const TotalRow = ({
  quoteOnly,
  yearly,
  monthlyCents,
  yearCents,
}: {
  quoteOnly: boolean;
  yearly: boolean;
  monthlyCents: number;
  yearCents: number;
}) => (
  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg bg-app px-3.5 py-3">
    <span className="eyebrow">Total a contratar</span>
    <span className="money text-xl font-extrabold text-cta">
      {quoteOnly ? 'Sob consulta' : formatBRL(yearly ? yearCents : monthlyCents)}
      {!quoteOnly ? (
        <span className="ml-1 text-xs font-bold text-ink-muted">{yearly ? '/ano' : '/mês'}</span>
      ) : null}
    </span>
    {yearly && !quoteOnly ? (
      <span className="w-full text-[11px] leading-relaxed text-ink-muted">
        Assinatura de 12 meses, equivalente a {formatBRL(monthlyCents)} por mês.
      </span>
    ) : null}
  </div>
);

export const PaymentStep = ({ checkout }: { checkout: CheckoutController }) => {
  const {
    selectedPlan,
    screens,
    totalCents,
    yearCents,
    billingInterval,
    finish,
    submitting,
    result,
    alreadySubmitted,
    // pagamento
    paymentConfigError,
    paymentMethods,
    simulatedPayment,
    canPayOnline,
    paymentMethod,
    card,
    cardErrors,
    payment,
    paymentError,
    paying,
    confirmingPix,
    selectPaymentMethod,
    setCardField,
    blurCardField,
    fillTestCard,
    confirmSimulated,
    resetPayment,
  } = checkout;

  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const quoteOnly = !!selectedPlan?.quoteOnly;
  const yearly = billingInterval === 'yearly';
  const billed = selectedPlan ? billedScreens(selectedPlan, screens) : screens;

  const copyPix = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard bloqueada (contexto não seguro, permissão negada): em vez de
      // falhar em silêncio, a tela pede a cópia manual — o código está visível.
      setCopied(false);
      setCopyFailed(true);
    }
  };

  // ── 1. Pagamento aprovado ─────────────────────────────────────────────────
  //
  // NÃO desenhe o sucesso aqui. Quando `payment.paid` é verdadeiro, o
  // `CheckoutPage` troca a página inteira pela `ThankYouScreen` e este passo
  // nem chega a renderizar. Este bloco existia e mostrava o desfecho dentro do
  // acordeão — foi removido em 2026-08-01 para não virar uma segunda versão da
  // mesma tela, divergindo em silêncio (o texto daqui afirmava, no passado,
  // que o e-mail de credenciais já tinha sido enviado; o envio é assíncrono e
  // pode falhar — ver o cabeçalho de `ThankYouScreen.tsx`).

  // ── 2. Pix gerado, aguardando confirmação ─────────────────────────────────
  if (payment && payment.status === 'pending' && payment.pix) {
    const expiry = formatExpiry(payment.pix.expiresAt);

    return (
      <div className="flex flex-col gap-4">
        {simulatedPayment ? <DemoBanner /> : null}

        <TotalRow
          quoteOnly={quoteOnly}
          yearly={yearly}
          monthlyCents={totalCents}
          yearCents={yearCents}
        />

        <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface p-4">
          {payment.pix.qrCodeDataUri ? (
            <img
              src={payment.pix.qrCodeDataUri}
              alt="QR Code do Pix para pagamento"
              className="size-44 rounded-lg border border-line bg-white p-2"
            />
          ) : null}
          <p className="text-center text-xs leading-relaxed text-ink-muted">
            Abra o app do seu banco, escolha <strong className="font-bold">Pix</strong> e escaneie o
            código. Se preferir, use o copia e cola abaixo.
            {expiry ? ` Este código vale até as ${expiry}.` : ''}
          </p>
        </div>

        <div className="min-w-0">
          <p className="eyebrow mb-1.5">Pix copia e cola</p>
          <p className="money break-all rounded-lg border border-line bg-app px-3 py-2.5 text-[11px] leading-relaxed text-ink">
            {payment.pix.copyPaste}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SecondaryButton onClick={() => void copyPix(payment.pix!.copyPaste)}>
              <span className="flex items-center gap-2">
                {copied ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
                {copied ? 'Código copiado' : 'Copiar código'}
              </span>
            </SecondaryButton>
            {copyFailed ? (
              <span role="status" className="text-xs text-ink-muted">
                Seu navegador bloqueou a cópia automática. Selecione o código acima e copie.
              </span>
            ) : null}
          </div>
        </div>

        {paymentError ? (
          <Notice tone="danger" role="alert" icon={<AlertTriangle size={15} />}>
            {paymentError}
          </Notice>
        ) : null}

        {simulatedPayment ? (
          <>
            <PrimaryButton
              onClick={() => void confirmSimulated()}
              busy={confirmingPix}
              busyLabel="Confirmando…"
            >
              Simular pagamento aprovado
            </PrimaryButton>
            <p className="text-xs leading-relaxed text-ink-subtle">
              Este botão existe apenas na demonstração: ele confirma o Pix sem que nenhum valor
              tenha sido pago. Com um provedor real, a confirmação chega sozinha pelo banco.
            </p>
          </>
        ) : (
          <Notice tone="info" role="status" icon={<Info size={15} />}>
            Assim que o pagamento cair, a liberação do acesso é automática e as credenciais vão
            para o e-mail informado. Você pode fechar esta página depois de pagar.
          </Notice>
        )}

        <SecondaryButton onClick={resetPayment} disabled={confirmingPix}>
          <span className="flex items-center gap-2">
            <RotateCcw aria-hidden="true" size={15} />
            Escolher outra forma de pagamento
          </span>
        </SecondaryButton>
      </div>
    );
  }

  // ── 3. Fluxo antigo concluído (plano sob consulta / gateway indisponível) ──
  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-success/45 bg-success/8 p-4">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-white"
          >
            <Check size={17} strokeWidth={3} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-ink">Solicitação enviada</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{result.message}</p>
          </div>
        </div>

        <dl className="flex flex-col gap-2 rounded-lg bg-app px-3.5 py-3 text-xs">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Plano solicitado</dt>
            <dd className="font-bold text-ink">
              {selectedPlan?.name ?? '-'} · {pluralScreens(billed)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Valor a confirmar</dt>
            <dd className="money font-extrabold text-ink">
              {quoteOnly
                ? 'Sob consulta'
                : yearly
                  ? `${formatBRL(yearCents)}/ano`
                  : `${formatBRL(totalCents)}/mês`}
            </dd>
          </div>
        </dl>

        {!result.charged ? (
          <Notice tone="info" icon={<Info size={15} />}>
            <strong className="font-bold">Nenhuma cobrança foi feita.</strong> Nada foi debitado de
            cartão nem de Pix nesta tela.
          </Notice>
        ) : null}

        {SALES_EMAIL ? (
        <a
          href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent('Contratação TelaHub')}`}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-sm font-bold text-ink transition-colors hover-fine:border-ink-subtle"
        >
          <Mail aria-hidden="true" size={15} />
          Falar agora com o comercial
        </a>
        ) : null}
      </div>
    );
  }

  // ── 4. Escolha do método ──────────────────────────────────────────────────
  const declined = payment?.status === 'declined' ? payment : null;

  const ctaLabel = !canPayOnline
    ? quoteOnly
      ? 'Solicitar proposta'
      : 'Concluir e falar com o comercial'
    : paymentMethod === 'pix'
      ? 'Gerar QR Code do Pix'
      : paymentMethod === 'credit_card'
        ? `Pagar ${formatBRL(yearly ? yearCents : totalCents)}`
        : 'Continuar';

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void finish();
      }}
      className="flex flex-col gap-4"
    >
      {simulatedPayment ? <DemoBanner /> : null}

      <TotalRow
          quoteOnly={quoteOnly}
          yearly={yearly}
          monthlyCents={totalCents}
          yearCents={yearCents}
        />

      <fieldset className="min-w-0" aria-describedby="checkout-methods-reason">
        <legend className="eyebrow mb-2">Forma de pagamento</legend>

        <div className="flex flex-col gap-2.5">
          {METHODS.map(({ id, label, icon: Icon, detail }) => {
            // Só fica ativo o que o provedor de verdade listar. Um método que
            // aparece apagado ainda é uma promessa: por isso a lista tem apenas
            // o que pode acender (ver o cabeçalho sobre o boleto removido).
            const enabled = canPayOnline && paymentMethods.includes(id);
            const selected = enabled && paymentMethod === id;

            return (
              <div key={id} className="min-w-0">
                <label
                  aria-disabled={enabled ? undefined : 'true'}
                  className={`flex gap-3 rounded-xl border p-3.5 transition-colors ${
                    enabled
                      ? `cursor-pointer bg-surface ${
                          selected ? 'border-accent ring-1 ring-accent/30' : 'border-line hover-fine:border-ink-subtle'
                        }`
                      : 'cursor-not-allowed border-line bg-app/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="checkout-payment-method"
                    value={id}
                    disabled={!enabled}
                    checked={selected}
                    onChange={() => selectPaymentMethod(id)}
                    aria-describedby={enabled ? undefined : 'checkout-methods-reason'}
                    className="mt-0.5 size-4 shrink-0 accent-accent"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <Icon
                        aria-hidden="true"
                        size={16}
                        className={`shrink-0 ${enabled ? 'text-accent' : 'text-ink-subtle'}`}
                      />
                      <span className={`text-sm font-bold ${enabled ? 'text-ink' : 'text-ink-muted'}`}>
                        {label}
                      </span>
                      {enabled ? null : (
                        <span className="rounded-md bg-line px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                          Indisponível
                        </span>
                      )}
                    </span>
                    <span
                      className={`mt-1 block text-xs leading-relaxed ${
                        enabled ? 'text-ink-muted' : 'text-ink-subtle'
                      }`}
                    >
                      {detail}
                    </span>
                  </span>
                </label>

                {/* Formulário embutido no card escolhido, como nas referências:
                    os dados aparecem colados ao método, não num bloco solto. */}
                {selected && id === 'credit_card' ? (
                  <div className="mt-2.5 flex flex-col gap-3 rounded-xl border border-line bg-app/50 p-3.5">
                    <TextField
                      id="checkout-card-number"
                      label="Número do cartão"
                      value={card.number}
                      onValueChange={(value) => setCardField('number', value)}
                      onBlur={() => blurCardField('number')}
                      error={cardErrors.number}
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="0000 0000 0000 0000"
                      maxLength={23}
                    />
                    <TextField
                      id="checkout-card-holder"
                      label="Nome impresso no cartão"
                      value={card.holder}
                      onValueChange={(value) => setCardField('holder', value)}
                      onBlur={() => blurCardField('holder')}
                      error={cardErrors.holder}
                      autoComplete="cc-name"
                      placeholder="Como está gravado no cartão"
                      maxLength={120}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <TextField
                        id="checkout-card-expiry"
                        label="Validade"
                        value={card.expiry}
                        onValueChange={(value) => setCardField('expiry', value)}
                        onBlur={() => blurCardField('expiry')}
                        error={cardErrors.expiry}
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM/AA"
                        maxLength={5}
                      />
                      <TextField
                        id="checkout-card-cvv"
                        label="CVV"
                        value={card.cvv}
                        onValueChange={(value) => setCardField('cvv', value)}
                        onBlur={() => blurCardField('cvv')}
                        error={cardErrors.cvv}
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="000"
                        maxLength={4}
                        hint="3 dígitos no verso (4 na frente, no Amex)."
                      />
                    </div>

                    {/* Atalhos de teste. Aparecem SÓ com provedor simulado: com
                        gateway real seriam um convite a tentar cobrança com
                        número inventado. */}
                    {simulatedPayment ? (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-3">
                        <button
                          type="button"
                          onClick={() => fillTestCard('approved')}
                          className="inline-flex min-h-11 items-center text-xs font-bold text-accent-ink underline underline-offset-2 transition-colors hover-fine:text-ink"
                        >
                          Preencher com dados de teste
                        </button>
                        <button
                          type="button"
                          onClick={() => fillTestCard('declined')}
                          className="inline-flex min-h-11 items-center text-[11px] font-semibold text-ink-subtle underline underline-offset-2 transition-colors hover-fine:text-ink-muted"
                        >
                          usar cartão recusado
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <p id="checkout-methods-reason" className="mt-2.5 text-xs leading-relaxed text-ink-muted">
          {canPayOnline
            ? 'Estas são as formas de pagamento que o nosso provedor aceita hoje. Não emitimos boleto.'
            : paymentConfigError
              ? `${paymentConfigError} A contratação segue pelo nosso time comercial, que envia a forma de pagamento combinada com você.`
              : 'Este plano não é contratado por pagamento online. A contratação é concluída pelo nosso time comercial, que entra em contato pelo e-mail e WhatsApp informados.'}
        </p>
      </fieldset>

      {declined ? (
        <Notice tone="danger" role="alert" icon={<AlertTriangle size={15} />}>
          <strong className="font-bold">Pagamento recusado.</strong>{' '}
          {declined.declineReason ?? declined.message} Nenhum valor foi cobrado. Confira os dados do
          cartão, tente outro cartão ou pague com Pix. Você pode tentar quantas vezes precisar.
        </Notice>
      ) : null}

      {paymentError ? (
        <Notice tone="danger" role="alert" icon={<AlertTriangle size={15} />}>
          {paymentError}
        </Notice>
      ) : null}

      {canPayOnline ? (
        <Notice tone="info" icon={<Info size={15} />}>
          {/* O texto acompanha o que está sendo contratado: "sem fidelidade"
              embaixo de um botão que fecha 12 meses é a divergência que os
              arts. 30 e 37 do CDC alcançam. */}
          {yearly
            ? 'Contratação de 12 meses, cobrada de uma vez. O cancelamento é feito pelo próprio painel e vale a partir do ciclo seguinte.'
            : 'Assinatura mensal, sem fidelidade. O cancelamento é feito pelo próprio painel e vale a partir do ciclo seguinte.'}{' '}
          Os dados do cartão são usados apenas para esta cobrança e não ficam guardados no TelaHub.
        </Notice>
      ) : (
        <Notice tone="info" icon={<Info size={15} />}>
          <strong className="font-bold">Ao concluir, nada é cobrado.</strong> Sua solicitação fica
          registrada como <em>aguardando pagamento</em> e o comercial entra em contato pelo e-mail e
          WhatsApp que você informou para confirmar o plano e liberar o acesso.
        </Notice>
      )}

      {alreadySubmitted && !canPayOnline ? (
        <Notice tone="warning" role="status" icon={<Info size={15} />}>
          Esta solicitação já foi enviada antes. Enviar de novo só atualiza o plano e o número de
          telas. Não gera cobrança nem duplica a contratação.
        </Notice>
      ) : null}

      <PrimaryButton
        type="submit"
        busy={canPayOnline ? paying : submitting}
        busyLabel={canPayOnline ? 'Processando…' : 'Enviando…'}
      >
        {ctaLabel}
      </PrimaryButton>
    </form>
  );
};
