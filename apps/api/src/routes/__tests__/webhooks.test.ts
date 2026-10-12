import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Rota de webhook sem banco: o serviço é dublê. O que se testa aqui é a porta —
// quem entra, quem não entra, e com qual status. A regra de negócio tem teste
// próprio em `services/__tests__/payment.webhook.test.ts`.

type Resultado = { status: 'processed' | 'ignored' | 'failed' | 'duplicate'; message: string };

const { handleAsaasWebhook } = vi.hoisted(() => ({
  handleAsaasWebhook: vi.fn<() => Promise<{ status: string; message: string }>>(async () => ({
    status: 'processed',
    message: 'ok',
  })),
}));

vi.mock('../../services/payment.service', () => ({
  paymentService: { handleAsaasWebhook },
}));

import webhooksRoutes from '../webhooks.routes';

const app = express();
app.use(express.json());
app.use('/api/webhooks', webhooksRoutes);

const TOKEN = 'token-de-webhook-combinado';
const CORPO = { id: 'evt_1', event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1' } };

beforeEach(() => {
  vi.clearAllMocks();
  handleAsaasWebhook.mockResolvedValue({ status: 'processed', message: 'ok' } as Resultado);
  process.env.ASAAS_WEBHOOK_TOKEN = TOKEN;
});

afterEach(() => {
  delete process.env.ASAAS_WEBHOOK_TOKEN;
});

describe('POST /api/webhooks/asaas', () => {
  it('aceita o webhook com o token correto', async () => {
    const res = await request(app)
      .post('/api/webhooks/asaas')
      .set('asaas-access-token', TOKEN)
      .send(CORPO);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(handleAsaasWebhook).toHaveBeenCalledTimes(1);
  });

  it('recusa token errado com 401 e NÃO processa nada', async () => {
    const res = await request(app)
      .post('/api/webhooks/asaas')
      .set('asaas-access-token', 'token-errado')
      .send(CORPO);

    expect(res.status).toBe(401);
    expect(handleAsaasWebhook).not.toHaveBeenCalled();
  });

  it('recusa requisição sem token', async () => {
    const res = await request(app).post('/api/webhooks/asaas').send(CORPO);
    expect(res.status).toBe(401);
    expect(handleAsaasWebhook).not.toHaveBeenCalled();
  });

  it('sem ASAAS_WEBHOOK_TOKEN configurado a rota fica FECHADA', async () => {
    // A alternativa — aceitar tudo quando não há token — transformaria um
    // esquecimento de configuração em porta aberta para confirmar pagamentos
    // que nunca aconteceram.
    delete process.env.ASAAS_WEBHOOK_TOKEN;

    const res = await request(app)
      .post('/api/webhooks/asaas')
      .set('asaas-access-token', TOKEN)
      .send(CORPO);

    expect(res.status).toBe(503);
    expect(handleAsaasWebhook).not.toHaveBeenCalled();
  });

  it('evento desconhecido responde 200 (senão o Asaas reenvia por dias)', async () => {
    handleAsaasWebhook.mockResolvedValue({ status: 'ignored', message: 'sem efeito' } as Resultado);

    const res = await request(app)
      .post('/api/webhooks/asaas')
      .set('asaas-access-token', TOKEN)
      .send({ id: 'evt_2', event: 'PAYMENT_UPDATED' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ignored');
  });

  it('reenvio de evento já processado responde 200 sem reprocessar', async () => {
    handleAsaasWebhook.mockResolvedValue({ status: 'duplicate', message: 'já processado' } as Resultado);

    const res = await request(app)
      .post('/api/webhooks/asaas')
      .set('asaas-access-token', TOKEN)
      .send(CORPO);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('duplicate');
  });

  it('falha de processamento ainda responde 200 — o reenvio é que retoma', async () => {
    handleAsaasWebhook.mockResolvedValue({ status: 'failed', message: 'banco fora' } as Resultado);

    const res = await request(app)
      .post('/api/webhooks/asaas')
      .set('asaas-access-token', TOKEN)
      .send(CORPO);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('failed');
  });

  it('500 só quando nem registrar o evento foi possível', async () => {
    handleAsaasWebhook.mockRejectedValue(new Error('banco inacessível'));

    const res = await request(app)
      .post('/api/webhooks/asaas')
      .set('asaas-access-token', TOKEN)
      .send(CORPO);

    expect(res.status).toBe(500);
  });
});
