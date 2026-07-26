import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../server';
import { authHeaderFor, createTestOrganization } from './tenant-helpers';

let authHeader: string;

beforeAll(async () => {
  const org = await createTestOrganization('Health');
  authHeader = authHeaderFor({ organizationId: org.id });
});

describe('GET /api/devices/health', () => {
  it('rejeita sem autenticação com 401', async () => {
    const res = await request(app).get('/api/devices/health');
    expect(res.status).toBe(401);
  });

  it('rejeita com 403 um usuário sem organização (órfão)', async () => {
    const orphanHeader = authHeaderFor({ organizationId: null, role: 'admin' });
    const res = await request(app).get('/api/devices/health').set('Authorization', orphanHeader);
    expect(res.status).toBe(403);
  });

  it('retorna contagem agregada de devices online/offline', async () => {
    const res = await request(app).get('/api/devices/health').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('online');
    expect(res.body).toHaveProperty('offline');
    expect(res.body.total).toBe(res.body.online + res.body.offline);
  });
});
