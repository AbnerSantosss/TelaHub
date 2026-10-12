import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Agendamento de campanha — a guarda que impede o disparo antecipado.
 *
 * ── Por que esta suíte existe ────────────────────────────────────────────────
 * `EmailCampaignService.send()` nasceu ignorando `scheduledAt` por completo:
 * enfileirava na hora, sempre. Como a tela agenda gravando `scheduledAt` e em
 * seguida chamando `/send` (para o motivo ficar no `AuditLog`), o resultado era
 * que marcar uma campanha para a semana seguinte a mandava para a base inteira
 * no mesmo minuto — com a interface confirmando "agendada".
 *
 * É o pior formato de defeito de e-mail: irreversível assim que a fila anda,
 * sem sintoma nenhum antes, e indistinguível de acerto para quem só olha a tela.
 * Daí um teste próprio em vez de um caso dentro da suíte da fila.
 *
 * O Prisma é dublado pelo mesmo motivo de `email-queue.test.ts`: o que se prova
 * aqui é decisão sobre datas, não persistência.
 */

interface StoredCampaign {
  id: string;
  status: string;
  scheduledAt: Date | null;
  sentAt: Date | null;
  audience: string;
  subject: string;
  htmlBody: string;
  queuedCount: number;
}

const campaigns = new Map<string, StoredCampaign>();
const enqueued: Array<{ toEmail: string; campaignId?: string | null }> = [];

vi.mock('../../lib/prisma', () => ({
  default: {
    emailCampaign: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => campaigns.get(where.id) ?? null),
      findMany: vi.fn(async ({ where }: { where: { status: string; scheduledAt: { lte: Date } } }) =>
        [...campaigns.values()]
          .filter((c) => c.status === where.status && c.scheduledAt && c.scheduledAt <= where.scheduledAt.lte)
          .map((c) => ({ id: c.id }))
      ),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<StoredCampaign> }) => {
        const current = campaigns.get(where.id)!;
        const next = { ...current, ...data };
        campaigns.set(where.id, next);
        return next;
      }),
    },
    user: {
      findMany: vi.fn(async () => [
        { id: 'u1', email: 'cliente@exemplo.com', organizationId: 'org1', marketingOptInAt: new Date() },
      ]),
    },
  },
}));

vi.mock('../email-queue.service', () => ({
  emailQueueService: {
    enqueue: vi.fn(async (input: { toEmail: string; campaignId?: string | null }) => {
      enqueued.push(input);
      return { id: `msg-${enqueued.length}` };
    }),
  },
}));

// Import dinâmico dentro de `beforeAll`: precisa vir depois dos `vi.mock`, e
// `await` no topo do arquivo não compila com `module: CommonJS` (TS1378).
let emailCampaignService: typeof import('../email-campaign.service')['emailCampaignService'];
beforeAll(async () => {
  ({ emailCampaignService } = await import('../email-campaign.service'));
});

const AGORA = new Date('2026-09-09T12:00:00.000Z');
const DAQUI_UMA_SEMANA = new Date('2026-09-16T12:00:00.000Z');

function seed(overrides: Partial<StoredCampaign> = {}): string {
  const id = `camp-${campaigns.size + 1}`;
  campaigns.set(id, {
    id,
    status: 'draft',
    scheduledAt: null,
    sentAt: null,
    audience: '{"optInOnly":true}',
    subject: 'Novidades de setembro',
    htmlBody: '<p>oi</p>',
    queuedCount: 0,
    ...overrides,
  });
  return id;
}

beforeEach(() => {
  campaigns.clear();
  enqueued.length = 0;
});

describe('campanha agendada', () => {
  it('NÃO dispara quando a data marcada ainda não chegou', async () => {
    const id = seed({ status: 'scheduled', scheduledAt: DAQUI_UMA_SEMANA });

    await expect(emailCampaignService.send(id, { now: AGORA })).rejects.toThrow(/agendada/i);

    // O que realmente importa: nada foi para a fila.
    expect(enqueued).toHaveLength(0);
    expect(campaigns.get(id)!.status).toBe('scheduled');
  });

  it('dispara quando o operador pede explicitamente, e limpa o agendamento', async () => {
    const id = seed({ status: 'scheduled', scheduledAt: DAQUI_UMA_SEMANA });

    const result = await emailCampaignService.send(id, { ignoreSchedule: true, now: AGORA });

    expect(result.queued).toBe(1);
    const depois = campaigns.get(id)!;
    expect(depois.status).toBe('sent');
    // Enviada com data futura ainda preenchida seria um estado que se
    // contradiz — a tela mostraria "agendada para 16" ao lado de "enviada".
    expect(depois.scheduledAt).toBeNull();
  });

  it('dispara sozinha depois que a data passa', async () => {
    const id = seed({ status: 'scheduled', scheduledAt: DAQUI_UMA_SEMANA });

    const depoisDaData = new Date('2026-09-16T13:00:00.000Z');
    const result = await emailCampaignService.runScheduled(depoisDaData);

    expect(result.dispatched).toBe(1);
    expect(enqueued).toHaveLength(1);
    expect(campaigns.get(id)!.status).toBe('sent');
  });

  it('campanha marcada para o segundo exato não fica presa entre varreduras', async () => {
    // Regressão da armadilha do `runScheduled`: a consulta filtra por
    // `scheduledAt <= now`, mas se `send()` recomparasse com um relógio novo, a
    // campanha seria reprovada por alguns milissegundos — a cada varredura,
    // para sempre.
    const naHoraExata = new Date('2026-09-16T12:00:00.000Z');
    const id = seed({ status: 'scheduled', scheduledAt: naHoraExata });

    const result = await emailCampaignService.runScheduled(naHoraExata);

    expect(result.dispatched).toBe(1);
    expect(campaigns.get(id)!.status).toBe('sent');
  });

  it('campanha sem agendamento continua saindo na hora', async () => {
    const id = seed({ status: 'draft', scheduledAt: null });

    const result = await emailCampaignService.send(id, { now: AGORA });

    expect(result.queued).toBe(1);
    expect(campaigns.get(id)!.status).toBe('sent');
  });
});
