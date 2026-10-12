import { z } from 'zod';

/**
 * Contratos de entrada das métricas da plataforma: período do backoffice,
 * `pageview` público e gasto de mídia manual.
 *
 * Os três têm posturas DIFERENTES de propósito, e misturá-las é o erro fácil:
 *   - período e gasto são digitados por um operador `master` → parâmetro
 *     inválido tem que devolver 400, senão o painel mostra um número errado
 *     sem ninguém saber que a data não foi entendida;
 *   - `pageview` vem de um navegador anônimo → campo malformado é DESCARTADO,
 *     nunca rejeitado. Uma visita não pode "falhar": o visitante não pediu
 *     nada, e quebrar a navegação dele para salvar uma métrica é o pior
 *     negócio possível (mesma regra que [[medicao-e-atribuicao]] §8 aplica à
 *     UTM malformada no cadastro).
 */

/**
 * Trata string vazia como ausente. Igual ao helper de `checkout.schema.ts`:
 * `?startDate=` na URL é o que um formulário vazio manda, e sem isto
 * `z.coerce.date('')` vira `Invalid Date` e derruba a tela inteira.
 */
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema.optional()
  );

const dateField = z.coerce.date({ message: 'Data inválida (use ISO 8601).' });

/** Período de qualquer relatório do backoffice. Sem nada: últimos 30 dias (o serviço decide). */
export const metricsPeriodQuerySchema = z.object({
  startDate: optional(dateField),
  endDate: optional(dateField),
});

export type MetricsPeriodQuery = z.infer<typeof metricsPeriodQuerySchema>;

// ─── POST /api/events/pageview ───────────────────────────────────────────────

/**
 * Texto opcional que NUNCA falha: o que não for string vira ausente, e o que
 * for longo demais é truncado em vez de rejeitado.
 *
 * `.max()` puro não serve aqui: ele transformaria uma URL de campanha comprida
 * num 400 e a visita sumiria da contagem — exatamente o buraco que a contagem
 * própria foi criada para fechar (§2.7 do plano: o funil precisa ter numerador
 * e denominador da MESMA fonte).
 */
const softText = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed.slice(0, max);
  }, z.string().optional());

export const pageviewSchema = z.object({
  /**
   * Caminho da página. Não é obrigatório e não valida formato: o serviço
   * normaliza (tira query string, força a barra inicial, trunca). Query string
   * é descartada LÁ, não aqui, porque é onde mora a regra — e ela pode carregar
   * dado pessoal (e-mail em link de campanha), que não pode entrar no banco.
   */
  path: softText(1000),
  /**
   * Referrer completo como o navegador manda. Só o HOST é guardado; ver
   * `referrerHostOf` em `site-visit.service.ts`. Aceitamos a URL inteira aqui
   * porque descartar no serviço é uma regra só, num lugar só.
   */
  referrer: softText(1000),
  utmSource: softText(120),
  utmMedium: softText(120),
  utmCampaign: softText(120),
});

export type PageviewInput = z.infer<typeof pageviewSchema>;

// ─── Gasto de mídia (entrada manual) ─────────────────────────────────────────

/**
 * Canais aceitos. Lista FECHADA de propósito: a chave única de `AdSpend` é
 * `(weekStart, channel)`, então "Meta", "meta " e "facebook" criariam três
 * linhas para o mesmo dinheiro e o CAC da semana sairia dividido por três.
 */
export const AD_SPEND_CHANNELS = ['meta', 'google', 'outros'] as const;

export type AdSpendChannel = (typeof AD_SPEND_CHANNELS)[number];

export const adSpendUpsertSchema = z.object({
  /**
   * Qualquer dia da semana medida. O serviço normaliza para a SEGUNDA-FEIRA
   * antes de gravar — o operador que digitar quarta-feira não pode criar um
   * segundo balde para a mesma semana, senão o indicador some (o balde novo
   * nunca casa com a coorte).
   */
  weekStart: dateField,
  channel: z.enum(AD_SPEND_CHANNELS, { message: 'Canal inválido (meta, google ou outros).' }),
  /**
   * Em CENTAVOS, como todo dinheiro deste projeto. O teto de R$ 1.000.000 por
   * semana existe só para pegar o dedo escorregado que digita o valor em
   * centavos achando que é em reais (ou vice-versa) — um CAC calculado sobre
   * um gasto 100× maior não parece errado, parece "campanha ruim".
   */
  amountCents: z.coerce
    .number({ message: 'Informe o valor em centavos.' })
    .int('O valor deve ser inteiro (centavos).')
    .min(0, 'O valor não pode ser negativo.')
    .max(100_000_000, 'Valor alto demais para uma semana. Confira se está em centavos.'),
  note: optional(z.string().trim().max(500)),
});

export type AdSpendUpsertInput = z.infer<typeof adSpendUpsertSchema>;
