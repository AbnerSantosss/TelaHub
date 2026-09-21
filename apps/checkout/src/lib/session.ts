// Cliente da sessão pública de checkout.
//
// A sessão nasce na PRIMEIRA visita, antes de qualquer dado pessoal: é isso que
// torna o abandono mensurável por etapa. Cada passo concluído é um PATCH, e o
// valor devolvido pelo servidor é o único válido.
import { api } from './api';
import type { BillingInterval } from './plans';

export type CheckoutStatus =
  | 'started'
  | 'identified'
  | 'payment_pending'
  | 'paid'
  | 'abandoned'
  | 'expired';

/** Sessão como o comprador pode vê-la: nada de id interno, org ou atribuição. */
export interface CheckoutSession {
  publicToken: string;
  status: CheckoutStatus;
  planCode: string | null;
  screens: number;
  /**
   * Intervalo de cobrança decidido pelo servidor. Note que `amountCents`
   * continua sendo o MENSAL EQUIVALENTE mesmo no anual — o valor do ano é
   * `amountCents × 12`, e é ele que a tela precisa dizer em voz alta.
   */
  billingInterval: BillingInterval;
  amountCents: number;
  currency: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  companyName: string | null;
  marketingOptIn: boolean;
  startedAt: string | null;
  lastSeenAt: string | null;
  identifiedAt: string | null;
  paymentAt: string | null;
  expiresAt: string | null;
}

/** Atribuição de campanha capturada na chegada. Alimenta o relatório do funil. */
export interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
}

export interface UpdateSessionInput {
  planCode?: string;
  screens?: number;
  /** Nome do campo no corpo é `interval`, não `billingInterval` — é o contrato. */
  interval?: BillingInterval;
  name?: string;
  email?: string;
  phone?: string;
  document?: string;
  companyName?: string;
  /** Consentimento para novidades. Só viaja quando a pessoa mexeu na caixa. */
  marketingOptIn?: boolean;
}

/**
 * Resultado do `submit`. Hoje `charged` é sempre `false`: não há gateway
 * integrado, então a sessão só vai para "aguardando pagamento".
 */
export interface CheckoutPaymentResult {
  status: string;
  gateway: string | null;
  nextStep: string;
  charged: boolean;
  message: string;
}

const FALLBACK_MESSAGE =
  'Recebemos sua solicitação. Nenhuma cobrança foi feita: nosso time comercial entra em ' +
  'contato pelo e-mail e telefone informados para confirmar o plano e enviar o pagamento.';

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const optionalText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

/**
 * Só `'yearly'` explícito vira anual — campo ausente, `'anual'`, `'annual'` ou
 * lixo colado na URL viram mensal. O default precisa ser o intervalo de MENOR
 * compromisso: cair no anual por causa de um parâmetro malformado prenderia a
 * pessoa em 12 meses que ela não pediu.
 */
export const parseBillingInterval = (value: unknown): BillingInterval =>
  value === 'yearly' ? 'yearly' : 'monthly';

const STATUSES: CheckoutStatus[] = [
  'started',
  'identified',
  'payment_pending',
  'paid',
  'abandoned',
  'expired',
];

/**
 * A rota devolve `{ session }`; aceitar também o objeto solto evita que uma
 * diferença de envelope entre versões do backend derrube a tela.
 */
function normalizeSession(payload: unknown): CheckoutSession {
  const envelope = asRecord(payload);
  const raw = asRecord('session' in envelope ? envelope.session : envelope);

  const publicToken = optionalText(raw.publicToken);
  if (!publicToken) {
    throw new Error('Resposta de sessão inválida: token público ausente.');
  }

  const status = STATUSES.find((candidate) => candidate === raw.status) ?? 'started';

  return {
    publicToken,
    status,
    planCode: optionalText(raw.planCode),
    screens:
      typeof raw.screens === 'number' && Number.isFinite(raw.screens)
        ? Math.max(1, Math.floor(raw.screens))
        : 1,
    billingInterval: parseBillingInterval(raw.billingInterval),
    amountCents:
      typeof raw.amountCents === 'number' && Number.isFinite(raw.amountCents)
        ? raw.amountCents
        : 0,
    currency: optionalText(raw.currency) ?? 'BRL',
    name: optionalText(raw.name),
    email: optionalText(raw.email),
    phone: optionalText(raw.phone),
    document: optionalText(raw.document),
    companyName: optionalText(raw.companyName),
    // `=== true` e não coerção: qualquer coisa que não seja o booleano
    // verdadeiro vindo do servidor é tratada como "não consentiu". Consentimento
    // é o único campo em que adivinhar para o lado permissivo é inaceitável.
    marketingOptIn: raw.marketingOptIn === true,
    startedAt: optionalText(raw.startedAt),
    lastSeenAt: optionalText(raw.lastSeenAt),
    identifiedAt: optionalText(raw.identifiedAt),
    paymentAt: optionalText(raw.paymentAt),
    expiresAt: optionalText(raw.expiresAt),
  };
}

