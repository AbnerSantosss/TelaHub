/**
 * Trava de ENVIO de e-mail (2026-09-18, INF-18).
 *
 * O SMTP configurado no ambiente de desenvolvimento é REAL e a base de dev tem
 * endereços reais de clientes. Qualquer job ligado localmente (automação de
 * cobrança, campanha agendada, alerta de TV offline) mandava e-mail de verdade
 * para gente de verdade a partir de um notebook.
 *
 * `EMAIL_DISPATCH_ENABLED`:
 * - não definida → liga SÓ com `NODE_ENV=production`;
 * - `true`/`1`/`sim`/`on` → liga;
 * - qualquer outro valor → desliga.
 *
 * Desligada, nada sai: a fila deixa as mensagens `queued` (não marca como
 * enviadas nem como falha) e o transporte recusa `sendMail` com
 * `EmailDispatchDisabledError`. Verificar a conexão SMTP (`verify`) continua
 * funcionando — não envia nada.
 */

export function isEmailDispatchEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = (env.EMAIL_DISPATCH_ENABLED ?? '').trim().toLowerCase();
  if (raw === '') return env.NODE_ENV === 'production';
  return ['1', 'true', 'yes', 'sim', 'on'].includes(raw);
}

export class EmailDispatchDisabledError extends Error {
  readonly code = 'email_dispatch_disabled';
  constructor() {
    super(
      'Envio de e-mail desligado neste ambiente (EMAIL_DISPATCH_ENABLED). ' +
        'A mensagem continua na fila.',
    );
    this.name = 'EmailDispatchDisabledError';
  }
}

let warned = false;

/** Avisa uma vez por processo — a varredura roda a cada 15 s. */
export function warnEmailDispatchDisabledOnce(): void {
  if (warned) return;
  warned = true;
  console.warn(
    '[email] Envio DESLIGADO (EMAIL_DISPATCH_ENABLED ausente fora de produção ou = false). ' +
      'Mensagens ficam na fila como "queued".',
  );
}
