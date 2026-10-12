import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Suíte da fila de e-mail.
 *
 * ── Por que o Prisma é DUBLADO aqui ──────────────────────────────────────────
 * As outras suítes deste projeto escrevem num Postgres de teste. Esta não, e é
 * de propósito: o que precisa ser provado aqui é a MÁQUINA DE ESTADOS da fila
 * (prioridade por tipo, dedupe, supressão, backoff, morte após 5 tentativas), e
 * isso é lógica pura sobre um punhado de linhas. Amarrá-la a um banco tornaria
 * o teste do backoff dependente de relógio e de limpeza entre execuções — dois
 * jeitos conhecidos de produzir teste que falha sozinho e acaba desativado.
 *
 * O dublê implementa só o que o serviço usa, e o `dedupeKey` é único NELE
 * também: a colisão que o teste exercita é a mesma que o índice único do banco
 * produz (P2002).
 */

interface StoredMessage {
  id: string;
  toEmail: string;
  toUserId: string | null;
  organizationId: string | null;
  kind: string;
  templateKey: string | null;
  campaignId: string | null;
  subject: string;
  htmlBody: string;
  status: string;
  attempts: number;
  nextAttemptAt: Date | null;
  lastError: string | null;
  providerMessageId: string | null;
  sentAt: Date | null;
  dedupeKey: string | null;
  createdAt: Date;
}

interface StoredUser {
  id: string;
  email: string;
  name: string | null;
  marketingOptInAt: Date | null;
  unsubscribeToken: string | null;
}

type Where = Record<string, unknown>;

/**
 * O dublê nasce dentro de `vi.hoisted` porque `vi.mock` é ELEVADO para o topo
 * do arquivo: uma constante declarada no corpo do módulo ainda não existe
 * quando a fábrica do mock roda, e o erro que aparece
 * ("Cannot access 'prismaDouble' before initialization") não diz isso.
 */
const harness = vi.hoisted(() => {
const messages: StoredMessage[] = [];
const users: StoredUser[] = [];
let sequence = 0;

function resetStore(): void {
  messages.length = 0;
  users.length = 0;
  sequence = 0;
}

/** Casa uma linha contra o `where` — só as formas que o serviço realmente usa. */
function matchesMessage(row: StoredMessage, where: Where | undefined): boolean {
  if (!where) return true;

  for (const [key, condition] of Object.entries(where)) {
    if (key === 'OR') {
      const clauses = condition as Where[];
      if (!clauses.some((clause) => matchesMessage(row, clause))) return false;
      continue;
    }

    const value = (row as unknown as Record<string, unknown>)[key];

    if (condition !== null && typeof condition === 'object') {
      const range = condition as { lte?: Date; gte?: Date; in?: unknown[] };
      if (range.lte !== undefined) {
        if (!(value instanceof Date) || value.getTime() > range.lte.getTime()) return false;
      }
      if (range.in !== undefined && !range.in.includes(value)) return false;
      continue;
    }

    if (value !== condition) return false;
  }

  return true;
}

const prismaDouble = {
  emailMessage: {
    async create({ data }: { data: Record<string, unknown> }): Promise<StoredMessage> {
      const dedupeKey = (data.dedupeKey as string | null) ?? null;

      // Mesmo comportamento do índice único do Postgres.
      if (dedupeKey && messages.some((row) => row.dedupeKey === dedupeKey)) {
        throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      }

      sequence += 1;
      const row: StoredMessage = {
        id: `msg-${sequence}`,
        toEmail: data.toEmail as string,
        toUserId: (data.toUserId as string | null) ?? null,
        organizationId: (data.organizationId as string | null) ?? null,
        kind: (data.kind as string) ?? 'transactional',
        templateKey: (data.templateKey as string | null) ?? null,
        campaignId: (data.campaignId as string | null) ?? null,
        subject: data.subject as string,
        htmlBody: data.htmlBody as string,
        status: (data.status as string) ?? 'queued',
        attempts: 0,
        nextAttemptAt: null,
        lastError: null,
        providerMessageId: null,
        sentAt: null,
        dedupeKey,
        // Ordem de chegada determinística, sem depender do relógio.
        createdAt: new Date(2026, 0, 1, 0, 0, sequence),
      };

      messages.push(row);
      return row;
    },

    async findUnique({ where }: { where: { id?: string; dedupeKey?: string } }) {
      return (
        messages.find(
          (row) =>
            (where.id !== undefined && row.id === where.id) ||
            (where.dedupeKey !== undefined && row.dedupeKey === where.dedupeKey)
        ) ?? null
      );
    },

    async findMany({
      where,
      take,
    }: {
      where?: Where;
      orderBy?: unknown;
      take?: number;
    }): Promise<StoredMessage[]> {
      const found = messages
        .filter((row) => matchesMessage(row, where))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      return take === undefined ? found : found.slice(0, take);
    },

    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const row = messages.find((item) => item.id === where.id);
      if (!row) throw Object.assign(new Error('not found'), { code: 'P2025' });
      Object.assign(row, data);
      return row;
    },

    async count({ where }: { where?: Where } = {}): Promise<number> {
      return messages.filter((row) => matchesMessage(row, where)).length;
    },
  },

  user: {
    async findUnique({ where }: { where: { id?: string; email?: string } }) {
      return (
        users.find(
          (row) =>
            (where.id !== undefined && row.id === where.id) ||
            (where.email !== undefined && row.email === where.email)
        ) ?? null
      );
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const row = users.find((item) => item.id === where.id);
      if (!row) throw Object.assign(new Error('not found'), { code: 'P2025' });
      Object.assign(row, data);
      return row;
    },
  },

  organization: {
    async findUnique(): Promise<{ name: string }> {
      return { name: 'Padaria do Zé' };
    },
  },

  device: {
    async count(): Promise<number> {
      return 3;
    },
  },

  emailCampaign: {
    async update(): Promise<null> {
      return null;
    },
  },
};

  return { messages, users, prismaDouble, resetStore };
});

