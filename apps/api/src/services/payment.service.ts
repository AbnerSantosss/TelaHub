import type { CheckoutSession, Payment, Prisma } from '@prisma/client';

import prisma from '../lib/prisma';
import { isAsaasNfseEnabled } from './asaas.provider';
import { CheckoutError, normalizeInterval } from './checkout.service';
import { newEventId, sendMetaEventAsync } from './meta-capi.service';
import {
  isValidCardNumber,
  resolveProvider,
  type CardInput,
  type PaymentMethod,
  type ProviderCharge,
} from './payment-providers';
import {
  addBillingInterval,
  cycleCentsFromMonthly,
  type BillingInterval,
} from './subscription.service';

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

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK DO GATEWAY — MÁQUINA DE ESTADOS
//
// As funções abaixo são PURAS de propósito: elas decidem, o serviço grava. É o
// que permite testar "PAYMENT_OVERDUE deixa a assinatura em carência" sem banco,
// sem rede e sem subir servidor — e é o único jeito de manter coberto um caminho
// que só acontece em produção, dias depois da compra.
// ─────────────────────────────────────────────────────────────────────────────

/** O que um evento do Asaas significa para o NOSSO domínio. */
export type WebhookEffect = 'confirmed' | 'overdue' | 'refunded' | 'canceled' | 'unknown';

/**
 * Traduz o `event` do Asaas.
 *
 * `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED` são eventos DIFERENTES do gateway
 * (confirmado = autorizado; recebido = dinheiro liquidado na conta) e chegam os
 * dois para a mesma cobrança. Para o produto, ambos significam "libere o
 * acesso": segurar a liberação até a liquidação deixaria o cliente do Pix
 * esperando à toa. Como o processamento é idempotente, receber os dois não
 * confirma duas vezes.
 *
 * Chargeback entra em `refunded`: do ponto de vista do acesso, dinheiro
 * devolvido é dinheiro devolvido.
 */
export function classifyAsaasEvent(eventType: string | null | undefined): WebhookEffect {
  switch ((eventType || '').toUpperCase()) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_RECEIVED_IN_CASH':
      return 'confirmed';
    case 'PAYMENT_OVERDUE':
    case 'PAYMENT_DUNNING_REQUESTED':
      return 'overdue';
    case 'PAYMENT_REFUNDED':
    case 'PAYMENT_PARTIALLY_REFUNDED':
    case 'PAYMENT_CHARGEBACK_REQUESTED':
    case 'PAYMENT_CHARGEBACK_DISPUTE':
      return 'refunded';
    case 'PAYMENT_DELETED':
      return 'canceled';
    default:
      // Tudo o mais (criação, atualização, e-mail enviado, NFS-e) é ruído para
      // o estado da assinatura. Ruído é `ignored`, nunca erro: erro faria o
      // Asaas reenviar por dias um evento que jamais vamos usar.
      return 'unknown';
  }
}

