import { Prisma } from '@prisma/client';
import { Router, Request, Response } from 'express';

import prisma from '../../lib/prisma';
import { validateBody } from '../../middlewares/validate.middleware';
import {
  adminReasonSchema,
  changePlanSchema,
  extendSubscriptionSchema,
  listOrganizationsQuerySchema,
  manualPaymentSchema,
  reasonField,
  setOverrideSchema,
} from '../../schemas/admin.schema';
import { adminAuditService } from '../../services/admin-audit.service';
import {
  AdminOrganizationError,
  adminOrganizationService,
} from '../../services/admin-organization.service';
import { parseFeatures, planService } from '../../services/plan.service';
import {
  SubscriptionOverrideError,
  subscriptionOverrideService,
} from '../../services/subscription-override.service';
import {
  SubscriptionReactivationError,
  estimateCycleCents,
  subscriptionService,
} from '../../services/subscription.service';

/**
 * ─── CLIENTES E ASSINATURAS NO BACKOFFICE ───────────────────────────────────
 *
 * A guarda de `master` está aplicada na RAIZ (`admin/index.ts`) e não se repete
 * aqui — repetir daria a impressão de que uma rota sem a linha está
 * desprotegida, que é o contrário da verdade e leva alguém a "consertar" a raiz.
 *
 * ── Duas regras que valem para TODA rota de escrita deste arquivo ────────────
 *
 * 1. **Motivo obrigatório no corpo.** É `reasonField` (mínimo 3 caracteres) e é
 *    validado pelo Zod ANTES do handler. Não é burocracia: estas são as únicas
 *    ações do produto em que uma pessoa muda a conta de outra, e o efeito é
 *    invisível para quem o sofre. Sem o "por quê" gravado no mesmo instante,
 *    seis meses depois ninguém explica por que aquele cliente está no Rede sem
 *    ter pago.
 *
 * 2. **`adminAuditService.log` em todas.** O serviço nunca lança (auditoria não
 *    pode desfazer operação já aplicada), então o que garante que a chamada
 *    existe é o teste que percorre estas rotas e falha se alguma não gravar
 *    `AuditLog` — `src/routes/__tests__/admin-organizations.test.ts`.
 *
 * A auditoria é gravada DEPOIS do efeito, com `before`/`after`. Antes seria pior
 * de duas formas: registraria mudança que não aconteceu se a escrita falhar, e
 * não teria o `after` real (o serviço de assinatura decide coisas — data de fim
 * de período, motivo normalizado — que o handler não conhece de antemão).
 */
const router = Router();

/** Traduz os erros conhecidos para HTTP. Qualquer outro é 500 com log. */
function handleError(error: unknown, res: Response, context: string): void {
  if (error instanceof AdminOrganizationError || error instanceof SubscriptionOverrideError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }

  if (error instanceof SubscriptionReactivationError) {
    res.status(409).json({ error: error.message, code: error.code });
    return;
  }

  console.error(`Erro no backoffice de clientes (${context}):`, error);
  res.status(500).json({ error: 'Erro interno ao operar a conta do cliente.' });
}

function badQuery(
  res: Response,
  issues: Array<{ path: (string | number | symbol)[]; message: string }>
): void {
  res.status(400).json({
    error: 'Parâmetros inválidos.',
    details: issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  });
}

/**
 * Id do operador. `authMiddleware` já garantiu que existe; a checagem é para o
 * compilador e para o dia em que alguém montar este router em outro lugar sem a
 * guarda — caso em que gravar `setByUserId: 'desconhecido'` seria pior do que
 * recusar, porque a concessão ficaria sem dono.
 */
function operatorId(req: Request): string {
  const id = req.user?.id;
  if (!id) {
    throw new AdminOrganizationError('Sessão inválida.', 401, 'unauthenticated');
  }
  return id;
}

/** Retrato da assinatura para o `before`/`after` da auditoria. */
function snapshot(subscription: {
  status: string;
  planId?: string;
  billingInterval?: string;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  cancelReason?: string | null;
  gateway?: string | null;
  plan?: { code: string } | null;
}): Record<string, unknown> {
  return {
    status: subscription.status,
    planCode: subscription.plan?.code ?? null,
    billingInterval: subscription.billingInterval ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? null,
    cancelReason: subscription.cancelReason ?? null,
    gateway: subscription.gateway ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Leitura
// ─────────────────────────────────────────────────────────────────────────────

/** `GET /api/admin/organizations` — lista com as sete visões de §2.8. */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = listOrganizationsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    badQuery(res, parsed.error.issues);
    return;
  }

  try {
    res.json(await adminOrganizationService.list(parsed.data));
  } catch (error) {
    handleError(error, res, 'listar organizações');
  }
});

