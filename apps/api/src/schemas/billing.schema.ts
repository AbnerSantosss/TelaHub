import { z } from 'zod';

export const changePlanSchema = z.object({
  planCode: z
    .string()
    .trim()
    .min(1, 'Informe o código do plano.')
    .max(40, 'Código de plano inválido.'),
});

export type ChangePlanInput = z.infer<typeof changePlanSchema>;

export const checkoutSchema = z.object({
  planCode: z.string().trim().min(1, 'Informe o código do plano.'),
  screens: z.coerce.number().int().min(1, 'Informe ao menos 1 tela.').optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
