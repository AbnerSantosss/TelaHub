import { z } from 'zod';

/**
 * Status possíveis de uma `CheckoutSession` (espelha o comentário do schema
 * Prisma). A ordem é a do funil: cada passo adiante é uma etapa de conversão.
 */
export const CHECKOUT_STATUSES = [
  'started',
  'identified',
  'payment_pending',
  'paid',
  'abandoned',
  'expired',
] as const;

export type CheckoutStatus = (typeof CHECKOUT_STATUSES)[number];

/**
 * Tipos de `CheckoutEvent`. Os oito primeiros vêm do comentário do schema;
 * `recovery_notified` foi acrescentado por esta frente para distinguir DUAS
 * coisas que o comentário original juntava em `recovered`:
 *
 *   - `recovery_notified` — nós contatamos o lead (ação da equipe);
 *   - `recovered`          — o lead voltou e mexeu no checkout (ação dele).
 *
 * Misturar as duas inflaria a taxa de recuperação com contatos que não
 * converteram nada.
 */
export const CHECKOUT_EVENT_TYPES = [
  'view',
  'plan_selected',
  'screens_changed',
  'identify',
  'payment_selected',
  'submit',
  'paid',
  'abandoned',
  'recovered',
  'recovery_notified',
] as const;

export type CheckoutEventType = (typeof CHECKOUT_EVENT_TYPES)[number];

/** Teto defensivo de telas por sessão — evita valor absurdo virar fatura. */
export const MAX_SCREENS = 1000;

/**
 * Intervalos de cobrança aceitos pelo checkout. Enum fechado de propósito: o
 * intervalo escolhe QUAL PREÇO do catálogo vale, então uma string livre aqui
 * viraria preço errado na sessão (e no relatório de conversão do anual).
 */
export const BILLING_INTERVALS = ['monthly', 'yearly'] as const;

export type CheckoutBillingInterval = (typeof BILLING_INTERVALS)[number];

/**
 * Trata string vazia como campo ausente. O formulário do checkout envia `""`
 * para o que o visitante ainda não digitou; sem isso, cada passo derrubaria a
 * validação (ou pior: gravaria string vazia como se fosse um nome).
 */
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema.optional()
  );

const planCodeField = z.string().trim().min(1, 'Informe o código do plano.').max(60);
const screensField = z.coerce
  .number()
  .int('Número de telas deve ser inteiro.')
  .min(1, 'Mínimo de 1 tela.')
  .max(MAX_SCREENS, `Máximo de ${MAX_SCREENS} telas.`);

const intervalField = z.enum(BILLING_INTERVALS, {
  message: 'Intervalo inválido: use "monthly" ou "yearly".',
});

const utmField = z.string().trim().max(200);
const urlishField = z.string().trim().max(1000);

const nameField = z.string().trim().min(2, 'Informe o nome completo.').max(120);
const emailField = z.string().trim().toLowerCase().email('Informe um e-mail válido.').max(180);
const phoneField = z
  .string()
  .trim()
  .max(30)
  // Guarda só os dígitos: o mesmo telefone digitado com e sem máscara tem que
  // gerar o mesmo registro, senão a busca do painel não acha o lead.
  .transform((value) => value.replace(/\D/g, ''))
  .refine((value) => value.length >= 10 && value.length <= 13, 'Informe DDD + número.');
const documentField = z
  .string()
  .trim()
  .max(25)
  .transform((value) => value.replace(/\D/g, ''))
  .refine((value) => value.length === 11 || value.length === 14, 'Informe um CPF ou CNPJ válido.');
const companyNameField = z.string().trim().min(2).max(120);

/**
 * `POST /api/checkout/sessions` — tudo opcional de propósito: a sessão nasce na
 * primeira visita, antes de qualquer formulário. Sem isso o abandono do primeiro
 * passo seria invisível.
 */
export const createCheckoutSessionSchema = z.object({
  planCode: optional(planCodeField),
  screens: optional(screensField),
  /** Ausente = `monthly`. O default mora no serviço, não aqui. */
  interval: optional(intervalField),
  utmSource: optional(utmField),
  utmMedium: optional(utmField),
  utmCampaign: optional(utmField),
  utmContent: optional(utmField),
  utmTerm: optional(utmField),
  referrer: optional(urlishField),
});

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;

/**
 * `PATCH /api/checkout/sessions/:publicToken` — enriquecimento passo a passo.
 *
 * `amountCents` NÃO está aqui e nunca deve estar: o valor é recalculado no
 * servidor a partir de `planCode` + `screens`. Chave desconhecida no corpo é
 * descartada pelo Zod (comportamento padrão de `z.object`), então mandar
 * `amountCents: 1` não tem efeito nenhum.
 */
