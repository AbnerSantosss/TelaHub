import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import crypto from 'crypto';

import prisma from '../../lib/prisma';
import { FEATURE_QUOTE_ONLY } from '../plan.service';
import {
  ABANDON_AFTER_MS,
  CheckoutError,
  checkoutService,
  generatePublicToken,
  hashIp,
  stepOf,
} from '../checkout.service';
import { purgeCheckoutLeadData, runCheckoutSweep } from '../../jobs/checkout-abandon.job';

const SUFFIX = `chksvc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const PLAN_LOJA = `loja-${SUFFIX}`;
const PLAN_REDE = `rede-${SUFFIX}`;
const PLAN_GRATIS = `gratis-${SUFFIX}`;
const PLAN_ENTERPRISE = `enterprise-${SUFFIX}`;
const PLAN_INATIVO = `inativo-${SUFFIX}`;

const createdPlanIds: string[] = [];
const sessionIds: string[] = [];

async function makePlan(
  code: string,
  pricePerScreenCents: number,
  minScreens: number,
  opts: { features?: string; active?: boolean } = {}
) {
  const plan = await prisma.plan.create({
    data: {
      code,
      name: code,
      pricePerScreenCents,
      minScreens,
      maxDevices: null,
      maxUsers: null,
      maxOrganizations: null,
      features: opts.features ?? '[]',
      active: opts.active ?? true,
    },
  });
  createdPlanIds.push(plan.id);
  return plan;
}

async function seedSession(data: Record<string, unknown>) {
  const session = await prisma.checkoutSession.create({
    data: {
      publicToken: generatePublicToken(),
      screens: 2,
      ...data,
    } as never,
  });
  sessionIds.push(session.id);
  return session;
}

beforeAll(async () => {
  await makePlan(PLAN_LOJA, 4900, 1);
  await makePlan(PLAN_REDE, 3900, 5);
  await makePlan(PLAN_GRATIS, 0, 1);
  await makePlan(PLAN_ENTERPRISE, 0, 1, { features: JSON.stringify([FEATURE_QUOTE_ONLY]) });
  await makePlan(PLAN_INATIVO, 4900, 1, { active: false });
});

afterAll(async () => {
  await prisma.checkoutSession.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.plan.deleteMany({ where: { id: { in: createdPlanIds } } });
});

describe('hashIp / generatePublicToken', () => {
  it('hash é determinístico, não contém o IP e depende do sal', () => {
    const a = hashIp('203.0.113.7');
    const b = hashIp('203.0.113.7');
    const c = hashIp('203.0.113.8');

    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('203.0.113.7');
    expect(hashIp(null)).toBeNull();
  });

  it('token público é aleatório e longo (não sequencial)', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generatePublicToken()));
    expect(tokens.size).toBe(50);
    expect([...tokens][0]).toHaveLength(64);
  });
});

describe('computeAmountCents', () => {
  it('usa a mesma fórmula da assinatura: max(telas, minScreens) × preço', async () => {
    expect(await checkoutService.computeAmountCents(PLAN_LOJA, 3)).toBe(14700);
    // Piso de 5 telas do plano rede.
    expect(await checkoutService.computeAmountCents(PLAN_REDE, 2)).toBe(19500);
    expect(await checkoutService.computeAmountCents(PLAN_REDE, 10)).toBe(39000);
  });

  it('devolve 0 para plano grátis, sob consulta e sessão sem plano', async () => {
    expect(await checkoutService.computeAmountCents(PLAN_GRATIS, 10)).toBe(0);
    expect(await checkoutService.computeAmountCents(PLAN_ENTERPRISE, 10)).toBe(0);
    expect(await checkoutService.computeAmountCents(null, 10)).toBe(0);
  });

  it('recusa plano inexistente ou inativo', async () => {
    await expect(checkoutService.computeAmountCents(`nada-${SUFFIX}`, 1)).rejects.toBeInstanceOf(CheckoutError);
    await expect(checkoutService.computeAmountCents(PLAN_INATIVO, 1)).rejects.toMatchObject({
      status: 400,
      code: 'plan_unavailable',
    });
  });
});

describe('stepOf', () => {
  it('deduz o passo dos marcos, não do status', () => {
    expect(stepOf({ planCode: null, identifiedAt: null, paymentAt: null })).toBe('view');
    expect(stepOf({ planCode: 'loja', identifiedAt: null, paymentAt: null })).toBe('plan_selected');
    expect(stepOf({ planCode: 'loja', identifiedAt: new Date(), paymentAt: null })).toBe('identified');
    expect(stepOf({ planCode: 'loja', identifiedAt: new Date(), paymentAt: new Date() })).toBe('payment_pending');
  });
});

describe('submitSession não concede plano pago', () => {
  it('não cria nem altera Subscription', async () => {
    const session = await seedSession({
      status: 'identified',
      planCode: PLAN_LOJA,
      screens: 4,
      amountCents: 19600,
      name: 'Cliente Teste',
      email: `svc-${SUFFIX}@exemplo.com`,
      identifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await checkoutService.submitSession(session.publicToken, { paymentMethod: 'boleto' });

    // NÃO comparar `prisma.subscription.count()` global antes/depois: os
    // arquivos de teste rodam em paralelo e outros criam assinaturas (o helper
    // de tenant cria uma no plano grátis a cada organização). A contagem global
    // muda por fora e o teste falha sem que nada esteja errado — foi
    // exatamente o que aconteceu. As asserções abaixo são específicas desta
    // sessão e deste plano, e provam a mesma coisa sem corrida.
    expect(result.payment.charged).toBe(false);
    expect(result.session.status).toBe('payment_pending');

    const stored = await prisma.checkoutSession.findUnique({ where: { id: session.id } });
    expect(stored?.paidAt).toBeNull();
    expect(stored?.organizationId).toBeNull();

    const plan = await prisma.plan.findUnique({ where: { code: PLAN_LOJA } });
    expect(await prisma.subscription.count({ where: { planId: plan!.id } })).toBe(0);
  });
});

describe('markAbandonedSessions', () => {
  it('marca pelo lastSeenAt e preserva o passo em que parou', async () => {
    const stale = await seedSession({
      status: 'identified',
      planCode: PLAN_LOJA,
      amountCents: 9800,
      name: 'Lead Parado',
      email: `stale-${SUFFIX}@exemplo.com`,
      identifiedAt: new Date(Date.now() - 3 * ABANDON_AFTER_MS),
      lastSeenAt: new Date(Date.now() - 2 * ABANDON_AFTER_MS),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const fresh = await seedSession({
      status: 'started',
      lastSeenAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const count = await checkoutService.markAbandonedSessions();
    expect(count).toBeGreaterThanOrEqual(1);

    const staleAfter = await prisma.checkoutSession.findUnique({
      where: { id: stale.id },
      include: { events: true },
    });
    expect(staleAfter?.status).toBe('abandoned');
    expect(staleAfter?.abandonedAt).toBeTruthy();

    const event = staleAfter?.events.find((e) => e.type === 'abandoned');
    expect(event).toBeTruthy();
    expect(JSON.parse(event!.metadata!)).toMatchObject({
      fromStatus: 'identified',
      step: 'identified',
      amountCents: 9800,
    });

    // Quem acabou de interagir NÃO é abandono.
    const freshAfter = await prisma.checkoutSession.findUnique({ where: { id: fresh.id } });
    expect(freshAfter?.status).toBe('started');
  });

  it('não toca em sessão já paga', async () => {
    const paid = await seedSession({
      status: 'paid',
      planCode: PLAN_LOJA,
      amountCents: 4900,
      paidAt: new Date(),
      lastSeenAt: new Date(Date.now() - 10 * ABANDON_AFTER_MS),
    });

    await checkoutService.markAbandonedSessions();

    const after = await prisma.checkoutSession.findUnique({ where: { id: paid.id } });
    expect(after?.status).toBe('paid');
  });
});

describe('expiração e purga LGPD', () => {
  it('expira o que passou de expiresAt e anonimiza o lead não convertido', async () => {
    const expired = await seedSession({
      status: 'abandoned',
      planCode: PLAN_REDE,
      screens: 3,
      amountCents: 19500,
      name: 'Lead Vencido',
      email: `vencido-${SUFFIX}@exemplo.com`,
      phone: '11999998888',
      document: '12345678909',
      companyName: 'Empresa Vencida',
      utmSource: 'google',
      identifiedAt: new Date('2020-01-01T00:00:00.000Z'),
      lastSeenAt: new Date('2020-01-01T00:00:00.000Z'),
      expiresAt: new Date('2020-02-01T00:00:00.000Z'),
    });

    const converted = await seedSession({
      status: 'paid',
      planCode: PLAN_LOJA,
      amountCents: 4900,
      name: 'Cliente Convertido',
      email: `convertido-${SUFFIX}@exemplo.com`,
      paidAt: new Date('2020-01-15T00:00:00.000Z'),
      lastSeenAt: new Date('2020-01-15T00:00:00.000Z'),
      expiresAt: new Date('2020-02-01T00:00:00.000Z'),
    });

    const result = await runCheckoutSweep();
    expect(result.expired).toBeGreaterThanOrEqual(1);
    expect(result.anonymized).toBeGreaterThanOrEqual(1);

    const after = await prisma.checkoutSession.findUnique({ where: { id: expired.id } });
    expect(after?.status).toBe('expired');
    // Dado pessoal apagado…
    expect(after?.name).toBeNull();
    expect(after?.email).toBeNull();
    expect(after?.phone).toBeNull();
    expect(after?.document).toBeNull();
    expect(after?.ipHash).toBeNull();
    // …e as métricas agregadas preservadas.
    expect(after?.planCode).toBe(PLAN_REDE);
    expect(after?.screens).toBe(3);
    expect(after?.amountCents).toBe(19500);
    expect(after?.utmSource).toBe('google');
    expect(after?.identifiedAt).toBeTruthy();

    // Sessão convertida tem contrato: o dado dela NÃO é purgado por este job.
    const convertedAfter = await prisma.checkoutSession.findUnique({ where: { id: converted.id } });
    expect(convertedAfter?.status).toBe('paid');
    expect(convertedAfter?.email).toBe(`convertido-${SUFFIX}@exemplo.com`);
  });

  it('purgeCheckoutLeadData pode ser chamada isolada', async () => {
    const session = await seedSession({
      status: 'started',
      name: 'Outro Vencido',
      email: `outro-${SUFFIX}@exemplo.com`,
      lastSeenAt: new Date('2020-03-01T00:00:00.000Z'),
      expiresAt: new Date('2020-03-02T00:00:00.000Z'),
    });

    const purged = await purgeCheckoutLeadData();
    expect(purged).toBeGreaterThanOrEqual(1);

    const after = await prisma.checkoutSession.findUnique({ where: { id: session.id } });
    expect(after?.status).toBe('expired');
    expect(after?.email).toBeNull();
  });

  it('sessão vencida responde 410 em qualquer alteração', async () => {
    const session = await seedSession({
      status: 'started',
      lastSeenAt: new Date(),
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(checkoutService.updateSession(session.publicToken, { screens: 3 })).rejects.toMatchObject({
      status: 410,
      code: 'session_expired',
    });
    await expect(checkoutService.submitSession(session.publicToken)).rejects.toMatchObject({ status: 410 });
  });

  it('token desconhecido responde 404', async () => {
    await expect(
      checkoutService.getPublicSession(crypto.randomBytes(32).toString('hex'))
    ).rejects.toMatchObject({ status: 404, code: 'session_not_found' });
  });
});
