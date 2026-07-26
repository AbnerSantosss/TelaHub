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
 * ── Por que a checagem é na ESCRITA e não na leitura ────────────────────────
 * O gate roda quando o display é salvo (`POST /api/displays`), nunca quando o
 * Player busca o conteúdo. Bloquear na leitura faria a tela de um cliente pagante
 * — ou de alguém cuja degustação acabou — ficar em branco no meio do expediente,
 * que é exatamente o problema que o produto promete resolver. Consequência
 * aceita: um display já publicado com vídeo continua tocando depois do 7º dia; a
 * pressão de upgrade aparece no momento em que a pessoa tenta editar/republicar.
 */

/** Janela de degustação de vídeo no plano Grátis, em dias. */
export const FREE_VIDEO_TRIAL_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Tipos de widget que exigem plano pago.
 *
 * Só `VIDEO` está aqui hoje, de propósito: as demais features do catálogo
 * (`powerbi`, `api-externa`, `white-label`) ainda NÃO são aplicadas em nenhum
 * lugar do sistema, e ligá-las de uma vez tiraria recurso de quem já usa. Para
 * cobrar por elas, basta acrescentar o tipo aqui — o resto do mecanismo já está
 * pronto.
 */
export const PAID_WIDGET_TYPES = new Set(['VIDEO']);

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
 * Varre as páginas de um display e devolve os tipos de widget que exigem plano
 * pago encontrados no payload.
 *
 * Percorre a estrutura de forma defensiva (recursiva, tolerante a formato) em vez
 * de assumir `pages[].layout[].type`: o formato de página mudou ao longo do
 * projeto (existe wrapper `{ __orientation, items }`, `layout` do grid e
 * `widgets` de posicionamento absoluto no formato legado). Um gate que só olha
 * um dos formatos é um gate que se burla salvando no outro.
 */
export function findPaidWidgetTypes(pages: unknown): string[] {
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

    if (typeof record.type === 'string' && PAID_WIDGET_TYPES.has(record.type.toUpperCase())) {
      found.add(record.type.toUpperCase());
    }

    Object.values(record).forEach(walk);
  };

  walk(pages);
  return [...found];
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
