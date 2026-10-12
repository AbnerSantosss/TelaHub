import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AsaasError,
  asaasBaseUrl,
  asaasCycle,
  asaasProvider,
  asaasRequest,
  createCustomer,
  isAsaasConfigured,
  isAsaasNfseEnabled,
  loadAsaasConfig,
  mapAsaasStatus,
  sanitizeAsaasMessage,
  splitExpiry,
  timingSafeTokenMatch,
  toAsaasDate,
} from '../asaas.provider';

// Nenhum teste aqui toca a rede: `fetch` é substituído. Um teste de gateway que
// chama o gateway de verdade falha no dia em que o sandbox cair, e aí a suíte
// vira ruído que todo mundo aprende a ignorar.

const ENV_KEYS = ['ASAAS_ENV', 'ASAAS_API_KEY', 'ASAAS_WEBHOOK_TOKEN', 'ASAAS_NFSE_ENABLED', 'ASAAS_BASE_URL'];
const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  vi.unstubAllGlobals();
});

describe('configuração', () => {
  it('separa sandbox de produção pela variável de ambiente', () => {
    expect(asaasBaseUrl('sandbox')).toBe('https://api-sandbox.asaas.com/v3');
    expect(asaasBaseUrl('production')).toBe('https://api.asaas.com/v3');
  });

  it('qualquer valor diferente de "production" cai em sandbox', () => {
    // Erro de digitação em variável de ambiente NÃO pode virar cobrança real:
    // o padrão seguro é o ambiente que não move dinheiro.
    process.env.ASAAS_API_KEY = 'chave';
    process.env.ASAAS_ENV = 'prod';
    expect(loadAsaasConfig().env).toBe('sandbox');
  });

  it('sem chave, recusa em vez de tentar cobrar', () => {
    delete process.env.ASAAS_API_KEY;
    expect(isAsaasConfigured()).toBe(false);
    expect(() => loadAsaasConfig()).toThrow(AsaasError);
  });

  it('NFS-e só liga com o valor exato "true"', () => {
    process.env.ASAAS_NFSE_ENABLED = 'sim';
    expect(isAsaasNfseEnabled()).toBe(false);
    process.env.ASAAS_NFSE_ENABLED = 'true';
    expect(isAsaasNfseEnabled()).toBe(true);
  });
});

describe('segredo não vaza', () => {
  it('a chave é apagada de qualquer mensagem de erro', () => {
    const chave = '$aact_hml_000ExemploDeChave';
    const msg = sanitizeAsaasMessage(`falhou com access_token=${chave} no header`, chave);
    expect(msg).not.toContain(chave);
    expect(msg).toContain('***');
  });

  it('erro do gateway não carrega a chave', async () => {
    process.env.ASAAS_API_KEY = 'chave-secreta-123';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ errors: [{ code: 'invalid', description: 'token chave-secreta-123 inválido' }] }),
          { status: 401 }
        )
      )
    );

    await expect(asaasRequest('/customers', { method: 'GET' })).rejects.toMatchObject({
      name: 'AsaasError',
      status: 401,
    });

    await asaasRequest('/customers', { method: 'GET' }).catch((error: AsaasError) => {
      expect(error.message).not.toContain('chave-secreta-123');
    });
  });
});

describe('comparação de token do webhook', () => {
  it('aceita o token correto', () => {
    expect(timingSafeTokenMatch('segredo', 'segredo')).toBe(true);
  });

  it('recusa token errado, inclusive com o mesmo prefixo', () => {
    expect(timingSafeTokenMatch('segred', 'segredo')).toBe(false);
    expect(timingSafeTokenMatch('segredoX', 'segredo')).toBe(false);
  });

  it('recusa ausência de token dos dois lados', () => {
    // Sem isto, uma instância sem `ASAAS_WEBHOOK_TOKEN` aceitaria qualquer
    // requisição — e qualquer um confirmaria pagamentos que nunca existiram.
    expect(timingSafeTokenMatch(undefined, 'segredo')).toBe(false);
    expect(timingSafeTokenMatch('qualquer', '')).toBe(false);
    expect(timingSafeTokenMatch('', '')).toBe(false);
  });
});

describe('traduções para o dialeto do Asaas', () => {
  it('ciclo', () => {
    expect(asaasCycle('monthly')).toBe('MONTHLY');
    expect(asaasCycle('yearly')).toBe('YEARLY');
  });

  it('vencimento sai no fuso de São Paulo, não em UTC', () => {
    // 05/09 às 23h de Brasília já é 06/09 em UTC. `toISOString()` deslocaria o
    // ciclo inteiro em um dia.
    expect(toAsaasDate(new Date('2026-09-06T02:00:00Z'))).toBe('2026-09-05');
  });

  it('validade do cartão vira mês/ano de 4 dígitos', () => {
    expect(splitExpiry('07/29')).toEqual({ month: '07', year: '2029' });
    expect(splitExpiry('7/2029')).toEqual({ month: '07', year: '2029' });
  });

  it('AWAITING_RISK_ANALYSIS é pendente, nunca aprovado', () => {
    // Tratá-lo como aprovado liberaria conta paga antes de existir dinheiro.
    expect(mapAsaasStatus('AWAITING_RISK_ANALYSIS')).toBe('pending');
    expect(mapAsaasStatus('CONFIRMED')).toBe('approved');
    expect(mapAsaasStatus('RECEIVED')).toBe('approved');
    expect(mapAsaasStatus('PENDING')).toBe('pending');
    expect(mapAsaasStatus('REFUNDED')).toBe('declined');
    expect(mapAsaasStatus(undefined)).toBe('declined');
  });
});

