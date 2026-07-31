import { Router, Request, Response } from 'express';

import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { requireFeature } from '../middlewares/feature.middleware';
import { auditService } from '../services/audit.service';

const router = Router();

/**
 * GET /api/audit-logs — trilha de auditoria do tenant.
 *
 * Esta rota nasceu em 2026-07-31 para fechar uma lacuna comercial, não por
 * pedido de funcionalidade: "trilha de auditoria de alterações" era vendida
 * como recurso do plano Loja na página de preços, o serviço GRAVAVA as
 * entradas desde sempre — e não existia nenhuma rota que as lesse. Ou seja, a
 * feature era cobrada e inalcançável para qualquer cliente. Recurso anunciado
 * e inexistente é exposição aos arts. 30 e 37 do CDC, então o caminho era
 * entregar ou parar de anunciar.
 *
 * `adminMiddleware` porque a trilha expõe o e-mail de quem fez cada alteração:
 * é dado de gestão, não de operação do dia a dia.
 */
router.get(
  '/',
  authMiddleware,
  requireTenant,
  adminMiddleware,
  requireFeature('auditoria'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Sem tenant não há trilha a mostrar. O `master` não tem organização
      // própria — ele opera acima dos tenants e não tem trilha "sua".
      if (!req.tenantId) {
        res.json({ entries: [], hasMore: false });
        return;
      }

      const rawLimit = Number.parseInt(String(req.query.limit ?? ''), 10);
      const limit = Number.isFinite(rawLimit) ? rawLimit : 50;

      const rawBefore = typeof req.query.before === 'string' ? new Date(req.query.before) : null;
      const before = rawBefore && !Number.isNaN(rawBefore.getTime()) ? rawBefore : undefined;

      // Pede um a mais que o pedido para saber se há próxima página sem um
      // count() adicional.
      const entries = await auditService.listByOrganization(req.tenantId, {
        limit: limit + 1,
        before,
      });

      const hasMore = entries.length > limit;

      res.json({ entries: hasMore ? entries.slice(0, limit) : entries, hasMore });
    } catch (error) {
      console.error('Erro ao listar trilha de auditoria:', error);
      res.status(500).json({ error: 'Erro ao listar a trilha de auditoria.' });
    }
  }
);

export default router;
