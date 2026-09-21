import { subscriptionService } from '../services/subscription.service';

/**
 * Manutenção diária das assinaturas.
 *
 * POR QUE EXISTE: `runBillingMaintenance()` foi escrita junto com o gateway, mas
 * ninguém a chamava. O efeito de não chamar não é um erro visível — é um
 * vazamento silencioso de receita nos dois sentidos:
 *
 *  1. quem **pediu cancelamento** continuaria `active` para sempre depois do fim
 *     do ciclo pago, aparecendo como cliente ativo no MRR que ninguém mais paga;
 *  2. quem **parou de pagar** ficaria em `past_due` indefinidamente, com acesso
 *     completo ao produto, porque nada faz a carência expirar.
 *
 * O segundo é o caro: sem este job, cancelar o cartão é um jeito de usar o
 * TelaHub de graça, para sempre, sem nunca aparecer numa lista de inadimplentes.
 *
 * INTERVALO: 6 horas, não 24. A rotina é idempotente (os próprios filtros
 * excluem quem já foi tratado), então rodar quatro vezes por dia não muda o
 * resultado — e encurta a janela em que um reinício do processo faz a varredura
 * do dia ser pulada. Um intervalo de 24 h com reinícios frequentes pode passar
 * dias sem executar sem que ninguém perceba.
 *
 * NÃO usa cron nem agendador externo de propósito: o produto roda num container
 * só, e uma dependência a mais de infraestrutura para duas linhas de `updateMany`
 * seria mais peça para manter do que problema resolvido.
 */

/** Intervalo entre varreduras. Ver comentário acima sobre 6 h em vez de 24 h. */
export const BILLING_MAINTENANCE_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Atraso da primeira execução após o boot, para não competir com a subida. */
const FIRST_RUN_DELAY_MS = 60 * 1000;

export interface BillingMaintenanceResult {
  scheduledCanceled: number;
  graceExpired: number;
}

/**
 * Uma varredura. Exportada para rodar sob demanda, sem o timer:
 * `npx tsx -e "import('./src/jobs/billing-maintenance.job').then(m => m.runBillingMaintenanceSweep()).then(console.log)"`
 */
export async function runBillingMaintenanceSweep(now: Date = new Date()): Promise<BillingMaintenanceResult> {
  const result = await subscriptionService.runBillingMaintenance(now);

  // Só registra quando algo mudou: um log a cada 6 h dizendo "0 e 0" treina
  // quem opera a ignorar a linha, e aí o dia em que ela diz 40 passa batido.
  if (result.scheduledCanceled > 0 || result.graceExpired > 0) {
    console.log(
      `[billing] manutenção: ${result.scheduledCanceled} cancelamento(s) agendado(s) efetivado(s), ` +
        `${result.graceExpired} assinatura(s) encerrada(s) por fim de carência.`
    );
  }

  return result;
}

export function startBillingMaintenanceJob(): NodeJS.Timeout {
  // Uma passada logo após o boot pega o que venceu enquanto o processo estava
  // fora do ar — sem isso, um reinício no fim do mês adiaria por 6 h o
  // encerramento de todo mundo que venceu naquele intervalo.
  setTimeout(() => {
    runBillingMaintenanceSweep().catch((err) => {
      console.error('Erro na manutenção de cobrança (execução inicial):', err);
    });
  }, FIRST_RUN_DELAY_MS).unref?.();

  return setInterval(() => {
    runBillingMaintenanceSweep().catch((err) => {
      // Nunca deixar escapar: uma rejeição não capturada aqui derrubaria o
      // processo inteiro da API por causa de uma varredura de cobrança.
      console.error('Erro na manutenção de cobrança:', err);
    });
  }, BILLING_MAINTENANCE_INTERVAL_MS);
}