/** `GET /api/admin/organizations/:id` — detalhe completo do cliente. */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(await adminOrganizationService.getDetail(req.params.id as string));
  } catch (error) {
    handleError(error, res, 'detalhar organização');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Ações sobre a assinatura
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `POST /:id/subscription/cancel` — cancelamento IMEDIATO.
 *
 * É a ação mais agressiva do backoffice: corta hoje o acesso de quem pagou o
 * mês. Existe para fraude, chargeback e pedido do jurídico — NÃO para atender
 * "quero cancelar", que é `schedule-cancel` (cortar acesso já pago é cláusula
 * abusiva, CDC art. 51, IV).
 *
 * O motivo vai gravado no próprio `cancelReason` com o prefixo `admin:`. É esse
 * prefixo que mantém a lista "não renovaram" (`grace_expired`) limpa de
 * cancelamento feito pela plataforma — sem ele, o cancelamento administrativo se
 * confundiria com falha de cobrança e inflaria a métrica que decide se a
 * recuperação por e-mail está funcionando.
 */
router.post(
  '/:id/subscription/cancel',
  validateBody(adminReasonSchema),
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id as string;
    const { reason } = req.body as { reason: string };

    try {
      const before = await adminOrganizationService.requireSubscription(organizationId);
      const subscription = await subscriptionService.cancel(organizationId, `admin:${reason}`);

      await adminAuditService.log(req, {
        action: 'subscription.cancel',
        organizationId,
        entityType: 'subscription',
        entityId: subscription.id,
        reason,
        before: snapshot(before),
        after: snapshot(subscription),
      });

      res.json({ subscription });
    } catch (error) {
      handleError(error, res, 'cancelar assinatura');
    }
  }
);

/**
 * `POST /:id/subscription/schedule-cancel` — cancela no fim do ciclo pago.
 *
 * `gatewayCanceled` vai na resposta e na auditoria porque uma falha ao cancelar
 * a recorrência no Asaas NÃO desfaz o cancelamento local (ver `scheduleCancel`):
 * a assinatura fica encerrada aqui e continuaria cobrando lá. Quem não vê esse
 * campo não sabe que precisa entrar no painel do gateway — e o cliente descobre
 * pela fatura.
 */
router.post(
  '/:id/subscription/schedule-cancel',
  validateBody(adminReasonSchema),
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id as string;
    const { reason } = req.body as { reason: string };

    try {
      const before = await adminOrganizationService.requireSubscription(organizationId);
      const { subscription, gatewayCanceled } = await subscriptionService.scheduleCancel(
        organizationId,
        `admin:${reason}`
      );

      await adminAuditService.log(req, {
        action: 'subscription.schedule_cancel',
        organizationId,
        entityType: 'subscription',
        entityId: subscription.id,
        reason,
        before: snapshot(before),
        after: snapshot(subscription),
        extra: { gatewayCanceled },
      });

      res.json({ subscription, gatewayCanceled });
    } catch (error) {
      handleError(error, res, 'agendar cancelamento');
    }
  }
);

/**
 * `POST /:id/subscription/reactivate` — desfaz um cancelamento AGENDADO.
 *
 * Não ressuscita assinatura já `canceled`: para isso é preciso cobrança nova no
 * gateway, e devolver "reativado" sem cobrança seria dar plano pago de graça
 * (o mesmo buraco que `PlanUpgradeRequiresPaymentError` fecha). O serviço
 * responde com `SubscriptionReactivationError`, que vira 409 aqui.
 */
router.post(
  '/:id/subscription/reactivate',
  validateBody(adminReasonSchema),
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id as string;
    const { reason } = req.body as { reason: string };

    try {
      const before = await adminOrganizationService.requireSubscription(organizationId);
      const subscription = await subscriptionService.reactivate(organizationId);

      await adminAuditService.log(req, {
        action: 'subscription.reactivate',
        organizationId,
        entityType: 'subscription',
        entityId: subscription.id,
        reason,
        before: snapshot(before),
        after: snapshot(subscription),
      });

      res.json({ subscription });
    } catch (error) {
      handleError(error, res, 'reativar assinatura');
    }
  }
);

