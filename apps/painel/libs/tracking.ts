/**
 * Medição do funil — painel do cliente.
 *
 * Mesma forma de `apps/site/src/lib/tracking.js` e `apps/checkout/src/lib/tracking.ts`,
 * de propósito: os três apps escrevem no MESMO container do GTM (`GTM-W7K6QK7Z`)
 * e no MESMO Pixel, porque a jornada atravessa três domínios. Se cada app
 * inventasse o próprio nome de evento, o relatório de "quanto custou este
 * pagante" não existiria em lugar nenhum.
 *
 * Aqui nascem os dois eventos que definem se a mídia paga fecha a conta:
 *   `sign_up`       — a conta foi criada
 *   `device_linked` — a TV foi conectada (a ativação real; sem ela a conta é lixo)
 *
 * ⚠️ Nada aqui pode lançar: uma falha de medição não pode impedir alguém de
 * criar a conta ou conectar a TV.
 */

export const EVENT = {
  SIGN_UP: 'sign_up',
  DEVICE_LINKED: 'device_linked',
  BEGIN_CHECKOUT: 'begin_checkout',
  PAYWALL_VIEW: 'paywall_view',
  CTA_CLICK: 'cta_click',
} as const;

export const META_EVENT = {
  COMPLETE_REGISTRATION: 'CompleteRegistration',
  TELA_PAREADA: 'TelaPareada',
  INITIATE_CHECKOUT: 'InitiateCheckout',
} as const;

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

/** Id de deduplicação entre o Pixel do navegador e a Conversions API do servidor. */
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

/**
 * Cookies `_fbp` e `_fbc`, que o servidor precisa repassar à Conversions API.
 *
 * Sem eles, o evento de servidor não casa com a pessoa e o `Purchase` não vira
 * público de lookalike — o ativo mais valioso dos primeiros 90 dias.
 */
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
    // dataLayer indisponível não pode quebrar a tela.
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

/**
 * Dispara o mesmo momento no `dataLayer` e no Pixel, devolvendo o `eventID`.
 *
 * Devolver o id é o ponto: quem chamou manda esse mesmo id ao servidor no
 * corpo do pedido, e a Conversions API repete o evento com ele. Id diferente =
 * conversão contada duas vezes = todo custo por resultado do painel pela
 * metade, sem nenhum erro aparecer.
 */
export function track({ event, params = {}, metaEvent, metaParams, eventId }: TrackInput): string {
  const id = eventId || newEventId();
  if (event) trackEvent(event, { ...params, event_id: id });
  if (metaEvent) trackMetaEvent(metaEvent, metaParams ?? params, id);
  return id;
}

/**
 * Centavos → reais. Sempre o CAIXA do ciclo: no anual, os 12 meses.
 * Otimizar por mensal equivalente ensina o algoritmo a caçar quem paga menos.
 */
export function toReais(cents: number | null | undefined): number {
  const n = Number(cents);
  if (!Number.isFinite(n)) return 0;
  return Number((n / 100).toFixed(2));
}
