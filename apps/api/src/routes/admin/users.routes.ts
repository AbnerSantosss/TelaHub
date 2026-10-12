import { Router } from 'express';

/**
 * ─── USUÁRIOS DE TODAS AS CONTAS (ADM-10) ───────────────────────────────────
 *
 * Guarda de `master` aplicada na raiz (`admin/index.ts`) — não repetir aqui.
 *
 * Dois routers, porque as rotas vivem em dois prefixos:
 * - `adminUsersRouter`     → `/api/admin/users` (busca global por e-mail);
 * - `adminOrgUsersRouter`  → `/api/admin/organizations/:orgId/users`
 *   (`mergeParams`: lê `req.params.orgId`). Montado ANTES do router de
 *   organizações; o que não casar aqui cai nele normalmente.
 *
 * Contrato: Planejamento/Plano-Correcoes-2026-09-18.md §3.4 (backoffice).
 * Dono da implementação: agente A1.
 */
export const adminUsersRouter = Router();
export const adminOrgUsersRouter = Router({ mergeParams: true });
