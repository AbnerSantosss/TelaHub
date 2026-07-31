import { afterAll, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';

import prisma from '../../lib/prisma';
import { generateToken } from '../../services/auth.service';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { enforceQuota, requireActiveSubscription } from '../../middlewares/quota.middleware';

// App de teste: expõe as duas guardas isoladamente.
const app = express();
app.use(express.json());
app.post('/protegido', authMiddleware, requireActiveSubscription, (_req, res) => {
  res.json({ ok: true });
});
app.post('/devices', authMiddleware, enforceQuota('device'), (_req, res) => {
  res.status(201).json({ ok: true });
});
app.post('/users', authMiddleware, enforceQuota('user'), (_req, res) => {
  res.status(201).json({ ok: true });
});

const SUFFIX = `quota-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const createdOrgIds: string[] = [];
const createdPlanIds: string[] = [];
const createdUserIds: string[] = [];

async function makePlan(
  code: string,
  limits: { maxDevices?: number | null; maxUsers?: number | null; pricePerScreenCents?: number }
) {
  const plan = await prisma.plan.create({
    data: {
      code: `${code}-${SUFFIX}`,
      name: code.toUpperCase(),
      pricePerScreenCents: limits.pricePerScreenCents ?? 4900,
      maxDevices: limits.maxDevices ?? null,
      maxUsers: limits.maxUsers ?? null,
      maxOrganizations: null,
      features: '[]',
      active: true,
    },
  });
  createdPlanIds.push(plan.id);
  return plan;
}

/** Cria org + assinatura + usuário admin e devolve o header Authorization. */
async function makeTenant(opts: {
  planId: string;
  status: string;
  trialEndsAt?: Date | null;
  linkedDevices?: number;
}) {
  const org = await prisma.organization.create({ data: { name: `Org ${SUFFIX}` } });
  createdOrgIds.push(org.id);

  await prisma.subscription.create({
    data: {
      organizationId: org.id,
      planId: opts.planId,
      status: opts.status,
      trialEndsAt: opts.trialEndsAt ?? null,
    },
  });

  const user = await prisma.user.create({
    data: {
      username: `u-${org.id.slice(0, 8)}`,
      email: `u-${org.id.slice(0, 8)}@telahub.test`,
      password: 'hash-irrelevante',
      role: 'admin',
      organizationId: org.id,
    },
  });
  createdUserIds.push(user.id);

  for (let i = 0; i < (opts.linkedDevices ?? 0); i++) {
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

describe('requireActiveSubscription', () => {
  it('libera assinatura do plano grátis (active, sem prazo) — freemium não expira', async () => {
    const plan = await makePlan('gratis-freemium', { maxDevices: 1, pricePerScreenCents: 0 });
    const { authHeader } = await makeTenant({
      planId: plan.id,
      status: 'active',
      trialEndsAt: null,
    });

    const res = await request(app).post('/protegido').set('Authorization', authHeader);
    expect(res.status).toBe(200);
  });

  it('libera trial promocional dentro do prazo (caminho não-padrão, ainda suportado)', async () => {
    const plan = await makePlan('ok', { maxDevices: 5 });
    const { authHeader } = await makeTenant({
      planId: plan.id,
      status: 'trialing',
      trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });

    const res = await request(app).post('/protegido').set('Authorization', authHeader);
    expect(res.status).toBe(200);
  });

  it('devolve 402 com trial promocional vencido', async () => {
    const plan = await makePlan('venc', { maxDevices: 5 });
    const { authHeader } = await makeTenant({
      planId: plan.id,
      status: 'trialing',
      trialEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    const res = await request(app).post('/protegido').set('Authorization', authHeader);
    expect(res.status).toBe(402);
    expect(res.body.code).toBe('subscription_inactive');
    expect(res.body.error).toMatch(/período promocional terminou/i);
    // Sempre oferece a volta ao plano grátis, nunca deixa a conta num beco sem saída.
    expect(res.body.error).toMatch(/Grátis/);
  });

  it('devolve 402 com assinatura past_due', async () => {
    const plan = await makePlan('pastdue', { maxDevices: 5 });
    const { authHeader } = await makeTenant({ planId: plan.id, status: 'past_due' });

    const res = await request(app).post('/protegido').set('Authorization', authHeader);
    expect(res.status).toBe(402);
    expect(res.body.error).toMatch(/fatura em aberto/i);
  });

  it('devolve 402 com assinatura canceled', async () => {
    const plan = await makePlan('cancelada', { maxDevices: 5 });
    const { authHeader } = await makeTenant({ planId: plan.id, status: 'canceled' });

    const res = await request(app).post('/protegido').set('Authorization', authHeader);
    expect(res.status).toBe(402);
    expect(res.body.error).toMatch(/cancelada/i);
  });
});

describe("enforceQuota('device')", () => {
  it('libera abaixo do limite', async () => {
    const plan = await makePlan('dev-livre', { maxDevices: 3 });
    const { authHeader } = await makeTenant({ planId: plan.id, status: 'active', linkedDevices: 2 });

    const res = await request(app).post('/devices').set('Authorization', authHeader);
    expect(res.status).toBe(201);
  });

  it('bloqueia com 403 exatamente no limite, nomeando limite e plano', async () => {
    const plan = await makePlan('dev-cheio', { maxDevices: 2 });
    const { authHeader } = await makeTenant({ planId: plan.id, status: 'active', linkedDevices: 2 });

    const res = await request(app).post('/devices').set('Authorization', authHeader);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'quota_exceeded', resource: 'device', limit: 2, used: 2 });
    expect(res.body.error).toContain('DEV-CHEIO');
    expect(res.body.error).toMatch(/telas ativas/);
  });

  it('não conta devices pendentes como telas ativas', async () => {
    const plan = await makePlan('dev-pendente', { maxDevices: 1 });
    const { org, authHeader } = await makeTenant({ planId: plan.id, status: 'active' });
    await prisma.device.create({ data: { organizationId: org.id, status: 'pending' } });

    const res = await request(app).post('/devices').set('Authorization', authHeader);
    expect(res.status).toBe(201);
  });

  it('nunca bloqueia quando o limite é null (ilimitado)', async () => {
    const plan = await makePlan('dev-ilimitado', { maxDevices: null });
    const { authHeader } = await makeTenant({ planId: plan.id, status: 'active', linkedDevices: 3 });

    const res = await request(app).post('/devices').set('Authorization', authHeader);
    expect(res.status).toBe(201);
  });
});

describe("enforceQuota('device') no plano grátis — regra anti-cobrança-retroativa", () => {
  it('libera a 1ª tela', async () => {
    const plan = await makePlan('gratis-1a', { maxDevices: 1, pricePerScreenCents: 0 });
    const { authHeader } = await makeTenant({ planId: plan.id, status: 'active' });

    const res = await request(app).post('/devices').set('Authorization', authHeader);
    expect(res.status).toBe(201);
  });

  it('bloqueia a 2ª tela com 403 explicando cobrança proporcional e não retroativa', async () => {
    const plan = await makePlan('gratis-2a', { maxDevices: 1, pricePerScreenCents: 0 });
    const { authHeader } = await makeTenant({
      planId: plan.id,
      status: 'active',
      linkedDevices: 1,
    });

    const res = await request(app).post('/devices').set('Authorization', authHeader);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      code: 'quota_exceeded',
      reason: 'free_plan_screen_limit',
      resource: 'device',
      limit: 1,
      used: 1,
    });

    // A mensagem tem que dizer, em pt-BR: qual tela dispara o upgrade, que a
    // cobrança é proporcional ao período e que nunca é retroativa. Não deve
    // prometer crédito perpétuo da 1ª tela dentro do plano pago — a fatura é
    // `max(telas ativas, minScreens) × preço` (ver quota.middleware.ts).
    expect(res.body.error).toMatch(/2ª tela/);
    expect(res.body.error).toMatch(/proporcional/i);
    expect(res.body.error).toMatch(/nunca retroativa/i);
    expect(res.body.error).toMatch(/sem prazo/i);
    // E precisa nomear o plano/preço sugerido.
    expect(res.body.error).toMatch(/plano Loja/);
    expect(res.body.error).toMatch(/R\$ 49,00/);

    expect(res.body.billing).toMatchObject({
      chargesFromScreen: 2,
      retroactive: false,
      proration: 'proporcional-ao-periodo',
      freeScreens: 1,
    });
    expect(res.body.billing.suggestedPlan).toMatchObject({
      code: 'loja',
      pricePerScreenCents: 4900,
      billedScreens: 2,
      estimatedMonthlyCents: 9800,
    });
  });

  it('upgrade de gratis para loja libera a 2ª tela (maxDevices ilimitado no plano pago)', async () => {
    const gratis = await prisma.plan.findUnique({ where: { code: 'gratis' } });
    const loja = await prisma.plan.findUnique({ where: { code: 'loja' } });
    if (!gratis || !loja) {
      throw new Error('Catálogo ausente. Rode "npm run db:seed-plans" antes dos testes.');
    }

    const { org, authHeader } = await makeTenant({
      planId: gratis.id,
      status: 'active',
      linkedDevices: 1,
    });

    // No plano grátis, a 2ª tela é bloqueada.
    const bloqueado = await request(app).post('/devices').set('Authorization', authHeader);
    expect(bloqueado.status).toBe(403);
    expect(bloqueado.body.reason).toBe('free_plan_screen_limit');

    await prisma.subscription.update({
      where: { organizationId: org.id },
      data: { planId: loja.id },
    });

    const liberado = await request(app).post('/devices').set('Authorization', authHeader);
    expect(liberado.status).toBe(201);
  });
});

describe("enforceQuota('user')", () => {
  it('bloqueia quando o número de usuários atinge o limite', async () => {
    const plan = await makePlan('user-cheio', { maxUsers: 1 });
    // makeTenant já cria 1 usuário admin → está no limite.
    const { authHeader } = await makeTenant({ planId: plan.id, status: 'active' });

    const res = await request(app).post('/users').set('Authorization', authHeader);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'quota_exceeded', resource: 'user', limit: 1, used: 1 });
  });

  it('libera quando ainda há vaga de usuário', async () => {
    const plan = await makePlan('user-livre', { maxUsers: 5 });
    const { authHeader } = await makeTenant({ planId: plan.id, status: 'active' });

    const res = await request(app).post('/users').set('Authorization', authHeader);
    expect(res.status).toBe(201);
  });
});
