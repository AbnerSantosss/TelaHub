/**
 * Tipos do painel do funil. Espelham exatamente o que
 * `backend/src/routes/checkout-admin.routes.ts` devolve — nada aqui é inventado.
 *
 * `ipHash` não existe de propósito: o backend não o expõe (minimização de dado),
 * então o painel não pode nem tentar lê-lo.
 */

export const CHECKOUT_STATUSES = [
  'started',
  'identified',
  'payment_pending',
  'paid',
  'abandoned',
  'expired',
] as const;

export type CheckoutStatus = (typeof CHECKOUT_STATUSES)[number];

/** Passo ALCANÇADO no funil (deduzido dos marcos, não do status atual). */
export const CHECKOUT_STEPS = ['view', 'plan_selected', 'identified', 'payment_pending'] as const;

export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

export const RECOVERY_CHANNELS = ['whatsapp', 'email', 'phone', 'other'] as const;

export type RecoveryChannel = (typeof RECOVERY_CHANNELS)[number];

export interface AdminUser {
  id: string;
  username: string;
  name: string | null;
  email: string;
  role: string;
  organizationId: string | null;
}

export interface LoginResponse {
  token: string;
  user: AdminUser;
}

/** Sessão como o painel (master) a vê. */
export interface AdminCheckoutSession {
  id: string;
  publicToken: string;
  status: CheckoutStatus;

  planCode: string | null;
  screens: number;
  amountCents: number;

  name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  companyName: string | null;

  organizationId: string | null;

  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrer: string | null;
  userAgent: string | null;

  startedAt: string;
  lastSeenAt: string;
  identifiedAt: string | null;
  paymentAt: string | null;
  paidAt: string | null;
  abandonedAt: string | null;
  expiresAt: string | null;

  recoveryNotifiedAt: string | null;
  recoveryChannel: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SessionsResponse {
  sessions: AdminCheckoutSession[];
  pagination: Pagination;
}

/** `metadata` chega como JSON em STRING (ou nulo) — nunca como objeto. */
export interface CheckoutEventRow {
  id?: string;
  sessionId?: string;
  type: string;
  metadata: string | null;
  createdAt: string;
}

export interface SessionDetailResponse {
  session: AdminCheckoutSession;
  step: CheckoutStep;
  events: CheckoutEventRow[];
}

export interface UtmBreakdownRow {
  value: string;
  total: number;
  paid: number;
  abandoned: number;
  paidCents: number;
}

export interface CheckoutMetrics {
  period: { startDate: string; endDate: string };
  /** Sessões criadas no período — denominador de todas as taxas. */
  total: number;
  /** Quantas sessões ALCANÇARAM cada passo (histórico, pelos marcos). */
  funnel: { viewed: number; planSelected: number; identified: number; submitted: number; paid: number };
  /** Onde as sessões do período estão AGORA. Pergunta diferente de `funnel`. */
  byStatus: Record<CheckoutStatus, number>;
  conversionRate: number;
  abandonmentRate: number;
  amounts: { currency: string; paidCents: number; abandonedCents: number; pendingCents: number };
  abandonmentByStep: Array<{ step: CheckoutStep; count: number; amountCents: number }>;
  byUtmSource: UtmBreakdownRow[];
  byUtmCampaign: UtmBreakdownRow[];
}

export interface RecoveryResponse {
  session: AdminCheckoutSession;
  notified: boolean;
  message: string;
}

export interface SessionListFilters {
  page?: number;
  pageSize?: number;
  status?: CheckoutStatus;
  startDate?: string;
  endDate?: string;
  email?: string;
}
