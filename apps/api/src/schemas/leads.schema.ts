import { z } from 'zod';

/**
 * Formulário "Falar com a gente" do site (plano Enterprise e dúvidas).
 *
 * Campos de origem (`utm*`, `referrer`) chegam do site, não do usuário: são
 * opcionais e truncados, nunca obrigatórios — se a pessoa chegou por link
 * direto, o lead vale do mesmo jeito.
 */
export const createLeadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Informe seu nome (mínimo 2 caracteres).')
    .max(120, 'Nome muito longo.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Informe um e-mail válido.')
    .max(180, 'E-mail muito longo.'),
  company: z.string().trim().max(160, 'Nome da empresa muito longo.').optional(),
  phone: z.string().trim().max(40, 'Telefone muito longo.').optional(),
  planCode: z.string().trim().max(40).optional(),
  utmSource: z.string().trim().max(120).optional(),
  utmMedium: z.string().trim().max(120).optional(),
  utmCampaign: z.string().trim().max(120).optional(),
  referrer: z.string().trim().max(1000).optional(),

  /**
   * Identificador do clique no anúncio do Meta. NÃO é persistido (o modelo
   * `Lead` não tem coluna para ele): serve só para reconstruir o `_fbc` no
   * evento `Lead` da Conversions API quando o cookie do Pixel foi bloqueado —
   * que é justamente quando o servidor precisa salvar a medição.
   */
  fbclid: z.string().trim().max(255).optional(),

  /**
   * Deduplicação do Pixel: o MESMO uuid que o site usou no
   * `fbq('track', 'Lead', {}, { eventID })`.
   *
   * ARMADILHA: id diferente (ou ausente) faz a Meta contar o lead DUAS vezes,
   * sem erro nenhum — o custo por lead do relatório cai pela metade e a
   * decisão de mídia é tomada em cima de um número que não existe.
   */
  metaEventId: z.string().trim().max(64).optional(),
  /** Cookie `_fbp` do navegador. */
  fbp: z.string().trim().max(255).optional(),
  /** Cookie `_fbc` do navegador (quando ausente, reconstruído do `fbclid`). */
  fbc: z.string().trim().max(255).optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
