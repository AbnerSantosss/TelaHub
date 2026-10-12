import { describe, expect, it } from 'vitest';

import {
  PRIVACY_VERSION,
  TERMS_REQUIRED_MESSAGE,
  TERMS_VERSION,
  signupSchema,
} from '../signup.schema';

/**
 * Schema puro: sem banco, sem rede. O que está sob teste aqui é a assimetria
 * que decide o negócio — o aceite dos termos BLOQUEIA o cadastro, a atribuição
 * de campanha NUNCA bloqueia.
 */

const base = {
  companyName: 'Condomínio Alfa',
  name: 'Fulano de Teste',
  email: 'Fulano@Exemplo.com',
  password: 'senhaSegura123',
};

describe('signupSchema — aceite de Termos e Privacidade', () => {
  it('recusa cadastro sem o campo `acceptedTerms`, com mensagem clara', () => {
    const result = signupSchema.safeParse({ ...base });

    expect(result.success).toBe(false);
    if (result.success) return;

    const issue = result.error.issues.find((i) => i.path[0] === 'acceptedTerms');
    expect(issue?.message).toBe(TERMS_REQUIRED_MESSAGE);
  });

  it('recusa `acceptedTerms: false` igual a não mandar nada — caixa desmarcada não é consentimento', () => {
    const result = signupSchema.safeParse({ ...base, acceptedTerms: false });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.message).toBe(TERMS_REQUIRED_MESSAGE);
  });

  it('aceita `acceptedTerms: true` e mantém a versão que a tela informou', () => {
    const result = signupSchema.safeParse({
      ...base,
      acceptedTerms: true,
      termsVersion: '2025-01-01',
      privacyVersion: '2025-01-01',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    // Guardamos o que o cliente exibiu, não a versão atual: é isso que diz a
    // que texto o "aceito" se referia. A pendência é recalculada depois.
    expect(result.data.termsVersion).toBe('2025-01-01');
  });

  it('a versão vigente é 2026-09-05 nos dois documentos', () => {
    expect(TERMS_VERSION).toBe('2026-09-05');
    expect(PRIVACY_VERSION).toBe('2026-09-05');
  });
});

describe('signupSchema — atribuição de campanha', () => {
  it('normaliza e trunca em 255 caracteres, sem recusar o cadastro', () => {
    const result = signupSchema.safeParse({
      ...base,
      acceptedTerms: true,
      attribution: {
        utmSource: '  google  ',
        utmCampaign: 'x'.repeat(400),
        utmMedium: '',
        landingPath: '/planos',
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.attribution?.utmSource).toBe('google');
    expect(result.data.attribution?.utmCampaign).toHaveLength(255);
    // String vazia não vira origem: `utm_medium=` na URL é ausência, não valor.
    expect(result.data.attribution?.utmMedium).toBeUndefined();
    expect(result.data.attribution?.landingPath).toBe('/planos');
  });

  it('descarta valor que não é string em vez de rejeitar o cadastro', () => {
    const result = signupSchema.safeParse({
      ...base,
      acceptedTerms: true,
      attribution: { gclid: 12345, utmSource: { a: 1 }, fbclid: 'IwAR123' },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.attribution?.gclid).toBeUndefined();
    expect(result.data.attribution?.utmSource).toBeUndefined();
    expect(result.data.attribution?.fbclid).toBe('IwAR123');
  });

  it.each([
    ['string solta', 'utm_source=google'],
    ['nulo', null],
    ['lista', ['utm_source']],
  ])('não deixa um `attribution` malformado (%s) derrubar o cadastro', (_caso, valor) => {
    const result = signupSchema.safeParse({ ...base, acceptedTerms: true, attribution: valor });

    // Perder uma UTM custa uma linha de relatório; perder o cadastro custa um
    // cliente. O schema sempre escolhe salvar o cadastro.
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.attribution).toEqual({});
  });

  it('aceita os identificadores do Pixel sem torná-los obrigatórios', () => {
    const semPixel = signupSchema.safeParse({ ...base, acceptedTerms: true });
    expect(semPixel.success).toBe(true);

    const comPixel = signupSchema.safeParse({
      ...base,
      acceptedTerms: true,
      metaEventId: 'a3f1c0de-0000-4000-8000-000000000000',
      fbp: 'fb.1.1700000000000.123456789',
      fbc: 'fb.1.1700000000000.IwAR123',
    });

    expect(comPixel.success).toBe(true);
    if (!comPixel.success) return;
    expect(comPixel.data.metaEventId).toBe('a3f1c0de-0000-4000-8000-000000000000');
  });
});
