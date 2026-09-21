import { Router, Request, Response } from 'express';

import prisma from '../../lib/prisma';
import { validateBody } from '../../middlewares/validate.middleware';
import {
  listPaymentsQuerySchema,
  listWebhooksQuerySchema,
  retryEventSchema,
} from '../../schemas/admin.schema';
import { adminAuditService } from '../../services/admin-audit.service';
import { auditService } from '../../services/audit.service';
import { eventDispatcherService } from '../../services/event-dispatcher.service';

/**
 * ─── CAIXA, WEBHOOKS E FILA DE EVENTOS ──────────────────────────────────────
 *
 * Guarda de `master` aplicada na raiz (`admin/index.ts`) — não repetir aqui.
 *
 * ── Sobre os caminhos ───────────────────────────────────────────────────────
 * O plano (§4.1) escreve `GET /api/admin/webhooks` e
 * `POST /api/admin/events/:id/retry`. Como o backoffice monta este router em
 * `/payments`, os caminhos reais são `/api/admin/payments/webhooks` e
 * `/api/admin/payments/events/:id/retry`. Ficam aqui, e não em routers novos,
 * porque montar router é mexer em `admin/index.ts` — o arquivo que concentra a
 * guarda e que, por isso mesmo, é o que menos deve ser tocado em paralelo. Os
 * três assuntos são o mesmo de qualquer forma: o dinheiro que entrou, o aviso do
 * gateway de que ele entrou, e o evento interno que deveria ter reagido a isso.
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
 * Período sobre `createdAt`. `endDate` é tratado como INCLUSIVO (`lte`) porque
 * o operador digita "até 30/09" querendo o dia 30 inteiro; com `lt` o relatório
 * perderia o último dia e ninguém desconfiaria de um número que só é 3% menor.
 */
function periodFilter(startDate?: Date, endDate?: Date): { gte?: Date; lte?: Date } | undefined {
  if (!startDate && !endDate) return undefined;
  return { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) };
}

/**
 * `GET /api/admin/payments` — caixa da plataforma inteira.
 *
 * ⚠️ `amountCents` de cada linha é o CAIXA DO CICLO (no anual, os 12 meses),
 * não o mensal equivalente. Somar esta coluna dá RECEITA RECEBIDA, nunca MRR —
 * são perguntas diferentes e confundi-las é o defeito US-A-05. O MRR sai de
 * `estimateMonthlyCents` sobre as assinaturas ativas, que é o que a listagem de
 * organizações devolve.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = listPaymentsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    badQuery(res, parsed.error.issues);
    return;
  }

  const { page, pageSize, status, organizationId, startDate, endDate } = parsed.data;
  const where = {
    ...(status ? { status } : {}),
    ...(organizationId ? { organizationId } : {}),
    ...(periodFilter(startDate, endDate) ? { createdAt: periodFilter(startDate, endDate) } : {}),
  };

  try {
    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        // O nome da organização vem junto: sem ele a tela mostra uma coluna de
        // uuids, e o operador precisa abrir outra aba para saber de quem é cada
        // linha do extrato.
        include: { organization: { select: { id: true, name: true } } },
      }),
    ]);

    res.json({
      payments,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (error) {
    console.error('Erro ao listar pagamentos:', error);
    res.status(500).json({ error: 'Erro ao listar pagamentos.' });
  }
});

/**
 * `GET /api/admin/payments/webhooks` — o que os gateways mandaram.
 *
 * `payload` vem junto de propósito: quando um pagamento não provisionou, o que
 * se quer ver é o corpo CRU que o gateway enviou, não a interpretação que o
 * código fez dele — é para isso que a coluna existe. A rota é do `master`, que
 * já enxerga os dados de todos os tenants; esconder o payload aqui só forçaria a
 * consulta pelo banco.
 */
