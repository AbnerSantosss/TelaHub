import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Cadastro: atribuição gravada, aceite gravado e `CompleteRegistration`
 * disparado. Tudo com mock — sem banco e sem rede (rodar contra o banco de dev
 * sujaria o catálogo).
 */

const mocks = vi.hoisted(() => ({
  organizationCreate: vi.fn(),
  userCreate: vi.fn(),
  txUserFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
  sendMetaEventAsync: vi.fn(),
  createFreeSubscription: vi.fn(),
}));

vi.mock('../../lib/prisma', () => ({
  default: {
    user: { findUnique: mocks.userFindUnique },
    $transaction: async (fn: any) =>
      fn({
        organization: { create: mocks.organizationCreate },
        user: { create: mocks.userCreate, findUnique: mocks.txUserFindUnique },
      }),
  },
}));

vi.mock('../auth.service', () => ({
  hashPassword: vi.fn(async () => 'hash-fake'),
  generateToken: vi.fn(() => 'token-fake'),
}));

vi.mock('../settings.service', () => ({
  // Sem SMTP configurado o e-mail de boas-vindas nem é tentado.
  settingsService: { getSmtpConfig: vi.fn(async () => null) },
}));

vi.mock('../subscription.service', () => ({
  FREE_PLAN_CODE: 'gratis',
  subscriptionService: { createFreeSubscription: mocks.createFreeSubscription },
  trialDaysRemaining: () => 0,
}));

vi.mock('../meta-capi.service', async () => {
  const actual = await vi.importActual<typeof import('../meta-capi.service')>('../meta-capi.service');
  return {
    ...actual,
    sendMetaEventAsync: mocks.sendMetaEventAsync,
    newEventId: () => 'id-gerado-no-servidor',
  };
});

import { signupService } from '../signup.service';
import { PRIVACY_VERSION, TERMS_VERSION } from '../../schemas/signup.schema';

const ORG_ID = 'org-123';

const input = {
  companyName: 'Condomínio Alfa',
  name: 'Fulano de Teste',
  email: 'fulano@exemplo.com',
  password: 'senhaSegura123',
  acceptedTerms: true as const,
};

beforeEach(() => {
  vi.clearAllMocks();

  mocks.userFindUnique.mockResolvedValue(null);
  mocks.txUserFindUnique.mockResolvedValue(null);
  mocks.organizationCreate.mockImplementation(async ({ data }: any) => ({ id: ORG_ID, ...data }));
  mocks.userCreate.mockImplementation(async ({ data }: any) => ({ id: 'user-1', ...data }));
  mocks.createFreeSubscription.mockResolvedValue({ status: 'active', trialEndsAt: null });
});

describe('signupService.signup — atribuição de campanha', () => {
  it('grava a origem inteira na organização criada', async () => {
    await signupService.signup({
      ...input,
      attribution: {
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'condominio-avisos',
        utmContent: 'anuncio-b',
        utmTerm: 'tv+aviso+condominio',
        gclid: 'Cj0KC',
        fbclid: 'IwAR123',
        referrer: 'https://www.google.com/',
        landingPath: '/planos',
      },
    });

    expect(mocks.organizationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Condomínio Alfa',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'condominio-avisos',
        utmContent: 'anuncio-b',
        utmTerm: 'tv+aviso+condominio',
        gclid: 'Cj0KC',
        fbclid: 'IwAR123',
        referrer: 'https://www.google.com/',
        landingPath: '/planos',
      }),
    });
  });

  it('sem atribuição, grava nulo em vez de falhar — cadastro direto continua valendo', async () => {
    await signupService.signup({ ...input });

    expect(mocks.organizationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ utmSource: null, gclid: null, landingPath: null }),
    });
  });
});

describe('signupService.signup — aceite de Termos e Privacidade', () => {
  it('grava data, versão dos termos e versão da privacidade no usuário', async () => {
    const antes = Date.now();
    await signupService.signup({ ...input });

    const data = mocks.userCreate.mock.calls[0]?.[0]?.data;
    expect(data.termsVersion).toBe(TERMS_VERSION);
    expect(data.privacyVersion).toBe(PRIVACY_VERSION);
    expect(data.termsAcceptedAt).toBeInstanceOf(Date);
    // A data é a de AGORA, do servidor: aceite retroativo não prova nada.
    expect(data.termsAcceptedAt.getTime()).toBeGreaterThanOrEqual(antes);
  });

  it('respeita a versão informada pela tela quando ela vem no corpo', async () => {
    await signupService.signup({ ...input, termsVersion: '2025-01-01', privacyVersion: '2025-01-01' });

    const data = mocks.userCreate.mock.calls[0]?.[0]?.data;
    expect(data.termsVersion).toBe('2025-01-01');
  });
});

describe('signupService.signup — CompleteRegistration na Conversions API', () => {
  it('usa o MESMO event id que o navegador mandou (deduplicação do Pixel)', async () => {
    await signupService.signup(
      { ...input, metaEventId: 'uuid-do-navegador', fbp: 'fb.1.1.99' },
      { ip: '203.0.113.7', userAgent: 'Mozilla/5.0', sourceUrl: 'https://telahub.com.br/cadastro' }
    );

    expect(mocks.sendMetaEventAsync).toHaveBeenCalledTimes(1);
    expect(mocks.sendMetaEventAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'CompleteRegistration',
        eventId: 'uuid-do-navegador',
        actionSource: 'website',
        sourceUrl: 'https://telahub.com.br/cadastro',
        userData: expect.objectContaining({
          email: 'fulano@exemplo.com',
          externalId: ORG_ID,
          ip: '203.0.113.7',
          userAgent: 'Mozilla/5.0',
          fbp: 'fb.1.1.99',
        }),
      })
    );
  });

  it('reconstrói o `_fbc` a partir do fbclid quando o cookie do Pixel não veio', async () => {
    await signupService.signup({ ...input, attribution: { fbclid: 'IwAR123' } });

    const evento = mocks.sendMetaEventAsync.mock.calls[0]?.[0];
    expect(evento.userData.fbc).toMatch(/^fb\.1\.\d+\.IwAR123$/);
  });

  it('gera um event id próprio quando o site não manda — e o cadastro segue', async () => {
    const result = await signupService.signup({ ...input });

    expect(mocks.sendMetaEventAsync.mock.calls[0]?.[0].eventId).toBe('id-gerado-no-servidor');
    expect(result.token).toBe('token-fake');
  });

  it('falha da medição não derruba o cadastro', async () => {
    // Cenário pessimista: nem a chamada da medição sobrevive. O cadastro tem
    // que continuar de pé — medir nunca pode custar um cliente.
    mocks.sendMetaEventAsync.mockImplementation(() => {
      throw new Error('Meta fora do ar');
    });

    await expect(signupService.signup({ ...input })).resolves.toMatchObject({ token: 'token-fake' });
  });
});
