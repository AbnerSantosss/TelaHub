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
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