const { messages, users, resetStore } = harness;

vi.mock('../../lib/prisma', () => ({ default: harness.prismaDouble }));

import {
  EMAIL_BACKOFF_BASE_MS,
  EMAIL_MAX_ATTEMPTS,
  emailBackoffMs,
  emailQueueService,
  type EmailTransport,
  type OutgoingEmail,
} from '../email-queue.service';
import { emailAutomationService } from '../email-automation.service';

/** Transporte que registra o que recebeu e nunca falha. */
function recordingTransport(): { transport: EmailTransport; sent: OutgoingEmail[] } {
  const sent: OutgoingEmail[] = [];
  return {
    sent,
    transport: {
      async send(message) {
        sent.push(message);
        return { messageId: `provider-${sent.length}` };
      },
    },
  };
}

/** Transporte que falha sempre — para exercitar backoff e morte. */
const failingTransport: EmailTransport = {
  async send() {
    throw new Error('conexão recusada pelo provedor');
  },
};

beforeEach(() => {
  resetStore();
});

describe('emailBackoffMs', () => {
  it('cresce exponencialmente a partir da base e respeita o teto de 1h', () => {
    expect(emailBackoffMs(1)).toBe(EMAIL_BACKOFF_BASE_MS);
    expect(emailBackoffMs(2)).toBe(EMAIL_BACKOFF_BASE_MS * 2);
    expect(emailBackoffMs(3)).toBe(EMAIL_BACKOFF_BASE_MS * 4);
    expect(emailBackoffMs(50)).toBe(60 * 60 * 1000);
  });
});

