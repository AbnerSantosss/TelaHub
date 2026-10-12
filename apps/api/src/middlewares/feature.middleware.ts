import { Request, Response, NextFunction } from 'express';

import { planService } from '../services/plan.service';
import { hasFeature } from '../services/plan.service';
import { subscriptionOverrideService } from '../services/subscription-override.service';
import { subscriptionService } from '../services/subscription.service';
import { resolveTenantId } from './quota.middleware';

// ─────────────────────────────────────────────────────────────────────────────
// GATE DE FEATURE DE PLANO
//
// Terceira camada de direito de uso, irmã das duas que já existiam:
//
//   requireActiveSubscription (quota.middleware) → "esta conta está em dia?"
//   enforceQuota              (quota.middleware) → "cabe mais QUANTOS?"
//   requireFeature            (aqui)             → "este plano inclui O QUÊ?"
//
// Por que isto existe: até 2026-07-31 o catálogo vendia `relatorios`,
// `auditoria`, `powerbi`, `agendamento-avancado` e `multi-org` como recursos de
// plano pago, e `hasFeature()` — escrito, testado e correto — não era chamado
// por NENHUMA rota de produção. Na prática, uma conta no plano Grátis usava
// tudo.
//
// Features vendidas HOJE (plano comercial v2 §5.1b, catálogo em
// `prisma/seed-plans.ts`): `relatorios`, `documentos` e `agendamento-avancado`
// no Loja; `auditoria` e `powerbi` no Rede; `white-label`, `sso` e `sla` no
// Enterprise. `api-externa` e `multi-org` foram RETIRADAS do catálogo em
// 2026-08-30 — eram vendidas sem existir no código, e um rótulo aqui para
// feature inexistente só serviria para alguém religar o gate por engano. O risco aqui é o inverso do habitual (não é enganar o cliente, é
// entregar de graça o que deveria ser pago) e ele piora com o tempo: quanto
// mais gente monta a operação em cima de um recurso não cobrado, mais caro fica
// ligar o gate depois.
//
// ── O gate é no SERVIDOR, não no editor ─────────────────────────────────────
// Esconder o botão no frontend não é gate: a chamada direta à API contorna
// qualquer verificação de tela. É a mesma lição que o isolamento multi-tenant
// já ensinou neste projeto — o filtro que roda no navegador não é fronteira. A
// pergunta certa é sempre "o que acontece se eu chamar esta rota com o token de
// uma conta grátis?", nunca "o editor mostra o botão?".
// ─────────────────────────────────────────────────────────────────────────────

/** Erro de direito de uso por feature, com o material para a resposta 403. */
export interface FeatureDenial {
  featureKey: string;
  planCode: string | null;
  planName: string | null;
  requiredPlan: {
    code: string;
    name: string;
    pricePerScreenCents: number;
    pricePerScreen: number;
    minScreens: number;
  } | null;
}

/** Rótulo humano de cada feature, usado na mensagem de bloqueio. */
const FEATURE_LABEL: Record<string, string> = {
  relatorios: 'os relatórios de exibição',
  auditoria: 'a trilha de auditoria',
  documentos: 'os documentos na tela (PDF, Google Docs e Office)',
  powerbi:
    'os painéis de gestão (Power BI, Airtable, cotações, snapshot de página e HTML próprio)',
  'agendamento-avancado': 'o agendamento por faixa de horário',
};

export function featureLabel(featureKey: string): string {
  return FEATURE_LABEL[featureKey] ?? `o recurso "${featureKey}"`;
}

/**
 * Monta a resposta de bloqueio de uma feature: diz o que faltou, em que plano a
 * conta está e **qual é o plano mais barato que libera** — com o preço junto.
 *
 * Oferecer o plano no corpo do 403 não é enfeite: sem isso o frontend teria de
 * manter seu próprio mapa feature→plano, que é justamente a duplicação que faz
 * as superfícies divergirem (o preço da landing já divergiu do catálogo uma vez
 * por esse motivo).
 */
