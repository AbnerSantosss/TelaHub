import { Router, Request, Response } from 'express';
import { userService } from '../services/user.service';
import { isTermsAcceptancePending, recordTermsAcceptance } from '../services/auth.service';
import { authMiddleware } from '../middlewares/auth.middleware';
import { authRateLimit } from '../middlewares/rate-limit.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { acceptTermsSchema, PRIVACY_VERSION, TERMS_VERSION } from '../schemas/signup.schema';

const router = Router();

// POST /api/auth/login
router.post('/login', authRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email/username e senha são obrigatórios.' });
      return;
    }

    const result = await userService.login(email.trim(), password);

    if (!result) {
      res.status(401).json({ error: 'Credenciais inválidas.' });
      return;
    }

    // Uma consulta a mais, só no login, para saber se o aceite está pendente.
    // Vale a pena: sem isto o painel só descobriria a pendência no `/me`
    // seguinte, e a tela de aceite apareceria DEPOIS de a pessoa já ter
    // navegado — que é justamente o que o consentimento prévio não permite.
    const stored = await userService.getById(result.user.id);

    res.json({
      ...result,
      user: {
        ...result.user,
        termsAcceptancePending: stored ? isTermsAcceptancePending(stored) : false,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
      },
    });
  } catch (error: any) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno ao processar login.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await userService.getById(req.user!.id);

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      // O frontend precisa saber o tenant do usuário: `null` só acontece no
      // role `master`, que opera acima das organizações.
      organizationId: user.organizationId ?? null,
      // Senha ainda é a provisória enviada por e-mail — o painel exige a troca
      // antes de liberar o resto. Também vem aqui (e não só no login) porque
      // uma sessão já aberta precisa cair na exigência ao recarregar a página.
      mustChangePassword: user.mustChangePassword,
      // Quem se cadastrou antes de 2026-09-05 nunca aceitou nada, e quem
      // aceitou uma versão anterior aceitou outro texto. Nos dois casos o
      // painel pede o aceite no próximo acesso. As versões vigentes vão junto
      // para o painel saber qual documento exibir — sem elas ele teria que
      // repetir a data em código e as duas cópias divergiriam na primeira
      // mudança de política.
      termsAcceptancePending: isTermsAcceptancePending(user),
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
    });
  } catch (error: any) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/**
 * POST /api/auth/accept-terms — aceite pendente da base existente.
 *
 * Autenticada de propósito: o aceite é de UMA pessoa identificada, então quem
 * assina é o dono do token, nunca um id vindo do corpo — senão qualquer um
 * "aceitaria" pelos outros. A data é a de agora; não existe retroatividade.
 */
router.post(
  '/accept-terms',
  authMiddleware,
  validateBody(acceptTermsSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const accepted = await recordTermsAcceptance(req.user!.id, req.body);

      if (!accepted) {
        res.status(404).json({ error: 'Usuário não encontrado.' });
        return;
      }

      res.json({
        message: 'Aceite registrado.',
        termsAcceptedAt: accepted.termsAcceptedAt.toISOString(),
        termsVersion: accepted.termsVersion,
        privacyVersion: accepted.privacyVersion,
        // Calculado, não chumbado em `false`: se um painel em cache aceitar uma
        // versão antiga, a pendência CONTINUA — e é melhor o cliente ver isso
        // na resposta do que descobrir no próximo `/me` que nada mudou.
        termsAcceptancePending: isTermsAcceptancePending(accepted),
      });
    } catch (error: any) {
      console.error('Erro ao registrar aceite dos termos:', error);
      res.status(500).json({ error: 'Não foi possível registrar o aceite. Tente novamente.' });
    }
  }
);

// POST /api/auth/logout (client-side — apenas confirma)
router.post('/logout', (req: Request, res: Response): void => {
  res.json({ message: 'Logout realizado com sucesso.' });
});

export default router;
