import { afterAll, describe, expect, it } from 'vitest';

import prisma from '../../lib/prisma';
import { generatePublicToken } from '../checkout.service';
import type { CheckoutEventHandler } from '../checkout-handlers';
import {
  DISPATCH_BACKOFF_BASE_MS,
  DISPATCH_MAX_ATTEMPTS,
  backoffMs,
  eventDispatcherService,
} from '../event-dispatcher.service';

const SUFFIX = `evtdisp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const sessionIds: string[] = [];

let seq = 0;

/**
 * Cada caso de teste usa um TIPO de evento exclusivo e um resolvedor que só
 * conhece esse tipo. Assim o teste não depende do registro real de produção,
 * nem dos eventos que as outras suítes escrevem na mesma tabela em paralelo
 * (para o resolvedor deste caso, tudo o mais é "tipo sem tratador").
 */
function newCase(handlers: Array<{ name: string; behavior: 'ok' | 'throw' }>) {
  const type = `t-${SUFFIX}-${seq++}`;
  const calls: Record<string, number> = {};

  const built: CheckoutEventHandler[] = handlers.map(({ name, behavior }) => ({
    name,
    async handle() {
      calls[name] = (calls[name] ?? 0) + 1;
      if (behavior === 'throw') throw new Error(`falha proposital de ${name}`);
    },
  }));

  const resolve = (t: string): CheckoutEventHandler[] => (t === type ? built : []);

  return { type, calls, resolve };
}

async function seedSession() {
  const session = await prisma.checkoutSession.create({
    data: {
      publicToken: generatePublicToken(),
      status: 'payment_pending',
      planCode: `plano-${SUFFIX}`,
      screens: 3,
      amountCents: 14700,
      name: 'Fulano de Tal',
      email: `lead-${SUFFIX}@example.com`,
    },
  });
  sessionIds.push(session.id);
  return session;
}

async function seedEvent(type: string, data: Record<string, unknown> = {}) {
  const session = await seedSession();
  return prisma.checkoutEvent.create({
    data: { sessionId: session.id, type, metadata: JSON.stringify({ amountCents: 14700 }), ...data },
  });
}

async function reload(id: string) {
  const event = await prisma.checkoutEvent.findUnique({ where: { id } });
  if (!event) throw new Error(`evento ${id} sumiu`);
  return event;
}

afterAll(async () => {
  const events = await prisma.checkoutEvent.findMany({
    where: { sessionId: { in: sessionIds } },
    select: { id: true },
  });
  await prisma.auditLog.deleteMany({ where: { entityId: { in: events.map((e) => e.id) } } });
  // Os eventos caem por cascade junto com a sessão.
  await prisma.checkoutSession.deleteMany({ where: { id: { in: sessionIds } } });
});

describe('backoffMs', () => {
  it('cresce exponencialmente a partir da base e respeita o teto', () => {
    expect(backoffMs(1)).toBe(DISPATCH_BACKOFF_BASE_MS);
    expect(backoffMs(2)).toBe(DISPATCH_BACKOFF_BASE_MS * 2);
    expect(backoffMs(3)).toBe(DISPATCH_BACKOFF_BASE_MS * 4);
    expect(backoffMs(50)).toBe(60 * 60 * 1000);
  });
});

describe('dispatchPending — entrega', () => {
  it('marca `delivered`, carimba `dispatchedAt` e limpa a retentativa', async () => {
    const c = newCase([{ name: 'ok', behavior: 'ok' }]);
    const event = await seedEvent(c.type);

    const result = await eventDispatcherService.dispatchPending({
      resolveHandlers: c.resolve,
      batchSize: 200,
    });

    expect(result.outcomes.find((o) => o.eventId === event.id)?.status).toBe('delivered');
    expect(c.calls.ok).toBe(1);

    const stored = await reload(event.id);
    expect(stored.dispatchStatus).toBe('delivered');
    expect(stored.dispatchAttempts).toBe(1);
    expect(stored.dispatchedAt).toBeInstanceOf(Date);
    expect(stored.nextAttemptAt).toBeNull();
    expect(stored.lastDispatchError).toBeNull();
  });

  it('não pega de novo um evento já entregue', async () => {
    const c = newCase([{ name: 'ok', behavior: 'ok' }]);
    const event = await seedEvent(c.type);

    await eventDispatcherService.dispatchPending({ resolveHandlers: c.resolve, batchSize: 200 });
    expect(c.calls.ok).toBe(1);

    await eventDispatcherService.dispatchPending({ resolveHandlers: c.resolve, batchSize: 200 });
    expect(c.calls.ok).toBe(1);
    expect((await reload(event.id)).dispatchAttempts).toBe(1);
  });
});

describe('dispatchPending — falha, backoff e evento morto', () => {
  it('agenda retentativa com `nextAttemptAt` no futuro e guarda o erro', async () => {
    const c = newCase([{ name: 'fail', behavior: 'throw' }]);
    const event = await seedEvent(c.type);
    const now = new Date();

    const result = await eventDispatcherService.dispatchPending({
      resolveHandlers: c.resolve,
      now,
      batchSize: 200,
    });
    expect(result.outcomes.find((o) => o.eventId === event.id)?.status).toBe('pending');

    const stored = await reload(event.id);
    expect(stored.dispatchStatus).toBe('pending');
    expect(stored.dispatchAttempts).toBe(1);
    expect(stored.lastDispatchError).toContain('falha proposital');
    expect(stored.nextAttemptAt).toBeInstanceOf(Date);
    expect(stored.nextAttemptAt!.getTime()).toBeGreaterThan(now.getTime());
    expect(stored.nextAttemptAt!.getTime() - now.getTime()).toBe(DISPATCH_BACKOFF_BASE_MS);
  });

  it('não pega o evento antes de `nextAttemptAt` vencer, e pega depois', async () => {
    const c = newCase([{ name: 'fail', behavior: 'throw' }]);
    const event = await seedEvent(c.type);
    const t0 = new Date();

    await eventDispatcherService.dispatchPending({ resolveHandlers: c.resolve, now: t0, batchSize: 200 });
    expect(c.calls.fail).toBe(1);

    // Ainda dentro da espera: o evento não pode voltar.
    await eventDispatcherService.dispatchPending({
      resolveHandlers: c.resolve,
      now: new Date(t0.getTime() + 1_000),
      batchSize: 200,
    });
    expect(c.calls.fail).toBe(1);

    // Espera vencida: volta.
    await eventDispatcherService.dispatchPending({
      resolveHandlers: c.resolve,
      now: new Date(t0.getTime() + DISPATCH_BACKOFF_BASE_MS + 1_000),
      batchSize: 200,
    });
    expect(c.calls.fail).toBe(2);
    expect((await reload(event.id)).dispatchAttempts).toBe(2);
  });

  it('depois de estourar as tentativas vira `failed` e PARA de ser reprocessado', async () => {
    const c = newCase([{ name: 'fail', behavior: 'throw' }]);
    const event = await seedEvent(c.type);
    let now = new Date();

    for (let i = 1; i <= DISPATCH_MAX_ATTEMPTS; i++) {
      await eventDispatcherService.dispatchPending({ resolveHandlers: c.resolve, now, batchSize: 200 });
      now = new Date(now.getTime() + backoffMs(i) + 1_000);
    }

    expect(c.calls.fail).toBe(DISPATCH_MAX_ATTEMPTS);

    const stored = await reload(event.id);
    expect(stored.dispatchStatus).toBe('failed');
    expect(stored.dispatchAttempts).toBe(DISPATCH_MAX_ATTEMPTS);
    expect(stored.nextAttemptAt).toBeNull();
    expect(stored.lastDispatchError).toContain('falha proposital');

    // Evento morto não gira mais.
    await eventDispatcherService.dispatchPending({
      resolveHandlers: c.resolve,
      now: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      batchSize: 200,
    });
    expect(c.calls.fail).toBe(DISPATCH_MAX_ATTEMPTS);
  });

  it('`retryFailed` devolve o evento morto para a fila zerando as tentativas', async () => {
    const c = newCase([{ name: 'fail', behavior: 'throw' }]);
    const event = await seedEvent(c.type, { dispatchStatus: 'failed', dispatchAttempts: 5 });

    expect(await eventDispatcherService.retryFailed(event.id)).toBe(true);
    const stored = await reload(event.id);
    expect(stored.dispatchStatus).toBe('pending');
    expect(stored.dispatchAttempts).toBe(0);

    // Só recoloca evento morto: um pendente não é mexido.
    expect(await eventDispatcherService.retryFailed(event.id)).toBe(false);
  });
});

describe('dispatchPending — isolamento', () => {
  it('um tratador que lança não impede o outro do mesmo evento', async () => {
    const c = newCase([
      { name: 'fail', behavior: 'throw' },
      { name: 'sibling', behavior: 'ok' },
    ]);
    const event = await seedEvent(c.type);

    await eventDispatcherService.dispatchPending({ resolveHandlers: c.resolve, batchSize: 200 });

    expect(c.calls.fail).toBe(1);
    // O irmão rodou mesmo com o primeiro lançando.
    expect(c.calls.sibling).toBe(1);

    const stored = await reload(event.id);
    expect(stored.dispatchStatus).toBe('pending');
    expect(stored.lastDispatchError).toContain('fail:');
  });

  it('um evento que falha não derruba o lote', async () => {
    const failing = newCase([{ name: 'fail', behavior: 'throw' }]);
    const healthy = newCase([{ name: 'ok', behavior: 'ok' }]);
    const failingEvent = await seedEvent(failing.type);
    const okEvent = await seedEvent(healthy.type);

    const resolve = (t: string): CheckoutEventHandler[] => [...failing.resolve(t), ...healthy.resolve(t)];
    const result = await eventDispatcherService.dispatchPending({ resolveHandlers: resolve, batchSize: 200 });

    expect(result.outcomes.find((o) => o.eventId === failingEvent.id)?.status).toBe('pending');
    expect(result.outcomes.find((o) => o.eventId === okEvent.id)?.status).toBe('delivered');
    expect((await reload(okEvent.id)).dispatchStatus).toBe('delivered');
    expect(healthy.calls.ok).toBe(1);
  });
});

describe('dispatchPending — tipo sem tratador', () => {
  it('vira `skipped`, não `failed`', async () => {
    const c = newCase([{ name: 'ok', behavior: 'ok' }]);
    // Tipo que o resolvedor deste caso não conhece.
    const event = await seedEvent(`orfao-${SUFFIX}`);

    const result = await eventDispatcherService.dispatchPending({
      resolveHandlers: c.resolve,
      batchSize: 200,
    });

    expect(result.outcomes.find((o) => o.eventId === event.id)?.status).toBe('skipped');

    const stored = await reload(event.id);
    expect(stored.dispatchStatus).toBe('skipped');
    expect(stored.lastDispatchError).toBeNull();
    expect(stored.dispatchedAt).toBeInstanceOf(Date);
    // Não conta como tentativa: ninguém tentou nada.
    expect(stored.dispatchAttempts).toBe(0);
    expect(c.calls.ok).toBeUndefined();
  });
});

describe('getQueueStatus', () => {
  it('conta a fila por estado e aponta o pendente mais antigo', async () => {
    const c = newCase([{ name: 'ok', behavior: 'ok' }]);
    const delivered = await seedEvent(c.type);
    const skipped = await seedEvent(`orfao-${SUFFIX}`);

    const before = await eventDispatcherService.getQueueStatus();
    expect(before.pending).toBeGreaterThanOrEqual(2);
    expect(before.due).toBeGreaterThanOrEqual(2);
    expect(before.oldestPendingId).not.toBeNull();
    expect(before.oldestPendingAgeMs).toBeGreaterThanOrEqual(0);

    await eventDispatcherService.dispatchPending({ resolveHandlers: c.resolve, batchSize: 200 });

    const after = await eventDispatcherService.getQueueStatus();
    expect(after.delivered).toBeGreaterThanOrEqual(1);
    expect(after.skipped).toBeGreaterThanOrEqual(1);
    // Comparação por evento, não por total: outras suítes escrevem na mesma
    // tabela em paralelo e o total absoluto não é estável.
    expect((await reload(delivered.id)).dispatchStatus).toBe('delivered');
    expect((await reload(skipped.id)).dispatchStatus).toBe('skipped');
  });
});