export const createSession = async (input: Attribution = {}): Promise<CheckoutSession> =>
  normalizeSession(await api.post<unknown>('/checkout/sessions', input));

export const getSession = async (publicToken: string): Promise<CheckoutSession> =>
  normalizeSession(await api.get<unknown>(`/checkout/sessions/${encodeURIComponent(publicToken)}`));

export const updateSession = async (
  publicToken: string,
  input: UpdateSessionInput
): Promise<CheckoutSession> =>
  normalizeSession(
    await api.patch<unknown>(`/checkout/sessions/${encodeURIComponent(publicToken)}`, input)
  );

export const submitSession = async (
  publicToken: string,
  input: { paymentMethod?: string; note?: string } = {}
): Promise<{ session: CheckoutSession; payment: CheckoutPaymentResult }> => {
  const payload = asRecord(
    await api.post<unknown>(
      `/checkout/sessions/${encodeURIComponent(publicToken)}/submit`,
      input
    )
  );
  const payment = asRecord(payload.payment);

  return {
    session: normalizeSession(payload),
    payment: {
      status: optionalText(payment.status) ?? 'manual',
      gateway: optionalText(payment.gateway),
      nextStep: optionalText(payment.nextStep) ?? 'contato-comercial',
      charged: payment.charged === true,
      message: optionalText(payment.message) ?? FALLBACK_MESSAGE,
    },
  };
};

// ───────────────────────────────────────────────────────────────────────────
// PAGAMENTO
//
// O front NÃO decide o que pode ser oferecido: quem manda é
// `GET /checkout/payment-config`. Se a tela montasse os métodos por conta
// própria, mostraria Pix num provedor que não faz Pix — e, pior, o aviso de
// "pagamento simulado" seria a primeira coisa a ficar desatualizada no dia em
// que o gateway real entrasse. `simulated` vem do servidor por isso.
// ───────────────────────────────────────────────────────────────────────────

/** Métodos efetivamente cobráveis. Boleto não está aqui de propósito. */
export type PaymentMethod = 'pix' | 'credit_card';

export interface PaymentConfig {
  provider: string;
  providerLabel: string;
  /** `true` = nenhum valor é cobrado de verdade. A tela precisa dizer isso. */
  simulated: boolean;
  methods: PaymentMethod[];
}

/** Dados do cartão. Trafegam uma vez e não são guardados em lugar nenhum. */
export interface CardInput {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
}

export interface PixCharge {
  /** Payload "copia e cola" (BR Code). */
  copyPaste: string;
  /** Imagem do QR já pronta, para não precisarmos de biblioteca de QR aqui. */
  qrCodeDataUri: string;
  expiresAt: string | null;
}

export interface CardCharge {
  brand: string;
  last4: string;
}

export interface StartPaymentResult {
  method: PaymentMethod;
  provider: string;
  simulated: boolean;
  /** `declined` NÃO é erro HTTP: vem 200 e a tela deixa tentar de novo. */
  status: 'pending' | 'approved' | 'declined';
  /** `true` quando a conta já foi liberada (cartão aprovado / Pix confirmado). */
  paid: boolean;
  pix: PixCharge | null;
  card: CardCharge | null;
  declineReason: string | null;
  message: string;
}

export interface SimulatePaymentResult {
  paid: boolean;
  alreadyPaid: boolean;
  message: string;
}

/**
 * Deduplicação do `Purchase` entre o navegador e a Conversions API.
 *
 * Vai no CORPO da confirmação (tanto em `/pay` quanto em `/simulate-payment`)
 * porque o servidor precisa repetir o evento com o MESMO `eventID` que o Pixel
 * usou aqui. Sem isso a Meta conta duas conversões — não dá erro, não aparece
 * em log nenhum, só divide por dois todo custo por resultado do painel e a
 * decisão de mídia passa a ser tomada em cima de um número inventado.
 *
 * Os nomes são os mesmos de `signup.schema.ts` (`metaEventId`, `fbp`, `fbc`)
 * de propósito: dois nomes para a mesma coisa dentro do mesmo backend é a
 * próxima divergência garantida.
 *
 * ⚠️ Enquanto o backend não persistir estes campos, o Zod da rota simplesmente
 * os descarta (o schema não é `strict`), então mandar já é seguro — e é o que
 * permite ligar o lado do servidor sem um segundo deploy do checkout.
 */
