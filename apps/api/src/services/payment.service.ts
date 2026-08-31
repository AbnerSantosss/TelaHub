import type { CheckoutSession, Prisma } from '@prisma/client';

import prisma from '../lib/prisma';
import { CheckoutError } from './checkout.service';
import {
  isValidCardNumber,
  resolveProvider,
  type CardInput,
  type PaymentMethod,
  type ProviderCharge,
} from './payment-providers';

// ─────────────────────────────────────────────────────────────────────────────
// COBRANÇA DO CHECKOUT
//
// Este arquivo é a peça que faltava para o funil chegar ao fim. O resto do
// caminho já existia e estava correto: `checkout-handlers/paid.handler.ts` cria
// Organization → User → Subscription e manda o e-mail de acesso, de forma
// idempotente. O que ninguém fazia era EMITIR o evento `paid`.
//
// ── A regra estrutural: nada aqui provisiona nada ───────────────────────────
// `confirmPayment` grava `status: 'paid'` + `CheckoutEvent { type: 'paid' }` na
// MESMA transação, e para por aí. Quem provisiona é o despachante, lendo o
// evento (padrão outbox, já montado no schema).
//
// Chamar o provisionamento direto daqui seria mais curto e estaria errado: se o
// e-mail falhasse, ou o processo caísse entre "marcou pago" e "criou a conta",
// existiria um cliente que pagou e não tem acesso — sem nada na fila para
// consertar sozinho. Com o outbox, o evento fica pendente e é reentregue com
// backoff até dar certo.
//
// ── O encaixe do gateway real ───────────────────────────────────────────────
// `confirmPayment` é DE PROPÓSITO agnóstica de quem confirmou. Quando o gateway
// existir, a rota de webhook (com verificação de assinatura do provedor) chama
// exatamente esta função. É por isso que o parâmetro é `providerChargeId` e não
// algo do simulador: o contrato já é o do mundo real.
// ─────────────────────────────────────────────────────────────────────────────

/** O que o front precisa para desenhar a etapa de pagamento. */
export interface StartPaymentResult {
  method: PaymentMethod;
  provider: string;
  /** `true` quando nenhuma cobrança real acontece — a tela avisa o usuário. */
  simulated: boolean;
  status: 'pending' | 'approved' | 'declined';
  /** `true` quando a conta já foi liberada (cartão aprovado). */
  paid: boolean;
  pix?: ProviderCharge['pix'];
  card?: ProviderCharge['card'];
  declineReason?: string;
  message: string;
}

/**
 * Sessões em que faz sentido iniciar pagamento. `paid` fica de fora — pagar
 * duas vezes a mesma sessão é o erro que mais dói.
 */
const PAYABLE_STATUSES = new Set(['started', 'identified', 'payment_pending', 'abandoned']);

function assertPayable(session: CheckoutSession): void {
  if (session.status === 'paid') {
    throw new CheckoutError('Esta contratação já foi paga.', 409, 'session_already_paid');
  }
  if (session.status === 'expired') {
    throw new CheckoutError('Este checkout expirou.', 410, 'session_expired');
  }
  if (!PAYABLE_STATUSES.has(session.status)) {
    throw new CheckoutError('Esta sessão não está apta a receber pagamento.', 409, 'session_not_payable');
  }
  if (!session.planCode || !session.email || !session.name) {
    throw new CheckoutError(
      'Complete a identificação e a escolha do plano antes de pagar.',
      400,
      'session_incomplete'
    );
  }
  if (session.amountCents <= 0) {
    throw new CheckoutError(
      'Este plano não é contratado por pagamento online. Fale com o comercial.',
      400,
      'amount_not_payable'
    );
  }
}

