// Eventos de DINHEIRO do checkout — begin_checkout, add_payment_info, purchase.
//
// Por que existe um arquivo só para isto, em vez de espalhar `track(...)` pelos
// componentes:
//
// 1. **O `value` tem uma definição só.** `value` é o CAIXA DO CICLO, em reais.
//    A `CheckoutSession.amountCents` guarda sempre o MENSAL EQUIVALENTE —
//    inclusive no anual, onde o cliente paga 12 meses de uma vez. A conversão
//    mora em `cycleCashInReais()` (em `lib/tracking.ts`) e é chamada AQUI, num
//    lugar só. Multiplicar por 12 dentro de um componente é como nasce a
//    divergência entre o que o Meta recebe e o que o gateway cobrou — e o
//    estrago não aparece como erro: o painel do Meta otimiza pelo `value` que
//    recebe, então mandar o mensal ensina o algoritmo a caçar quem paga menos à
//    vista, que é o oposto da estratégia (o anual é o que financia a mídia).
//
// 2. **`Purchase` sai duas vezes, com um id só.** Uma pelo navegador (aqui) e
//    outra pelo servidor, quando o webhook do gateway confirma. Os dois
//    precisam do MESMO `eventID`, senão a Meta conta duas conversões e todo
//    custo por resultado aparece pela metade, sem erro nenhum no meio do
//    caminho. O id nasce ANTES da chamada de confirmação (ver
//    `useCheckout::payWith`) e viaja no corpo do pedido, no campo
//    `metaEventId` — o mesmo nome que `signup.schema.ts` já usa no cadastro.
//
// ⚠️ Nada aqui pode lançar: medição quebrada não pode impedir um pagamento. As
// funções de `lib/tracking.ts` já engolem qualquer falha; o que este arquivo
// não pode fazer é criar caminho novo de exceção (por isso nada de `!` nem de
// acesso encadeado sem guarda).
import {
  EVENT,
  META_EVENT,
  cycleCashInReais,
  readFbCookies,
  toReais,
  track,
  type FbCookies,
} from '../lib/tracking';
import type { BillingInterval, Plan } from '../lib/plans';

/** Tudo que um evento de dinheiro precisa saber, numa forma só. */
export interface MoneySnapshot {
  plan: Plan | null;
  /** Telas que entram na fatura (já com o piso do plano aplicado). */
  billedScreens: number;
  /**
   * `amountCents` do servidor: MENSAL EQUIVALENTE em qualquer intervalo.
   * Nunca mande este número como `value` — passe pelo `cycleCashInReais`.
   */
  monthlyEquivalentCents: number;
  /** Preço por tela/MÊS do intervalo escolhido (catálogo, não total). */
  unitCentsPerScreen: number;
  interval: BillingInterval;
}

/** O caixa do ciclo em reais: mensal no mensal, 12 meses no anual. */
export const cycleValueOf = (snapshot: MoneySnapshot): number =>
  cycleCashInReais(snapshot.monthlyEquivalentCents, snapshot.interval);

/** Rótulo do intervalo nos relatórios. Em português, para ninguém traduzir errado. */
const intervalLabel = (interval: BillingInterval): string =>
  interval === 'yearly' ? 'anual' : 'mensal';

/**
 * Itens no formato do GA4. O `price` é o preço da tela NO CICLO (no anual, os
 * 12 meses da tela), de modo que `price × quantity === value`. Um item cujo
 * total não bate com o `value` é o tipo de inconsistência que só aparece meses
 * depois, num relatório de e-commerce que ninguém consegue conciliar.
 */
function itemsOf(snapshot: MoneySnapshot): Array<Record<string, unknown>> {
  const { plan, billedScreens, unitCentsPerScreen, interval } = snapshot;
  if (!plan) return [];
  return [
    {
      item_id: plan.code,
      item_name: plan.name,
      item_variant: intervalLabel(interval),
      item_category: 'assinatura-por-tela',
      price: cycleCashInReais(unitCentsPerScreen, interval),
      quantity: billedScreens,
    },
  ];
}

