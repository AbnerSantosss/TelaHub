import type { FeatureOverride } from './plan.service';
import { parseFeatures } from './plan.service';
import { isFreePlan, SubscriptionWithPlan } from './subscription.service';

/**
 * Direitos de uso por tipo de widget.
 *
 * Diferente de **quota** (quantas telas/usuários — já resolvida em
 * `quota.middleware.ts`), aqui a pergunta é *qual conteúdo* o plano permite
 * publicar.
 *
 * ── Regra do vídeo ──────────────────────────────────────────────────────────
 * Vídeo é o item de maior custo de banda e armazenamento, então é pago. Mas o
 * plano Grátis recebe uma **degustação de 7 dias** contados da criação da
 * assinatura: dá tempo de o cliente ver o vídeo rodando na TV da própria loja
 * antes de decidir, o que é bem mais convincente que uma página de vendas.
 *
 * ── Regra dos widgets de documento e de painel ──────────────────────────────
 * Duas features, não uma. O plano comercial v2 (§5.1b) separou o que antes era
 * um gate só:
 *
 *   `documentos` (Loja+) → PDF, Google Docs, Office. Documento na parede é a
 *      cena de uma clínica ou de uma empresa de 1 tela; cobrá-lo como Rede
 *      vendia o degrau errado.
 *   `powerbi`    (Rede+) → Power BI, Airtable, cotações da bolsa, snapshot de
 *      página e HTML próprio — o painel de gestão, que é o que caracteriza o
 *      Rede.
 *
 * Nas duas a regra é por PLANO, sem degustação: quem não tem a feature não
 * publica. Diferente do vídeo, que é por tempo.
 *
 * ── Por que a checagem é na ESCRITA e não na leitura ────────────────────────
 * O gate roda quando o display é salvo (`POST /api/displays`), nunca quando o
 * Player busca o conteúdo. Bloquear na leitura faria a tela de um cliente pagante
 * — ou de alguém cuja degustação acabou — ficar em branco no meio do expediente,
 * que é exatamente o problema que o produto promete resolver. Consequência
 * aceita: um display já publicado com vídeo continua tocando depois do 7º dia; a
 * pressão de upgrade aparece no momento em que a pessoa tenta editar/republicar.
 *
 * Isso vale igual para os widgets de BI e de documento, e ali a consequência é
 * ainda mais importante: quando o gate de `powerbi` foi ligado (2026-07-31) já
 * havia contas usando esses widgets de graça, porque a feature era vendida mas
 * nunca aplicada. Bloquear na leitura apagaria o painel dessas telas de uma hora
 * para outra. Bloqueando só na escrita, a tela publicada continua funcionando e
 * a conversa de upgrade acontece quando a pessoa vai editar. Esta regra não se
 * afrouxa: a cada ampliação do gate (a de 2026-08-30 incluída) ela é o que
 * garante que ninguém acorda com a TV em branco.
 */

/** Janela de degustação de vídeo no plano Grátis, em dias. */
export const FREE_VIDEO_TRIAL_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Tipos de widget cobertos pela regra do vídeo (degustação de 7 dias no Grátis).
 *
 * Só `VIDEO` mora aqui: a regra dele é por TEMPO, não por plano, e por isso não
 * cabe no gate de feature genérico logo abaixo.
 */
export const PAID_WIDGET_TYPES = new Set(['VIDEO']);

/**
 * Widgets de DOCUMENTO, cobertos pela feature `documentos` (plano Loja).
 *
 * Saíram do conjunto de BI em 2026-08-30 (§5.1b do plano comercial v2): PDF,
 * Google Docs e Office não são painel de gestão, são o mural de uma clínica ou
 * de um escritório. Continuam pagos — o que muda é o degrau, que passa a ser o
 * Loja em vez do Rede.
 *
 * Grafia conferida contra o enum `WidgetType` do painel (`apps/painel/types.ts`).
 */
export const DOC_WIDGET_TYPES = new Set(['GOOGLE_DOCS', 'OFFICE_DOCS', 'PDF_DOCUMENT']);

/** Feature do catálogo que libera os widgets de `DOC_WIDGET_TYPES`. */
export const DOC_FEATURE_KEY = 'documentos';

