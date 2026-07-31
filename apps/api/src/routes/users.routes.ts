import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware, masterMiddleware } from '../middlewares/auth.middleware';
import { authRateLimit } from '../middlewares/rate-limit.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { inviteUserSchema, forgotPasswordSchema, resetPasswordSchema, updateEmailSchema, changePasswordSchema, updateNameSchema } from '../schemas/users.schema';
import { userService } from '../services/user.service';
import { requireTenant } from '../middlewares/tenant.middleware';
import { requireActiveSubscription, enforceQuota } from '../middlewares/quota.middleware';
import { auditService } from '../services/audit.service';

const router = Router();

// GET /api/users — apenas usuários da MESMA organização
router.get('/', authMiddleware, requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await userService.getAll(req.tenantId);
    res.json(users);
  } catch (error: any) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

// POST /api/users/invite — o convidado HERDA a organização de quem convidou
router.post('/invite', authMiddleware, requireTenant, requireActiveSubscription, enforceQuota('user'), validateBody(inviteUserSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, role } = req.body;

    const user = await userService.inviteUser(email.trim(), role, req.tenantId);

    void auditService.logFromRequest(req, {
      action: 'user.invite',
      entityType: 'user',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    });

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
router.post('/:id/resend-invite', authMiddleware, requireTenant, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await userService.resendInvite(req.params.id as string, req.tenantId);
    res.json(result);
  } catch (error: any) {
    console.error('Erro ao reenviar convite:', error);
    res.status(400).json({ error: error.message || 'Erro ao reenviar convite.' });
  }
});

// POST /api/users/:id/send-reset (ADMIN — envia email de redefinição para o usuário)
router.post('/:id/send-reset', authMiddleware, requireTenant, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await userService.adminSendPasswordReset(req.params.id as string, req.tenantId);
    res.json(result);
  } catch (error: any) {
    console.error('Erro ao enviar reset de senha:', error);
    res.status(400).json({ error: error.message || 'Erro ao enviar reset de senha.' });
  }
});

// POST /api/users/forgot-password (PÚBLICO — solicita reset de senha)
router.post('/forgot-password', authRateLimit, validateBody(forgotPasswordSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const result = await userService.requestPasswordReset(email.trim());
    res.json(result);
  } catch (error: any) {
    console.error('Erro no forgot password:', error);
    res.status(400).json({ error: error.message || 'Erro ao processar solicitação.' });
  }
});

// POST /api/users/reset-password (PÚBLICO — reseta a senha com token)
router.post('/reset-password', authRateLimit, validateBody(resetPasswordSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    const result = await userService.resetPassword(token, password);
    res.json(result);
  } catch (error: any) {
    console.error('Erro ao redefinir senha:', error);
    res.status(400).json({ error: error.message || 'Erro ao redefinir senha.' });
  }
});

// DELETE /api/users/:id (ADMIN ONLY, e só dentro da própria organização)
router.delete('/:id', authMiddleware, requireTenant, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const result = await userService.deleteScoped(id, req.tenantId);

    if (result === 'not-found') {
      // Usuário de outra organização → 404, sem vazar existência.
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    if (result === 'forbidden-master') {
      res.status(403).json({ error: 'Não é possível remover o proprietário da plataforma.' });
      return;
    }

    void auditService.logFromRequest(req, {
      action: 'user.delete',
      entityType: 'user',
      entityId: id,
    });

    res.json({ message: 'Usuário removido com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro ao deletar usuário.' });
  }
});

// PUT /api/users/me/email (autenticado + masterMiddleware — atualiza o próprio e-mail)
router.put('/me/email', authMiddleware, masterMiddleware, validateBody(updateEmailSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const result = await userService.updateEmail(req.user!.id, email.trim());
    res.json({ message: 'E-mail atualizado com sucesso.', user: result });
  } catch (error: any) {
    console.error('Erro ao atualizar e-mail:', error);
    res.status(400).json({ error: error.message || 'Erro ao atualizar e-mail.' });
  }
});

// PUT /api/users/me/password (autenticado — qualquer usuário pode alterar sua própria senha)
router.put('/me/password', authMiddleware, validateBody(changePasswordSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await userService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json(result);
  } catch (error: any) {
    console.error('Erro ao alterar senha:', error);
    res.status(400).json({ error: error.message || 'Erro ao alterar senha.' });
  }
});

// PUT /api/users/me/name (autenticado — qualquer usuário pode alterar seu nome)
router.put('/me/name', authMiddleware, validateBody(updateNameSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const result = await userService.updateName(req.user!.id, name.trim());
    res.json({ message: 'Nome atualizado com sucesso.', user: result });
  } catch (error: any) {
    console.error('Erro ao atualizar nome:', error);
    res.status(400).json({ error: error.message || 'Erro ao atualizar nome.' });
  }
});

export default router;
