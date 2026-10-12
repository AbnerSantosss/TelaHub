import { createHash, timingSafeEqual } from 'crypto';

import type {
  CardInput,
  CreateChargeInput,
  CreateSubscriptionChargeInput,
  PaymentMethod,
  PaymentProvider,
  ProviderCharge,
} from './payment-providers';

// ─────────────────────────────────────────────────────────────────────────────
// PROVEDOR ASAAS
//
// Implementa a interface de `payment-providers.ts` com o gateway escolhido para
// o mercado brasileiro: Pix nativo, cobrança recorrente própria e NFS-e no
// mesmo painel — o que evita montar emissor de nota à parte.
//
// ⚠️ SÓ `import type` DAQUI PARA `payment-providers`. O registro de provedores
// importa ESTE arquivo em tempo de execução; se a volta também fosse um import
// de valor, o CommonJS fecharia um ciclo e uma das metades chegaria `undefined`
// dependendo de quem carrega primeiro. Tipos são apagados na compilação, então
// a seta de execução continua apontando para um lado só. É por isso que o erro
// abaixo é uma classe local em vez de reusar `PaymentConfigError`.
//
// ⚠️ CAMPOS MARCADOS `CONFERIR na doc do Asaas antes do go-live` são os que a
// documentação pública consolidada indica mas que ninguém validou contra a
// conta real. Preferimos um ponto marcado a um campo inventado em silêncio: o
// primeiro falha na homologação, o segundo falha cobrando errado.
// ─────────────────────────────────────────────────────────────────────────────

export type AsaasEnv = 'sandbox' | 'production';

/** Erro do gateway. `status` é o HTTP do Asaas quando houve resposta. */
export class AsaasError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, options: { status?: number; code?: string } = {}) {
    super(message);
    this.name = 'AsaasError';
    this.status = options.status;
    this.code = options.code;
  }
}

export interface AsaasConfig {
  env: AsaasEnv;
  apiKey: string;
  baseUrl: string;
  /** Token esperado no header `asaas-access-token` do webhook. */
  webhookToken: string | null;
  /** Liga a emissão de NFS-e pelo Asaas (muda o `nfseStatus` inicial do `Payment`). */
  nfseEnabled: boolean;
}

/**
 * Base da API por ambiente.
 *
 * O host de sandbox JÁ MUDOU uma vez (`sandbox.asaas.com/api/v3` virou
 * `api-sandbox.asaas.com/v3`). Fica isolado numa função para a troca ser de uma
 * linha, e não um `find` em string espalhada.
 */
export function asaasBaseUrl(env: AsaasEnv): string {
  return env === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';
}

function readEnv(): AsaasEnv {
  return (process.env.ASAAS_ENV || '').trim().toLowerCase() === 'production' ? 'production' : 'sandbox';
}

/** `true` quando há chave configurada — o registro de provedores consulta isto. */
export function isAsaasConfigured(): boolean {
  return Boolean((process.env.ASAAS_API_KEY || '').trim());
}

/**
 * `true` quando o Asaas emite a NFS-e por nós.
 *
 * Lido sem `loadAsaasConfig()` de propósito: quem pergunta isso é o registro de
 * `Payment`, que precisa de uma resposta mesmo numa instância sem chave (conta
 * simulada, ambiente de teste). Exigir a chave aqui derrubaria o
 * provisionamento por causa de um campo de nota fiscal.
 */
export function isAsaasNfseEnabled(): boolean {
  return (process.env.ASAAS_NFSE_ENABLED || '').trim().toLowerCase() === 'true';
}

/**
 * Comparação de tokens em TEMPO CONSTANTE, para o webhook.
 *
 * `a === b` vaza o tamanho do prefixo correto pelo tempo de resposta, e um
 * atacante que consiga medir isso descobre o token byte a byte — e com o token
 * ele confirma pagamentos que nunca aconteceram, liberando conta paga de graça.
 * `timingSafeEqual` exige buffers do MESMO tamanho, por isso o hash antes: sem
 * ele, tamanhos diferentes lançariam exceção (e o próprio "lançou ou não" já
 * seria um canal lateral de tamanho).
 */
