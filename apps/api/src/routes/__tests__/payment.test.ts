import { afterAll, afterEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';

import prisma from '../../lib/prisma';
import checkoutRoutes from '../checkout.routes';

/**
 * Pagamento do checkout — provedor simulado.
 *
 * O que estes testes protegem: o caminho que termina criando conta com
 * assinatura ativa. Um defeito aqui não gera "dado errado", gera **acesso pago
 * liberado sem cobrança** — por isso as asserções são sobre o ESTADO no banco
 * (sessão, evento na fila do outbox) e não só sobre o corpo da resposta.
 *
 * Nenhum teste chama o tratador de provisionamento: a fronteira testada aqui
 * termina no evento `paid` gravado e pendente. Quem prova o outro lado é
 * `services/__tests__/paid.handler.test.ts`.
 */

const app = express();
app.use(express.json());
app.use('/api/checkout', checkoutRoutes);

const SUFFIX = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const sessionIds: string[] = [];
const planIds: string[] = [];

/** Visa de teste, Luhn válido. */
const VALID_CARD = { number: '4111111111111111', holder: 'FULANO DE TESTE', expiry: '12/30', cvv: '123' };
/**
 * Luhn VÁLIDO e terminado em 0000 — o simulador recusa por regra de negócio,
 * não por número malformado. A distinção importa: se o número fosse inválido,
 * o teste passaria pelo caminho de validação (400) e nunca exercitaria a
 * recusa do provedor, que é o que se quer provar aqui.
 */
const DECLINED_CARD = { ...VALID_CARD, number: '4111111111170000' };

async function makePlan() {
  const plan = await prisma.plan.create({
    data: {
      code: `pay-loja-${SUFFIX}-${planIds.length}`,
      name: 'Loja Teste',
      pricePerScreenCents: 4900,
      minScreens: 1,
      maxDevices: null,
      maxUsers: null,
      maxOrganizations: null,
      features: '[]',
      active: true,
    },
  });
  planIds.push(plan.id);
  return plan;
}

/** Sessão pronta para pagar: identificada, com plano e valor. */
async function makeSession(overrides: Record<string, unknown> = {}) {
  const plan = await makePlan();
  const session = await prisma.checkoutSession.create({
    data: {
      publicToken: `tok-${SUFFIX}-${sessionIds.length}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'identified',
      planCode: plan.code,
      screens: 3,
      amountCents: 14700,
      name: 'Fulano de Teste',
      email: `pay-${SUFFIX}-${sessionIds.length}@example.com`,
      phone: '5511999999999',
      ...overrides,
    },
  });
  sessionIds.push(session.id);
  return session;
}

const reload = (id: string) => prisma.checkoutSession.findUnique({ where: { id } });
const paidEvents = (sessionId: string) =>
  prisma.checkoutEvent.findMany({ where: { sessionId, type: 'paid' } });

afterEach(() => {
  delete process.env.PAYMENT_PROVIDER;
});

afterAll(async () => {
  await prisma.checkoutEvent.deleteMany({ where: { sessionId: { in: sessionIds } } });
  await prisma.checkoutSession.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.plan.deleteMany({ where: { id: { in: planIds } } });
});

describe('GET /api/checkout/payment-config', () => {
  it('declara que o provedor ativo é simulado e quais métodos aceita', async () => {
    const res = await request(app).get('/api/checkout/payment-config');

    expect(res.status).toBe(200);
    expect(res.body.simulated).toBe(true);
    // A tela precisa saber disso pelo SERVIDOR: um aviso de "sem cobrança real"
    // decidido no front seria a primeira coisa a ficar desatualizada quando o
    // gateway de verdade entrasse.
    expect(res.body.methods).toEqual(expect.arrayContaining(['pix', 'credit_card']));
  });
});

describe('POST /sessions/:token/pay — Pix', () => {
  it('devolve QR e deixa a sessão pendente, NÃO paga', async () => {
    const session = await makeSession();

    const res = await request(app)
      .post(`/api/checkout/sessions/${session.publicToken}/pay`)
      .send({ method: 'pix' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body.paid).toBe(false);
    expect(res.body.pix.copyPaste).toBeTruthy();
    expect(res.body.pix.qrCodeDataUri).toMatch(/^data:image\/svg\+xml;base64,/);

    const after = await reload(session.id);
    expect(after!.status).toBe('payment_pending');
    expect(after!.paymentMethod).toBe('pix');
    // Cobrança criada não é cobrança paga: nada de evento `paid` aqui.
    expect(await paidEvents(session.id)).toHaveLength(0);
  });
});

describe('POST /sessions/:token/pay — cartão', () => {
  it('aprova, marca a sessão paga e ENFILEIRA o evento que provisiona a conta', async () => {
    const session = await makeSession();

    const res = await request(app)
      .post(`/api/checkout/sessions/${session.publicToken}/pay`)
      .send({ method: 'credit_card', card: VALID_CARD });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
    expect(res.body.paid).toBe(true);
    expect(res.body.card.last4).toBe('1111');

    const after = await reload(session.id);
    expect(after!.status).toBe('paid');
    expect(after!.paidAt).not.toBeNull();

    // O evento é o contrato com o resto do sistema. Tem de existir e estar
    // PENDENTE — se nascesse entregue, ninguém provisionaria a conta.
    const events = await paidEvents(session.id);
    expect(events).toHaveLength(1);
    expect(events[0].dispatchStatus).toBe('pending');
  });

  it('não persiste NENHUM dado do cartão na sessão', async () => {
    const session = await makeSession();

    await request(app)
      .post(`/api/checkout/sessions/${session.publicToken}/pay`)
      .send({ method: 'credit_card', card: VALID_CARD });

    const after = await reload(session.id);
    const dump = JSON.stringify(after);
    // Nem o número, nem o CVV, nem os últimos dígitos. Dado de cartão que não
    // é guardado não vaza e não entra no escopo de PCI-DSS.
    expect(dump).not.toContain(VALID_CARD.number);
    expect(dump).not.toContain('1111');
    expect(dump).not.toContain(VALID_CARD.cvv);
  });

  it('recusa o cartão de teste de recusa sem marcar a sessão como paga', async () => {
    const session = await makeSession();

    const res = await request(app)
      .post(`/api/checkout/sessions/${session.publicToken}/pay`)
      .send({ method: 'credit_card', card: DECLINED_CARD });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('declined');
    expect(res.body.paid).toBe(false);

    const after = await reload(session.id);
    expect(after!.status).not.toBe('paid');
    expect(await paidEvents(session.id)).toHaveLength(0);
  });

  it('rejeita número que não passa em Luhn', async () => {
    const session = await makeSession();

    const res = await request(app)
      .post(`/api/checkout/sessions/${session.publicToken}/pay`)
      .send({ method: 'credit_card', card: { ...VALID_CARD, number: '4111111111111112' } });

    expect(res.status).toBe(400);
  });

  it('exige os dados do cartão quando o método é cartão', async () => {
    const session = await makeSession();

    const res = await request(app)
      .post(`/api/checkout/sessions/${session.publicToken}/pay`)
      .send({ method: 'credit_card' });

    expect(res.status).toBe(400);
  });
});

describe('Regras de estado da sessão', () => {
  it('recusa pagar uma sessão já paga (409)', async () => {
    const session = await makeSession({ status: 'paid', paidAt: new Date() });

    const res = await request(app)
      .post(`/api/checkout/sessions/${session.publicToken}/pay`)
      .send({ method: 'pix' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('session_already_paid');
  });

  it('recusa pagar sem plano/identificação (400)', async () => {
    const session = await makeSession({ planCode: null, email: null });

    const res = await request(app)
      .post(`/api/checkout/sessions/${session.publicToken}/pay`)
      .send({ method: 'pix' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('session_incomplete');
  });

  it('recusa cobrar valor zero — plano sob consulta não passa por aqui', async () => {
    const session = await makeSession({ amountCents: 0 });

    const res = await request(app)
      .post(`/api/checkout/sessions/${session.publicToken}/pay`)
      .send({ method: 'pix' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('amount_not_payable');
  });
});

describe('POST /sessions/:token/simulate-payment', () => {
  it('confirma o Pix simulado e enfileira o provisionamento', async () => {
    const session = await makeSession();
    await request(app)
      .post(`/api/checkout/sessions/${session.publicToken}/pay`)
      .send({ method: 'pix' });

    const res = await request(app).post(
      `/api/checkout/sessions/${session.publicToken}/simulate-payment`
    );

    expect(res.status).toBe(200);
    expect(res.body.paid).toBe(true);
    expect(res.body.alreadyPaid).toBe(false);

    const after = await reload(session.id);
    expect(after!.status).toBe('paid');
    expect(await paidEvents(session.id)).toHaveLength(1);
  });

  it('é idempotente: confirmar duas vezes não duplica o evento', async () => {
    const session = await makeSession();
    await request(app)
      .post(`/api/checkout/sessions/${session.publicToken}/pay`)
      .send({ method: 'pix' });

    await request(app).post(`/api/checkout/sessions/${session.publicToken}/simulate-payment`);
    const second = await request(app).post(
      `/api/checkout/sessions/${session.publicToken}/simulate-payment`
    );

    expect(second.status).toBe(200);
    expect(second.body.alreadyPaid).toBe(true);
    // Webhook de gateway reentrega por projeto. Dois eventos `paid` virariam
    // duas tentativas de provisionar a mesma compra.
    expect(await paidEvents(session.id)).toHaveLength(1);
  });

  it('SOME quando o provedor ativo não é simulado', async () => {
    const session = await makeSession();
    // Um provedor real configurado tem que apagar a porta dos fundos por
    // construção — não por disciplina de quem faz o deploy.
    process.env.PAYMENT_PROVIDER = 'asaas';

    const res = await request(app).post(
      `/api/checkout/sessions/${session.publicToken}/simulate-payment`
    );

    // 503 quando o Asaas está selecionado mas sem `ASAAS_API_KEY` (o provedor
    // nem resolve); 404 quando resolve, porque a porta dos fundos só existe no
    // provedor simulado. O que importa nos dois casos é que NÃO confirma
    // pagamento — a trava é por construção, não por disciplina de deploy.
    expect([404, 503]).toContain(res.status);

    const after = await reload(session.id);
    expect(after!.status).not.toBe('paid');
  });
});
