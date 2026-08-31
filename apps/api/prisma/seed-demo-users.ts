import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { PLAN_CATALOG } from './seed-plans';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// USUÁRIOS DE DEMONSTRAÇÃO — UM POR PLANO
//
// Para quê: até 2026-07-31 as features de plano (`relatorios`, `auditoria`,
// `powerbi`, `documentos`, `agendamento-avancado`) eram vendidas e NÃO aplicadas em lugar
// nenhum — todo mundo tinha tudo. Ao ligar os gates, a única forma honesta de
// saber o que cada plano entrega é entrar como cliente de cada plano e usar.
// Estas contas existem para isso: demonstração de venda e verificação manual do
// gate, não para carga de teste.
//
// Cada conta é um TENANT COMPLETO E ISOLADO: organização própria, usuário admin
// próprio e assinatura própria. Não são variações de uma mesma conta — se
// fossem, não exercitariam o isolamento entre clientes, que é a fronteira de
// segurança mais importante do sistema.
//
// ⚠️ NÃO RODAR EM PRODUÇÃO com a senha padrão. O script recusa a senha de
// fábrica quando `NODE_ENV=production` (ver `resolvePassword`). Em produção,
// defina `DEMO_USER_PASSWORD` com uma senha forte ou simplesmente não rode.
// ─────────────────────────────────────────────────────────────────────────────

/** Senha de fábrica — só vale fora de produção. */
const DEV_DEFAULT_PASSWORD = 'Demo@123';

interface DemoAccount {
  planCode: string;
  /** Nome da empresa — escolhido para lembrar o perfil de cliente do plano. */
  companyName: string;
  personName: string;
  username: string;
  email: string;
  /** O que esta conta serve para demonstrar. */
  demonstrates: string;
}

/**
 * Uma conta por plano do catálogo. Os perfis de empresa não são decorativos:
 * refletem o cliente-alvo de cada faixa descrito na wiki de modelo comercial
 * (loja única → rede com piso de 5 telas → franquia sob contrato).
 */
const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    planCode: 'gratis',
    companyName: 'Padaria Demo (Grátis)',
    personName: 'Ana — plano Grátis',
    username: 'demo-gratis',
    email: 'demo.gratis@telahub.local',
    demonstrates:
      '1 tela e nada mais: a 2ª tela é bloqueada, relatórios e BI são bloqueados, vídeo só nos 7 primeiros dias.',
  },
  {
    planCode: 'loja',
    companyName: 'Ótica Demo (Loja)',
    personName: 'Bruno — plano Loja',
    username: 'demo-loja',
    email: 'demo.loja@telahub.local',
    demonstrates:
      'Telas ilimitadas, vídeo sem prazo, relatórios, documentos na tela (PDF/Docs/Office) e agendamento por horário. Painel de gestão e trilha de auditoria seguem bloqueados.',
  },
  {
    planCode: 'rede',
    companyName: 'Rede Demo 5 Lojas (Rede)',
    personName: 'Carla — plano Rede',
    username: 'demo-rede',
    email: 'demo.rede@telahub.local',
    demonstrates:
      'Tudo do Loja + painel de gestão (Power BI, Airtable, cotações, snapshot e HTML próprio) e trilha de auditoria.',
  },
  {
    planCode: 'enterprise',
    companyName: 'Franquia Demo (Enterprise)',
    personName: 'Diego — plano Enterprise',
    username: 'demo-enterprise',
    email: 'demo.enterprise@telahub.local',
    demonstrates:
      'Tudo do Rede, sem limite de usuários. White label/SSO/SLA aparecem no plano mas NÃO estão implementados — são escopo de contrato.',
  },
];

/**
 * Resolve a senha das contas de demonstração.
 *
 * Recusa a senha de fábrica em produção de propósito: uma conta com senha
 * conhecida e publicada no repositório é uma porta aberta para o painel, e este
 * script cria QUATRO delas. Mesma regra que o `SECRETS.md` já aplica ao admin.
 */
