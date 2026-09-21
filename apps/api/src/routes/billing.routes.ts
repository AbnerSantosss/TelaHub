import { Router, Request, Response } from 'express';

import type { Payment } from '@prisma/client';

import { adminMiddleware, authMiddleware } from '../middlewares/auth.middleware';
import { resolveTenantId } from '../middlewares/quota.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  cancelSubscriptionSchema,
  changePlanSchema,
  checkoutSchema,
} from '../schemas/billing.schema';
import { paymentService } from '../services/payment.service';
import { toPublicPlan } from '../services/plan.service';
import {
  billedScreens,
  estimateAnnualTotalCents,
  estimateCycleCents,
  estimateMonthlyCents,
  isActive,
  isFreePlan,
  PlanUpgradeRequiresPaymentError,
  subscriptionService,
  SubscriptionReactivationError,
  trialDaysRemaining,
  unitPriceCents,
  type BillingInterval,
} from '../services/subscription.service';

const router = Router();

router.use(authMiddleware);

/**
 * Base do app de checkout. Configurável porque desenvolvimento, homologação e
 * produção rodam em hosts diferentes — com a URL fixa no código, o botão
 * "Assinar" do painel de dev mandaria o cliente para a produção.
 */
const CHECKOUT_URL = (process.env.CHECKOUT_URL || 'https://checkout.proxserverabner.site/c').replace(
  /\/+$/,
  ''
);

/** Linha de cobrança como o painel a mostra. Sem ids de gateway. */
function serializePayment(payment: Payment) {
  return {
    id: payment.id,
    status: payment.status,
    method: payment.method,
    /** CAIXA do ciclo: no anual, os 12 meses de uma vez. */
    amountCents: payment.amountCents,
    billingInterval: payment.billingInterval,
    paidAt: payment.paidAt?.toISOString() ?? null,
    dueDate: payment.dueDate?.toISOString() ?? null,
    invoiceUrl: payment.invoiceUrl ?? null,
    nfseUrl: payment.nfseUrl ?? null,
  };
}

/**
 * Serializa a assinatura sem vazar ids/credenciais de gateway.
 *
 * `activeDevices` (telas com `status: 'linked'`) alimenta `estimatedMonthly`,
 * a previsão de fatura — o cliente precisa ver quanto vai pagar ANTES de
 * escalar, não depois.
 *
 * `estimatedAnnual` vem junto e SEMPRE, mesmo para quem está no mensal: é a
 * comparação que faz o cliente migrar ("no anual sai R$ X a menos por ano").
 * Sem ela, o painel teria que reconstruir a conta a partir do preço unitário —
 * e é assim que a superfície diverge do que a fatura cobra. Quando o plano não
 * tem oferta anual (grátis/Enterprise), `available: false` e a economia é 0.
 */
function serializeSubscription(
  subscription: {
    status: string;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
    gateway: string | null;
    billingInterval?: string | null;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: Date | null;
    plan: Parameters<typeof toPublicPlan>[0];
  },
  activeDevices: number
) {
  const plan = toPublicPlan(subscription.plan);
  const interval: BillingInterval =
    subscription.billingInterval === 'yearly' ? 'yearly' : 'monthly';
  const cents = estimateMonthlyCents(subscription.plan, activeDevices, interval);

  // Comparação anual × mensal com as MESMAS telas faturadas, senão a "economia"
  // exibida não seria economia nenhuma, e sim diferença de volume.
  const monthlyBaseCents = estimateMonthlyCents(subscription.plan, activeDevices, 'monthly');
  const annualMonthlyCents = estimateMonthlyCents(subscription.plan, activeDevices, 'yearly');
  const annualTotalCents = estimateAnnualTotalCents(subscription.plan, activeDevices);
  const annualSavingsCents = Math.max(monthlyBaseCents * 12 - annualTotalCents, 0);

  const cancelAtPeriodEnd = subscription.cancelAtPeriodEnd ?? false;

  return {
    status: subscription.status,
    isActive: isActive(subscription),
    trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
    trialDaysRemaining: trialDaysRemaining(subscription),
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    /** `true` = já pediu para cancelar, mas usa até o fim do que pagou. */
    cancelAtPeriodEnd,
    /** Quando a pessoa PEDIU o cancelamento (não quando o acesso termina). */
    canceledAt: subscription.canceledAt?.toISOString() ?? null,
    /** Telas que entram na fatura: `max(ativas, plan.minScreens)`. */
    screensBilled: billedScreens(subscription.plan, activeDevices),
    /** CAIXA do próximo ciclo: no anual, os 12 meses de uma vez. */
    cycleAmountCents: estimateCycleCents(subscription.plan, activeDevices, interval),
    // Cancelamento agendado não tem próxima cobrança. Mostrar a data do fim do
    // ciclo como "próxima cobrança" faria quem acabou de cancelar achar que
    // ainda vai ser cobrado — e gerar um chamado de suporte por dia.
    nextChargeAt: cancelAtPeriodEnd
      ? null
      : (subscription.currentPeriodEnd?.toISOString() ?? null),
    // Apenas o nome do provedor — nunca customerId/subscriptionId.
    gateway: subscription.gateway ?? null,
    /** `monthly` | `yearly` — como esta conta paga hoje. */
    billingInterval: interval,
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
    estimatedAnnual: {
      currency: 'BRL',
      /** `false` quando o plano não tem oferta anual — o front esconde o seletor. */
      available: plan.priceAnnualPerScreenCents > 0,
      /** Preço por tela/mês praticado no anual. */
      unitCents: unitPriceCents(subscription.plan, 'yearly'),
      /** Valor MENSAL EQUIVALENTE no anual (é o que se compara com o mensal). */
      monthlyEquivalentCents: annualMonthlyCents,
      monthlyEquivalentAmount: annualMonthlyCents / 100,
      /** Total do ano: mensal-equivalente × 12. */
      totalCents: annualTotalCents,
      totalAmount: annualTotalCents / 100,
      /** Quanto se deixa de pagar em 12 meses ao trocar o mensal pelo anual. */
      savingsCents: annualSavingsCents,
      savingsAmount: annualSavingsCents / 100,
    },
  };
}

