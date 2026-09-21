import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Provisionamento pós-pagamento: o que a assinatura e o `Payment` recebem.
//
// Complementa `paid.handler.test.ts` (que roda contra o banco e cobre a
// idempotência do fluxo). Aqui tudo é dublê, porque o alvo é aritmética de
// cobrança — e essa precisa continuar coberta mesmo com o Docker parado.
//
// O defeito que estes testes prendem: sessão ANUAL provisionando assinatura
// MENSAL. Quem comprava 12 meses adiantados via o ciclo vencer em 30 dias.
// ─────────────────────────────────────────────────────────────────────────────

const { prismaMock, auditOnce, sendPurchaseConfirmationEmail } = vi.hoisted(() => {
  const tx = {
    organization: { create: vi.fn() },
    user: { create: vi.fn(), findUnique: vi.fn() },
    subscription: { create: vi.fn() },
    checkoutSession: { update: vi.fn() },
  };

  return {
    prismaMock: {
      tx,
      checkoutSession: { findUnique: vi.fn(), update: vi.fn() },
      user: { findUnique: vi.fn() },
      subscription: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      payment: { upsert: vi.fn() },
      plan: { findUnique: vi.fn() },
      $transaction: vi.fn(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
    },
    auditOnce: vi.fn(async (..._args: unknown[]) => true),
    sendPurchaseConfirmationEmail: vi.fn(async (..._args: unknown[]) => {}),
  };
});

vi.mock('../../lib/prisma', () => ({ default: prismaMock }));
vi.mock('../checkout-handlers/shared', () => ({
  auditOnce: (...args: unknown[]) => auditOnce(...args),
  CHECKOUT_EVENT_ENTITY_TYPE: 'checkout_event',
  parseMetadata: () => ({}),
}));
vi.mock('../email.service', () => ({
  sendPurchaseConfirmationEmail: (...args: unknown[]) => sendPurchaseConfirmationEmail(...args),
}));
vi.mock('../auth.service', () => ({ hashPassword: async () => 'hash-fake' }));

import type { CheckoutEvent, CheckoutSession } from '@prisma/client';

import { paidHandler } from '../checkout-handlers/paid.handler';

const AGORA = new Date('2026-09-05T12:00:00Z');

const PLANO = {
  id: 'plan-loja',
  code: 'loja',
  name: 'Loja',
  active: true,
  pricePerScreenCents: 4900,
  priceAnnualPerScreenCents: 3900,
  minScreens: 1,
  maxDevices: null,
  maxUsers: null,
  maxOrganizations: null,
  features: '["relatorios"]',
};

function sessao(overrides: Record<string, unknown> = {}): CheckoutSession {
  return {
    id: 'sess-1',
    planCode: 'loja',
    screens: 3,
    // MENSAL EQUIVALENTE: 3 telas × R$ 39 no anual.
    amountCents: 11700,
    billingInterval: 'monthly',
    name: 'Fulana de Tal',
    email: 'fulana@example.com',
    companyName: 'Mercado da Fulana',
    organizationId: null,
    paymentProvider: 'asaas',
    providerChargeId: 'pay_1',
    paymentMethod: 'pix',
    paidAt: AGORA,
    ...overrides,
  } as unknown as CheckoutSession;
}

async function provisionar(
  session: CheckoutSession,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  prismaMock.checkoutSession.findUnique.mockResolvedValue(session);
  await paidHandler.handle({
    event: { id: 'evt-1' } as CheckoutEvent,
    session,
    metadata,
    now: AGORA,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.plan.findUnique.mockResolvedValue(PLANO);
  prismaMock.user.findUnique.mockResolvedValue(null);
  prismaMock.subscription.findUnique.mockResolvedValue(null);
  prismaMock.payment.upsert.mockResolvedValue({});
  prismaMock.checkoutSession.update.mockResolvedValue({});
  prismaMock.tx.organization.create.mockResolvedValue({ id: 'org-1' });
  prismaMock.tx.user.create.mockResolvedValue({ id: 'user-1' });
  prismaMock.tx.user.findUnique.mockResolvedValue(null);
  prismaMock.tx.subscription.create.mockResolvedValue({});
  prismaMock.tx.checkoutSession.update.mockResolvedValue({});
});

describe('propagação do intervalo de cobrança', () => {
  it('sessão ANUAL gera assinatura anual com ciclo de 12 meses', async () => {
    await provisionar(sessao({ billingInterval: 'yearly' }));

    const criada = prismaMock.tx.subscription.create.mock.calls[0]?.[0];
    expect(criada.data.billingInterval).toBe('yearly');
    // Sem isto, o ciclo venceria em 05/10 e o cliente que pagou o ano seria
    // cobrado de novo em 30 dias.
    expect(criada.data.currentPeriodEnd.toISOString()).toBe('2027-09-05T12:00:00.000Z');
  });

  it('sessão MENSAL continua mensal', async () => {
    await provisionar(sessao({ billingInterval: 'monthly' }));

    const criada = prismaMock.tx.subscription.create.mock.calls[0]?.[0];
    expect(criada.data.billingInterval).toBe('monthly');
    expect(criada.data.currentPeriodEnd.toISOString()).toBe('2026-10-05T12:00:00.000Z');
  });

  it('intervalo inválido no banco cai em mensal, nunca em nada', async () => {
    await provisionar(sessao({ billingInterval: 'trimestral' }));
    expect(prismaMock.tx.subscription.create.mock.calls[0]?.[0].data.billingInterval).toBe('monthly');
  });

  it('grava os ids do gateway que vieram no metadado do evento', async () => {
    await provisionar(sessao(), {
      gatewayCustomerId: 'cus_9',
      gatewaySubscriptionId: 'sub_9',
    });

    const criada = prismaMock.tx.subscription.create.mock.calls[0]?.[0];
    expect(criada.data.gateway).toBe('asaas');
    expect(criada.data.gatewayCustomerId).toBe('cus_9');
    expect(criada.data.gatewaySubscriptionId).toBe('sub_9');
  });
});

describe('Payment.amountCents é o CAIXA DO CICLO', () => {
  it('anual: mensal equivalente × 12', async () => {
    await provisionar(sessao({ billingInterval: 'yearly' }));

    const upsert = prismaMock.payment.upsert.mock.calls[0]?.[0];
    // 11700 é o MENSAL EQUIVALENTE da sessão; o caixa do ano é 140400.
    expect(upsert.create.amountCents).toBe(140400);
    expect(upsert.create.billingInterval).toBe('yearly');
    expect(upsert.create.status).toBe('confirmed');
    expect(upsert.create.method).toBe('pix');
    expect(upsert.create.provider).toBe('asaas');
  });

  it('mensal: o valor da sessão, sem multiplicação', async () => {
    await provisionar(sessao({ billingInterval: 'monthly', amountCents: 14700 }));
    expect(prismaMock.payment.upsert.mock.calls[0]?.[0].create.amountCents).toBe(14700);
  });

  it('grava TELAS FATURADAS, respeitando o piso do plano', async () => {
    prismaMock.plan.findUnique.mockResolvedValue({ ...PLANO, minScreens: 5 });
    await provisionar(sessao({ screens: 3 }));
    // 3 telas ativas, piso de 5 → a conciliação tem que ver 5, que é o que a
    // fatura cobrou.
    expect(prismaMock.payment.upsert.mock.calls[0]?.[0].create.screens).toBe(5);
  });

  it('é idempotente pela cobrança do provedor', async () => {
    await provisionar(sessao());
    expect(prismaMock.payment.upsert.mock.calls[0]?.[0].where).toEqual({
      providerPaymentId: 'pay_1',
    });
  });

  it('sem id do provedor, a chave é derivada da sessão (nunca aleatória)', async () => {
    await provisionar(sessao({ providerChargeId: null, paymentProvider: null }));
    expect(prismaMock.payment.upsert.mock.calls[0]?.[0].where).toEqual({
      providerPaymentId: 'sessao_sess-1',
    });
    expect(prismaMock.payment.upsert.mock.calls[0]?.[0].create.provider).toBe('manual');
  });
});

describe('conta que já existe para o mesmo e-mail', () => {
  it('atualiza a assinatura existente com o intervalo contratado', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-9', organizationId: 'org-9' });
    prismaMock.subscription.findUnique.mockResolvedValue({ id: 'sub-9' });

    await provisionar(sessao({ billingInterval: 'yearly' }));

    const update = prismaMock.subscription.update.mock.calls[0]?.[0];
    expect(update.data.billingInterval).toBe('yearly');
    expect(update.data.status).toBe('active');
    // Compra nova desfaz cancelamento agendado e inadimplência: seria absurdo
    // manter marcada para encerrar uma conta que acabou de pagar.
    expect(update.data.cancelAtPeriodEnd).toBe(false);
    expect(update.data.pastDueSince).toBeNull();
    // E o `Payment` do ciclo continua sendo registrado nesse caminho.
    expect(prismaMock.payment.upsert).toHaveBeenCalled();
    // Não cria uma segunda organização para a mesma pessoa.
    expect(prismaMock.tx.organization.create).not.toHaveBeenCalled();
  });
});