export const updateCheckoutSessionSchema = z
  .object({
    planCode: optional(planCodeField),
    screens: optional(screensField),
    interval: optional(intervalField),
    name: optional(nameField),
    email: optional(emailField),
    phone: optional(phoneField),
    document: optional(documentField),
    companyName: optional(companyNameField),
    // Consentimento de novidades. Opcional no corpo (a tela pode mandar só o
    // nome), mas quando vem, vem explícito: não há valor "presumido" aqui.
    marketingOptIn: z.boolean().optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    'Envie ao menos um campo para atualizar.'
  );

export type UpdateCheckoutSessionInput = z.infer<typeof updateCheckoutSessionSchema>;

/** Formas de pagamento pretendidas. Registradas para relatório — não cobram nada. */
export const PAYMENT_METHODS = ['pix', 'credit_card', 'boleto', 'transfer'] as const;

export const submitCheckoutSessionSchema = z.object({
  paymentMethod: optional(z.enum(PAYMENT_METHODS)),
  note: optional(z.string().trim().max(500)),
});

export type SubmitCheckoutSessionInput = z.infer<typeof submitCheckoutSessionSchema>;

/** Métodos efetivamente COBRÁVEIS. Subconjunto de `PAYMENT_METHODS`. */
export const PAYABLE_METHODS = ['pix', 'credit_card'] as const;

/**
 * Dados de cartão.
 *
 * Note o que NÃO está aqui: nenhum campo é `optional()` com fallback silencioso,
 * porque cartão incompleto tem que falhar alto. E nada disto é persistido — ver
 * o comentário em `payment.service.ts::startPayment`.
 */
export const cardSchema = z.object({
  number: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((digits) => digits.length >= 13 && digits.length <= 19, {
      message: 'Número de cartão deve ter entre 13 e 19 dígitos.',
    }),
  holder: z.string().trim().min(2, 'Informe o nome impresso no cartão.').max(120),
  expiry: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])\/?([0-9]{2}|[0-9]{4})$/, 'Validade inválida (use MM/AA).'),
  cvv: z.string().trim().regex(/^[0-9]{3,4}$/, 'CVV inválido.'),
});

export const startPaymentSchema = z
  .object({
    method: z.enum(PAYABLE_METHODS, { message: 'Escolha Pix ou cartão de crédito.' }),
    card: cardSchema.optional(),
    // ── Rastreamento de conversão (Meta) ─────────────────────────────────────
    // Chegam do NAVEGADOR e precisam ser aceitos aqui, senão o Zod os descarta
    // em silêncio. O `metaEventId` é o mesmo id que o Pixel usou no
    // `InitiateCheckout`; sem ele, o `Purchase` que o webhook dispara minutos
    // depois nasce com id novo e a Meta conta a MESMA venda duas vezes — o
    // custo por resultado do painel aparece pela metade, sem erro em lugar
    // nenhum. `fbp`/`fbc` são os cookies do Pixel, que casam a conversão com o
    // anúncio que a originou.
    metaEventId: optional(z.string().trim().max(100)),
    fbp: optional(z.string().trim().max(200)),
    fbc: optional(z.string().trim().max(300)),
  })
  .refine((value) => value.method !== 'credit_card' || !!value.card, {
    message: 'Informe os dados do cartão.',
    path: ['card'],
  });

export type StartPaymentInput = z.infer<typeof startPaymentSchema>;

/** Canais pelos quais a recuperação de abandono pode ser feita (registro manual). */
export const RECOVERY_CHANNELS = ['whatsapp', 'email', 'phone', 'other'] as const;

export const registerRecoverySchema = z.object({
  channel: z.enum(RECOVERY_CHANNELS),
  note: optional(z.string().trim().max(500)),
});

export type RegisterRecoveryInput = z.infer<typeof registerRecoverySchema>;

const dateField = z.coerce.date({ message: 'Data inválida (use ISO 8601).' });

export const listCheckoutSessionsQuerySchema = z.object({
  page: optional(z.coerce.number().int().min(1)).transform((value) => value ?? 1),
  pageSize: optional(z.coerce.number().int().min(1).max(100)).transform((value) => value ?? 25),
  status: optional(z.enum(CHECKOUT_STATUSES)),
  startDate: optional(dateField),
  endDate: optional(dateField),
  /** Busca parcial por e-mail do lead (case-insensitive). */
  email: optional(z.string().trim().toLowerCase().max(180)),
});

export type ListCheckoutSessionsQuery = z.infer<typeof listCheckoutSessionsQuerySchema>;

export const checkoutMetricsQuerySchema = z.object({
  startDate: optional(dateField),
  endDate: optional(dateField),
});

export type CheckoutMetricsQuery = z.infer<typeof checkoutMetricsQuerySchema>;
