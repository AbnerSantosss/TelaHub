import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { broadcastService } from '../services/broadcast.service';
import { sseService } from '../services/sse.service';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/broadcasts
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const broadcasts = await broadcastService.getAll();
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
      }))
    );
  } catch (error: any) {
    console.error('Erro ao listar broadcasts:', error);
    res.status(500).json({ error: 'Erro ao listar broadcasts.' });
  }
});

// POST /api/broadcasts
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id, name, page, start_time, end_time,
      is_permanent, display_ids, active, created_at, created_by,
    } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Nome é obrigatório.' });
      return;
    }

    const broadcast = await broadcastService.save({
      id,
      name,
      page: page || {},
      startTime: start_time || '',
      endTime: end_time || '',
      isPermanent: is_permanent || false,
      displayIds: display_ids || [],
      active: active !== undefined ? active : true,
      createdAt: created_at,
      createdBy: created_by || null,
    });

    // Notificar os displays vinculados a este broadcast via SSE
    if (broadcast.displayIds) {
      try {
        const displayIds = typeof broadcast.displayIds === 'string'
          ? JSON.parse(broadcast.displayIds)
          : broadcast.displayIds;
        
        if (Array.isArray(displayIds)) {
          displayIds.forEach((displayId: string) => {
            sseService.notifyDisplayUpdate(displayId).catch(err => {
              console.error('Erro ao notificar display via SSE após salvar broadcast:', err);
            });
          });
        }
      } catch (err) {
        console.error('Erro ao processar displayIds do broadcast para SSE:', err);
      }
    }

    res.json(broadcast);
  } catch (error: any) {
    console.error('Erro ao salvar broadcast:', error);
    res.status(500).json({ error: 'Erro ao salvar broadcast.' });
  }
});

// DELETE /api/broadcasts/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Buscar o broadcast antes de excluir para saber quais displays atualizar
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: req.params.id as string },
      select: { displayIds: true }
    });

    await broadcastService.delete(req.params.id as string);

    // Notificar os displays vinculados via SSE
    if (broadcast && broadcast.displayIds) {
      try {
        const displayIds = typeof broadcast.displayIds === 'string'
          ? JSON.parse(broadcast.displayIds)
          : broadcast.displayIds;

        if (Array.isArray(displayIds)) {
          displayIds.forEach((displayId: string) => {
            sseService.notifyDisplayUpdate(displayId).catch(err => {
              console.error('Erro ao notificar display via SSE após deletar broadcast:', err);
            });
          });
        }
      } catch (err) {
        console.error('Erro ao processar displayIds do broadcast deletado para SSE:', err);
      }
    }

    res.json({ message: 'Broadcast removido com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao deletar broadcast:', error);
    res.status(500).json({ error: 'Erro ao deletar broadcast.' });
  }
});

export default router;
