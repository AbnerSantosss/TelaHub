import { Router, Request, Response } from 'express';

import prisma from '../../lib/prisma';
import { validateBody } from '../../middlewares/validate.middleware';
import {
  adhocEmailSchema,
  automationPreviewSchema,
  campaignTestSchema,
  createCampaignSchema,
  messagesQuerySchema,
  previewAudienceSchema,
  retryMessageSchema,
  sendCampaignSchema,
  updateAutomationSchema,
  updateCampaignSchema,
} from '../../schemas/email.schema';
import { adminAuditService } from '../../services/admin-audit.service';
import { auditService } from '../../services/audit.service';
import {
  AUTOMATION_VARIABLES,
  emailAutomationService,
  isAutomationKey,
} from '../../services/email-automation.service';
import { emailCampaignService, parseAudience } from '../../services/email-campaign.service';
import { emailQueueService } from '../../services/email-queue.service';
import { getEmailQueueStatus } from '../../jobs/email-dispatch.job';
import { wrapInLayout } from '../../services/email.service';

/**
 * Backoffice de e-mail: automações, campanhas, histórico e envio avulso.
 *
 * A guarda de `master` já está aplicada na raiz (`admin/index.ts`); NÃO a
 * repita aqui.
 *
 * ── Por que duas formas de auditar ───────────────────────────────────────────
 * `adminAuditService.log` EXIGE a organização que sofre a ação — é o desenho
 * dele, e é o certo para "mandei um e-mail para este cliente". Mas ligar uma
 * automação ou disparar uma campanha não tem UMA organização alvo: são ações de
 * plataforma. Forçar um `organizationId` inventado nesses casos quebraria a
 * chave estrangeira de `AuditLog` e, como o serviço de auditoria nunca lança, a
 * ação ficaria SEM RASTRO em silêncio — o oposto do que auditar existe para
 * fazer. Então o que é de plataforma vai por `logPlatformAction`, que grava
 * `organizationId: null` mantendo o mesmo prefixo `admin.` e o mesmo motivo
 * obrigatório.
 */
const router = Router();

/** Auditoria de ação de plataforma (sem organização alvo). Nunca lança. */
async function logPlatformAction(
  req: Request,
  entry: {
    action: string;
    entityType: string;
    entityId?: string | null;
    reason: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    extra?: Record<string, unknown> | null;
  }
): Promise<void> {
  await auditService.log({
    organizationId: null,
    userId: req.user?.id ?? null,
    userEmail: req.user?.email ?? null,
    action: `admin.${entry.action}`,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    metadata: {
      reason: entry.reason,
      ...(entry.before !== undefined ? { before: entry.before } : {}),
      ...(entry.after !== undefined ? { after: entry.after } : {}),
      ...(entry.extra ?? {}),
      performedBy: 'backoffice',
    },
  });
}

function fail(res: Response, err: unknown, fallback: string): void {
  console.error(`[admin/email] ${fallback}:`, err);
  res.status(500).json({ error: fallback });
}

// ==============================================================================
// AUTOMAÇÕES
// ==============================================================================

/** GET /api/admin/email/automations — catálogo + estado, semeado na primeira vez. */
router.get('/automations', async (_req: Request, res: Response): Promise<void> => {
  try {
    const automations = await emailAutomationService.list();
    res.json({ automations, variables: AUTOMATION_VARIABLES });
  } catch (err) {
    fail(res, err, 'Não foi possível carregar as automações.');
  }
});

/** PUT /api/admin/email/automations/:key — liga/desliga, dias, assunto e corpo. */
router.put(
  '/automations/:key',
  validateBody(updateAutomationSchema),
  async (req: Request, res: Response): Promise<void> => {
    const key = req.params.key as string;
    if (!isAutomationKey(key)) {
      res.status(404).json({ error: 'Gatilho desconhecido.' });
      return;
    }

    try {
      const before = await prisma.emailAutomation.findUnique({ where: { key } });
      const { reason, ...data } = req.body;
      const automation = await emailAutomationService.update(key, data);

      await logPlatformAction(req, {
        action: 'email.automation.update',
        entityType: 'EmailAutomation',
        entityId: key,
        reason,
        before: before
          ? { enabled: before.enabled, offsetDays: before.offsetDays, subject: before.subject }
          : null,
        after: {
          enabled: automation.enabled,
          offsetDays: automation.offsetDays,
          subject: automation.subject,
        },
      });

      res.json({ automation });
    } catch (err) {
      fail(res, err, 'Não foi possível salvar a automação.');
    }
  }
);

/**
 * POST /api/admin/email/automations/:key/preview — prévia com dados reais.
 * Leitura: não audita e não envia nada.
 */
