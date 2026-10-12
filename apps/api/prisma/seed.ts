import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Executando seed do banco de dados...');

  // ── Admin de desenvolvimento ──
  // E-mail e senha vêm do `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), nunca do
  // código: o repositório é público. Até 2026-09-21 este arquivo trazia e-mails
  // reais e senhas fixas de três contas, e isso ficou publicado no GitHub.
  // Produção usa `seed-prod.js`, que segue a mesma regra.
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPlain = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPlain) {
    throw new Error('Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env antes de rodar o seed.');
  }
  const adminPassword = await bcrypt.hash(adminPlain, 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      email: adminEmail,
      password: adminPassword,
      role: 'master',
    },
    create: {
      username: 'admin',
      name: 'Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'master',
    },
  });

  console.log(`✅ Admin criado: ${admin.username} (role: ${admin.role})`);

  // Cria display de demonstração
  const demoDisplay = await prisma.display.upsert({
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

  console.log(`✅ Display demo criado: ${demoDisplay.name} (slug: ${demoDisplay.slug})`);
  console.log('');
  console.log('🎉 Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
