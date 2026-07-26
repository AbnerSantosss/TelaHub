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
  opts: { pricePerScreenCents?: number; minScreens?: number } = {}
) {
  const plan = await prisma.plan.create({
    data: {
      code: `${code}-${SUFFIX}`,
      name: code.toUpperCase(),
      pricePerScreenCents: opts.pricePerScreenCents ?? 4900,
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

async function makeTenant(planId: string, linkedDevices = 0) {
  const org = await prisma.organization.create({ data: { name: `Org ${SUFFIX}` } });
  createdOrgIds.push(org.id);

  await prisma.subscription.create({
    data: { organizationId: org.id, planId, status: 'active', gateway: null },
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

  it('aceita upgrade e devolve o plano novo', async () => {
    const from = await makePlan('de', 1);
    const to = await makePlan('para', 20);
    const { authHeader } = await makeTenant(from.id, 1);

    const res = await request(app)
      .post('/api/billing/plan')
      .set('Authorization', authHeader)
      .send({ planCode: to.code });

    expect(res.status).toBe(200);
    expect(res.body.subscription.plan.code).toBe(to.code);
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
  it('devolve 501 — gateway ainda não integrado (sem simular pagamento)', async () => {
    const plan = await makePlan('checkout', 5);
    const { authHeader } = await makeTenant(plan.id);

    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', authHeader)
      .send({ planCode: plan.code, screens: 3 });

    expect(res.status).toBe(501);
    expect(res.body.code).toBe('gateway_not_integrated');
    expect(res.body).not.toHaveProperty('checkoutUrl');
  });
});
