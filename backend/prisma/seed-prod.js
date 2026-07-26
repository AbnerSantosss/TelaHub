// =============================================================
// SEED DE PRODUÇÃO — roda dentro do container (Node.js puro)
// Cria o usuário admin se não existir (seguro para re-execução)
// =============================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Executando seed de produção...');

  // ── Admin principal ──
  //
  // Credenciais vêm do ambiente (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), nunca do
  // código: este arquivo é versionado, e senha em repositório é senha pública —
  // vale para todo mundo que instalar o produto, não só para esta conta.
  //
  // A exigência das variáveis vale para CRIAR o admin, não para todo boot: numa
  // instalação que já tem admin não há o que criar, e travar o boot pedindo uma
  // senha para não usá-la deixaria a atualização refém de uma variável inútil.
  //
  // Quando não há admin e estamos em produção, aí sim a ausência é ERRO FATAL.
  // Cair de volta num default conhecido seria pior do que não subir: criaria
  // silenciosamente um `master` com senha previsível, e ninguém perceberia até
  // ser tarde.
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const isProduction = process.env.NODE_ENV === 'production';

  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
    select: { id: true, role: true },
  });

  if (existingAdmin && !adminPassword) {
    // Caminho normal de toda atualização de uma instalação já em uso.
    console.log('✅ Admin já existe — seed do admin pulado (nada a criar).');
  } else if (!adminEmail || !adminPassword) {
    const message =
      'Não existe usuário admin e ADMIN_EMAIL/ADMIN_PASSWORD não foram definidos. ' +
      'Defina-os nas variáveis da stack (Portainer) — ver SECRETS.md.';
    if (isProduction) throw new Error(message);
    console.warn(`⚠️  ${message} Seed do admin PULADO.`);
  }

  if (adminEmail && adminPassword) {
    if (adminPassword.length < 12) {
      throw new Error('ADMIN_PASSWORD deve ter pelo menos 12 caracteres.');
    }

    const password = await bcrypt.hash(adminPassword, 10);
    const adminName = process.env.ADMIN_NAME?.trim() || 'Administrador';

    // `update` intencionalmente NÃO reescreve a senha: o seed roda a cada
    // restart do container, e sobrescrever a senha aqui desfazia toda troca
    // feita pelo painel. Para redefinir de propósito, use ADMIN_PASSWORD_RESET.
    const resetPassword = process.env.ADMIN_PASSWORD_RESET === 'true';

    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        name: adminName,
        email: adminEmail,
        role: 'master',
        ...(resetPassword ? { password } : {}),
      },
      create: {
        username: 'admin',
        name: adminName,
        email: adminEmail,
        password: password,
        role: 'master',
      },
    });

    console.log(
      `✅ Admin: ${admin.username} (${admin.role})` +
        (resetPassword ? ' — senha redefinida por ADMIN_PASSWORD_RESET' : '')
    );
  }

  // ── Display de demonstração ──
  const demo = await prisma.display.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Display Demo',
      slug: 'demo',
      pages: JSON.stringify([
        {
          id: 'page-demo-1',
          name: 'Página 1',
          duration: 10,
          widgets: [
            {
              id: 'widget-welcome',
              type: 'text',
              x: 50,
              y: 200,
              width: 900,
              height: 200,
              content: 'Bem-vindo ao TelaHub!',
              style: {
                fontSize: 48,
                fontWeight: 'bold',
                color: '#FFFFFF',
                textAlign: 'center',
                backgroundColor: 'rgba(0,0,0,0)',
              },
            },
          ],
          background: '#1a1a2e',
        },
      ]),
    },
  });

  console.log(`✅ Display demo: ${demo.name} (slug: ${demo.slug})`);

  // ── Escopo de tenant dos registros semeados ──
  // Desde a introdução do isolamento multi-tenant, um usuário sem
  // `organizationId` recebe 403 em qualquer operação — só o `master` opera sem
  // organização, e por isso o admin acima permanece sem vínculo de propósito.
  let defaultOrg = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!defaultOrg) {
    defaultOrg = await prisma.organization.create({ data: { name: 'Loja Padrão' } });
    console.log(`✅ Organização padrão criada: ${defaultOrg.name}`);
  }

  if (!demo.organizationId) {
    await prisma.display.update({
      where: { id: demo.id },
      data: { organizationId: defaultOrg.id },
    });
    console.log(`✅ Display demo vinculado à organização ${defaultOrg.name}`);
  }

  // ── Assinatura das organizações que já existiam (grandfathering) ──
  // Contas anteriores à cobrança não podem ser bloqueadas por `402` de uma hora
  // para outra. Cada organização sem assinatura recebe uma assinatura `active`
  // no plano `loja`, marcada como `manual` — ou seja: liberada e sem gateway,
  // até que uma cobrança real seja negociada. Novas contas, essas sim, entram
  // pelo plano `gratis` via `POST /api/signup`.
  const paidPlan = await prisma.plan.findUnique({ where: { code: 'loja' } });
  if (!paidPlan) {
    console.warn(
      '⚠️  Plano "loja" não encontrado — rode `prisma/seed-plans.ts` antes deste seed. ' +
      'Nenhuma assinatura foi criada; organizações existentes ficariam bloqueadas por 402.'
    );
  } else {
    const orgsWithoutSubscription = await prisma.organization.findMany({
      where: { subscription: null },
      select: { id: true, name: true },
    });

    for (const org of orgsWithoutSubscription) {
      await prisma.subscription.create({
        data: {
          organizationId: org.id,
          planId: paidPlan.id,
          status: 'active',
          gateway: 'manual',
        },
      });
      console.log(`✅ Assinatura herdada (active/manual, plano ${paidPlan.code}): ${org.name}`);
    }

    if (orgsWithoutSubscription.length === 0) {
      console.log('ℹ️  Todas as organizações já possuem assinatura.');
    }
  }

  console.log('🎉 Seed finalizado!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
