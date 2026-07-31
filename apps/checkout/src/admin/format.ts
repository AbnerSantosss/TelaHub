/** Formatação pt-BR do painel. Toda data e todo valor da tela passa por aqui. */
import type { CheckoutStatus, CheckoutStep, RecoveryChannel } from './types';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const dateOnly = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

export const formatMoney = (cents: number): string => money.format((cents ?? 0) / 100);

export const formatNumber = (value: number): string => new Intl.NumberFormat('pt-BR').format(value ?? 0);

export const formatPercent = (rate: number): string =>
  `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format((rate ?? 0) * 100)}%`;

export const formatDateTime = (iso: string | null): string =>
  iso ? dateTime.format(new Date(iso)) : '—';

export const formatDate = (iso: string | null): string => (iso ? dateOnly.format(new Date(iso)) : '—');

export const formatShortDate = (iso: string | null): string =>
  iso ? shortDate.format(new Date(iso)).replace('.', '') : '—';

/** "há 3 horas". Base do tempo relativo da lista. */
export function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';

  const diff = Date.now() - then;
  const abs = Math.abs(diff);
  if (abs < 45_000) return 'agora mesmo';

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 365 * 24 * 3600_000],
    ['month', 30 * 24 * 3600_000],
    ['day', 24 * 3600_000],
    ['hour', 3600_000],
    ['minute', 60_000],
  ];

  for (const [unit, ms] of units) {
    if (abs >= ms || unit === 'minute') {
      return relative.format(-Math.round(diff / ms), unit);
    }
  }
  return 'agora mesmo';
}

/** CPF/CNPJ com máscara. Sai como veio se não tiver 11 nem 14 dígitos. */
export function formatDocument(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}

/** Telefone brasileiro. O backend guarda só dígitos (ver checkout.schema.ts). */
export function formatPhone(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  const local = digits.length > 11 && digits.startsWith('55') ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return value;
}

export function firstName(name: string | null | undefined, fallback = 'operador'): string {
  const clean = (name ?? '').trim();
  if (!clean) return fallback;
  return clean.split(/\s+/)[0] ?? fallback;
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Data de hoje/N dias atrás em ISO — formato que o backend aceita nos filtros. */
export function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

// ─── Vocabulário do funil ────────────────────────────────────────────────────

export const STATUS_LABEL: Record<CheckoutStatus, string> = {
  started: 'Iniciado',
  identified: 'Identificado',
  payment_pending: 'Aguardando pagamento',
  paid: 'Contratado',
  abandoned: 'Abandonado',
  expired: 'Expirado',
};

export const STATUS_HINT: Record<CheckoutStatus, string> = {
  started: 'Abriu o checkout e ainda não se identificou.',
  identified: 'Deixou nome e e-mail — já é lead recuperável.',
  payment_pending: 'Finalizou o checkout e aguarda o contato comercial.',
  paid: 'Contratação concluída.',
  abandoned: 'Mais de 30 minutos sem atividade.',
  expired: 'Passou de 30 dias; os dados pessoais são anonimizados.',
};

export const STEP_LABEL: Record<CheckoutStep, string> = {
  view: 'Abriu o checkout',
  plan_selected: 'Escolheu o plano',
  identified: 'Se identificou',
  payment_pending: 'Finalizou o checkout',
};

export const RECOVERY_CHANNEL_LABEL: Record<RecoveryChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  phone: 'Telefone',
  other: 'Outro canal',
};

export function recoveryChannelLabel(channel: string | null): string {
  if (!channel) return '—';
  return RECOVERY_CHANNEL_LABEL[channel as RecoveryChannel] ?? channel;
}

export const EVENT_LABEL: Record<string, string> = {
  view: 'Abriu o checkout',
  plan_selected: 'Escolheu o plano',
  screens_changed: 'Alterou o número de telas',
  identify: 'Se identificou',
  payment_selected: 'Escolheu a forma de pagamento',
  submit: 'Finalizou o checkout (sem cobrança)',
  paid: 'Pagamento confirmado',
  abandoned: 'Marcado como abandonado',
  recovered: 'Voltou ao checkout',
  recovery_notified: 'Contato de recuperação registrado',
};

export function eventLabel(type: string): string {
  return EVENT_LABEL[type] ?? type;
}

/** `metadata` vem como JSON em string (ou nulo). Parse tolerante, nunca explode. */
export function parseMetadata(metadata: string | null): Record<string, unknown> | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { valor: parsed };
  } catch {
    return { valor: metadata };
  }
}

const METADATA_LABEL: Record<string, string> = {
  planCode: 'plano',
  screens: 'telas',
  amountCents: 'valor',
  from: 'de',
  to: 'para',
  fromStatus: 'status anterior',
  step: 'passo',
  channel: 'canal',
  note: 'observação',
  paymentMethod: 'forma de pagamento',
  hasPhone: 'informou telefone',
};

export function metadataLabel(key: string): string {
  return METADATA_LABEL[key] ?? key;
}

export function metadataValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'sim' : 'não';
  if (key === 'amountCents' && typeof value === 'number') return formatMoney(value);
  if (key === 'step') return STEP_LABEL[value as CheckoutStep] ?? String(value);
  if (key === 'channel') return recoveryChannelLabel(String(value));
  if ((key === 'from' || key === 'to' || key === 'fromStatus') && typeof value === 'string') {
    return STATUS_LABEL[value as CheckoutStatus] ?? value;
  }
  return String(value);
}
