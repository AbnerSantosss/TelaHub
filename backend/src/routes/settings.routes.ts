import { Router, Request, Response } from 'express';
import { authMiddleware, masterMiddleware } from '../middlewares/auth.middleware';
import { settingsService } from '../services/settings.service';
import { testSmtpConnection } from '../services/email.service';
import { EMAIL_PROVIDERS, findProvider } from '../services/email-providers';

const router = Router();

// GET /api/settings/smtp/providers (MASTER only — catálogo de provedores para o
// seletor do painel). Vem do servidor, e não de uma constante duplicada no
// frontend, para que corrigir o host de um provedor seja uma alteração só.
router.get('/smtp/providers', authMiddleware, masterMiddleware, (_req: Request, res: Response): void => {
  res.json({ providers: EMAIL_PROVIDERS });
});

// GET /api/settings/smtp (MASTER only — SMTP é da plataforma, não do tenant — retorna configurações de SMTP)
router.get('/smtp', authMiddleware, masterMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const smtp = await settingsService.getSmtpConfig();
    res.json({
      smtp_provider: smtp?.provider || 'gmail',
      smtp_host: smtp?.host || '',
      smtp_port: smtp?.port || 587,
      smtp_secure: smtp?.secure ?? false,
      smtp_user: smtp?.user || '',
      smtp_pass: smtp?.pass ? '••••••••' : '', // Nunca retorna a senha real
      smtp_from_email: smtp?.fromEmail || '',
      smtp_from_name: smtp?.fromName || 'TelaHub',
      configured: !!(smtp?.user && smtp?.pass),
      // 'ambiente' = padrão de fábrica das variáveis SMTP_*; 'banco' = escolha
      // feita aqui no painel. O painel avisa o operador quando ainda está no
      // padrão, para que ele não pense ter configurado algo que não configurou.
      source: smtp?.source || null,
    });
  } catch (error: any) {
    console.error('Erro ao buscar configurações SMTP:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações.' });
  }
});

// POST /api/settings/smtp (MASTER only — SMTP é da plataforma, não do tenant — salva configurações de SMTP)
router.post('/smtp', authMiddleware, masterMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      smtp_user,
      smtp_pass,
      smtp_provider,
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_from_email,
      smtp_from_name,
    } = req.body;

    const providerId = (smtp_provider || 'gmail').toString();
    const preset = findProvider(providerId);
    if (!preset) {
      res.status(400).json({ error: 'Provedor de e-mail desconhecido.' });
      return;
    }

    if (!smtp_user) {
      res.status(400).json({ error: 'Usuário de autenticação é obrigatório.' });
      return;
    }

    // Provedor manual não tem preset de host: sem o campo preenchido, o envio
    // falharia só na hora de mandar o primeiro e-mail — tarde demais.
    const host = (smtp_host || preset.host || '').toString().trim();
    if (!host) {
      res.status(400).json({ error: 'Servidor SMTP (host) é obrigatório para este provedor.' });
      return;
    }

    const port = Number(smtp_port) || preset.port;
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      res.status(400).json({ error: 'Porta SMTP inválida.' });
      return;
    }

    // Se a senha é __KEEP_CURRENT__, mantém a senha atual do banco
    let passToSave = smtp_pass;
    if (smtp_pass === '__KEEP_CURRENT__') {
      const currentConfig = await settingsService.getSmtpConfig();
      passToSave = currentConfig?.pass || '';
    }

    if (!passToSave) {
      res.status(400).json({ error: 'Senha / chave de API é obrigatória.' });
      return;
    }

    // Em SendGrid e Resend o usuário é uma palavra fixa (`apikey`, `resend`), e
    // portanto não serve como remetente. Exigir o endereço aqui evita gerar um
    // `from` inválido que só apareceria como recusa do provedor no envio.
    const fromEmail = (smtp_from_email || (preset.fixedUser ? '' : smtp_user)).toString().trim();
    if (!fromEmail) {
      res.status(400).json({
        error: `O provedor ${preset.label} autentica com o usuário fixo "${preset.fixedUser}". Informe o e-mail remetente verificado.`,
      });
      return;
    }

    await settingsService.setMultiple({
      smtp_provider: providerId,
      smtp_host: host,
      smtp_port: String(port),
      smtp_secure: String(smtp_secure ?? preset.secure),
      smtp_user: smtp_user.toString().trim(),
      smtp_pass: passToSave.toString().trim(),
      smtp_from_email: fromEmail,
      smtp_from_name: (smtp_from_name || 'TelaHub').toString().trim(),
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
