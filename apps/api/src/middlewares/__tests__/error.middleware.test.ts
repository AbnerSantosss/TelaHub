import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errorMiddleware } from '../error.middleware';

function fakeRes(headersSent = false) {
  const res: any = { headersSent };
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

const req = { method: 'POST', path: '/api/x' } as any;

describe('errorMiddleware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('JSON malformado sai como 400, não 500', () => {
    const err = Object.assign(new SyntaxError('Unexpected token } in JSON at position 12'), {
      status: 400,
      type: 'entity.parse.failed',
    });
    const res = fakeRes();

    errorMiddleware(err, req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    // Mensagem fixa: a original cita trecho do corpo recebido.
    expect(res.json).toHaveBeenCalledWith({ error: 'O corpo da requisição não é um JSON válido.' });
  });

  it('corpo acima do limite sai como 413', () => {
    const err = Object.assign(new Error('request entity too large'), {
      statusCode: 413,
      type: 'entity.too.large',
    });
    const res = fakeRes();

    errorMiddleware(err, req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(413);
  });

  it('erro sem status continua 500 genérico, sem vazar a mensagem', () => {
    const res = fakeRes();

    errorMiddleware(new Error('connect ECONNREFUSED 10.0.0.5:5432'), req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno do servidor.' });
  });

  it('status 5xx carregado pelo erro não é repassado como está', () => {
    const res = fakeRes();

    errorMiddleware(Object.assign(new Error('falha interna x'), { status: 503 }), req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('mantém o 404 por mensagem', () => {
    const res = fakeRes();

    errorMiddleware(new Error('Display não encontrado'), req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('com a resposta já iniciada, delega ao Express', () => {
    const res = fakeRes(true);
    const next = vi.fn();
    const err = new Error('quebrou no meio do stream');

    errorMiddleware(err, req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});
