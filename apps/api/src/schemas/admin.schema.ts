import { z } from 'zod';

/**
 * Validação de TUDO que entra pelo backoffice (`/api/admin/*`).
 *
 * Por que um arquivo só, e não um por rota: o backoffice é a única superfície do
 * produto em que uma pessoa escreve no banco de OUTRA pessoa. Ter os schemas
 * espalhados foi o que permitiu, no resto do projeto, uma rota nascer sem
 * validação nenhuma — e aqui o custo disso não é um 500, é uma assinatura
 * cancelada por engano de digitação.
 */

/**
 * Motivo da ação administrativa. Não é campo de formulário: é o que responde
 * "por que este cliente está no Rede sem ter pago" daqui a seis meses.
 *
 * `min(3)` não valida a QUALIDADE do texto (nada valida), mas fecha o caso que
 * de fato aparece: o operador apertando espaço para passar do campo. O `trim()`
 * vem antes de propósito — sem ele, três espaços passariam na contagem.
 */
export const reasonField = z
  .string()
  .trim()
  .min(3, 'Descreva o motivo da ação (mínimo 3 caracteres).')
  .max(500, 'Motivo muito longo (máximo 500 caracteres).');

/** Corpo mínimo de qualquer ação administrativa: só o motivo. */
export const adminReasonSchema = z.object({ reason: reasonField });
export type AdminReasonInput = z.infer<typeof adminReasonSchema>;

/**
 * Trata string vazia como ausente — mesmo motivo de `checkout.schema.ts`: o
 * formulário manda `""` para o filtro que o operador não preencheu, e sem isto
 * cada campo vazio derrubaria a listagem inteira com 400.
 */
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema.optional()
  );

const dateField = z.coerce.date({ message: 'Data inválida (use ISO 8601).' });

const pageField = optional(z.coerce.number().int().min(1)).transform((value) => value ?? 1);
const pageSizeField = optional(z.coerce.number().int().min(1).max(100)).transform(
  (value) => value ?? 25
);

// ─────────────────────────────────────────────────────────────────────────────
// Clientes e assinaturas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * As sete visões de §2.8 do plano de backoffice.
 *
 * Enum FECHADO de propósito: a definição de cada lista (o que é "não renovou", o
 * que é "pagante") mora em UM lugar só — `admin-organization.service.ts`. Uma
 * string livre aqui deixaria a UI inventar a oitava visão com regra própria, que
 * é exatamente como duas telas passam a responder números diferentes para a
 * mesma pergunta.
 */
export const ORGANIZATION_VIEWS = [
  'all',
  'paying',
  'expiring',
  'past_due',
  'not_renewed',
  'scheduled_cancel',
  'free',
] as const;

export type OrganizationView = (typeof ORGANIZATION_VIEWS)[number];

/** Colunas por que a listagem aceita ordenar. Só colunas REAIS do banco. */
export const ORGANIZATION_SORTS = ['createdAt', 'name', 'currentPeriodEnd', 'status'] as const;
export type OrganizationSort = (typeof ORGANIZATION_SORTS)[number];

export const listOrganizationsQuerySchema = z.object({
  view: optional(z.enum(ORGANIZATION_VIEWS)).transform((value) => value ?? 'all'),
  /**
   * Janela da visão `expiring`, em dias. A UI oferece 7/15/30 (§4.1), mas o
   * parâmetro é livre dentro do ano: "quem vence nos próximos 60 dias" é
   * pergunta legítima de quem prepara a renovação anual, e travar em três
   * valores fixos só faria alguém consultar o banco à mão.
   */
  days: optional(z.coerce.number().int().min(1).max(365)).transform((value) => value ?? 7),
  page: pageField,
  pageSize: pageSizeField,
  /** Busca parcial por nome da organização OU e-mail de qualquer usuário dela. */
  search: optional(z.string().trim().max(180)),
  sort: optional(z.enum(ORGANIZATION_SORTS)),
  sortDir: optional(z.enum(['asc', 'desc'])),
});

export type ListOrganizationsQuery = z.infer<typeof listOrganizationsQuerySchema>;

export const changePlanSchema = z.object({
  planCode: z.string().trim().min(1, 'Informe o código do plano.').max(60),
  reason: reasonField,
});
export type AdminChangePlanInput = z.infer<typeof changePlanSchema>;

export const extendSubscriptionSchema = z.object({
  /**
   * Teto de 365 dias. Não é desconfiança do operador: é o dedo escorregando no
   * teclado numérico. "Estender 30" virando "estender 300" dá quase um ano de
   * plano pago de graça, e o efeito é uma data no futuro que ninguém confere.
   */
  days: z.coerce
    .number()
    .int('Informe dias inteiros.')
    .min(1, 'Mínimo de 1 dia.')
    .max(365, 'Máximo de 365 dias por vez. Para mais que isso, troque o plano.'),
  reason: reasonField,
});
export type ExtendSubscriptionInput = z.infer<typeof extendSubscriptionSchema>;

/** Intervalos de cobrança. Espelha `BillingInterval` de `subscription.service`. */
export const ADMIN_BILLING_INTERVALS = ['monthly', 'yearly'] as const;

