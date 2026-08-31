import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

import prisma from '../../lib/prisma';
import leadsRoutes from '../leads.routes';

// O envio de e-mail é isolado: o teste valida que o lead é GRAVADO mesmo quando
// o SMTP falha — que é a razão de o aviso ser best-effort.
vi.mock('../../services/email.service', () => ({
  sendLeadNotificationEmail: vi.fn(),
}));

import { sendLeadNotificationEmail } from '../../services/email.service';

const app = express();
app.use(express.json());
app.use('/api/leads', leadsRoutes);

const SUFFIX = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const email = (prefixo: string) => `${prefixo}-${SUFFIX}@telahub.test`;

beforeEach(() => {
  vi.mocked(sendLeadNotificationEmail).mockReset();
  vi.mocked(sendLeadNotificationEmail).mockResolvedValue(undefined);
});

afterAll(async () => {
  await prisma.lead.deleteMany({ where: { email: { contains: SUFFIX } } });
});

describe('POST /api/leads', () => {
  it('grava o lead e avisa o comercial', async () => {
    const destinatario = email('ok');

    const res = await request(app).post('/api/leads').send({
      name: 'Maria do Shopping',
      email: destinatario,
      company: 'Shopping Central',
      phone: '11999998888',
      planCode: 'enterprise',
      utmSource: 'google',
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/recebemos seu contato/i);

    const salvo = await prisma.lead.findFirst({ where: { email: destinatario } });
    expect(salvo).toMatchObject({
      name: 'Maria do Shopping',
      company: 'Shopping Central',
      planCode: 'enterprise',
      utmSource: 'google',
      status: 'new',
    });
    expect(salvo?.notifiedAt).not.toBeNull();
    expect(sendLeadNotificationEmail).toHaveBeenCalledOnce();
  });

  // Este é o comportamento que substitui o `setTimeout` do site: antes, o lead
  // sumia. Agora, mesmo com o SMTP fora, ele fica no banco.
  it('mantém o lead salvo quando o e-mail falha', async () => {
    vi.mocked(sendLeadNotificationEmail).mockRejectedValue(new Error('SMTP fora do ar'));
    const destinatario = email('sem-smtp');

    const res = await request(app)
      .post('/api/leads')
      .send({ name: 'João Padaria', email: destinatario });

    expect(res.status).toBe(201);

    const salvo = await prisma.lead.findFirst({ where: { email: destinatario } });
    expect(salvo).not.toBeNull();
    // Sem aviso enviado, entra na lista de pendentes.
    expect(salvo?.notifiedAt).toBeNull();
  });

  it('não devolve o registro gravado', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ name: 'Ana Clinica', email: email('sem-eco') });

    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('id');
    expect(res.body).not.toHaveProperty('lead');
    expect(res.body).not.toHaveProperty('ipHash');
  });

  it('recusa payload inválido com 400', async () => {
    const semNome = await request(app).post('/api/leads').send({ email: email('sem-nome') });
    expect(semNome.status).toBe(400);

    const emailInvalido = await request(app)
      .post('/api/leads')
      .send({ name: 'Fulano Invalido', email: 'nao-e-email' });
    expect(emailInvalido.status).toBe(400);

    // Nada foi gravado por payload inválido — nem o que tinha e-mail válido mas
    // faltava nome, nem o de e-mail malformado.
    expect(await prisma.lead.count({ where: { email: email('sem-nome') } })).toBe(0);
    expect(await prisma.lead.count({ where: { name: 'Fulano Invalido' } })).toBe(0);
  });

  it('normaliza o e-mail para minúsculas', async () => {
    const destinatario = email('CaIxA');

    const res = await request(app)
      .post('/api/leads')
      .send({ name: 'Caixa Alta', email: destinatario.toUpperCase() });

    expect(res.status).toBe(201);
    const salvo = await prisma.lead.findFirst({
      where: { email: destinatario.toLowerCase() },
    });
    expect(salvo).not.toBeNull();
  });
});

describe('GET /api/leads/pendentes', () => {
  it('exige autenticação', async () => {
    const res = await request(app).get('/api/leads/pendentes');
    expect(res.status).toBe(401);
  });
});