describe('enqueue — idempotência por dedupeKey', () => {
  it('não duplica: a segunda chamada devolve a mensagem que já existia', async () => {
    const first = await emailQueueService.enqueue({
      toEmail: 'cliente@example.com',
      subject: 'Sua assinatura renova em 3 dias',
      htmlBody: '<p>oi</p>',
      kind: 'automation',
      templateKey: 'renewal_d3',
      dedupeKey: 'renewal_d3:org-1:2026-10-01T00:00:00.000Z',
    });

    // É o que acontece quando o job roda de novo depois de um reinício.
    const second = await emailQueueService.enqueue({
      toEmail: 'cliente@example.com',
      subject: 'Sua assinatura renova em 3 dias',
      htmlBody: '<p>oi</p>',
      kind: 'automation',
      templateKey: 'renewal_d3',
      dedupeKey: 'renewal_d3:org-1:2026-10-01T00:00:00.000Z',
    });

    expect(second.id).toBe(first.id);
    expect(messages).toHaveLength(1);
  });
});

describe('dispatchPending — prioridade por kind', () => {
  it('envia o transacional antes da campanha, mesmo a campanha tendo chegado primeiro', async () => {
    users.push({
      id: 'user-campanha',
      email: 'optin@example.com',
      name: 'Optin',
      marketingOptInAt: new Date('2026-08-01T00:00:00.000Z'),
      unsubscribeToken: 'token-existente',
    });

    // A campanha entra na fila PRIMEIRO — é o cenário que quebra sem prioridade.
    await emailQueueService.enqueue({
      toEmail: 'optin@example.com',
      toUserId: 'user-campanha',
      subject: 'Novidades do TelaHub',
      htmlBody: '<p>novidades</p>',
      kind: 'campaign',
    });

    await emailQueueService.enqueue({
      toEmail: 'quem-esqueceu-a-senha@example.com',
      subject: '🔐 Redefinição de Senha do TelaHub',
      htmlBody: '<p>link</p>',
      kind: 'transactional',
    });

    const { transport, sent } = recordingTransport();
    const result = await emailQueueService.dispatchPending({ transport });

    expect(result.sent).toBe(2);
    expect(sent[0].subject).toContain('Redefinição de Senha');
    expect(sent[1].subject).toBe('Novidades do TelaHub');
  });
});

describe('dispatchPending — supressão de marketing', () => {
  it('suprime a campanha de quem não deu opt-in e não chama o provedor', async () => {
    users.push({
      id: 'user-sem-optin',
      email: 'sem-optin@example.com',
      name: 'Sem Optin',
      marketingOptInAt: null,
      unsubscribeToken: null,
    });

    await emailQueueService.enqueue({
      toEmail: 'sem-optin@example.com',
      toUserId: 'user-sem-optin',
      subject: 'Novidades do TelaHub',
      htmlBody: '<p>novidades</p>',
      kind: 'campaign',
    });

    const { transport, sent } = recordingTransport();
    const result = await emailQueueService.dispatchPending({ transport });

    expect(result.suppressed).toBe(1);
    expect(result.sent).toBe(0);
    expect(sent).toHaveLength(0);
    expect(messages[0].status).toBe('suppressed');
  });

  it('não suprime automação: aviso de cobrança é execução de contrato', async () => {
    users.push({
      id: 'user-sem-optin-2',
      email: 'devedor@example.com',
      name: 'Devedor',
      marketingOptInAt: null,
      unsubscribeToken: null,
    });

    await emailQueueService.enqueue({
      toEmail: 'devedor@example.com',
      toUserId: 'user-sem-optin-2',
      subject: 'Sua fatura continua em aberto',
      htmlBody: '<p>fatura</p>',
      kind: 'automation',
      templateKey: 'past_due_d5',
    });

    const { transport, sent } = recordingTransport();
    const result = await emailQueueService.dispatchPending({ transport });

    expect(result.suppressed).toBe(0);
    expect(result.sent).toBe(1);
    expect(sent).toHaveLength(1);
  });
});

