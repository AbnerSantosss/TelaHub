import {
  DISPATCH_BATCH_SIZE,
  DISPATCH_MAX_ATTEMPTS,
  eventDispatcherService,
} from '../services/event-dispatcher.service';
import type { DispatchSweepResult, EventQueueStatus } from '../services/event-dispatcher.service';

/**
 * Job do despachante do outbox de checkout: lê os `CheckoutEvent` pendentes e
 * entrega aos tratadores registrados em `services/checkout-handlers`.
 *
 * Reexporta as constantes para o job, os scripts e o painel dependerem de um
 * lugar só.
 */
export { DISPATCH_MAX_ATTEMPTS, DISPATCH_BATCH_SIZE };

/**
 * Intervalo entre varreduras. 15s: o `submit` gera aviso ao master, e meio
 * minuto de atraso para avisar de uma contratação é aceitável; menos que isso
 * seria polling à toa numa fila que quase sempre está vazia.
 */
export const EVENT_DISPATCH_INTERVAL_MS = 15_000;

/**
 * Uma varredura completa. Exportada para poder ser chamada de um script ou de
 * um teste, sem o timer:
 * `npx tsx -e "import('./src/jobs/event-dispatch.job').then(m => m.runEventDispatchSweep()).then(console.log)"`
 */
export async function runEventDispatchSweep(now: Date = new Date()): Promise<DispatchSweepResult> {
  return eventDispatcherService.dispatchPending({ now });
}

/**
 * Retrato da fila (pendentes, vencidos, falhados, mais antigo pendente), para
 * expor num painel ou checar na mão:
 * `npx tsx -e "import('./src/jobs/event-dispatch.job').then(m => m.getEventQueueStatus()).then(console.log)"`
 */
export async function getEventQueueStatus(now: Date = new Date()): Promise<EventQueueStatus> {
  return eventDispatcherService.getQueueStatus(now);
}

/**
 * Sobe o timer. NÃO deve ser chamado em `NODE_ENV=test` — a chamada é guardada
 * em `server.ts`, e aqui há uma segunda trava para o caso de um import
 * acidental num teste.
 */
export function startEventDispatchJob(): NodeJS.Timeout | null {
  if (process.env.NODE_ENV === 'test') return null;

  let running = false;

  return setInterval(() => {
    // Trava simples: uma varredura lenta não pode se sobrepor à seguinte e
    // entregar o mesmo evento duas vezes em paralelo.
    if (running) return;
    running = true;

    runEventDispatchSweep()
      .catch((err) => {
        console.error('Erro no job de despacho de eventos do checkout:', err);
      })
      .finally(() => {
        running = false;
      });
  }, EVENT_DISPATCH_INTERVAL_MS);
}