/**
 * GET /api/billing/subscription — assinatura do tenant + uso + histórico.
 *
 * O corpo traz os campos do contrato da página Assinatura NA RAIZ (`plan`,
 * `status`, `cycleAmountCents`, `payments`…) e mantém `subscription`/`usage`
 * como estavam. A duplicação é deliberada: o painel novo lê a raiz, e o que já
 * consumia `subscription.*` (inclusive os testes) continua funcionando. Quebrar
 * o formato antigo economizaria bytes e custaria uma tela em branco em
 * produção — não é troca que valha a pena no caminho do dinheiro.
 */
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

    const [usage, payments] = await Promise.all([
      subscriptionService.getUsage(organizationId),
      paymentService.listPayments(organizationId),
    ]);

    const serialized = serializeSubscription(subscription, usage.devices.used);

    res.json({
      // ── Contrato da página Assinatura ──────────────────────────────────────
      plan: { code: serialized.plan.code, name: serialized.plan.name },
      status: serialized.status,
      billingInterval: serialized.billingInterval,
      screensBilled: serialized.screensBilled,
      currentPeriodEnd: serialized.currentPeriodEnd,
      cancelAtPeriodEnd: serialized.cancelAtPeriodEnd,
      canceledAt: serialized.canceledAt,
      cycleAmountCents: serialized.cycleAmountCents,
      nextChargeAt: serialized.nextChargeAt,
      payments: payments.map(serializePayment),
      // ── Formato anterior, preservado ───────────────────────────────────────
      subscription: serialized,
      usage,
    });
  } catch (error) {
    console.error('Erro ao carregar assinatura:', error);
    res.status(500).json({ error: 'Erro interno ao carregar a assinatura.' });
  }
});

/**
 * POST /api/billing/cancel — cancelamento AGENDADO para o fim do ciclo pago.
 *
 * ⚠️ NUNCA IMEDIATO. Quem pagou até o dia 30 usa até o dia 30: cortar o acesso
 * já pago é cláusula abusiva (CDC art. 51, IV) e, na prática, é o que
 * transforma um cancelamento tranquilo em reclamação pública. Por isso o
 * `status` continua `active` e o que muda é `cancelAtPeriodEnd`.
 *
 * O motivo é opcional — exigir justificativa para sair é o padrão escuro que
 * este produto se recusa a ter.
 *
 * CONFERIR com o dono: a rota exige apenas autenticação, como o contrato da
 * página Assinatura pede. Se o desejado for restringir a admins (como faz
 * `POST /plan`), basta acrescentar `adminMiddleware` — hoje qualquer usuário da
 * organização consegue agendar o cancelamento.
 */
router.post(
  '/cancel',
  validateBody(cancelSubscriptionSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = await resolveTenantId(req);
      if (!organizationId) {
        res.status(404).json({ error: 'Sua conta não está vinculada a nenhuma organização.' });
        return;
      }

      const { subscription, gatewayCanceled } = await subscriptionService.scheduleCancel(
        organizationId,
        req.body?.reason ?? null
      );

      if (gatewayCanceled === false) {
        // O cancelamento local vale; o do gateway não foi aceito. Fica no log
        // para alguém reprocessar — sem isso o cliente pararia de ter acesso e
        // continuaria sendo cobrado, que é o pior dos dois mundos.
        console.error(
          `[billing] assinatura ${organizationId} cancelada localmente, mas o gateway recusou o cancelamento. ` +
            'Cancele manualmente no painel do Asaas.'
        );
      }

      res.json({
        cancelAtPeriodEnd: true,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        status: subscription.status,
      });
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      res.status(500).json({ error: 'Erro interno ao cancelar a assinatura.' });
    }
  }
);

/**
 * POST /api/billing/reactivate — desfaz o cancelamento agendado.
 *
 * Só vale enquanto o ciclo não terminou. Depois disso a assinatura já é
 * `canceled` e voltar exige contratação nova (com cobrança nova no gateway) —
 * responder "reativado" ali entregaria plano pago sem pagamento.
 */