function resolvePassword(): string {
  const fromEnv = process.env.DEMO_USER_PASSWORD?.trim();
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Recusando criar usuários de demonstração em produção com a senha padrão. ' +
        'Defina DEMO_USER_PASSWORD com uma senha forte, ou não rode este seed em produção.'
    );
  }

  return DEV_DEFAULT_PASSWORD;
}

/** Features do plano, lidas do catálogo (fonte de verdade do que cada um libera). */
function featuresOf(planCode: string): string[] {
  return PLAN_CATALOG.find((p) => p.code === planCode)?.features ?? [];
}

/**
 * Cria (ou atualiza) organização + usuário admin + assinatura de um plano.
 *
 * Idempotente por e-mail do usuário: rodar de novo reaproveita a organização já
 * ligada àquele usuário em vez de criar uma órfã a cada execução.
 */
async function upsertDemoAccount(account: DemoAccount, passwordHash: string): Promise<void> {
  const plan = await prisma.plan.findUnique({ where: { code: account.planCode } });
  if (!plan) {
    throw new Error(
      `Plano "${account.planCode}" não encontrado. Rode "npm run db:seed-plans" antes deste seed.`
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: account.email },
    select: { id: true, organizationId: true },
  });

  const organization = existingUser?.organizationId
    ? await prisma.organization.update({
        where: { id: existingUser.organizationId },
        data: { name: account.companyName },
      })
    : await prisma.organization.create({ data: { name: account.companyName } });

  await prisma.user.upsert({
    where: { email: account.email },
    update: {
      username: account.username,
      name: account.personName,
      password: passwordHash,
      role: 'admin',
      organizationId: organization.id,
    },
    create: {
      username: account.username,
      name: account.personName,
      email: account.email,
      password: passwordHash,
      role: 'admin',
      organizationId: organization.id,
    },
  });

  // `status: 'active'` em todos, inclusive nos pagos: não há gateway, então
  // nenhuma assinatura transiciona sozinha. Deixar as contas pagas em
  // `past_due` faria `requireActiveSubscription` bloquear tudo e a demonstração
  // não mostraria nada. Isto é conta de demonstração, não simulação de cobrança.
  await prisma.subscription.upsert({
    where: { organizationId: organization.id },
    update: { planId: plan.id, status: 'active', trialEndsAt: null },
    create: {
      organizationId: organization.id,
      planId: plan.id,
      status: 'active',
      trialEndsAt: null,
    },
  });

  const limites = [
    `telas: ${plan.maxDevices ?? 'ilimitadas'}`,
    `usuários: ${plan.maxUsers ?? 'ilimitados'}`,
    `unidades: ${plan.maxOrganizations ?? 'ilimitadas'}`,
  ].join(' · ');

  console.log(`  ✔ ${account.email.padEnd(30)} plano ${plan.name}`);
  console.log(`      ${limites}`);
  console.log(`      libera: ${featuresOf(account.planCode).join(', ') || '—'}`);
  console.log(`      demonstra: ${account.demonstrates}`);
}

export async function seedDemoUsers(): Promise<void> {
  const password = resolvePassword();
  const passwordHash = await bcrypt.hash(password, 10);

  for (const account of DEMO_ACCOUNTS) {
    await upsertDemoAccount(account, passwordHash);
  }

  console.log('');
  console.log('  Senha de todas as contas de demonstração:');
  console.log(
    process.env.DEMO_USER_PASSWORD
      ? '    (a definida em DEMO_USER_PASSWORD)'
      : `    ${DEV_DEFAULT_PASSWORD}   ← padrão de desenvolvimento`
  );
}

if (require.main === module) {
  console.log('🌱 Criando usuários de demonstração (um por plano)...');
  seedDemoUsers()
    .then(() => console.log('\n✅ Contas de demonstração prontas.'))
    .catch((err) => {
      console.error('❌ Falha ao criar contas de demonstração:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
