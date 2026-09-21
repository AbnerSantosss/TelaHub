import { Router } from 'express';

/**
 * ─── TVS DE TODAS AS CONTAS (ADM-11) ────────────────────────────────────────
 *
 * Guarda de `master` aplicada na raiz (`admin/index.ts`) — não repetir aqui.
 *
 * - `adminDevicesRouter`    → `/api/admin/devices` (`/:id/reload`, `/:id/unpair`);
 * - `adminOrgDevicesRouter` → `/api/admin/organizations/:orgId/devices`
 *   (`mergeParams`: lê `req.params.orgId`).
 *
 * Contrato: Planejamento/Plano-Correcoes-2026-09-18.md §3.4 (backoffice).
 * Dono da implementação: agente A1b.
 */
export const adminDevicesRouter = Router();
export const adminOrgDevicesRouter = Router({ mergeParams: true });
