import crypto from 'crypto';

import prisma from '../../lib/prisma';
import { isAsaasNfseEnabled } from '../asaas.provider';
import { hashPassword } from '../auth.service';
import { normalizeInterval } from '../checkout.service';
import { PRIVACY_VERSION, TERMS_VERSION } from '../../schemas/signup.schema';
import { planService } from '../plan.service';
import { sendPurchaseConfirmationEmail } from '../email.service';
import { simulatedProvider } from '../payment-providers';
import {
  addBillingInterval,
  billedScreens,
  cycleCentsFromMonthly,
  type BillingInterval,
} from '../subscription.service';
import type { CheckoutEventContext, CheckoutEventHandler } from './index';
import { auditOnce } from './shared';

/** Ações de auditoria do provisionamento pós-pagamento. */
export const PAID_AUDIT_ACTION = 'checkout.paid.provisioned';
export const PAID_AUDIT_ACTION_ALREADY = 'checkout.paid.already_provisioned';

/**
 * Tratador do evento `paid`.
 *
 * Este tratador é o PONTO DE CHEGADA do fluxo de pagamento — é aqui que o
 * provisionamento da conta acontece, e em nenhum outro lugar.
 *
 * Quem emite o evento `paid`: `paymentService.confirmPayment()`, chamada pelo
 * cartão aprovado na hora ou por `POST /api/webhooks/asaas` quando o Pix cai.
 * A rota do webhook NUNCA chama este tratador direto — grava `paid` + evento na
 * mesma transação e deixa o outbox despachar, que é o que garante que "pagou" e
 * "provisionou" não se separem se o processo cair no meio.
 *
 * ⚠️ O QUE MAIS SE ERRA AQUI: `billingInterval`. A sessão anual precisa gerar
 * assinatura anual. Enquanto este tratador não copiava o campo, quem comprava o
 * anual (12 meses adiantados) recebia uma assinatura MENSAL — e o primeiro
 * `currentPeriodEnd` vencia 30 dias depois, cobrando de novo alguém que já
 * tinha pago o ano. É o mesmo defeito US-A-05 visto do outro lado.
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

  async handle({ event, session, metadata, now }: CheckoutEventContext): Promise<void> {
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

    // ── Dados de cobrança do ciclo contratado ────────────────────────────────
    // `current.amountCents` é o MENSAL EQUIVALENTE congelado no checkout; o que
    // entra no caixa é o ciclo inteiro. As duas grandezas coexistem de propósito
    // e só se convertem por `cycleCentsFromMonthly` (ver o comentário lá).
    const interval = normalizeInterval(current.billingInterval);
    const paidAt = current.paidAt ?? now;
    const billing = {
      interval,
      paidAt,
      currentPeriodEnd: addBillingInterval(paidAt, interval),
      cycleAmountCents: cycleCentsFromMonthly(current.amountCents, interval),
      // O que a fatura cobra é `max(telas, minScreens)` — a mesma conta da
      // vitrine. Gravar `current.screens` cru faria a conciliação divergir da
      // cobrança sempre que o cliente ficasse abaixo do piso do plano.
      screens: billedScreens(plan, current.screens),
      gateway: current.paymentProvider ?? null,
      // Ids do gateway não têm coluna em `CheckoutSession`: chegam pelo
      // metadado do evento `paid`, gravado por `confirmPayment`.
      gatewayCustomerId: readString(metadata, 'gatewayCustomerId'),
      gatewaySubscriptionId: readString(metadata, 'gatewaySubscriptionId'),
      providerPaymentId: current.providerChargeId,
      method: current.paymentMethod,
    };

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, organizationId: true },
    });

    // Já existe conta para este e-mail: não se cria uma segunda. Vincula a
    // sessão e garante que a assinatura reflita o plano contratado.
    if (existingUser?.organizationId) {
      await ensureSubscription(existingUser.organizationId, plan.id, billing);
      await recordPayment(existingUser.organizationId, current.id, billing);
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
          cycleAmountCents: billing.cycleAmountCents,
          billingInterval: interval,
          paymentProvider: current.paymentProvider,
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
          // A senha foi sorteada aqui e vai por e-mail — quem comprou não a
          // escolheu. O painel exige a troca no primeiro acesso; sem isso ela
          // valeria para sempre, guardada em texto claro na caixa de entrada.
          mustChangePassword: true,
          // Aceite dos termos: quem compra aceita NO CHECKOUT, não no cadastro.
          // Esta conta não passa por `signupService` (que grava isto no fluxo
          // de auto-cadastro), então sem estas três linhas o cliente pagante
          // ficaria sem registro de aceite — e um registro de aceite que só
          // existe para metade dos usuários não serve de prova para nenhum dos
          // dois. As versões vêm de `signup.schema` para não haver duas
          // verdades sobre qual texto foi aceito.
          termsAcceptedAt: paidAt,
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
          // Novidades: só se a pessoa marcou a caixa na identificação. É o
          // consentimento que esperou na `CheckoutSession` até existir alguém a
          // quem pertencer — ver o comentário do campo no schema.
          //
          // Reparar que aceitar os Termos NÃO liga isto: são consentimentos
          // diferentes, e derivar um do outro transformaria a condição de uso
          // do produto em captura de base de marketing, que é exatamente o que
          // invalida o consentimento na LGPD.
          marketingOptInAt: current.marketingOptIn ? paidAt : null,
        },
      });

      // 3. Assinatura do plano efetivamente contratado (e pago).
      //
      // `gateway` recebe QUEM processou o pagamento — inclusive `simulado`.
      // Isso não é telemetria: é a única coisa que separa, no banco, uma
      // assinatura que gerou receita de uma que nasceu de demonstração. Sem
      // esse campo preenchido, a primeira conciliação financeira e a emissão
      // de NFS-e tratariam contas simuladas como clientes pagantes — emitindo
      // nota fiscal contra quem nunca pagou.
      await tx.subscription.create({
        data: {
          organizationId: organization.id,
          planId: plan.id,
          status: 'active',
          trialEndsAt: null,
          gateway: billing.gateway,
          gatewayCustomerId: billing.gatewayCustomerId,
          gatewaySubscriptionId: billing.gatewaySubscriptionId,
          // ⚠️ O campo que faltava. Sem ele toda venda anual virava assinatura
          // mensal e o ciclo vencia 11 meses cedo demais.
          billingInterval: billing.interval,
          currentPeriodEnd: billing.currentPeriodEnd,
        },
      });

      await tx.checkoutSession.update({
        where: { id: current.id },
        data: { organizationId: organization.id },
      });

      return { organization, user };
    });

    // Fora da transação de propósito: a conta já existe e funciona. Uma falha
    // ao registrar o `Payment` é problema de CONCILIAÇÃO, e desfazer o
    // provisionamento por causa dela deixaria sem acesso quem pagou.
    await recordPayment(created.organization.id, current.id, billing);

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
        cycleAmountCents: billing.cycleAmountCents,
        billingInterval: billing.interval,
        currentPeriodEnd: billing.currentPeriodEnd.toISOString(),
        paymentProvider: current.paymentProvider,
        reusedExistingAccount: false,
      },
    });

    // Não bloqueante: SMTP fora do ar não pode desfazer um provisionamento que
    // já está no banco, nem fazer o evento voltar para a fila.
    //
    // É o e-mail de COMPRA, não o de convite genérico: quem acabou de pagar
    // precisa ver o que contratou (plano, telas, valor) junto das credenciais.
    // O `simulated` viaja até aqui porque o e-mail é obrigado a dizer quando
    // nada foi cobrado — um comprovante que mostra valor sem essa ressalva
    // afirma uma cobrança que não existiu.
    void sendPurchaseConfirmationEmail(email, {
      name: current.name!.trim(),
      planName: plan.name,
      screens: current.screens,
      amountCents: current.amountCents,
      password: tempPassword,
      simulated: current.paymentProvider === simulatedProvider.key,
    }).catch((err: unknown) => {
      console.warn(
        '[checkout-handlers/paid] conta provisionada, mas o e-mail de credenciais falhou:',
        err instanceof Error ? err.message : err
      );
    });
  },
};

/** Tudo que descreve o CICLO pago, montado uma vez e reusado nos dois caminhos. */
interface ProvisionedBilling {
  interval: BillingInterval;
  paidAt: Date;
  currentPeriodEnd: Date;
  /** Caixa do ciclo inteiro (no anual, os 12 meses). */
  cycleAmountCents: number;
  /** Telas FATURADAS: `max(telas, minScreens)`. */
  screens: number;
  gateway: string | null;
  gatewayCustomerId: string | null;
  gatewaySubscriptionId: string | null;
  providerPaymentId: string | null;
  method: string | null;
}

