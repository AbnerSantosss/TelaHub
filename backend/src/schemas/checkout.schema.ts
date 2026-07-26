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
    name: optional(nameField),
    email: optional(emailField),
    phone: optional(phoneField),
    document: optional(documentField),
    companyName: optional(companyNameField),
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
