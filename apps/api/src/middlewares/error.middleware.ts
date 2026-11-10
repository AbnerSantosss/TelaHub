import { Request, Response, NextFunction } from 'express';

/** Status HTTP que o próprio erro carrega (body-parser, http-errors, multer). */
function clientStatusOf(err: unknown): number | null {
  const candidate = (err as { status?: unknown; statusCode?: unknown }) ?? {};
  const status = Number(candidate.status ?? candidate.statusCode);
  return Number.isInteger(status) && status >= 400 && status < 500 ? status : null;
}

const CLIENT_ERROR_MESSAGES: Record<string, string> = {
  'entity.parse.failed': 'O corpo da requisição não é um JSON válido.',
  'entity.too.large': 'O corpo da requisição é grande demais.',
  'encoding.unsupported': 'Codificação do corpo não suportada.',
  'charset.unsupported': 'Conjunto de caracteres do corpo não suportado.',
  'request.aborted': 'A requisição foi interrompida antes de terminar.',
};

/**
 * Último middleware da API.
 *
 * ARMADILHA (corrigida em 2026-11-10): este middleware só olhava o TEXTO da
 * mensagem, então todo erro que o Express já classifica como culpa do cliente
 * (JSON malformado, corpo acima do limite) saía como 500 "Erro interno". Isso
 * sujava o monitoramento com falso erro de servidor e fazia o cliente repetir
 * uma requisição que nunca ia passar. Erro com `status` 4xx é devolvido com o
 * status dele e uma mensagem fixa — nunca a mensagem crua, que pode citar
 * trecho do corpo recebido.
 */
export const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  // Resposta já começou (ex.: stream, SSE): só o Express pode encerrar.
  if (res.headersSent) {
    next(err);
    return;
  }

  const clientStatus = clientStatusOf(err);
  if (clientStatus) {
    const type = (err as { type?: string }).type ?? '';
    console.warn(`[${clientStatus}] ${req.method} ${req.path}: ${type || err.message}`);
    res.status(clientStatus).json({
      error: CLIENT_ERROR_MESSAGES[type] ?? 'Requisição inválida.',
    });
    return;
  }

  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.message.includes('not found') || err.message.includes('não encontrado')) {
    res.status(404).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Erro interno do servidor.' });
};
