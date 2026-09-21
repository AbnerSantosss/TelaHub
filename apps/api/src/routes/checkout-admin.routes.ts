import { Router, Request, Response } from 'express';

import { authMiddleware, masterMiddleware } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  checkoutMetricsQuerySchema,
  listCheckoutSessionsQuerySchema,
  registerRecoverySchema,
} from '../schemas/checkout.schema';
import { CheckoutError, checkoutService } from '../services/checkout.service';

const router = Router();

/**
 * Painel do funil de checkout — restrito ao MASTER, não a `admin`.
 *
 * O funil contém leads de toda a plataforma, incluindo dados pessoais de gente
 * que ainda não é cliente e não pertence a nenhuma organização. Com
 * `adminMiddleware`, o admin de um cliente leria o lead de outro: não há
 * `organizationId` para filtrar em sessão anônima, então não existe recorte de
 * tenant possível aqui. É decisão de segurança, não de conveniência.
 */
router.use(authMiddleware);
router.use(masterMiddleware);

function handleError(error: unknown, res: Response, context: string): void {
  if (error instanceof CheckoutError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  console.error(`Erro no painel de checkout (${context}):`, error);
  res.status(500).json({ error: 'Erro interno ao carregar o funil de checkout.' });
}

function badQuery(res: Response, issues: Array<{ path: (string | number | symbol)[]; message: string }>): void {
  res.status(400).json({
    error: 'Parâmetros inválidos.',
    details: issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  });
}

/**
 * GET /api/checkout/admin/sessions — lista paginada do funil.
 * Filtros: `status`, período (`startDate`/`endDate` sobre `startedAt`) e busca
 * parcial por e-mail. Ordem: `lastSeenAt` desc (quem ainda dá para recuperar).
 */
router.get('/sessions', async (req: Request, res: Response): Promise<void> => {
  const parsed = listCheckoutSessionsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    badQuery(res, parsed.error.issues);
    return;
  }

  try {
    const result = await checkoutService.listSessions(parsed.data);
    res.json(result);
  } catch (error) {
    handleError(error, res, 'listar sessões');
  }
});

/**
 * GET /api/checkout/admin/metrics — relatório do funil no período.
 * Sem `startDate`/`endDate`, usa os últimos 30 dias.
 *
 * Declarada ANTES de `/sessions/:id` só por clareza de leitura; os caminhos não
 * colidem.
 */
router.get('/metrics', async (req: Request, res: Response): Promise<void> => {
  const parsed = checkoutMetricsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    badQuery(res, parsed.error.issues);
    return;
  }

  try {
    const metrics = await checkoutService.getMetrics(parsed.data);
    res.json(metrics);
  } catch (error) {
    handleError(error, res, 'calcular métricas');
  }
});

/** GET /api/checkout/admin/sessions/:id — detalhe + linha do tempo de eventos. */
router.get('/sessions/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await checkoutService.getSessionDetail(req.params.id as string);
    res.json(result);
  } catch (error) {
    handleError(error, res, 'detalhar sessão');
  }
});

/**
 * POST /api/checkout/admin/sessions/:id/recovery — registra que o contato de
 * recuperação foi feito. NÃO envia mensagem: não há integração de WhatsApp nem
 * disparo transacional nesta frente, e registrar um envio que não aconteceu é
 * pior do que não registrar nada.
 */
router.post(
  '/sessions/:id/recovery',
  validateBody(registerRecoverySchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const session = await checkoutService.registerRecovery(req.params.id as string, req.body);
      res.json({ session, notified: false, message: 'Contato de recuperação registrado (nenhuma mensagem foi enviada).' });
    } catch (error) {
      handleError(error, res, 'registrar recuperação');
    }
  }
);

export default router;
