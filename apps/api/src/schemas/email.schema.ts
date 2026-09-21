import { z } from 'zod';

import { AUTOMATION_CATALOG } from '../services/email-automation.service';

/**
 * Corpos das rotas de e-mail do backoffice.
 *
 * ── O `reason` obrigatório ───────────────────────────────────────────────────
 * Toda escrita daqui exige um motivo escrito, do mesmo jeito que as ações sobre
 * a assinatura de um cliente. Não é burocracia: disparar campanha, ligar uma
 * automação ou mandar um e-mail avulso para um cliente são ações que ele SOFRE
 * e não vê acontecer. Seis meses depois, "por que este cliente recebeu isso?"
 * só tem resposta se o motivo tiver sido gravado no mesmo instante — e o
 * `AdminActionEntry` já torna impossível auditar sem ele. O schema fecha o
 * outro lado: impossível chamar a rota sem ele.
 */
export const reasonSchema = z
  .string()
  .trim()
  .min(3, 'Descreva o motivo desta ação (mínimo 3 caracteres).')
  .max(500, 'Motivo muito longo.');

/** Chaves válidas de automação, derivadas do catálogo — nunca redigitadas. */
export const AUTOMATION_KEYS = AUTOMATION_CATALOG.map((definition) => definition.key) as [
  string,
  ...string[],
];

export const automationKeySchema = z.enum(AUTOMATION_KEYS);

/**
 * Edição de uma automação.
 *
 * `offsetDays` vai de -60 a +60: o gatilho é relativo a uma data do contrato, e
 * um número fora dessa faixa (60000, digitado sem querer) faria a janela do dia
 * cair em 2190 e o aviso simplesmente nunca sair — sem erro nenhum, o pior tipo
 * de falha para diagnosticar.
 */
export const updateAutomationSchema = z
  .object({
    enabled: z.boolean().optional(),
    subject: z.string().trim().min(3, 'Assunto muito curto.').max(200).optional(),
    htmlBody: z.string().trim().min(10, 'Corpo muito curto.').max(50_000).optional(),
    offsetDays: z.number().int().min(-60).max(60).optional(),
    reason: reasonSchema,
  })
  .refine(
    (data) =>
      data.enabled !== undefined ||
      data.subject !== undefined ||
      data.htmlBody !== undefined ||
      data.offsetDays !== undefined,
    { message: 'Nada para alterar.' }
  );

export const automationPreviewSchema = z.object({
  organizationId: z.string().trim().min(1, 'Informe a organização da prévia.'),
});

/** Público de uma campanha. Tudo opcional: vazio = todos que deram opt-in. */
export const audienceSchema = z.object({
  plans: z.array(z.string().trim().min(1)).max(20).optional(),
  statuses: z.array(z.enum(['trialing', 'active', 'past_due', 'canceled'])).max(4).optional(),
  optInOnly: z.boolean().optional(),
});

export const createCampaignSchema = z.object({
  name: z.string().trim().min(3, 'Dê um nome à campanha.').max(120),
  subject: z.string().trim().min(3, 'Assunto muito curto.').max(200),
  htmlBody: z.string().trim().min(10, 'Corpo muito curto.').max(200_000),
  previewText: z.string().trim().max(200).optional(),
  audience: audienceSchema.optional(),
  /** Agendamento. `null` devolve a campanha para rascunho. */
  scheduledAt: z.coerce.date().nullable().optional(),
  reason: reasonSchema,
});

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  subject: z.string().trim().min(3).max(200).optional(),
  htmlBody: z.string().trim().min(10).max(200_000).optional(),
  previewText: z.string().trim().max(200).nullable().optional(),
  audience: audienceSchema.optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
  reason: reasonSchema,
});

/** Contagem prévia: aceita um público avulso, sem precisar salvar antes. */
export const previewAudienceSchema = z.object({
  audience: audienceSchema.optional(),
});

export const campaignTestSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.').max(180),
});

/**
 * Autorização de disparo da campanha.
 *
 * `sendNow` existe para desfazer uma ambiguidade que causava perda real: com
 * apenas `reason`, "agendar para sexta" e "mandar agora" eram a MESMA chamada, e
 * a campanha agendada saía no ato para a base inteira. Agora quem quer furar o
 * agendamento diz isso explicitamente — e o agendamento é limpo, para os dois
 * estados não conviverem.
 */
export const sendCampaignSchema = z.object({
  reason: reasonSchema,
  sendNow: z.boolean().optional(),
});

/**
 * E-mail avulso do backoffice para uma organização.
 *
 * `kind` é fixo em `transactional` na rota, e não um campo do corpo: é uma
 * mensagem individual escrita por uma pessoa para um cliente específico
 * (cobrança, aviso, resposta), não marketing. Deixar o operador escolher o tipo
 * abriria o caminho de mandar "novidades" como transacional e escapar da
 * supressão por opt-in — exatamente o que a fila existe para impedir.
 */
export const adhocEmailSchema = z.object({
  organizationId: z.string().trim().min(1, 'Informe a organização destinatária.'),
  /** Sobrescreve o destinatário padrão (o admin da organização). */
  toEmail: z.string().trim().toLowerCase().email('E-mail inválido.').max(180).optional(),
  subject: z.string().trim().min(3, 'Assunto muito curto.').max(200),
  htmlBody: z.string().trim().min(5, 'Corpo muito curto.').max(50_000),
  reason: reasonSchema,
});

export const retryMessageSchema = z.object({ reason: reasonSchema });

/** Filtros do histórico. Tolerante: filtro inválido lista tudo, não dá 400. */
export const messagesQuerySchema = z
  .object({
    status: z.enum(['queued', 'sent', 'failed', 'bounced', 'suppressed']).optional(),
    kind: z.enum(['transactional', 'automation', 'campaign']).optional(),
    organizationId: z.string().trim().min(1).optional(),
    campaignId: z.string().trim().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .catch(() => ({}));

export type UpdateAutomationInput = z.infer<typeof updateAutomationSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type AdhocEmailInput = z.infer<typeof adhocEmailSchema>;
