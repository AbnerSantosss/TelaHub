import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Lead do formulário "Falar com a gente": grava, mede, avisa o comercial —
 * nessa ordem, e nenhuma das duas últimas pode desfazer a primeira.
 */

const mocks = vi.hoisted(() => ({
  leadCreate: vi.fn(),
  leadUpdate: vi.fn(),
  sendMetaEventAsync: vi.fn(),
  sendLeadNotificationEmail: vi.fn(),
}));

vi.mock('../../lib/prisma', () => ({
  default: { lead: { create: mocks.leadCreate, update: mocks.leadUpdate, findMany: vi.fn() } },
}));

vi.mock('../checkout.service', () => ({ hashIp: () => 'ip-hash-fake' }));
vi.mock('../email.service', () => ({ sendLeadNotificationEmail: mocks.sendLeadNotificationEmail }));

vi.mock('../meta-capi.service', async () => {
  const actual = await vi.importActual<typeof import('../meta-capi.service')>('../meta-capi.service');
  return { ...actual, sendMetaEventAsync: mocks.sendMetaEventAsync, newEventId: () => 'evento-servidor' };
});

import { leadService } from '../lead.service';

const input = {
  name: 'Fulano',
  email: 'fulano@empresa.com',
  phone: '11988887777',
  planCode: 'enterprise',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.leadCreate.mockImplementation(async ({ data }: any) => ({ id: 'lead-1', ...data }));
  mocks.sendLeadNotificationEmail.mockResolvedValue(undefined);
});

describe('leadService.create — evento Lead na Conversions API', () => {
  it('dispara com e-mail, telefone e o event id que o site gerou', async () => {
    await leadService.create(
      { ...input, metaEventId: 'uuid-do-navegador', fbp: 'fb.1.1.99' },
      { ip: '203.0.113.7', userAgent: 'Mozilla/5.0', sourceUrl: 'https://telahub.com.br/contato' }
    );

    expect(mocks.sendMetaEventAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'Lead',
        eventId: 'uuid-do-navegador',
        sourceUrl: 'https://telahub.com.br/contato',
        userData: expect.objectContaining({
          email: 'fulano@empresa.com',
          phone: '11988887777',
          ip: '203.0.113.7',
          userAgent: 'Mozilla/5.0',
          fbp: 'fb.1.1.99',
        }),
      })
    );
  });

  it('reconstrói o `_fbc` a partir do fbclid quando o cookie do Pixel não veio', async () => {
    await leadService.create({ ...input, fbclid: 'IwAR123' }, {});

    expect(mocks.sendMetaEventAsync.mock.calls[0]?.[0].userData.fbc).toMatch(/^fb\.1\.\d+\.IwAR123$/);
  });

  it('dispara DEPOIS de gravar — o que vale é o lead no banco', async () => {
    await leadService.create({ ...input }, {});

    const gravou = mocks.leadCreate.mock.invocationCallOrder[0];
    const mediu = mocks.sendMetaEventAsync.mock.invocationCallOrder[0];
    expect(gravou).toBeLessThan(mediu);
  });

  it('falha da medição não derruba o lead nem o aviso ao comercial', async () => {
    mocks.sendMetaEventAsync.mockImplementation(() => {
      throw new Error('Meta fora do ar');
    });

    await expect(leadService.create({ ...input }, {})).resolves.toMatchObject({ id: 'lead-1' });
    expect(mocks.sendLeadNotificationEmail).toHaveBeenCalled();
  });
});

describe('meta-capi: falha de rede não vira exceção', () => {
  const fetchOriginal = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = fetchOriginal;
    delete process.env.META_PIXEL_ID;
    delete process.env.META_CAPI_ACCESS_TOKEN;
  });

  it('`sendMetaEventAsync` engole erro de rede sem rejeitar (medir não derruba vender)', async () => {
    const actual = await vi.importActual<typeof import('../meta-capi.service')>('../meta-capi.service');

    process.env.META_PIXEL_ID = 'pixel-teste';
    process.env.META_CAPI_ACCESS_TOKEN = 'token-teste';
    globalThis.fetch = vi.fn(async () => {
      throw new Error('ECONNRESET');
    }) as any;

    // Se isto rejeitasse, uma promessa não capturada derrubaria o processo do
    // Node por causa de uma métrica.
    expect(() => actual.sendMetaEventAsync({ eventName: 'Lead', eventId: 'x' })).not.toThrow();
    await expect(actual.sendMetaEvent({ eventName: 'Lead', eventId: 'x' })).resolves.toBe(false);
  });
});