export const manualPaymentSchema = z.object({
  /**
   * ⚠️ CAIXA DO CICLO, em centavos — no anual são os 12 meses, não o mensal
   * equivalente. É o defeito US-A-05 (ver `estimateCycleCents` em
   * `subscription.service.ts`) e ele reaparece exatamente aqui, porque o
   * operador tem na frente o preço de vitrine (mensal) e um Pix que recebeu
   * (anual). Nenhuma validação distingue R$ 468 de R$ 39 — os dois são inteiros
   * positivos —, então a defesa possível é a rota devolver o valor esperado pelo
   * catálogo junto da confirmação, e é o que ela faz.
   */
  amountCents: z.coerce
    .number()
    .int('Valor em centavos, inteiro.')
    .min(1, 'Informe o valor recebido, em centavos.')
    .max(100000000, 'Valor alto demais. Confira se digitou em centavos.'),
  screens: z.coerce.number().int().min(1, 'Mínimo de 1 tela.').max(1000),
  interval: z.enum(ADMIN_BILLING_INTERVALS, {
    message: 'Intervalo inválido: use "monthly" ou "yearly".',
  }),
  /** Quando o dinheiro entrou. Ausente = agora. É a data que ancora o ciclo. */
  paidAt: optional(dateField),
  /** Identificador do Pix/comprovante, para a conciliação achar a linha depois. */
  reference: optional(z.string().trim().max(120)),
  reason: reasonField,
});
export type ManualPaymentInput = z.infer<typeof manualPaymentSchema>;

/**
 * Concessão manual (`SubscriptionOverride`).
 *
 * `expiresAt` é opcional mas a UI deve sugerir sempre uma data: concessão sem
 * prazo é vazamento de receita permanente, e o campo existe justamente para que
 * ninguém dependa da própria memória para desfazer (§2.4).
 */
export const setOverrideSchema = z.object({
  extraFeatures: z
    .array(z.string().trim().min(1).max(60))
    .max(30, 'Features demais para uma concessão. Para isso, troque o plano.')
    .optional()
    .transform((value) => value ?? []),
  /**
   * `null` explícito = "usa o limite do plano". `undefined` cai no mesmo lugar;
   * são aceitos os dois só para o corpo poder limpar um limite antes concedido
   * sem precisar apagar o override inteiro.
   */
  maxDevices: z.coerce.number().int().min(1).max(100000).nullable().optional(),
  maxUsers: z.coerce.number().int().min(1).max(100000).nullable().optional(),
  expiresAt: optional(dateField).nullable(),
  reason: reasonField,
});
export type SetOverrideInput = z.infer<typeof setOverrideSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Pagamentos, webhooks e eventos
// ─────────────────────────────────────────────────────────────────────────────

/** Espelha o comentário de `Payment.status` no schema Prisma. */
export const PAYMENT_STATUSES = ['pending', 'confirmed', 'refunded', 'failed', 'canceled'] as const;

export const listPaymentsQuerySchema = z.object({
  page: pageField,
  pageSize: pageSizeField,
  status: optional(z.enum(PAYMENT_STATUSES)),
  organizationId: optional(z.string().trim().max(64)),
  /** Período sobre `createdAt` — a data em que a cobrança foi EMITIDA. */
  startDate: optional(dateField),
  endDate: optional(dateField),
});
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;

/** Espelha o comentário de `WebhookEvent.status`. */
export const WEBHOOK_STATUSES = ['received', 'processed', 'ignored', 'failed'] as const;

export const listWebhooksQuerySchema = z.object({
  page: pageField,
  pageSize: pageSizeField,
  status: optional(z.enum(WEBHOOK_STATUSES)),
  provider: optional(z.string().trim().max(40)),
  startDate: optional(dateField),
  endDate: optional(dateField),
});
export type ListWebhooksQuery = z.infer<typeof listWebhooksQuerySchema>;

/** Recolocar um evento morto na fila também é ação administrativa: tem motivo. */
export const retryEventSchema = z.object({ reason: reasonField });
export type RetryEventInput = z.infer<typeof retryEventSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Leads
// ─────────────────────────────────────────────────────────────────────────────

/** Espelha o comentário de `Lead.status` no schema Prisma. */
export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'discarded'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const listLeadsQuerySchema = z.object({
  page: pageField,
  pageSize: pageSizeField,
  status: optional(z.enum(LEAD_STATUSES)),
  /** Busca parcial por nome, e-mail ou empresa. */
  search: optional(z.string().trim().max(180)),
  startDate: optional(dateField),
  endDate: optional(dateField),
});
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;

export const updateLeadSchema = z.object({
  status: z.enum(LEAD_STATUSES, {
    message: 'Status inválido: use new, contacted, qualified ou discarded.',
  }),
  /**
   * Opcional AQUI, e só aqui, diferente de toda ação sobre assinatura. Lead não
   * é cliente: mover um lead de "novo" para "contatado" não tira nada de
   * ninguém, e exigir justificativa em triagem comercial só ensinaria o operador
   * a digitar "x" — o que estraga o hábito nas ações em que o motivo importa.
   */
  note: optional(z.string().trim().max(500)),
});
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