router.post(
  '/automations/:key/preview',
  validateBody(automationPreviewSchema),
  async (req: Request, res: Response): Promise<void> => {
    const key = req.params.key as string;
    if (!isAutomationKey(key)) {
      res.status(404).json({ error: 'Gatilho desconhecido.' });
      return;
    }

    try {
      const preview = await emailAutomationService.preview(key, req.body.organizationId);
      res.json(preview);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Não foi possível montar a prévia.',
      });
    }
  }
);

// ==============================================================================
// CAMPANHAS
// ==============================================================================

/** GET /api/admin/email/campaigns */
router.get('/campaigns', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const campaigns = await emailCampaignService.list(status);
    res.json({ campaigns });
  } catch (err) {
    fail(res, err, 'Não foi possível listar as campanhas.');
  }
});

/** POST /api/admin/email/campaigns */
router.post(
  '/campaigns',
  validateBody(createCampaignSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { reason, ...input } = req.body;
      const campaign = await emailCampaignService.create(input, req.user!.id);

      await logPlatformAction(req, {
        action: 'email.campaign.create',
        entityType: 'EmailCampaign',
        entityId: campaign.id,
        reason,
        after: { name: campaign.name, status: campaign.status, audience: campaign.audience },
      });

      res.status(201).json({ campaign });
    } catch (err) {
      fail(res, err, 'Não foi possível criar a campanha.');
    }
  }
);

/** PUT /api/admin/email/campaigns/:id */
router.put(
  '/campaigns/:id',
  validateBody(updateCampaignSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { reason, ...input } = req.body;
      const campaign = await emailCampaignService.update(req.params.id as string, input);

      await logPlatformAction(req, {
        action: 'email.campaign.update',
        entityType: 'EmailCampaign',
        entityId: campaign.id,
        reason,
        after: { name: campaign.name, status: campaign.status, audience: campaign.audience },
      });

      res.json({ campaign });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Não foi possível salvar a campanha.',
      });
    }
  }
);

/**
 * POST /api/admin/email/campaigns/:id/preview-audience — CONTAGEM antes de enviar.
 *
 * Aceita um público no corpo para o operador simular filtros sem salvar; sem
 * corpo, usa o público gravado na campanha.
 */
router.post(
  '/campaigns/:id/preview-audience',
  validateBody(previewAudienceSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const campaign = await emailCampaignService.get(req.params.id as string);
      if (!campaign) {
        res.status(404).json({ error: 'Campanha não encontrada.' });
        return;
      }

      const audience = req.body.audience ?? parseAudience(campaign.audience);
      const preview = await emailCampaignService.previewAudience(audience);
      res.json({ audience, ...preview });
    } catch (err) {
      fail(res, err, 'Não foi possível calcular o público.');
    }
  }
);

/**
 * POST /api/admin/email/campaigns/:id/test — envio de teste.
 * Não audita: não atinge cliente nenhum, é o operador mandando para si.
 */
router.post(
  '/campaigns/:id/test',
  validateBody(campaignTestSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await emailCampaignService.sendTest(req.params.id as string, req.body.email);
      res.json({ ok: true, queued: true });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Não foi possível enfileirar o teste.',
      });
    }
  }
);

/** POST /api/admin/email/campaigns/:id/send — dispara para o público. */
router.post(
  '/campaigns/:id/send',
  validateBody(sendCampaignSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // `sendNow` é o "disparar agora mesmo estando agendada". Sem ele, uma
      // campanha com `scheduledAt` no futuro é RECUSADA aqui e sai sozinha na
      // data — que é o comportamento que o operador pediu ao agendar.
      const sendNow = req.body.sendNow === true;
      const result = await emailCampaignService.send(req.params.id as string, {
        ignoreSchedule: sendNow,
      });

      await logPlatformAction(req, {
        action: 'email.campaign.send',
        entityType: 'EmailCampaign',
        entityId: req.params.id as string,
        reason: req.body.reason,
        // Registrado porque é a diferença entre "saiu quando eu mandei" e "saiu
        // antes da data combinada" — a primeira pergunta de quem for investigar.
        extra: { queued: result.queued, sendNow },
      });

      res.json(result);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Não foi possível disparar a campanha.',
      });
    }
  }
);

// ==============================================================================
// HISTÓRICO
// ==============================================================================

