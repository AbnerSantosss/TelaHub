import crypto from 'crypto';

import prisma from '../../lib/prisma';
import { hashPassword } from '../auth.service';
import { planService } from '../plan.service';
import { sendInviteEmail } from '../email.service';
import type { CheckoutEventContext, CheckoutEventHandler } from './index';
import { auditOnce } from './shared';

/** Ações de auditoria do provisionamento pós-pagamento. */
export const PAID_AUDIT_ACTION = 'checkout.paid.provisioned';
export const PAID_AUDIT_ACTION_ALREADY = 'checkout.paid.already_provisioned';

/**
 * Tratador do evento `paid`.
 *
 * ⚠️ HOJE NINGUÉM EMITE ESTE EVENTO. Não há gateway de pagamento integrado:
 * `checkoutService.submitSession()` termina em `payment_pending` e para ali.
 * Este tratador é o PONTO DE CHEGADA do fluxo de pagamento — é aqui que o
 * provisionamento da conta acontece, e em nenhum outro lugar.
 *
 * TODO(gateway): casa com o TODO de `src/routes/billing.routes.ts` e com o de
 * `checkout.service.ts::submitSession`. Quando o gateway existir:
 *   1. `POST /api/billing/webhook` (rota nova, SEM authMiddleware, COM
 *      validação da assinatura do provedor) recebe a confirmação;
 *   2. a rota, numa única transação, marca a sessão `paid` + `paidAt` e GRAVA o
 *      `CheckoutEvent { type: 'paid' }` — nunca chama este tratador direto: é o
 *      outbox que garante que "pagou" e "provisionou" não se separem;
 *   3. o despachante lê o evento e chama este tratador, que cria
 *      Organization → User → Subscription, nessa ordem;
 *   4. reembolso/chargeback vira um evento próprio que reverte a assinatura.
 *
 * IDEMPOTÊNCIA (o webhook do gateway reentrega por projeto, e o despachante
 * também): cada passo verifica antes de criar.
 *   - sessão já com `organizationId` → nada a fazer;
 *   - e-mail já pertence a um usuário → reaproveita a organização dele em vez
 *     de criar uma segunda conta para a mesma pessoa;
 *   - assinatura já existente na organização → não cria outra.
 * O resultado é o mesmo rodando 1 ou N vezes.
 */
export const paidHandler: CheckoutEventHandler = {
  name: 'paid.provision-account',

  async handle({ event, session }: CheckoutEventContext): Promise<void> {
    // Releitura: entre a gravação do evento e o despacho o estado pode ter
    // mudado (inclusive por uma entrega anterior deste mesmo evento).
    const current = await prisma.checkoutSession.findUnique({ where: { id: session.id } });
    if (!current) return;

    if (current.organizationId) {
      await auditOnce({
        eventId: event.id,
        action: PAID_AUDIT_ACTION_ALREADY,
        organizationId: current.organizationId,
        metadata: { sessionId: current.id, reason: 'session_already_linked' },
      });
      return;
    }

    if (!current.planCode || !current.email || !current.name) {
      // Pagamento sem dados mínimos é inconsistência de dados, não falha
      // transitória: retentar não conserta. Fica auditado e o evento é
      // entregue, para não ficar girando na fila até morrer.
      await auditOnce({
        eventId: event.id,
        action: PAID_AUDIT_ACTION_ALREADY,
        organizationId: null,
        metadata: { sessionId: current.id, reason: 'incomplete_session' },
      });
      return;
    }

    const email = current.email.trim().toLowerCase();
    const plan = await planService.getByCode(current.planCode);
    if (!plan || !plan.active) {
      // Transitório o bastante para valer retentativa (o catálogo pode ser
      // corrigido): deixa o evento falhar e voltar depois.
      throw new Error(
        `Plano "${current.planCode}" indisponível — não é possível provisionar a sessão ${current.id}.`
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, organizationId: true },
    });

    // Já existe conta para este e-mail: não se cria uma segunda. Vincula a
    // sessão e garante que a assinatura reflita o plano contratado.
    if (existingUser?.organizationId) {
      await ensureSubscription(existingUser.organizationId, plan.id);
      await prisma.checkoutSession.update({
        where: { id: current.id },
        data: { organizationId: existingUser.organizationId },
      });
      await auditOnce({
        eventId: event.id,
        action: PAID_AUDIT_ACTION,
        organizationId: existingUser.organizationId,
        metadata: {
          sessionId: current.id,
          planCode: current.planCode,
          screens: current.screens,
          amountCents: current.amountCents,
          reusedExistingAccount: true,
        },
      });
      return;
    }

    // Senha aleatória: quem pagou não escolheu senha no checkout. Ela vai por
    // e-mail de convite (o mesmo do fluxo de convite do painel), fora da
    // transação e sem bloquear o provisionamento.
    const tempPassword = crypto.randomBytes(9).toString('base64url');
    const passwordHash = await hashPassword(tempPassword);

    const created = await prisma.$transaction(async (tx) => {
      // 1. Organização.
      const organization = await tx.organization.create({
        data: { name: current.companyName?.trim() || current.name!.trim() },
      });

      // 2. Usuário admin da organização.
      const username = await deriveUsername(email, tx);
      const user = await tx.user.create({
        data: {
          username,
          name: current.name!.trim(),
          email,
          password: passwordHash,
          role: 'admin',
          organizationId: organization.id,
        },
      });

      // 3. Assinatura do plano efetivamente contratado (e pago).
      await tx.subscription.create({
        data: { organizationId: organization.id, planId: plan.id, status: 'active', trialEndsAt: null },
      });

      await tx.checkoutSession.update({
        where: { id: current.id },
        data: { organizationId: organization.id },
      });

      return { organization, user };
    });

    await auditOnce({
      eventId: event.id,
      action: PAID_AUDIT_ACTION,
      organizationId: created.organization.id,
      metadata: {
        sessionId: current.id,
        organizationId: created.organization.id,
        userId: created.user.id,
        planCode: current.planCode,
        screens: current.screens,
        amountCents: current.amountCents,
        reusedExistingAccount: false,
      },
    });

    // Não bloqueante: SMTP fora do ar não pode desfazer um provisionamento que
    // já está no banco, nem fazer o evento voltar para a fila.
    void sendInviteEmail(email, tempPassword).catch((err: unknown) => {
      console.warn(
        '[checkout-handlers/paid] conta provisionada, mas o e-mail de credenciais falhou:',
        err instanceof Error ? err.message : err
      );
    });
  },
};

/** Cria a assinatura da organização apenas se ainda não houver uma. */
async function ensureSubscription(organizationId: string, planId: string): Promise<void> {
  const existing = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { id: true },
  });

  if (existing) {
    await prisma.subscription.update({ where: { organizationId }, data: { planId, status: 'active' } });
    return;
  }

  await prisma.subscription.create({
    data: { organizationId, planId, status: 'active', trialEndsAt: null },
  });
}

/** Username livre derivado do e-mail (`username` é `@unique` no schema). */
async function deriveUsername(
  email: string,
  tx: { user: { findUnique(args: { where: { username: string } }): Promise<unknown> } }
): Promise<string> {
  const base =
    email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '')
      .slice(0, 24) || 'usuario';

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${attempt + 1}`;
    const existing = await tx.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
  }

  return `${base}${Date.now()}`;
}
