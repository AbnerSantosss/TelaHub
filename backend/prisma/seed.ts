import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Executando seed do banco de dados...');

  // ── Admin principal (Abner - Master) ──
  const masterEmail = 'binho_captiva@hotmail.com';
  const masterPassword = await bcrypt.hash('mudar@123', 10);

  const abner = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      name: 'Abner',
      email: masterEmail,
      password: masterPassword,
      role: 'master',
    },
    create: {
      username: 'admin',
      name: 'Abner',
      email: masterEmail,
      password: masterPassword,
      role: 'master',
    },
  });

  console.log(`✅ Admin Master criado: ${abner.username} (role: ${abner.role})`);

  // ── Usuário Jackson ──
  const jacksonPassword = await bcrypt.hash('Mudar123', 10);

  const jackson = await prisma.user.upsert({
    where: { username: 'jackson' },
    update: {
      name: 'Jackson',
      email: 'jacksonlogamebr@gmail.com',
      password: jacksonPassword,
      role: 'admin',
    },
    create: {
      username: 'jackson',
      name: 'Jackson',
      email: 'jacksonlogamebr@gmail.com',
      password: jacksonPassword,
      role: 'admin',
    },
  });

  console.log(`✅ Admin Jackson criado: ${jackson.username} (role: ${jackson.role})`);

  // ── Usuário Dev (Para testes rápidos) ──
  const devPassword = await bcrypt.hash('Mudar@123', 10);
  const devUser = await prisma.user.upsert({
    where: { username: 'admin-dev' },
    update: {
      email: 'admin@example.com',
      password: devPassword,
      role: 'admin',
    },
    create: {
      username: 'admin-dev',
      email: 'admin@example.com',
      password: devPassword,
      role: 'admin',
    },
  });

  console.log(`✅ Usuário Dev criado: ${devUser.username} (role: ${devUser.role})`);

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
