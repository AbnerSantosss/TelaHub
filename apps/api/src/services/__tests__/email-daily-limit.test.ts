import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Teto diário de envio.
 *
 * ── Por que existe ───────────────────────────────────────────────────────────
 * O padrão de fábrica da instalação é uma caixa **Gmail**, que entrega cerca de
 * **500 destinatários por dia**. Estourar essa cota não devolve "erro de envio":
 * o provedor bloqueia a conta por um tempo — e junto com a campanha param o
 * convite de usuário e a redefinição de senha, que são as mensagens que ninguém
 * pode perder.
 *
 * O risco é real e já se materializou: no primeiro lote com dados de verdade a
 * fila acumulou 2.610 mensagens (alerta de tela offline sobre centenas de
 * dispositivos, multiplicado pelos destinatários de cada um) e o Gmail passou a
 * responder `454-4.7.0 Too many login attempts`.
 *
 * Daí duas defesas, e este arquivo cobre a segunda:
 *   1. conexão em POOL, para o lote não fazer um login por mensagem;
 *   2. o teto abaixo, para a soma do dia nunca passar da cota.
 *
 * A regra que os testes fixam: atingir o teto deixa a mensagem `queued`, NUNCA
 * `failed`. Ela sai amanhã. Marcar como falha gastaria as tentativas de quem só
 * precisava esperar o dia virar.
 */

interface Row {
  id: string;
  toEmail: string;
  kind: string;
  status: string;
  subject: string;
  htmlBody: string;
  attempts: number;
  nextAttemptAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  templateKey: string | null;
  campaignId: string | null;
  organizationId: string | null;
  toUserId: string | null;
  dedupeKey: string | null;
  lastError: string | null;
  providerMessageId: string | null;
}

const rows: Row[] = [];

function novaLinha(over: Partial<Row> = {}): Row {
  const row: Row = {
    id: `m${rows.length + 1}`,
    toEmail: `pessoa${rows.length + 1}@exemplo.com`,
    kind: 'transactional',
    status: 'queued',
    subject: 'Assunto',
    htmlBody: '<p>corpo</p>',
    attempts: 0,
    nextAttemptAt: null,
    sentAt: null,
    createdAt: new Date(Date.now() + rows.length),
    templateKey: null,
    campaignId: null,
    organizationId: null,
    toUserId: null,
    dedupeKey: null,
    lastError: null,
    providerMessageId: null,
    ...over,
  };
  rows.push(row);
  return row;
}

vi.mock('../../lib/prisma', () => ({
  default: {
    emailMessage: {
      count: vi.fn(async ({ where }: { where: { status: string; sentAt?: { gte: Date } } }) =>
        rows.filter(
          (r) => r.status === where.status && (!where.sentAt || (r.sentAt && r.sentAt >= where.sentAt.gte))
        ).length
      ),
      findMany: vi.fn(
        async ({ where, take }: { where: { status: string; kind: string }; take: number }) =>
          rows.filter((r) => r.status === where.status && r.kind === where.kind).slice(0, take)
      ),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        const row = rows.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return row;
      }),
    },
    user: { findUnique: vi.fn(async () => null), findFirst: vi.fn(async () => null) },
  },
}));

vi.mock('../settings.service', () => ({
  settingsService: { getSmtpConfig: vi.fn(async () => ({ host: 'smtp.x', port: 587, secure: false })) },
}));

// Import dinâmico dentro de `beforeAll`: precisa vir depois dos `vi.mock`, e
// `await` no topo do arquivo não compila com `module: CommonJS` (TS1378).
let emailQueueService: typeof import('../email-queue.service')['emailQueueService'];
beforeAll(async () => {
  ({ emailQueueService } = await import('../email-queue.service'));
});

const AGORA = new Date('2026-09-09T15:00:00');

function transporteQueSempreEntrega() {
  const enviados: string[] = [];
  return {
    enviados,
    transport: {
      async send(msg: { to: string }) {
        enviados.push(msg.to);
        return { messageId: `id-${enviados.length}` };
      },
    },
  };
}

beforeEach(() => {
  rows.length = 0;
});

describe('teto diário de envio', () => {
  it('para de enviar ao atingir a cota e deixa o resto ENFILEIRADO, não falho', async () => {
    // 2 já saíram hoje, teto de 3 → cabe exatamente mais 1.
    novaLinha({ status: 'sent', sentAt: new Date('2026-09-09T09:00:00') });
    novaLinha({ status: 'sent', sentAt: new Date('2026-09-09T10:00:00') });
    novaLinha();
    novaLinha();
    novaLinha();

    const { transport, enviados } = transporteQueSempreEntrega();
    const r = await emailQueueService.dispatchPending({ now: AGORA, transport, dailyLimit: 3 });

    expect(enviados).toHaveLength(1);
    expect(r.sent).toBe(1);
    // O que sobrou continua esperando o dia virar.
    expect(rows.filter((x) => x.status === 'queued')).toHaveLength(2);
    expect(rows.filter((x) => x.status === 'failed')).toHaveLength(0);
  });

  it('com a cota esgotada não abre conexão nenhuma', async () => {
    novaLinha({ status: 'sent', sentAt: new Date('2026-09-09T09:00:00') });
    novaLinha();

    const { transport, enviados } = transporteQueSempreEntrega();
    const r = await emailQueueService.dispatchPending({ now: AGORA, transport, dailyLimit: 1 });

    expect(enviados).toHaveLength(0);
    expect(r.dailyRemaining).toBe(0);
    expect(r.processed).toBe(0);
    expect(rows.find((x) => x.status === 'queued')).toBeDefined();
  });

  it('o que saiu ONTEM não consome a cota de hoje', async () => {
    novaLinha({ status: 'sent', sentAt: new Date('2026-09-08T23:00:00') });
    novaLinha({ status: 'sent', sentAt: new Date('2026-09-08T10:00:00') });
    novaLinha();

    const { transport, enviados } = transporteQueSempreEntrega();
    await emailQueueService.dispatchPending({ now: AGORA, transport, dailyLimit: 2 });

    expect(enviados).toHaveLength(1);
  });

  it('sem teto configurado (null) a fila anda inteira', async () => {
    for (let i = 0; i < 5; i += 1) novaLinha();

    const { transport, enviados } = transporteQueSempreEntrega();
    await emailQueueService.dispatchPending({ now: AGORA, transport, dailyLimit: null });

    expect(enviados).toHaveLength(5);
  });

  it('a cota que sobra vai para o TRANSACIONAL antes da campanha', async () => {
    // Campanha enfileirada primeiro (mais antiga) e transacional depois: sem a
    // prioridade por tipo, a campanha comeria a última vaga do dia e a
    // redefinição de senha esperaria até amanhã.
    novaLinha({ kind: 'campaign', createdAt: new Date('2026-09-09T08:00:00') });
    novaLinha({ kind: 'transactional', createdAt: new Date('2026-09-09T14:00:00') });

    const { transport, enviados } = transporteQueSempreEntrega();
    await emailQueueService.dispatchPending({ now: AGORA, transport, dailyLimit: 1 });

    expect(enviados).toHaveLength(1);
    const enviada = rows.find((r) => r.status === 'sent');
    expect(enviada?.kind).toBe('transactional');
  });
});
