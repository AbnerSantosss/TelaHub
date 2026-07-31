import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';

import prisma from '../../lib/prisma';
import signupRoutes from '../signup.routes';
import plansRoutes from '../plans.routes';

// App mínimo com apenas as rotas públicas desta frente — não depende do
// registro em `server.ts` (arquivo de outra frente de trabalho).
const app = express();
app.use(express.json());
app.use('/api/signup', signupRoutes);
app.use('/api/plans', plansRoutes);

const SUFFIX = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const EMAIL = `signup-${SUFFIX}@telahub.test`;
const COMPANY = `Empresa Signup ${SUFFIX}`;

const createdOrgIds: string[] = [];

beforeAll(async () => {
  // O plano `gratis` é pré-requisito do auto-cadastro (`npm run db:seed-plans`).
  const freePlan = await prisma.plan.findUnique({ where: { code: 'gratis' } });
  if (!freePlan) {
    throw new Error('Plano "gratis" ausente no banco. Rode "npm run db:seed-plans" antes dos testes.');
  }
});

afterAll(async () => {
  const orgs = await prisma.organization.findMany({
    where: { name: { startsWith: 'Empresa Signup ' } },
    select: { id: true },
  });
  const ids = [...new Set([...createdOrgIds, ...orgs.map((o) => o.id)])];
  await prisma.subscription.deleteMany({ where: { organizationId: { in: ids } } });
  await prisma.user.deleteMany({ where: { organizationId: { in: ids } } });
  await prisma.organization.deleteMany({ where: { id: { in: ids } } });
});

describe('POST /api/signup', () => {
  it('cria organização + usuário admin + assinatura no plano gratis (active, sem expiração) e devolve token', async () => {
    const res = await request(app).post('/api/signup').send({
      companyName: COMPANY,
      name: 'Fulano de Teste',
      email: EMAIL,
      password: 'senhaSegura123',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ email: EMAIL, role: 'admin' });
    expect(res.body.user.organizationId).toBeTruthy();
    expect(res.body.organization.name).toBe(COMPANY);
    expect(res.body.subscription).toMatchObject({ planCode: 'gratis', status: 'active' });
    // Freemium não expira: nem data de término, nem contagem de dias.
    expect(res.body.subscription.trialEndsAt).toBeNull();
    expect(res.body.subscription.trialDaysRemaining).toBe(0);
    // Nunca devolver o hash da senha.
    expect(res.body.user).not.toHaveProperty('password');

    const orgId = res.body.user.organizationId as string;
    createdOrgIds.push(orgId);

    const persisted = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { users: true, subscription: { include: { plan: true } } },
    });

    expect(persisted?.users).toHaveLength(1);
    expect(persisted?.users[0].role).toBe('admin');
    expect(persisted?.users[0].password).not.toBe('senhaSegura123');
    expect(persisted?.subscription?.status).toBe('active');
    expect(persisted?.subscription?.plan.code).toBe('gratis');
    expect(persisted?.subscription?.trialEndsAt).toBeNull();
    // 1 tela grátis para sempre.
    expect(persisted?.subscription?.plan.maxDevices).toBe(1);
  });

  it('recusa e-mail já cadastrado com 409 sem revelar dados da conta', async () => {
    const res = await request(app).post('/api/signup').send({
      companyName: `Empresa Signup ${SUFFIX} dup`,
      name: 'Outro Fulano',
      email: EMAIL,
      password: 'outraSenha123',
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('email_taken');
    expect(JSON.stringify(res.body)).not.toContain('Fulano de Teste');
    expect(res.body).not.toHaveProperty('user');
  });

  it('recusa senha com menos de 8 caracteres com 400', async () => {
    const res = await request(app).post('/api/signup').send({
      companyName: `Empresa Signup ${SUFFIX} curta`,
      name: 'Senha Curta',
      email: `curta-${SUFFIX}@telahub.test`,
      password: '1234567',
    });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.details)).toMatch(/8 caracteres/);
  });

  it('recusa payload incompleto com 400', async () => {
    const res = await request(app).post('/api/signup').send({ email: 'nao-email' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/signup/check-email', () => {
  it('reporta e-mail em uso e e-mail livre sem expor dados', async () => {
    const taken = await request(app).get('/api/signup/check-email').query({ email: EMAIL });
    expect(taken.status).toBe(200);
    expect(taken.body).toEqual({ available: false });

    const free = await request(app)
      .get('/api/signup/check-email')
      .query({ email: `livre-${SUFFIX}@telahub.test` });
    expect(free.body).toEqual({ available: true });
  });
});

describe('GET /api/plans', () => {
  it('lista planos ativos em formato público, sem campos de gateway', async () => {
    const res = await request(app).get('/api/plans');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.plans)).toBe(true);
    expect(res.body.currency).toBe('BRL');

    const gratis = res.body.plans.find((p: any) => p.code === 'gratis');
    expect(gratis).toMatchObject({
      pricePerScreenCents: 0,
      pricePerScreen: 0,
      free: true,
      quoteOnly: false,
      minScreens: 1,
    });
    expect(gratis.limits).toMatchObject({ maxDevices: 1, maxUsers: 1, maxOrganizations: 1 });
    // Porta de entrada: é o primeiro da lista.
    expect(res.body.plans[0].code).toBe('gratis');

    const loja = res.body.plans.find((p: any) => p.code === 'loja');
    expect(loja).toMatchObject({ pricePerScreenCents: 4900, pricePerScreen: 49, minScreens: 1, free: false });
    // Telas ilimitadas nos planos pagos: quem limita é a fatura por tela ativa.
    expect(loja.limits).toMatchObject({ maxDevices: null, maxUsers: 3, maxOrganizations: 1 });
    expect(loja.features).toContain('auditoria');

    const rede = res.body.plans.find((p: any) => p.code === 'rede');
    expect(rede).toMatchObject({ pricePerScreenCents: 3900, pricePerScreen: 39, minScreens: 5 });
    expect(rede.limits).toMatchObject({ maxDevices: null, maxUsers: 15, maxOrganizations: 10 });
    expect(rede.features).toContain('powerbi');

    const enterprise = res.body.plans.find((p: any) => p.code === 'enterprise');
    expect(enterprise.quoteOnly).toBe(true);
    expect(enterprise.free).toBe(false);
    expect(enterprise.limits).toMatchObject({ maxDevices: null, maxUsers: null, maxOrganizations: null });
    expect(enterprise.features).toContain('sso');

    // O plano `trial` foi descontinuado e não aparece mais no catálogo.
    expect(res.body.plans.find((p: any) => p.code === 'trial')).toBeUndefined();

    // Política comercial anti-cobrança-retroativa exposta ao frontend.
    expect(res.body.billingPolicy).toMatchObject({
      entryPlanCode: 'gratis',
      freeScreens: 1,
      trialDays: 0,
      creditCardRequired: false,
      chargesFromScreen: 2,
      retroactiveCharges: false,
    });

    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/gateway/i);
    expect(raw).not.toMatch(/"id"/);
  });
});