/** Parâmetros comuns do GA4/dataLayer. */
function baseParams(snapshot: MoneySnapshot): Record<string, unknown> {
  const { plan, billedScreens, interval } = snapshot;
  return {
    value: cycleValueOf(snapshot),
    currency: 'BRL',
    plan: plan?.code ?? null,
    plan_name: plan?.name ?? null,
    interval: intervalLabel(interval),
    screens: billedScreens,
    /** O mensal equivalente vai junto, mas NUNCA como `value`. */
    monthly_equivalent: toReais(snapshot.monthlyEquivalentCents),
  };
}

/**
 * Parâmetros do Pixel. Nomes fixados pela Meta (`content_ids`, `contents`,
 * `num_items`) — não são os do GA4, e trocar um pelo outro faz o evento chegar
 * sem valor, que é pior do que não chegar (parece medido e não está).
 */
function metaParams(snapshot: MoneySnapshot): Record<string, unknown> {
  const { plan, billedScreens, unitCentsPerScreen, interval } = snapshot;
  return {
    value: cycleValueOf(snapshot),
    currency: 'BRL',
    content_type: 'product',
    content_ids: plan ? [plan.code] : [],
    content_name: plan?.name ?? undefined,
    contents: plan
      ? [
          {
            id: plan.code,
            quantity: billedScreens,
            item_price: cycleCashInReais(unitCentsPerScreen, interval),
          },
        ]
      : [],
    num_items: billedScreens,
  };
}

/** Abriu o checkout já com plano definido. Dispara uma vez por sessão. */
export function trackBeginCheckout(snapshot: MoneySnapshot): string {
  return track({
    event: EVENT.BEGIN_CHECKOUT,
    params: baseParams(snapshot),
    metaEvent: META_EVENT.INITIATE_CHECKOUT,
    metaParams: metaParams(snapshot),
  });
}

/** Escolheu a forma de pagamento (Pix ou cartão) e passou a preencher dados. */
export function trackAddPaymentInfo(snapshot: MoneySnapshot, paymentType: string): string {
  return track({
    event: EVENT.ADD_PAYMENT_INFO,
    params: { ...baseParams(snapshot), payment_type: paymentType },
    metaEvent: META_EVENT.ADD_PAYMENT_INFO,
    metaParams: { ...metaParams(snapshot), payment_type: paymentType },
  });
}

/**
 * Pagamento confirmado, na tela de obrigado.
 *
 * O `eventId` NÃO é gerado aqui: ele vem de quem chamou a API (o mesmo que foi
 * enviado no corpo como `metaEventId`), para o evento do servidor poder repetir
 * este exato id. Passar `undefined` aqui é o defeito silencioso que o
 * cabeçalho descreve — a Meta contaria duas conversões.
 */
export function trackPurchase(
  snapshot: MoneySnapshot,
  transactionId: string,
  eventId: string
): string {
  const params = baseParams(snapshot);
  const items = itemsOf(snapshot);
  return track({
    event: EVENT.PURCHASE,
    params: { ...params, transaction_id: transactionId, items },
    metaEvent: META_EVENT.PURCHASE,
    metaParams: {
      ...metaParams(snapshot),
      /** A Meta chama de `order_id` o que o GA4 chama de `transaction_id`. */
      order_id: transactionId,
    },
    eventId,
  });
}

/**
 * Bloco de deduplicação que viaja para a API junto com a confirmação.
 *
 * `metaEventId` é o campo lido pelo webhook para repetir o `Purchase` do
 * servidor com o MESMO id do navegador; `fbp`/`fbc` são os cookies sem os quais
 * o evento de servidor não casa com a pessoa que viu o anúncio. Os três nomes
 * são os mesmos de `signup.schema.ts` de propósito — dois nomes para a mesma
 * coisa, num backend só, é a próxima divergência garantida.
 */
export interface PurchaseDedupPayload extends FbCookies {
  metaEventId: string;
}

export const purchaseDedupPayload = (eventId: string): PurchaseDedupPayload => ({
  metaEventId: eventId,
  ...readFbCookies(),
});