/** Estado da assinatura que a máquina lê e devolve. */
export interface SubscriptionSnapshot {
  status: string;
  pastDueSince: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface WebhookTransition {
  subscription: {
    status: string;
    pastDueSince: Date | null;
    currentPeriodEnd: Date | null;
  };
  /** Status a gravar em `Payment`. */
  paymentStatus: 'pending' | 'confirmed' | 'refunded' | 'failed' | 'canceled';
  paidAt: Date | null;
  refundedAt: Date | null;
}

/**
 * Próximo estado da assinatura e do pagamento. Função pura.
 *
 * Três decisões que valem comentário:
 *
 * • `overdue` NÃO cancela na hora. Marca `past_due` e liga o relógio de
 *   `pastDueSince` — a suspensão vem depois da carência de `PAST_DUE_GRACE_DAYS`
 *   (10 dias, item 9 dos Termos de uso), por um job
 *   (`subscriptionService.runBillingMaintenance`). Cancelar no primeiro atraso
 *   apaga a TV de uma loja por um cartão que venceu ontem.
 * • `pastDueSince` só é ligado na PRIMEIRA falha: reenvio de webhook não pode
 *   empurrar a data para frente, senão a carência nunca vence.
 * • `refunded` cancela NA HORA, sem carência. Dinheiro devolvido não compra
 *   acesso, e aqui a demora é prejuízo, não gentileza.
 */
export function nextStateFor(
  effect: WebhookEffect,
  current: SubscriptionSnapshot,
  interval: BillingInterval,
  now: Date
): WebhookTransition | null {
  switch (effect) {
    case 'confirmed':
      return {
        subscription: {
          status: 'active',
          pastDueSince: null,
          currentPeriodEnd: addBillingInterval(now, interval),
        },
        paymentStatus: 'confirmed',
        paidAt: now,
        refundedAt: null,
      };

    case 'overdue':
      return {
        subscription: {
          status: 'past_due',
          pastDueSince: current.pastDueSince ?? now,
          currentPeriodEnd: current.currentPeriodEnd,
        },
        paymentStatus: 'failed',
        paidAt: null,
        refundedAt: null,
      };

    case 'refunded':
      return {
        subscription: {
          status: 'canceled',
          pastDueSince: current.pastDueSince,
          currentPeriodEnd: current.currentPeriodEnd,
        },
        paymentStatus: 'refunded',
        paidAt: null,
        refundedAt: now,
      };

    case 'canceled':
      return {
        subscription: {
          status: current.status,
          pastDueSince: current.pastDueSince,
          currentPeriodEnd: current.currentPeriodEnd,
        },
        paymentStatus: 'canceled',
        paidAt: null,
        refundedAt: null,
      };

    default:
      return null;
  }
}

/** O corpo que o Asaas envia. Tudo opcional: o que chega é do gateway, não nosso. */
export interface AsaasWebhookBody {
  /** Id do EVENTO (`evt_...`). É a chave de deduplicação. */
  id?: string;
  event?: string;
  dateCreated?: string;
  payment?: {
    id?: string;
    customer?: string;
    subscription?: string;
    status?: string;
    value?: number;
    netValue?: number;
    billingType?: string;
    dueDate?: string;
    paymentDate?: string;
    invoiceUrl?: string;
    externalReference?: string;
  };
}

/**
 * Chave de deduplicação do evento.
 *
 * O `id` do evento é o certo. Quando ele falta (webhook antigo, teste manual
 * pelo painel do Asaas), o par `evento + cobrança` serve: reenvio da MESMA
 * transição continua colidindo, que é o que a idempotência precisa. Cair num
 * id aleatório seria pior que não ter idempotência nenhuma — pareceria
 * funcionar e reprocessaria tudo.
 */
export function webhookEventKey(body: AsaasWebhookBody): string | null {
  if (body.id) return body.id;
  if (body.event && body.payment?.id) return `${body.event}:${body.payment.id}`;
  return null;
}

/** `pix`/`credit_card`/`boleto` a partir do `billingType` do Asaas. */
export function methodFromBillingType(billingType: string | null | undefined): string | null {
  switch ((billingType || '').toUpperCase()) {
    case 'PIX':
      return 'pix';
    case 'CREDIT_CARD':
      return 'credit_card';
    case 'BOLETO':
      return 'boleto';
    default:
      return null;
  }
}

/**
 * `event_id` do Meta para a compra.
 *
 * ORDEM DE PREFERÊNCIA, e o motivo de cada degrau:
 *
 * 1. `metaEventId` do NAVEGADOR (guardado no evento `payment_selected`). É o
 *    único que deduplica de verdade: o Pixel mandou `Purchase` com esse id, o
 *    servidor manda outro igual, e a Meta descarta a cópia. Sem ele a MESMA
 *    venda conta duas vezes e todo custo por resultado do painel aparece pela
 *    metade — sem erro nenhum no caminho.
 * 2. Derivado da cobrança. Não casa com o navegador, mas casa com os REENVIOS
 *    do webhook: o Asaas reentrega por dias até receber 200, e com id aleatório
 *    cada reentrega viraria uma conversão nova.
 * 3. `newEventId()`. Último recurso, quando não há nem cobrança identificada.
 */
export function purchaseEventId(
  providerPaymentId: string | null | undefined,
  metaEventId?: string | null
): string {
  if (metaEventId) return metaEventId;
  return providerPaymentId ? `purchase-${providerPaymentId}` : `purchase-${newEventId()}`;
}

/**
 * Tipo de `CheckoutEvent` que carrega o rastreamento do navegador.
 *
 * ⚠️ FALTA UMA COLUNA. O certo seria `CheckoutSession.metaEventId`/`fbp`/`fbc`;
 * como não há migração disponível nesta frente, o dado viaja no metadado do
 * evento `payment_selected`, que a sessão já grava. Funciona e é idempotente,
 * mas custa uma consulta a mais e não é indexável. Ao abrir a próxima migração,
 * mover para colunas e ler delas aqui.
 */
export const TRACKING_EVENT_TYPE = 'payment_selected';

export interface SessionTracking {
  metaEventId: string | null;
  fbp: string | null;
  fbc: string | null;
}

const EMPTY_TRACKING: SessionTracking = { metaEventId: null, fbp: null, fbc: null };

/**
 * Recupera o rastreamento guardado na sessão.
 *
 * Nunca lança: metadado corrompido não pode derrubar a confirmação de um
 * pagamento. Sem rastreamento, o evento vai com id derivado — perde-se precisão
 * de medição, não a venda.
 */
export async function readSessionTracking(sessionId: string): Promise<SessionTracking> {
  try {
    const events = await prisma.checkoutEvent.findMany({
      where: { sessionId, type: TRACKING_EVENT_TYPE },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { metadata: true },
    });

    for (const event of events) {
      if (!event.metadata) continue;
      const parsed: unknown = JSON.parse(event.metadata);
      if (!parsed || typeof parsed !== 'object') continue;

      const record = parsed as Record<string, unknown>;
      const pick = (key: string): string | null =>
        typeof record[key] === 'string' && record[key] ? (record[key] as string) : null;

      const tracking = { metaEventId: pick('metaEventId'), fbp: pick('fbp'), fbc: pick('fbc') };
      if (tracking.metaEventId || tracking.fbp || tracking.fbc) return tracking;
    }
  } catch {
    // Segue sem rastreamento — ver acima.
  }

  return EMPTY_TRACKING;
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
    input: {
      method: PaymentMethod;
      card?: CardInput;
      /**
       * Rastreamento do navegador. Guardado na sessão (ver `TRACKING_EVENT_TYPE`)
       * porque a confirmação do Pix chega pelo WEBHOOK, minutos depois, sem
       * nenhum corpo vindo do navegador — se não ficar guardado agora, não
       * existe mais depois.
       */
      metaEventId?: string;
      fbp?: string;
      fbc?: string;
    }
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

    // ⚠️ DEFEITO US-A-05, corrigido aqui. `session.amountCents` é o valor
    // MENSAL EQUIVALENTE mesmo quando `billingInterval === 'yearly'` (ver
    // `computeAmountCents`), porque é ele que a vitrine compara. A COBRANÇA,
    // porém, é do ciclo inteiro: numa sessão anual, mandar o mensal para o
    // gateway cobraria 1/12 do combinado — e o cliente teria 12 meses de acesso
    // por um. A conversão mora em `cycleCentsFromMonthly`, um lugar só, e é a
    // mesma que `Payment.amountCents` usa.
    const interval = normalizeInterval(session.billingInterval);
    const cycleAmountCents = cycleCentsFromMonthly(session.amountCents, interval);

    const chargeInput = {
      method: input.method,
      amountCents: cycleAmountCents,
      description:
        `TelaHub: plano ${session.planCode} (${session.screens} tela(s), ` +
        `${interval === 'yearly' ? 'anual' : 'mensal'})`,
      payer: {
        name: session.name!,
        email: session.email!,
        document: session.document,
      },
      card: input.card,
    };

    // RECORRÊNCIA quando o provedor tem uma. Cobrança avulsa cobraria o
    // primeiro ciclo e nunca mais — o produto é assinatura, e a falta do
    // segundo mês só apareceria 30 dias depois, sem receita e sem aviso.
    const charge = provider.createSubscriptionCharge
      ? await provider.createSubscriptionCharge({
          ...chargeInput,
          interval,
          externalReference: session.id,
        })
      : await provider.createCharge(chargeInput);

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
                // ⚠️ AQUI é onde o rastreamento do navegador fica guardado. Não
                // há coluna para ele em `CheckoutSession` (ver a nota em
                // `readSessionTracking`), então o metadado do evento é o
                // depósito. Perder isto significa contar cada venda duas vezes
                // no gerenciador de anúncios.
                metaEventId: input.metaEventId ?? null,
                fbp: input.fbp ?? null,
                fbc: input.fbc ?? null,
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
        // Ids da recorrência: é o único momento em que eles passam por aqui, e
        // sem eles a assinatura nasce sem saber qual recorrência do gateway é a
        // dela — cancelar depois viraria trabalho manual no painel do Asaas.
        gatewayCustomerId: charge.gatewayCustomerId ?? null,
        gatewaySubscriptionId: charge.gatewaySubscriptionId ?? null,
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
        ? 'QR Code SIMULADO gerado. Nenhuma cobrança real será feita. Use o botão de confirmação para simular o pagamento.'
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
    /**
     * Ids do gateway. Viajam pelo METADADO do evento porque `CheckoutSession`
     * não tem colunas para eles — e é daqui que `paid.handler` os lê para
     * gravar em `Subscription`. Sem esse repasse, a assinatura nasceria sem
     * saber qual recorrência do Asaas é dela, e o cancelamento no gateway
     * ficaria impossível de fazer sozinho.
     */
    gatewayCustomerId?: string | null;
    gatewaySubscriptionId?: string | null;
    /** Quando o gateway diz que o dinheiro entrou. Padrão: agora. */
    paidAt?: Date;
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
    const paidAt = input.paidAt ?? now;
    const interval = normalizeInterval(session.billingInterval);

    // A transação é o ponto: estado e evento juntos, ou nenhum dos dois.
    await prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        status: 'paid',
        paidAt,
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
                // MENSAL EQUIVALENTE (o que a sessão congelou) e CAIXA DO CICLO
                // lado a lado, nomeados. Um metadado com um `amountCents` só,
                // ambíguo, é como o defeito US-A-05 se propaga para o
                // relatório: ninguém sabe qual dos dois números está lendo.
                amountCents: session.amountCents,
                cycleAmountCents: cycleCentsFromMonthly(session.amountCents, interval),
                billingInterval: interval,
                planCode: session.planCode,
                screens: session.screens,
                gatewayCustomerId: input.gatewayCustomerId ?? null,
                gatewaySubscriptionId: input.gatewaySubscriptionId ?? null,
                paidAt: paidAt.toISOString(),
                ...(input.raw ? { raw: input.raw } : {}),
              }),
            },
          ],
        },
      },
    });

    return { paid: true, alreadyPaid: false };
  }

  /** Histórico de cobranças do tenant, do mais recente para o mais antigo. */
  async listPayments(organizationId: string, take = 24): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /**
   * Registra o evento CRU antes de processar e diz se ele já foi tratado.
   *
   * A ordem importa e não é negociável: grava primeiro, processa depois. Se o
   * processo morrer no meio do processamento, o evento fica `received` no banco
   * e o reenvio do Asaas (que acontece por dias) o retoma. Se gravássemos
   * depois, um crash apagaria o rastro de uma cobrança confirmada — e o cliente
   * ficaria sem conta tendo pago.
   *
   * `@@unique([provider, eventId])` é quem garante a exclusão mútua de verdade;
   * a checagem prévia é só para o caminho comum. Entre um `findUnique` e um
   * `create` cabe um segundo webhook — por isso o `catch` de P2002 relê em vez
   * de estourar.
   */
  async recordWebhookEvent(input: {
    provider: string;
    eventId: string;
    eventType: string;
    payload: string;
  }): Promise<{ id: string; alreadyHandled: boolean }> {
    try {
      const created = await prisma.webhookEvent.create({
        data: {
          provider: input.provider,
          eventId: input.eventId,
          eventType: input.eventType,
          status: 'received',
          payload: input.payload,
        },
        select: { id: true },
      });
      return { id: created.id, alreadyHandled: false };
    } catch (error) {
      const existing = await prisma.webhookEvent.findUnique({
        where: { provider_eventId: { provider: input.provider, eventId: input.eventId } },
        select: { id: true, status: true },
      });

      if (!existing) throw error;

      // `received` e `failed` são retomáveis: alguém morreu no meio, ou o
      // processamento falhou por causa transitória. `processed`/`ignored` não.
      return {
        id: existing.id,
        alreadyHandled: existing.status === 'processed' || existing.status === 'ignored',
      };
    }
  }

  /**
   * Processa um webhook do Asaas. Idempotente por `WebhookEvent`.
   *
   * NUNCA lança para a rota: o gateway precisa de 200 mesmo quando não
   * entendemos o evento, senão reenvia por dias e, no Asaas, uma fila de
   * webhook travada SUSPENDE as notificações da conta inteira — inclusive as de
   * pagamentos legítimos. Falha real vira `status: 'failed'` no banco, com a
   * mensagem, para reprocessamento.
   */
  async handleAsaasWebhook(
    body: AsaasWebhookBody,
    rawPayload: string,
    now: Date = new Date()
  ): Promise<{ status: 'processed' | 'ignored' | 'failed' | 'duplicate'; message: string }> {
    const eventKey = webhookEventKey(body);
    if (!eventKey) {
      return { status: 'ignored', message: 'Evento sem identificador; nada a fazer.' };
    }

    const eventType = body.event ?? 'UNKNOWN';
    const record = await this.recordWebhookEvent({
      provider: 'asaas',
      eventId: eventKey,
      eventType,
      payload: rawPayload,
    });

    if (record.alreadyHandled) {
      return { status: 'duplicate', message: 'Evento já processado.' };
    }

    const effect = classifyAsaasEvent(eventType);

    if (effect === 'unknown') {
      await this.closeWebhookEvent(record.id, 'ignored', now);
      return { status: 'ignored', message: `Evento ${eventType} não altera assinatura.` };
    }

    try {
      const message = await this.applyAsaasEffect(effect, body, now);
      await this.closeWebhookEvent(record.id, 'processed', now);
      return { status: 'processed', message };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await this.closeWebhookEvent(record.id, 'failed', now, reason);
      // 200 mesmo assim (a rota decide): o reenvio do Asaas retoma o evento
      // porque ele ficou `failed`, e não `processed`.
      return { status: 'failed', message: reason };
    }
  }

  private async closeWebhookEvent(
    id: string,
    status: 'processed' | 'ignored' | 'failed',
    now: Date,
    error?: string
  ): Promise<void> {
    await prisma.webhookEvent.update({
      where: { id },
      data: {
        status,
        processedAt: now,
        error: error ? error.slice(0, 1000) : null,
      },
    });
  }

  /**
   * Aplica o efeito do evento. Separada de `handleAsaasWebhook` para que a
   * idempotência (acima) e a regra de negócio (aqui) sejam legíveis em
   * separado.
   */
  private async applyAsaasEffect(
    effect: WebhookEffect,
    body: AsaasWebhookBody,
    now: Date
  ): Promise<string> {
    const payment = body.payment ?? {};
    const providerPaymentId = payment.id ?? null;

    if (!providerPaymentId) {
      return 'Evento sem cobrança associada.';
    }

    // ── Caminho 1: a compra ainda está no checkout ───────────────────────────
    // Pix confirmado depois que a pessoa fechou a aba é o caso mais comum de
    // primeira compra. Aqui NÃO se provisiona nada: `confirmPayment` grava
    // `paid` + evento na mesma transação e o outbox provisiona. Chamar o
    // tratador direto separaria "pagou" de "tem conta" na primeira falha.
    const session = await prisma.checkoutSession.findFirst({
      where: { providerChargeId: providerPaymentId },
    });

    if (session && effect === 'confirmed' && session.status !== 'paid') {
      await this.confirmPayment({
        sessionId: session.id,
        providerKey: 'asaas',
        providerChargeId: providerPaymentId,
        gatewayCustomerId: payment.customer ?? null,
        gatewaySubscriptionId: payment.subscription ?? null,
        paidAt: payment.paymentDate ? new Date(payment.paymentDate) : now,
        raw: { ...payment },
      });

      // O id que o navegador usou no Pixel. Quem paga por Pix já fechou a aba
      // quando isto roda — este é o único jeito de o evento de servidor casar
      // com o do navegador em vez de virar uma segunda conversão.
      const tracking = await readSessionTracking(session.id);

      this.emitPurchaseEvents({
        providerPaymentId,
        email: session.email,
        phone: session.phone,
        document: session.document,
        externalId: session.organizationId ?? session.id,
        valueReais:
          typeof payment.value === 'number'
            ? payment.value
            : cycleCentsFromMonthly(session.amountCents, normalizeInterval(session.billingInterval)) / 100,
        planCode: session.planCode,
        screens: session.screens,
        interval: normalizeInterval(session.billingInterval),
        tracking,
      });

      return `Checkout ${session.id} confirmado; provisionamento enfileirado.`;
    }

    // ── Caminho 2: renovação/inadimplência de quem já é cliente ──────────────
    const existingPayment = await prisma.payment.findUnique({
      where: { providerPaymentId },
      select: { id: true, organizationId: true, billingInterval: true, screens: true, amountCents: true },
    });

    const subscription = existingPayment
      ? await prisma.subscription.findUnique({
          where: { organizationId: existingPayment.organizationId },
        })
      : await prisma.subscription.findFirst({
          where: {
            OR: [
              ...(payment.subscription ? [{ gatewaySubscriptionId: payment.subscription }] : []),
              ...(payment.customer ? [{ gatewayCustomerId: payment.customer }] : []),
              ...(payment.externalReference ? [{ organizationId: payment.externalReference }] : []),
            ],
          },
        });

    if (!subscription) {
      // Sem assinatura correspondente não há o que mover. Isso é comum em
      // sandbox (cobrança criada à mão no painel do Asaas) e não deve virar
      // erro: erro faria o gateway reenviar para sempre.
      return `Cobrança ${providerPaymentId} não corresponde a nenhuma assinatura conhecida.`;
    }

    const interval: BillingInterval =
      subscription.billingInterval === 'yearly' ? 'yearly' : 'monthly';

    const transition = nextStateFor(
      effect,
      {
        status: subscription.status,
        pastDueSince: subscription.pastDueSince,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      interval,
      now
    );

    if (!transition) {
      return 'Evento sem efeito sobre a assinatura.';
    }

    // Valor do CICLO: é o que o gateway cobrou de uma vez. `payment.value` vem
    // em reais do Asaas — daí o ×100. Sem ele, cai no que já estava gravado.
    const cycleAmountCents =
      typeof payment.value === 'number'
        ? Math.round(payment.value * 100)
        : (existingPayment?.amountCents ?? 0);

    await prisma.payment.upsert({
      where: { providerPaymentId },
      create: {
        organizationId: subscription.organizationId,
        provider: 'asaas',
        providerPaymentId,
        status: transition.paymentStatus,
        method: methodFromBillingType(payment.billingType),
        amountCents: cycleAmountCents,
        billingInterval: interval,
        screens: existingPayment?.screens ?? 1,
        dueDate: payment.dueDate ? new Date(payment.dueDate) : null,
        paidAt: transition.paidAt,
        refundedAt: transition.refundedAt,
        invoiceUrl: payment.invoiceUrl ?? null,
        nfseStatus: isAsaasNfseEnabled() ? 'pending' : 'exempt',
      },
      update: {
        status: transition.paymentStatus,
        paidAt: transition.paidAt ?? undefined,
        refundedAt: transition.refundedAt ?? undefined,
        invoiceUrl: payment.invoiceUrl ?? undefined,
      },
    });

    await prisma.subscription.update({
      where: { organizationId: subscription.organizationId },
      data: {
        status: transition.subscription.status,
        pastDueSince: transition.subscription.pastDueSince,
        currentPeriodEnd: transition.subscription.currentPeriodEnd,
        gateway: 'asaas',
        ...(payment.customer ? { gatewayCustomerId: payment.customer } : {}),
        ...(payment.subscription ? { gatewaySubscriptionId: payment.subscription } : {}),
      },
    });

    if (effect === 'confirmed') {
      const org = await prisma.user.findFirst({
        where: { organizationId: subscription.organizationId, role: 'admin' },
        select: { email: true },
        orderBy: { createdAt: 'asc' },
      });

      this.emitPurchaseEvents({
        providerPaymentId,
        email: org?.email ?? null,
        phone: null,
        document: null,
        externalId: subscription.organizationId,
        valueReais: cycleAmountCents / 100,
        planCode: null,
        screens: existingPayment?.screens ?? null,
        interval,
        // No cartão a sessão foi confirmada na hora e o webhook cai aqui, não no
        // caminho 1 — mas o rastreamento do navegador continua existindo e
        // precisa ser usado, senão a compra no cartão conta duas vezes. Em
        // RENOVAÇÃO não há sessão e o id derivado é o certo: ninguém estava no
        // navegador para gerar um.
        tracking: session ? await readSessionTracking(session.id) : undefined,
      });
    }

    return `Assinatura ${subscription.organizationId} → ${transition.subscription.status}.`;
  }

  /**
   * Dispara `Purchase` + `Subscribe` para a Conversions API.
   *
   * `action_source: 'system_generated'` porque isto acontece no servidor, com a
   * pessoa longe da tela — é justamente o evento que o Pixel do navegador NUNCA
   * veria, e o que faz a campanha aprender quem paga.
   *
   * `value` vai em REAIS e é o CAIXA DO CICLO. Mandar o mensal equivalente numa
   * venda anual ensinaria o algoritmo a otimizar por um ticket 12 vezes menor
   * que o real.
   *
   * Nunca lança: medir não pode derrubar cobrar.
   */
  private emitPurchaseEvents(input: {
    providerPaymentId: string;
    email: string | null;
    phone: string | null;
    document: string | null;
    externalId: string | null;
    valueReais: number;
    planCode: string | null;
    screens: number | null;
    interval: BillingInterval;
    /** Rastreamento guardado no checkout. Ausente em renovação (não houve navegador). */
    tracking?: SessionTracking;
  }): void {
    const userData = {
      email: input.email,
      phone: input.phone,
      document: input.document,
      externalId: input.externalId,
      // Cookies do Pixel: são eles que ligam a conversão ao anúncio que a
      // originou. Sem `fbc`, a venda entra como orgânica e a campanha não
      // recebe o crédito que pagou por ela.
      fbp: input.tracking?.fbp ?? null,
      fbc: input.tracking?.fbc ?? null,
    };

    const custom = {
      plan: input.planCode ?? undefined,
      screens: input.screens ?? undefined,
      billing_interval: input.interval,
    };

    const eventId = purchaseEventId(input.providerPaymentId, input.tracking?.metaEventId);

    sendMetaEventAsync({
      eventName: 'Purchase',
      eventId,
      actionSource: 'system_generated',
      value: input.valueReais,
      currency: 'BRL',
      userData,
      custom,
    });

    // `Subscribe` acompanha o `Purchase` porque o produto é assinatura: sem ele
    // a Meta otimiza por compra avulsa e ignora o valor recorrente. O sufixo no
    // id impede que a Meta trate os dois como o mesmo evento duplicado.
    sendMetaEventAsync({
      eventName: 'Subscribe',
      eventId: `${eventId}-subscribe`,
      actionSource: 'system_generated',
      value: input.valueReais,
      currency: 'BRL',
      userData,
      custom,
    });
  }
}

export const paymentService = new PaymentService();
