import { describe, expect, it } from 'vitest';

import {
  PAST_DUE_GRACE_DAYS,
  addBillingInterval,
  cycleCentsFromMonthly,
  cycleMonths,
  estimateCycleCents,
  estimateMonthlyCents,
  graceEndsAt,
  isPastDueGraceExpired,
  isScheduledCancelDue,
} from '../subscription.service';

// ─────────────────────────────────────────────────────────────────────────────
// Tudo aqui é FUNÇÃO PURA: sem banco, sem rede, sem servidor.
//
// É o único jeito de manter coberto um comportamento que, em produção, só
// acontece dias depois da venda (renovação, carência, fim de ciclo). Um teste
// que precisasse do gateway para exercitar "carência de 10 dias venceu" nunca
// seria escrito — e é justamente onde o dinheiro se perde em silêncio.
// ─────────────────────────────────────────────────────────────────────────────

const PLANO_LOJA = { pricePerScreenCents: 4900, priceAnnualPerScreenCents: 3900, minScreens: 1 };
const PLANO_REDE = { pricePerScreenCents: 3900, priceAnnualPerScreenCents: 3200, minScreens: 5 };

describe('conversão mensal-equivalente × caixa do ciclo (defeito US-A-05)', () => {
  it('mensal: o ciclo é um mês, os dois números são iguais', () => {
    expect(cycleMonths('monthly')).toBe(1);
    expect(cycleCentsFromMonthly(14700, 'monthly')).toBe(14700);
  });

  it('anual: o ciclo cobra os 12 meses de uma vez', () => {
    expect(cycleMonths('yearly')).toBe(12);
    // 3 telas × R$ 39 = R$ 117/mês equivalente → R$ 1.404 no ato.
    expect(cycleCentsFromMonthly(11700, 'yearly')).toBe(140400);
  });

  it('estimateCycleCents parte do catálogo e chega no mesmo lugar', () => {
    const mensalEquivalente = estimateMonthlyCents(PLANO_LOJA, 3, 'yearly');
    expect(mensalEquivalente).toBe(11700);
    expect(estimateCycleCents(PLANO_LOJA, 3, 'yearly')).toBe(140400);
    expect(estimateCycleCents(PLANO_LOJA, 3, 'yearly')).toBe(
      cycleCentsFromMonthly(mensalEquivalente, 'yearly')
    );
  });

  it('respeita o piso de telas do plano também no ciclo anual', () => {
    // 3 telas ativas, mas o Rede fatura no mínimo 5.
    expect(estimateCycleCents(PLANO_REDE, 3, 'yearly')).toBe(5 * 3200 * 12);
  });

  it('plano grátis não gera caixa nenhum', () => {
    const gratis = { pricePerScreenCents: 0, priceAnnualPerScreenCents: 0, minScreens: 1 };
    expect(estimateCycleCents(gratis, 1, 'yearly')).toBe(0);
  });
});

describe('addBillingInterval', () => {
  it('mensal avança um mês', () => {
    expect(addBillingInterval(new Date('2026-09-05T12:00:00Z'), 'monthly').toISOString()).toBe(
      '2026-10-05T12:00:00.000Z'
    );
  });

  it('anual avança um ano', () => {
    expect(addBillingInterval(new Date('2026-09-05T12:00:00Z'), 'yearly').toISOString()).toBe(
      '2027-09-05T12:00:00.000Z'
    );
  });

  it('não transborda: 31/01 + 1 mês cai em 28/02, não em 03/03', () => {
    // Sem o clamp, o JS devolveria março e quem assina dia 31 ganharia um mês
    // de graça todo ano.
    const next = addBillingInterval(new Date('2026-01-31T00:00:00Z'), 'monthly');
    expect(next.toISOString().slice(0, 10)).toBe('2026-02-28');
  });

  it('não transborda no ano bissexto: 29/02 + 1 ano cai em 28/02', () => {
    const next = addBillingInterval(new Date('2028-02-29T00:00:00Z'), 'yearly');
    expect(next.toISOString().slice(0, 10)).toBe('2029-02-28');
  });
});

describe('carência de inadimplência', () => {
  const inadimplenteDesde = new Date('2026-09-01T10:00:00Z');

  it('a carência dura 10 dias — o mesmo prazo do item 9 dos Termos de uso', () => {
    // Este teste é o que impede o número de divergir do texto publicado: se
    // alguém "otimizar" para 7, ele quebra e obriga a olhar os Termos.
    expect(PAST_DUE_GRACE_DAYS).toBe(10);
    expect(graceEndsAt(inadimplenteDesde).toISOString()).toBe('2026-09-11T10:00:00.000Z');
  });

  it('dentro da carência a conta continua funcionando', () => {
    expect(isPastDueGraceExpired(inadimplenteDesde, new Date('2026-09-10T23:59:00Z'))).toBe(false);
  });

  it('vencida a carência, a suspensão está liberada', () => {
    expect(isPastDueGraceExpired(inadimplenteDesde, new Date('2026-09-11T10:00:00Z'))).toBe(true);
  });

  it('sem data de inadimplência não há carência vencida', () => {
    // Nunca suspender por dado ausente: o erro caro é derrubar a TV de quem
    // está em dia.
    expect(isPastDueGraceExpired(null, new Date('2030-01-01T00:00:00Z'))).toBe(false);
  });
});

describe('cancelamento agendado', () => {
  const base = { status: 'active', cancelAtPeriodEnd: true, currentPeriodEnd: new Date('2026-09-30T00:00:00Z') };

  it('não encerra antes do fim do ciclo pago (CDC art. 51, IV)', () => {
    expect(isScheduledCancelDue(base, new Date('2026-09-29T23:00:00Z'))).toBe(false);
  });

  it('encerra quando o ciclo termina', () => {
    expect(isScheduledCancelDue(base, new Date('2026-09-30T00:00:00Z'))).toBe(true);
  });

  it('quem não pediu cancelamento nunca é encerrado', () => {
    expect(
      isScheduledCancelDue({ ...base, cancelAtPeriodEnd: false }, new Date('2027-01-01T00:00:00Z'))
    ).toBe(false);
  });

  it('sem currentPeriodEnd, na dúvida o acesso continua', () => {
    expect(
      isScheduledCancelDue({ ...base, currentPeriodEnd: null }, new Date('2027-01-01T00:00:00Z'))
    ).toBe(false);
  });
});