router.get('/webhooks', async (req: Request, res: Response): Promise<void> => {
  const parsed = listWebhooksQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    badQuery(res, parsed.error.issues);
    return;
  }

  const { page, pageSize, status, provider, startDate, endDate } = parsed.data;
  const where = {
    ...(status ? { status } : {}),
    ...(provider ? { provider } : {}),
    ...(periodFilter(startDate, endDate) ? { receivedAt: periodFilter(startDate, endDate) } : {}),
  };

  try {
    const [total, events] = await Promise.all([
      prisma.webhookEvent.count({ where }),
      prisma.webhookEvent.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({
      events,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (error) {
    console.error('Erro ao listar webhooks:', error);
    res.status(500).json({ error: 'Erro ao listar eventos de webhook.' });
  }
});

/**
 * `POST /api/admin/payments/events/:id/retry` — recoloca na fila um evento de
 * checkout que morreu (`dispatchStatus = failed`).
 *
 * `eventDispatcherService.retryFailed` existe desde o padrão outbox e NUNCA teve
 * rota: até aqui, um evento que estourou as 5 tentativas só voltava por alguém
 * editar a linha no banco. Como a entrega é "pelo menos uma vez" e os tratadores
 * são idempotentes por contrato (ver `checkout-handlers/index.ts`), reenfileirar
 * é seguro — o risco real era o oposto, o evento morto ficar parado para sempre
 * com uma conta não provisionada do outro lado.
 *
 * Só `failed` volta: um `pending` já vai voltar sozinho no backoff, e zerar as
 * tentativas dele reiniciaria o contador de um evento que talvez esteja em loop.
 * O serviço devolve `false` nesse caso, e a rota responde 409 em vez de fingir
 * que fez alguma coisa.
 */
router.post(
  '/events/:id/retry',
  validateBody(retryEventSchema),
  async (req: Request, res: Response): Promise<void> => {
    const eventId = req.params.id as string;
    const { reason } = req.body as { reason: string };

    try {
      const event = await prisma.checkoutEvent.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          type: true,
          dispatchStatus: true,
          dispatchAttempts: true,
          session: { select: { id: true, organizationId: true } },
        },
      });

      if (!event) {
        res.status(404).json({ error: 'Evento não encontrado.', code: 'event_not_found' });
        return;
      }

      const requeued = await eventDispatcherService.retryFailed(eventId);

      if (!requeued) {
        res.status(409).json({
          error: `Só eventos com falha definitiva voltam para a fila. Este está "${event.dispatchStatus}".`,
          code: 'event_not_failed',
        });
        return;
      }

      const organizationId = event.session?.organizationId ?? null;
      const entry = {
        action: 'event.retry',
        entityType: 'checkout_event',
        entityId: event.id,
        reason,
        before: { dispatchStatus: event.dispatchStatus, dispatchAttempts: event.dispatchAttempts },
        after: { dispatchStatus: 'pending', dispatchAttempts: 0 },
        extra: { eventType: event.type, sessionId: event.session?.id ?? null },
      };

      if (organizationId) {
        await adminAuditService.log(req, { ...entry, organizationId });
      } else {
        // Evento de sessão AINDA NÃO convertida: não existe organização para
        // pendurar a trilha. Vai para o `auditService` com `organizationId`
        // nulo, mantendo o prefixo `admin.` — não usar `adminAuditService` aqui
        // é deliberado: o tipo dele exige a organização ALVO justamente para
        // impedir que uma ação sobre um cliente seja gravada sem dono, e
        // inventar um id só para satisfazer o tipo destruiria essa garantia.
        await auditService.log({
          organizationId: null,
          userId: req.user?.id ?? null,
          userEmail: req.user?.email ?? null,
          action: `admin.${entry.action}`,
          entityType: entry.entityType,
          entityId: entry.entityId,
          metadata: { reason, ...entry.extra, performedBy: 'backoffice' },
        });
      }

      res.json({ requeued: true });
    } catch (error) {
      console.error('Erro ao reenfileirar evento:', error);
      res.status(500).json({ error: 'Erro ao reenfileirar o evento.' });
    }
  }
);

export default router;
