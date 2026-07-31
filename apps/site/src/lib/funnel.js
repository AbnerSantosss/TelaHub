/**
 * Destinos do funil de conversão.
 *
 * A LP não tem backend: ela só decide PARA ONDE mandar quem clicou. Os três
 * apps são publicados separadamente (ADR-001, `Checkout/README.md`), então os
 * links entre eles são absolutos e configuráveis — nunca chumbados, porque o
 * mesmo bundle roda em localhost, na VPS e atrás do Cloudflare Tunnel.
 *
 * Funil híbrido:
 *   - `gratis`     → cadastro direto no painel, sem cartão (é o que esta página
 *                    promete no FAQ; mandar para o checkout seria desmentir).
 *   - `loja`/`rede`→ checkout, com plano e telas já sugeridos na URL.
 *   - `enterprise` → não tem preço público; segue por contato comercial.
 *
 * ⚠️ `VITE_*` é lido em tempo de BUILD, não em runtime. Trocar o domínio exige
 * rebuildar a imagem (ver `Dockerfile`/`docker-compose.yml`), não basta mudar a
 * variável no Portainer.
 */

/**
 * Defaults de PRODUÇÃO, de propósito.
 *
 * O `Dockerfile` builda sem receber build args por padrão; se o default fosse
 * localhost, uma imagem publicada sem configurar nada mandaria todo visitante
 * para uma URL morta — e o erro só apareceria em produção, no clique de quem ia
 * comprar. Errar para o lado de produção é o modo de falha barato: em
 * desenvolvimento o `.env.development` sobrescreve para localhost.
 */
const DEFAULT_CHECKOUT_URL = 'https://checkout.proxserverabner.site';
const DEFAULT_APP_URL = 'https://telahub.proxserverabner.site';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

const stripTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

export const CHECKOUT_URL = stripTrailingSlash(env.VITE_CHECKOUT_URL || DEFAULT_CHECKOUT_URL);
export const APP_URL = stripTrailingSlash(env.VITE_APP_URL || DEFAULT_APP_URL);

/**
 * Parâmetros de atribuição repassados na travessia entre domínios.
 *
 * Site e checkout estão em origens diferentes, então NADA de sessão/cookie
 * atravessa sozinho. Sem repassar isto na URL, toda venda vinda de campanha
 * apareceria como tráfego direto no funil — o checkout lê estes mesmos nomes em
 * `readAttribution()` (`Checkout/src/lib/session.ts`).
 *
 * Os `*clid` não são lidos pelo checkout hoje; seguem junto porque são o
 * identificador de clique do anúncio e perdê-los na travessia é irreversível.
 */
const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
  'ttclid',
  'msclkid',
];

/** Lê a atribuição da URL atual. Seguro em SSR (`entry-server.jsx`). */
function attributionParams() {
  const params = new URLSearchParams();
  if (typeof window === 'undefined') return params;

  try {
    const current = new URLSearchParams(window.location.search);
    for (const key of ATTRIBUTION_KEYS) {
      const value = current.get(key);
      if (value) params.set(key, value);
    }
  } catch {
    // URL malformada não pode derrubar o clique no botão.
  }

  return params;
}

/**
 * URL do checkout com plano e telas sugeridos.
 *
 * `plan` e `screens` são exatamente os nomes que `readSelectionHint()` já lê do
 * outro lado. São SUGESTÃO: quem calcula o valor é o servidor, no PATCH da
 * sessão — a URL não decide preço.
 */
export function checkoutUrl(planCode, screens) {
  const params = attributionParams();
  params.set('plan', planCode);
  if (Number.isFinite(screens) && screens > 0) params.set('screens', String(screens));
  return `${CHECKOUT_URL}/c?${params.toString()}`;
}

/**
 * URL de cadastro no painel.
 *
 * O painel usa `HashRouter`, então a query entra ANTES do `#` — depois dele ela
 * viraria parte da rota e sumiria de `window.location.search`.
 */
export function signupUrl() {
  const query = attributionParams().toString();
  return `${APP_URL}/${query ? `?${query}` : ''}#/signup`;
}

/**
 * Para onde vai um plano. `null` = não há destino self-service; quem chamou
 * deve abrir o caminho comercial (Enterprise).
 */
export function conversionDestination(planCode, screens) {
  switch (planCode) {
    case 'gratis':
      return signupUrl();
    case 'loja':
    case 'rede':
      return checkoutUrl(planCode, screens);
    default:
      return null;
  }
}
