import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware, masterMiddleware } from '../middlewares/auth.middleware';
import { userService } from '../services/user.service';

const router = Router();

// GET /api/users (autenticado — qualquer usuário pode ver a lista)
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await userService.getAll();
    res.json(users);
  } catch (error: any) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

// POST /api/users/invite (autenticado — convida um novo usuário por e-mail)
router.post('/invite', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, role } = req.body;

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Informe um e-mail válido.' });
      return;
    }

    const user = await userService.inviteUser(email.trim(), role);
    res.status(201).json({ 
      message: `Convite enviado com sucesso para ${email}!`, 
      user 
    });
  } catch (error: any) {
    console.error('Erro ao convidar usuário:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Este e-mail já está cadastrado no sistema.' });
      return;
    }
    res.status(400).json({ error: error.message || 'Erro ao convidar usuário.' });
  }
});

// POST /api/users/:id/resend-invite (ADMIN — reenvia convite com nova senha)
router.post('/:id/resend-invite', authMiddleware, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await userService.resendInvite(req.params.id as string);
    res.json(result);
  } catch (error: any) {
    console.error('Erro ao reenviar convite:', error);
    res.status(400).json({ error: error.message || 'Erro ao reenviar convite.' });
  }
});

// POST /api/users/:id/send-reset (ADMIN — envia email de redefinição para o usuário)
router.post('/:id/send-reset', authMiddleware, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await userService.adminSendPasswordReset(req.params.id as string);
    res.json(result);
  } catch (error: any) {
    console.error('Erro ao enviar reset de senha:', error);
    res.status(400).json({ error: error.message || 'Erro ao enviar reset de senha.' });
  }
});

// POST /api/users/forgot-password (PÚBLICO — solicita reset de senha)
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Informe um e-mail válido.' });
      return;
    }

    const result = await userService.requestPasswordReset(email.trim());
    res.json(result);
  } catch (error: any) {
    console.error('Erro no forgot password:', error);
    res.status(400).json({ error: error.message || 'Erro ao processar solicitação.' });
  }
});

// POST /api/users/reset-password (PÚBLICO — reseta a senha com token)
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    const result = await userService.resetPassword(token, password);
    res.json(result);
  } catch (error: any) {
    console.error('Erro ao redefinir senha:', error);
    res.status(400).json({ error: error.message || 'Erro ao redefinir senha.' });
  }
});

// DELETE /api/users/:id (ADMIN ONLY — somente admin pode excluir)
router.delete('/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await userService.delete(req.params.id as string);
    res.json({ message: 'Usuário removido com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro ao deletar usuário.' });
  }
});

// PUT /api/users/me/email (autenticado + masterMiddleware — atualiza o próprio e-mail)
router.put('/me/email', authMiddleware, masterMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'E-mail é obrigatório.' });
      return;
    }
    const result = await userService.updateEmail(req.user!.id, email.trim());
    res.json({ message: 'E-mail atualizado com sucesso.', user: result });
  } catch (error: any) {
    console.error('Erro ao atualizar e-mail:', error);
    res.status(400).json({ error: error.message || 'Erro ao atualizar e-mail.' });
  }
});

// PUT /api/users/me/password (autenticado — qualquer usuário pode alterar sua própria senha)
router.put('/me/password', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' });
      return;
    }
    const result = await userService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json(result);
  } catch (error: any) {
    console.error('Erro ao alterar senha:', error);
    res.status(400).json({ error: error.message || 'Erro ao alterar senha.' });
  }
});

// PUT /api/users/me/name (autenticado — qualquer usuário pode alterar seu nome)
router.put('/me/name', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Nome é obrigatório.' });
      return;
    }
    const result = await userService.updateName(req.user!.id, name.trim());
    res.json({ message: 'Nome atualizado com sucesso.', user: result });
  } catch (error: any) {
    console.error('Erro ao atualizar nome:', error);
    res.status(400).json({ error: error.message || 'Erro ao atualizar nome.' });
  }
});

export default router;
