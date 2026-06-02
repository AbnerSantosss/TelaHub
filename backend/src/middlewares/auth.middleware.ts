import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.service';

// Extends Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação não fornecido.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
    return;
  }
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'master')) {
    res.status(403).json({ error: 'Acesso restrito a administradores.' });
    return;
  }
  next();
};

export const masterMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'master') {
    res.status(403).json({ error: 'Acesso restrito ao proprietário do sistema.' });
    return;
  }
  next();
};
