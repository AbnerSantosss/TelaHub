import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

import { validateBody } from '../middlewares/validate.middleware';
import {
  createCheckoutSessionSchema,
  submitCheckoutSessionSchema,
  updateCheckoutSessionSchema,
} from '../schemas/checkout.schema';
import { CheckoutError, checkoutService } from '../services/checkout.service';

const router = Router();

/**
 * O checkout é público por natureza (a sessão nasce antes do login), então
 * precisa de limite próprio: o `authRateLimit` (10 por 15 min) derrubaria um
 * visitante legítimo, porque cada passo do formulário é um PATCH.
 *
 * Em teste os limites sobem para não tornar a suíte dependente de ordem de
 * execução — o comportamento de rate limit em si é validado no teste dele.
 */
const isTest = process.env.NODE_ENV === 'test';

/** Criação de sessão: uma por visita. Abre folga para múltiplas abas/reloads. */
export const checkoutCreateRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 10_000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de iniciar o checkout. Aguarde alguns minutos.' },
});

/** Leitura/atualização: o preenchimento normal do formulário gera vários hits. */
export const checkoutSessionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 10_000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Aguarde alguns instantes e tente de novo.' },
});

function handleError(error: unknown, res: Response, context: string): void {
  if (error instanceof CheckoutError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  console.error(`Erro no checkout (${context}):`, error);
  res.status(500).json({ error: 'Erro interno no checkout. Tente novamente.' });
}

/**
 * POST /api/checkout/sessions — pública, sem autenticação.
 *
 * Cria a sessão na PRIMEIRA visita, antes de qualquer dado pessoal. É isso que
 * torna o abandono mensurável: sem sessão persistida desde o início, abandono é
 * invisível por definição.
 */
router.post(
  '/sessions',
  checkoutCreateRateLimit,
  validateBody(createCheckoutSessionSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const session = await checkoutService.createSession(req.body, {
        // `req.ip` respeita o `trust proxy` do `server.ts` — atrás do
        // Nginx/Cloudflare é aqui que sai o IP real do visitante. O serviço
        // grava só o HASH dele.
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
        referrer: req.get('referer') ?? null,
      });

      res.status(201).json({ session });
    } catch (error) {
      handleError(error, res, 'criar sessão');
    }
  }
);

/**
 * GET /api/checkout/sessions/:publicToken — pública porque o link de recuperação
 * precisa reabrir o checkout onde o visitante parou.
 *
 * Devolve o MÍNIMO: plano, telas, valor, status e o que o próprio visitante
 * digitou. Nada de id interno, organização ou atribuição de campanha — quem tem
 * o token vê a sessão, então o payload é o teto do que um vazamento de link
 * expõe.
 */
router.get(
  '/sessions/:publicToken',
  checkoutSessionRateLimit,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const session = await checkoutService.getPublicSession(req.params.publicToken as string);
      res.json({ session });
    } catch (error) {
      handleError(error, res, 'ler sessão');
    }
  }
);

/**
 * PATCH /api/checkout/sessions/:publicToken — enriquecimento por passo.
 *
 * O `amountCents` é SEMPRE recalculado no servidor a partir de `planCode` +
 * `screens`; valor enviado pelo cliente é descartado pelo Zod.
 */
router.patch(
  '/sessions/:publicToken',
  checkoutSessionRateLimit,
  validateBody(updateCheckoutSessionSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const session = await checkoutService.updateSession(req.params.publicToken as string, req.body);
      res.json({ session });
    } catch (error) {
      handleError(error, res, 'atualizar sessão');
    }
  }
);

/**
 * POST /api/checkout/sessions/:publicToken/submit — finalização SEM cobrança.
 *
 * Não há gateway integrado: a sessão vai para `payment_pending` e a contratação
 * segue por contato comercial. Nenhuma `Subscription` paga é criada aqui.
 */
router.post(
  '/sessions/:publicToken/submit',
  checkoutSessionRateLimit,
  validateBody(submitCheckoutSessionSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await checkoutService.submitSession(req.params.publicToken as string, req.body);
      res.json(result);
    } catch (error) {
      handleError(error, res, 'finalizar sessão');
    }
  }
);

export default router;
