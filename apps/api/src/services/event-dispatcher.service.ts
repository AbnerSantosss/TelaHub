import type { CheckoutEvent, CheckoutSession, Prisma } from '@prisma/client';

import prisma from '../lib/prisma';
import { getHandlersFor, parseMetadata } from './checkout-handlers';
import type { CheckoutEventHandler } from './checkout-handlers';

/**
 * ─── Despachante de eventos do checkout (padrão outbox) ──────────────────────
 *
 * Por que assim, e não por broker: arquitetura orientada a eventos com
 * Kafka/RabbitMQ tem complexidade operacional ALTA (e microserviços, MUITO
 * ALTA), difícil de justificar num sistema deste tamanho. O que se quer aqui é
 * só o DESACOPLAMENTO entre quem produz (checkout) e quem consome (auditoria,
 * e-mail, provisionamento) — e isso se consegue com uma tabela de eventos e
 * este despachante interno, sem infraestrutura nova.
 *
 * O preço conhecido desse estilo é "difícil rastrear o fluxo completo de uma
 * operação". A contramedida está aqui: log estruturado por (evento, tratador,
 * resultado, tentativa) e `getQueueStatus()` para a fila ser observável.
 *
 * Garantia de entrega: PELO MENOS UMA VEZ. Ver a nota de idempotência em
 * `checkout-handlers/index.ts` — ela é contrato, não recomendação.
 */

/** Tentativas antes de declarar o evento morto (`failed`) e parar. */
export const DISPATCH_MAX_ATTEMPTS = 5;

/** Eventos lidos por varredura. Lote pequeno: a fila é rasa por natureza. */
export const DISPATCH_BATCH_SIZE = 50;

/** Espera da 1ª retentativa. Dobra a cada falha (30s, 1min, 2min, 4min…). */
export const DISPATCH_BACKOFF_BASE_MS = 30_000;

/** Teto do backoff — 1h. Sem teto, a 10ª tentativa cairia em dias. */
export const DISPATCH_BACKOFF_MAX_MS = 60 * 60 * 1000;

export type DispatchStatus = 'pending' | 'delivered' | 'failed' | 'skipped';

/** Resultado do despacho de UM evento. */
export interface EventDispatchOutcome {
  eventId: string;
  type: string;
  status: DispatchStatus;
  attempts: number;
  handlers: Array<{ name: string; ok: boolean; error?: string }>;
  nextAttemptAt: Date | null;
}

/** Resultado de UMA varredura. */
export interface DispatchSweepResult {
  processed: number;
  delivered: number;
  skipped: number;
  /** Falhou agora e vai voltar (ainda tem tentativa). */
  retrying: number;
  /** Estourou `DISPATCH_MAX_ATTEMPTS` e virou `failed`. */
  failed: number;
  outcomes: EventDispatchOutcome[];
}

/** Retrato da fila, para painel/healthcheck. */
export interface EventQueueStatus {
  pending: number;
  /** Pendentes já vencidos (`nextAttemptAt` nulo ou no passado). */
  due: number;
  delivered: number;
  failed: number;
  skipped: number;
  oldestPendingAt: Date | null;
  oldestPendingId: string | null;
  /** Idade do pendente mais antigo, em ms. `null` quando a fila está vazia. */
  oldestPendingAgeMs: number | null;
}

export interface DispatchOptions {
  /** Instante lógico da varredura. Injetável para teste de backoff. */
  now?: Date;
  batchSize?: number;
  maxAttempts?: number;
  /** Substitui o registro de tratadores (usado nos testes). */
  resolveHandlers?: (type: string) => CheckoutEventHandler[];
}

type EventWithSession = CheckoutEvent & { session: CheckoutSession };

/**
 * Espera antes da próxima tentativa: exponencial a partir de
 * `DISPATCH_BACKOFF_BASE_MS`, limitada por `DISPATCH_BACKOFF_MAX_MS`.
 * `attempts` é o número de tentativas JÁ feitas (>= 1).
 */
export function backoffMs(attempts: number): number {
  const exponent = Math.max(0, attempts - 1);
  const delay = DISPATCH_BACKOFF_BASE_MS * 2 ** exponent;
  return Math.min(delay, DISPATCH_BACKOFF_MAX_MS);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return String(err);
  } catch {
    return 'erro desconhecido';
  }
}

/** Log estruturado — uma linha JSON por (evento, tratador) e uma por evento. */
function log(payload: Record<string, unknown>): void {
  try {
    console.log(`[event-dispatch] ${JSON.stringify(payload)}`);
  } catch {
    console.log('[event-dispatch] (payload não serializável)', payload);
  }
}

