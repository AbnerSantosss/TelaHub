import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import prisma from '../../lib/prisma';
import authRoutes from '../auth.routes';

// Entrada sem senha dos botões "Entrar como plano X" (painel de teste, stack 117).
// O que importa provar: desligada ela não existe, e ligada só entra nas contas demo.
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const EMAIL = 'demo.loja@telahub.local';
let createdUserId: string | null = null;
let createdOrgId: string | null = null;

beforeAll(async () => {
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) return;
  const org = await prisma.organization.create({ data: { name: `Ótica Demo teste ${Date.now()}` } });
  createdOrgId = org.id;
  const user = await prisma.user.create({
    data: {
      username: `demo-loja-teste-${Date.now()}`,
      name: 'Bruno teste',
      email: EMAIL,
      password: await bcrypt.hash(randomBytes(16).toString('hex'), 4),
      role: 'admin',
      organizationId: org.id,
    },
  });
  createdUserId = user.id;
});

// O .env local pode ter DEMO_LOGIN=true. Cada teste parte de "ausente" (o caso
// desligado) e liga a variável por conta própria; o valor original volta no fim.
const originalDemoLogin = process.env.DEMO_LOGIN;

beforeEach(() => {
  delete process.env.DEMO_LOGIN;
});

afterEach(() => {
  delete process.env.DEMO_LOGIN;
});

afterAll(async () => {
  if (originalDemoLogin === undefined) delete process.env.DEMO_LOGIN;
  else process.env.DEMO_LOGIN = originalDemoLogin;

  if (createdUserId) await prisma.user.delete({ where: { id: createdUserId } });
  if (createdOrgId) await prisma.organization.delete({ where: { id: createdOrgId } });
});

describe('login de demonstração por plano', () => {
  it('desligado: lista vazia e rota 404', async () => {
    const list = await request(app).get('/api/auth/demo-accounts');
    expect(list.status).toBe(200);
    expect(list.body.accounts).toEqual([]);

    const res = await request(app).post('/api/auth/demo-login').send({ plan: 'loja' });
    expect(res.status).toBe(404);
    expect(res.body.token).toBeUndefined();
  });

  it('ligado: lista os planos sem expor e-mail', async () => {
    process.env.DEMO_LOGIN = 'true';
    const list = await request(app).get('/api/auth/demo-accounts');
    expect(list.body.accounts.map((a: { plan: string }) => a.plan)).toEqual([
      'gratis',
      'loja',
      'rede',
      'enterprise',
    ]);
    expect(JSON.stringify(list.body)).not.toContain('@');
  });

  it('ligado: recusa plano fora da lista', async () => {
    process.env.DEMO_LOGIN = 'true';
    const res = await request(app).post('/api/auth/demo-login').send({ plan: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
  });

  it('ligado: entra na conta demo do plano e devolve token', async () => {
    process.env.DEMO_LOGIN = 'true';
    const res = await request(app).post('/api/auth/demo-login').send({ plan: 'loja' });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe(EMAIL);
  });
});
