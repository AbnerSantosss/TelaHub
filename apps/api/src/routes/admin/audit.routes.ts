import { Router } from 'express';

/**
 * ─── AUDITORIA GLOBAL (ADM-13) ──────────────────────────────────────────────
 *
 * Guarda de `master` aplicada na raiz (`admin/index.ts`) — não repetir aqui.
 *
 * `GET /api/admin/audit` junta `AdminAuditLog` + `AuditLog` com filtros.
 * Contrato: Planejamento/Plano-Correcoes-2026-09-18.md §3.4 (backoffice).
 * Dono da implementação: agente A5.
 */
const router = Router();

export default router;
