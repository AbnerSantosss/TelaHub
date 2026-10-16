/**
 * URLs dos outros dois apps do produto: o site de vendas e o checkout.
 *
 * Domínio único: site (`/`), painel (`/app/`), checkout (`/checkout/`) e API
 * (`/api/`) moram no mesmo host, atrás do mesmo Nginx. Por isso os padrões são
 * CAMINHOS RELATIVOS: o mesmo build serve em qualquer domínio, e um default
 * absoluto passaria a ser o modo de falha caro (imagem buildada sem override
 * mandando o cliente para o domínio antigo, no clique de quem ia pagar).
 *
 * `VITE_SITE_URL` e `VITE_CHECKOUT_URL` continuam valendo como override. Em dev
 * local cada app roda numa porta, então ali elas são necessárias.
 *
 * ⚠️ `VITE_*` é resolvido em tempo de BUILD. Trocar um override exige rebuild da
 * imagem; alterar a variável no Portainer não tem efeito.
 */

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

/**
 * Site de vendas público (SSR/SEO). Vazio = raiz do mesmo domínio, e os links
 * montados daqui (planos, Termos, Política de Privacidade) ficam `/termos`,
 * `/privacidade`, `/#planos`.
 */
export const SITE_URL = stripTrailingSlash(import.meta.env.VITE_SITE_URL || '');

/** App de checkout. É ele que conduz a contratação de plano pago. */
export const CHECKOUT_URL = stripTrailingSlash(import.meta.env.VITE_CHECKOUT_URL || '/checkout');

/** Seção de planos do site de vendas. */
export const pricingUrl = (): string => `${SITE_URL}/#planos`;

/** Vocabulário do checkout e do banco (`Subscription.billingInterval`). */
export type CheckoutInterval = 'monthly' | 'yearly';

/**
 * Checkout, opcionalmente já com um plano sugerido.
 *
 * Sem `planCode` o checkout abre no passo de escolha de plano, que é o certo
 * quando quem clicou ainda não decidiu qual quer. `plan`, `screens` e
 * `interval` são os nomes que `readSelectionHint()` lê do outro lado; são
 * SUGESTÃO, quem calcula o valor é o servidor.
 */
export const checkoutUrl = (
  planCode?: string,
  screens?: number,
  interval?: CheckoutInterval
): string => {
  const params = new URLSearchParams();
  if (planCode) params.set('plan', planCode);
  if (screens && screens > 0) params.set('screens', String(screens));
  // Só o anual vai explícito: ausente o checkout assume mensal.
  if (interval === 'yearly') params.set('interval', 'yearly');

  const query = params.toString();
  return `${CHECKOUT_URL}/c${query ? `?${query}` : ''}`;
};

// ─── Plano escolhido no site ──────────────────────────────────────────────────
//
// O site manda todo plano self-service para o cadastro (`/cadastro?plano=loja
// &telas=3&intervalo=anual`, que o gateway transforma em `/app/?...#/signup`).
// A conta sempre nasce no grátis; o plano na URL só diz para onde a pessoa vai
// DEPOIS de criar a conta ou entrar: painel (grátis) ou checkout (pago).

/** Plano escolhido no site, no vocabulário do site. */
export interface PlanIntent {
  plano: string;
  telas: number | null;
  intervalo: 'mensal' | 'anual';
}

/**
 * Códigos que NÃO vão para o checkout: o grátis não tem o que pagar, o `trial`
 * é legado e o `enterprise` é sob consulta (não tem preço público). Qualquer
 * outro código vai, e o checkout valida contra o catálogo: código desconhecido
 * abre no passo de escolha de plano, sem cobrar nada errado.
 */
const NOT_SELF_SERVICE_PAID = new Set(['gratis', 'trial', 'enterprise']);

const PLAN_CODE_PATTERN = /^[a-z0-9_-]{1,40}$/;

const readParams = (raw: string): URLSearchParams | null => {
  try {
    return new URLSearchParams(raw);
  } catch {
    return null;
  }
};

/**
 * Lê `plano`, `telas` e `intervalo` da URL de entrada.
 *
 * Procura nos DOIS lugares, nesta ordem: antes do `#` (`/app/?plano=loja#/signup`,
 * que é o que o gateway e o site montam) e dentro do hash (`#/signup?plano=loja`,
 * link escrito à mão ou vindo de navegação interna). Com `HashRouter`, a query
 * do hash não aparece em `window.location.search`; ler só um lado perderia o
 * plano metade das vezes, e a pessoa que escolheu pagar cairia no painel grátis.
 */
export const readPlanIntent = (): PlanIntent | null => {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash || '';
  const hashQueryAt = hash.indexOf('?');
  const sources = [
    readParams(window.location.search),
    hashQueryAt >= 0 ? readParams(hash.slice(hashQueryAt + 1)) : null,
  ];

  for (const params of sources) {
    const plano = params?.get('plano')?.trim().toLowerCase();
    if (!plano || !PLAN_CODE_PATTERN.test(plano)) continue;

    const telasRaw = Number.parseInt(params?.get('telas') ?? '', 10);
    const intervaloRaw = params?.get('intervalo')?.trim().toLowerCase();
    return {
      plano,
      telas: Number.isFinite(telasRaw) && telasRaw > 0 && telasRaw <= 1000 ? telasRaw : null,
      intervalo: intervaloRaw === 'anual' || intervaloRaw === 'yearly' ? 'anual' : 'mensal',
    };
  }

  return null;
};

/** `true` quando o plano escolhido se paga no checkout. */
export const isPaidIntent = (intent: PlanIntent | null): intent is PlanIntent =>
  !!intent && !NOT_SELF_SERVICE_PAID.has(intent.plano);

/** Checkout já com o plano escolhido no site, no vocabulário do checkout. */
export const checkoutUrlForIntent = (intent: PlanIntent): string =>
  checkoutUrl(
    intent.plano,
    intent.telas ?? undefined,
    intent.intervalo === 'anual' ? 'yearly' : 'monthly'
  );
