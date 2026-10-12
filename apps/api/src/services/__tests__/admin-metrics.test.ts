import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

/**
 * Testes das métricas da plataforma.
 *
 * O Prisma é MOCKADO: o que está sendo verificado aqui é aritmética de dinheiro
 * e de coorte, não SQL. Um teste com banco de verdade precisaria semear
 * assinatura, plano, pagamento, lead e sessão para cada caso — e o caso que
 * mais importa (o US-A-05) sumiria no meio do arranjo.
 */
vi.mock('../../lib/prisma', () => ({
  default: {
    siteVisit: { upsert: vi.fn(), update: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() },
    lead: { count: vi.fn(), findMany: vi.fn() },
    checkoutSession: { findMany: vi.fn() },
    payment: { findMany: vi.fn() },
    subscription: { findMany: vi.fn(), count: vi.fn() },
    device: { groupBy: vi.fn() },
    adSpend: { findMany: vi.fn(), upsert: vi.fn() },
  },
}));

import prisma from '../../lib/prisma';
import {
  SEM_CONVERSA,
  SEM_GASTO,
  SEM_VENDA,
  adminMetricsService,
  classifyIndicator,
  startOfUtcWeek,
  type IndicatorKey,
  type IndicatorReading,
} from '../admin-metrics.service';
import { siteVisitService } from '../site-visit.service';

/**
 * Ponte para o mock sem `any`: o tipo exato de um método do Prisma é um
 * genérico enorme, e escrevê-lo por extenso em cada caso esconderia o que o
 * teste está fazendo.
 */
const asMock = (fn: unknown): Mock => fn as Mock;

const PLANO_LOJA = {
  id: 'plan-loja',
  code: 'loja',
  name: 'Loja',
  pricePerScreenCents: 4_900, // R$ 49/tela/mês
  priceAnnualPerScreenCents: 3_900, // R$ 39/tela/mês quando paga o ano
  minScreens: 1,
  features: '[]',
};

