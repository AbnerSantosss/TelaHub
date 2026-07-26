import { describe, it, expect } from 'vitest';
import {
  resolveVideoEntitlement,
  findPaidWidgetTypes,
  FREE_VIDEO_TRIAL_DAYS,
} from '../entitlement.service';

const DAY_MS = 24 * 60 * 60 * 1000;

const freePlan = { pricePerScreenCents: 0, features: JSON.stringify(['widgets-basicos']) };
const paidPlan = { pricePerScreenCents: 4900, features: JSON.stringify(['relatorios']) };
// Enterprise: preço 0 no catálogo NÃO significa gratuito — é "sob consulta".
const enterprisePlan = {
  pricePerScreenCents: 0,
  features: JSON.stringify(['white-label', 'preco-sob-consulta']),
};

const sub = (plan: object, createdAt: Date) => ({ createdAt, plan }) as any;

describe('resolveVideoEntitlement', () => {
  const now = new Date('2026-07-25T12:00:00Z');

  it('libera vídeo em plano pago, sem depender de degustação', () => {
    const result = resolveVideoEntitlement(sub(paidPlan, new Date('2020-01-01')), now);
    expect(result).toMatchObject({ allowed: true, viaTrial: false });
  });

  it('libera vídeo no plano Grátis dentro dos 7 dias', () => {
    const createdAt = new Date(now.getTime() - 2 * DAY_MS);
    const result = resolveVideoEntitlement(sub(freePlan, createdAt), now);

    expect(result.allowed).toBe(true);
    expect(result.viaTrial).toBe(true);
    expect(result.trialDaysRemaining).toBe(FREE_VIDEO_TRIAL_DAYS - 2);
  });

  it('bloqueia vídeo no plano Grátis depois dos 7 dias', () => {
    const createdAt = new Date(now.getTime() - (FREE_VIDEO_TRIAL_DAYS + 1) * DAY_MS);
    const result = resolveVideoEntitlement(sub(freePlan, createdAt), now);

    expect(result.allowed).toBe(false);
    expect(result.trialDaysRemaining).toBe(0);
  });

  it('bloqueia exatamente no limite da janela (não dá dia extra)', () => {
    const createdAt = new Date(now.getTime() - FREE_VIDEO_TRIAL_DAYS * DAY_MS);
    expect(resolveVideoEntitlement(sub(freePlan, createdAt), now).allowed).toBe(false);
  });

  it('trata Enterprise (preço sob consulta) como plano pago, não como grátis', () => {
    const createdAt = new Date(now.getTime() - 365 * DAY_MS);
    expect(resolveVideoEntitlement(sub(enterprisePlan, createdAt), now).allowed).toBe(true);
  });

  it('falha ABERTO sem assinatura (organização legada não perde recurso)', () => {
    expect(resolveVideoEntitlement(null, now).allowed).toBe(true);
    expect(resolveVideoEntitlement(undefined, now).allowed).toBe(true);
  });
});

describe('findPaidWidgetTypes', () => {
  it('acha VIDEO no formato de grid atual (pages[].layout[])', () => {
    const pages = [{ layout: [{ type: 'IMAGE' }, { type: 'VIDEO', data: { videoUrl: 'x' } }] }];
    expect(findPaidWidgetTypes(pages)).toEqual(['VIDEO']);
  });

  it('acha VIDEO no wrapper { __orientation, items }', () => {
    const pages = { __orientation: 'vertical', items: [{ layout: [{ type: 'VIDEO' }] }] };
    expect(findPaidWidgetTypes(pages)).toEqual(['VIDEO']);
  });

  it('acha VIDEO no formato legado de posicionamento absoluto (page.widgets)', () => {
    // Este é o vetor de burla óbvio: salvar no formato antigo para escapar de um
    // gate que só olhasse `layout`.
    const pages = [{ widgets: [{ type: 'VIDEO' }] }];
    expect(findPaidWidgetTypes(pages)).toEqual(['VIDEO']);
  });

  it('acha VIDEO aninhado em profundidade arbitrária', () => {
    const pages = [{ a: { b: { c: [{ d: { type: 'video' } }] } } }];
    expect(findPaidWidgetTypes(pages)).toEqual(['VIDEO']);
  });

  it('não acusa falso positivo em conteúdo sem widget pago', () => {
    const pages = [{ layout: [{ type: 'IMAGE' }, { type: 'TEXT' }, { type: 'GIF' }] }];
    expect(findPaidWidgetTypes(pages)).toEqual([]);
  });

  it('não quebra com payload vazio, nulo ou primitivo', () => {
    expect(findPaidWidgetTypes([])).toEqual([]);
    expect(findPaidWidgetTypes(null)).toEqual([]);
    expect(findPaidWidgetTypes('VIDEO')).toEqual([]);
    expect(findPaidWidgetTypes(42)).toEqual([]);
  });

  it('sobrevive a referência circular sem estourar a pilha', () => {
    const page: any = { layout: [{ type: 'VIDEO' }] };
    page.self = page;
    expect(findPaidWidgetTypes([page])).toEqual(['VIDEO']);
  });
});
