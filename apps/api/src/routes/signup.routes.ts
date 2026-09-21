import { Router, Request, Response } from 'express';

import { authRateLimit } from '../middlewares/rate-limit.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { checkEmailQuerySchema, signupSchema } from '../schemas/signup.schema';
import { SignupError, signupService } from '../services/signup.service';

const router = Router();

/**
 * POST /api/signup — auto-atendimento público.
 * Cria organização + usuário admin + assinatura no plano `gratis` (freemium:
 * 1 tela para sempre, `status: 'active'`, sem prazo) e devolve token.
 *
 * O corpo também carrega a origem da campanha (`attribution`), o aceite dos
 * termos (`acceptedTerms`, obrigatório) e os identificadores do Pixel
 * (`metaEventId`, `fbp`, `fbc`) — ver `signup.schema.ts`.
 */
router.post(
  '/',
  authRateLimit,
  validateBody(signupSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // IP e user-agent saem da REQUISIÇÃO, nunca do corpo: são o que a Meta
      // usa para casar o cadastro com o clique no anúncio, e valor enviado pelo
      // navegador é valor que dá para forjar.
      const result = await signupService.signup(req.body, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        sourceUrl: req.get('referer'),
      });
      res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof SignupError) {
        res.status(error.status).json({ error: error.message, code: error.code });
        return;
      }

      // Corrida de cadastro simultâneo com o mesmo e-mail/username.
      if (error?.code === 'P2002') {
        res.status(409).json({
          error: 'Este e-mail já está cadastrado. Faça login ou use "esqueci minha senha".',
          code: 'email_taken',
        });
        return;
      }

      console.error('Erro no auto-cadastro:', error);
      res.status(500).json({ error: 'Não foi possível concluir o cadastro. Tente novamente.' });
    }
  }
);

/**
 * GET /api/signup/check-email?email= — validação em tempo real do formulário.
 * Devolve apenas um booleano: nunca expõe dados da conta existente.
 */
router.get('/check-email', authRateLimit, async (req: Request, res: Response): Promise<void> => {
  const parsed = checkEmailQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({
      error: 'E-mail inválido.',
      details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  try {
    const taken = await signupService.isEmailTaken(parsed.data.email);
    res.json({ available: !taken });
  } catch (error) {
    console.error('Erro ao verificar e-mail:', error);
    res.status(500).json({ error: 'Erro interno ao verificar e-mail.' });
  }
});

export default router;