/**
 * Widgets de PAINEL DE GESTÃO, cobertos pela feature `powerbi` (plano Rede).
 *
 * ⚠️ REVERSÃO DELIBERADA (2026-08-30) — leia antes de "consertar" esta lista.
 * O comentário que estava aqui defendia deixar `MARKET_WATCH`,
 * `BROWSER_SNAPSHOT` e `EMBED_HTML` DE FORA do gate, com o argumento de que
 * nenhuma página de vendas os anunciava como recurso pago e que gate novo só
 * pode alcançar o que a oferta já dizia ser pago. O argumento continua correto;
 * o que mudou foi o antecedente: a landing v2 passou a vendê-los explicitamente
 * na linha "Power BI, Bolsa, Snapshot, Airtable, HTML próprio — plano Rede"
 * (§5.1b). A oferta agora diz que são pagos, então o gate os alcança. Se um dia
 * a landing voltar a não anunciá-los, a lista tem que encolher junto — o
 * critério é a oferta publicada, não a conveniência de cobrar.
 *
 * Grafia conferida contra o enum `WidgetType` do painel (`apps/painel/types.ts`):
 * é `POWER_BI` com underscore, não `POWERBI` — que é o nome da FEATURE.
 */
export const BI_WIDGET_TYPES = new Set([
  'POWER_BI',
  'AIRTABLE',
  'MARKET_WATCH',
  'BROWSER_SNAPSHOT',
  'EMBED_HTML',
]);

/** Feature do catálogo que libera os widgets de `BI_WIDGET_TYPES`. */
export const BI_FEATURE_KEY = 'powerbi';

/**
 * Feature que uma CONCESSÃO manual pode usar para liberar vídeo no plano
 * Grátis, depois de vencida a degustação de 7 dias.
 *
 * Não está no catálogo (`prisma/seed-plans.ts`) e não deve estar: nenhum plano
 * vende "vídeo" como item — nos planos pagos ele já vem por não ser Grátis. A
 * chave existe só para o caso que o backoffice atende de verdade ("a degustação
 * dele acabou no meio do piloto, libera por mais 15 dias"), e por isso nasce com
 * `expiresAt` na concessão. Um plano que trouxesse esta feature seria um plano
 * pago dizendo que inclui vídeo — redundante e enganoso.
 */
export const VIDEO_FEATURE_KEY = 'video';

export interface VideoEntitlement {
  allowed: boolean;
  /** `true` quando o acesso vem da degustação, não do plano pago. */
  viaTrial: boolean;
  /** Dias inteiros restantes de degustação (0 quando expirou ou não se aplica). */
  trialDaysRemaining: number;
  /** `true` quando quem liberou foi uma concessão manual do backoffice. */
  viaOverride: boolean;
}

/**
 * Decide se a organização pode publicar vídeo.
 *
 * A regra é definida pelo NEGATIVO — só o plano gratuito é restrito — para que
 * qualquer plano pago novo que entre no catálogo já nasça com vídeo liberado,
 * sem precisar mexer aqui.
 *
 * ── Concessão manual (2026-09-09) ───────────────────────────────────────────
 * O `override` é OPCIONAL no tipo de entrada, e isso muda o comportamento de
 * exatamente ninguém hoje: o chamador de produção (`displays.routes`) monta a
 * assinatura sem ele e continua decidindo só pelo plano e pela degustação. A
 * concessão vale quando — e só quando — quem chama fizer
 * `include: { override: true }`. Deixar o parâmetro obrigatório exigiria mexer
 * na rota de publicação de display, que é o caminho mais quente do produto e
 * está fora do escopo desta frente; deixá-lo fora de vez faria o backoffice
 * prometer uma liberação de vídeo que o gate ignoraria em silêncio — que é
 * pior.
 */