export function timingSafeTokenMatch(
  received: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (!received || !expected) return false;
  const a = createHash('sha256').update(received).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Configuração efetiva. Lê o ambiente A CADA CHAMADA de propósito: os testes
 * trocam `process.env` entre casos, e um `const` de módulo congelaria a
 * primeira leitura para todo o processo.
 */
export function loadAsaasConfig(): AsaasConfig {
  const apiKey = (process.env.ASAAS_API_KEY || '').trim();
  if (!apiKey) {
    throw new AsaasError(
      'ASAAS_API_KEY não configurada. Sem a chave o gateway não cobra — configure-a ou use PAYMENT_PROVIDER=simulado.',
      { code: 'asaas_not_configured' }
    );
  }

  const env = readEnv();

  return {
    env,
    apiKey,
    baseUrl: (process.env.ASAAS_BASE_URL || '').trim() || asaasBaseUrl(env),
    webhookToken: (process.env.ASAAS_WEBHOOK_TOKEN || '').trim() || null,
    nfseEnabled: (process.env.ASAAS_NFSE_ENABLED || '').trim().toLowerCase() === 'true',
  };
}

/**
 * Remove qualquer ocorrência da chave da mensagem antes de ela virar log ou
 * resposta HTTP.
 *
 * Não é paranoia: a chave do Asaas viaja num HEADER, e header entra em despejo
 * de erro de cliente HTTP com uma facilidade desconfortável. Uma chave vazada
 * em log de produção dá a quem ler o poder de criar cobrança e sacar saldo — o
 * pior tipo de segredo para vazar. Por isso toda saída de erro passa por aqui.
 */
export function sanitizeAsaasMessage(message: string, apiKey: string | null | undefined): string {
  if (!apiKey) return message;
  return message.split(apiKey).join('***');
}

export type AsaasBillingType = 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'UNDEFINED';

export function billingTypeOf(method: PaymentMethod): AsaasBillingType {
  return method === 'pix' ? 'PIX' : 'CREDIT_CARD';
}

/** `monthly`/`yearly` do nosso domínio → `cycle` do Asaas. */
export function asaasCycle(interval: 'monthly' | 'yearly'): 'MONTHLY' | 'YEARLY' {
  return interval === 'yearly' ? 'YEARLY' : 'MONTHLY';
}

/**
 * Data no formato `YYYY-MM-DD` que o Asaas espera, no fuso de São Paulo.
 *
 * `toISOString().slice(0,10)` estaria errado por até um dia: o servidor roda em
 * UTC, então das 21h às 24h de Brasília a data ISO já é a de amanhã — e um
 * `nextDueDate` um dia à frente desloca todo o ciclo de cobrança.
 */
export function toAsaasDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** `MM/AA` ou `MM/AAAA` → mês e ano de 4 dígitos, como o Asaas exige. */
export function splitExpiry(expiry: string): { month: string; year: string } {
  const [rawMonth = '', rawYear = ''] = String(expiry).split('/');
  const month = rawMonth.replace(/\D/g, '').padStart(2, '0').slice(0, 2);
  const digits = rawYear.replace(/\D/g, '');
  const year = digits.length === 2 ? `20${digits}` : digits.slice(0, 4);
  return { month, year };
}

/** Milissegundos até desistir de uma chamada ao gateway. */
const ASAAS_TIMEOUT_MS = 15_000;

interface AsaasErrorBody {
  errors?: Array<{ code?: string; description?: string }>;
}

/**
 * Chamada crua à API.
 *
 * Três decisões que importam:
 *  • TIMEOUT explícito — sem ele, um gateway lento segura a conexão do cliente
 *    até o proxy cortar, e a pessoa fica olhando um spinner sem saber se pagou.
 *  • A chave vai só no header `access_token`; nunca em query string, que é
 *    gravada em log de acesso de qualquer proxy no caminho.
 *  • Erro NUNCA carrega o corpo da requisição nem o header — só o
 *    `description` que o Asaas devolve, já higienizado.
 */
export async function asaasRequest<T>(
  path: string,
  init: { method: 'GET' | 'POST' | 'DELETE'; body?: unknown },
  config: AsaasConfig = loadAsaasConfig()
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ASAAS_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      method: init.method,
      headers: {
        'Content-Type': 'application/json',
        access_token: config.apiKey,
        // O Asaas usa isto para suporte e para o rate limit por integração.
        // CONFERIR na doc do Asaas antes do go-live: nome do header de
        // identificação da integração (`User-Agent` é aceito hoje).
        // Sem URL: telahub.com.br é domínio de terceiro. Identificar-se ao
        // gateway de pagamento com o site de outra empresa é o pior lugar
        // possível para esse erro aparecer.
        'User-Agent': 'TelaHub/1.0',
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new AsaasError(
      sanitizeAsaasMessage(
        controller.signal.aborted
          ? `Asaas não respondeu em ${ASAAS_TIMEOUT_MS / 1000}s.`
          : `Falha de rede ao falar com o Asaas: ${reason}`,
        config.apiKey
      ),
      { code: 'asaas_unreachable' }
    );
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text().catch(() => '');
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const body = (parsed ?? {}) as AsaasErrorBody;
    const first = body.errors?.[0];
    const description = first?.description || `HTTP ${response.status}`;
    throw new AsaasError(sanitizeAsaasMessage(description, config.apiKey), {
      status: response.status,
      code: first?.code,
    });
  }

  return (parsed ?? {}) as T;
}

// ─── Clientes ────────────────────────────────────────────────────────────────

export interface AsaasCustomerInput {
  name: string;
  email: string;
  /** CPF ou CNPJ, com ou sem máscara. Obrigatório no Asaas. */
  cpfCnpj: string;
  phone?: string | null;
  /** Nosso id (organização ou sessão de checkout), para conciliar dos dois lados. */
  externalReference?: string | null;
}

interface AsaasCustomerResponse {
  id: string;
}

/**
 * Cria o cliente e devolve o id (`cus_...`).
 *
 * Não deduplicamos por CPF aqui: o Asaas aceita repetição e criar um segundo
 * cliente é inofensivo, enquanto uma busca por documento antes de cada cobrança
 * custaria uma ida à rede no caminho de quem está pagando. Quem guarda o id
 * para reuso é `Subscription.gatewayCustomerId`.
 */
export async function createCustomer(
  input: AsaasCustomerInput,
  config: AsaasConfig = loadAsaasConfig()
): Promise<string> {
  const document = (input.cpfCnpj || '').replace(/\D/g, '');
  if (!document) {
    throw new AsaasError('O Asaas exige CPF ou CNPJ para criar o cliente.', {
      code: 'document_required',
    });
  }

  const phone = (input.phone || '').replace(/\D/g, '');

  const customer = await asaasRequest<AsaasCustomerResponse>(
    '/customers',
    {
      method: 'POST',
      body: {
        name: input.name,
        email: input.email,
        cpfCnpj: document,
        // `mobilePhone` é o celular; `phone` seria fixo. Mandar o celular no
        // campo errado atrapalha a cobrança por WhatsApp/SMS do Asaas.
        mobilePhone: phone || undefined,
        externalReference: input.externalReference || undefined,
        // CONFERIR na doc do Asaas antes do go-live: `notificationDisabled`
        // silencia os e-mails de cobrança do Asaas. Fica FALSO (padrão) de
        // propósito — no Pix, o lembrete do gateway é o que traz de volta quem
        // fechou a aba antes de pagar.
      },
    },
    config
  );

  if (!customer.id) {
    throw new AsaasError('O Asaas não devolveu o id do cliente.', { code: 'customer_without_id' });
  }

  return customer.id;
}

// ─── Cobrança avulsa ─────────────────────────────────────────────────────────

export interface AsaasPaymentResponse {
  id: string;
  status?: string;
  invoiceUrl?: string;
  dueDate?: string;
  value?: number;
  billingType?: string;
  creditCard?: { creditCardBrand?: string; creditCardNumber?: string };
}

interface AsaasPixQrCodeResponse {
  /** PNG em base64, SEM o prefixo `data:`. */
  encodedImage?: string;
  /** "Copia e cola" (BR Code). */
  payload?: string;
  expirationDate?: string;
}

/**
 * Status do Asaas → status do nosso domínio.
 *
 * `AWAITING_RISK_ANALYSIS` é PENDENTE, não aprovado: a análise antifraude pode
 * recusar depois. Tratá-lo como aprovado liberaria a conta antes de existir
 * dinheiro — o erro exato que a trava do provedor simulado tenta evitar.
 */
export function mapAsaasStatus(status: string | undefined): ProviderCharge['status'] {
  switch ((status || '').toUpperCase()) {
    case 'CONFIRMED':
    case 'RECEIVED':
    case 'RECEIVED_IN_CASH':
      return 'approved';
    case 'PENDING':
    case 'AWAITING_RISK_ANALYSIS':
    case 'AWAITING_CHARGEBACK_REVERSAL':
      return 'pending';
    default:
      return 'declined';
  }
}

function creditCardPayload(card: CardInput): Record<string, unknown> {
  const { month, year } = splitExpiry(card.expiry);
  return {
    holderName: card.holder,
    number: card.number.replace(/\D/g, ''),
    expiryMonth: month,
    expiryYear: year,
    // Sim, `ccv` com dois "c" — é a grafia do Asaas, não erro de digitação.
    ccv: card.cvv,
  };
}

/**
 * Cria a cobrança avulsa (Pix ou cartão) e devolve o que a tela precisa.
 *
 * ⚠️ VENCIMENTO = HOJE. É o que sustenta a regra anti-cobrança-retroativa
 * descrita em `quota.middleware.ts`: o ciclo começa na data do pagamento, nunca
 * na data em que a conta foi criada.
 */
async function createAsaasCharge(input: CreateChargeInput): Promise<ProviderCharge> {
  const config = loadAsaasConfig();

  const customerId = await createCustomer(
    {
      name: input.payer.name,
      email: input.payer.email,
      cpfCnpj: input.payer.document ?? '',
      externalReference: null,
    },
    config
  );

  const body: Record<string, unknown> = {
    customer: customerId,
    billingType: billingTypeOf(input.method),
    // O Asaas trabalha em REAIS com decimal, não em centavos. Confundir as duas
    // unidades aqui cobra 100× o valor — por isso a divisão é explícita e mora
    // num lugar só.
    value: Number((input.amountCents / 100).toFixed(2)),
    dueDate: toAsaasDate(new Date()),
    description: input.description,
  };

  if (input.method === 'credit_card' && input.card) {
    body.creditCard = creditCardPayload(input.card);
    // CONFERIR na doc do Asaas antes do go-live: `creditCardHolderInfo` exige
    // `postalCode` e `addressNumber`, que o checkout ainda NÃO coleta. Sem eles
    // a cobrança no cartão é recusada pelo Asaas com erro de validação. Ou o
    // formulário passa a pedir CEP e número, ou o cartão vai pelo checkout
    // hospedado do Asaas (`/payments` devolve `invoiceUrl`).
    body.creditCardHolderInfo = {
      name: input.payer.name,
      email: input.payer.email,
      cpfCnpj: (input.payer.document ?? '').replace(/\D/g, ''),
      phone: undefined,
      postalCode: undefined,
      addressNumber: undefined,
    };
  }

  let payment: AsaasPaymentResponse;
  try {
    payment = await asaasRequest<AsaasPaymentResponse>('/payments', { method: 'POST', body }, config);
  } catch (error) {
    // Recusa de cartão volta como 400 com a descrição do emissor. Isso é um
    // caminho NORMAL do fluxo (a tela de recusa existe para ele), não uma falha
    // do sistema: transformar em 500 esconderia do cliente o motivo real.
    if (input.method === 'credit_card' && error instanceof AsaasError && error.status === 400) {
      return {
        providerKey: 'asaas',
        chargeId: '',
        status: 'declined',
        declineReason: error.message,
      };
    }
    throw error;
  }

  const status = mapAsaasStatus(payment.status);

  if (input.method === 'pix') {
    // O QR vem numa chamada separada — a criação da cobrança não o traz.
    const qr = await asaasRequest<AsaasPixQrCodeResponse>(
      `/payments/${payment.id}/pixQrCode`,
      { method: 'GET' },
      config
    ).catch(() => ({}) as AsaasPixQrCodeResponse);

    return {
      providerKey: 'asaas',
      chargeId: payment.id,
      status,
      pix: {
        copyPaste: qr.payload ?? '',
        qrCodeDataUri: qr.encodedImage ? `data:image/png;base64,${qr.encodedImage}` : '',
        // O Asaas chama de `expirationDate`; o nosso contrato de tela é
        // `expiresAt`. A tradução fica aqui, no adaptador — é para isso que ele
        // existe.
        expiresAt: qr.expirationDate ?? '',
      },
    };
  }

  return {
    providerKey: 'asaas',
    chargeId: payment.id,
    status,
    card: {
      brand: payment.creditCard?.creditCardBrand ?? 'Cartão',
      last4: (payment.creditCard?.creditCardNumber ?? '').slice(-4),
    },
    declineReason: status === 'declined' ? 'Pagamento não autorizado pelo emissor.' : undefined,
  };
}

// ─── Assinatura recorrente ───────────────────────────────────────────────────

export interface AsaasSubscriptionInput {
  customerId: string;
  method: PaymentMethod;
  /** Valor do CICLO INTEIRO em centavos: no anual, os 12 meses. */
  cycleAmountCents: number;
  interval: 'monthly' | 'yearly';
  description: string;
  /** Primeira cobrança. Padrão: hoje (nunca retroativo). */
  nextDueDate?: Date;
  externalReference?: string | null;
  card?: CardInput;
}

export interface AsaasSubscriptionResponse {
  id: string;
  status?: string;
  nextDueDate?: string;
}

/**
 * Cria a assinatura recorrente.
 *
 * ⚠️ `value` aqui é o valor DE CADA COBRANÇA, e o Asaas emite uma por ciclo.
 * Com `cycle: YEARLY` isso significa o total do ano — mandar o mensal
 * equivalente cobraria 1/12 do combinado uma vez por ano. É o defeito US-A-05,
 * e é por isso que o parâmetro se chama `cycleAmountCents` e não `amountCents`.
 */
export async function createSubscription(
  input: AsaasSubscriptionInput,
  config: AsaasConfig = loadAsaasConfig()
): Promise<AsaasSubscriptionResponse> {
  const body: Record<string, unknown> = {
    customer: input.customerId,
    billingType: billingTypeOf(input.method),
    value: Number((input.cycleAmountCents / 100).toFixed(2)),
    // Hoje, não a data de criação da conta: o primeiro ciclo começa quando se
    // paga (regra anti-cobrança-retroativa).
    nextDueDate: toAsaasDate(input.nextDueDate ?? new Date()),
    cycle: asaasCycle(input.interval),
    description: input.description,
    externalReference: input.externalReference || undefined,
  };

  if (input.method === 'credit_card' && input.card) {
    body.creditCard = creditCardPayload(input.card);
    // Mesma pendência de `creditCardHolderInfo` da cobrança avulsa.
    // CONFERIR na doc do Asaas antes do go-live.
  }

  const subscription = await asaasRequest<AsaasSubscriptionResponse>(
    '/subscriptions',
    { method: 'POST', body },
    config
  );

  if (!subscription.id) {
    throw new AsaasError('O Asaas não devolveu o id da assinatura.', {
      code: 'subscription_without_id',
    });
  }

  return subscription;
}

/**
 * Cancela a assinatura no gateway.
 *
 * Nunca lança para o chamador: o cancelamento do NOSSO lado já foi gravado, e
 * uma indisponibilidade do Asaas não pode fazer o cliente receber "não
 * conseguimos cancelar" depois de o pedido estar registrado. Devolve `false`
 * para o chamador auditar e um humano reprocessar.
 */
export async function cancelSubscription(
  subscriptionId: string,
  config?: AsaasConfig
): Promise<boolean> {
  try {
    // A configuração é lida DENTRO do try: como parâmetro com valor padrão ela
    // seria avaliada antes do bloco e uma chave ausente viraria exceção — bem
    // no caminho de quem está cancelando, que é onde menos se pode falhar.
    await asaasRequest(
      `/subscriptions/${subscriptionId}`,
      { method: 'DELETE' },
      config ?? loadAsaasConfig()
    );
    return true;
  } catch (error) {
    console.warn(
      '[asaas] falha ao cancelar a assinatura no gateway (o cancelamento local foi mantido):',
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

/** Página de cobranças de uma assinatura. */
interface AsaasPaymentListResponse {
  // CONFERIR na doc do Asaas antes do go-live: a listagem vem em `data`, com
  // `hasMore`/`totalCount` ao lado. Se o envelope mudar, é aqui que quebra.
  data?: AsaasPaymentResponse[];
}

/**
 * Cria a RECORRÊNCIA e devolve a primeira cobrança dela, pronta para a tela.
 *
 * Por que não bastava `createCharge`: cobrança avulsa cobra UMA vez. Sem
 * assinatura no gateway, o cliente paga o primeiro mês e nunca mais — e o
 * produto descobre isso 30 dias depois, sem receita e sem aviso.
 *
 * O `chargeId` devolvido é o da PRIMEIRA COBRANÇA, não o da assinatura, porque
 * é o id que o webhook manda em `payment.id` e é por ele que a sessão do
 * checkout é reencontrada.
 */
async function createAsaasSubscriptionCharge(
  input: CreateSubscriptionChargeInput
): Promise<ProviderCharge> {
  const config = loadAsaasConfig();

  const customerId = await createCustomer(
    {
      name: input.payer.name,
      email: input.payer.email,
      cpfCnpj: input.payer.document ?? '',
      externalReference: input.externalReference ?? null,
    },
    config
  );

  let subscription: AsaasSubscriptionResponse;
  try {
    subscription = await createSubscription(
      {
        customerId,
        method: input.method,
        cycleAmountCents: input.amountCents,
        interval: input.interval,
        description: input.description,
        externalReference: input.externalReference ?? null,
        card: input.card,
      },
      config
    );
  } catch (error) {
    if (input.method === 'credit_card' && error instanceof AsaasError && error.status === 400) {
      return {
        providerKey: 'asaas',
        chargeId: '',
        status: 'declined',
        declineReason: error.message,
        gatewayCustomerId: customerId,
      };
    }
    throw error;
  }

  // A primeira cobrança nasce junto com a assinatura, mas em outra chamada.
  const lista = await asaasRequest<AsaasPaymentListResponse>(
    `/subscriptions/${subscription.id}/payments`,
    { method: 'GET' },
    config
  ).catch(() => ({}) as AsaasPaymentListResponse);

  const primeira = lista.data?.[0];
  const status = mapAsaasStatus(primeira?.status);

  const base: ProviderCharge = {
    providerKey: 'asaas',
    chargeId: primeira?.id ?? '',
    status,
    gatewayCustomerId: customerId,
    gatewaySubscriptionId: subscription.id,
  };

  if (input.method === 'pix' && primeira?.id) {
    const qr = await asaasRequest<AsaasPixQrCodeResponse>(
      `/payments/${primeira.id}/pixQrCode`,
      { method: 'GET' },
      config
    ).catch(() => ({}) as AsaasPixQrCodeResponse);

    return {
      ...base,
      pix: {
        copyPaste: qr.payload ?? '',
        qrCodeDataUri: qr.encodedImage ? `data:image/png;base64,${qr.encodedImage}` : '',
        expiresAt: qr.expirationDate ?? '',
      },
    };
  }

  return {
    ...base,
    card: {
      brand: primeira?.creditCard?.creditCardBrand ?? 'Cartão',
      last4: (primeira?.creditCard?.creditCardNumber ?? '').slice(-4),
    },
    declineReason: status === 'declined' ? 'Pagamento não autorizado pelo emissor.' : undefined,
  };
}

// ─── Registro do provedor ────────────────────────────────────────────────────

export const asaasProvider: PaymentProvider = {
  key: 'asaas',
  label: 'Asaas',
  implemented: true,
  // Cobra de verdade — é o que libera o uso em produção.
  simulated: false,
  methods: ['pix', 'credit_card'],
  createCharge: createAsaasCharge,
  createSubscriptionCharge: createAsaasSubscriptionCharge,
};
