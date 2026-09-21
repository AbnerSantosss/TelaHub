import {
  EMAIL_BATCH_SIZE,
  EMAIL_MAX_ATTEMPTS,
  emailQueueService,
} from '../services/email-queue.service';
import type { EmailQueueStatus, EmailSweepResult } from '../services/email-queue.service';

/**
 * Job da fila de e-mail: lê os `EmailMessage` com `status: 'queued'` já vencidos
 * e entrega ao provedor SMTP configurado.
 *
 * Reexporta as constantes para o job, os scripts e o painel dependerem de um
 * lugar só.
 */
export { EMAIL_MAX_ATTEMPTS, EMAIL_BATCH_SIZE };

/**
 * Intervalo entre varreduras. 15s, o mesmo do despachante de eventos: a fila
 * carrega redefinição de senha, e a pessoa está parada na tela de login
 * esperando o e-mail chegar. Menos que isso seria polling à toa numa fila que
 * quase sempre está vazia; mais que isso apareceria como "o site não manda o
 * e-mail de senha".
 */
export const EMAIL_DISPATCH_INTERVAL_MS = 15_000;

/**
 * Uma varredura completa. Exportada para poder ser chamada de um script ou de
 * um teste, sem o timer:
 * `npx tsx -e "import('./src/jobs/email-dispatch.job').then(m => m.runEmailDispatchSweep()).then(console.log)"`
 */
export async function runEmailDispatchSweep(now: Date = new Date()): Promise<EmailSweepResult> {
  return emailQueueService.dispatchPending({ now });
}

/**
 * Retrato da fila (enfileirados, vencidos, falhados, mais antigo), para o
 * backoffice ou para checar na mão quando um cliente disser "não recebi".
 */
export async function getEmailQueueStatus(now: Date = new Date()): Promise<EmailQueueStatus> {
  return emailQueueService.getQueueStatus(now);
}

/**
 * Sobe o timer. NÃO deve rodar em `NODE_ENV=test` — a chamada é guardada em
 * `server.ts`, e aqui há uma segunda trava para o caso de um import acidental
 * num teste (um teste que enfileirasse uma mensagem veria o job enviá-la de
 * verdade).
 */
export function startEmailDispatchJob(): NodeJS.Timeout | null {
  if (process.env.NODE_ENV === 'test') return null;

  let running = false;

  return setInterval(() => {
    // Trava do timer, além da que existe dentro do serviço: um lote de 50
    // envios SMTP passa dos 15s com facilidade, e duas varreduras concorrentes
    // pegariam as mesmas mensagens ainda `queued` — o cliente receberia o mesmo
    // e-mail duas vezes.
    if (running) return;
    running = true;

    runEmailDispatchSweep()
      .catch((err) => {
        console.error('Erro no job de despacho de e-mail:', err);
      })
      .finally(() => {
        running = false;
      });
  }, EMAIL_DISPATCH_INTERVAL_MS);
}
