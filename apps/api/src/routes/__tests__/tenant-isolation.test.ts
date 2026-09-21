/**
 * Testes de isolamento multi-tenant.
 *
 * Provam que o vazamento está fechado NO SERVIDOR: um usuário do tenant A não
 * enumera, lê, altera nem apaga nada do tenant B — e recebe 404 (não 403) para
 * não descobrir que o recurso existe.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import app from '../../server';
import prisma from '../../lib/prisma';
import { authHeaderFor, createTestOrganization } from './tenant-helpers';

let orgA: { id: string };
let orgB: { id: string };
let headerA: string;
let headerB: string;

let displayA: { id: string; slug: string };
let displayB: { id: string; slug: string };

async function createDisplay(authHeader: string, name: string) {
  const res = await request(app)
    .post('/api/displays')
    .set('Authorization', authHeader)
    .send({ name, slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crypto.randomUUID().slice(0, 8)}`, pages: [] });

  expect(res.status).toBe(200);
  return res.body as { id: string; slug: string };
}

async function linkDevice(authHeader: string, displayId: string) {
  const deviceId = `dev-${crypto.randomUUID()}`;
  const code = crypto.randomUUID().slice(0, 6).toUpperCase();

  const register = await request(app).post('/api/devices/register').send({ deviceId, code });
  expect(register.status).toBe(200);

  const link = await request(app)
    .post('/api/devices/link')
    .set('Authorization', authHeader)
    .send({ code, displayId, name: 'TV de teste' });
  expect(link.status).toBe(200);

  return deviceId;
}

async function createBroadcast(authHeader: string, displayIds: string[]) {
  const res = await request(app)
    .post('/api/broadcasts')
    .set('Authorization', authHeader)
    .send({ name: `Broadcast ${crypto.randomUUID().slice(0, 6)}`, page: {}, display_ids: displayIds });

  expect(res.status).toBe(200);
  return res.body as { id: string };
}

beforeAll(async () => {
  orgA = await createTestOrganization('Tenant A');
  orgB = await createTestOrganization('Tenant B');
  headerA = authHeaderFor({ organizationId: orgA.id, id: 'user-a', email: 'a@example.com' });
  headerB = authHeaderFor({ organizationId: orgB.id, id: 'user-b', email: 'b@example.com' });

  displayA = await createDisplay(headerA, 'Display A');
  displayB = await createDisplay(headerB, 'Display B');
});

describe('isolamento de displays', () => {
  it('GET /api/displays não retorna nada do outro tenant', async () => {
    const res = await request(app).get('/api/displays').set('Authorization', headerA);

    expect(res.status).toBe(200);
    const ids = res.body.map((d: any) => d.id);
    expect(ids).toContain(displayA.id);
    expect(ids).not.toContain(displayB.id);
    expect(res.body.every((d: any) => d.organizationId === orgA.id)).toBe(true);
  });

  it('GET /api/displays/:id de outro tenant responde 404', async () => {
    const res = await request(app).get(`/api/displays/${displayB.id}`).set('Authorization', headerA);
    expect(res.status).toBe(404);
  });

  it('DELETE /api/displays/:id de outro tenant responde 404 e não apaga nada', async () => {
    const res = await request(app).delete(`/api/displays/${displayB.id}`).set('Authorization', headerA);
    expect(res.status).toBe(404);

    const stillThere = await prisma.display.findUnique({ where: { id: displayB.id } });
    expect(stillThere).not.toBeNull();
  });

  it('POST /api/displays ignora organizationId do corpo e cria no tenant do token', async () => {
    const res = await request(app)
      .post('/api/displays')
      .set('Authorization', headerA)
      .send({
        name: 'Tentativa de injeção',
        slug: `injecao-${crypto.randomUUID().slice(0, 8)}`,
        pages: [],
        organizationId: orgB.id, // deve ser ignorado
      });

    expect(res.status).toBe(200);
    expect(res.body.organizationId).toBe(orgA.id);

    const persisted = await prisma.display.findUnique({ where: { id: res.body.id } });
    expect(persisted?.organizationId).toBe(orgA.id);
  });

  it('POST /api/displays não sobrescreve display de outro tenant (404)', async () => {
    const res = await request(app)
      .post('/api/displays')
      .set('Authorization', headerA)
      .send({ id: displayB.id, name: 'Sequestro', slug: displayB.slug, pages: [] });

    expect(res.status).toBe(404);

    const untouched = await prisma.display.findUnique({ where: { id: displayB.id } });
    expect(untouched?.organizationId).toBe(orgB.id);
    expect(untouched?.name).toBe('Display B');
  });
});

describe('isolamento de devices', () => {
  let deviceB: string;

  beforeAll(async () => {
    deviceB = await linkDevice(headerB, displayB.id);
  });

  it('grava organizationId e activatedAt ao vincular', async () => {
    const device = await prisma.device.findUnique({ where: { id: deviceB } });
    expect(device?.organizationId).toBe(orgB.id);
    expect(device?.status).toBe('linked');
    expect(device?.activatedAt).toBeInstanceOf(Date);
  });

  it('GET /api/devices não retorna devices do outro tenant', async () => {
    const res = await request(app).get('/api/devices').set('Authorization', headerA);
    expect(res.status).toBe(200);
    expect(res.body.map((d: any) => d.id)).not.toContain(deviceB);
  });

  it('DELETE /api/devices/:id de outro tenant responde 404 e não apaga', async () => {
    const res = await request(app).delete(`/api/devices/${deviceB}`).set('Authorization', headerA);
    expect(res.status).toBe(404);
    expect(await prisma.device.findUnique({ where: { id: deviceB } })).not.toBeNull();
  });

  it('PATCH /api/devices/:id/display de outro tenant responde 404', async () => {
    const res = await request(app)
      .patch(`/api/devices/${deviceB}/display`)
      .set('Authorization', headerA)
      .send({ displayId: displayA.id });

    expect(res.status).toBe(404);
  });

  it('POST /api/devices/link recusa (404) um display de outro tenant', async () => {
    const deviceId = `dev-${crypto.randomUUID()}`;
    const code = crypto.randomUUID().slice(0, 6).toUpperCase();
    await request(app).post('/api/devices/register').send({ deviceId, code });

    const res = await request(app)
      .post('/api/devices/link')
      .set('Authorization', headerA)
      .send({ code, displayId: displayB.id, name: 'Roubo de tela' });

    expect(res.status).toBe(404);

    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    expect(device?.status).toBe('pending');
    expect(device?.organizationId).toBeNull();
  });
});

describe('isolamento de broadcasts', () => {
  let broadcastB: { id: string };

  beforeAll(async () => {
    broadcastB = await createBroadcast(headerB, [displayB.id]);
  });

  it('POST /api/broadcasts grava o organizationId do tenant', async () => {
    const persisted = await prisma.broadcast.findUnique({ where: { id: broadcastB.id } });
    expect(persisted?.organizationId).toBe(orgB.id);
  });

  it('GET /api/broadcasts não retorna broadcasts do outro tenant', async () => {
    const res = await request(app).get('/api/broadcasts').set('Authorization', headerA);
    expect(res.status).toBe(200);
    expect(res.body.map((b: any) => b.id)).not.toContain(broadcastB.id);
  });

  it('DELETE /api/broadcasts/:id de outro tenant responde 404 e não apaga', async () => {
    const res = await request(app).delete(`/api/broadcasts/${broadcastB.id}`).set('Authorization', headerA);
    expect(res.status).toBe(404);
    expect(await prisma.broadcast.findUnique({ where: { id: broadcastB.id } })).not.toBeNull();
  });

  it('POST /api/broadcasts rejeita com 400 displayIds de outro tenant', async () => {
    const res = await request(app)
      .post('/api/broadcasts')
      .set('Authorization', headerA)
      .send({ name: 'Broadcast invasor', page: {}, display_ids: [displayA.id, displayB.id] });

    expect(res.status).toBe(400);
  });
});

describe('isolamento de organizações', () => {
  it('GET /api/organizations retorna exatamente 1 item para um usuário comum', async () => {
    const res = await request(app).get('/api/organizations').set('Authorization', headerA);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(orgA.id);
  });
});

describe('isolamento de usuários', () => {
  it('GET /api/users só lista usuários do próprio tenant', async () => {
    const userB = await prisma.user.create({
      data: {
        username: `user-b-${crypto.randomUUID().slice(0, 8)}`,
        email: `user-b-${crypto.randomUUID().slice(0, 8)}@example.com`,
        password: 'hash-irrelevante',
        role: 'user',
        organizationId: orgB.id,
      },
    });

    const res = await request(app).get('/api/users').set('Authorization', headerA);
    expect(res.status).toBe(200);
    expect(res.body.map((u: any) => u.id)).not.toContain(userB.id);
    expect(res.body.every((u: any) => u.organizationId === orgA.id)).toBe(true);
  });

  it('DELETE /api/users/:id de outro tenant responde 404 e não apaga', async () => {
    const userB = await prisma.user.create({
      data: {
        username: `victim-${crypto.randomUUID().slice(0, 8)}`,
        email: `victim-${crypto.randomUUID().slice(0, 8)}@example.com`,
        password: 'hash-irrelevante',
        role: 'user',
        organizationId: orgB.id,
      },
    });

    const res = await request(app).delete(`/api/users/${userB.id}`).set('Authorization', headerA);
    expect(res.status).toBe(404);
    expect(await prisma.user.findUnique({ where: { id: userB.id } })).not.toBeNull();
  });

  it('nunca permite deletar um master (403)', async () => {
    const master = await prisma.user.create({
      data: {
        username: `master-${crypto.randomUUID().slice(0, 8)}`,
        email: `master-${crypto.randomUUID().slice(0, 8)}@example.com`,
        password: 'hash-irrelevante',
        role: 'master',
        organizationId: orgA.id,
      },
    });

    const res = await request(app).delete(`/api/users/${master.id}`).set('Authorization', headerA);
    expect(res.status).toBe(403);
    expect(await prisma.user.findUnique({ where: { id: master.id } })).not.toBeNull();
  });
});

describe('rotas públicas do Player continuam abertas', () => {
  it('GET /api/displays/slug/:slug segue sem autenticação', async () => {
    const res = await request(app).get(`/api/displays/slug/${displayA.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(displayA.id);
  });

  it('GET /api/displays/slug/:slug/version segue sem autenticação', async () => {
    const res = await request(app).get(`/api/displays/slug/${displayA.slug}/version`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('updatedAt');
  });

  it('GET /api/displays/player/:id segue sem autenticação', async () => {
    const res = await request(app).get(`/api/displays/player/${displayA.id}`);
    expect(res.status).toBe(200);
  });

  it('POST /api/devices/register e PATCH /:id/heartbeat seguem sem autenticação', async () => {
    const deviceId = `dev-${crypto.randomUUID()}`;
    const register = await request(app)
      .post('/api/devices/register')
      .send({ deviceId, code: crypto.randomUUID().slice(0, 6).toUpperCase() });
    expect(register.status).toBe(200);

    const status = await request(app).get(`/api/devices/${deviceId}/status`);
    expect(status.status).toBe(200);

    const heartbeat = await request(app).patch(`/api/devices/${deviceId}/heartbeat`);
    expect(heartbeat.status).toBe(200);
  });
});