describe('dispatchPending — retentativa', () => {
  it('agenda a próxima tentativa com backoff crescente', async () => {
    await emailQueueService.enqueue({
      toEmail: 'cliente@example.com',
      subject: 'Convite',
      htmlBody: '<p>convite</p>',
    });

    const primeira = new Date('2026-09-09T10:00:00.000Z');
    await emailQueueService.dispatchPending({ transport: failingTransport, now: primeira });

    expect(messages[0].status).toBe('queued');
    expect(messages[0].attempts).toBe(1);
    expect(messages[0].nextAttemptAt?.getTime()).toBe(primeira.getTime() + EMAIL_BACKOFF_BASE_MS);

    // Antes da hora marcada, a mensagem NÃO pode ser reprocessada.
    const cedo = new Date(primeira.getTime() + 1_000);
    const semNada = await emailQueueService.dispatchPending({
      transport: failingTransport,
      now: cedo,
    });
    expect(semNada.processed).toBe(0);
    expect(messages[0].attempts).toBe(1);

    const segunda = new Date(primeira.getTime() + EMAIL_BACKOFF_BASE_MS);
    await emailQueueService.dispatchPending({ transport: failingTransport, now: segunda });

    expect(messages[0].attempts).toBe(2);
    expect(messages[0].nextAttemptAt?.getTime()).toBe(
      segunda.getTime() + EMAIL_BACKOFF_BASE_MS * 2
    );
  });

  it('desiste depois de 5 tentativas e marca `failed`, com o erro registrado', async () => {
    await emailQueueService.enqueue({
      toEmail: 'cliente@example.com',
      subject: 'Convite',
      htmlBody: '<p>convite</p>',
    });

    let now = new Date('2026-09-09T10:00:00.000Z');
    for (let attempt = 1; attempt <= EMAIL_MAX_ATTEMPTS; attempt++) {
      await emailQueueService.dispatchPending({ transport: failingTransport, now });
      const next = messages[0].nextAttemptAt;
      if (next) now = next;
    }

    expect(messages[0].attempts).toBe(EMAIL_MAX_ATTEMPTS);
    expect(messages[0].status).toBe('failed');
    expect(messages[0].nextAttemptAt).toBeNull();
    expect(messages[0].lastError).toContain('conexão recusada');

    // Morta é morta: uma varredura seguinte não pode ressuscitá-la sozinha.
    const depois = await emailQueueService.dispatchPending({
      transport: failingTransport,
      now: new Date(now.getTime() + 60 * 60 * 1000),
    });
    expect(depois.processed).toBe(0);
  });
});

describe('automação de renovação — o valor é o do CICLO', () => {
  /**
   * Este é o teste do defeito US-A-05. Numa assinatura ANUAL, o valor do e-mail
   * tem que ser o que a pessoa vai ver na fatura (12 meses), não o mensal
   * equivalente da vitrine. Loja anual, 3 telas: 3 × R$ 39 × 12 = R$ 1.404,00.
   * O número errado (R$ 117,00) é o mensal equivalente — se ele aparecer aqui, o
   * cliente recebe um aviso de cobrança com um doze avos do valor real.
   */
  it('usa estimateCycleCents na assinatura anual, nunca o mensal equivalente', async () => {
    const plan = {
      id: 'plan-loja',
      code: 'loja',
      name: 'Loja',
      pricePerScreenCents: 4900,
      priceAnnualPerScreenCents: 3900,
      minScreens: 1,
      maxDevices: null,
      maxUsers: null,
      maxOrganizations: null,
      features: '[]',
      active: true,
    };

    const subscription = {
      id: 'sub-1',
      organizationId: 'org-1',
      planId: plan.id,
      plan,
      status: 'active',
      trialEndsAt: null,
      currentPeriodEnd: new Date('2026-10-01T00:00:00.000Z'),
      billingInterval: 'yearly',
      gateway: null,
      gatewayCustomerId: null,
      gatewaySubscriptionId: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      cancelReason: null,
      pastDueSince: null,
      contractedScreens: null,
      gatewayCancelPending: false,
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
      updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    };

    const variables = await emailAutomationService.variablesFor(subscription, 'Zé');

    expect(variables.valor).toContain('1.404,00');
    expect(variables.valor).not.toContain('117,00');
    expect(variables.plano).toBe('Loja');
    expect(variables.empresa).toBe('Padaria do Zé');
  });
});
