import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Webhook do Asaas — idempotência e máquina de estados, SEM banco e SEM rede.
//
// O Prisma é substituído por dublês: o que se testa aqui é a DECISÃO (quando
// reprocessar, o que gravar), não o SQL. Amarrar isto ao banco significaria não
// testar — o Docker está parado metade do tempo, e o caminho do dinheiro é
// justamente o que não pode ficar sem cobertura.
// ─────────────────────────────────────────────────────────────────────────────

// `vi.hoisted`: `vi.mock` é içado para o topo do arquivo, então os dublês
// precisam existir ANTES das constantes normais — senão o mock referencia uma
// variável que ainda não foi inicializada.
const { prismaMock, sendMetaEventAsync } = vi.hoisted(() => ({
  prismaMock: {
    webhookEvent: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    checkoutSession: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    checkoutEvent: { findMany: vi.fn() },
    payment: { findUnique: vi.fn(), upsert: vi.fn() },
    subscription: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    user: { findFirst: vi.fn() },
  },
  sendMetaEventAsync: vi.fn(),
}));

vi.mock('../../lib/prisma', () => ({ default: prismaMock }));

vi.mock('../meta-capi.service', () => ({
  sendMetaEventAsync: (...args: unknown[]) => sendMetaEventAsync(...args),
  newEventId: () => 'uuid-de-teste',
}));

import {
  classifyAsaasEvent,
  methodFromBillingType,
  nextStateFor,
  paymentService,
  purchaseEventId,
  webhookEventKey,
} from '../payment.service';

/** Erro que o Prisma lança quando a chave única já existe. */
function uniqueViolation(): Error & { code: string } {
  return Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
}

const AGORA = new Date('2026-09-05T12:00:00Z');

function corpo(event: string, payment: Record<string, unknown> = {}) {
  return {
    id: `evt_${event}`,
    event,
    payment: { id: 'pay_1', customer: 'cus_1', subscription: 'sub_1', value: 1404, ...payment },
  };
}

function assinatura(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: 'org-1',
    status: 'active',
    pastDueSince: null,
    currentPeriodEnd: new Date('2026-10-05T12:00:00Z'),
    cancelAtPeriodEnd: false,
    billingInterval: 'monthly',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.webhookEvent.create.mockResolvedValue({ id: 'we-1' });
  prismaMock.webhookEvent.update.mockResolvedValue({});
  prismaMock.checkoutSession.findFirst.mockResolvedValue(null);
  prismaMock.checkoutSession.update.mockResolvedValue({});
  prismaMock.checkoutEvent.findMany.mockResolvedValue([]);
  prismaMock.payment.findUnique.mockResolvedValue(null);
  prismaMock.payment.upsert.mockResolvedValue({});
  prismaMock.subscription.findFirst.mockResolvedValue(assinatura());
  prismaMock.subscription.update.mockResolvedValue({});
  prismaMock.user.findFirst.mockResolvedValue({ email: 'dono@example.com' });
});

