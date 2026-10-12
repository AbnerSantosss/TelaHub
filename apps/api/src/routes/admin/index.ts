import { Router } from 'express';

import { authMiddleware, masterMiddleware } from '../../middlewares/auth.middleware';

import auditRoutes from './audit.routes';
import { adminDevicesRouter, adminOrgDevicesRouter } from './devices.routes';
import emailRoutes from './email.routes';
import leadsRoutes from './leads.routes';
import metricsRoutes from './metrics.routes';
import organizationsRoutes from './organizations.routes';
import paymentsRoutes from './payments.routes';
import searchRoutes from './search.routes';
import { adminOrgUsersRouter, adminUsersRouter } from './users.routes';

/**
 * Backoffice da plataforma — TUDO aqui é restrito ao `master`.
 *
 * A GUARDA É APLICADA UMA VEZ, NA RAIZ, e nunca rota a rota. Não é estilo: a
 * classe de falha que isso fecha já aconteceu duas vezes neste projeto (guarda
 * declarada e não aplicada ao JSX no `Login`, e o `db push` que "estava
 * documentado"). Com a guarda na raiz, esquecer de proteger uma rota nova exige
 * removê-la daqui — uma ação visível — em vez de simplesmente não escrever uma
 * linha, que é o erro que ninguém enxerga em revisão.
 *
 * Por que `master` e não `admin`: `adminMiddleware` aceita o admin de QUALQUER
 * organização cliente. Estas rotas leem e escrevem dados de todos os tenants —
 * assinaturas, pagamentos, leads, e-mails —, então `admin` aqui seria o
 * vazamento entre clientes que [[seguranca-e-conformidade-tecnica]] registra
 * como a falha mais cara do projeto.
 *
 * NÃO usa `requireTenant`: o escopo do backoffice é a plataforma inteira, e o
 * alvo de cada ação vem do parâmetro da rota (`/organizations/:id`), nunca de
 * um header que o operador poderia esquecer de trocar.
 */
const router = Router();

router.use(authMiddleware);
router.use(masterMiddleware);

// Sub-recursos de uma organização que têm arquivo próprio. Montados ANTES de
// `/organizations`: o que não casar aqui segue para o router de organizações.
router.use('/organizations/:orgId/users', adminOrgUsersRouter);
router.use('/organizations/:orgId/devices', adminOrgDevicesRouter);
router.use('/organizations', organizationsRoutes);
router.use('/users', adminUsersRouter);
router.use('/devices', adminDevicesRouter);
router.use('/audit', auditRoutes);
router.use('/search', searchRoutes);
router.use('/payments', paymentsRoutes);
router.use('/leads', leadsRoutes);
router.use('/email', emailRoutes);
router.use('/metrics', metricsRoutes);

export default router;
