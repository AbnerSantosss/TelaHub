import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO DE PLANOS
//
// Valores definidos pelo dono do produto em 2026-07-25, com base na pesquisa de
// mercado em `raw/pesquisa/2026-07-25-deep-research-*.md` (tarifas de prateleira
// no Brasil: R$ 25–R$ 150 por tela/mês; verticais-alvo entre R$ 30 e R$ 110).
// Os preços anteriores (R$ 29 / R$ 24) estavam no piso do mercado.
//
// Tudo (preço, limites, features) mora neste único objeto — para mudar a
// política comercial, edite só aqui e rode `npm run db:seed-plans` novamente
// (é idempotente por `code`).
//
// Modelo de cobrança: POR TELA ATIVA / MÊS. Valores sempre em CENTAVOS de BRL.
// Limites `null` = ilimitado.
//
// PORTA DE ENTRADA = FREEMIUM, não trial: o plano `gratis` dá 1 tela para
// sempre, sem prazo e sem cartão (ver "Modelo de Crescimento Liderado pelo
// Produto (PLG) e Freemium" na pesquisa de mercado). O plano `trial` de 14 dias
// foi descontinuado — ver `LEGACY_TRIAL_PLAN_CODE` abaixo.
//
// `maxDevices` NOS PLANOS PAGOS É `null` (ILIMITADO) DE PROPÓSITO: o modelo é
// "paga por tela ativa", então o que limita a expansão é a fatura, não uma
// trava artificial no software. Isso é o que sustenta a promessa da landing
// ("telas ilimitadas — você paga por tela ativa"). Só o plano `gratis` tem
// `maxDevices: 1`.
// ─────────────────────────────────────────────────────────────────────────────

export interface PlanSeed {
  code: string;
  name: string;
  pricePerScreenCents: number;
  minScreens: number;
  maxDevices: number | null;
  maxUsers: number | null;
  maxOrganizations: number | null;
  features: string[];
  active: boolean;
}

/** Feature marcadora: preço não é público, exige contato comercial. */
export const FEATURE_QUOTE_ONLY = 'preco-sob-consulta';

/** Plano de entrada freemium (1 tela grátis para sempre). */
export const FREE_PLAN_CODE = 'gratis';

/**
 * Plano de trial de 14 dias, DESCONTINUADO em 2026-07-25. Mantido apenas para
 * a migração: a linha fica no banco marcada `active: false` (para não aparecer
 * em `GET /api/plans`) e as assinaturas que apontavam para ele são remanejadas
 * para `gratis`. Não reutilizar este código para um trial promocional novo —
 * crie outro `code` para não confundir dados históricos.
 */
export const LEGACY_TRIAL_PLAN_CODE = 'trial';

const FEATURES_GRATIS = ['widgets-basicos', 'alerta-offline'];
const FEATURES_LOJA = [...FEATURES_GRATIS, 'relatorios', 'auditoria'];
const FEATURES_REDE = [
  ...FEATURES_LOJA,
  'powerbi',
  'api-externa',
  'agendamento-avancado',
  'multi-org',
];
const FEATURES_ENTERPRISE = [...FEATURES_REDE, 'white-label', 'sso', 'sla', FEATURE_QUOTE_ONLY];

export const PLAN_CATALOG: PlanSeed[] = [
  {
    code: FREE_PLAN_CODE,
    name: 'Grátis',
    pricePerScreenCents: 0,
    minScreens: 1,
    // Única trava real de device no catálogo: a 1ª tela é grátis para sempre.
    maxDevices: 1,
    maxUsers: 1,
    maxOrganizations: 1,
    features: FEATURES_GRATIS,
    active: true,
  },
  {
    code: 'loja',
    name: 'Loja',
    pricePerScreenCents: 4900,
    minScreens: 1,
    maxDevices: null, // ilimitado — quem limita é a fatura por tela ativa.
    maxUsers: 3,
    maxOrganizations: 1,
    features: FEATURES_LOJA,
    active: true,
  },
  {
    code: 'rede',
    name: 'Rede',
    pricePerScreenCents: 3900,
    // Preço menor por tela em troca de um piso de 5 telas na fatura.
    minScreens: 5,
    maxDevices: null,
    maxUsers: 15,
    maxOrganizations: 10,
    features: FEATURES_REDE,
    active: true,
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    // Preço sob consulta — 0 aqui NÃO significa gratuito. O flag
    // `preco-sob-consulta` em `features` é o que sinaliza isso ao frontend.
    pricePerScreenCents: 0,
    minScreens: 1,
    maxDevices: null,
    maxUsers: null,
    maxOrganizations: null,
    features: FEATURES_ENTERPRISE,
    active: true,
  },
];

