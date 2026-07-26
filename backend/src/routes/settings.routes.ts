import { Router, Request, Response } from 'express';
import { authMiddleware, masterMiddleware } from '../middlewares/auth.middleware';
import { settingsService } from '../services/settings.service';
import { testSmtpConnection } from '../services/email.service';

const router = Router();

// GET /api/settings/smtp (MASTER only — SMTP é da plataforma, não do tenant — retorna configurações de SMTP)
router.get('/smtp', authMiddleware, masterMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const smtp = await settingsService.getSmtpConfig();
    res.json({
      smtp_user: smtp?.user || '',
      smtp_pass: smtp?.pass ? '••••••••' : '', // Nunca retorna a senha real
      configured: !!(smtp?.user && smtp?.pass),
    });
  } catch (error: any) {
    console.error('Erro ao buscar configurações SMTP:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações.' });
  }
});

// POST /api/settings/smtp (MASTER only — SMTP é da plataforma, não do tenant — salva configurações de SMTP)
router.post('/smtp', authMiddleware, masterMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { smtp_user, smtp_pass } = req.body;

    if (!smtp_user) {
      res.status(400).json({ error: 'E-mail é obrigatório.' });
      return;
    }

    // Se a senha é __KEEP_CURRENT__, mantém a senha atual do banco
    let passToSave = smtp_pass;
    if (smtp_pass === '__KEEP_CURRENT__') {
      const currentConfig = await settingsService.getSmtpConfig();
      passToSave = currentConfig?.pass || '';
    }

    if (!passToSave) {
      res.status(400).json({ error: 'Senha de Aplicativo é obrigatória.' });
      return;
    }

    await settingsService.setMultiple({
      smtp_user: smtp_user.trim(),
      smtp_pass: passToSave.trim(),
    });

    res.json({ message: 'Configurações SMTP salvas com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao salvar configurações SMTP:', error);
    res.status(500).json({ error: 'Erro ao salvar configurações.' });
  }
});

// POST /api/settings/smtp/test (MASTER only — testa conexão SMTP)
router.post('/smtp/test', authMiddleware, masterMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await testSmtpConnection();
    if (result.ok) {
      res.json({ ok: true, message: 'Conexão SMTP verificada com sucesso!' });
    } else {
      res.status(400).json({ ok: false, error: result.error });
    }
  } catch (error: any) {
    console.error('Erro ao testar SMTP:', error);
    res.status(500).json({ ok: false, error: 'Erro interno ao testar conexão.' });
  }
});

// GET /api/settings/smtp/status (autenticado — qualquer usuário pode verificar se SMTP está ativo)
router.get('/smtp/status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const smtp = await settingsService.getSmtpConfig();
    res.json({ configured: !!(smtp?.user && smtp?.pass) });
  } catch (error: any) {
    res.status(500).json({ configured: false });
  }
});

export default router;
