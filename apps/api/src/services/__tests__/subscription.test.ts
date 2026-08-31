import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Plan } from '@prisma/client';

import prisma from '../../lib/prisma';
import {
  FREE_PLAN_CODE,
  PlanUpgradeRequiresPaymentError,
  TRIAL_DAYS,
  billedScreens,
  estimateAnnualTotalCents,
  estimateMonthlyCents,
  isActive,
  isFreePlan,
  isPlanUpgrade,
  subscriptionService,
  trialDaysRemaining,
  trialEndDate,
  unitPriceCents,
} from '../../services/subscription.service';
import { hasFeature, parseFeatures } from '../../services/plan.service';

// ── Helpers de fixture ───────────────────────────────────────────────────────

const SUFFIX = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const createdOrgIds: string[] = [];
const createdPlanIds: string[] = [];

async function makePlan(opts: {
  code: string;
  pricePerScreenCents?: number;
  priceAnnualPerScreenCents?: number;
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
      priceAnnualPerScreenCents: opts.priceAnnualPerScreenCents ?? 0,
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

describe('preço anual (unitPriceCents / estimateMonthlyCents / estimateAnnualTotalCents)', () => {
  const loja = {
    pricePerScreenCents: 4900,
    priceAnnualPerScreenCents: 3900,
    minScreens: 1,
    features: '["relatorios"]',
  };
  const rede = {
    pricePerScreenCents: 3900,
    priceAnnualPerScreenCents: 3200,
    minScreens: 5,
    features: '["powerbi"]',
  };
  /** Plano sem oferta anual — grátis, Enterprise e qualquer linha antiga. */
  const semAnual = { pricePerScreenCents: 2900, priceAnnualPerScreenCents: 0, minScreens: 1 };
  const enterprise = {
    pricePerScreenCents: 0,
    priceAnnualPerScreenCents: 0,
    minScreens: 1,
    features: '["sso","preco-sob-consulta"]',
  };

  it('usa o preço anual quando o intervalo é yearly', () => {
    expect(unitPriceCents(loja, 'yearly')).toBe(3900);
    expect(unitPriceCents(loja, 'monthly')).toBe(4900);
    expect(unitPriceCents(rede, 'yearly')).toBe(3200);
  });

  it('cai no MENSAL quando o plano não tem oferta anual — nunca em zero', () => {
    expect(unitPriceCents(semAnual, 'yearly')).toBe(2900);
    // Campo ausente (objeto parcial de chamador antigo) equivale a "sem oferta".
    expect(unitPriceCents({ pricePerScreenCents: 2900, minScreens: 1 }, 'yearly')).toBe(2900);
  });

  it('estimateMonthlyCents no anual multiplica as telas faturadas pelo preço anual', () => {
    expect(estimateMonthlyCents(loja, 3, 'yearly')).toBe(3 * 3900);
    // O piso de minScreens continua valendo no anual: 3 telas, fatura de 5.
    expect(estimateMonthlyCents(rede, 3, 'yearly')).toBe(5 * 3200);
  });

  it('o parâmetro é opcional e o default é mensal (não quebra chamador antigo)', () => {
    expect(estimateMonthlyCents(loja, 2)).toBe(estimateMonthlyCents(loja, 2, 'monthly'));
    expect(estimateMonthlyCents(loja, 2)).toBe(9800);
  });

  it('plano sob consulta segue em 0 nos dois intervalos', () => {
    expect(estimateMonthlyCents(enterprise, 50, 'yearly')).toBe(0);
    expect(estimateAnnualTotalCents(enterprise, 50)).toBe(0);
  });

  it('estimateAnnualTotalCents é o mensal-equivalente × 12', () => {
    // Uma tela no Loja: R$ 39 × 12 = R$ 468/ano, o número do plano comercial.
    expect(estimateAnnualTotalCents(loja, 1)).toBe(46800);
    // Rede com 5 telas: R$ 160/mês → R$ 1.920/ano.
    expect(estimateAnnualTotalCents(rede, 5)).toBe(192000);
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

  it('recusa subir de plano sem pagamento confirmado', async () => {
    const from = await makePlan({ code: 'from', maxDevices: 1 });
    const to = await makePlan({ code: 'to', maxDevices: 5 });
    const org = await makeOrgWithSubscription(from.id);

    await expect(subscriptionService.changePlan(org.id, to.code)).rejects.toBeInstanceOf(
      PlanUpgradeRequiresPaymentError
    );

    const after = await subscriptionService.requireByOrganization(org.id);
    expect(after.planId).toBe(from.id);
  });

  it('permite subir de plano quando o pagamento foi confirmado', async () => {
    const from = await makePlan({ code: 'from-pago', maxDevices: 1 });
    const to = await makePlan({ code: 'to-pago', maxDevices: 5 });
    const org = await makeOrgWithSubscription(from.id);

    const updated = await subscriptionService.changePlan(org.id, to.code, {
      paymentConfirmed: true,
    });
    expect(updated.planId).toBe(to.id);
  });

  it('permite descer de plano quando o uso cabe no destino', async () => {
    const from = await makePlan({ code: 'from-down', maxDevices: 5 });
    const to = await makePlan({ code: 'to-down', maxDevices: 2 });
    const org = await makeOrgWithSubscription(from.id);

    const updated = await subscriptionService.changePlan(org.id, to.code);
    expect(updated.planId).toBe(to.id);
  });
});

describe('isPlanUpgrade', () => {
  const plano = (over: Partial<Plan> = {}): Plan =>
    ({
      id: 'x',
      code: 'x',
      name: 'X',
      pricePerScreenCents: 4900,
      priceAnnualPerScreenCents: 0,
      minScreens: 1,
      maxDevices: 3,
      maxUsers: 3,
      maxOrganizations: 1,
      features: '[]',
      active: true,
      ...over,
    }) as Plan;

  it('trata como upgrade o plano que fica mais caro para o uso atual', () => {
    const barato = plano({ pricePerScreenCents: 1000 });
    const caro = plano({ pricePerScreenCents: 4900 });
    expect(isPlanUpgrade(barato, caro, 2)).toBe(true);
    expect(isPlanUpgrade(caro, barato, 2)).toBe(false);
  });

  it('trata como upgrade o plano com preço unitário menor mas piso maior (Loja → Rede)', () => {
    const loja = plano({ pricePerScreenCents: 4900, minScreens: 1, maxDevices: 3 });
    const rede = plano({ pricePerScreenCents: 3900, minScreens: 5, maxDevices: 50 });
    expect(isPlanUpgrade(loja, rede, 2)).toBe(true);
  });

  it('trata como upgrade o plano que libera limite ou feature nova', () => {
    const base = plano({ maxDevices: 3, features: '["relatorios"]' });
    expect(isPlanUpgrade(base, plano({ maxDevices: 10, features: '["relatorios"]' }), 1)).toBe(true);
    expect(isPlanUpgrade(base, plano({ maxDevices: null, features: '["relatorios"]' }), 1)).toBe(
      true
    );
    expect(
      isPlanUpgrade(base, plano({ maxDevices: 3, features: '["relatorios","powerbi"]' }), 1)
    ).toBe(true);
  });

  it('NÃO trata troca de intervalo como upgrade — intervalo é forma de pagamento', () => {
    // Mesmo plano, com oferta anual: nem sair do mensal para o anual (mais
    // barato por mês) nem voltar pode ser lido como mudança de degrau. Se
    // fosse, voltar para o mensal bateria em `PlanUpgradeRequiresPaymentError`
    // e o cliente ficaria preso no anual.
    const mensal = plano({ pricePerScreenCents: 4900, priceAnnualPerScreenCents: 3900 });
    const anual = plano({ pricePerScreenCents: 4900, priceAnnualPerScreenCents: 3900 });
    expect(isPlanUpgrade(mensal, anual, 3)).toBe(false);
    expect(isPlanUpgrade(anual, mensal, 3)).toBe(false);

    // E o campo de preço anual sozinho não inventa upgrade: um plano que ganha
    // oferta anual continua sendo o mesmo plano.
    const semOferta = plano({ pricePerScreenCents: 4900, priceAnnualPerScreenCents: 0 });
    const comOferta = plano({ pricePerScreenCents: 4900, priceAnnualPerScreenCents: 3900 });
    expect(isPlanUpgrade(semOferta, comOferta, 3)).toBe(false);
  });

  it('não trata como upgrade a troca para plano igual ou mais restrito', () => {
    const base = plano({ maxDevices: 10, features: '["relatorios","powerbi"]' });
    expect(isPlanUpgrade(base, plano({ maxDevices: 10, features: '["relatorios","powerbi"]' }), 1)).toBe(
      false
    );
    expect(isPlanUpgrade(base, plano({ maxDevices: 2, features: '["relatorios"]' }), 1)).toBe(false);
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

describe('catálogo semeado — distribuição de features (§5.1b)', () => {
  async function features(code: string): Promise<string[]> {
    const plan = await prisma.plan.findUnique({ where: { code } });
    if (!plan) throw new Error(`Plano "${code}" ausente. Rode "npm run db:seed-plans".`);
    return parseFeatures(plan.features);
  }

  it('não vende mais `api-externa` nem `multi-org` — não existem no código', async () => {
    for (const code of ['gratis', 'loja', 'rede', 'enterprise']) {
      const list = await features(code);
      expect(list).not.toContain('api-externa');
      expect(list).not.toContain('multi-org');
    }
  });

  it('Loja tem `agendamento-avancado` e `documentos` (desceram do Rede)', async () => {
    const loja = await features('loja');
    expect(loja).toContain('agendamento-avancado');
    expect(loja).toContain('documentos');
    expect(loja).toContain('relatorios');
  });

  it('`auditoria` só a partir do Rede', async () => {
    expect(await features('gratis')).not.toContain('auditoria');
    expect(await features('loja')).not.toContain('auditoria');
    expect(await features('rede')).toContain('auditoria');
    expect(await features('enterprise')).toContain('auditoria');
  });

  it('o preço anual está semeado onde há oferta, e zerado onde não há', async () => {
    const [gratis, loja, rede, enterprise] = await Promise.all(
      ['gratis', 'loja', 'rede', 'enterprise'].map((code) =>
        prisma.plan.findUnique({ where: { code } })
      )
    );

    expect(loja!.priceAnnualPerScreenCents).toBe(3900);
    expect(rede!.priceAnnualPerScreenCents).toBe(3200);
    // `0` = sem oferta anual. Não é "grátis no anual".
    expect(gratis!.priceAnnualPerScreenCents).toBe(0);
    expect(enterprise!.priceAnnualPerScreenCents).toBe(0);
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
