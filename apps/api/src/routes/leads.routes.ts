import { Router, Request, Response } from 'express';

import { validateBody } from '../middlewares/validate.middleware';
import { authMiddleware, masterMiddleware } from '../middlewares/auth.middleware';
import { leadRateLimit } from '../middlewares/rate-limit.middleware';
import { createLeadSchema } from '../schemas/leads.schema';
import { leadService } from '../services/lead.service';

const router = Router();

/**
 * POST /api/leads — formulário "Falar com a gente" do site.
 *
 * Público: quem preenche ainda não tem conta. Antes desta rota, o site fingia
 * o envio com um `setTimeout` e mostrava "Recebemos seu contato!" — todo lead
 * de plano sob consulta era descartado em silêncio.
 */
router.post(
  '/',
  leadRateLimit,
  validateBody(createLeadSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await leadService.create(req.body, {
        ip: req.ip,
        referrer: req.get('referer'),
        // Só para a medição (`Lead` na Conversions API): user-agent e URL de
        // origem saem do cabeçalho, não do corpo.
        userAgent: req.get('user-agent'),
        sourceUrl: req.get('referer'),
      });

      // Não devolve o lead: o site não precisa do id, e ecoar o registro só
      // daria a quem varre a rota uma confirmação do que foi gravado.
      res.status(201).json({
        message: 'Recebemos seu contato. Nosso time responde em até 1 dia útil.',
      });
    } catch (error) {
      console.error('Erro ao registrar lead:', error);
      res.status(500).json({ error: 'Não foi possível registrar seu contato. Tente novamente.' });
    }
  }
);

/** GET /api/leads/pendentes — leads salvos cujo aviso por e-mail não saiu. */
router.get(
  '/pendentes',
  authMiddleware,
  masterMiddleware,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const leads = await leadService.listNotNotified();
      res.json({ leads, count: leads.length });
    } catch (error) {
      console.error('Erro ao listar leads pendentes:', error);
      res.status(500).json({ error: 'Erro ao listar leads pendentes.' });
    }
  }
);

export default router;