/**
 * `POST /:id/subscription/change-plan` — troca de plano MANUAL.
 *
 * ⚠️ Passa `paymentConfirmed: true`, ou seja, ATIVA PLANO PAGO SEM PAGAMENTO NO
 * GATEWAY. É decisão explícita do dono, não descuido: no piloto o cliente paga
 * por Pix na mão e o master ativa o plano; sem esta porta, `changePlan` recusaria
 * com `PlanUpgradeRequiresPaymentError` e o piloto não existiria. O que impede o
 * abuso é o resto do desenho — a rota é só do `master`, o motivo é obrigatório e
 * a ação fica no `AuditLog` com antes/depois.
 *
 * `gateway: 'manual'` é gravado logo depois, e os ids de gateway são PRESERVADOS
 * de propósito. Armadilha que isso deixa visível em vez de esconder: se a conta
 * tinha recorrência no Asaas, ela CONTINUA cobrando o valor antigo — trocar o
 * plano aqui não fala com o gateway. O operador precisa ajustar ou cancelar a
 * recorrência lá; apagar os ids faria essa cobrança órfã virar invisível.
 *
 * O plano de destino e o bloqueio de downgrade são checados ANTES da chamada
 * para a resposta ser 400/409 com a mensagem certa, em vez de um `Error` cru do
 * serviço virando 500.
 */
router.post(
  '/:id/subscription/change-plan',
  validateBody(changePlanSchema),
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id as string;
    const { planCode, reason } = req.body as { planCode: string; reason: string };

    try {
      const before = await adminOrganizationService.requireSubscription(organizationId);

      const plan = await planService.getByCode(planCode);
      if (!plan || !plan.active) {
        res.status(400).json({
          error: `Plano "${planCode}" não existe ou está inativo no catálogo.`,
          code: 'plan_unavailable',
        });
        return;
      }

      // Descer de plano com uso acima do limite do destino quebraria telas do
      // cliente em silêncio. O serviço já recusa; checar aqui é o que permite
      // devolver 409 com a mensagem que diz QUANTO precisa reduzir.
      const blocker = await subscriptionService.findDowngradeBlocker(organizationId, plan);
      if (blocker) {
        res.status(409).json({ error: blocker, code: 'downgrade_blocked' });
        return;
      }

      await subscriptionService.changePlan(organizationId, planCode, { paymentConfirmed: true });

      const subscription = await prisma.subscription.update({
        where: { organizationId },
        data: { gateway: 'manual' },
        include: { plan: true },
      });

      await adminAuditService.log(req, {
        action: 'subscription.plan_change',
        organizationId,
        entityType: 'subscription',
        entityId: subscription.id,
        reason,
        before: snapshot(before),
        after: snapshot(subscription),
        extra: {
          // Registrado explicitamente: é a informação que responde "por que este
          // cliente está no Rede sem pagamento no gateway".
          paymentConfirmedByAdmin: true,
          gatewaySubscriptionKept: Boolean(before.gatewaySubscriptionId),
        },
      });

      res.json({ subscription });
    } catch (error) {
      handleError(error, res, 'trocar plano');
    }
  }
);

/**
 * `POST /:id/subscription/extend` — soma N dias ao fim do período (cortesia,
 * incidente, negociação).
 *
 * ── De onde a soma parte, e por quê ─────────────────────────────────────────
 * A base é `currentPeriodEnd` quando ele está no FUTURO (a cortesia empurra o
 * vencimento e preserva a âncora de cobrança) e AGORA quando ele já passou ou
 * não existe. Somar sempre a partir de `currentPeriodEnd` daria menos — ou nada
 * — justamente ao cliente que teve o incidente: "10 dias" em cima de uma data
 * de duas semanas atrás continua no passado, e o operador acharia que resolveu.
 *
 * ── O que esta rota NÃO faz ─────────────────────────────────────────────────
 * Não muda `status`. Estender o período de um `past_due` não o reativa: quem
 * reativa é pagamento confirmado (`manual-payment`) ou troca de plano. Fazer as
 * duas coisas de uma vez esconderia do operador que a cobrança continua em
 * aberto, e o cliente voltaria a `past_due` no próximo ciclo sem que ninguém
 * entendesse o motivo.
 */
router.post(
  '/:id/subscription/extend',
  validateBody(extendSubscriptionSchema),
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id as string;
    const { days, reason } = req.body as { days: number; reason: string };

    try {
      const before = await adminOrganizationService.requireSubscription(organizationId);

      const now = new Date();
      const base =
        before.currentPeriodEnd && before.currentPeriodEnd.getTime() > now.getTime()
          ? before.currentPeriodEnd
          : now;
      const currentPeriodEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

      const subscription = await prisma.subscription.update({
        where: { organizationId },
        data: { currentPeriodEnd },
        include: { plan: true },
      });

      await adminAuditService.log(req, {
        action: 'subscription.extend',
        organizationId,
        entityType: 'subscription',
        entityId: subscription.id,
        reason,
        before: snapshot(before),
        after: snapshot(subscription),
        extra: { days, baseWasCurrentPeriodEnd: base !== now },
      });

      res.json({ subscription });
    } catch (error) {
      handleError(error, res, 'estender período');
    }
  }
);

