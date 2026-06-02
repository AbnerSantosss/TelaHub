// =============================================================
// SEED DE PRODUÇÃO — roda dentro do container (Node.js puro)
// Cria o usuário admin se não existir (seguro para re-execução)
//
// Variáveis de ambiente obrigatórias:
//   ADMIN_EMAIL    — e-mail do admin principal
//   ADMIN_PASSWORD — senha do admin principal
// =============================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Executando seed de produção...');

  // ── Admin principal ──
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminRawPassword = process.env.ADMIN_PASSWORD || 'Mudar@123';
  const password = await bcrypt.hash(adminRawPassword, 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      email: adminEmail,
      password: password,
      role: 'master',
    },
    create: {
      username: 'admin',
      email: adminEmail,
      password: password,
      role: 'master',
    },
  });

  console.log(`✅ Admin: ${admin.username} (${admin.role})`);

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
