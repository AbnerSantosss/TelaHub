import { Request, Response, NextFunction } from 'express';

export const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.message.includes('not found') || err.message.includes('não encontrado')) {
    res.status(404).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Erro interno do servidor.' });
};
