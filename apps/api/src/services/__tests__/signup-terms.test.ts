import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Aceite pendente da base existente (item que o painel usa para pedir o aceite
 * no próximo acesso). Sem banco: `prisma` é mock.
 */

const mocks = vi.hoisted(() => ({ userUpdate: vi.fn() }));

vi.mock('../../lib/prisma', () => ({ default: { user: { update: mocks.userUpdate } } }));

import { isTermsAcceptancePending, recordTermsAcceptance } from '../auth.service';
import { PRIVACY_VERSION, TERMS_VERSION } from '../../schemas/signup.schema';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userUpdate.mockResolvedValue({});
});

describe('isTermsAcceptancePending', () => {
  it('é pendente para quem nunca aceitou (base anterior a 2026-09-05)', () => {
    expect(isTermsAcceptancePending({ termsAcceptedAt: null, termsVersion: null })).toBe(true);
  });

  it('é pendente para quem aceitou uma versão anterior do texto', () => {
    expect(
      isTermsAcceptancePending({ termsAcceptedAt: new Date('2026-01-01'), termsVersion: '2025-01-01' })
    ).toBe(true);
  });

  it('NÃO é pendente para quem aceitou a versão vigente', () => {
    expect(
      isTermsAcceptancePending({ termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION })
    ).toBe(false);
  });

  it('é pendente quando há versão mas não há data — registro pela metade não é prova', () => {
    expect(isTermsAcceptancePending({ termsAcceptedAt: null, termsVersion: TERMS_VERSION })).toBe(true);
  });
});

describe('recordTermsAcceptance', () => {
  it('grava data de AGORA e as versões vigentes por padrão', async () => {
    const antes = Date.now();
    const result = await recordTermsAcceptance('user-1');

    expect(result?.termsVersion).toBe(TERMS_VERSION);
    expect(result?.privacyVersion).toBe(PRIVACY_VERSION);
    expect(result?.termsAcceptedAt.getTime()).toBeGreaterThanOrEqual(antes);

    const data = mocks.userUpdate.mock.calls[0]?.[0]?.data;
    // Nada de retroatividade: o consentimento acontece neste instante.
    expect(data.termsAcceptedAt).toBeInstanceOf(Date);
    expect(mocks.userUpdate.mock.calls[0]?.[0]?.where).toEqual({ id: 'user-1' });
  });

  it('devolve null quando o usuário não existe mais (token válido de conta apagada)', async () => {
    mocks.userUpdate.mockRejectedValue(Object.assign(new Error('not found'), { code: 'P2025' }));

    await expect(recordTermsAcceptance('user-sumido')).resolves.toBeNull();
  });

  it('propaga falha real de banco — 500 é a resposta honesta', async () => {
    mocks.userUpdate.mockRejectedValue(new Error('conexão perdida'));

    await expect(recordTermsAcceptance('user-1')).rejects.toThrow('conexão perdida');
  });
});
