import { Router, Request, Response } from 'express';
import { planService } from '../services/plan.service';

const router = Router();

/**
 * GET /api/plans — catálogo público de planos ativos (consumido pela landing).
 * Só expõe preço, limites e features; nada de ids internos ou dados de gateway.
 *
 * Ordem: `gratis` (porta de entrada freemium) → planos pagos por preço →
 * `enterprise` (sob consulta). `limits.*: null` = ilimitado — nos planos pagos
 * `maxDevices` é sempre `null`, porque quem limita a expansão é a fatura por
 * tela ativa, não uma trava no software.
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const plans = await planService.listActivePublic();
    res.json({
      currency: 'BRL',
      billingUnit: 'tela-ativa/mes',
      /** Regras comerciais que valem para todo o catálogo. */
      billingPolicy: {
        /** Plano de entrada: 1 tela grátis para sempre, sem prazo e sem cartão. */
        entryPlanCode: 'gratis',
        freeScreens: 1,
        trialDays: 0,
        creditCardRequired: false,
        /** A cobrança começa na 2ª tela; a 1ª nunca é faturada. */
        chargesFromScreen: 2,
        /** Primeiro ciclo rateado pelos dias restantes. */
        proration: 'proporcional-ao-periodo',
        /** Nunca cobramos período já usado de graça (ao contrário do Yodeck). */
        retroactiveCharges: false,
      },
      plans,
    });
  } catch (error) {
    console.error('Erro ao listar planos:', error);
    res.status(500).json({ error: 'Erro interno ao carregar os planos.' });
  }
});

export default router;
