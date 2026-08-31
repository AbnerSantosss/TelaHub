import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

import { validateBody } from '../middlewares/validate.middleware';
import {
  createCheckoutSessionSchema,
  startPaymentSchema,
  submitCheckoutSessionSchema,
  updateCheckoutSessionSchema,
} from '../schemas/checkout.schema';
import { CheckoutError, checkoutService } from '../services/checkout.service';
import { paymentService } from '../services/payment.service';
import {
  OFFERED_METHODS,
  PaymentConfigError,
  resolveProvider,
} from '../services/payment-providers';

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
  // Configuração de pagamento inválida é erro do OPERADOR, não do visitante —
  // 503 com a mensagem, para o front distinguir "tente de novo" de "está
  // errado aqui e vai continuar errado até alguém arrumar".
  if (error instanceof PaymentConfigError) {
    console.error(`Configuração de pagamento inválida (${context}):`, error.message);
    res.status(503).json({ error: error.message, code: 'payment_provider_unavailable' });
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
 * `screens` + `interval`; valor enviado pelo cliente é descartado pelo Zod.
 * `interval` (`monthly` | `yearly`) é o seletor anual da interface: ele escolhe
 * QUAL preço do catálogo vale, nunca o preço em si.
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

/**
 * GET /api/checkout/payment-config — o que a tela de pagamento pode oferecer.
 *
 * O front NÃO decide isso sozinho: se ele desenhasse os métodos por conta
 * própria, mostraria Pix num provedor que não faz Pix. E `simulated` precisa
 * vir do servidor porque é o servidor que sabe qual provedor está ativo — um
 * aviso de "pagamento simulado" que o front decidisse sozinho seria a primeira
 * coisa a ficar desatualizada quando o gateway real entrasse.
 */
router.get('/payment-config', checkoutSessionRateLimit, (_req: Request, res: Response): void => {
  try {
    const provider = resolveProvider();
    res.json({
      provider: provider.key,
      providerLabel: provider.label,
      simulated: provider.simulated,
      methods: OFFERED_METHODS.filter((method) => provider.methods.includes(method)),
    });
  } catch (error) {
    handleError(error, res, 'configuração de pagamento');
  }
});

/**
 * POST /api/checkout/sessions/:publicToken/pay — inicia a cobrança.
 *
 * Cartão aprova de forma síncrona (devolve `paid: true`); Pix volta `pending`
 * com o QR, e a confirmação chega depois — pelo webhook do provedor real ou,
 * no simulado, pela rota abaixo.
 */
router.post(
  '/sessions/:publicToken/pay',
  checkoutSessionRateLimit,
  validateBody(startPaymentSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await paymentService.startPayment(req.params.publicToken as string, req.body);
      res.json(result);
    } catch (error) {
      handleError(error, res, 'iniciar pagamento');
    }
  }
);

/**
 * POST /api/checkout/sessions/:publicToken/simulate-payment — confirma um
 * pagamento SIMULADO (o "eu paguei o Pix" da demonstração).
 *
 * ⚠️ ESTA ROTA LIBERA ACESSO PAGO SEM COBRAR NADA. Ela existe só enquanto o
 * gateway real não existe, e por isso tem duas travas:
 *
 *   1. **Só responde se o provedor ativo for simulado.** Com um gateway real
 *      configurado, ela devolve 404 — deixa de existir para o mundo. Não basta
 *      "não usar": uma rota assim precisa sumir sozinha quando o dinheiro
 *      passar a ser de verdade, senão vira a porta dos fundos do produto.
 *   2. A própria seleção do provedor simulado já é bloqueada em produção
 *      (`resolveProvider`), então em produção esta rota é inalcançável por
 *      construção, não por disciplina.
 *
 * Quando o gateway entrar, o substituto é `POST /api/billing/webhook`, com
 * verificação de assinatura do provedor, chamando a MESMA
 * `paymentService.confirmPayment`.
 */
router.post(
  '/sessions/:publicToken/simulate-payment',
  checkoutSessionRateLimit,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const provider = resolveProvider();

      if (!provider.simulated) {
        res.status(404).json({
          error: 'Rota indisponível: o provedor de pagamento ativo é real.',
          code: 'not_found',
        });
        return;
      }

      const session = await checkoutService.getPublicSession(req.params.publicToken as string);

      const outcome = await paymentService.confirmPayment({
        publicToken: req.params.publicToken as string,
        providerKey: provider.key,
        providerChargeId: `sim_manual_${Date.now()}`,
        raw: { confirmedBy: 'simulate-payment-route' },
      });

      res.json({
        ...outcome,
        planCode: session.planCode,
        message: outcome.alreadyPaid
          ? 'Esta contratação já estava paga.'
          : 'Pagamento SIMULADO confirmado. Nenhum valor foi cobrado. ' +
            'A conta está sendo liberada e as credenciais vão para o e-mail informado.',
      });
    } catch (error) {
      handleError(error, res, 'simular pagamento');
    }
  }
);

export default router;
