import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireTenant, TenantScopeError } from '../middlewares/tenant.middleware';
import { requireActiveSubscription } from '../middlewares/quota.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { saveDisplaySchema } from '../schemas/displays.schema';
import { displayService, normalizeWall } from '../services/display.service';
import { subscriptionOverrideService } from '../services/subscription-override.service';
import { sseService } from '../services/sse.service';
import { auditService } from '../services/audit.service';
import {
  findPaidWidgetTypes,
  findBiWidgetTypes,
  findDocWidgetTypes,
  resolveVideoEntitlement,
  BI_FEATURE_KEY,
  DOC_FEATURE_KEY,
  FREE_VIDEO_TRIAL_DAYS,
} from '../services/entitlement.service';
import { subscriptionService } from '../services/subscription.service';
import { hasFeature } from '../services/plan.service';
import { buildFeatureDenial, featureDenialMessage } from '../middlewares/feature.middleware';
import { publicRoute, requirePermission } from '../middlewares/permission.middleware';

const router = Router();

/** Feature do plano Enterprise que libera o mural de TVs. */
const WALL_FEATURE_KEY = 'videowall';

// GET /api/displays — só os displays do tenant do usuário
router.get('/', authMiddleware, requireTenant, requirePermission('display:read'), async (req: Request, res: Response): Promise<void> => {
  try {
    const displays = await displayService.getAll(req.tenantId);
    res.json(displays);
  } catch (error: any) {
    console.error('Erro ao listar displays:', error);
    res.status(500).json({ error: 'Erro ao listar displays.' });
  }
});

// GET /api/displays/slug/:slug/version — Endpoint LEVE para check de versão (Player)
// PÚBLICO por design: as TVs dependem dele. Só expõe o updatedAt do próprio slug.
router.get('/slug/:slug/version', publicRoute('player da TV checa a versão do display por token público'), async (req: Request, res: Response): Promise<void> => {
  try {
    // Aceita token público (preferido) ou slug legado.
    const version = await displayService.getVersionByPublicRef(req.params.slug as string);

    if (!version) {
      res.status(404).json({ error: 'Display não encontrado.' });
      return;
    }

    // Cache condicional via ETag ou Query Parameter/Header
    const currentVersionTime = String(version.updatedAt.getTime());
    const etag = `"${currentVersionTime}"`;
    const lastVersionQuery = req.query.lastVersion ? String(req.query.lastVersion) : null;
    const lastVersionHeader = req.headers['x-last-version'] ? String(req.headers['x-last-version']) : null;
    const clientVersion = lastVersionQuery || lastVersionHeader;

    if (
      req.headers['if-none-match'] === etag ||
      (clientVersion && clientVersion === currentVersionTime)
    ) {
      res.status(304).end();
      return;
    }

    res.set('ETag', etag);
    res.set('Cache-Control', 'no-cache');
    res.json({ updatedAt: version.updatedAt.getTime() });
  } catch (error: any) {
    console.error('Erro ao buscar versão do display:', error);
    res.status(500).json({ error: 'Erro ao buscar versão.' });
  }
});

// GET /api/displays/slug/:slug/live — Conexão SSE em tempo real (Player, PÚBLICO)
router.get('/slug/:slug/live', publicRoute('SSE do player da TV, sem login'), (req: Request, res: Response): void => {
  sseService.addClient('slug', req.params.slug as string, res);
});

// GET /api/displays/slug/:slug (PÚBLICO — Player)
router.get('/slug/:slug', publicRoute('player da TV carrega o display por token público'), async (req: Request, res: Response): Promise<void> => {
  try {
    // Aceita token público (preferido) ou slug legado.
    const display = await displayService.getByPublicRef(req.params.slug as string);

    if (!display) {
      res.status(404).json({ error: 'Display não encontrado.' });
      return;
    }

    // Cache condicional via ETag ou Query Parameter/Header
    const currentVersionTime = String(display.updatedAt.getTime());
    const etag = `"${currentVersionTime}"`;
    const lastVersionQuery = req.query.lastVersion ? String(req.query.lastVersion) : null;
    const lastVersionHeader = req.headers['x-last-version'] ? String(req.headers['x-last-version']) : null;
    const clientVersion = lastVersionQuery || lastVersionHeader;

    if (
      req.headers['if-none-match'] === etag ||
      (clientVersion && clientVersion === currentVersionTime)
    ) {
      res.status(304).end();
      return;
    }

    res.set('ETag', etag);
    res.set('Cache-Control', 'no-cache');
    res.json(display);
  } catch (error: any) {
    console.error('Erro ao buscar display por slug:', error);
    res.status(500).json({ error: 'Erro ao buscar display.' });
  }
});

