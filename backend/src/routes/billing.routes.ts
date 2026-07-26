import { Router, Request, Response } from 'express';

import { adminMiddleware, authMiddleware } from '../middlewares/auth.middleware';
import { resolveTenantId } from '../middlewares/quota.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { changePlanSchema, checkoutSchema } from '../schemas/billing.schema';
import { toPublicPlan } from '../services/plan.service';
import {
  billedScreens,
  estimateMonthlyCents,
  isActive,
  isFreePlan,
  subscriptionService,
  trialDaysRemaining,
} from '../services/subscription.service';

const router = Router();

router.use(authMiddleware);

/**
 * Serializa a assinatura sem vazar ids/credenciais de gateway.
 *
 * `activeDevices` (telas com `status: 'linked'`) alimenta `estimatedMonthly`,
 * a previsão de fatura — o cliente precisa ver quanto vai pagar ANTES de
 * escalar, não depois.
 */
function serializeSubscription(
  subscription: {
    status: string;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
    gateway: string | null;
    plan: Parameters<typeof toPublicPlan>[0];
  },
  activeDevices: number
) {
  const plan = toPublicPlan(subscription.plan);
  const cents = estimateMonthlyCents(subscription.plan, activeDevices);

  return {
    status: subscription.status,
    isActive: isActive(subscription),
    trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
    trialDaysRemaining: trialDaysRemaining(subscription),
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    // Apenas o nome do provedor — nunca customerId/subscriptionId.
    gateway: subscription.gateway ?? null,
    plan,
    estimatedMonthly: {
      currency: 'BRL',
      /** Telas com `status: 'linked'` hoje. */
      activeScreens: activeDevices,
      /** Telas que entram na fatura: `max(ativas, plan.minScreens)`. */
      billedScreens: billedScreens(subscription.plan, activeDevices),
      cents,
      amount: cents / 100,
      /** `true` quando não há valor a cobrar (plano grátis). */
      free: isFreePlan(subscription.plan),
      /** `true` quando o preço depende do comercial (Enterprise). */
      quoteOnly: plan.quoteOnly,
    },
  };
}

/** GET /api/billing/subscription — assinatura do tenant + uso + trial. */
router.get('/subscription', async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = await resolveTenantId(req);
    if (!organizationId) {
      res.status(404).json({ error: 'Sua conta não está vinculada a nenhuma organização.' });
      return;
    }

    const subscription = await subscriptionService.getByOrganization(organizationId);
    if (!subscription) {
      res.status(404).json({
        error: 'Nenhuma assinatura encontrada para esta conta.',
        code: 'no_subscription',
      });
      return;
    }

    const usage = await subscriptionService.getUsage(organizationId);

    res.json({
      subscription: serializeSubscription(subscription, usage.devices.used),
      usage,
    });
  } catch (error) {
    console.error('Erro ao carregar assinatura:', error);
    res.status(500).json({ error: 'Erro interno ao carregar a assinatura.' });
  }
});

/**
 * POST /api/billing/plan — troca de plano (admin).
 * Recusa com 400 quando o downgrade estouraria algum limite do plano de destino.
 */
router.post(
  '/plan',
  adminMiddleware,
  validateBody(changePlanSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = await resolveTenantId(req);
      if (!organizationId) {
        res.status(404).json({ error: 'Sua conta não está vinculada a nenhuma organização.' });
        return;
      }

      const updated = await subscriptionService.changePlan(organizationId, req.body.planCode);
      const usage = await subscriptionService.getUsage(organizationId);

      res.json({ subscription: serializeSubscription(updated, usage.devices.used), usage });
    } catch (error: any) {
      const message = error?.message || 'Não foi possível trocar de plano.';

      if (/não está disponível|não encontrad/i.test(message)) {
        res.status(400).json({ error: message, code: 'plan_unavailable' });
        return;
      }
      if (/Não é possível mudar para o plano/i.test(message)) {
        res.status(400).json({ error: message, code: 'downgrade_blocked' });
        return;
      }

      console.error('Erro ao trocar de plano:', error);
      res.status(500).json({ error: 'Erro interno ao trocar de plano.' });
    }
  }
);

/**
 * POST /api/billing/checkout — ainda NÃO implementado.
 *
 * Retorna 501 de propósito: simular um pagamento aprovado aqui daria ao
 * frontend a impressão de que a cobrança existe. Melhor um erro honesto.
 *
 * TODO(gateway): integrar Asaas (PIX/boleto/cartão, BR-first) ou Stripe.
 *   1. criar/recuperar o customer no gateway e gravar em
 *      `Subscription.gatewayCustomerId` (campo já existe no schema);
 *   2. criar a subscription recorrente com
 *      quantity = telas ativas e unit_amount = Plan.pricePerScreenCents,
 *      respeitando `Plan.minScreens` (a mesma conta de
 *      `estimateMonthlyCents()` em `subscription.service.ts` — use aquela
 *      função como fonte da verdade para não divergir do valor que o cliente
 *      viu em `GET /api/billing/subscription.estimatedMonthly`);
 *   3. gravar `gateway`, `gatewaySubscriptionId` e `currentPeriodEnd`;
 *   4. devolver a URL de checkout hospedada para o frontend redirecionar;
 *   5. criar `POST /api/billing/webhook` (rota nova, sem authMiddleware, com
 *      validação de assinatura do gateway) para mover o status entre
 *      `active` / `past_due` / `canceled` e atualizar `currentPeriodEnd`.
 *
 * ⚠️ REGRA ANTI-COBRANÇA-RETROATIVA — NÃO NEGOCIÁVEL.
 * (definição completa em `src/middlewares/quota.middleware.ts`, e a fonte é a
 *  seção "Fatores de Atrito" de
 *  `raw/pesquisa/2026-07-25-deep-research-concorrentes-signage.md`)
 *
 * A reclamação nº 1 contra o Yodeck é que conectar a 2ª tela faz TODAS as telas
 * — inclusive a 1ª, que era gratuita — passarem a ser cobradas retroativamente.
 * O TelaHub vende o oposto, então ao integrar o gateway:
 *   • a 1ª tela do plano `gratis` NÃO entra na fatura, nem depois do upgrade;
 *   • a cobrança começa a partir da 2ª tela;
 *   • o primeiro ciclo é PROPORCIONAL aos dias restantes (proration ligada,
 *     `billing_cycle_anchor`/`nextDueDate` = hoje);
 *   • NUNCA emitir cobrança por período anterior ao upgrade — nada de
 *     `backdate_start_date`, `proration_behavior: 'always_invoice'` sobre
 *     período passado, ou fatura de "meses de uso grátis".
 * Implementar retroativo aqui contradiz o e-mail de boas-vindas, a mensagem de
 * quota do plano grátis e a landing.
 */
router.post(
  '/checkout',
  validateBody(checkoutSchema),
  async (_req: Request, res: Response): Promise<void> => {
    res.status(501).json({
      error:
        'O checkout ainda não está disponível: a integração com o gateway de pagamento ' +
        '(Asaas/Stripe) não foi implementada. Fale com o comercial para contratar um plano.',
      code: 'gateway_not_integrated',
    });
  }
);

export default router;
