import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { requireActiveSubscription, enforceQuota } from '../middlewares/quota.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { registerDeviceSchema, linkDeviceSchema, updateDeviceDisplaySchema } from '../schemas/devices.schema';
import { deviceService } from '../services/device.service';
import { sseService } from '../services/sse.service';
import { auditService } from '../services/audit.service';

const router = Router();

// GET /api/devices — só os devices do tenant
router.get('/', authMiddleware, requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const devices = await deviceService.getAll(req.tenantId);
    res.json(
      devices.map((d) => ({
        id: d.id,
        pairing_code: d.pairingCode,
        display_id: d.displayId,
        status: d.status,
        last_seen: d.lastSeen.getTime(),
        online: deviceService.isOnline(d.lastSeen),
        name: d.name,
      }))
    );
  } catch (error: any) {
    console.error('Erro ao listar dispositivos:', error);
    res.status(500).json({ error: 'Erro ao listar dispositivos.' });
  }
});

// GET /api/devices/health — painel de saúde do tenant: contagem online/offline
router.get('/health', authMiddleware, requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const summary = await deviceService.getHealthSummary(req.tenantId);
    res.json(summary);
  } catch (error: any) {
    console.error('Erro ao agregar saúde dos dispositivos:', error);
    res.status(500).json({ error: 'Erro ao agregar saúde dos dispositivos.' });
  }
});

// POST /api/devices/register (PÚBLICO — dispositivo se registra; ainda sem tenant)
router.post('/register', validateBody(registerDeviceSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId, code } = req.body;

    await deviceService.register(deviceId, code);
    res.json({ message: 'Dispositivo registrado.' });
  } catch (error: any) {
    console.error('Erro ao registrar dispositivo:', error);
    res.status(500).json({ error: 'Erro ao registrar dispositivo.' });
  }
});

// GET /api/devices/:id/status (PÚBLICO — dispositivo verifica o SEU status)
router.get('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const device = await deviceService.getStatus(req.params.id as string);

    if (!device) {
      res.status(404).json({ error: 'Dispositivo não encontrado.' });
      return;
    }

    res.json({
      id: device.id,
      pairing_code: device.pairingCode,
      display_id: device.displayId,
      status: device.status,
      last_seen: device.lastSeen.getTime(),
      name: device.name,
    });
  } catch (error: any) {
    console.error('Erro ao buscar status do dispositivo:', error);
    res.status(500).json({ error: 'Erro ao buscar status.' });
  }
});

// GET /api/devices/player/:id/live — Conexão SSE em tempo real (Player Pareado, PÚBLICO)
router.get('/player/:id/live', (req: Request, res: Response): void => {
  sseService.addClient('device', req.params.id as string, res);
});

// POST /api/devices/link — vincula device pendente a um display DO TENANT
// Parear um device é o que cria uma "tela ativa" — é aqui que a quota de
// telas do plano é cobrada. Leitura e heartbeat seguem livres de propósito:
// assinatura vencida bloqueia criar/editar, nunca derruba tela já no ar.
router.post('/link', authMiddleware, requireTenant, requireActiveSubscription, enforceQuota('device'), validateBody(linkDeviceSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, displayId, name } = req.body;

    const result = await deviceService.link(code, displayId, name, req.tenantId);

    if (result === 'display-not-found') {
      // Display de outro tenant (ou inexistente) — 404 sem distinguir os casos.
      res.status(404).json({ error: 'Display não encontrado.' });
      return;
    }

    if (!result) {
      res.status(404).json({ error: 'Dispositivo não encontrado ou já vinculado.' });
      return;
    }

    void auditService.logFromRequest(req, {
      action: 'device.link',
      entityType: 'device',
      entityId: result.device.id,
      metadata: { displayId, name: name ?? null },
    });

    // Notificar dispositivo via SSE em tempo real
    sseService.notifyDeviceUpdate(result.device.id).catch(err => {
      console.error('Erro ao notificar pareamento de device via SSE:', err);
    });

    res.json({ message: 'Dispositivo vinculado com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao vincular dispositivo:', error);
    res.status(500).json({ error: 'Erro ao vincular dispositivo.' });
  }
});

// PATCH /api/devices/:id/heartbeat (PÚBLICO — a TV bate o próprio id)
router.patch('/:id/heartbeat', async (req: Request, res: Response): Promise<void> => {
  try {
    await deviceService.heartbeat(req.params.id as string);
    res.json({ message: 'Heartbeat registrado.' });
  } catch (error: any) {
    console.error('Erro no heartbeat:', error);
    res.status(500).json({ error: 'Erro no heartbeat.' });
  }
});

// PATCH /api/devices/:id/display (AUTENTICADO — reatribuir display de um dispositivo)
router.patch('/:id/display', authMiddleware, requireTenant, validateBody(updateDeviceDisplaySchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { displayId } = req.body;

    const updated = await deviceService.updateDisplayIdScoped(req.params.id as string, displayId, req.tenantId);

    if (!updated) {
      res.status(404).json({ error: 'Dispositivo ou display não encontrado.' });
      return;
    }

    // Notificar dispositivo sobre reatribuição de display via SSE
    sseService.notifyDeviceUpdate(req.params.id as string).catch(err => {
      console.error('Erro ao notificar reatribuição de display via SSE:', err);
    });

    res.json({ message: 'Display do dispositivo atualizado.' });
  } catch (error: any) {
    console.error('Erro ao atualizar display do dispositivo:', error);
    res.status(500).json({ error: 'Erro ao atualizar display.' });
  }
});

// DELETE /api/devices/:id — 404 se for de outro tenant
router.delete('/:id', authMiddleware, requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const deleted = await deviceService.unlinkScoped(id, req.tenantId);

    if (!deleted) {
      res.status(404).json({ error: 'Dispositivo não encontrado.' });
      return;
    }

    void auditService.logFromRequest(req, {
      action: 'device.delete',
      entityType: 'device',
      entityId: id,
    });

    // Notificar dispositivo sobre desvinculação/remoção via SSE
    sseService.notifyDeviceUpdate(id).catch(err => {
      console.error('Erro ao notificar remoção de dispositivo via SSE:', err);
    });

    res.json({ message: 'Dispositivo removido.' });
  } catch (error: any) {
    console.error('Erro ao remover dispositivo:', error);
    res.status(500).json({ error: 'Erro ao remover dispositivo.' });
  }
});

export default router;
