import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../server';
import { authHeaderFor, createTestOrganization, masterAuthHeader } from './tenant-helpers';

// Criar organização passou a ser ato de plataforma: só o `master`.
const masterHeader = masterAuthHeader();

let tenantHeader: string;
let tenantOrgId: string;

beforeAll(async () => {
  const org = await createTestOrganization('Orgs');
  tenantOrgId = org.id;
  tenantHeader = authHeaderFor({ organizationId: org.id });
});

describe('GET /api/organizations', () => {
  it('rejeita sem autenticação com 401', async () => {
    const res = await request(app).get('/api/organizations');
    expect(res.status).toBe(401);
  });

  it('lista todas as organizações para o master', async () => {
    const res = await request(app).get('/api/organizations').set('Authorization', masterHeader);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('retorna exatamente a própria organização para um usuário comum', async () => {
    const res = await request(app).get('/api/organizations').set('Authorization', tenantHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(tenantOrgId);
  });
});

describe('POST /api/organizations', () => {
  it('rejeita payload sem nome com 400', async () => {
    const res = await request(app).post('/api/organizations').set('Authorization', masterHeader).send({});
    expect(res.status).toBe(400);
  });

  it('rejeita com 403 um admin de cliente (criar tenant é só do master)', async () => {
    const res = await request(app)
      .post('/api/organizations')
      .set('Authorization', tenantHeader)
      .send({ name: `Loja Proibida ${Date.now()}` });

    expect(res.status).toBe(403);
  });

  it('cria uma organização nova (master)', async () => {
    const res = await request(app)
      .post('/api/organizations')
      .set('Authorization', masterHeader)
      .send({ name: `Loja Teste ${Date.now()}` });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('name');
  });
});

describe('GET /api/organizations/:id/report', () => {
  it('retorna relatório agregado para uma organização existente', async () => {
    const createRes = await request(app)
      .post('/api/organizations')
      .set('Authorization', masterHeader)
      .send({ name: `Loja Relatorio ${Date.now()}` });

    const res = await request(app)
      .get(`/api/organizations/${createRes.body.id}/report`)
      .set('Authorization', masterHeader);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      organizationId: createRes.body.id,
      displaysCount: 0,
      devicesOnline: 0,
      devicesOffline: 0,
      broadcastsCount: 0,
    });
  });

  it('retorna 404 no relatório de uma organização de outro tenant', async () => {
    const other = await createTestOrganization('Orgs Alheia');

    const res = await request(app)
      .get(`/api/organizations/${other.id}/report`)
      .set('Authorization', tenantHeader);

    expect(res.status).toBe(404);
  });
});
