import { Router, Request, Response } from 'express';

import { validateBody } from '../../middlewares/validate.middleware';
import {
  adSpendUpsertSchema,
  metricsPeriodQuerySchema,
  type AdSpendUpsertInput,
} from '../../schemas/metrics.schema';
import { adminMetricsService } from '../../services/admin-metrics.service';
import { siteVisitService } from '../../services/site-visit.service';

/**
 * Métricas da plataforma para o backoffice.
 *
 * A guarda de `master` já está aplicada na raiz (`admin/index.ts`); NÃO a
 * repita aqui — repetir é o começo do dia em que alguém acrescenta uma rota e
 * esquece a linha, que é a classe de falha (guarda declarada e não aplicada)
 * que a guarda única fechou.
 *
 * Cada bloco do dashboard tem rota própria além do `/overview` porque a tela
 * atualiza pedaços em ritmos diferentes: o funil muda a cada minuto, a receita
 * a cada pagamento, os indicadores uma vez por semana. Um endpoint só obrigaria
 * a recarregar tudo para atualizar qualquer coisa.
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

function handleError(error: unknown, res: Response, context: string): void {
  console.error(`Erro nas métricas da plataforma (${context}):`, error);
  res.status(500).json({ error: 'Erro interno ao calcular as métricas da plataforma.' });
}

/**
 * Fator comum das cinco rotas de leitura: valida o período e delega.
 *
 * Sem `startDate`/`endDate` o serviço usa os últimos 30 dias — o padrão é dele,
 * não da rota, para o mesmo intervalo valer quando o dashboard e um job
 * chamarem o mesmo relatório.
 */
function periodRoute<T>(
  context: string,
  load: (range: { startDate?: Date; endDate?: Date }) => Promise<T>
) {
  return async (req: Request, res: Response): Promise<void> => {
    const parsed = metricsPeriodQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      badQuery(res, parsed.error.issues);
      return;
    }

    try {
      res.json(await load(parsed.data));
    } catch (error) {
      handleError(error, res, context);
    }
  };
}

/** GET /api/admin/metrics/overview — funil, receita, indicadores e origem de uma vez. */
router.get(
  '/overview',
  periodRoute('overview', (range) => adminMetricsService.getOverview(range))
);

/** GET /api/admin/metrics/funnel — visitas → leads → checkout → pagos, uma fonte só. */
router.get(
  '/funnel',
  periodRoute('funil', (range) => adminMetricsService.getFunnel(range))
);

/**
 * GET /api/admin/metrics/revenue — MRR, caixa, mix, churn e renovações.
 *
 * `mrrCents` e `cashInPeriodCents` são grandezas DIFERENTES e a tela precisa
 * exibi-las em colunas separadas. Ver o cabeçalho de `admin-metrics.service`.
 */
router.get(
  '/revenue',
  periodRoute('receita', (range) => adminMetricsService.getRevenue(range))
);

/** GET /api/admin/metrics/indicators — os 5 indicadores por coorte semanal, com semáforo. */
router.get(
  '/indicators',
  periodRoute('indicadores', (range) => adminMetricsService.getIndicators(range))
);

/** GET /api/admin/metrics/sources — visitas, leads e pagos por origem, lado a lado. */
router.get(
  '/sources',
  periodRoute('origem', (range) => adminMetricsService.getSources(range))
);

/**
 * GET /api/admin/metrics/visits — detalhe da contagem própria (por dia, página
 * e origem). Separado de `/funnel`, que só precisa do total.
 */
router.get(
  '/visits',
  periodRoute('visitas', (range) => siteVisitService.summary(range))
);

// ─── Gasto de mídia (entrada manual) ─────────────────────────────────────────

/**
 * GET /api/admin/metrics/ad-spend — o que já foi lançado no período.
 *
 * Existe porque não há integração com Meta/Google Ads: o gasto é digitado. Sem
 * esta lista, corrigir um valor lançado errado exigiria adivinhar o que está
 * gravado — e um gasto errado não aparece como erro, aparece como CAC ruim.
 */
router.get(
  '/ad-spend',
  periodRoute('gasto de mídia', (range) => adminMetricsService.listAdSpend(range))
);

/**
 * PUT /api/admin/metrics/ad-spend — lança ou substitui o gasto de uma semana e
 * canal.
 *
 * `PUT` e não `POST` porque a operação é idempotente por `(weekStart, channel)`:
 * lançar duas vezes a mesma semana corrige o valor em vez de somar duas linhas.
 * Com `POST` criando, o operador que clicasse duas vezes dobraria o gasto da
 * semana — e o CAC dobrado passaria por resultado ruim, não por erro de
 * digitação.
 */
router.put(
  '/ad-spend',
  validateBody(adSpendUpsertSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const row = await adminMetricsService.upsertAdSpend(req.body as AdSpendUpsertInput);
      res.json(row);
    } catch (error) {
      handleError(error, res, 'lançar gasto de mídia');
    }
  }
);

export default router;