/**
 * Descontinua o plano `trial` e remaneja suas assinaturas para `gratis`.
 *
 * Motivo: a entrada deixou de ser trial de 14 dias e passou a ser freemium.
 * Assinaturas antigas ficariam apontando para um plano fora do catálogo (ou,
 * pior, expirariam sozinhas por `trialEndsAt` e derrubariam o acesso de contas
 * que hoje têm direito a 1 tela para sempre).
 *
 * Idempotente: rodar duas vezes não muda nada na segunda vez (a segunda
 * execução não encontra mais assinaturas em `trial`).
 */
async function migrateTrialSubscriptions(client: PrismaClient): Promise<void> {
  const trialPlan = await client.plan.findUnique({ where: { code: LEGACY_TRIAL_PLAN_CODE } });
  if (!trialPlan) return;

  const freePlan = await client.plan.findUnique({ where: { code: FREE_PLAN_CODE } });
  if (!freePlan) {
    throw new Error(
      `Plano "${FREE_PLAN_CODE}" não encontrado — o catálogo precisa ser semeado antes da migração.`
    );
  }

  const moved = await client.subscription.updateMany({
    where: { planId: trialPlan.id },
    data: { planId: freePlan.id, status: 'active', trialEndsAt: null },
  });

  // Mantemos a linha no banco (histórico/FK), apenas fora do catálogo público.
  if (trialPlan.active) {
    await client.plan.update({ where: { id: trialPlan.id }, data: { active: false } });
  }

  if (moved.count > 0) {
    console.log(
      `  ↪ ${moved.count} assinatura(s) migrada(s) de "${LEGACY_TRIAL_PLAN_CODE}" para "${FREE_PLAN_CODE}" (status active, sem expiração)`
    );
  }
  console.log(`  ⏹ plano "${LEGACY_TRIAL_PLAN_CODE}" fora do catálogo (active: false)`);
}

export async function seedPlans(client: PrismaClient = prisma): Promise<void> {
  for (const plan of PLAN_CATALOG) {
    const data = {
      name: plan.name,
      pricePerScreenCents: plan.pricePerScreenCents,
      minScreens: plan.minScreens,
      maxDevices: plan.maxDevices,
      maxUsers: plan.maxUsers,
      maxOrganizations: plan.maxOrganizations,
      features: JSON.stringify(plan.features),
      active: plan.active,
    };

    await client.plan.upsert({
      where: { code: plan.code },
      update: data,
      create: { code: plan.code, ...data },
    });

    const preco =
      plan.pricePerScreenCents === 0
        ? plan.code === 'enterprise'
          ? 'sob consulta'
          : 'gratuito (1 tela para sempre)'
        : `R$ ${(plan.pricePerScreenCents / 100).toFixed(2)}/tela/mês (mín. ${plan.minScreens} tela${
            plan.minScreens > 1 ? 's' : ''
          })`;
    console.log(`  ✔ ${plan.code.padEnd(11)} ${preco}`);
  }

  await migrateTrialSubscriptions(client);
}

// Executa apenas quando chamado direto (`tsx prisma/seed-plans.ts`).
if (require.main === module) {
  console.log('🌱 Sincronizando catálogo de planos...');
  seedPlans()
    .then(() => console.log('✅ Catálogo de planos atualizado.'))
    .catch((err) => {
      console.error('❌ Falha ao semear planos:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
