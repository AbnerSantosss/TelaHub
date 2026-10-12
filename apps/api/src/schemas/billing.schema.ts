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
  /**
   * Intervalo desejado. Opcional porque o seletor do checkout também aceita a
   * escolha do outro lado; ausente = mensal, que é o padrão do produto.
   */
  interval: z.enum(['monthly', 'yearly']).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/**
 * Cancelamento. O motivo é OPCIONAL de propósito: exigir justificativa para
 * cancelar é o padrão escuro que o produto promete não ter — e um campo
 * obrigatório só produziria "asdf". Quando vem, é ouro para entender churn.
 */
export const cancelSubscriptionSchema = z.object({
  reason: z.string().trim().max(500, 'Motivo muito longo.').optional(),
});

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
