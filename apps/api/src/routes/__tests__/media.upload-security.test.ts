/**
 * Prova que o upload de mídia recusa arquivo perigoso.
 *
 * O furo original: o `fileFilter` olhava só o `Content-Type`, que é enviado pelo
 * cliente. Um `.html` declarado como `image/png` passava e era gravado em disco
 * preservando a extensão — servido por `express.static('/uploads')` na mesma
 * origem do painel, viraria XSS armazenado.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../../server';
import { authHeaderFor, createTestOrganization } from './tenant-helpers';

let authHeader: string;
let organizationId: string;

// PNG 1x1 real (assinatura de arquivo válida).
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8/x8AAwMB/6X0AA8AAAAASUVORK5CYII=',
  'base64'
);

beforeAll(async () => {
  const org = await createTestOrganization('Upload');
  organizationId = org.id;
  authHeader = authHeaderFor({ organizationId: org.id });
});

describe('POST /api/media/upload — whitelist de tipo', () => {
  it('recusa com 415 um .html disfarçado de image/png', async () => {
    const res = await request(app)
      .post('/api/media/upload')
      .set('Authorization', authHeader)
      .attach('file', Buffer.from('<script>alert(document.cookie)</script>'), {
        filename: 'evil.html',
        contentType: 'image/png', // MIME falsificado
      });

    expect(res.status).toBe(415);
    expect(res.body.error).toMatch(/não suportado/i);
  });

  it('recusa com 415 um SVG (pode carregar script)', async () => {
    const res = await request(app)
      .post('/api/media/upload')
      .set('Authorization', authHeader)
      .attach('file', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'), {
        filename: 'x.svg',
        contentType: 'image/svg+xml',
      });

    expect(res.status).toBe(415);
  });

  it('recusa com 415 um executável', async () => {
    const res = await request(app)
      .post('/api/media/upload')
      .set('Authorization', authHeader)
      .attach('file', Buffer.from('MZ'), {
        filename: 'payload.exe',
        contentType: 'application/octet-stream',
      });

    expect(res.status).toBe(415);
  });

  it('recusa com 415 extensão válida mas MIME proibido', async () => {
    const res = await request(app)
      .post('/api/media/upload')
      .set('Authorization', authHeader)
      .attach('file', Buffer.from('texto'), {
        filename: 'nota.png',
        contentType: 'text/html',
      });

    expect(res.status).toBe(415);
  });

  it('aceita um PNG legítimo e grava sob o prefixo da organização', async () => {
    const res = await request(app)
      .post('/api/media/upload')
      .set('Authorization', authHeader)
      .attach('file', PNG_1X1, { filename: 'oferta.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.key).toMatch(new RegExp(`^${organizationId}/`));
    expect(res.body.url).toContain(organizationId);

    // Limpa o artefato do teste (modo local grava em disco).
    const uploaded = path.resolve(__dirname, '../../../uploads', res.body.key);
    if (fs.existsSync(uploaded)) fs.unlinkSync(uploaded);
  });

  it('exige autenticação', async () => {
    const res = await request(app)
      .post('/api/media/upload')
      .attach('file', PNG_1X1, { filename: 'x.png', contentType: 'image/png' });

    expect(res.status).toBe(401);
  });
});