describe('classificação dos eventos do Asaas', () => {
  it('confirmado e recebido significam a mesma coisa para o acesso', () => {
    expect(classifyAsaasEvent('PAYMENT_CONFIRMED')).toBe('confirmed');
    expect(classifyAsaasEvent('PAYMENT_RECEIVED')).toBe('confirmed');
  });

  it('atraso, estorno e exclusão têm efeitos distintos', () => {
    expect(classifyAsaasEvent('PAYMENT_OVERDUE')).toBe('overdue');
    expect(classifyAsaasEvent('PAYMENT_REFUNDED')).toBe('refunded');
    expect(classifyAsaasEvent('PAYMENT_CHARGEBACK_REQUESTED')).toBe('refunded');
    expect(classifyAsaasEvent('PAYMENT_DELETED')).toBe('canceled');
  });

  it('o que não conhecemos é ruído, não erro', () => {
    expect(classifyAsaasEvent('PAYMENT_UPDATED')).toBe('unknown');
    expect(classifyAsaasEvent(undefined)).toBe('unknown');
  });

  it('billingType vira o método do nosso domínio', () => {
    expect(methodFromBillingType('PIX')).toBe('pix');
    expect(methodFromBillingType('CREDIT_CARD')).toBe('credit_card');
    expect(methodFromBillingType('BOLETO')).toBe('boleto');
    expect(methodFromBillingType('UNDEFINED')).toBeNull();
  });

  it('a chave de deduplicação prefere o id do evento e nunca é aleatória', () => {
    expect(webhookEventKey({ id: 'evt_1', event: 'PAYMENT_CONFIRMED' })).toBe('evt_1');
    expect(webhookEventKey({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_9' } })).toBe(
      'PAYMENT_CONFIRMED:pay_9'
    );
    expect(webhookEventKey({})).toBeNull();
  });
});

describe('máquina de estados (função pura)', () => {
  const atual = { status: 'active', pastDueSince: null, currentPeriodEnd: null, cancelAtPeriodEnd: false };

  it('pagamento confirmado ativa e empurra o fim do período', () => {
    const t = nextStateFor('confirmed', atual, 'yearly', AGORA)!;
    expect(t.subscription.status).toBe('active');
    expect(t.subscription.pastDueSince).toBeNull();
    expect(t.subscription.currentPeriodEnd?.toISOString()).toBe('2027-09-05T12:00:00.000Z');
    expect(t.paymentStatus).toBe('confirmed');
    expect(t.paidAt).toEqual(AGORA);
  });

  it('atraso NÃO cancela: liga a carência', () => {
    const t = nextStateFor('overdue', atual, 'monthly', AGORA)!;
    expect(t.subscription.status).toBe('past_due');
    expect(t.subscription.pastDueSince).toEqual(AGORA);
    expect(t.paymentStatus).toBe('failed');
  });

  it('reenvio de atraso não empurra o início da carência', () => {
    // Se cada reenvio adiasse `pastDueSince`, a carência nunca venceria e o
    // devedor usaria o produto para sempre.
    const inicio = new Date('2026-09-01T00:00:00Z');
    const t = nextStateFor('overdue', { ...atual, pastDueSince: inicio }, 'monthly', AGORA)!;
    expect(t.subscription.pastDueSince).toEqual(inicio);
  });

  it('estorno cancela na hora, sem carência', () => {
    const t = nextStateFor('refunded', atual, 'monthly', AGORA)!;
    expect(t.subscription.status).toBe('canceled');
    expect(t.paymentStatus).toBe('refunded');
    expect(t.refundedAt).toEqual(AGORA);
  });

  it('cobrança excluída não mexe no status da assinatura', () => {
    const t = nextStateFor('canceled', { ...atual, status: 'active' }, 'monthly', AGORA)!;
    expect(t.subscription.status).toBe('active');
    expect(t.paymentStatus).toBe('canceled');
  });

  it('evento desconhecido não produz transição', () => {
    expect(nextStateFor('unknown', atual, 'monthly', AGORA)).toBeNull();
  });
});

describe('idempotência do webhook', () => {
  it('grava o evento cru ANTES de processar', async () => {
    await paymentService.handleAsaasWebhook(corpo('PAYMENT_CONFIRMED'), '{"cru":true}', AGORA);

    expect(prismaMock.webhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: 'asaas',
          eventId: 'evt_PAYMENT_CONFIRMED',
          status: 'received',
          payload: '{"cru":true}',
        }),
      })
    );
  });

  it('evento já processado responde sem reprocessar', async () => {
    prismaMock.webhookEvent.create.mockRejectedValueOnce(uniqueViolation());
    prismaMock.webhookEvent.findUnique.mockResolvedValueOnce({ id: 'we-1', status: 'processed' });

    const res = await paymentService.handleAsaasWebhook(corpo('PAYMENT_CONFIRMED'), '{}', AGORA);

    expect(res.status).toBe('duplicate');
    // O ponto do teste: nada foi tocado uma segunda vez.
    expect(prismaMock.subscription.update).not.toHaveBeenCalled();
    expect(prismaMock.payment.upsert).not.toHaveBeenCalled();
    expect(sendMetaEventAsync).not.toHaveBeenCalled();
  });

  it('evento que ficou pela metade (`received`) é RETOMADO no reenvio', async () => {
    // Processo morto entre gravar e processar. O reenvio do Asaas é o que
    // conserta — por isso `received` não conta como já tratado.
    prismaMock.webhookEvent.create.mockRejectedValueOnce(uniqueViolation());
    prismaMock.webhookEvent.findUnique.mockResolvedValueOnce({ id: 'we-1', status: 'received' });

    const res = await paymentService.handleAsaasWebhook(corpo('PAYMENT_CONFIRMED'), '{}', AGORA);

    expect(res.status).toBe('processed');
    expect(prismaMock.subscription.update).toHaveBeenCalled();
  });

  it('evento desconhecido vira `ignored`, não erro', async () => {
    const res = await paymentService.handleAsaasWebhook(corpo('PAYMENT_UPDATED'), '{}', AGORA);

    expect(res.status).toBe('ignored');
    expect(prismaMock.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ignored' }) })
    );
  });

  it('falha no processamento marca `failed` e deixa o reenvio retomar', async () => {
    prismaMock.subscription.update.mockRejectedValueOnce(new Error('banco fora'));

    const res = await paymentService.handleAsaasWebhook(corpo('PAYMENT_CONFIRMED'), '{}', AGORA);

    expect(res.status).toBe('failed');
    expect(prismaMock.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) })
    );
  });
});