export function resolveVideoEntitlement(
  subscription:
    | (Pick<SubscriptionWithPlan, 'createdAt' | 'plan'> & { override?: FeatureOverride | null })
    | null
    | undefined,
  now: Date = new Date()
): VideoEntitlement {
  // Sem assinatura não há como afirmar que é plano gratuito. Falhamos ABERTO
  // aqui de propósito: dados legados (organizações criadas antes da cobrança
  // existir) não têm assinatura, e bloquear vídeo nelas seria remover um recurso
  // que a pessoa já usava. Quem barra o acesso sem assinatura é o
  // `requireActiveSubscription`, não este serviço.
  if (!subscription?.plan) {
    return { allowed: true, viaTrial: false, trialDaysRemaining: 0, viaOverride: false };
  }

  if (!isFreePlan(subscription.plan)) {
    return { allowed: true, viaTrial: false, trialDaysRemaining: 0, viaOverride: false };
  }

  const trialEndsAt = new Date(subscription.createdAt.getTime() + FREE_VIDEO_TRIAL_DAYS * DAY_MS);
  const msRemaining = trialEndsAt.getTime() - now.getTime();

  if (msRemaining > 0) {
    return {
      allowed: true,
      viaTrial: true,
      trialDaysRemaining: Math.ceil(msRemaining / DAY_MS),
      viaOverride: false,
    };
  }

  // A degustação acabou. Última chance: uma concessão manual ainda válida.
  // Checada por ÚLTIMO de propósito — enquanto a degustação corre, é ela que
  // deve aparecer na resposta (`viaTrial: true`), senão o painel deixaria de
  // mostrar os dias restantes justamente para quem tem uma cortesia
  // sobreposta, e o cliente descobriria o fim do prazo do jeito ruim.
  if (grantsVideoByOverride(subscription.override, now)) {
    return { allowed: true, viaTrial: false, trialDaysRemaining: 0, viaOverride: true };
  }

  return { allowed: false, viaTrial: false, trialDaysRemaining: 0, viaOverride: false };
}

/**
 * `true` quando a concessão manual, AINDA VÁLIDA, libera vídeo.
 *
 * A validade é conferida na leitura, nunca por job — concessão vencida deixa de
 * valer sozinha. Ver a invariante 1 de `subscription-override.service.ts`.
 */
function grantsVideoByOverride(
  override: FeatureOverride | null | undefined,
  now: Date
): boolean {
  if (!override) return false;
  if (override.expiresAt && override.expiresAt.getTime() <= now.getTime()) return false;
  return parseFeatures(override.extraFeatures ?? null).includes(VIDEO_FEATURE_KEY);
}

/**
 * Varre as páginas de um display e devolve quais tipos de `wanted` aparecem no
 * payload.
 *
 * Percorre a estrutura de forma defensiva (recursiva, tolerante a formato) em vez
 * de assumir `pages[].layout[].type`: o formato de página mudou ao longo do
 * projeto (existe wrapper `{ __orientation, items }`, `layout` do grid e
 * `widgets` de posicionamento absoluto no formato legado). Um gate que só olha
 * um dos formatos é um gate que se burla salvando no outro.
 */
export function findWidgetTypes(pages: unknown, wanted: Set<string>): string[] {
  const found = new Set<string>();
  const seen = new Set<object>();

  const walk = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return;

    // Proteção contra referência circular no JSON já parseado.
    if (seen.has(node as object)) return;
    seen.add(node as object);

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    const record = node as Record<string, unknown>;

    if (typeof record.type === 'string' && wanted.has(record.type.toUpperCase())) {
      found.add(record.type.toUpperCase());
    }

    Object.values(record).forEach(walk);
  };

  walk(pages);
  return [...found];
}

/** Widgets cobertos pela regra de vídeo presentes no payload. */
export function findPaidWidgetTypes(pages: unknown): string[] {
  return findWidgetTypes(pages, PAID_WIDGET_TYPES);
}

/** Widgets de painel de gestão presentes no payload (feature `powerbi`). */
export function findBiWidgetTypes(pages: unknown): string[] {
  return findWidgetTypes(pages, BI_WIDGET_TYPES);
}

/** Widgets de documento presentes no payload (feature `documentos`). */
export function findDocWidgetTypes(pages: unknown): string[] {
  return findWidgetTypes(pages, DOC_WIDGET_TYPES);
}

/** Erro de direito de uso — a rota traduz para 402/403. */
export class EntitlementError extends Error {
  readonly widgetTypes: string[];

  constructor(message: string, widgetTypes: string[]) {
    super(message);
    this.name = 'EntitlementError';
    this.widgetTypes = widgetTypes;
  }
}
