import { Router, Request, Response } from 'express';
import { authMiddleware, masterMiddleware } from '../middlewares/auth.middleware';
import { requireTenant, assertSameTenant } from '../middlewares/tenant.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createOrganizationSchema } from '../schemas/organizations.schema';
import { organizationService } from '../services/organization.service';

const router = Router();

// GET /api/organizations
// `master` vê todas; qualquer outro usuário vê exatamente a sua organização.
router.get('/', authMiddleware, requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const organizations = await organizationService.getAllScoped(req.tenantId);
    res.json(organizations);
  } catch (error: any) {
    console.error('Erro ao listar organizações:', error);
    res.status(500).json({ error: 'Erro ao listar organizações.' });
  }
});

// POST /api/organizations — criar tenant é ato da plataforma, restrito ao master.
// (Auto-atendimento de novos clientes acontece pelo fluxo de signup.)
router.post('/', authMiddleware, masterMiddleware, validateBody(createOrganizationSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const organization = await organizationService.create(name);
    res.status(201).json(organization);
  } catch (error: any) {
    console.error('Erro ao criar organização:', error);
    res.status(500).json({ error: 'Erro ao criar organização.' });
  }
});

// GET /api/organizations/:id/report?startDate=&endDate= — relatório agregado (US-017)
router.get('/:id/report', authMiddleware, requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.params.id as string;

    // Relatório de outra organização → 404 (não vaza existência do tenant).
    if (!assertSameTenant(organizationId, req)) {
      res.status(404).json({ error: 'Organização não encontrada.' });
      return;
    }

    const { startDate, endDate } = req.query;
    const period = {
      startDate: typeof startDate === 'string' && startDate ? new Date(startDate) : undefined,
      endDate: typeof endDate === 'string' && endDate ? new Date(endDate) : undefined,
    };
    const report = await organizationService.getReport(organizationId, period);
    res.json(report);
  } catch (error: any) {
    console.error('Erro ao gerar relatório da organização:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório da organização.' });
  }
});

export default router;