export interface PaymentTrackingInput {
  /** `eventID` gerado no navegador ANTES da confirmação. */
  metaEventId?: string;
  /** Cookie `_fbp`. */
  fbp?: string;
  /** Cookie `_fbc` (quando ausente, o servidor reconstrói do `fbclid`). */
  fbc?: string;
}

const PAYMENT_METHODS: PaymentMethod[] = ['pix', 'credit_card'];

const CHARGE_STATUSES: StartPaymentResult['status'][] = ['pending', 'approved', 'declined'];

function normalizePaymentConfig(payload: unknown): PaymentConfig {
  const raw = asRecord(payload);
  const methods = Array.isArray(raw.methods) ? raw.methods : [];

  return {
    provider: optionalText(raw.provider) ?? 'desconhecido',
    providerLabel: optionalText(raw.providerLabel) ?? 'provedor de pagamento',
    // Só `true` explícito conta como simulado; qualquer outra coisa é tratada
    // como cobrança REAL. Errar para o lado de "é dinheiro de verdade" é o
    // único default seguro: o oposto esconderia uma cobrança real do usuário.
    simulated: raw.simulated === true,
    // Filtra contra a lista conhecida em vez de confiar no que veio: um método
    // novo no backend não pode fazer a tela renderizar um card sem formulário.
    methods: PAYMENT_METHODS.filter((method) => methods.includes(method)),
  };
}

/**
 * O `qrCodeDataUri` vai direto para o `src` de uma `<img>`. Aceitar qualquer
 * string ali significaria deixar a resposta escolher o esquema da URL
 * (`javascript:`, um host externo que vaza a visita); por isso só passa data
 * URI de imagem.
 */
const safeImageDataUri = (value: unknown): string | null => {
  const text = optionalText(value);
  return text && /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/i.test(text) ? text : null;
};

function normalizePixCharge(payload: unknown): PixCharge | null {
  const raw = asRecord(payload);
  const copyPaste = optionalText(raw.copyPaste);
  const qrCodeDataUri = safeImageDataUri(raw.qrCodeDataUri);
  // Sem o "copia e cola" não há Pix pagável — o QR sozinho não é suficiente
  // (quem paga pelo mesmo aparelho não consegue escanear a própria tela).
  if (!copyPaste) return null;
  return { copyPaste, qrCodeDataUri: qrCodeDataUri ?? '', expiresAt: optionalText(raw.expiresAt) };
}

function normalizeStartPayment(payload: unknown, fallbackMethod: PaymentMethod): StartPaymentResult {
  const raw = asRecord(payload);
  const method = PAYMENT_METHODS.find((candidate) => candidate === raw.method) ?? fallbackMethod;
  const status = CHARGE_STATUSES.find((candidate) => candidate === raw.status) ?? 'pending';
  const card = asRecord(raw.card);

  return {
    method,
    provider: optionalText(raw.provider) ?? 'desconhecido',
    simulated: raw.simulated === true,
    status,
    // `paid` só é verdade se o servidor disser explicitamente. Um `true`
    // inferido do status abriria a tela de sucesso sem a conta liberada.
    paid: raw.paid === true,
    pix: status === 'pending' ? normalizePixCharge(raw.pix) : null,
    card: optionalText(card.last4)
      ? { brand: optionalText(card.brand) ?? 'cartão', last4: String(card.last4) }
      : null,
    declineReason: optionalText(raw.declineReason),
    message: optionalText(raw.message) ?? 'Pagamento processado.',
  };
}

/** O que a etapa de pagamento pode oferecer, segundo o provedor ativo. */
export const fetchPaymentConfig = async (): Promise<PaymentConfig> =>
  normalizePaymentConfig(await api.get<unknown>('/checkout/payment-config'));

/**
 * Inicia a cobrança. Cartão resolve de forma síncrona (`approved`/`declined`);
 * Pix volta `pending` com o QR e a confirmação chega depois.
 */
