/**
 * URLs dos outros dois apps do produto.
 *
 * São três frontends publicados de forma independente (ADR-001, ver
 * `Checkout/README.md`): o site de vendas, o checkout e este painel. O painel
 * precisa dos endereços dos outros dois para mandar o usuário contratar — e
 * como cada um vive num domínio próprio, os links são absolutos.
 *
 * Os defaults apontam para os endereços PUBLICADOS (hoje, os da versão dev) de
 * propósito: o build roda no Docker sem receber build args por padrão, e um
 * default de localhost quebraria o botão de contratação numa imagem publicada.
 * A falha só apareceria no clique de quem ia pagar. Em desenvolvimento,
 * sobrescreva no `.env` local.
 *
 * ⚠️ `VITE_*` é resolvido em tempo de BUILD. Trocar o domínio exige rebuild da
 * imagem; alterar a variável no Portainer não tem efeito.
 */

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

/**
 * Site de vendas público (SSR/SEO).
 *
 * ⚠️ Existe UM subdomínio para o site: `devtelahublandingpage.proxserverabner.site`.
 * É o endereço da versão dev, que substituiu o antigo subdomínio `vendas.` (fora
 * do ar). Precisa bater com o que o compose do site publica e com o `canonical`
 * de `apps/site/index.html`. Um default que não responde leva cada link do painel
 * montado daqui (planos, Termos, Política de Privacidade) a uma URL morta. A
 * falha só aparece no clique de quem já está dentro do produto querendo pagar ou
 * conferir o contrato. Quando a versão virar produção com outro nome, troque
 * este default junto com o do checkout.
 */
export const SITE_URL = stripTrailingSlash(
  import.meta.env.VITE_SITE_URL || 'https://devtelahublandingpage.proxserverabner.site'
);

/** App de checkout. É ele que conduz a contratação de plano pago. */
export const CHECKOUT_URL = stripTrailingSlash(
  import.meta.env.VITE_CHECKOUT_URL || 'https://devtelahubcheckout.proxserverabner.site'
);

/** Seção de planos do site de vendas. */
export const pricingUrl = (): string => `${SITE_URL}/#planos`;

/**
 * Checkout, opcionalmente já com um plano sugerido.
 *
 * Sem `planCode` o checkout abre no passo de escolha de plano — que é o certo
 * quando quem clicou ainda não decidiu qual quer.
 */
export const checkoutUrl = (planCode?: string, screens?: number): string => {
  const params = new URLSearchParams();
  if (planCode) params.set('plan', planCode);
  if (screens && screens > 0) params.set('screens', String(screens));

  const query = params.toString();
  return `${CHECKOUT_URL}/c${query ? `?${query}` : ''}`;
};