// GET /api/displays/player/:id (PÚBLICO — Player busca display após vinculação)
router.get('/player/:id', publicRoute('player da TV pareada busca o display vinculado, sem login'), async (req: Request, res: Response): Promise<void> => {
  try {
    const display = await displayService.getById(req.params.id as string);

    if (!display) {
      res.status(404).json({ error: 'Display não encontrado.' });
      return;
    }

    // Cache condicional via ETag ou Query Parameter/Header
    const currentVersionTime = String(display.updatedAt.getTime());
    const etag = `"${currentVersionTime}"`;
    const lastVersionQuery = req.query.lastVersion ? String(req.query.lastVersion) : null;
    const lastVersionHeader = req.headers['x-last-version'] ? String(req.headers['x-last-version']) : null;
    const clientVersion = lastVersionQuery || lastVersionHeader;

    if (
      req.headers['if-none-match'] === etag ||
      (clientVersion && clientVersion === currentVersionTime)
    ) {
      res.status(304).end();
      return;
    }

    res.set('ETag', etag);
    res.set('Cache-Control', 'no-cache');
    res.json(display);
  } catch (error: any) {
    console.error('Erro ao buscar display para player:', error);
    res.status(500).json({ error: 'Erro ao buscar display.' });
  }
});

// GET /api/displays/:id (AUTENTICADO — Dashboard). 404 se for de outro tenant.
router.get('/:id', authMiddleware, requireTenant, requirePermission('display:read'), async (req: Request, res: Response): Promise<void> => {
  try {
    const display = await displayService.getByIdScoped(req.params.id as string, req.tenantId);

    if (!display) {
      // Não distinguimos "não existe" de "é de outro tenant" — 404 nos dois casos.
      res.status(404).json({ error: 'Display não encontrado.' });
      return;
    }

    // Cache condicional via ETag
    const etag = `"${display.updatedAt}"`;
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    res.set('ETag', etag);
    res.set('Cache-Control', 'no-cache');
    res.json(display);
  } catch (error: any) {
    console.error('Erro ao buscar display:', error);
    res.status(500).json({ error: 'Erro ao buscar display.' });
  }
});