/** Lê uma string do metadado do evento sem confiar no formato. */
function readString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Cria (ou atualiza) a assinatura da organização com o ciclo efetivamente pago. */
async function ensureSubscription(
  organizationId: string,
  planId: string,
  billing: ProvisionedBilling
): Promise<void> {
  const data = {
    planId,
    status: 'active',
    gateway: billing.gateway,
    gatewayCustomerId: billing.gatewayCustomerId,
    gatewaySubscriptionId: billing.gatewaySubscriptionId,
    billingInterval: billing.interval,
    currentPeriodEnd: billing.currentPeriodEnd,
    // Compra nova zera qualquer inadimplência e qualquer cancelamento agendado
    // — a pessoa acabou de pagar, seria absurdo manter a conta marcada para
    // encerrar.
    pastDueSince: null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    cancelReason: null,
  };

  const existing = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { id: true },
  });

  if (existing) {
    await prisma.subscription.update({ where: { organizationId }, data });
    return;
  }

  await prisma.subscription.create({
    data: { organizationId, trialEndsAt: null, ...data },
  });
}

/**
 * Registra a cobrança do ciclo em `Payment`.
 *
 * ⚠️ `amountCents` é o CAIXA DO CICLO, não o mensal equivalente: é este número
 * que a conciliação bancária confere contra o extrato e que a NFS-e usa como
 * base. Numa venda anual são os 12 meses de uma vez.
 *
 * IDEMPOTENTE por `providerPaymentId`, que é `@unique`. Quando o provedor não
 * dá um id (contratação manual, provedor sem cobrança), a chave é derivada da
 * SESSÃO — determinística, portanto duas entregas do mesmo evento colidem em
 * vez de gerarem duas linhas de receita para a mesma venda.
 */
async function recordPayment(
  organizationId: string,
  sessionId: string,
  billing: ProvisionedBilling
): Promise<void> {
  const providerPaymentId = billing.providerPaymentId ?? `sessao_${sessionId}`;

  await prisma.payment.upsert({
    where: { providerPaymentId },
    create: {
      organizationId,
      provider: billing.gateway ?? 'manual',
      providerPaymentId,
      status: 'confirmed',
      method: billing.method,
      amountCents: billing.cycleAmountCents,
      billingInterval: billing.interval,
      screens: billing.screens,
      paidAt: billing.paidAt,
      dueDate: billing.paidAt,
      // Sem emissão automática, a nota fica `exempt` em vez de `pending`:
      // `pending` sugere fila de emissão e faria alguém esperar por uma nota
      // que nunca sai.
      nfseStatus: isAsaasNfseEnabled() ? 'pending' : 'exempt',
    },
    update: {
      status: 'confirmed',
      paidAt: billing.paidAt,
      amountCents: billing.cycleAmountCents,
      billingInterval: billing.interval,
      screens: billing.screens,
    },
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
