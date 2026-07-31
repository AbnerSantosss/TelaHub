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
 * ── Regra dos widgets de BI ─────────────────────────────────────────────────
 * Power BI, Airtable, Google Docs, Office e PDF são o que a página de vendas
 * anuncia como recurso do plano Rede. Aqui a regra é por PLANO (feature
 * `powerbi`), sem degustação: quem não tem a feature não publica. Diferente do
 * vídeo, que é por tempo.
 *
 * ── Por que a checagem é na ESCRITA e não na leitura ────────────────────────
 * O gate roda quando o display é salvo (`POST /api/displays`), nunca quando o
 * Player busca o conteúdo. Bloquear na leitura faria a tela de um cliente pagante
 * — ou de alguém cuja degustação acabou — ficar em branco no meio do expediente,
 * que é exatamente o problema que o produto promete resolver. Consequência
 * aceita: um display já publicado com vídeo continua tocando depois do 7º dia; a
 * pressão de upgrade aparece no momento em que a pessoa tenta editar/republicar.
 *
 * Isso vale igual para os widgets de BI, e ali a consequência é ainda mais
 * importante: quando o gate de `powerbi` foi ligado (2026-07-31) já havia
 * contas usando esses widgets de graça, porque a feature era vendida mas nunca
 * aplicada. Bloquear na leitura apagaria o painel dessas telas de uma hora para
 * outra. Bloqueando só na escrita, a tela publicada continua funcionando e a
 * conversa de upgrade acontece quando a pessoa vai editar.
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
 * Widgets de BI/documento, cobertos pela feature `powerbi` (plano Rede).
 *
 * Exatamente os cinco que a página de vendas anuncia como recurso do Rede
 * ("Power BI, Airtable e planilhas na TV" + "Google Docs, Office e PDF na
 * tela"). A lista é essa e não a categoria "Integrações" inteira de propósito:
 * `MARKET_WATCH`, `BROWSER_SNAPSHOT` e `EMBED_HTML` estão no mesmo grupo do
 * editor mas **nunca foram vendidos como recurso de plano pago** — cobrá-los
 * agora seria tirar do cliente algo que nenhuma página prometeu cobrar. Gate
 * novo só pode alcançar o que a oferta já dizia que era pago.
 *
 * Grafia conferida contra o enum `WidgetType` do frontend (`frontend/types.ts`):
 * é `POWER_BI` com underscore, não `POWERBI` — que é o nome da FEATURE.
 */
export const BI_WIDGET_TYPES = new Set([
  'POWER_BI',
  'AIRTABLE',
  'GOOGLE_DOCS',
  'OFFICE_DOCS',
  'PDF_DOCUMENT',
]);

/** Feature do catálogo que libera os widgets de `BI_WIDGET_TYPES`. */
export const BI_FEATURE_KEY = 'powerbi';

export interface VideoEntitlement {
  allowed: boolean;
  /** `true` quando o acesso vem da degustação, não do plano pago. */
  viaTrial: boolean;
  /** Dias inteiros restantes de degustação (0 quando expirou ou não se aplica). */
  trialDaysRemaining: number;
}

/**
 * Decide se a organização pode publicar vídeo.
 *
 * A regra é definida pelo NEGATIVO — só o plano gratuito é restrito — para que
 * qualquer plano pago novo que entre no catálogo já nasça com vídeo liberado,
 * sem precisar mexer aqui.
 */
export function resolveVideoEntitlement(
  subscription: Pick<SubscriptionWithPlan, 'createdAt' | 'plan'> | null | undefined,
  now: Date = new Date()
): VideoEntitlement {
  // Sem assinatura não há como afirmar que é plano gratuito. Falhamos ABERTO
  // aqui de propósito: dados legados (organizações criadas antes da cobrança
  // existir) não têm assinatura, e bloquear vídeo nelas seria remover um recurso
  // que a pessoa já usava. Quem barra o acesso sem assinatura é o
  // `requireActiveSubscription`, não este serviço.
  if (!subscription?.plan) {
    return { allowed: true, viaTrial: false, trialDaysRemaining: 0 };
  }

  if (!isFreePlan(subscription.plan)) {
    return { allowed: true, viaTrial: false, trialDaysRemaining: 0 };
  }

  const trialEndsAt = new Date(subscription.createdAt.getTime() + FREE_VIDEO_TRIAL_DAYS * DAY_MS);
  const msRemaining = trialEndsAt.getTime() - now.getTime();

  if (msRemaining > 0) {
    return {
      allowed: true,
      viaTrial: true,
      trialDaysRemaining: Math.ceil(msRemaining / DAY_MS),
    };
  }

  return { allowed: false, viaTrial: false, trialDaysRemaining: 0 };
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

/** Widgets de BI/documento presentes no payload (feature `powerbi`). */
export function findBiWidgetTypes(pages: unknown): string[] {
  return findWidgetTypes(pages, BI_WIDGET_TYPES);
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
