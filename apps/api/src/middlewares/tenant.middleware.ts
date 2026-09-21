import { Request, Response, NextFunction } from 'express';

/**
 * Escopo de tenant efetivo da requisição.
 *
 * - `string` → todas as leituras/escritas devem ser filtradas por esse
 *   `organizationId`.
 * - `null`   → "todas as organizações". Só acontece para o role `master`
 *   (proprietário da plataforma) quando ele não escolhe um tenant específico.
 */
declare global {
  namespace Express {
    interface Request {
      tenantId?: string | null;
    }
  }
}

export const ORGANIZATION_HEADER = 'x-organization-id';

/**
 * Resolve `req.tenantId` a partir do usuário autenticado.
 *
 * Deve ser encadeado SEMPRE depois de `authMiddleware`.
 */
export const requireTenant = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Token de autenticação não fornecido.' });
    return;
  }

  if (req.user.role === 'master') {
    // O master pode operar sobre qualquer organização. Escolhe o escopo via
    // header `X-Organization-Id` ou query `?organizationId=`. Sem isso, o
    // escopo é "todas" (null) — usado apenas em leituras de plataforma.
    const headerValue = req.headers[ORGANIZATION_HEADER];
    const headerOrg = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const queryOrg = typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;

    const chosen = (headerOrg || queryOrg || '').trim();
    req.tenantId = chosen.length > 0 ? chosen : null;
    next();
    return;
  }

  if (!req.user.organizationId) {
    // Usuário órfão (sem organização) não pode operar — evita que ele caia em
    // um escopo "todas" por acidente.
    res.status(403).json({
      error: 'Usuário não vinculado a nenhuma organização. Contate o administrador.',
    });
    return;
  }

  req.tenantId = req.user.organizationId;
  next();
};

/**
 * Compara o `organizationId` de uma entidade com o escopo da requisição.
 *
 * Regras:
 * - escopo `null` (master sem tenant escolhido) → libera qualquer entidade;
 * - escopo definido → só libera entidade com exatamente o mesmo tenant.
 *
 * Entidade com `organizationId` nulo (dado legado, pré multi-tenant) é
 * considerada FORA de qualquer tenant: só o master a alcança. Rode
 * `npm run db:backfill-tenant` para atribuir esses registros à organização
 * padrão.
 */
export function isSameTenant(
  entityOrgId: string | null | undefined,
  tenantId: string | null | undefined
): boolean {
  if (tenantId === null || tenantId === undefined) return true;
  return !!entityOrgId && entityOrgId === tenantId;
}

/**
 * Versão da checagem acoplada à requisição. Retorna `true` quando o recurso
 * pertence ao escopo da requisição e `false` quando NÃO pertence — nesse caso a
 * rota deve responder **404** (e não 403), para não vazar a existência de um
 * recurso de outro tenant.
 */
export function assertSameTenant(entityOrgId: string | null | undefined, req: Request): boolean {
  return isSameTenant(entityOrgId, req.tenantId ?? null);
}

/** Erro de escopo. Rotas devem traduzi-lo para 404. */
export class TenantScopeError extends Error {
  readonly statusCode = 404;
  constructor(message = 'Recurso não encontrado.') {
    super(message);
    this.name = 'TenantScopeError';
  }
}
