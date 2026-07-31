import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import {
  QuotaResource,
  billedScreens,
  estimateMonthlyCents,
  inactiveReason,
  isActive,
  subscriptionService,
} from '../services/subscription.service';

/**
 * `req.tenantId` é introduzido pelo middleware de isolamento multi-tenant.
 * Declaramos aqui de forma aditiva (opcional) para não depender do arquivo dele
 * nem quebrar caso ele ainda não exista.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantId?: string | null;
    }
  }
}

/**
 * Resolve o tenant da request, em ordem de preferência:
 *   1. `req.tenantId` (middleware de isolamento multi-tenant);
 *   2. `req.user.organizationId` (caso o payload do JWT passe a carregá-lo);
 *   3. consulta ao banco pelo id do usuário autenticado (fallback atual, já que
 *      o token hoje só carrega id/email/role).
 */
export async function resolveTenantId(req: Request): Promise<string | null> {
  if (req.tenantId) return req.tenantId;

  const user = req.user as (Request['user'] & { organizationId?: string | null }) | undefined;
  if (user?.organizationId) return user.organizationId;
  if (!user?.id) return null;

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { organizationId: true },
  });

  return record?.organizationId ?? null;
}

const NO_TENANT_MESSAGE =
  'Sua conta não está vinculada a nenhuma organização. Contate o suporte para regularizar.';

/**
 * Bloqueia com 402 (Payment Required) quando a assinatura do tenant não é
 * válida: `past_due`, `canceled`, inexistente ou trial promocional vencido.
 *
 * O plano `gratis` nasce `active` sem `trialEndsAt` e nunca cai aqui — freemium
 * não expira.
 *
 * O role `master` (proprietário da plataforma) não tem organização e passa
 * livre — ele opera acima dos tenants.
 */
