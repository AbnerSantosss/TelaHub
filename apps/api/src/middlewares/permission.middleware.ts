import { NextFunction, Request, RequestHandler, Response } from 'express';

import {
  ALWAYS_ENFORCED,
  Permission,
  isPermission,
  permissionsFor,
  rbacMode,
} from '../lib/permissions';

/**
 * Guarda de permissão por rota (2026-09-18). Ver `lib/permissions.ts`.
 *
 * Uso — SEMPRE depois de `authMiddleware` e `requireTenant`:
 *
 *   router.post('/cancel', requirePermission('billing:write'), handler)
 *
 * A função devolvida carrega a permissão em `PERMISSION_META`. É isso que o
 * teste `rbac-matrix` lê ao percorrer os routers: rota sem `requirePermission`
 * e sem `publicRoute(...)` faz o teste falhar. A guarda nova, portanto, não
 * depende de alguém lembrar de escrevê-la — depende de alguém conseguir fazer o
 * teste passar sem ela.
 */

export const PERMISSION_META = Symbol.for('telahub.rbac.permission');
export const PUBLIC_META = Symbol.for('telahub.rbac.public');

type Marked = RequestHandler & {
  [PERMISSION_META]?: Permission;
  [PUBLIC_META]?: string;
};

export const PERMISSION_DENIED_MESSAGE =
  'Você não tem permissão para isso. Fale com o administrador da conta.';

export function requirePermission(permission: Permission): RequestHandler {
  if (!isPermission(permission)) {
    // Erro de programação: falha no boot, não na primeira requisição.
    throw new Error(`requirePermission: permissão desconhecida "${String(permission)}"`);
  }

  const handler = ((req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Token de autenticação não fornecido.' });
      return;
    }

    const granted = permissionsFor({ role: req.user.role, isOwner: req.user.isOwner });
    if (granted.has(permission)) {
      next();
      return;
    }

    if (rbacMode() === 'log' && !ALWAYS_ENFORCED.has(permission)) {
      console.warn(
        `[rbac] (modo log) negaria ${permission} a usuário ${req.user.id} ` +
          `(papel ${req.user.role}) em ${req.method} ${req.originalUrl}`,
      );
      next();
      return;
    }

    res.status(403).json({
      error: PERMISSION_DENIED_MESSAGE,
      code: 'permission_denied',
      permission,
    });
  }) as Marked;

  handler[PERMISSION_META] = permission;
  Object.defineProperty(handler, 'name', { value: `requirePermission(${permission})` });
  return handler;
}

/**
 * Marca uma rota como PÚBLICA de propósito (sem login ou sem permissão de
 * papel: player da TV, webhook, cadastro, checkout). O motivo é obrigatório e
 * aparece na saída do teste — "público" precisa ser uma decisão escrita, não
 * um esquecimento.
 */
export function publicRoute(reason: string): RequestHandler {
  if (!reason || reason.trim().length < 5) {
    throw new Error('publicRoute: informe o motivo (ex.: "player da TV, sem login")');
  }
  const handler = ((_req: Request, _res: Response, next: NextFunction): void => {
    next();
  }) as Marked;
  handler[PUBLIC_META] = reason.trim();
  Object.defineProperty(handler, 'name', { value: 'publicRoute' });
  return handler;
}

/** Lê a marcação de um handler (para o teste de cobertura). */
export function routeGuardOf(
  handler: unknown,
): { permission?: Permission; publicReason?: string } {
  if (typeof handler !== 'function') return {};
  const marked = handler as Marked;
  return { permission: marked[PERMISSION_META], publicReason: marked[PUBLIC_META] };
}
