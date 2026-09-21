import { afterAll, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';

import prisma from '../../lib/prisma';
import billingRoutes from '../billing.routes';
import { generateToken } from '../../services/auth.service';

const app = express();
app.use(express.json());
app.use('/api/billing', billingRoutes);

const SUFFIX = `billing-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const createdOrgIds: string[] = [];
const createdPlanIds: string[] = [];
const createdUserIds: string[] = [];

async function makePlan(
  code: string,
  maxDevices: number | null,
  opts: {
    pricePerScreenCents?: number;
    priceAnnualPerScreenCents?: number;
    minScreens?: number;
  } = {}
) {
  const plan = await prisma.plan.create({
    data: {
      code: `${code}-${SUFFIX}`,
      name: code.toUpperCase(),
      pricePerScreenCents: opts.pricePerScreenCents ?? 4900,
      priceAnnualPerScreenCents: opts.priceAnnualPerScreenCents ?? 0,
      minScreens: opts.minScreens ?? 1,
      maxDevices,
      maxUsers: null,
      maxOrganizations: null,
      features: '["relatorios"]',
      active: true,
    },
  });
  createdPlanIds.push(plan.id);
  return plan;
}

async function makeTenant(
  planId: string,
  linkedDevices = 0,
  billingInterval: 'monthly' | 'yearly' = 'monthly'
) {
  const org = await prisma.organization.create({ data: { name: `Org ${SUFFIX}` } });
  createdOrgIds.push(org.id);

  await prisma.subscription.create({
    data: { organizationId: org.id, planId, status: 'active', gateway: null, billingInterval },
  });

  const user = await prisma.user.create({
    data: {
      username: `b-${org.id.slice(0, 8)}`,
      email: `b-${org.id.slice(0, 8)}@telahub.test`,
      password: 'hash',
      role: 'admin',
      organizationId: org.id,
    },
  });
  createdUserIds.push(user.id);

  for (let i = 0; i < linkedDevices; i++) {
    await prisma.device.create({ data: { organizationId: org.id, status: 'linked' } });
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    organizationId: org.id,
  });

  return { org, authHeader: `Bearer ${token}` };
}

afterAll(async () => {
  await prisma.device.deleteMany({ where: { organizationId: { in: createdOrgIds } } });
  await prisma.subscription.deleteMany({ where: { organizationId: { in: createdOrgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
  await prisma.plan.deleteMany({ where: { id: { in: createdPlanIds } } });
});

describe('GET /api/billing/subscription', () => {
  it('exige autenticação', async () => {
    const res = await request(app).get('/api/billing/subscription');
    expect(res.status).toBe(401);
  });

  it('devolve assinatura + uso sem expor ids de gateway', async () => {
    const plan = await makePlan('sub', 5);
    const { authHeader } = await makeTenant(plan.id, 2);

    const res = await request(app).get('/api/billing/subscription').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.subscription).toMatchObject({ status: 'active', isActive: true });
    expect(res.body.subscription.plan.code).toBe(plan.code);
    expect(res.body.usage.devices).toMatchObject({ used: 2, limit: 5, atLimit: false });
    expect(res.body.subscription).not.toHaveProperty('gatewayCustomerId');
    expect(res.body.subscription).not.toHaveProperty('gatewaySubscriptionId');

    // Fatura prevista: 2 telas ativas × R$ 49,00.
    expect(res.body.subscription.estimatedMonthly).toMatchObject({
      currency: 'BRL',
      activeScreens: 2,
      billedScreens: 2,
      cents: 9800,
      amount: 98,
      free: false,
      quoteOnly: false,
    });
  });

  it('respeita o piso de minScreens na fatura prevista (plano rede com 3 telas cobra 5)', async () => {
    const plan = await makePlan('rede-piso', null, { pricePerScreenCents: 3900, minScreens: 5 });
    const { authHeader } = await makeTenant(plan.id, 3);

    const res = await request(app).get('/api/billing/subscription').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.subscription.estimatedMonthly).toMatchObject({
      activeScreens: 3,
      billedScreens: 5,
      cents: 19500,
      amount: 195,
    });
    expect(res.body.usage).toMatchObject({ minScreens: 5, pricePerScreenCents: 3900, freePlan: false });
  });

  it('não prevê fatura para o plano grátis', async () => {
    const plan = await makePlan('gratuito', 1, { pricePerScreenCents: 0 });
    const { authHeader } = await makeTenant(plan.id, 1);

    const res = await request(app).get('/api/billing/subscription').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.subscription.estimatedMonthly).toMatchObject({
      activeScreens: 1,
      cents: 0,
      amount: 0,
      free: true,
    });
    expect(res.body.usage.freePlan).toBe(true);
  });
});

describe('GET /api/billing/subscription — oferta anual', () => {
  it('expõe o anual mesmo para quem está no mensal — é o que faz migrar', async () => {
    const plan = await makePlan('anual-oferta', null, {
      pricePerScreenCents: 4900,
      priceAnnualPerScreenCents: 3900,
    });
    const { authHeader } = await makeTenant(plan.id, 2);

    const res = await request(app).get('/api/billing/subscription').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.subscription.billingInterval).toBe('monthly');
    // Quem está no mensal continua sendo cobrado no mensal.
    expect(res.body.subscription.estimatedMonthly.cents).toBe(9800);
    expect(res.body.subscription.estimatedAnnual).toMatchObject({
      available: true,
      unitCents: 3900,
      monthlyEquivalentCents: 7800,
      totalCents: 93600,
      // 2 telas: R$ 98/mês × 12 = R$ 1.176 contra R$ 936 no anual.
      savingsCents: 24000,
    });
  });

  it('a assinatura anual é cobrada pelo preço anual', async () => {
    const plan = await makePlan('anual-ativo', null, {
      pricePerScreenCents: 4900,
      priceAnnualPerScreenCents: 3900,
    });
    const { authHeader } = await makeTenant(plan.id, 2, 'yearly');

    const res = await request(app).get('/api/billing/subscription').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.subscription.billingInterval).toBe('yearly');
    expect(res.body.subscription.estimatedMonthly.cents).toBe(7800);
  });

  it('plano sem oferta anual marca `available: false` e não inventa economia', async () => {
    const plan = await makePlan('sem-anual', null, { pricePerScreenCents: 4900 });
    const { authHeader } = await makeTenant(plan.id, 1);

    const res = await request(app).get('/api/billing/subscription').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.subscription.estimatedAnnual).toMatchObject({
      available: false,
      savingsCents: 0,
    });
    // Sem oferta, o "anual" é o próprio mensal — nunca R$ 0,00.
    expect(res.body.subscription.estimatedAnnual.monthlyEquivalentCents).toBe(4900);
  });

  it('o preço anual do plano viaja no payload — a landing não escreve preço à mão', async () => {
    const plan = await makePlan('anual-publico', null, {
      pricePerScreenCents: 4900,
      priceAnnualPerScreenCents: 3900,
    });
    const { authHeader } = await makeTenant(plan.id, 1);

    const res = await request(app).get('/api/billing/subscription').set('Authorization', authHeader);

    expect(res.body.subscription.plan).toMatchObject({
      priceAnnualPerScreenCents: 3900,
      priceAnnualPerScreen: 39,
    });
  });
});

describe('POST /api/billing/plan', () => {
  it('recusa com 400 o downgrade que estoura o limite do plano novo', async () => {
    const big = await makePlan('grande', 10);
    const small = await makePlan('pequeno', 1);
    const { authHeader } = await makeTenant(big.id, 3);

    const res = await request(app)
      .post('/api/billing/plan')
      .set('Authorization', authHeader)
      .send({ planCode: small.code });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('downgrade_blocked');
    expect(res.body.error).toMatch(/telas ativas/);
  });

  // Antes desta guarda, o teste aqui afirmava que o upgrade era aceito com 200:
  // era o próprio buraco de receita virando comportamento fixado. Subir de
  // plano é compra e passa pelo checkout.
  it('recusa com 402 o upgrade que relaxa limites (sem pagamento confirmado)', async () => {
    const from = await makePlan('de', 1);
    const to = await makePlan('para', 20);
    const { authHeader } = await makeTenant(from.id, 1);

    const res = await request(app)
      .post('/api/billing/plan')
      .set('Authorization', authHeader)
      .send({ planCode: to.code });

    expect(res.status).toBe(402);
    expect(res.body.code).toBe('payment_required');

    // E o plano no banco continua o antigo — nada de "quase trocou".
    const after = await prisma.subscription.findFirst({
      where: { planId: to.id },
    });
    expect(after).toBeNull();
  });

  it('recusa com 402 o upgrade que aumenta a fatura estimada', async () => {
    const barato = await makePlan('barato', null, { pricePerScreenCents: 1000 });
    const caro = await makePlan('caro', null, { pricePerScreenCents: 4900 });
    const { authHeader } = await makeTenant(barato.id, 2);

    const res = await request(app)
      .post('/api/billing/plan')
      .set('Authorization', authHeader)
      .send({ planCode: caro.code });

    expect(res.status).toBe(402);
    expect(res.body.code).toBe('payment_required');
  });

  // O Rede custa MENOS por tela que o Loja (R$ 39 x R$ 49) mas tem piso de 5
  // telas: comparar só o preço unitário leria isso como downgrade e entregaria
  // o plano superior de graça.
  it('recusa com 402 o upgrade para plano com preço unitário menor e piso maior', async () => {
    const loja = await makePlan('loja-sim', 3, { pricePerScreenCents: 4900, minScreens: 1 });
    const rede = await makePlan('rede-sim', 50, { pricePerScreenCents: 3900, minScreens: 5 });
    const { authHeader } = await makeTenant(loja.id, 2);

    const res = await request(app)
      .post('/api/billing/plan')
      .set('Authorization', authHeader)
      .send({ planCode: rede.code });

    expect(res.status).toBe(402);
    expect(res.body.code).toBe('payment_required');
  });

  it('aceita o downgrade que cabe no plano de destino', async () => {
    const caro = await makePlan('caro-down', 10, { pricePerScreenCents: 4900 });
    const barato = await makePlan('barato-down', 5, { pricePerScreenCents: 1900 });
    const { authHeader } = await makeTenant(caro.id, 1);

    const res = await request(app)
      .post('/api/billing/plan')
      .set('Authorization', authHeader)
      .send({ planCode: barato.code });

    expect(res.status).toBe(200);
    expect(res.body.subscription.plan.code).toBe(barato.code);
  });

  it('recusa plano inexistente com 400', async () => {
    const plan = await makePlan('atual', 5);
    const { authHeader } = await makeTenant(plan.id);

    const res = await request(app)
      .post('/api/billing/plan')
      .set('Authorization', authHeader)
      .send({ planCode: 'plano-que-nao-existe' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/billing/checkout', () => {
  it('devolve a URL do checkout com plano, telas e intervalo preenchidos', async () => {
    const plan = await makePlan('checkout', 5);
    const { authHeader } = await makeTenant(plan.id);

    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', authHeader)
      .send({ planCode: plan.code, screens: 3, interval: 'yearly' });

    expect(res.status).toBe(200);
    const url = new URL(res.body.checkoutUrl);
    expect(url.searchParams.get('plan')).toBe(plan.code);
    expect(url.searchParams.get('screens')).toBe('3');
    expect(url.searchParams.get('interval')).toBe('yearly');
  });

  it('sem intervalo, assume mensal', async () => {
    const plan = await makePlan('checkout-mensal', 5);
    const { authHeader } = await makeTenant(plan.id);

    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', authHeader)
      .send({ planCode: plan.code, screens: 2 });

    expect(res.status).toBe(200);
    expect(new URL(res.body.checkoutUrl).searchParams.get('interval')).toBe('monthly');
  });

  it('esta rota NÃO cobra: ela só monta o link', async () => {
    // A guarda que importa continua sendo a de `POST /plan`: nenhuma resposta
    // daqui pode conter confirmação de pagamento nem liberar plano.
    const plan = await makePlan('checkout-sem-cobranca', 5);
    const { authHeader } = await makeTenant(plan.id);

    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', authHeader)
      .send({ planCode: plan.code });

    expect(res.body).not.toHaveProperty('paid');
    expect(res.body).not.toHaveProperty('charge');
  });
});

describe('POST /api/billing/cancel e /reactivate', () => {
  it('cancela para o FIM DO CICLO, mantendo o acesso pago (CDC art. 51, IV)', async () => {
    const plan = await makePlan('cancelamento', 5);
    const { authHeader, org } = await makeTenant(plan.id);

    const fimDoCiclo = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    await prisma.subscription.update({
      where: { organizationId: org.id },
      data: { currentPeriodEnd: fimDoCiclo },
    });

    const res = await request(app)
      .post('/api/billing/cancel')
      .set('Authorization', authHeader)
      .send({ reason: 'fechei a loja' });

    expect(res.status).toBe(200);
    expect(res.body.cancelAtPeriodEnd).toBe(true);
    // O ponto: continua ATIVA até o fim do que foi pago.
    expect(res.body.status).toBe('active');
    expect(res.body.currentPeriodEnd).toBe(fimDoCiclo.toISOString());

    const salva = await prisma.subscription.findUnique({ where: { organizationId: org.id } });
    expect(salva?.cancelAtPeriodEnd).toBe(true);
    expect(salva?.canceledAt).not.toBeNull();
    expect(salva?.cancelReason).toBe('fechei a loja');
    expect(salva?.status).toBe('active');
  });

  it('cancelar sem motivo é permitido — pedir justificativa para sair é padrão escuro', async () => {
    const plan = await makePlan('cancelamento-sem-motivo', 5);
    const { authHeader } = await makeTenant(plan.id);

    const res = await request(app).post('/api/billing/cancel').set('Authorization', authHeader).send({});

    expect(res.status).toBe(200);
    expect(res.body.cancelAtPeriodEnd).toBe(true);
  });

  it('reativar desfaz o cancelamento enquanto o ciclo não terminou', async () => {
    const plan = await makePlan('reativacao', 5);
    const { authHeader, org } = await makeTenant(plan.id);

    await request(app).post('/api/billing/cancel').set('Authorization', authHeader).send({});
    const res = await request(app).post('/api/billing/reactivate').set('Authorization', authHeader).send({});

    expect(res.status).toBe(200);
    expect(res.body.cancelAtPeriodEnd).toBe(false);

    const salva = await prisma.subscription.findUnique({ where: { organizationId: org.id } });
    expect(salva?.cancelAtPeriodEnd).toBe(false);
    expect(salva?.canceledAt).toBeNull();
  });

  it('assinatura já encerrada não volta por reativação: exige contratação nova', async () => {
    const plan = await makePlan('reativacao-encerrada', 5);
    const { authHeader, org } = await makeTenant(plan.id);

    await prisma.subscription.update({
      where: { organizationId: org.id },
      data: { status: 'canceled' },
    });

    const res = await request(app).post('/api/billing/reactivate').set('Authorization', authHeader).send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('subscription_ended');
  });
});