// POST /api/displays (Cria ou atualiza) — organizationId é SEMPRE o do tenant
// Não há quota de display (o que se cobra é tela ativa, ver devices/link),
// mas assinatura inválida impede criar/editar conteúdo.
router.post('/', authMiddleware, requireTenant, requirePermission('display:write'), requireActiveSubscription, validateBody(saveDisplaySchema), async (req: Request, res: Response): Promise<void> => {
  try {
    // `organizationId` do corpo é ignorado de propósito: o escopo vem do token.
    const { id, name, slug, pages, coverImage, orientation, wall } = req.body;

    // Videowall (Enterprise). Só barra quando o pedido CRIA ou MUDA um mural:
    // quem já tinha um mural e perdeu o plano continua editando o conteúdo dele,
    // no mesmo espírito dos documentos já publicados. Master passa sempre.
    const requestedWall = wall === undefined ? undefined : normalizeWall(wall);
    if (requestedWall && req.tenantId && req.user?.role !== 'master') {
      const current = id ? await displayService.getByIdScoped(id, req.tenantId) : null;
      const currentWall = current?.wall ?? null;
      const changed =
        !currentWall ||
        currentWall.cols !== requestedWall.cols ||
        currentWall.rows !== requestedWall.rows;

      if (changed) {
        const subscription = await subscriptionService.getByOrganization(req.tenantId);
        if (
          subscription &&
          !hasFeature(subscription, WALL_FEATURE_KEY) &&
          !(await subscriptionOverrideService.grantsFeature(req.tenantId, WALL_FEATURE_KEY))
        ) {
          const denial = await buildFeatureDenial(WALL_FEATURE_KEY, subscription);
          res.status(403).json({
            error:
              'O videowall, que espalha uma cena por várias TVs, faz parte do plano Enterprise. ' +
              'Fale com a gente para liberar. Suas telas comuns seguem funcionando normalmente.',
            code: 'feature_not_in_plan',
            ...denial,
          });
          return;
        }
      }
    }

    // Direito de uso por conteúdo. Checado no servidor porque o bloqueio no
    // Editor é só conveniência — sem isto, bastava chamar a API direto para
    // publicar o widget. São TRÊS regras diferentes sobre o mesmo payload:
    // vídeo é por TEMPO (degustação de 7 dias no Grátis); documento é por PLANO
    // (feature `documentos`, do Loja para cima); painel de gestão também é por
    // plano, um degrau acima (feature `powerbi`, do Rede para cima).
    const videoWidgets = findPaidWidgetTypes(pages);
    const docWidgets = findDocWidgetTypes(pages);
    const biWidgets = findBiWidgetTypes(pages);

    if (
      (videoWidgets.length > 0 || docWidgets.length > 0 || biWidgets.length > 0) &&
      req.tenantId
    ) {
      const subscription = await subscriptionService.getByOrganization(req.tenantId);

      if (videoWidgets.length > 0) {
        const entitlement = resolveVideoEntitlement(subscription);
        if (!entitlement.allowed) {
          res.status(402).json({
            error:
              `Seus ${FREE_VIDEO_TRIAL_DAYS} dias de vídeo no plano Grátis terminaram. ` +
              'Assine o plano Loja para continuar publicando vídeos. O resto do conteúdo segue funcionando normalmente.',
            code: 'video_requires_paid_plan',
            widgetTypes: videoWidgets,
          });
          return;
        }
      }

      // Fail-open sem assinatura nos dois gates abaixo, pelo mesmo motivo do
      // `requireFeature`: organização legada (anterior à cobrança) não pode
      // perder recurso por causa de dado ausente.
      if (docWidgets.length > 0 && subscription && !hasFeature(subscription, DOC_FEATURE_KEY)) {
        const denial = await buildFeatureDenial(DOC_FEATURE_KEY, subscription);
        res.status(403).json({
          error:
            `${featureDenialMessage(denial)} ` +
            'PDF, Google Docs e Office entram a partir do plano Loja. ' +
            'As telas que você já publicou com esses documentos continuam funcionando normalmente.',
          code: 'feature_not_in_plan',
          widgetTypes: docWidgets,
          ...denial,
        });
        return;
      }

      if (biWidgets.length > 0 && subscription && !hasFeature(subscription, BI_FEATURE_KEY)) {
        const denial = await buildFeatureDenial(BI_FEATURE_KEY, subscription);
        res.status(403).json({
          error:
            `${featureDenialMessage(denial)} ` +
            'As telas que você já publicou com esses painéis continuam funcionando normalmente.',
          code: 'feature_not_in_plan',
          widgetTypes: biWidgets,
          ...denial,
        });
        return;
      }
    }

    const { display, created } = await displayService.save(
      { id, name, slug, pages: pages || [], coverImage, orientation, wall },
      req.tenantId
    );

    void auditService.logFromRequest(req, {
      action: created ? 'display.create' : 'display.publish',
      entityType: 'display',
      entityId: display.id,
      metadata: { name: display.name, slug: display.slug },
    });

    // Notificar players em tempo real via SSE
    sseService.notifyDisplayUpdate(display.id).catch(err => {
      console.error('Erro ao notificar SSE após salvar display:', err);
    });

    res.json(display);
  } catch (error: any) {
    if (error instanceof TenantScopeError) {
      res.status(404).json({ error: 'Display não encontrado.' });
      return;
    }
    console.error('Erro ao salvar display:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Já existe um display com esse slug.' });
      return;
    }
    res.status(500).json({ error: 'Erro ao salvar display.' });
  }
});

// DELETE /api/displays/:id — 404 se for de outro tenant
router.delete('/:id', authMiddleware, requireTenant, requirePermission('display:delete'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const deleted = await displayService.deleteScoped(id, req.tenantId);

    if (!deleted) {
      res.status(404).json({ error: 'Display não encontrado.' });
      return;
    }

    void auditService.logFromRequest(req, {
      action: 'display.delete',
      entityType: 'display',
      entityId: id,
    });

    res.json({ message: 'Display removido com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao deletar display:', error);
    res.status(500).json({ error: 'Erro ao deletar display.' });
  }
});

export default router;