export class PaymentService {
  /**
   * Cria a cobrança no provedor e registra na sessão o que foi escolhido.
   *
   * Cartão aprovado confirma o pagamento aqui mesmo (autorização é síncrona).
   * Pix fica pendente: quem confirma é `confirmPayment`, chamada pelo webhook
   * do provedor — ou, no simulado, pela rota de confirmação.
   */
  async startPayment(
    publicToken: string,
    input: { method: PaymentMethod; card?: CardInput }
  ): Promise<StartPaymentResult> {
    const provider = resolveProvider();

    if (!provider.methods.includes(input.method)) {
      throw new CheckoutError(
        `O provedor ${provider.label} não aceita este método de pagamento.`,
        400,
        'method_not_supported'
      );
    }

    const session = await prisma.checkoutSession.findUnique({ where: { publicToken } });
    if (!session) {
      throw new CheckoutError('Checkout não encontrado.', 404, 'session_not_found');
    }
    assertPayable(session);

    if (input.method === 'credit_card') {
      if (!input.card) {
        throw new CheckoutError('Informe os dados do cartão.', 400, 'card_required');
      }
      // Valida antes de ir ao provedor: erro de digitação não precisa de
      // ida à rede, e a mensagem fica melhor.
      if (!isValidCardNumber(input.card.number)) {
        throw new CheckoutError('Número de cartão inválido.', 400, 'invalid_card_number');
      }
    }

    // ⚠️ `session.amountCents` é o valor MENSAL EQUIVALENTE, também quando
    // `session.billingInterval === 'yearly'` (ver `computeAmountCents`). Cobrar
    // este número numa sessão anual seria cobrar 1/12 do combinado. Não se
    // corrige aqui inventando uma multiplicação por 12: quando o gateway real
    // entrar, quem decide o que vira fatura é o fluxo de assinatura recorrente
    // (`billing.routes.ts`), que precisa tratar junto proporcionalidade,
    // renovação e a regra anti-cobrança-retroativa. Até lá o provedor é
    // simulado e nenhum centavo real passa por aqui.
    const charge = await provider.createCharge({
      method: input.method,
      amountCents: session.amountCents,
      description: `TelaHub — plano ${session.planCode} (${session.screens} tela(s))`,
      payer: {
        name: session.name!,
        email: session.email!,
        document: session.document,
      },
      card: input.card,
    });

    // ⚠️ NADA do cartão é gravado. Nem os 4 últimos dígitos vão para a sessão:
    // o produto não precisa deles para nada hoje, e dado de cartão que não é
    // guardado não vaza nem entra no escopo de PCI-DSS. A bandeira/últimos
    // dígitos voltam para a TELA, no retorno desta função, e morrem ali.
    await prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        status: charge.status === 'declined' ? session.status : 'payment_pending',
        paymentMethod: input.method,
        paymentProvider: charge.providerKey,
        providerChargeId: charge.chargeId,
        paymentAt: session.paymentAt ?? new Date(),
        lastSeenAt: new Date(),
        abandonedAt: null,
        events: {
          create: [
            {
              type: 'payment_selected',
              metadata: JSON.stringify({
                method: input.method,
                provider: charge.providerKey,
                chargeStatus: charge.status,
              }),
              // Evento de telemetria do funil: não tem tratador de domínio, e
              // marcá-lo como pendente encheria a fila do despachante à toa.
              dispatchStatus: 'skipped',
              dispatchedAt: new Date(),
            },
          ],
        },
      },
    });

    if (charge.status === 'declined') {
      return {
        method: input.method,
        provider: charge.providerKey,
        simulated: provider.simulated,
        status: 'declined',
        paid: false,
        declineReason: charge.declineReason,
        message: charge.declineReason ?? 'Pagamento recusado.',
      };
    }

    if (charge.status === 'approved') {
      await this.confirmPayment({
        publicToken,
        providerKey: charge.providerKey,
        providerChargeId: charge.chargeId,
      });

      return {
        method: input.method,
        provider: charge.providerKey,
        simulated: provider.simulated,
        status: 'approved',
        paid: true,
        card: charge.card,
        message: provider.simulated
          ? 'Pagamento SIMULADO aprovado. Nenhum valor foi cobrado de verdade. ' +
            'Sua conta foi liberada e as credenciais de acesso vão para o seu e-mail.'
          : 'Pagamento aprovado. Sua conta foi liberada e as credenciais de acesso vão para o seu e-mail.',
      };
    }

    return {
      method: input.method,
      provider: charge.providerKey,
      simulated: provider.simulated,
      status: 'pending',
      paid: false,
      pix: charge.pix,
      message: provider.simulated
        ? 'QR Code SIMULADO gerado. Nenhuma cobrança real será feita — use o botão de confirmação para simular o pagamento.'
        : 'Escaneie o QR Code para pagar. A liberação do acesso é automática assim que o pagamento cair.',
    };
  }

  /**
   * Confirma um pagamento: marca a sessão como paga e enfileira o evento que
   * provisiona a conta.
   *
   * IDEMPOTENTE — sessão já paga devolve `alreadyPaid` sem gravar um segundo
   * evento. Webhook de gateway reentrega por projeto (todos reentregam), então
   * confirmar duas vezes tem que ser inofensivo.
   *
   * É esta função que o webhook do gateway real vai chamar. Não acrescente
   * lógica de provisionamento aqui: quem provisiona é o tratador do evento.
   */
  async confirmPayment(input: {
    publicToken?: string;
    sessionId?: string;
    providerKey: string;
    providerChargeId: string;
    /** Metadados crus do provedor, para auditoria/conciliação. */
    raw?: Record<string, unknown>;
  }): Promise<{ paid: boolean; alreadyPaid: boolean }> {
    const where: Prisma.CheckoutSessionWhereUniqueInput | null = input.publicToken
      ? { publicToken: input.publicToken }
      : input.sessionId
        ? { id: input.sessionId }
        : null;

    if (!where) {
      throw new CheckoutError('Sessão de pagamento não identificada.', 400, 'session_not_identified');
    }

    const session = await prisma.checkoutSession.findUnique({ where });
    if (!session) {
      throw new CheckoutError('Checkout não encontrado.', 404, 'session_not_found');
    }

    if (session.status === 'paid') {
      return { paid: true, alreadyPaid: true };
    }

    const now = new Date();

    // A transação é o ponto: estado e evento juntos, ou nenhum dos dois.
    await prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        status: 'paid',
        paidAt: now,
        lastSeenAt: now,
        abandonedAt: null,
        paymentProvider: input.providerKey,
        providerChargeId: input.providerChargeId,
        events: {
          create: [
            {
              type: 'paid',
              metadata: JSON.stringify({
                provider: input.providerKey,
                chargeId: input.providerChargeId,
                amountCents: session.amountCents,
                planCode: session.planCode,
                screens: session.screens,
                ...(input.raw ? { raw: input.raw } : {}),
              }),
            },
          ],
        },
      },
    });

    return { paid: true, alreadyPaid: false };
  }
}

export const paymentService = new PaymentService();