/** GET /api/admin/email/messages — histórico com filtro por status/organização. */
router.get('/messages', async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = messagesQuerySchema.parse(req.query);
    const { total, items } = await emailQueueService.list(filter);

    // O corpo do e-mail NÃO vai na listagem: são até 200 mensagens por página e
    // o HTML de uma campanha passa fácil de 50 KB cada. Quem quiser ler o corpo
    // abre a mensagem.
    res.json({
      total,
      messages: items.map((message) => ({
        id: message.id,
        toEmail: message.toEmail,
        organizationId: message.organizationId,
        kind: message.kind,
        templateKey: message.templateKey,
        campaignId: message.campaignId,
        subject: message.subject,
        status: message.status,
        attempts: message.attempts,
        nextAttemptAt: message.nextAttemptAt,
        lastError: message.lastError,
        sentAt: message.sentAt,
        createdAt: message.createdAt,
      })),
    });
  } catch (err) {
    fail(res, err, 'Não foi possível carregar o histórico de e-mails.');
  }
});

/** GET /api/admin/email/messages/:id — a mensagem inteira, com o corpo. */
router.get('/messages/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const message = await prisma.emailMessage.findUnique({
      where: { id: req.params.id as string },
    });
    if (!message) {
      res.status(404).json({ error: 'Mensagem não encontrada.' });
      return;
    }
    res.json({ message });
  } catch (err) {
    fail(res, err, 'Não foi possível carregar a mensagem.');
  }
});

/**
 * POST /api/admin/email/messages/:id/retry — devolve uma falha para a fila.
 *
 * Audita na organização destinatária quando ela existe: quem sofre o reenvio é
 * o cliente, e é na trilha dele que isso precisa aparecer.
 */
router.post(
  '/messages/:id/retry',
  validateBody(retryMessageSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const message = await emailQueueService.retry(req.params.id as string);
      if (!message) {
        res.status(409).json({
          error: 'Só mensagens com falha podem ser reenviadas.',
        });
        return;
      }

      if (message.organizationId) {
        await adminAuditService.log(req, {
          action: 'email.message.retry',
          organizationId: message.organizationId,
          entityType: 'EmailMessage',
          entityId: message.id,
          reason: req.body.reason,
          extra: { subject: message.subject, toEmail: message.toEmail },
        });
      } else {
        await logPlatformAction(req, {
          action: 'email.message.retry',
          entityType: 'EmailMessage',
          entityId: message.id,
          reason: req.body.reason,
          extra: { subject: message.subject, toEmail: message.toEmail },
        });
      }

      res.json({ message });
    } catch (err) {
      fail(res, err, 'Não foi possível reenfileirar a mensagem.');
    }
  }
);

/** GET /api/admin/email/queue — retrato da fila (pendentes, vencidos, falhas). */
router.get('/queue', async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json(await getEmailQueueStatus());
  } catch (err) {
    fail(res, err, 'Não foi possível ler o estado da fila.');
  }
});

// ==============================================================================
// E-MAIL AVULSO
// ==============================================================================

/**
 * POST /api/admin/email/send — e-mail individual para uma organização.
 *
 * Destinatário padrão: o admin mais antigo da organização (quem criou a conta).
 * O corpo escrito pelo operador entra no layout do sistema — um e-mail da
 * plataforma que chega sem a identidade da plataforma parece phishing, e é o
 * cliente que paga esse mal-entendido.
 */
router.post(
  '/send',
  validateBody(adhocEmailSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { organizationId, toEmail, subject, htmlBody, reason } = req.body;

    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true },
      });
      if (!organization) {
        res.status(404).json({ error: 'Organização não encontrada.' });
        return;
      }

      const recipient =
        (await prisma.user.findFirst({
          where: { organizationId, role: 'admin' },
          orderBy: { createdAt: 'asc' },
          select: { id: true, email: true },
        })) ??
        (await prisma.user.findFirst({
          where: { organizationId },
          orderBy: { createdAt: 'asc' },
          select: { id: true, email: true },
        }));

      const destino = toEmail ?? recipient?.email;
      if (!destino) {
        res.status(409).json({ error: 'Esta organização não tem nenhum usuário com e-mail.' });
        return;
      }

      const message = await emailQueueService.enqueue({
        toEmail: destino,
        toUserId: toEmail ? null : (recipient?.id ?? null),
        organizationId,
        subject,
        htmlBody: wrapInLayout(htmlBody),
        // Individual e escrito por uma pessoa: transacional, nunca campanha.
        kind: 'transactional',
        templateKey: 'admin_adhoc',
      });

      await adminAuditService.log(req, {
        action: 'email.send',
        organizationId,
        entityType: 'EmailMessage',
        entityId: message.id,
        reason,
        extra: { toEmail: destino, subject },
      });

      res.status(201).json({ message: { id: message.id, status: message.status } });
    } catch (err) {
      fail(res, err, 'Não foi possível enfileirar o e-mail.');
    }
  }
);

export default router;
