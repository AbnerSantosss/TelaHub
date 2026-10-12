import { Router } from 'express';

/**
 * ─── BUSCA GLOBAL DO BACKOFFICE (ADM-20) ────────────────────────────────────
 *
 * Guarda de `master` aplicada na raiz (`admin/index.ts`) — não repetir aqui.
 *
 * `GET /api/admin/search?q=` → `{ organizations, users, payments, sessions }`.
 * Contrato: Planejamento/Plano-Correcoes-2026-09-18.md §3.4 (backoffice).
 * Dono da implementação: agente A5.
 */
const router = Router();

export default router;
