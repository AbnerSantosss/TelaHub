import { Router, Request, Response } from 'express';
import { userService } from '../services/user.service';
import { authMiddleware } from '../middlewares/auth.middleware';
import { authRateLimit } from '../middlewares/rate-limit.middleware';

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

    res.json(result);
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
    });
  } catch (error: any) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /api/auth/logout (client-side — apenas confirma)
router.post('/logout', (req: Request, res: Response): void => {
  res.json({ message: 'Logout realizado com sucesso.' });
});

export default router;
