import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../server';
import { authHeaderFor, createTestOrganization } from './tenant-helpers';

// Todas as rotas de escrita agora exigem um tenant resolvido — o token precisa
// carregar um organizationId que exista de verdade no banco (FKs).
let authHeader: string;

beforeAll(async () => {
  const org = await createTestOrganization('Validacao');
  authHeader = authHeaderFor({ organizationId: org.id });
});

describe('validação de payload nas rotas de escrita', () => {
  it('rejeita POST /api/displays sem name/slug com 400', async () => {
    const res = await request(app)
      .post('/api/displays')
      .set('Authorization', authHeader)
      .send({ coverImage: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('aceita POST /api/displays com coverImage null (limpar capa) com 200', async () => {
    const res = await request(app)
      .post('/api/displays')
      .set('Authorization', authHeader)
      .send({ name: 'Display de teste', slug: `teste-${Date.now()}`, pages: [], coverImage: null });

    expect(res.status).toBe(200);
  });

  it('rejeita POST /api/devices/register sem deviceId/code com 400', async () => {
    const res = await request(app).post('/api/devices/register').send({});

    expect(res.status).toBe(400);
  });

  it('rejeita POST /api/devices/link sem code/displayId com 400', async () => {
    const res = await request(app)
      .post('/api/devices/link')
      .set('Authorization', authHeader)
      .send({ name: 'só o nome' });

    expect(res.status).toBe(400);
  });

  it('rejeita POST /api/broadcasts sem name com 400', async () => {
    const res = await request(app)
      .post('/api/broadcasts')
      .set('Authorization', authHeader)
      .send({ page: {} });

    expect(res.status).toBe(400);
  });

  it('rejeita POST /api/users/invite com e-mail inválido com 400', async () => {
    const res = await request(app)
      .post('/api/users/invite')
      .set('Authorization', authHeader)
      .send({ email: 'não-é-um-email' });

    expect(res.status).toBe(400);
  });

  it('rejeita POST /api/users/reset-password com senha curta com 400', async () => {
    const res = await request(app)
      .post('/api/users/reset-password')
      .send({ token: 'algum-token', password: '123' });

    expect(res.status).toBe(400);
  });
});