export async function buildFeatureDenial(
  featureKey: string,
  subscription: { plan?: { code: string; name: string } | null } | null
): Promise<FeatureDenial> {
  const required = await planService.cheapestPlanWithFeature(featureKey);

  return {
    featureKey,
    planCode: subscription?.plan?.code ?? null,
    planName: subscription?.plan?.name ?? null,
    requiredPlan: required
      ? {
          code: required.code,
          name: required.name,
          pricePerScreenCents: required.pricePerScreenCents,
          pricePerScreen: required.pricePerScreenCents / 100,
          minScreens: required.minScreens,
        }
      : null,
  };
}

/** Frase de bloqueio pronta, no tom do resto do produto (explica, depois oferece). */
export function featureDenialMessage(denial: FeatureDenial): string {
  const base = denial.planName
    ? `Seu plano ${denial.planName} não inclui ${featureLabel(denial.featureKey)}.`
    : `Seu plano não inclui ${featureLabel(denial.featureKey)}.`;

  if (!denial.requiredPlan) return base;

  const { name, pricePerScreenCents, minScreens } = denial.requiredPlan;
  const preco = `R$ ${(pricePerScreenCents / 100).toFixed(2).replace('.', ',')}`;
  const minimo = minScreens > 1 ? ` (mínimo de ${minScreens} telas)` : '';

  return `${base} O plano ${name} libera, por ${preco} por tela/mês${minimo}.`;
}

/**
 * Bloqueia com 403 quando o plano do tenant não inclui `featureKey`.
 *
 * Duas passagens livres, ambas deliberadas:
 *
 * 1. **`master`** — o proprietário da plataforma opera acima dos tenants e não
 *    tem organização nem assinatura.
 * 2. **Organização sem assinatura** — falha ABERTO, pela mesma razão já
 *    registrada em `entitlement.service.ts`: existem organizações criadas antes
 *    de a cobrança existir, e barrá-las aqui removeria um recurso que já usavam
 *    por causa de um dado ausente, não de uma decisão comercial. Quem barra
 *    conta sem assinatura é `requireActiveSubscription`, não este middleware —
 *    cada camada responde por uma pergunta só.
 */
export const requireFeature = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user?.role === 'master') {
        next();
        return;
      }

      const organizationId = await resolveTenantId(req);
      if (!organizationId) {
        res.status(402).json({
          error: 'Sua conta não está vinculada a nenhuma organização. Contate o suporte para regularizar.',
          code: 'no_tenant',
        });
        return;
      }

      const subscription = await subscriptionService.getByOrganization(organizationId);

      // Fail-open documentado acima.
      if (!subscription) {
        next();
        return;
      }

      if (hasFeature(subscription, featureKey)) {
        next();
        return;
      }

      // ── Concessão manual, consultada SÓ no caminho da negação ──────────────
      //
      // A ordem aqui é o desenho, não uma otimização. O plano é verificado
      // primeiro e libera sozinho; a concessão só é lida quando o gate já ia
      // recusar. Duas garantias saem disso de graça:
      //
      //   1. Quem tem direito PELO PLANO nunca depende desta consulta — um erro
      //      de banco ao ler o override não pode transformar um cliente do Rede
      //      em bloqueado. Nenhuma disciplina de código sustenta isso; a ordem
      //      das linhas sustenta.
      //   2. Sem concessão nenhuma no banco, o comportamento é idêntico ao de
      //      antes de 2026-09-09, e a consulta extra só acontece no caminho que
      //      já ia responder 403 — que é raro e não é quente.
      //
      // `grantsFeature` não lança: ver a invariante 3 de
      // `subscription-override.service.ts`.
      if (await subscriptionOverrideService.grantsFeature(organizationId, featureKey)) {
        next();
        return;
      }

      const denial = await buildFeatureDenial(featureKey, subscription);
      res.status(403).json({
        error: featureDenialMessage(denial),
        code: 'feature_not_in_plan',
        ...denial,
      });
    } catch (error) {
      next(error);
    }
  };
};
