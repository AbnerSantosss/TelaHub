/**
 * Cor de status do painel — FONTE ÚNICA.
 *
 * Antes havia quatro mapas (ui.tsx, LeadsPage, PagamentosPage, SessionDetailPage)
 * repetindo as mesmas classes com hex solto. Aqui cada TOM semântico é definido
 * uma vez e cada vocabulário de status (sessão de checkout, lead, pagamento,
 * evento da linha do tempo) só diz qual tom usa. O significado de cada status é
 * o mesmo de antes — só mudou onde a cor mora.
 *
 * Sobre o texto: o tom cheio (`--accent`, `--success`…) fica em ~3:1 sobre fundo
 * claro, abaixo do piso de 4.5:1. O TEXTO usa o token `*-ink` (mesma família
 * escurecida, definido no `@theme` do index.css); a cor cheia fica para ponto,
 * barra de gráfico e borda.
 */
import type { LeadStatus } from './backoffice-types';
import type { CheckoutStatus } from './types';

export type StatusTone = 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface ToneStyle {
  /** Badge da linha e do detalhe. */
  badge: string;
  /** Chip de filtro quando ativo. */
  chipActive: string;
  /** Ponto/tag — uso gráfico, cor cheia do token. */
  dot: string;
  /** Barra de gráfico. */
  bar: string;
  /** Marcador circular da linha do tempo (borda um pouco mais forte). */
  marker: string;
}

export const TONE: Record<StatusTone, ToneStyle> = {
  accent: {
    badge: 'border-accent/25 bg-accent/10 text-accent-ink',
    chipActive: 'border-accent bg-accent/10 text-accent-ink',
    dot: 'bg-accent',
    bar: 'bg-accent',
    marker: 'border-accent/40 bg-accent/10 text-accent-ink',
  },
  info: {
    badge: 'border-info/25 bg-info/10 text-info-ink',
    chipActive: 'border-info bg-info/10 text-info-ink',
    dot: 'bg-info',
    bar: 'bg-info',
    marker: 'border-info/40 bg-info/10 text-info-ink',
  },
  success: {
    badge: 'border-success/25 bg-success/10 text-success-ink',
    chipActive: 'border-success bg-success/10 text-success-ink',
    dot: 'bg-success',
    bar: 'bg-success',
    marker: 'border-success/40 bg-success/10 text-success-ink',
  },
  warning: {
    badge: 'border-warning/25 bg-warning/10 text-warning-ink',
    chipActive: 'border-warning bg-warning/10 text-warning-ink',
    dot: 'bg-warning',
    bar: 'bg-warning',
    marker: 'border-warning/40 bg-warning/10 text-warning-ink',
  },
  danger: {
    badge: 'border-danger/25 bg-danger/10 text-danger-ink',
    chipActive: 'border-danger bg-danger/10 text-danger-ink',
    dot: 'bg-danger',
    bar: 'bg-danger',
    marker: 'border-danger/40 bg-danger/10 text-danger-ink',
  },
  // Cinza: estado encerrado que não pede ação (expirado, descartado, cancelado).
  neutral: {
    badge: 'border-line bg-app text-ink-muted',
    chipActive: 'border-ink-subtle bg-app text-ink',
    dot: 'bg-ink-subtle',
    bar: 'bg-ink-subtle',
    marker: 'border-line bg-app text-ink-subtle',
  },
};

// ─── Sessão de checkout ──────────────────────────────────────────────────────

const CHECKOUT_TONE: Record<CheckoutStatus, StatusTone> = {
  started: 'accent',
  identified: 'info',
  payment_pending: 'warning',
  paid: 'success',
  abandoned: 'danger',
  // Cinza de propósito: `--danger` já é o abandono, que é o estado acionável.
  // Expirado é beco sem saída — não deve competir por atenção.
  expired: 'neutral',
};

export type StatusStyle = Omit<ToneStyle, 'marker'>;

export const STATUS_STYLE: Record<CheckoutStatus, StatusStyle> = {
  started: TONE[CHECKOUT_TONE.started],
  identified: TONE[CHECKOUT_TONE.identified],
  payment_pending: TONE[CHECKOUT_TONE.payment_pending],
  paid: TONE[CHECKOUT_TONE.paid],
  abandoned: TONE[CHECKOUT_TONE.abandoned],
  expired: TONE[CHECKOUT_TONE.expired],
};

// ─── Lead ────────────────────────────────────────────────────────────────────

export const LEAD_TONE: Record<LeadStatus, StatusTone> = {
  new: 'accent',
  contacted: 'info',
  qualified: 'success',
  discarded: 'neutral',
};

// ─── Pagamento (provedor) ────────────────────────────────────────────────────

export const PAYMENT_TONE: Record<string, StatusTone> = {
  paid: 'success',
  confirmed: 'success',
  received: 'success',
  pending: 'warning',
  overdue: 'danger',
  failed: 'danger',
  refunded: 'info',
  canceled: 'neutral',
};

// ─── Evento da linha do tempo ────────────────────────────────────────────────

export const EVENT_TONE: Record<string, StatusTone> = {
  paid: 'success',
  submit: 'warning',
  abandoned: 'danger',
  identify: 'info',
  recovered: 'info',
  recovery_notified: 'accent',
};
