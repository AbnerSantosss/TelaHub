/**
 * Medição do funil — checkout.
 *
 * Mesma forma de `apps/site/src/lib/tracking.js` e `apps/painel/libs/tracking.ts`:
 * um container de GTM (`GTM-W7K6QK7Z`) e um Pixel para os três apps, porque a
 * jornada atravessa três domínios e três containers dariam três relatórios que
 * não se somam.
 *
 * É daqui que saem os eventos de dinheiro. Duas regras que não podem ser
 * relaxadas:
 *
 * 1. `value` é o CAIXA do ciclo, em reais. No anual, o total dos 12 meses
 *    (2 telas do Loja no anual = 2 × 39 × 12 = 936.00), nunca o mensal
 *    equivalente. O painel do Meta otimiza pelo `value` que recebe: mandar o
 *    mensal ensinaria o algoritmo a procurar quem paga menos à vista, que é o
 *    oposto da estratégia — o anual é o que financia a mídia. Confundir os dois
 *    é o defeito registrado em US-A-05.
 *
 * 2. `Purchase` sai DUAS vezes: aqui, quando a pessoa vê a tela de obrigado, e
 *    no servidor, quando o webhook do gateway confirma. Os dois precisam do
 *    MESMO `eventID`, senão a Meta conta duas conversões e todo custo por
 *    resultado aparece pela metade — sem erro nenhum no meio do caminho.
 *    O id nasce aqui e viaja no corpo do pedido para a API.
 *
 * ⚠️ Nada aqui pode lançar: medição quebrada não pode impedir um pagamento.
 */

export const EVENT = {
  BEGIN_CHECKOUT: 'begin_checkout',
  ADD_PAYMENT_INFO: 'add_payment_info',
  PURCHASE: 'purchase',
  CHECKOUT_STEP: 'checkout_step',
} as const;

export const META_EVENT = {
  INITIATE_CHECKOUT: 'InitiateCheckout',
  ADD_PAYMENT_INFO: 'AddPaymentInfo',
  PURCHASE: 'Purchase',
  SUBSCRIBE: 'Subscribe',
} as const;

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

/** Id de deduplicação entre o Pixel do navegador e a Conversions API. */
export function newEventId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Contexto sem crypto: cai no gerador abaixo.
  }
  return `e-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export interface FbCookies {
  fbp?: string;
  fbc?: string;
}

/** `_fbp` e `_fbc`: sem eles o `Purchase` de servidor não casa com a pessoa. */
export function readFbCookies(): FbCookies {
  if (typeof document === 'undefined') return {};
  try {
    const jar: Record<string, string> = {};
    for (const part of document.cookie.split(';')) {
      const [name, ...rest] = part.trim().split('=');
      if (name) jar[name] = rest.join('=');
    }
    return { fbp: jar._fbp || undefined, fbc: jar._fbc || undefined };
  } catch {
    return {};
  }
}

export function trackEvent(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...params });
  } catch {
    // dataLayer indisponível não pode quebrar o pagamento.
  }
}

export function trackMetaEvent(
  metaEventName: string,
  params: Record<string, unknown> = {},
  eventId?: string
): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  try {
    window.fbq('track', metaEventName, params, eventId ? { eventID: eventId } : undefined);
  } catch {
    // Pixel bloqueado por extensão é o caso comum, não um defeito nosso.
  }
}

export interface TrackInput {
  event?: string;
  params?: Record<string, unknown>;
  metaEvent?: string;
  metaParams?: Record<string, unknown>;
  eventId?: string;
}

/** Dispara nos dois destinos e devolve o `eventID` para repassar ao servidor. */
export function track({ event, params = {}, metaEvent, metaParams, eventId }: TrackInput): string {
  const id = eventId || newEventId();
  if (event) trackEvent(event, { ...params, event_id: id });
  if (metaEvent) trackMetaEvent(metaEvent, metaParams ?? params, id);
  return id;
}

/** Centavos → reais, com duas casas. */
export function toReais(cents: number | null | undefined): number {
  const n = Number(cents);
  if (!Number.isFinite(n)) return 0;
  return Number((n / 100).toFixed(2));
}

/**
 * Valor de CAIXA do ciclo, em reais, a partir do mensal equivalente.
 *
 * A `CheckoutSession.amountCents` guarda sempre o MENSAL EQUIVALENTE, inclusive
 * no anual (decisão registrada no schema). Quem manda evento de conversão
 * precisa do total efetivamente cobrado, então a multiplicação por 12 mora aqui,
 * num lugar só — espalhá-la pelos componentes é como nasce a divergência entre
 * o que o Meta recebe e o que o gateway cobrou.
 */
export function cycleCashInReais(
  monthlyEquivalentCents: number | null | undefined,
  billingInterval: string | null | undefined
): number {
  const monthly = toReais(monthlyEquivalentCents);
  return billingInterval === 'yearly' ? Number((monthly * 12).toFixed(2)) : monthly;
}
