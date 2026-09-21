import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

// Valida req.body contra um schema Zod antes de chegar na rota — rejeita com 400
// payloads inválidos ou malformados sem tocar no banco.
export const validateBody = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: 'Payload inválido.',
        details: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    req.body = result.data;
    next();
  };
};