export const startPayment = async (
  publicToken: string,
  input: { method: PaymentMethod; card?: CardInput; tracking?: PaymentTrackingInput }
): Promise<StartPaymentResult> =>
  normalizeStartPayment(
    await api.post<unknown>(`/checkout/sessions/${encodeURIComponent(publicToken)}/pay`, {
      method: input.method,
      card: input.card,
      // Os campos de deduplicação vão no NÍVEL DE CIMA do corpo, ao lado de
      // `method` — mesma forma do cadastro (`signup.schema.ts`). Aninhá-los em
      // `tracking: {...}` obrigaria o backend a conhecer duas formas.
      ...(input.tracking ?? {}),
    }),
    input.method
  );

/**
 * Confirma um pagamento SIMULADO (o "eu paguei o Pix" da demonstração).
 * Esta rota só existe enquanto o provedor ativo for simulado — com gateway
 * real ela responde 404, de propósito.
 */
export const simulatePayment = async (
  publicToken: string,
  tracking: PaymentTrackingInput = {}
): Promise<SimulatePaymentResult> => {
  const raw = asRecord(
    await api.post<unknown>(
      `/checkout/sessions/${encodeURIComponent(publicToken)}/simulate-payment`,
      // O Pix simulado é uma confirmação como qualquer outra: quando o webhook
      // real existir, é ele quem vai repetir o `Purchase` do servidor — e vai
      // precisar do mesmo `metaEventId` que sai daqui.
      tracking
    )
  );

  return {
    paid: raw.paid === true,
    alreadyPaid: raw.alreadyPaid === true,
    message: optionalText(raw.message) ?? 'Pagamento simulado confirmado.',
  };
};

const UTM_KEYS: Array<[string, keyof Attribution]> = [
  ['utm_source', 'utmSource'],
  ['utm_medium', 'utmMedium'],
  ['utm_campaign', 'utmCampaign'],
  ['utm_content', 'utmContent'],
  ['utm_term', 'utmTerm'],
];

/**
 * Atribuição da visita: UTMs da query string + `document.referrer`. Precisa ser
 * lida ANTES de a URL ser reescrita com o token, senão a origem do lead se
 * perde e o relatório por campanha fica cego.
 */
export function readAttribution(): Attribution {
  const attribution: Attribution = {};
  try {
    const params = new URLSearchParams(window.location.search);
    for (const [param, key] of UTM_KEYS) {
      const value = params.get(param);
      if (value && value.trim()) attribution[key] = value.trim().slice(0, 200);
    }
    if (document.referrer) attribution.referrer = document.referrer.slice(0, 1000);
  } catch {
    // Ambiente sem `location`/`document` utilizável: segue sem atribuição.
  }
  return attribution;
}

/**
 * Plano, telas e intervalo sugeridos pelo link (ex.: vindo da página de preços).
 *
 * O `interval` fecha a lacuna que existia entre as duas superfícies: a landing
 * anuncia o preço anual em destaque e manda para cá com `?interval=yearly`. Sem
 * ler esse parâmetro, quem clicou em "R$ 39 no anual" chegava a uma tela de
 * R$ 49 — divergência entre o anúncio e a contratação, que é o que os arts. 30
 * e 37 do CDC alcançam (e o jeito mais fácil de perder a venda no último passo).
 *
 * Nada aqui pode derrubar a página: os três campos vêm de fora e caem em valor
 * neutro quando não fazem sentido.
 */
export function readSelectionHint(): {
  planCode: string | null;
  screens: number | null;
  interval: BillingInterval;
} {
  try {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan') ?? params.get('planCode');
    const screens = params.get('screens') ?? params.get('telas');
    const parsed = screens ? Number.parseInt(screens, 10) : Number.NaN;
    return {
      planCode: plan && /^[a-z][a-z0-9-]{0,59}$/i.test(plan) ? plan.toLowerCase() : null,
      screens: Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 1000) : null,
      interval: parseBillingInterval((params.get('interval') ?? '').trim().toLowerCase()),
    };
  } catch {
    return { planCode: null, screens: null, interval: 'monthly' };
  }
}

/**
 * Troca `/c` por `/c/<token>` SEM criar entrada no histórico: um "voltar" que
 * caísse numa rota sem token criaria uma segunda sessão e duplicaria o lead no
 * relatório. Preserva a query string (atribuição continua visível/depurável).
 */
export function replaceUrlWithToken(publicToken: string): void {
  try {
    const url = new URL(window.location.href);
    url.pathname = `/c/${publicToken}`;
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // Sem History API: a URL fica como está; a sessão em memória segue válida.
  }
}
