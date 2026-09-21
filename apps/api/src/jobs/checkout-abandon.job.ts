import { ABANDON_AFTER_MS, checkoutService } from '../services/checkout.service';

/**
 * Limite de silêncio para considerar um checkout abandonado (30 min). Reexportado
 * daqui para o job e para scripts poderem depender de uma constante só.
 */
export { ABANDON_AFTER_MS };

/** Intervalo entre varreduras. Menor que o limite de abandono, para o painel não atrasar. */
export const CHECKOUT_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

export interface CheckoutSweepResult {
  abandoned: number;
  expired: number;
  anonymized: number;
}

/**
 * Uma varredura do funil, na ordem que importa:
 *
 *  1. abandono  — sessões em andamento sem atividade há mais de `ABANDON_AFTER_MS`;
 *  2. expiração — sessões que passaram de `expiresAt` (inclui as abandonadas);
 *  3. purga     — anonimização dos dados pessoais das vencidas que não converteram.
 *
 * Exportada para poder ser chamada de um script (`tsx -e`) ou de um teste, sem
 * precisar do timer.
 */
export async function runCheckoutSweep(now: Date = new Date()): Promise<CheckoutSweepResult> {
  const abandoned = await checkoutService.markAbandonedSessions(now);
  const expired = await checkoutService.markExpiredSessions(now);
  // A purga vem DEPOIS da expiração no mesmo ciclo: sessão que acabou de vencer
  // já sai deste ciclo sem dado pessoal, e não fica um intervalo inteiro
  // guardando lead vencido.
  const anonymized = await checkoutService.anonymizeExpiredLeads(now);

  return { abandoned, expired, anonymized };
}

/**
 * Purga LGPD isolada, para rodar sob demanda:
 * `npx tsx -e "import('./src/jobs/checkout-abandon.job').then(m => m.purgeCheckoutLeadData()).then(console.log)"`
 */
export async function purgeCheckoutLeadData(now: Date = new Date()): Promise<number> {
  await checkoutService.markExpiredSessions(now);
  return checkoutService.anonymizeExpiredLeads(now);
}

export function startCheckoutAbandonJob(): NodeJS.Timeout {
  return setInterval(() => {
    runCheckoutSweep().catch((err) => {
      console.error('Erro no job de abandono de checkout:', err);
    });
  }, CHECKOUT_SWEEP_INTERVAL_MS);
}