describe('createCustomer', () => {
  it('exige documento — o Asaas não cria cliente sem CPF/CNPJ', async () => {
    process.env.ASAAS_API_KEY = 'chave';
    await expect(
      createCustomer({ name: 'Fulana', email: 'f@ex.com', cpfCnpj: '' })
    ).rejects.toThrow(/CPF ou CNPJ/i);
  });

  it('manda o documento só com dígitos e devolve o id', async () => {
    process.env.ASAAS_API_KEY = 'chave';
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      new Response(JSON.stringify({ id: 'cus_123' }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    const id = await createCustomer({
      name: 'Fulana',
      email: 'f@ex.com',
      cpfCnpj: '123.456.789-09',
      phone: '(11) 99999-8888',
    });

    expect(id).toBe('cus_123');
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.cpfCnpj).toBe('12345678909');
    expect(body.mobilePhone).toBe('11999998888');
  });
});

describe('cobrança recorrente', () => {
  /** Encadeia respostas na ordem em que o provedor faz as chamadas. */
  function stubRespostas(respostas: unknown[]) {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
      const proxima = respostas.shift() ?? {};
      return new Response(JSON.stringify(proxima), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('anual: manda o CAIXA DO CICLO e o ciclo YEARLY (defeito US-A-05)', async () => {
    process.env.ASAAS_API_KEY = 'chave';
    const fetchMock = stubRespostas([
      { id: 'cus_1' },
      { id: 'sub_1' },
      { data: [{ id: 'pay_1', status: 'PENDING' }] },
      { payload: '000201...', encodedImage: 'QUJD', expirationDate: '2026-09-06T00:00:00Z' },
    ]);

    const charge = await asaasProvider.createSubscriptionCharge!({
      method: 'pix',
      // 3 telas × R$ 39 × 12 meses.
      amountCents: 140400,
      interval: 'yearly',
      description: 'TelaHub — plano loja',
      payer: { name: 'Fulana', email: 'f@ex.com', document: '12345678909' },
      externalReference: 'sess-1',
    });

    const corpoAssinatura = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(corpoAssinatura.cycle).toBe('YEARLY');
    // R$ 1.404,00 — o ANO inteiro. O mensal equivalente cobraria 1/12.
    expect(corpoAssinatura.value).toBe(1404);
    expect(corpoAssinatura.billingType).toBe('PIX');
    expect(corpoAssinatura.externalReference).toBe('sess-1');

    // O chargeId é o da PRIMEIRA COBRANÇA (é o que o webhook manda), não o da
    // assinatura — trocar os dois faria o webhook não achar a sessão.
    expect(charge.chargeId).toBe('pay_1');
    expect(charge.gatewaySubscriptionId).toBe('sub_1');
    expect(charge.gatewayCustomerId).toBe('cus_1');
    expect(charge.status).toBe('pending');
    expect(charge.pix?.qrCodeDataUri).toBe('data:image/png;base64,QUJD');
  });

  it('mensal: ciclo MONTHLY com o valor do mês', async () => {
    process.env.ASAAS_API_KEY = 'chave';
    const fetchMock = stubRespostas([
      { id: 'cus_1' },
      { id: 'sub_1' },
      { data: [{ id: 'pay_1', status: 'CONFIRMED' }] },
    ]);

    const charge = await asaasProvider.createSubscriptionCharge!({
      method: 'credit_card',
      amountCents: 14700,
      interval: 'monthly',
      description: 'TelaHub — plano loja',
      payer: { name: 'Fulana', email: 'f@ex.com', document: '12345678909' },
      card: { number: '4111111111111111', holder: 'FULANA', expiry: '07/29', cvv: '123' },
    });

    const corpo = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(corpo.cycle).toBe('MONTHLY');
    expect(corpo.value).toBe(147);
    expect(corpo.creditCard).toMatchObject({ expiryMonth: '07', expiryYear: '2029', ccv: '123' });
    expect(charge.status).toBe('approved');
  });

  it('cartão recusado vira `declined`, não erro de sistema', async () => {
    process.env.ASAAS_API_KEY = 'chave';
    let chamada = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        chamada += 1;
        if (chamada === 1) return new Response(JSON.stringify({ id: 'cus_1' }), { status: 200 });
        return new Response(
          JSON.stringify({ errors: [{ code: 'invalid_creditCard', description: 'Cartão recusado.' }] }),
          { status: 400 }
        );
      })
    );

    const charge = await asaasProvider.createSubscriptionCharge!({
      method: 'credit_card',
      amountCents: 14700,
      interval: 'monthly',
      description: 'TelaHub',
      payer: { name: 'Fulana', email: 'f@ex.com', document: '12345678909' },
      card: { number: '4111111111111111', holder: 'FULANA', expiry: '07/29', cvv: '123' },
    });

    // A tela de recusa existe para este caminho: virar 500 esconderia do cliente
    // o motivo real.
    expect(charge.status).toBe('declined');
    expect(charge.declineReason).toContain('recusado');
  });
});