router.post('/reactivate', async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = await resolveTenantId(req);
    if (!organizationId) {
      res.status(404).json({ error: 'Sua conta não está vinculada a nenhuma organização.' });
      return;
    }

    const subscription = await subscriptionService.reactivate(organizationId);

    res.json({
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      status: subscription.status,
    });
  } catch (error) {
    if (error instanceof SubscriptionReactivationError) {
      res.status(409).json({ error: error.message, code: error.code });
      return;
    }
    console.error('Erro ao reativar assinatura:', error);
    res.status(500).json({ error: 'Erro interno ao reativar a assinatura.' });
  }
});

/**
 * POST /api/billing/plan — troca de plano (admin).
 *
 * Só **desce** de plano ou cancela. Subir é compra e passa pelo checkout:
 * antes desta guarda, um admin gravava `planId: rede` direto e ficava com o
 * plano pago de graça. Recusa com 400 quando o downgrade estouraria algum
 * limite do plano de destino, e com 402 quando a troca é um upgrade.
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

      // Upgrade sem pagamento: 402 com a rota para o checkout.
      if (error instanceof PlanUpgradeRequiresPaymentError) {
        res.status(402).json({ error: message, code: error.code });
        return;
      }

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
 * POST /api/billing/checkout — devolve a URL do checkout já preenchida.
 *
 * O painel NÃO cria cobrança: ele manda a pessoa para o app de checkout com
 * plano, telas e intervalo prontos. Quem cria customer/cobrança/assinatura no
 * Asaas é o próprio checkout (`payment.service` → `asaas.provider`), e quem
 * confirma é `POST /api/webhooks/asaas`.
 *
 * Manter a criação da cobrança FORA daqui não é preguiça: o painel é uma área
 * autenticada de quem já é cliente, e cobrar de dentro dela exigiria duplicar
 * validação de plano, cálculo de preço e tratamento de recusa que já existem —
 * uma segunda implementação do caminho do dinheiro, que é onde divergência
 * custa mais caro.
 *
 * ⚠️ REGRA ANTI-COBRANÇA-RETROATIVA — NÃO NEGOCIÁVEL.
 * (definição completa em `src/middlewares/quota.middleware.ts`, e a fonte é a
 *  seção "Fatores de Atrito" de
 *  `raw/pesquisa/2026-07-25-deep-research-concorrentes-signage.md`)
 *
 * A reclamação nº 1 contra o Yodeck é que conectar a 2ª tela faz TODAS as telas
 * — inclusive a 1ª, que era gratuita — passarem a ser cobradas retroativamente.
 * O TelaHub vende o oposto:
 *   • a cobrança vale da data do upgrade EM DIANTE (`nextDueDate` = hoje, nunca
 *     a data de criação da conta);
 *   • o primeiro ciclo é PROPORCIONAL aos dias restantes;
 *   • NUNCA se emite cobrança por período anterior ao upgrade — nada de
 *     `backdate_start_date` nem fatura de "meses de uso grátis".
 *
 * ⚠️ CORREÇÃO DE COMENTÁRIO (2026-09-05). Este bloco afirmava que "a 1ª tela do
 * plano `gratis` NÃO entra na fatura, nem depois do upgrade" e que "a cobrança
 * começa a partir da 2ª tela". Isso NUNCA foi verdade no código: a fatura é
 * `max(telas ativas, minScreens) × preço por tela` (`estimateMonthlyCents`), e
 * a própria `quota.middleware.ts` registra que não existe crédito perpétuo de
 * uma tela grátis dentro dos planos pagos. O comentário estava descrevendo uma
 * promessa que a landing não faz e que a fórmula não cumpre — corrigido para o
 * comportamento real. Se o dono QUISER o crédito perpétuo, mudam-se os três
 * juntos: a fórmula, a regra em `quota.middleware.ts` e a landing.
 */
router.post(
  '/checkout',
  validateBody(checkoutSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = await resolveTenantId(req);
      if (!organizationId) {
        res.status(404).json({ error: 'Sua conta não está vinculada a nenhuma organização.' });
        return;
      }

      const { planCode, screens, interval } = req.body as {
        planCode: string;
        screens?: number;
        interval?: BillingInterval;
      };

      // Telas: o que veio, ou o que a conta já usa (respeitado o piso do plano
      // atual). Mandar 1 por padrão faria o checkout mostrar um preço menor que
      // o da fatura de quem já tem 4 telas ligadas.
      const usage = await subscriptionService.getUsage(organizationId);
      const screensWanted = Math.max(screens ?? usage.devices.used, 1);

      const params = new URLSearchParams({
        plan: planCode,
        screens: String(screensWanted),
        interval: interval ?? 'monthly',
      });

      res.json({ checkoutUrl: `${CHECKOUT_URL}?${params.toString()}` });
    } catch (error) {
      console.error('Erro ao montar o checkout:', error);
      res.status(500).json({ error: 'Erro interno ao iniciar a contratação.' });
    }
  }
);

export default router;
