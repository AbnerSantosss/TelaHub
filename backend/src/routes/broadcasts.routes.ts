import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireTenant, TenantScopeError } from '../middlewares/tenant.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { saveBroadcastSchema } from '../schemas/broadcasts.schema';
import { broadcastService } from '../services/broadcast.service';
import { displayService } from '../services/display.service';
import { sseService } from '../services/sse.service';
import { auditService } from '../services/audit.service';

const router = Router();

// GET /api/broadcasts — só os broadcasts do tenant
router.get('/', authMiddleware, requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const broadcasts = await broadcastService.getAll(req.tenantId);
    res.json(
      broadcasts.map((b) => ({
        id: b.id,
        name: b.name,
        page: b.page,
        start_time: b.startTime,
        end_time: b.endTime,
        is_permanent: b.isPermanent,
        display_ids: b.displayIds,
        active: b.active,
        created_at: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
        created_by: b.createdBy,
        orientation: b.page?.__orientation || undefined,
      }))
    );
  } catch (error: any) {
    console.error('Erro ao listar broadcasts:', error);
    res.status(500).json({ error: 'Erro ao listar broadcasts.' });
  }
});

// POST /api/broadcasts — organizationId forçado pelo tenant; displayIds validados
router.post('/', authMiddleware, requireTenant, validateBody(saveBroadcastSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id, name, page, start_time, end_time,
      is_permanent, display_ids, active, created_at, created_by, orientation,
    } = req.body;

    const displayIds: string[] = Array.isArray(display_ids) ? display_ids : [];

    // Um broadcast só pode apontar para displays do próprio tenant — se qualquer
    // id for de fora, rejeitamos o payload inteiro.
    const foreignIds = await displayService.findForeignDisplayIds(displayIds, req.tenantId);
    if (foreignIds.length > 0) {
      res.status(400).json({
        error: 'Um ou mais displays informados não pertencem à sua organização.',
      });
      return;
    }

    // Embed orientation inside page JSON (same strategy as Display)
    const pageWithOrientation = orientation
      ? { ...(page || {}), __orientation: orientation }
      : (page || {});

    const broadcast = await broadcastService.save(
      {
        id,
        name,
        page: pageWithOrientation,
        startTime: start_time || '',
        endTime: end_time || '',
        isPermanent: is_permanent || false,
        displayIds,
        active: active !== undefined ? active : true,
        createdAt: created_at,
        createdBy: created_by || null,
      },
      req.tenantId
    );

    void auditService.logFromRequest(req, {
      action: 'broadcast.create',
      entityType: 'broadcast',
      entityId: broadcast.id,
      metadata: { name: broadcast.name, displayIds },
    });

    // Notificar os displays vinculados a este broadcast via SSE
    displayIds.forEach((displayId: string) => {
      sseService.notifyDisplayUpdate(displayId).catch(err => {
        console.error('Erro ao notificar display via SSE após salvar broadcast:', err);
      });
    });

    res.json(broadcast);
  } catch (error: any) {
    if (error instanceof TenantScopeError) {
      res.status(404).json({ error: 'Broadcast não encontrado.' });
      return;
    }
    console.error('Erro ao salvar broadcast:', error);
    res.status(500).json({ error: 'Erro ao salvar broadcast.' });
  }
});

// DELETE /api/broadcasts/:id — 404 se for de outro tenant
router.delete('/:id', authMiddleware, requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    // Busca escopada antes de excluir: serve tanto para o 404 de outro tenant
    // quanto para saber quais displays notificar.
    const broadcast = await broadcastService.getByIdScoped(id, req.tenantId);

    if (!broadcast) {
      res.status(404).json({ error: 'Broadcast não encontrado.' });
      return;
    }

    await broadcastService.deleteScoped(id, req.tenantId);

    void auditService.logFromRequest(req, {
      action: 'broadcast.delete',
      entityType: 'broadcast',
      entityId: id,
      metadata: { name: broadcast.name },
    });

    // Notificar os displays vinculados via SSE
    if (Array.isArray(broadcast.displayIds)) {
      broadcast.displayIds.forEach((displayId: string) => {
        sseService.notifyDisplayUpdate(displayId).catch(err => {
          console.error('Erro ao notificar display via SSE após deletar broadcast:', err);
        });
      });
    }

    res.json({ message: 'Broadcast removido com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao deletar broadcast:', error);
    res.status(500).json({ error: 'Erro ao deletar broadcast.' });
  }
});

export default router;