const DIA_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  // Padrões vazios: cada caso sobrescreve só o que lhe interessa. Sem isto,
  // uma consulta esquecida devolveria `undefined` e o erro apareceria como
  // "cannot read property of undefined" em vez de dado faltando.
  asMock(prisma.subscription.findMany).mockResolvedValue([]);
  asMock(prisma.subscription.count).mockResolvedValue(0);
  asMock(prisma.device.groupBy).mockResolvedValue([]);
  asMock(prisma.payment.findMany).mockResolvedValue([]);
  asMock(prisma.lead.findMany).mockResolvedValue([]);
  asMock(prisma.checkoutSession.findMany).mockResolvedValue([]);
  asMock(prisma.adSpend.findMany).mockResolvedValue([]);
  asMock(prisma.siteVisit.upsert).mockResolvedValue({});
  asMock(prisma.siteVisit.update).mockResolvedValue({});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('getRevenue — MRR × caixa (o teste que trava o US-A-05)', () => {
  it('assinatura ANUAL entra no MRR pelo mensal equivalente e no caixa pelo ciclo inteiro', async () => {
    const daquiA10Dias = new Date(Date.now() + 10 * DIA_MS);

    asMock(prisma.subscription.findMany).mockResolvedValue([
      {
        organizationId: 'org-1',
        billingInterval: 'yearly',
        currentPeriodEnd: daquiA10Dias,
        plan: PLANO_LOJA,
      },
    ]);
    asMock(prisma.device.groupBy).mockResolvedValue([
      { organizationId: 'org-1', _count: { _all: 2 } },
    ]);
    // O que o gateway realmente cobrou: 2 telas × R$ 39 × 12 meses.
    asMock(prisma.payment.findMany).mockResolvedValue([
      { amountCents: 93_600, billingInterval: 'yearly' },
    ]);

    const receita = await adminMetricsService.getRevenue();

    // 2 telas × R$ 39 = R$ 78/mês de MRR.
    expect(receita.mrrCents).toBe(7_800);
    // R$ 1.404 de caixa. É o número do incidente: o admin exibia R$ 117.
    expect(receita.cashInPeriodCents).toBe(93_600);

    // A afirmação central: são grandezas diferentes, e uma é 12× a outra.
    expect(receita.cashInPeriodCents).not.toBe(receita.mrrCents);
    expect(receita.cashInPeriodCents).toBe(receita.mrrCents * 12);

    expect(receita.cashInPeriodByInterval.yearly.cashCents).toBe(93_600);
    expect(receita.cashInPeriodByInterval.monthly.cashCents).toBe(0);
    expect(receita.payingAccounts).toBe(1);
    expect(receita.yearlyMixRate).toBe(1);
  });

  it('previsão de renovação usa o CAIXA do ciclo, não o mensal equivalente', async () => {
    asMock(prisma.subscription.findMany).mockResolvedValue([
      {
        organizationId: 'org-1',
        billingInterval: 'yearly',
        currentPeriodEnd: new Date(Date.now() + 10 * DIA_MS),
        plan: PLANO_LOJA,
      },
    ]);
    asMock(prisma.device.groupBy).mockResolvedValue([
      { organizationId: 'org-1', _count: { _all: 2 } },
    ]);

    const receita = await adminMetricsService.getRevenue();

    expect(receita.upcomingRenewals.count).toBe(1);
    // O que vai ser cobrado no dia da renovação.
    expect(receita.upcomingRenewals.cashCents).toBe(93_600);
    // O MESMO dinheiro em mensal equivalente, numa coluna separada.
    expect(receita.upcomingRenewals.mrrCents).toBe(7_800);
    expect(receita.upcomingRenewals.byInterval.yearly.cashCents).toBe(93_600);
    expect(receita.upcomingRenewals.byInterval.monthly.count).toBe(0);
  });

  it('mensal e anual convivem sem se contaminar: MRR soma equivalentes, caixa soma ciclos', async () => {
    asMock(prisma.subscription.findMany).mockResolvedValue([
      {
        organizationId: 'org-anual',
        billingInterval: 'yearly',
        currentPeriodEnd: new Date(Date.now() + 300 * DIA_MS),
        plan: PLANO_LOJA,
      },
      {
        organizationId: 'org-mensal',
        billingInterval: 'monthly',
        currentPeriodEnd: new Date(Date.now() + 300 * DIA_MS),
        plan: PLANO_LOJA,
      },
    ]);
    asMock(prisma.device.groupBy).mockResolvedValue([
      { organizationId: 'org-anual', _count: { _all: 2 } },
      { organizationId: 'org-mensal', _count: { _all: 1 } },
    ]);
    asMock(prisma.payment.findMany).mockResolvedValue([
      { amountCents: 93_600, billingInterval: 'yearly' },
      { amountCents: 4_900, billingInterval: 'monthly' },
    ]);

    const receita = await adminMetricsService.getRevenue();

    // 2 × R$ 39 (anual) + 1 × R$ 49 (mensal).
    expect(receita.mrrCents).toBe(7_800 + 4_900);
    expect(receita.cashInPeriodCents).toBe(93_600 + 4_900);
    expect(receita.payingAccounts).toBe(2);
    expect(receita.yearlyMixRate).toBe(0.5);
  });

  it('plano grátis não é pagante e não entra no MRR', async () => {
    asMock(prisma.subscription.findMany).mockResolvedValue([
      {
        organizationId: 'org-gratis',
        billingInterval: 'monthly',
        currentPeriodEnd: null,
        plan: {
          id: 'plan-gratis',
          code: 'gratis',
          name: 'Grátis',
          pricePerScreenCents: 0,
          priceAnnualPerScreenCents: 0,
          minScreens: 1,
          features: '[]',
        },
      },
    ]);

    const receita = await adminMetricsService.getRevenue();

    expect(receita.payingAccounts).toBe(0);
    expect(receita.mrrCents).toBe(0);
    // Sem pagante não existe mix nem média de telas — e `null` é diferente de 0%.
    expect(receita.yearlyMixRate).toBeNull();
    expect(receita.screensPerPayingAccount.billed).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

const SEGUNDA = new Date('2026-09-07T00:00:00.000Z');
const DOMINGO = new Date('2026-09-13T23:59:59.000Z');

function leadsNaSemana(quantidade: number) {
  return Array.from({ length: quantidade }, (_, i) => ({
    createdAt: new Date(SEGUNDA.getTime() + (i % 5) * DIA_MS + 3 * 60 * 60 * 1000),
  }));
}

function vendasAnuaisNaSemana(quantidade: number, screens = 2) {
  return Array.from({ length: quantidade }, (_, i) => ({
    paidAt: new Date(SEGUNDA.getTime() + (i % 5) * DIA_MS + 4 * 60 * 60 * 1000),
    billingInterval: 'yearly',
    screens,
    amountCents: 7_800, // mensal equivalente de 2 telas no anual
  }));
}

function leitura(indicadores: IndicatorReading[], chave: IndicatorKey): IndicatorReading {
  const encontrada = indicadores.find((indicador) => indicador.key === chave);
  if (!encontrada) throw new Error(`indicador ${chave} não foi calculado`);
  return encontrada;
}

describe('getIndicators — semana sem AdSpend devolve null, nunca zero', () => {
  it('sem linha de gasto, custo por conversa e CAC vêm nulos com "sem gasto informado"', async () => {
    asMock(prisma.adSpend.findMany).mockResolvedValue([]);
    asMock(prisma.lead.findMany).mockResolvedValue(leadsNaSemana(20));
    asMock(prisma.checkoutSession.findMany).mockResolvedValue(vendasAnuaisNaSemana(2));

    const relatorio = await adminMetricsService.getIndicators({
      startDate: SEGUNDA,
      endDate: DOMINGO,
    });

    expect(relatorio.weeks).toHaveLength(1);
    const semana = relatorio.weeks[0]!;
    expect(semana.weekStart).toBe('2026-09-07');
    expect(semana.adSpendCents).toBeNull();

    const custo = leitura(semana.indicators, 'costPerConversation');
    expect(custo.value).toBeNull();
    // Zero aqui seria lido como "campanha de graça" e pintaria o semáforo de verde.
    expect(custo.value).not.toBe(0);
    expect(custo.status).toBeNull();
    expect(custo.reason).toBe(SEM_GASTO);

    const cac = leitura(semana.indicators, 'cacCash');
    expect(cac.value).toBeNull();
    expect(cac.status).toBeNull();
    expect(cac.reason).toBe(SEM_GASTO);

    // Os que NÃO dependem de gasto continuam sendo calculados normalmente.
    expect(leitura(semana.indicators, 'conversationToSale').value).toBeCloseTo(0.1, 10);
    expect(leitura(semana.indicators, 'conversationToSale').status).toBe('verde');
    expect(leitura(semana.indicators, 'yearlyMix').value).toBe(1);
    expect(leitura(semana.indicators, 'screensPerPaidAccount').value).toBe(2);
  });

  it('com gasto lançado, calcula custo por conversa e CAC e aplica o semáforo', async () => {
    asMock(prisma.adSpend.findMany).mockResolvedValue([
      { weekStart: SEGUNDA, channel: 'meta', amountCents: 50_000 },
    ]);
    asMock(prisma.lead.findMany).mockResolvedValue(leadsNaSemana(20));
    asMock(prisma.checkoutSession.findMany).mockResolvedValue(vendasAnuaisNaSemana(2));

    const relatorio = await adminMetricsService.getIndicators({
      startDate: SEGUNDA,
      endDate: DOMINGO,
    });
    const semana = relatorio.weeks[0]!;

    expect(semana.adSpendCents).toBe(50_000);
    // R$ 500 / 20 conversas = R$ 25 → verde (≤ R$ 35).
    expect(leitura(semana.indicators, 'costPerConversation').value).toBe(2_500);
    expect(leitura(semana.indicators, 'costPerConversation').status).toBe('verde');
    // R$ 500 / 2 vendas = R$ 250 → verde (≤ R$ 374).
    expect(leitura(semana.indicators, 'cacCash').value).toBe(25_000);
    expect(leitura(semana.indicators, 'cacCash').status).toBe('verde');
    expect(semana.salesCashCents).toBe(2 * 7_800 * 12);
  });

  it('gasto alto com pouca venda pinta o CAC de vermelho', async () => {
    asMock(prisma.adSpend.findMany).mockResolvedValue([
      { weekStart: SEGUNDA, channel: 'meta', amountCents: 150_000 },
    ]);
    asMock(prisma.lead.findMany).mockResolvedValue(leadsNaSemana(10));
    asMock(prisma.checkoutSession.findMany).mockResolvedValue(vendasAnuaisNaSemana(1));

    const relatorio = await adminMetricsService.getIndicators({
      startDate: SEGUNDA,
      endDate: DOMINGO,
    });
    const semana = relatorio.weeks[0]!;

    // R$ 1.500 por um pagante: acima do teto de R$ 560.
    expect(leitura(semana.indicators, 'cacCash').value).toBe(150_000);
    expect(leitura(semana.indicators, 'cacCash').status).toBe('vermelho');
  });

  it('semana com gasto e nenhuma venda não vira "sem gasto": o motivo é a venda que faltou', async () => {
    asMock(prisma.adSpend.findMany).mockResolvedValue([
      { weekStart: SEGUNDA, channel: 'google', amountCents: 80_000 },
    ]);
    asMock(prisma.lead.findMany).mockResolvedValue(leadsNaSemana(4));
    asMock(prisma.checkoutSession.findMany).mockResolvedValue([]);

    const relatorio = await adminMetricsService.getIndicators({
      startDate: SEGUNDA,
      endDate: DOMINGO,
    });
    const semana = relatorio.weeks[0]!;

    expect(leitura(semana.indicators, 'cacCash').reason).toBe(SEM_VENDA);
    expect(leitura(semana.indicators, 'yearlyMix').reason).toBe(SEM_VENDA);
    // Houve conversa, então o custo por conversa é calculável.
    expect(leitura(semana.indicators, 'costPerConversation').value).toBe(20_000);
  });

  it('semana sem nenhuma conversa devolve "sem conversa iniciada", não divisão por zero', async () => {
    asMock(prisma.adSpend.findMany).mockResolvedValue([
      { weekStart: SEGUNDA, channel: 'meta', amountCents: 30_000 },
    ]);

    const relatorio = await adminMetricsService.getIndicators({
      startDate: SEGUNDA,
      endDate: DOMINGO,
    });
    const semana = relatorio.weeks[0]!;

    expect(leitura(semana.indicators, 'costPerConversation').value).toBeNull();
    expect(leitura(semana.indicators, 'costPerConversation').reason).toBe(SEM_CONVERSA);
    expect(leitura(semana.indicators, 'conversationToSale').reason).toBe(SEM_CONVERSA);
  });

  it('toda semana do período aparece, inclusive as vazias (coorte, não média acumulada)', async () => {
    const relatorio = await adminMetricsService.getIndicators({
      startDate: new Date('2026-08-24T00:00:00.000Z'),
      endDate: new Date('2026-09-13T00:00:00.000Z'),
    });

    expect(relatorio.weeks.map((semana) => semana.weekStart)).toEqual([
      '2026-08-24',
      '2026-08-31',
      '2026-09-07',
    ]);
  });
});

describe('startOfUtcWeek', () => {
  it('leva qualquer dia para a segunda-feira da sua semana', () => {
    expect(startOfUtcWeek(new Date('2026-09-09T18:30:00.000Z')).toISOString()).toBe(
      '2026-09-07T00:00:00.000Z'
    );
    // Domingo pertence à semana que começou na segunda anterior.
    expect(startOfUtcWeek(new Date('2026-09-13T23:00:00.000Z')).toISOString()).toBe(
      '2026-09-07T00:00:00.000Z'
    );
    expect(startOfUtcWeek(new Date('2026-09-07T00:00:00.000Z')).toISOString()).toBe(
      '2026-09-07T00:00:00.000Z'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('siteVisitService.record — balde de origem vazia', () => {
  it('grava STRING VAZIA (nunca null) nas colunas de origem, para o upsert somar na mesma linha', async () => {
    await siteVisitService.record({
      path: '/planos',
      at: new Date('2026-09-09T15:00:00.000Z'),
    });

    const chamada = asMock(prisma.siteVisit.upsert).mock.calls[0]![0] as {
      where: { site_visit_bucket: Record<string, unknown> };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    const balde = chamada.where.site_visit_bucket;

    expect(balde.utmSource).toBe('');
    expect(balde.utmMedium).toBe('');
    expect(balde.utmCampaign).toBe('');
    expect(balde.referrerHost).toBe('');
    // O ponto do teste: `null` num índice único do Postgres nunca casa consigo
    // mesmo, e cada visita direta criaria uma linha nova.
    expect(Object.values(balde)).not.toContain(null);
    expect(Object.values(balde)).not.toContain(undefined);

    expect(balde.day).toEqual(new Date('2026-09-09T00:00:00.000Z'));
    expect(chamada.update).toEqual({ views: { increment: 1 }, uniques: { increment: 0 } });
  });

  it('visita sem origem e visita com origem nula caem NO MESMO balde', async () => {
    const at = new Date('2026-09-09T15:00:00.000Z');

    await siteVisitService.record({ path: '/planos', at });
    await siteVisitService.record({
      path: '/planos',
      at,
      utmSource: null,
      utmMedium: undefined,
      utmCampaign: '   ',
      referrer: null,
    });

    const chamadas = asMock(prisma.siteVisit.upsert).mock.calls;
    expect(chamadas).toHaveLength(2);
    expect((chamadas[0]![0] as { where: unknown }).where).toEqual(
      (chamadas[1]![0] as { where: unknown }).where
    );
  });

  it('descarta a query string do caminho e guarda só o host do referrer', async () => {
    await siteVisitService.record({
      // Link de recuperação: a query carrega e-mail e token de sessão.
      path: 'https://vendas.telahub.com.br/planos/?email=alguem@exemplo.com&t=abc',
      referrer: 'https://www.google.com/search?q=tv+corporativa+preco',
      utmSource: '  Meta  ',
      isUnique: true,
      at: new Date('2026-09-09T15:00:00.000Z'),
    });

    const balde = (
      asMock(prisma.siteVisit.upsert).mock.calls[0]![0] as {
        where: { site_visit_bucket: Record<string, unknown> };
        update: Record<string, unknown>;
      }
    ).where.site_visit_bucket;

    expect(balde.path).toBe('/planos');
    expect(String(balde.path)).not.toContain('@');
    expect(balde.referrerHost).toBe('google.com');
    // A caixa é preservada na escrita (as outras tabelas guardam a UTM crua);
    // quem unifica é a leitura do relatório de origem.
    expect(balde.utmSource).toBe('Meta');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('classifyIndicator — as faixas da Estrategia-Lucro-Trafego §5', () => {
  it('custo por conversa: ≤ R$ 35 verde, R$ 35–50 amarelo, > R$ 50 vermelho', () => {
    expect(classifyIndicator('costPerConversation', 3_500)).toBe('verde');
    expect(classifyIndicator('costPerConversation', 3_501)).toBe('amarelo');
    expect(classifyIndicator('costPerConversation', 5_000)).toBe('amarelo');
    expect(classifyIndicator('costPerConversation', 5_001)).toBe('vermelho');
  });

  it('conversa → venda: ≥ 9% verde, 5–9% amarelo, < 5% vermelho', () => {
    expect(classifyIndicator('conversationToSale', 0.09)).toBe('verde');
    expect(classifyIndicator('conversationToSale', 0.089)).toBe('amarelo');
    expect(classifyIndicator('conversationToSale', 0.05)).toBe('amarelo');
    expect(classifyIndicator('conversationToSale', 0.049)).toBe('vermelho');
  });

  it('CAC caixa: ≤ R$ 374 verde, R$ 374–560 amarelo, > R$ 560 vermelho', () => {
    expect(classifyIndicator('cacCash', 37_400)).toBe('verde');
    expect(classifyIndicator('cacCash', 37_401)).toBe('amarelo');
    expect(classifyIndicator('cacCash', 56_000)).toBe('amarelo');
    expect(classifyIndicator('cacCash', 56_001)).toBe('vermelho');
  });

  it('mix anual: ≥ 70% verde, 60–70% amarelo, < 60% vermelho', () => {
    expect(classifyIndicator('yearlyMix', 0.7)).toBe('verde');
    expect(classifyIndicator('yearlyMix', 0.69)).toBe('amarelo');
    expect(classifyIndicator('yearlyMix', 0.6)).toBe('amarelo');
    expect(classifyIndicator('yearlyMix', 0.59)).toBe('vermelho');
  });

  it('telas por conta paga: ≥ 1,8 verde, 1,4–1,8 amarelo, < 1,4 vermelho', () => {
    expect(classifyIndicator('screensPerPaidAccount', 1.8)).toBe('verde');
    expect(classifyIndicator('screensPerPaidAccount', 1.7)).toBe('amarelo');
    expect(classifyIndicator('screensPerPaidAccount', 1.4)).toBe('amarelo');
    expect(classifyIndicator('screensPerPaidAccount', 1.39)).toBe('vermelho');
  });

  it('sem valor não vira verde: indicador sem dado continua sem cor', () => {
    expect(classifyIndicator('cacCash', null)).toBeNull();
    expect(classifyIndicator('costPerConversation', Number.NaN)).toBeNull();
    expect(classifyIndicator('conversationToSale', Number.POSITIVE_INFINITY)).toBeNull();
  });
});
