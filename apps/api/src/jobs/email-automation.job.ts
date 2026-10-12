import { emailAutomationService } from '../services/email-automation.service';
import type { AutomationSweepResult } from '../services/email-automation.service';
import { emailCampaignService } from '../services/email-campaign.service';

/**
 * Job das automações de ciclo de vida (vencimento, inadimplência,
 * não-renovação, boas-vindas, inatividade) e do disparo das campanhas
 * agendadas.
 *
 * O tique é de HORA em hora, mas a varredura de automações é DIÁRIA: o tique
 * curto existe para as campanhas agendadas (que têm hora marcada) e para o
 * processo se recuperar sozinho de um reinício — se o servidor tiver caído
 * exatamente no horário da varredura, o próximo tique do mesmo dia a executa,
 * em vez de a base ficar 24 horas sem aviso nenhum.
 */
export const EMAIL_AUTOMATION_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Hora (UTC) da varredura diária. 09:00 UTC = 06:00 em Brasília.
 *
 * O plano do backoffice dizia "03:00", pensando no horário de menor carga. Mas
 * o número no plano é hora LOCAL, e o contêiner roda em UTC: agendar `hora === 3`
 * aqui mandaria todo aviso de vencimento à meia-noite no Brasil — horário em que
 * e-mail comercial parece spam e é o que os filtros de reputação penalizam. A
 * carga não é problema: são umas poucas consultas indexadas.
 */
export const EMAIL_AUTOMATION_HOUR_UTC = 9;

/**
 * Dia (UTC) da última varredura concluída, no formato `YYYY-MM-DD`.
 *
 * Guarda EM MEMÓRIA de propósito: a garantia de "não mandar duas vezes" NÃO
 * mora aqui — mora no `dedupeKey` de cada mensagem, que sobrevive a reinício,
 * deploy e execução manual. Esta variável só evita repetir consultas no mesmo
 * dia; se o processo reiniciar, a varredura roda de novo e o dedupe silencia as
 * mensagens já enfileiradas. Persistir isto num `Setting` daria a impressão de
 * ser a proteção real e esconderia a de verdade.
 */
let lastSweepDay: string | null = null;

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Uma varredura completa, sem timer e sem checagem de horário. Para script ou
 * teste:
 * `npx tsx -e "import('./src/jobs/email-automation.job').then(m => m.runEmailAutomationSweep()).then(console.log)"`
 */
export async function runEmailAutomationSweep(
  now: Date = new Date()
): Promise<AutomationSweepResult> {
  return emailAutomationService.run(now);
}

/** Um tique: campanhas agendadas sempre; automações uma vez por dia. */
export async function runEmailAutomationTick(now: Date = new Date()): Promise<{
  campaigns: number;
  automations: AutomationSweepResult | null;
}> {
  const { dispatched } = await emailCampaignService.runScheduled(now);

  const today = utcDayKey(now);
  if (lastSweepDay === today || now.getUTCHours() < EMAIL_AUTOMATION_HOUR_UTC) {
    return { campaigns: dispatched, automations: null };
  }

  // Marca ANTES de rodar: se a varredura demorar mais que o intervalo do timer,
  // o tique seguinte não pode começar uma segunda em paralelo.
  lastSweepDay = today;
  try {
    return { campaigns: dispatched, automations: await runEmailAutomationSweep(now) };
  } catch (err) {
    // Falhou: libera o dia para o próximo tique tentar de novo. Sem isto, um
    // erro transitório às 9h custaria o dia inteiro de avisos.
    lastSweepDay = null;
    throw err;
  }
}

/**
 * Sobe o timer. NÃO deve rodar em `NODE_ENV=test` — a chamada é guardada em
 * `server.ts`, e aqui há uma segunda trava para o caso de um import acidental.
 */
export function startEmailAutomationJob(): NodeJS.Timeout | null {
  if (process.env.NODE_ENV === 'test') return null;

  // Semeia as automações (desabilitadas) já na subida, para a tela do
  // backoffice não aparecer vazia até o primeiro tique — que só viria uma hora
  // depois do deploy.
  void emailAutomationService.seedDefaults().catch((err: unknown) => {
    console.error('Erro ao semear as automações de e-mail:', err);
  });

  let running = false;

  return setInterval(() => {
    if (running) return;
    running = true;

    runEmailAutomationTick()
      .catch((err) => {
        console.error('Erro no job de automações de e-mail:', err);
      })
      .finally(() => {
        running = false;
      });
  }, EMAIL_AUTOMATION_INTERVAL_MS);
}
