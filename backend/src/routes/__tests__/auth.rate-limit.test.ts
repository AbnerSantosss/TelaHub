import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server';

describe('rate limit em /api/auth/login', () => {
  it('bloqueia com 429 após exceder o limite de tentativas', async () => {
    const credentials = { email: 'nao-existe@example.com', password: 'senha-errada' };

    let lastStatus = 0;
    for (let i = 0; i < 10; i++) {
      const res = await request(app).post('/api/auth/login').send(credentials);
      lastStatus = res.status;
    }
    expect(lastStatus).not.toBe(429);

    const blocked = await request(app).post('/api/auth/login').send(credentials);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/muitas tentativas/i);
  });
});
