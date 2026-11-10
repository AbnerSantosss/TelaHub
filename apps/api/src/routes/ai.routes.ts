import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { requireActiveSubscription } from '../middlewares/quota.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { aiRateLimit } from '../middlewares/rate-limit.middleware';
import { auditService } from '../services/audit.service';
import { AI_ACTIONS, AI_PROMPT_MAX, AiUseError, aiService } from '../services/ai/ai.service';
import { AiProviderError } from '../services/ai/providers';
import { requirePermission } from '../middlewares/permission.middleware';

/**
 * IA de criação para o cliente final (`/api/ai`).
 *
 * O painel nunca vê a chave nem escolhe provedor: só manda o pedido. Todas as
 * travas (ligada, recurso, plano, limite do mês) estão em `aiService`; aqui a
 * rota só valida o corpo, aplica o limite de taxa e registra o uso na trilha
 * de auditoria, que é também o contador do limite mensal.
 */
const router = Router();

router.use(authMiddleware, requireTenant);

const orientation = z.enum(['horizontal', 'vertical']).default('horizontal');
const prompt = z
  .string()
  .trim()
  .min(3, 'Descreva o que você quer criar.')
  .max(AI_PROMPT_MAX, `Use no máximo ${AI_PROMPT_MAX} caracteres.`);
const segment = z.string().trim().max(40).optional();

const generateSchema = z.object({ prompt, orientation, segment });
const editSchema = z.object({ prompt, orientation, imageUrl: z.string().trim().min(1).max(2048) });

const isMaster = (req: Request) => req.user?.role === 'master';

function requireOrg(req: Request, res: Response): string | null {
  if (!req.tenantId) {
    res.status(400).json({ error: 'Escolha uma organização antes de usar a IA.', code: 'no_tenant' });
    return null;
  }
  return req.tenantId;
}

function handleError(res: Response, error: unknown, label: string) {
  if (error instanceof AiUseError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  if (error instanceof AiProviderError) {
    // O detalhe vai para o log já sem a chave (ver providers.ts).
    console.error(`[ai] ${label}: ${error.message}${error.detail ? ` | ${error.detail}` : ''}`);
    res.status(error.status).json({ error: error.message, code: 'ai_provider_error' });
    return;
  }
  console.error(`[ai] ${label}: erro inesperado`, error instanceof Error ? error.message : '');
  res.status(500).json({ error: 'Não foi possível concluir o pedido de IA agora. Tente de novo.' });
}

// GET /api/ai/status — o que o painel pode mostrar (sem custo)
router.get('/status', requirePermission('media:read'), async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(await aiService.status(req.tenantId ?? null, isMaster(req)));
  } catch (error) {
    handleError(res, error, 'status');
  }
});

// Os três POST abaixo gravam na biblioteca de mídia e gastam o limite de IA do
// plano, por isso exigem `media:write` (Editor e Administrador; Leitor não).
// POST /api/ai/image — gera uma imagem e guarda na biblioteca do cliente
router.post(
  '/image',
  requirePermission('media:write'),
  requireActiveSubscription,
  aiRateLimit,
  validateBody(generateSchema),
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = requireOrg(req, res);
    if (!organizationId) return;
    try {
      const result = await aiService.generateImage({ organizationId, isMaster: isMaster(req), ...req.body });
      await auditService.logFromRequest(req, {
        action: AI_ACTIONS.generateImage,
        entityType: 'media',
        entityId: result.mediaId,
        metadata: { provider: result.provider, orientation: req.body.orientation, promptLength: req.body.prompt.length },
      });
      res.json({ url: result.url, mediaId: result.mediaId });
    } catch (error) {
      handleError(res, error, 'gerar imagem');
    }
  }
);

// POST /api/ai/image/edit — edita uma imagem da própria biblioteca
router.post(
  '/image/edit',
  requirePermission('media:write'),
  requireActiveSubscription,
  aiRateLimit,
  validateBody(editSchema),
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = requireOrg(req, res);
    if (!organizationId) return;
    try {
      const result = await aiService.editImage({ organizationId, isMaster: isMaster(req), ...req.body });
      await auditService.logFromRequest(req, {
        action: AI_ACTIONS.editImage,
        entityType: 'media',
        entityId: result.mediaId,
        metadata: { provider: result.provider, promptLength: req.body.prompt.length },
      });
      res.json({ url: result.url, mediaId: result.mediaId });
    } catch (error) {
      handleError(res, error, 'editar imagem');
    }
  }
);

// POST /api/ai/preset — tela pronta: fundo gerado + textos editáveis
router.post(
  '/preset',
  requirePermission('media:write'),
  requireActiveSubscription,
  aiRateLimit,
  validateBody(generateSchema),
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = requireOrg(req, res);
    if (!organizationId) return;
    try {
      const result = await aiService.generatePreset({ organizationId, isMaster: isMaster(req), ...req.body });
      await auditService.logFromRequest(req, {
        action: AI_ACTIONS.generatePreset,
        entityType: 'media',
        entityId: result.mediaId,
        metadata: { provider: result.provider, orientation: req.body.orientation, promptLength: req.body.prompt.length },
      });
      res.json({ layout: result.layout, page: result.page });
    } catch (error) {
      handleError(res, error, 'tela pronta');
    }
  }
);

export default router;
