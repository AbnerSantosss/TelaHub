import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import prisma from '../../lib/prisma';
import {
  FREE_PLAN_CODE,
  TRIAL_DAYS,
  billedScreens,
  estimateMonthlyCents,
  isActive,
  isFreePlan,
  subscriptionService,
  trialDaysRemaining,
  trialEndDate,
} from '../../services/subscription.service';
import { hasFeature, parseFeatures } from '../../services/plan.service';

// ── Helpers de fixture ───────────────────────────────────────────────────────

const SUFFIX = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const createdOrgIds: string[] = [];
const createdPlanIds: string[] = [];

async function makePlan(opts: {
  code: string;
  pricePerScreenCents?: number;
  minScreens?: number;
  maxDevices?: number | null;
  maxUsers?: number | null;
  maxOrganizations?: number | null;
  features?: string[];
}) {
  const plan = await prisma.plan.create({
    data: {
      code: `${opts.code}-${SUFFIX}`,
      name: opts.code.toUpperCase(),
      pricePerScreenCents: opts.pricePerScreenCents ?? 4900,
      minScreens: opts.minScreens ?? 1,
      maxDevices: opts.maxDevices ?? null,
      maxUsers: opts.maxUsers ?? null,
      maxOrganizations: opts.maxOrganizations ?? null,
      features: JSON.stringify(opts.features ?? ['widgets-basicos']),
      active: true,
    },
  });
  createdPlanIds.push(plan.id);
  return plan;
}

async function makeOrgWithSubscription(planId: string) {
  const org = await prisma.organization.create({ data: { name: `Org ${SUFFIX}` } });
  createdOrgIds.push(org.id);
  await prisma.subscription.create({
    data: { organizationId: org.id, planId, status: 'active' },
  });
  return org;
}