describe('efeito sobre assinatura e pagamento', () => {
  it('confirmação anual grava o CAIXA DO CICLO em centavos', async () => {
    prismaMock.subscription.findFirst.mockResolvedValue(assinatura({ billingInterval: 'yearly' }));

    await paymentService.handleAsaasWebhook(
      corpo('PAYMENT_CONFIRMED', { value: 1404, billingType: 'PIX' }),
      '{}',
      AGORA
    );

    const upsert = prismaMock.payment.upsert.mock.calls[0]?.[0];
    // R$ 1.404,00 do Asaas → 140400 centavos. Nunca o mensal equivalente.
    expect(upsert.create.amountCents).toBe(140400);
    expect(upsert.create.billingInterval).toBe('yearly');
    expect(upsert.create.method).toBe('pix');
    expect(upsert.create.status).toBe('confirmed');

    const sub = prismaMock.subscription.update.mock.calls[0]?.[0];
    expect(sub.data.status).toBe('active');
    expect(sub.data.currentPeriodEnd.toISOString()).toBe('2027-09-05T12:00:00.000Z');
  });

  it('atraso deixa a assinatura em carência, com o relógio ligado', async () => {
    await paymentService.handleAsaasWebhook(corpo('PAYMENT_OVERDUE'), '{}', AGORA);

    const sub = prismaMock.subscription.update.mock.calls[0]?.[0];
    expect(sub.data.status).toBe('past_due');
    expect(sub.data.pastDueSince).toEqual(AGORA);
  });

  it('cobrança sem assinatura correspondente não vira erro', async () => {
    prismaMock.subscription.findFirst.mockResolvedValue(null);

    const res = await paymentService.handleAsaasWebhook(corpo('PAYMENT_CONFIRMED'), '{}', AGORA);

    // `processed`: entendemos o evento e concluímos que não há o que fazer.
    // Devolver erro faria o Asaas reenviar para sempre.
    expect(res.status).toBe('processed');
    expect(prismaMock.subscription.update).not.toHaveBeenCalled();
  });
});

describe('eventos de conversão (Meta CAPI)', () => {
  it('dispara Purchase e Subscribe com o valor do ciclo em REAIS', async () => {
    prismaMock.subscription.findFirst.mockResolvedValue(assinatura({ billingInterval: 'yearly' }));

    await paymentService.handleAsaasWebhook(corpo('PAYMENT_CONFIRMED', { value: 1404 }), '{}', AGORA);

    const nomes = sendMetaEventAsync.mock.calls.map((call) => (call[0] as { eventName: string }).eventName);
    expect(nomes).toEqual(['Purchase', 'Subscribe']);

    const purchase = sendMetaEventAsync.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(purchase.value).toBe(1404);
    expect(purchase.currency).toBe('BRL');
    expect(purchase.actionSource).toBe('system_generated');
    expect((purchase.userData as { externalId: string }).externalId).toBe('org-1');
  });

  it('o event_id é DERIVADO da cobrança: reenvio não conta a venda duas vezes', () => {
    // Com `newEventId()` a cada reenvio, cada entrega viraria uma conversão nova
    // no Meta e o custo por resultado do painel cairia pela metade.
    expect(purchaseEventId('pay_1')).toBe('purchase-pay_1');
    expect(purchaseEventId('pay_1')).toBe(purchaseEventId('pay_1'));
  });

  it('atraso não dispara evento de conversão', async () => {
    await paymentService.handleAsaasWebhook(corpo('PAYMENT_OVERDUE'), '{}', AGORA);
    expect(sendMetaEventAsync).not.toHaveBeenCalled();
  });

  it('usa o metaEventId guardado no checkout, não um id novo', async () => {
    // Sem isto, o Purchase do servidor nasce com id diferente do que o Pixel do
    // navegador usou e a Meta conta a MESMA venda duas vezes — o custo por
    // resultado do painel aparece pela metade, sem erro nenhum no caminho.
    prismaMock.checkoutSession.findFirst.mockResolvedValue({
      id: 'sess-1',
      status: 'payment_pending',
      email: 'fulana@example.com',
      phone: null,
      document: '12345678909',
      organizationId: null,
      amountCents: 11700,
      billingInterval: 'yearly',
      planCode: 'loja',
      screens: 3,
      paidAt: null,
      paymentAt: null,
    });
    prismaMock.checkoutSession.findUnique.mockResolvedValue({
      id: 'sess-1',
      status: 'payment_pending',
      amountCents: 11700,
      billingInterval: 'yearly',
      planCode: 'loja',
      screens: 3,
      paymentAt: null,
    });
    prismaMock.checkoutEvent.findMany.mockResolvedValue([
      {
        metadata: JSON.stringify({
          metaEventId: 'evento-do-navegador',
          fbp: 'fb.1.123.456',
          fbc: 'fb.1.123.abc',
        }),
      },
    ]);

    await paymentService.handleAsaasWebhook(corpo('PAYMENT_CONFIRMED'), '{}', AGORA);

    const purchase = sendMetaEventAsync.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(purchase.eventId).toBe('evento-do-navegador');
    expect(purchase.userData).toMatchObject({ fbp: 'fb.1.123.456', fbc: 'fb.1.123.abc' });
    // Valor do CICLO em reais: o que o Asaas cobrou.
    expect(purchase.value).toBe(1404);
  });

  it('sem metaEventId guardado, cai no id derivado da cobrança', async () => {
    prismaMock.checkoutEvent.findMany.mockResolvedValue([{ metadata: '{"method":"pix"}' }]);

    await paymentService.handleAsaasWebhook(corpo('PAYMENT_CONFIRMED'), '{}', AGORA);

    const purchase = sendMetaEventAsync.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(purchase.eventId).toBe('purchase-pay_1');
  });
});