/**
 * `POST /:id/subscription/manual-payment` — registra um Pix recebido na mão e
 * reativa a assinatura.
 *
 * ⚠️ `amountCents` É O CAIXA DO CICLO — no anual, os 12 meses. Este é o defeito
 * US-A-05 e ele nasce aqui com mais facilidade que em qualquer outro lugar,
 * porque o operador tem na tela o preço de vitrine (mensal equivalente) e no
 * extrato o valor cheio que caiu. Gravar o mensal num pagamento anual faz o
 * caixa do relatório sair 12 vezes menor, e o erro só aparece na conciliação,
 * quando ninguém mais sabe qual cobrança era qual.
 *
 * Como nenhuma validação distingue R$ 468 de R$ 39 (os dois são inteiros
 * positivos), a defesa é devolver `expectedCycleCents` — o valor que o catálogo
 * cobraria por essas telas nesse intervalo — junto da confirmação, e registrar a
 * divergência na auditoria. O operador confere um número, não uma regra.
 *
 * `reference` (o id do Pix/comprovante) vira `providerPaymentId`. É o que torna
 * o registro idempotente na prática: o mesmo comprovante lançado duas vezes bate
 * na unicidade e volta 409, em vez de duplicar o caixa do mês.
 */
router.post(
  '/:id/subscription/manual-payment',
  validateBody(manualPaymentSchema),
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id as string;
    const body = req.body as {
      amountCents: number;
      screens: number;
      interval: 'monthly' | 'yearly';
      paidAt?: Date;
      reference?: string;
      reason: string;
    };

    try {
      const before = await adminOrganizationService.requireSubscription(organizationId);
      const paidAt = body.paidAt ?? new Date();

      const expectedCycleCents = estimateCycleCents(before.plan, body.screens, body.interval);

      const payment = await prisma.payment.create({
        data: {
          organizationId,
          provider: 'manual',
          // Prefixo para não colidir com um id do Asaas que por acaso seja
          // igual: `providerPaymentId` é único na tabela inteira, não por
          // provedor.
          providerPaymentId: body.reference ? `manual:${body.reference}` : null,
          status: 'confirmed',
          method: 'pix',
          amountCents: body.amountCents,
          billingInterval: body.interval,
          screens: body.screens,
          paidAt,
        },
      });

      // Só depois de o pagamento estar gravado: se a ordem fosse a inversa e a
      // criação falhasse, a assinatura ficaria ativa sem nenhuma linha de caixa
      // que explicasse por quê.
      await subscriptionService.markActiveFromPayment({
        organizationId,
        interval: body.interval,
        paidAt,
        gateway: 'manual',
      });

      const subscription = await prisma.subscription.findUnique({
        where: { organizationId },
        include: { plan: true },
      });

      await adminAuditService.log(req, {
        action: 'subscription.manual_payment',
        organizationId,
        entityType: 'payment',
        entityId: payment.id,
        reason: body.reason,
        before: snapshot(before),
        after: subscription ? snapshot(subscription) : null,
        extra: {
          amountCents: body.amountCents,
          expectedCycleCents,
          // `true` quando o valor lançado não é o que o catálogo cobraria. Não
          // é erro (desconto negociado é legítimo) — é o sinal que permite achar
          // depois um lançamento feito com o número mensal por engano.
          divergesFromCatalog: body.amountCents !== expectedCycleCents,
          interval: body.interval,
          screens: body.screens,
          reference: body.reference ?? null,
        },
      });

      res.status(201).json({
        payment,
        subscription,
        expectedCycleCents,
        divergesFromCatalog: body.amountCents !== expectedCycleCents,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        res.status(409).json({
          error:
            'Já existe um pagamento registrado com este comprovante. Confira antes de lançar de novo, porque ' +
            'duplicar o lançamento dobra o caixa do mês.',
          code: 'payment_already_registered',
        });
        return;
      }
      handleError(error, res, 'registrar pagamento manual');
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Concessão manual (override)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `PUT /:id/override` — cria ou substitui a concessão.
 *
 * `PUT` e não `PATCH` porque o corpo é o estado COMPLETO da concessão: sem isso,
 * remover uma feature concedida seria impossível pela tela e a lista só cresceria.
 *
 * O `reason` é gravado duas vezes de propósito — em `SubscriptionOverride.note`
 * (que é o que aparece do lado do cliente, respondendo "por que ele tem isso") e
 * no `AuditLog` (que responde "quem deu, quando"). A `note` sobrevive à
 * concessão ser editada; a trilha guarda cada versão.
 */
router.put(
  '/:id/override',
  validateBody(setOverrideSchema),
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id as string;
    const body = req.body as {
      extraFeatures: string[];
      maxDevices?: number | null;
      maxUsers?: number | null;
      expiresAt?: Date | null;
      reason: string;
    };

    try {
      await adminOrganizationService.requireSubscription(organizationId);
      const previous = await subscriptionOverrideService.getByOrganization(organizationId);

      const override = await subscriptionOverrideService.upsert({
        organizationId,
        extraFeatures: body.extraFeatures,
        maxDevices: body.maxDevices ?? null,
        maxUsers: body.maxUsers ?? null,
        note: body.reason,
        expiresAt: body.expiresAt ?? null,
        setByUserId: operatorId(req),
      });

      await adminAuditService.log(req, {
        action: 'override.set',
        organizationId,
        entityType: 'subscription_override',
        entityId: override.subscriptionId,
        reason: body.reason,
        before: previous
          ? {
              extraFeatures: parseFeatures(previous.extraFeatures),
              maxDevices: previous.maxDevices,
              maxUsers: previous.maxUsers,
              expiresAt: previous.expiresAt,
              note: previous.note,
            }
          : null,
        after: {
          extraFeatures: parseFeatures(override.extraFeatures),
          maxDevices: override.maxDevices,
          maxUsers: override.maxUsers,
          expiresAt: override.expiresAt,
          note: override.note,
        },
        extra: {
          // Concessão sem prazo é o vazamento de receita que `expiresAt` existe
          // para evitar (§2.4). Marcada aqui para dar como achar depois todas as
          // que ficaram para sempre.
          perpetual: !override.expiresAt,
        },
      });

      res.json({
        override: {
          ...override,
          extraFeatures: parseFeatures(override.extraFeatures),
        },
        entitlements: await subscriptionOverrideService.resolveEntitlements(organizationId),
      });
    } catch (error) {
      handleError(error, res, 'gravar concessão');
    }
  }
);

/**
 * `DELETE /:id/override` — remove a concessão.
 *
 * O motivo é aceito no corpo OU em `?reason=`. Não é indecisão: `DELETE` com
 * corpo é legal em HTTP mas há cliente que o descarta em silêncio, e uma remoção
 * que falha com 400 "motivo obrigatório" sem o operador ter como enviá-lo
 * terminaria em alguém apagando a linha direto no banco — sem trilha nenhuma.
 *
 * A auditoria é gravada com o `before` lido ANTES do `delete`: depois a linha
 * não existe mais para ser descrita, e "o que este cliente tinha" é exatamente a
 * pergunta que a trilha precisa responder.
 */
router.delete('/:id/override', async (req: Request, res: Response): Promise<void> => {
  const organizationId = req.params.id as string;
  const raw =
    (req.body as { reason?: unknown } | undefined)?.reason ??
    (req.query as { reason?: unknown }).reason;

  const parsed = reasonField.safeParse(raw);
  if (!parsed.success) {
    badQuery(res, parsed.error.issues.map((issue) => ({ path: ['reason'], message: issue.message })));
    return;
  }

  try {
    const previous = await subscriptionOverrideService.getByOrganization(organizationId);
    const removed = await subscriptionOverrideService.remove(organizationId);

    await adminAuditService.log(req, {
      action: 'override.remove',
      organizationId,
      entityType: 'subscription_override',
      entityId: previous?.subscriptionId ?? null,
      reason: parsed.data,
      before: previous
        ? {
            extraFeatures: parseFeatures(previous.extraFeatures),
            maxDevices: previous.maxDevices,
            maxUsers: previous.maxUsers,
            expiresAt: previous.expiresAt,
            note: previous.note,
          }
        : null,
      after: null,
      // `false` = não havia concessão. A rota é idempotente (clicar duas vezes
      // em "remover" não é erro), mas a trilha registra que nada mudou — senão a
      // segunda entrada pareceria uma segunda remoção.
      extra: { removed },
    });

    res.json({ removed });
  } catch (error) {
    handleError(error, res, 'remover concessão');
  }
});

export default router;
