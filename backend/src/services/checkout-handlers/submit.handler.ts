import nodemailer from 'nodemailer';

import prisma from '../../lib/prisma';
import { settingsService } from '../settings.service';
import type { CheckoutEventContext, CheckoutEventHandler } from './index';
import { auditOnce } from './shared';

/** Ação de auditoria gravada quando alguém conclui o checkout. */
export const SUBMIT_AUDIT_ACTION = 'checkout.submit.pending_fulfillment';

/**
 * Tratador do evento `submit` — a pessoa concluiu o checkout.
 *
 * O QUE ELE **NÃO** FAZ, DE PROPÓSITO: não cria `Organization`, `User` nem
 * `Subscription`. `submitSession()` deixa a sessão em `payment_pending` e não
 * cobra nada, porque não há gateway. Provisionar conta paga aqui entregaria de
 * graça exatamente o que deveria ser cobrado — o provisionamento é do tratador
 * de `paid` (ver `paid.handler.ts`), disparado pelo webhook do gateway quando
 * ele existir.
 *
 * O que ele faz:
 *   1. registra em `AuditLog` que existe uma contratação aguardando atendimento
 *      humano (idempotente por `eventId`);
 *   2. avisa os `master` da plataforma por e-mail, de forma NÃO BLOQUEANTE.
 *
 * Sobre o e-mail: `email.service` não tem função para este aviso e aquele
 * arquivo pertence a outra frente de trabalho, então o envio é montado aqui
 * (mesmo compromisso que `signup.service` já assumiu). Ele é *fire-and-forget*:
 * falha de SMTP não falha o evento, porque o efeito durável e auditável é o
 * `AuditLog`, e reentregar o evento por causa de SMTP só produziria e-mail
 * repetido. Nada é prometido ao cliente aqui — o checkout já disse a ele que o
 * time comercial entra em contato, e essa promessa é cumprida por gente.
 */
export const submitHandler: CheckoutEventHandler = {
  name: 'submit.notify-master',

  async handle({ event, session, metadata }: CheckoutEventContext): Promise<void> {
    const amountCents =
      typeof metadata.amountCents === 'number' ? metadata.amountCents : session.amountCents;

    const wrote = await auditOnce({
      eventId: event.id,
      action: SUBMIT_AUDIT_ACTION,
      organizationId: session.organizationId,
      metadata: {
        sessionId: session.id,
        planCode: session.planCode,
        screens: session.screens,
        amountCents,
        status: session.status,
        // Contato do lead: é o dado que o atendimento precisa para fechar.
        name: session.name,
        email: session.email,
        phone: session.phone,
        companyName: session.companyName,
        charged: false,
        nextStep: 'contato-comercial',
      },
    });

    // Reentrega: a auditoria já existia, então o aviso já saiu. Não reenviar.
    if (!wrote) return;

    void notifyMasters(session).catch((err: unknown) => {
      console.warn(
        '[checkout-handlers/submit] falha ao avisar o master por e-mail (auditoria registrada):',
        err instanceof Error ? err.message : err
      );
    });
  },
};

/** Avisa todos os usuários `master` de que há uma contratação a atender. */
async function notifyMasters(session: {
  id: string;
  planCode: string | null;
  screens: number;
  amountCents: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
}): Promise<void> {
  const smtp = await settingsService.getSmtpConfig();
  if (!smtp) return;

  const masters = await prisma.user.findMany({
    where: { role: 'master' },
    select: { email: true },
  });
  const recipients = [...new Set(masters.map((m) => m.email).filter(Boolean))];
  if (recipients.length === 0) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const amount = (session.amountCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  await transporter.sendMail({
    from: `"TelaHub" <${smtp.user}>`,
    to: recipients.join(', '),
    subject: `🛒 Nova contratação aguardando atendimento — ${session.companyName || session.name || 'lead'}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="margin:0 0 12px;">Contratação concluída no checkout</h2>
        <p style="line-height:1.7;color:#334155;">
          Nenhuma cobrança foi feita — não há gateway integrado. Esta contratação depende de
          atendimento comercial para ser concluída.
        </p>
        <ul style="line-height:1.9;color:#334155;">
          <li><strong>Empresa:</strong> ${escapeHtml(session.companyName) || '—'}</li>
          <li><strong>Contato:</strong> ${escapeHtml(session.name) || '—'}</li>
          <li><strong>E-mail:</strong> ${escapeHtml(session.email) || '—'}</li>
          <li><strong>Telefone:</strong> ${escapeHtml(session.phone) || '—'}</li>
          <li><strong>Plano:</strong> ${escapeHtml(session.planCode) || '—'} · ${session.screens} tela(s)</li>
          <li><strong>Valor mensal estimado:</strong> ${amount}</li>
          <li><strong>Sessão:</strong> ${session.id}</li>
        </ul>
      </div>
    `.trim(),
  });
}

function escapeHtml(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