afterAll(async () => {
  await prisma.device.deleteMany({ where: { organizationId: { in: createdOrgIds } } });
  await prisma.subscription.deleteMany({ where: { organizationId: { in: createdOrgIds } } });
  await prisma.user.deleteMany({ where: { organizationId: { in: createdOrgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
  await prisma.plan.deleteMany({ where: { id: { in: createdPlanIds } } });
});

// ── Testes puros ─────────────────────────────────────────────────────────────

describe('isActive', () => {
  const now = new Date('2026-07-25T12:00:00Z');

  it('aceita status active', () => {
    expect(isActive({ status: 'active', trialEndsAt: null }, now)).toBe(true);
  });

  it('assinatura do plano grátis (active, sem trialEndsAt) nunca expira', () => {
    const freeSub = { status: 'active', trialEndsAt: null };
    expect(isActive(freeSub, now)).toBe(true);
    // Dez anos depois, continua válida.
    expect(isActive(freeSub, new Date('2036-07-25T12:00:00Z'))).toBe(true);
  });

  it('aceita trial dentro do prazo', () => {
    expect(isActive({ status: 'trialing', trialEndsAt: new Date('2026-08-01') }, now)).toBe(true);
  });

  it('recusa trial vencido', () => {
    expect(isActive({ status: 'trialing', trialEndsAt: new Date('2026-07-01') }, now)).toBe(false);
  });

  it('recusa past_due e canceled', () => {
    expect(isActive({ status: 'past_due', trialEndsAt: null }, now)).toBe(false);
    expect(isActive({ status: 'canceled', trialEndsAt: null }, now)).toBe(false);
  });

  it('recusa assinatura ausente', () => {
    expect(isActive(null, now)).toBe(false);
  });
});

describe('estimateMonthlyCents / billedScreens', () => {
  const loja = { pricePerScreenCents: 4900, minScreens: 1, features: '["relatorios"]' };
  const rede = { pricePerScreenCents: 3900, minScreens: 5, features: '["powerbi"]' };
  const gratis = { pricePerScreenCents: 0, minScreens: 1, features: '["widgets-basicos"]' };
  const enterprise = { pricePerScreenCents: 0, minScreens: 1, features: '["sso","preco-sob-consulta"]' };

  it('multiplica telas ativas pelo preço por tela no plano loja', () => {
    expect(estimateMonthlyCents(loja, 1)).toBe(4900);
    expect(estimateMonthlyCents(loja, 3)).toBe(14700);
  });

  it('respeita minScreens: plano rede com 3 telas cobra 5', () => {
    expect(billedScreens(rede, 3)).toBe(5);
    expect(estimateMonthlyCents(rede, 3)).toBe(5 * 3900);
    // Acima do piso, cobra o número real de telas.
    expect(billedScreens(rede, 8)).toBe(8);
    expect(estimateMonthlyCents(rede, 8)).toBe(8 * 3900);
  });

  it('devolve 0 para plano grátis e para plano sob consulta', () => {
    expect(estimateMonthlyCents(gratis, 1)).toBe(0);
    expect(estimateMonthlyCents(enterprise, 50)).toBe(0);
  });

  it('nunca devolve valor negativo nem cobra menos que o piso com 0 telas', () => {
    expect(estimateMonthlyCents(loja, 0)).toBe(4900);
    expect(estimateMonthlyCents(rede, 0)).toBe(5 * 3900);
  });

  it('isFreePlan distingue grátis de sob consulta', () => {
    expect(isFreePlan(gratis)).toBe(true);
    expect(isFreePlan(enterprise)).toBe(false);
    expect(isFreePlan(loja)).toBe(false);
  });
});

describe('trialEndDate / trialDaysRemaining (trial promocional, não o caminho padrão)', () => {
  it(`soma ${TRIAL_DAYS} dias`, () => {
    const from = new Date('2026-07-25T00:00:00Z');
    expect(trialEndDate(from).toISOString()).toBe('2026-08-08T00:00:00.000Z');
  });

  it('conta os dias restantes e zera quando vencido', () => {
    const now = new Date('2026-07-25T00:00:00Z');
    expect(trialDaysRemaining({ status: 'trialing', trialEndsAt: new Date('2026-07-28T00:00:00Z') }, now)).toBe(3);
    expect(trialDaysRemaining({ status: 'trialing', trialEndsAt: new Date('2026-07-01T00:00:00Z') }, now)).toBe(0);
    expect(trialDaysRemaining({ status: 'active', trialEndsAt: null }, now)).toBe(0);
  });
});

describe('plan.service — features', () => {
  it('faz parse de JSON válido e tolera lixo', () => {
    expect(parseFeatures('["a","b"]')).toEqual(['a', 'b']);
    expect(parseFeatures('nao-json')).toEqual([]);
    expect(parseFeatures(null)).toEqual([]);
  });

  it('hasFeature funciona com assinatura+plano e com plano solto', () => {
    expect(hasFeature({ plan: { features: '["powerbi"]' } }, 'powerbi')).toBe(true);
    expect(hasFeature({ plan: { features: '["powerbi"]' } }, 'sso')).toBe(false);
    expect(hasFeature({ features: '["sso"]' }, 'sso')).toBe(true);
    expect(hasFeature(null, 'sso')).toBe(false);
  });
});

// ── Testes com banco ─────────────────────────────────────────────────────────

describe('getUsage', () => {
  it('devolve consumo contra os limites do plano', async () => {
    const plan = await makePlan({ code: 'usage', maxDevices: 3, maxUsers: 2 });
    const org = await makeOrgWithSubscription(plan.id);

    await prisma.device.create({ data: { organizationId: org.id, status: 'linked' } });
    // Device pendente não conta como tela ativa.
    await prisma.device.create({ data: { organizationId: org.id, status: 'pending' } });

    const usage = await subscriptionService.getUsage(org.id);

    expect(usage.devices).toMatchObject({ used: 1, limit: 3, atLimit: false });
    expect(usage.users).toMatchObject({ used: 0, limit: 2 });
    // Limite nulo = ilimitado.
    expect(usage.organizations.limit).toBe(null);
  });
});

describe('changePlan', () => {
  it('recusa downgrade quando o uso excede o limite do plano de destino', async () => {
    const big = await makePlan({ code: 'big', maxDevices: 10 });
    const small = await makePlan({ code: 'small', maxDevices: 1 });
    const org = await makeOrgWithSubscription(big.id);

    await prisma.device.createMany({
      data: [
        { organizationId: org.id, status: 'linked' },
        { organizationId: org.id, status: 'linked' },
        { organizationId: org.id, status: 'linked' },
      ],
    });

    await expect(subscriptionService.changePlan(org.id, small.code)).rejects.toThrow(
      /Não é possível mudar para o plano/i
    );

    // Continua no plano original.
    const after = await subscriptionService.requireByOrganization(org.id);
    expect(after.planId).toBe(big.id);
  });

  it('permite a troca quando o uso cabe no plano de destino', async () => {
    const from = await makePlan({ code: 'from', maxDevices: 1 });
    const to = await makePlan({ code: 'to', maxDevices: 5 });
    const org = await makeOrgWithSubscription(from.id);

    const updated = await subscriptionService.changePlan(org.id, to.code);
    expect(updated.planId).toBe(to.id);
  });
});

describe('cancel', () => {
  it('marca a assinatura como canceled e ela deixa de ser válida', async () => {
    const plan = await makePlan({ code: 'cancel' });
    const org = await makeOrgWithSubscription(plan.id);

    const canceled = await subscriptionService.cancel(org.id);
    expect(canceled.status).toBe('canceled');
    expect(isActive(canceled)).toBe(false);
  });
});

describe('createFreeSubscription', () => {
  beforeAll(async () => {
    // O catálogo é pré-requisito (`npm run db:seed-plans`).
    const freePlan = await prisma.plan.findUnique({ where: { code: FREE_PLAN_CODE } });
    if (!freePlan) {
      throw new Error(
        `Plano "${FREE_PLAN_CODE}" ausente no banco. Rode "npm run db:seed-plans" antes dos testes.`
      );
    }
  });

  it('cria assinatura active no plano gratis, sem prazo de expiração', async () => {
    const org = await prisma.organization.create({ data: { name: `Org gratis ${SUFFIX}` } });
    createdOrgIds.push(org.id);

    const sub = await subscriptionService.createFreeSubscription(org.id);
    expect(sub.status).toBe('active');
    expect(sub.trialEndsAt).toBeNull();
    expect(trialDaysRemaining(sub)).toBe(0);
    expect(isActive(sub)).toBe(true);

    const withPlan = await subscriptionService.requireByOrganization(org.id);
    expect(withPlan.plan.code).toBe(FREE_PLAN_CODE);
    expect(withPlan.plan.maxDevices).toBe(1);
    expect(withPlan.plan.pricePerScreenCents).toBe(0);
  });

  it('o plano gratis não gera fatura prevista', async () => {
    const org = await prisma.organization.create({ data: { name: `Org gratis est ${SUFFIX}` } });
    createdOrgIds.push(org.id);

    await subscriptionService.createFreeSubscription(org.id);
    const sub = await subscriptionService.requireByOrganization(org.id);
    expect(estimateMonthlyCents(sub.plan, 1)).toBe(0);
  });
});

describe('suggestUpgradeFor', () => {
  it('sugere o plano pago de menor fatura para o número de telas', async () => {
    // Com 2 telas: loja (2 × R$ 49 = R$ 98) < rede (piso de 5 × R$ 39 = R$ 195).
    const duas = await subscriptionService.suggestUpgradeFor(2);
    expect(duas?.code).toBe('loja');

    // Com 10 telas: rede (10 × R$ 39 = R$ 390) < loja (10 × R$ 49 = R$ 490).
    const dez = await subscriptionService.suggestUpgradeFor(10);
    expect(dez?.code).toBe('rede');
  });

  it('nunca sugere plano sob consulta nem o plano grátis', async () => {
    const sugerido = await subscriptionService.suggestUpgradeFor(1);
    expect(sugerido?.code).not.toBe('enterprise');
    expect(sugerido?.code).not.toBe(FREE_PLAN_CODE);
    expect(sugerido!.pricePerScreenCents).toBeGreaterThan(0);
  });
});
