import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Executando seed do banco de dados...');

  // ── Admin principal ──
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminRawPassword = process.env.ADMIN_PASSWORD || 'Mudar@123';
  const abnerPassword = await bcrypt.hash(adminRawPassword, 10);

  const abner = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      email: adminEmail,
      password: abnerPassword,
    },
    create: {
      username: 'admin',
      email: adminEmail,
      password: abnerPassword,
      role: 'admin',
    },
  });

  console.log(`✅ Admin criado: ${abner.username} (role: ${abner.role})`);

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
