import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import crypto from 'crypto';
import express from 'express';
import request from 'supertest';

import prisma from '../../lib/prisma';
import checkoutRoutes from '../checkout.routes';

// App mínimo com apenas as rotas públicas desta frente — não depende do
// registro em `server.ts` (arquivo de outra frente de trabalho).
const app = express();
app.use(express.json());
app.use('/api/checkout', checkoutRoutes);

const SUFFIX = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const PLAN_LOJA = `loja-${SUFFIX}`;
const PLAN_REDE = `rede-${SUFFIX}`;
const PLAN_GRATIS = `gratis-${SUFFIX}`;

const createdPlanIds: string[] = [];
const tokens: string[] = [];

function token(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function makePlan(code: string, pricePerScreenCents: number, minScreens: number, features = '[]') {
  const plan = await prisma.plan.create({
    data: {
      code,
      name: code,
      pricePerScreenCents,
      minScreens,
      maxDevices: null,
      maxUsers: null,
      maxOrganizations: null,
      features,
      active: true,
    },
  });
  createdPlanIds.push(plan.id);
  return plan;
}

/** Cria a sessão pela rota pública (caminho real do visitante). */
async function startSession(body: Record<string, unknown> = {}) {
  const res = await request(app).post('/api/checkout/sessions').send(body);
  expect(res.status).toBe(201);
  tokens.push(res.body.session.publicToken);
  return res.body.session;
}

beforeAll(async () => {
  await makePlan(PLAN_LOJA, 4900, 1);
  await makePlan(PLAN_REDE, 3900, 5);
  await makePlan(PLAN_GRATIS, 0, 1);
});

afterAll(async () => {
  await prisma.checkoutSession.deleteMany({ where: { publicToken: { in: tokens } } });
  await prisma.checkoutSession.deleteMany({ where: { utmSource: SUFFIX } });
  await prisma.plan.deleteMany({ where: { id: { in: createdPlanIds } } });
});

describe('POST /api/checkout/sessions', () => {
  it('cria sessão anônima na primeira visita, sem nenhum dado pessoal', async () => {
    const session = await startSession();

    expect(session.status).toBe('started');
    expect(session.publicToken).toMatch(/^[0-9a-f]{64}$/);
    expect(session.name).toBeNull();
    expect(session.email).toBeNull();
    expect(session.screens).toBe(1);
    expect(session.amountCents).toBe(0);
    expect(session.expiresAt).toBeTruthy();

    const stored = await prisma.checkoutSession.findUnique({
      where: { publicToken: session.publicToken },
      include: { events: true },
    });
    expect(stored?.events.map((e) => e.type)).toEqual(['view']);
    // O token público não é o id interno — é ele que circula em link de recuperação.
    expect(session.publicToken).not.toBe(stored?.id);
  });

  it('grava hash do IP, nunca o IP cru', async () => {
    const res = await request(app)
      .post('/api/checkout/sessions')
      .set('User-Agent', 'Mozilla/5.0 (Teste)')
      .set('Referer', 'https://telahub.com.br/precos')
      .send({ utmSource: SUFFIX, utmCampaign: 'lancamento' });
    expect(res.status).toBe(201);
    const session = res.body.session;
    tokens.push(session.publicToken);

    const stored = await prisma.checkoutSession.findUnique({
      where: { publicToken: session.publicToken },
    });

    expect(stored?.ipHash).toBeTruthy();
    expect(stored?.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored?.ipHash).not.toContain('127.0.0.1');
    expect(stored?.ipHash).not.toContain('::1');
    expect(stored?.utmSource).toBe(SUFFIX);
    expect(stored?.userAgent).toBe('Mozilla/5.0 (Teste)');
    expect(stored?.referrer).toBe('https://telahub.com.br/precos');
  });

  it('já calcula o valor quando o plano vem na primeira visita', async () => {
    const session = await startSession({ planCode: PLAN_REDE, screens: 2 });

    // Piso de 5 telas do plano rede: 5 × R$ 39,00.
    expect(session.amountCents).toBe(19500);

    const stored = await prisma.checkoutSession.findUnique({
      where: { publicToken: session.publicToken },
      include: { events: true },
    });
    expect(stored?.events.map((e) => e.type).sort()).toEqual(['plan_selected', 'view']);
  });

  it('rejeita plano inexistente com 400', async () => {
    const res = await request(app)
      .post('/api/checkout/sessions')
      .send({ planCode: `nao-existe-${SUFFIX}` });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('plan_unavailable');
  });
});

describe('GET /api/checkout/sessions/:publicToken', () => {
  it('devolve o mínimo e não vaza campo interno', async () => {
    const created = await startSession({ planCode: PLAN_LOJA, screens: 3, utmSource: SUFFIX });

    const res = await request(app).get(`/api/checkout/sessions/${created.publicToken}`);

    expect(res.status).toBe(200);
    expect(res.body.session).toMatchObject({
      publicToken: created.publicToken,
      status: 'started',
      planCode: PLAN_LOJA,
      screens: 3,
      amountCents: 14700,
      amount: 147,
      currency: 'BRL',
    });

    for (const leaked of ['id', 'organizationId', 'ipHash', 'userAgent', 'utmSource', 'utmCampaign', 'referrer', 'events', 'paidAt', 'abandonedAt', 'recoveryChannel', 'recoveryNotifiedAt']) {
      expect(res.body.session).not.toHaveProperty(leaked);
    }
  });

  it('devolve 404 para token inexistente', async () => {
    const res = await request(app).get(`/api/checkout/sessions/${token()}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('session_not_found');
  });
});

describe('PATCH /api/checkout/sessions/:publicToken', () => {
  it('recalcula amountCents no servidor e ignora o valor enviado pelo cliente', async () => {
    const created = await startSession();

    const res = await request(app)
      .patch(`/api/checkout/sessions/${created.publicToken}`)
      .send({ planCode: PLAN_REDE, screens: 2, amountCents: 1, amount: 0.01 });

    expect(res.status).toBe(200);
    // max(2, minScreens 5) × 3900 — e não o 1 centavo mandado no corpo.
    expect(res.body.session.amountCents).toBe(19500);

    const stored = await prisma.checkoutSession.findUnique({
      where: { publicToken: created.publicToken },
    });
    expect(stored?.amountCents).toBe(19500);
  });

  it('plano grátis mantém o valor em zero mesmo com muitas telas', async () => {
    const created = await startSession();

    const res = await request(app)
      .patch(`/api/checkout/sessions/${created.publicToken}`)
      .send({ planCode: PLAN_GRATIS, screens: 10 });

    expect(res.status).toBe(200);
    expect(res.body.session.amountCents).toBe(0);
  });

  it('marca identifiedAt e avança para identified quando nome + e-mail chegam', async () => {
    const created = await startSession({ planCode: PLAN_LOJA });

    const res = await request(app)
      .patch(`/api/checkout/sessions/${created.publicToken}`)
      .send({
        name: 'Maria Souza',
        email: `MARIA-${SUFFIX}@Exemplo.com.br`,
        phone: '(11) 98888-7777',
        document: '123.456.789-09',
        companyName: 'Padaria Souza',
      });

    expect(res.status).toBe(200);
    expect(res.body.session.status).toBe('identified');
    expect(res.body.session.identifiedAt).toBeTruthy();
    // E-mail normalizado, telefone/documento sem máscara.
    expect(res.body.session.email).toBe(`maria-${SUFFIX}@exemplo.com.br`);
    expect(res.body.session.phone).toBe('11988887777');
    expect(res.body.session.document).toBe('12345678909');

    const stored = await prisma.checkoutSession.findUnique({
      where: { publicToken: created.publicToken },
      include: { events: true },
    });
    expect(stored?.events.map((e) => e.type)).toContain('identify');

    // Segundo PATCH não re-identifica nem duplica o evento.
    const again = await request(app)
      .patch(`/api/checkout/sessions/${created.publicToken}`)
      .send({ screens: 4 });
    expect(again.status).toBe(200);
    expect(again.body.session.identifiedAt).toBe(res.body.session.identifiedAt);

    const after = await prisma.checkoutSession.findUnique({
      where: { publicToken: created.publicToken },
      include: { events: true },
    });
    expect(after?.events.filter((e) => e.type === 'identify')).toHaveLength(1);
    expect(after?.events.filter((e) => e.type === 'screens_changed')).toHaveLength(1);
  });

  it('sessão abandonada volta ao status anterior e registra recovered', async () => {
    const created = await startSession({ planCode: PLAN_LOJA });
    await request(app)
      .patch(`/api/checkout/sessions/${created.publicToken}`)
      .send({ name: 'Joao Lima', email: `joao-${SUFFIX}@exemplo.com` });

    await prisma.checkoutSession.update({
      where: { publicToken: created.publicToken },
      data: { status: 'abandoned', abandonedAt: new Date() },
    });

    const res = await request(app)
      .patch(`/api/checkout/sessions/${created.publicToken}`)
      .send({ screens: 2 });

    expect(res.status).toBe(200);
    expect(res.body.session.status).toBe('identified');

    const stored = await prisma.checkoutSession.findUnique({
      where: { publicToken: created.publicToken },
      include: { events: true },
    });
    expect(stored?.abandonedAt).toBeNull();
    expect(stored?.events.map((e) => e.type)).toContain('recovered');
  });

  it('recusa alteração em sessão paga (409) e em sessão expirada (410)', async () => {
    const paidToken = token();
    tokens.push(paidToken);
    await prisma.checkoutSession.create({
      data: { publicToken: paidToken, status: 'paid', paidAt: new Date(), planCode: PLAN_LOJA, amountCents: 4900 },
    });

    const paid = await request(app).patch(`/api/checkout/sessions/${paidToken}`).send({ screens: 9 });
    expect(paid.status).toBe(409);
    expect(paid.body.code).toBe('session_already_paid');

    const expiredToken = token();
    tokens.push(expiredToken);
    await prisma.checkoutSession.create({
      data: {
        publicToken: expiredToken,
        status: 'started',
        // Vencida no relógio, mesmo antes do job passar por ela.
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const expired = await request(app).patch(`/api/checkout/sessions/${expiredToken}`).send({ screens: 9 });
    expect(expired.status).toBe(410);
    expect(expired.body.code).toBe('session_expired');
  });

  it('rejeita PATCH vazio e dado inválido com 400', async () => {
    const created = await startSession();

    const empty = await request(app).patch(`/api/checkout/sessions/${created.publicToken}`).send({});
    expect(empty.status).toBe(400);

    const invalid = await request(app)
      .patch(`/api/checkout/sessions/${created.publicToken}`)
      .send({ email: 'nao-e-email', screens: 0 });
    expect(invalid.status).toBe(400);
  });
});

describe('POST /api/checkout/sessions/:publicToken/submit', () => {
  it('marca payment_pending SEM criar assinatura paga nem organização', async () => {
    const created = await startSession({ planCode: PLAN_LOJA, screens: 2 });
    await request(app)
      .patch(`/api/checkout/sessions/${created.publicToken}`)
      .send({ name: 'Ana Paula', email: `ana-${SUFFIX}@exemplo.com`, phone: '11977776666' });

    const res = await request(app)
      .post(`/api/checkout/sessions/${created.publicToken}/submit`)
      .send({ paymentMethod: 'pix' });

    expect(res.status).toBe(200);
    expect(res.body.session.status).toBe('payment_pending');
    expect(res.body.session.paymentAt).toBeTruthy();
    expect(res.body.session.amountCents).toBe(9800);
    expect(res.body.payment).toMatchObject({ status: 'manual', gateway: null, charged: false, nextStep: 'contato-comercial' });
    expect(res.body.payment.message).toMatch(/comercial/i);

    const plan = await prisma.plan.findUnique({ where: { code: PLAN_LOJA } });
    // O ponto central: nada de plano pago concedido sem pagamento confirmado.
    expect(await prisma.subscription.count({ where: { planId: plan!.id } })).toBe(0);

    const stored = await prisma.checkoutSession.findUnique({
      where: { publicToken: created.publicToken },
      include: { events: true },
    });
    expect(stored?.status).toBe('payment_pending');
    expect(stored?.paidAt).toBeNull();
    expect(stored?.organizationId).toBeNull();
    expect(stored?.events.map((e) => e.type)).toContain('submit');
    expect(stored?.events.map((e) => e.type)).toContain('payment_selected');
  });

  it('recusa submit de sessão incompleta', async () => {
    const created = await startSession({ planCode: PLAN_LOJA });

    const res = await request(app).post(`/api/checkout/sessions/${created.publicToken}/submit`).send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('incomplete_session');
  });
});