export class EventDispatcherService {
  /**
   * Lê os `CheckoutEvent` pendentes e vencidos, na ordem em que aconteceram, e
   * entrega cada um aos tratadores do seu tipo.
   *
   * Nenhuma exceção de tratador escapa daqui: um tratador que quebra não derruba
   * os outros tratadores do mesmo evento, e um evento que quebra não derruba o
   * lote.
   */
  async dispatchPending(options: DispatchOptions = {}): Promise<DispatchSweepResult> {
    const now = options.now ?? new Date();
    const batchSize = options.batchSize ?? DISPATCH_BATCH_SIZE;
    const resolve = options.resolveHandlers ?? getHandlersFor;

    const events = (await prisma.checkoutEvent.findMany({
      where: {
        dispatchStatus: 'pending',
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      include: { session: true },
      // Ordem de acontecimento: um `submit` nunca é entregue antes do
      // `identify` da mesma sessão.
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    })) as EventWithSession[];

    const result: DispatchSweepResult = {
      processed: 0,
      delivered: 0,
      skipped: 0,
      retrying: 0,
      failed: 0,
      outcomes: [],
    };

    for (const event of events) {
      let outcome: EventDispatchOutcome;
      try {
        outcome = await this.dispatchOne(event, { ...options, now, resolveHandlers: resolve });
      } catch (err) {
        // Cinto de segurança: nem uma falha de INFRA (banco fora no meio do
        // lote) pode interromper a varredura. O evento continua `pending` e
        // volta na próxima.
        const message = errorMessage(err);
        log({ eventId: event.id, type: event.type, result: 'error', scope: 'dispatcher', error: message });
        outcome = {
          eventId: event.id,
          type: event.type,
          status: 'pending',
          attempts: event.dispatchAttempts,
          handlers: [],
          nextAttemptAt: event.nextAttemptAt,
        };
      }

      result.processed += 1;
      result.outcomes.push(outcome);

      if (outcome.status === 'delivered') result.delivered += 1;
      else if (outcome.status === 'skipped') result.skipped += 1;
      else if (outcome.status === 'failed') result.failed += 1;
      else result.retrying += 1;
    }

    return result;
  }

  /** Entrega um evento já carregado (com a sessão). Nunca lança. */
  async dispatchOne(
    event: EventWithSession,
    options: DispatchOptions = {}
  ): Promise<EventDispatchOutcome> {
    const now = options.now ?? new Date();
    const maxAttempts = options.maxAttempts ?? DISPATCH_MAX_ATTEMPTS;
    const resolve = options.resolveHandlers ?? getHandlersFor;

    const handlers = resolve(event.type);

    // Ninguém escuta este tipo. Isso NÃO é erro — é telemetria de funil sem
    // consumidor. `skipped` deixa o evento fora da fila sem poluir a lista de
    // falhas (que precisa continuar significando "algo quebrou").
    if (handlers.length === 0) {
      await this.persist(event.id, {
        dispatchStatus: 'skipped',
        dispatchedAt: now,
        nextAttemptAt: null,
        lastDispatchError: null,
      });

      const outcome: EventDispatchOutcome = {
        eventId: event.id,
        type: event.type,
        status: 'skipped',
        attempts: event.dispatchAttempts,
        handlers: [],
        nextAttemptAt: null,
      };
      log({ eventId: event.id, type: event.type, result: 'skipped', reason: 'no_handler' });
      return outcome;
    }

    const attempt = event.dispatchAttempts + 1;
    const metadata = parseMetadata(event.metadata);
    const results: EventDispatchOutcome['handlers'] = [];

    for (const handler of handlers) {
      try {
        await handler.handle({ event, session: event.session, metadata, now });
        results.push({ name: handler.name, ok: true });
        log({
          eventId: event.id,
          sessionId: event.sessionId,
          type: event.type,
          handler: handler.name,
          attempt,
          result: 'ok',
        });
      } catch (err) {
        // Isolamento: o próximo tratador do mesmo evento ainda roda.
        const message = errorMessage(err);
        results.push({ name: handler.name, ok: false, error: message });
        log({
          eventId: event.id,
          sessionId: event.sessionId,
          type: event.type,
          handler: handler.name,
          attempt,
          result: 'error',
          error: message,
        });
      }
    }

    const failures = results.filter((r) => !r.ok);

    if (failures.length === 0) {
      await this.persist(event.id, {
        dispatchStatus: 'delivered',
        dispatchAttempts: attempt,
        dispatchedAt: now,
        nextAttemptAt: null,
        lastDispatchError: null,
      });

      log({
        eventId: event.id,
        sessionId: event.sessionId,
        type: event.type,
        attempt,
        result: 'delivered',
        handlers: results.length,
      });

      return {
        eventId: event.id,
        type: event.type,
        status: 'delivered',
        attempts: attempt,
        handlers: results,
        nextAttemptAt: null,
      };
    }

    const lastDispatchError = failures.map((f) => `${f.name}: ${f.error}`).join(' | ').slice(0, 1000);
    const exhausted = attempt >= maxAttempts;
    const nextAttemptAt = exhausted ? null : new Date(now.getTime() + backoffMs(attempt));

    await this.persist(event.id, {
      // Evento morto fica `failed` e PARA. Ficar girando para sempre esconde
      // o problema; `failed` é visível em `getQueueStatus()`.
      dispatchStatus: exhausted ? 'failed' : 'pending',
      dispatchAttempts: attempt,
      nextAttemptAt,
      lastDispatchError,
      dispatchedAt: exhausted ? now : null,
    });

    log({
      eventId: event.id,
      sessionId: event.sessionId,
      type: event.type,
      attempt,
      maxAttempts,
      result: exhausted ? 'failed' : 'retry',
      nextAttemptAt: nextAttemptAt?.toISOString() ?? null,
      error: lastDispatchError,
    });

    return {
      eventId: event.id,
      type: event.type,
      status: exhausted ? 'failed' : 'pending',
      attempts: attempt,
      handlers: results,
      nextAttemptAt,
    };
  }

  /**
   * Grava o resultado do despacho. Tolera o evento ter sumido entre a leitura
   * do lote e a gravação (`P2025`) — a sessão pode ter sido apagada em
   * cascade nesse meio-tempo, e isso não é motivo para derrubar a varredura.
   */
  private async persist(eventId: string, data: Prisma.CheckoutEventUpdateInput): Promise<boolean> {
    try {
      await prisma.checkoutEvent.update({ where: { id: eventId }, data });
      return true;
    } catch (err) {
      if ((err as { code?: string }).code === 'P2025') {
        log({ eventId, result: 'vanished', reason: 'evento apagado durante o despacho' });
        return false;
      }
      throw err;
    }
  }

  /**
   * Estado da fila. Existe para o buraco conhecido de arquitetura orientada a
   * eventos — sem isto, um evento morto é invisível até alguém reclamar.
   */
  async getQueueStatus(now: Date = new Date()): Promise<EventQueueStatus> {
    const [grouped, due, oldest] = await Promise.all([
      prisma.checkoutEvent.groupBy({ by: ['dispatchStatus'], _count: { _all: true } }),
      prisma.checkoutEvent.count({
        where: {
          dispatchStatus: 'pending',
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        },
      }),
      prisma.checkoutEvent.findFirst({
        where: { dispatchStatus: 'pending' },
        orderBy: { createdAt: 'asc' },
        select: { id: true, createdAt: true },
      }),
    ]);

    const count = (status: DispatchStatus): number =>
      grouped.find((g) => g.dispatchStatus === status)?._count._all ?? 0;

    return {
      pending: count('pending'),
      due,
      delivered: count('delivered'),
      failed: count('failed'),
      skipped: count('skipped'),
      oldestPendingAt: oldest?.createdAt ?? null,
      oldestPendingId: oldest?.id ?? null,
      oldestPendingAgeMs: oldest ? now.getTime() - oldest.createdAt.getTime() : null,
    };
  }

  /**
   * Devolve um evento `failed` para a fila (`pending`, tentativas zeradas).
   * Reprocessamento manual depois de corrigir a causa — sem isso, evento morto
   * só sairia do lugar com SQL na mão.
   */
  async retryFailed(eventId: string): Promise<boolean> {
    const event = await prisma.checkoutEvent.findUnique({
      where: { id: eventId },
      select: { id: true, dispatchStatus: true },
    });
    if (!event || event.dispatchStatus !== 'failed') return false;

    await prisma.checkoutEvent.update({
      where: { id: eventId },
      data: {
        dispatchStatus: 'pending',
        dispatchAttempts: 0,
        nextAttemptAt: null,
        dispatchedAt: null,
        lastDispatchError: null,
      },
    });

    log({ eventId, result: 'requeued' });
    return true;
  }
}

export const eventDispatcherService = new EventDispatcherService();
