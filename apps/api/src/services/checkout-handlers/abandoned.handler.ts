import type { CheckoutEventContext, CheckoutEventHandler } from './index';
import { auditOnce } from './shared';

/** Ação de auditoria do abandono de checkout. */
export const ABANDONED_AUDIT_ACTION = 'checkout.abandoned';

/**
 * Tratador do evento `abandoned` — a sessão ficou em silêncio além do limite e
 * o job de abandono a marcou.
 *
 * Só registra em `AuditLog`, para o funil ter rastro fora da tabela de sessões
 * (que é purgada por LGPD): o passo em que parou e o valor parado sobrevivem à
 * anonimização e continuam alimentando a leitura do funil.
 *
 * NÃO dispara e-mail de recuperação. Não existe integração de disparo
 * automático neste produto, e registrar/prometer um envio que não acontece já
 * foi problema aqui — a recuperação é feita por gente e registrada por
 * `checkoutService.registerRecovery()`.
 */
export const abandonedHandler: CheckoutEventHandler = {
  name: 'abandoned.audit',

  async handle({ event, session, metadata }: CheckoutEventContext): Promise<void> {
    await auditOnce({
      eventId: event.id,
      action: ABANDONED_AUDIT_ACTION,
      organizationId: session.organizationId,
      metadata: {
        sessionId: session.id,
        // `step` e `fromStatus` vêm do metadado do evento: o `status` da sessão
        // já é `abandoned` e perdeu a informação de onde ela parou.
        step: metadata.step ?? null,
        fromStatus: metadata.fromStatus ?? null,
        planCode: session.planCode,
        screens: session.screens,
        amountCents:
          typeof metadata.amountCents === 'number' ? metadata.amountCents : session.amountCents,
        utmSource: session.utmSource,
        utmCampaign: session.utmCampaign,
        emailNotified: false,
      },
    });
  },
};