export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.user?.role === 'master') {
      next();
      return;
    }

    const organizationId = await resolveTenantId(req);
    if (!organizationId) {
      res.status(402).json({ error: NO_TENANT_MESSAGE, code: 'no_tenant' });
      return;
    }

    const subscription = await subscriptionService.getByOrganization(organizationId);

    if (!isActive(subscription)) {
      res.status(402).json({
        error: inactiveReason(subscription),
        code: 'subscription_inactive',
        status: subscription?.status ?? null,
        planCode: subscription?.plan?.code ?? null,
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

const RESOURCE_LABEL: Record<QuotaResource, string> = {
  device: 'telas ativas',
  user: 'usuários',
  organization: 'organizações',
};

function reais(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// REGRA ANTI-COBRANÇA-RETROATIVA  (decisão comercial, 2026-07-25)
//
// A reclamação nº 1 dos clientes do Yodeck — documentada em
// `raw/pesquisa/2026-07-25-deep-research-concorrentes-signage.md`, seção
// "Fatores de Atrito" — é que ao conectar a 2ª tela TODAS as telas da conta
// passam a ser cobradas, inclusive a primeira que era gratuita, de forma
// retroativa. O TelaHub faz o oposto, e isso é vendido como diferencial:
//
//   1. O plano `gratis` dá 1 tela sem prazo e sem cartão. Ninguém é empurrado
//      para um plano pago por vencimento de prazo.
//   2. A cobrança só começa quando a conta decide escalar, e vale da data do
//      upgrade EM DIANTE.
//   3. Esse primeiro ciclo é PROPORCIONAL aos dias restantes do período, nunca
//      um mês inteiro.
//   4. NUNCA há cobrança retroativa: nada é faturado pelo tempo em que a conta
//      usou a plataforma de graça.
//
// ATENÇÃO — o que a promessa NÃO diz (e não pode passar a dizer sem decisão
// explícita do dono): não há crédito perpétuo de 1 tela grátis dentro dos
// planos pagos. Ao migrar para `loja`/`rede`, a fatura é
// `max(telas ativas, minScreens) × preço por tela` — é o que
// `subscriptionService.estimateMonthlyCents` implementa e o que a landing diz
// ("a cobrança é por tela ativa"). Uma redação anterior deste bloco afirmava
// que "só as telas adicionais entram na fatura", o que equivaleria a descontar
// R$ 49/mês de todo cliente para sempre — divergia da fórmula e da página.
// Se o dono quiser o crédito perpétuo, tem de mudar os três juntos: a fórmula,
// esta regra e a landing.
//
// Quem for integrar o gateway (ver `TODO(gateway)` em
// `src/routes/billing.routes.ts`) precisa implementar isso explicitamente:
// proração ativada e `billing_cycle_anchor`/data de início = HOJE — jamais
// retroagir à data de criação da conta. Retroagir o ciclo quebra a promessa
// pública do produto.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bloqueia com 403 quando criar mais um `resource` estouraria a quota do plano.
 * Limite `null` = ilimitado, nunca bloqueia — nos planos pagos `maxDevices` é
 * `null` de propósito (paga-se por tela ativa; a fatura é o limite, não uma
 * trava). Na prática, o único bloqueio de device que existe é a 2ª tela no
 * plano `gratis`, e a resposta desse caso explica a regra acima.
 */
export const enforceQuota = (resource: QuotaResource) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user?.role === 'master') {
        next();
        return;
      }

      const organizationId = await resolveTenantId(req);
      if (!organizationId) {
        res.status(402).json({ error: NO_TENANT_MESSAGE, code: 'no_tenant' });
        return;
      }

      const usage = await subscriptionService.getUsage(organizationId);
      const entry =
        resource === 'device'
          ? usage.devices
          : resource === 'user'
            ? usage.users
            : usage.organizations;

      // Ilimitado.
      if (entry.limit === null) {
        next();
        return;
      }

      if (entry.used >= entry.limit) {
        const label = RESOURCE_LABEL[resource];

        // Caso freemium: tenant no plano grátis tentando conectar a 2ª tela.
        // Aqui a resposta não é só "faça upgrade" — ela explica a regra
        // anti-cobrança-retroativa documentada acima, que é o argumento de
        // venda contra o Yodeck.
        if (resource === 'device' && usage.freePlan) {
          const screensWanted = entry.used + 1;
          const suggested = await subscriptionService.suggestUpgradeFor(screensWanted);

          const billing = {
            /** A partir de qual tela a cobrança começa (a 1ª é sempre grátis). */
            chargesFromScreen: 2,
            /** Nunca cobramos período já usado de graça. */
            retroactive: false,
            /** Primeiro ciclo rateado pelos dias restantes. */
            proration: 'proporcional-ao-periodo' as const,
            freeScreens: entry.limit,
            suggestedPlan: suggested
              ? {
                  code: suggested.code,
                  name: suggested.name,
                  pricePerScreenCents: suggested.pricePerScreenCents,
                  pricePerScreen: suggested.pricePerScreenCents / 100,
                  minScreens: suggested.minScreens,
                  estimatedMonthlyCents: estimateMonthlyCents(suggested, screensWanted),
                  billedScreens: billedScreens(suggested, screensWanted),
                }
              : null,
          };

          const oferta = suggested
            ? ` O plano ${suggested.name} custa ${reais(suggested.pricePerScreenCents)} por tela/mês` +
              (suggested.minScreens > 1 ? ` (mínimo de ${suggested.minScreens} telas)` : '') +
              `, o que dá cerca de ${reais(estimateMonthlyCents(suggested, screensWanted))} por mês com ${billedScreens(suggested, screensWanted)} telas.`
            : '';

          res.status(403).json({
            error:
              `Seu plano ${usage.planName} inclui ${entry.limit} tela, sem prazo e sem cartão. ` +
              `Para conectar a ${screensWanted}ª tela é preciso um plano pago: a cobrança vale da ativação ` +
              `em diante e é proporcional aos dias restantes do período — nunca retroativa, você não paga ` +
              `nada pelo tempo em que usou de graça.` +
              oferta,
            // `code` continua `quota_exceeded` para não quebrar quem já trata
            // esse código; `reason` discrimina o caso freemium.
            code: 'quota_exceeded',
            reason: 'free_plan_screen_limit',
            resource,
            limit: entry.limit,
            used: entry.used,
            planCode: usage.planCode,
            billing,
          });
          return;
        }

        res.status(403).json({
          error:
            `Limite do plano ${usage.planName} atingido: ${entry.limit} ${label} ` +
            `(você já usa ${entry.used}). Faça upgrade do plano para adicionar mais.`,
          code: 'quota_exceeded',
          resource,
          limit: entry.limit,
          used: entry.used,
          planCode: usage.planCode,
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
