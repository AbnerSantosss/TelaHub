import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

import { pageviewSchema } from '../schemas/metrics.schema';
import { isFirstVisitToday, siteVisitService } from '../services/site-visit.service';

/**
 * Contagem própria de visitas (`POST /api/events/pageview`).
 *
 * Rota PÚBLICA e anônima de propósito: quem visita o site ainda não tem conta.
 * Não lê cookie, não recebe id de pessoa e não devolve corpo — é um contador,
 * não uma sessão. Ver `services/site-visit.service.ts` para a decisão de
 * agregar na escrita e para o dedupe de único em memória.
 */
const router = Router();

/**
 * Limite por IP.
 *
 * Mora AQUI e não em `middlewares/rate-limit.middleware.ts` porque só esta rota
 * usa: o arquivo de middlewares guarda os limitadores compartilhados, e um
 * limitador de uso único lá vira mais uma constante para alguém confundir com
 * `leadRateLimit` — que é 10 por HORA, e mataria a contagem de visitas na
 * terceira página que qualquer pessoa abrisse.
 *
 * O número é alto de propósito: um condomínio ou escritório inteiro sai por um
 * NAT só (o mesmo raciocínio de `deviceTelemetryRateLimit`), e derrubar a
 * contagem do prédio inteiro por causa de um limite apertado seria perder
 * exatamente o segmento de 2+ telas que a estratégia persegue. O limite existe
 * contra o robô que martelaria a rota para inflar o denominador do funil.
 */
const pageviewRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: (() => {
    const parsed = Number(process.env.PAGEVIEW_RATE_LIMIT);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 600;
  })(),
  standardHeaders: true,
  legacyHeaders: false,
  /**
   * Excedeu? Ainda assim 204.
   *
   * O padrão do `express-rate-limit` é 429 com corpo JSON. Aqui isso apareceria
   * no console do visitante como erro de rede numa página de vendas — e o
   * `fetch` do site trataria como falha. A visita simplesmente não é contada;
   * ninguém do outro lado precisa saber disso.
   */
  handler: (_req: Request, res: Response): void => {
    res.status(204).end();
  },
});

/**
 * POST /api/events/pageview — soma uma visita no balde do dia.
 *
 * DUAS decisões que parecem detalhe e não são:
 *
 * 1. **Responde 204 ANTES de gravar.** A resposta não depende do banco. Se o
 *    Postgres estiver lento ou fora do ar, a navegação de quem está prestes a
 *    comprar não pode ficar esperando um contador — a regra de resiliência de
 *    [[medicao-e-atribuicao]] §7 ("nenhuma função de medição pode lançar")
 *    aplicada ao lado do servidor. Por isso a gravação vai depois, com o erro
 *    engolido num `console.warn`: é log de operação, não erro do visitante.
 *
 * 2. **`isUnique` é decidido no SERVIDOR.** Se o navegador mandasse a flag,
 *    qualquer um inflaria `uniques` num laço, e o indicador de custo por visita
 *    passaria a ser controlado por quem visita. O critério é o hash de IP com
 *    sal do dia, guardado só em memória por 24 h — sem cookie, sem id de
 *    pessoa, sem nada que sobreviva à virada do dia.
 */
router.post('/pageview', pageviewRateLimit, (req: Request, res: Response): void => {
  res.status(204).end();

  // `safeParse` e não `validateBody`: o middleware devolveria 400 num corpo
  // malformado, e este endpoint não rejeita nada — campo estranho é descartado,
  // corpo irrecuperável vira uma visita não contada. O visitante nunca vê erro.
  const parsed = pageviewSchema.safeParse(req.body);
  if (!parsed.success) return;

  const isUnique = isFirstVisitToday(req.ip);

  void siteVisitService
    .record({
      path: parsed.data.path,
      // Só o HOST do referrer é guardado; a URL inteira é descartada dentro do
      // serviço, num lugar só.
      referrer: parsed.data.referrer,
      utmSource: parsed.data.utmSource,
      utmMedium: parsed.data.utmMedium,
      utmCampaign: parsed.data.utmCampaign,
      isUnique,
    })
    .catch((error: unknown) => {
      console.warn('Falha ao contar visita (ignorada):', error);
    });
});

export default router;
