import prisma from '../lib/prisma';
import type { Plan } from '@prisma/client';

/**
 * Feature marcadora usada pelo plano Enterprise: o preço não é público e a
 * contratação passa pelo comercial. Espelha a constante de `prisma/seed-plans.ts`
 * (duplicada de propósito — `prisma/` fica fora do `rootDir` do build).
 */
export const FEATURE_QUOTE_ONLY = 'preco-sob-consulta';

/** Formato público de um plano, pronto para a landing/pricing consumir. */
export interface PublicPlan {
  code: string;
  name: string;
  /** Preço por tela/mês em centavos (0 quando gratuito ou sob consulta). */
  pricePerScreenCents: number;
  /** Mesmo valor em reais, para exibição direta (ex.: 29). */
  pricePerScreen: number;
  /** `true` quando o preço não é público (Enterprise). */
  quoteOnly: boolean;
  /**
   * `true` no plano de entrada freemium (`gratis`): sem cobrança, sem prazo e
   * sem cartão. `pricePerScreenCents: 0` sozinho não basta para identificar —
   * o Enterprise também é 0 por ser sob consulta.
   */
  free: boolean;
  /** Piso de telas cobradas: a fatura nunca é menor que isso. */
  minScreens: number;
  limits: {
    maxDevices: number | null;
    maxUsers: number | null;
    maxOrganizations: number | null;
  };
  features: string[];
}

/** Faz o parse defensivo da coluna `features` (JSON array em texto). */
export function parseFeatures(features: string | null | undefined): string[] {
  if (!features) return [];
  try {
    const parsed = JSON.parse(features);
    return Array.isArray(parsed) ? parsed.filter((f): f is string => typeof f === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Verifica se a assinatura dá direito a uma feature. Aceita tanto uma
 * assinatura com o plano incluído quanto o plano solto, para não obrigar o
 * chamador a montar a mesma query duas vezes.
 */
export function hasFeature(
  subscription: { plan?: { features?: string | null } | null } | { features?: string | null } | null | undefined,
  featureKey: string
): boolean {
  if (!subscription) return false;

  const withPlan = subscription as { plan?: { features?: string | null } | null };
  const raw =
    withPlan.plan && typeof withPlan.plan.features === 'string'
      ? withPlan.plan.features
      : (subscription as { features?: string | null }).features;

  return parseFeatures(raw ?? null).includes(featureKey);
}

/** Converte um registro `Plan` no formato público (sem campos de gateway). */
export function toPublicPlan(plan: Plan): PublicPlan {
  const features = parseFeatures(plan.features);
  const quoteOnly = features.includes(FEATURE_QUOTE_ONLY);
  return {
    code: plan.code,
    name: plan.name,
    pricePerScreenCents: plan.pricePerScreenCents,
    pricePerScreen: plan.pricePerScreenCents / 100,
    quoteOnly,
    free: !quoteOnly && plan.pricePerScreenCents === 0,
    minScreens: plan.minScreens,
    limits: {
      maxDevices: plan.maxDevices,
      maxUsers: plan.maxUsers,
      maxOrganizations: plan.maxOrganizations,
    },
    features,
  };
}

export class PlanService {
  /**
   * Planos ativos na ordem da página de preços: grátis primeiro, depois os
   * pagos do mais barato ao mais caro, e "sob consulta" (Enterprise) por
   * último. Ordenar só por `pricePerScreenCents` não serve porque o grátis e o
   * Enterprise empatam em 0.
   *
   * O plano `trial` descontinuado tem `active: false` e não aparece aqui.
   */
  async listActive(): Promise<Plan[]> {
    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: [{ pricePerScreenCents: 'asc' }, { code: 'asc' }],
    });

    const rank = (plan: Plan): number => {
      if (parseFeatures(plan.features).includes(FEATURE_QUOTE_ONLY)) return 2; // último
      if (plan.pricePerScreenCents === 0) return 0; // grátis primeiro
      return 1;
    };

    // Dentro dos pagos, ordenar por preço unitário inverteria a escada da
    // vitrine: o Rede custa menos por tela (R$ 39) mas exige um mínimo de 5
    // telas, então é o plano MAIOR, não o de entrada. `minScreens` é o que
    // reflete a progressão real; o preço por tela só desempata.
    return plans.sort(
      (a, b) =>
        rank(a) - rank(b) ||
        a.minScreens - b.minScreens ||
        a.pricePerScreenCents - b.pricePerScreenCents ||
        a.code.localeCompare(b.code)
    );
  }

  /** Planos ativos em formato público (o que a landing consome). */
  async listActivePublic(): Promise<PublicPlan[]> {
    const plans = await this.listActive();
    return plans.map(toPublicPlan);
  }

  async getByCode(code: string): Promise<Plan | null> {
    return prisma.plan.findUnique({ where: { code } });
  }

  /** Como `getByCode`, mas lança quando o plano não existe. */
  async requireByCode(code: string): Promise<Plan> {
    const plan = await this.getByCode(code);
    if (!plan) {
      throw new Error(`Plano "${code}" não encontrado. Rode "npm run db:seed-plans".`);
    }
    return plan;
  }
}

export const planService = new PlanService();
