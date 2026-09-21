import { Router, Request, Response } from 'express';

import prisma from '../../lib/prisma';
import { validateBody } from '../../middlewares/validate.middleware';
import { listLeadsQuerySchema, updateLeadSchema } from '../../schemas/admin.schema';
import { auditService } from '../../services/audit.service';

/**
 * ─── LEADS DO FORMULÁRIO "FALAR COM A GENTE" ────────────────────────────────
 *
 * Guarda de `master` aplicada na raiz (`admin/index.ts`) — não repetir aqui.
 *
 * POR QUE ESTA TELA EXISTE: `POST /api/leads` grava desde 2026-08 e a única
 * leitura era `GET /api/leads/pendentes` — que lista os leads cujo E-MAIL DE
 * AVISO não saiu, não os leads em si, e que nenhuma tela consome. Na prática o
 * formulário do plano Enterprise gravava numa tabela que ninguém abria; o
 * `status` (`new|contacted|qualified|discarded`) existia no schema sem nenhuma
 * superfície capaz de mudá-lo, então todo lead ficava `new` para sempre e
 * "quantos leads foram atendidos?" não tinha resposta.
 *
 * ── Por que a auditoria aqui é diferente ────────────────────────────────────
 * `adminAuditService` exige a organização ALVO — e um lead, por definição, ainda
 * não é cliente e não tem organização. Registrar com `organizationId` nulo pelo
 * `auditService` é a única gravação honesta; forjar um id para satisfazer o tipo
 * quebraria a garantia que o serviço de auditoria administrativa oferece (toda
 * ação sobre um CLIENTE tem dono identificável).
 */
const router = Router();

function badQuery(
  res: Response,
  issues: Array<{ path: (string | number | symbol)[]; message: string }>
): void {
  res.status(400).json({
    error: 'Parâmetros inválidos.',
    details: issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  });
}

/**
 * `GET /api/admin/leads` — fila comercial, com filtro por status, período e
 * busca.
 *
 * Ordem `createdAt desc`: lead frio converte muito menos que lead de hoje, então
 * a lista precisa começar por quem acabou de pedir contato. Ordenar por status
 * agruparia bonito e enterraria o pedido de agora abaixo de meses de `new`.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = listLeadsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    badQuery(res, parsed.error.issues);
    return;
  }

  const { page, pageSize, status, search, startDate, endDate } = parsed.data;

  const where = {
    ...(status ? { status } : {}),
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate ? { gte: startDate } : {}),
            // Inclusivo: "até 30/09" para o operador é o dia 30 inteiro.
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { company: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  try {
    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        // `ipHash` fica de fora: é dado pessoal guardado só para deduplicação
        // grosseira e não ajuda ninguém a atender um lead. Mostrar o que não se
        // usa é como um dado sensível acaba num print de tela.
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          phone: true,
          planCode: true,
          status: true,
          notifiedAt: true,
          createdAt: true,
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
          referrer: true,
        },
      }),
    ]);

    res.json({
      leads,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (error) {
    console.error('Erro ao listar leads:', error);
    res.status(500).json({ error: 'Erro ao listar leads.' });
  }
});

/**
 * `PATCH /api/admin/leads/:id` — move o lead na triagem comercial.
 *
 * `PATCH` e não `PUT`: o corpo altera um campo, e o resto do lead (nome,
 * e-mail, atribuição) é do visitante — o backoffice não reescreve o que a pessoa
 * digitou. Nenhuma rota deste arquivo edita conteúdo de lead, só o status dele.
 */
router.patch(
  '/:id',
  validateBody(updateLeadSchema),
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const { status, note } = req.body as { status: string; note?: string };

    try {
      const existing = await prisma.lead.findUnique({
        where: { id },
        select: { id: true, status: true, email: true },
      });

      if (!existing) {
        res.status(404).json({ error: 'Lead não encontrado.', code: 'lead_not_found' });
        return;
      }

      const lead = await prisma.lead.update({
        where: { id },
        data: { status },
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          phone: true,
          planCode: true,
          status: true,
          notifiedAt: true,
          createdAt: true,
        },
      });

      await auditService.log({
        organizationId: null,
        userId: req.user?.id ?? null,
        userEmail: req.user?.email ?? null,
        action: 'admin.lead.status',
        entityType: 'lead',
        entityId: lead.id,
        metadata: {
          from: existing.status,
          to: lead.status,
          note: note ?? null,
          performedBy: 'backoffice',
        },
      });

      res.json({ lead });
    } catch (error) {
      console.error('Erro ao atualizar lead:', error);
      res.status(500).json({ error: 'Erro ao atualizar o lead.' });
    }
  }
);

export default router;
