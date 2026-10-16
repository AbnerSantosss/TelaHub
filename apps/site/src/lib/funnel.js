/**
 * Destinos do funil de conversão.
 *
 * A LP não tem backend: ela só decide PARA ONDE mandar quem clicou.
 *
 * Domínio único: site (`/`), painel (`/app/`), checkout (`/checkout/`) e API
 * (`/api/`) moram no mesmo host, atrás do mesmo Nginx. Por isso os destinos
 * padrão são CAMINHOS RELATIVOS, e o mesmo bundle serve em qualquer domínio sem
 * rebuild. As variáveis `VITE_*_URL` continuam valendo como override: em dev
 * local cada app roda numa porta, e o `.env.development` aponta para elas.
 *
 * Funil: todo plano self-service passa pelo CADASTRO primeiro.
 *   - `gratis`      → `/cadastro`, a conta nasce no plano grátis e vai ao painel.
 *   - `loja`/`rede` → `/cadastro` com o plano na URL; depois de criar a conta o
 *                     painel manda para o checkout, já logado. Assim a compra
 *                     cai na organização que a pessoa acabou de criar, em vez
 *                     de o checkout criar uma segunda conta com senha por
 *                     e-mail.
 *   - `enterprise`  → não tem preço público; segue por contato comercial.
 *
 * Contrato do gateway (Nginx): `/cadastro?...` vira `/app/?...#/signup` e
 * `/entrar` vira `/app/#/login`. A query vai ANTES do `#` porque o painel usa
 * `HashRouter`.
 *
 * ⚠️ `VITE_*` é lido em tempo de BUILD, não em runtime. Trocar um override exige
 * rebuildar a imagem, não basta mudar a variável no Portainer.
 */

/**
 * Defaults RELATIVOS, de propósito.
 *
 * Antes eram URLs absolutas de produção, porque cada app tinha o seu
 * subdomínio. Com domínio único, absoluto é o modo de falha caro: uma imagem
 * buildada sem override mandaria o visitante para o domínio antigo.
 *
 * A LP faz UMA chamada de backend: `POST /api/leads`, do formulário "Falar com
 * a gente". No mesmo origin ela não depende mais de `CORS_ORIGINS`.
 */
const DEFAULT_CHECKOUT_URL = '/checkout';
const DEFAULT_API_URL = '/api';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

const stripTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

export const CHECKOUT_URL = stripTrailingSlash(env.VITE_CHECKOUT_URL || DEFAULT_CHECKOUT_URL);
/**
 * Painel. Vazio = domínio único, e aí o cadastro e o login usam os atalhos do
 * gateway (`/cadastro`, `/entrar`). Preenchido = override (dev local), e os
 * links vão direto para as rotas do `HashRouter`.
 */
export const APP_URL = stripTrailingSlash(env.VITE_APP_URL || '');
export const API_URL = stripTrailingSlash(env.VITE_API_URL || DEFAULT_API_URL);

/**
 * Parâmetros de atribuição repassados na travessia entre domínios.
 *
 * Mesmo no domínio único a UTM só existe na URL de chegada: a navegação para
 * o cadastro e dali para o checkout troca de página, então sem repassar isto
 * na URL toda venda vinda de campanha apareceria como tráfego direto. O painel
 * (`Signup.tsx`) e o checkout (`readAttribution()` em `lib/session.ts`) leem
 * estes mesmos nomes.
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
 * Atribuição em objeto, para enviar no corpo de `POST /api/leads`.
 *
 * Sem isto, todo lead vindo de campanha chegaria como tráfego direto e não
 * daria para saber qual canal traz cliente que fala com o comercial.
 */
export function attributionFields() {
  const params = attributionParams();
  return {
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
    referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
  };
}

/**
 * URL do checkout com plano e telas sugeridos.
 *
 * `plan` e `screens` são exatamente os nomes que `readSelectionHint()` já lê do
 * outro lado. São SUGESTÃO: quem calcula o valor é o servidor, no PATCH da
 * sessão — a URL não decide preço.
 */
export function checkoutUrl(planCode, screens, intervalo) {
  const params = attributionParams();
  params.set('plan', planCode);
  if (Number.isFinite(screens) && screens > 0) params.set('screens', String(screens));

  // O nome do intervalo no site é em português (`mensal`/`anual`, porque é o
  // que a copy usa); o do checkout e o do banco é em inglês (`monthly`/
  // `yearly`, que é o vocabulário de `Subscription.billingInterval`). A
  // tradução mora AQUI, no único ponto onde os dois mundos se tocam — espalhar
  // os dois vocabulários pelos componentes é como nascem os bugs de "o cliente
  // escolheu anual e a fatura veio mensal".
  if (intervalo === 'anual' || intervalo === 'yearly') params.set('interval', 'yearly');

  return `${CHECKOUT_URL}/c?${params.toString()}`;
}

/**
 * URL de cadastro, com o plano escolhido.
 *
 * `plano`, `telas` e `intervalo` ficam no vocabulário do site (português,
 * `mensal`/`anual`): é o que a pessoa vê na barra de endereço e o que o
 * `Signup.tsx` lê. A tradução para o vocabulário do checkout (`plan`,
 * `screens`, `interval=monthly|yearly`) acontece no painel, na hora de mandar
 * para o checkout.
 *
 * O plano é REGISTRO DE INTENÇÃO, não contratação: a conta sempre nasce no
 * grátis, e quem escolheu plano pago só paga no checkout.
 */
export function signupUrl(planCode, screens, intervalo) {
  const params = new URLSearchParams();
  if (planCode) params.set('plano', planCode);
  if (Number.isFinite(screens) && screens > 0) params.set('telas', String(screens));
  if (planCode) {
    params.set('intervalo', intervalo === 'anual' || intervalo === 'yearly' ? 'anual' : 'mensal');
  }
  for (const [key, value] of attributionParams()) params.set(key, value);

  const query = params.toString();
  // Override: painel em outro host/porta, sem o atalho `/cadastro` do gateway.
  // A query vai ANTES do `#`, senão vira parte da rota do `HashRouter`.
  if (APP_URL) return `${APP_URL}/${query ? `?${query}` : ''}#/signup`;
  return `/cadastro${query ? `?${query}` : ''}`;
}

/** Link "Entrar" do site. */
export function loginUrl() {
  return APP_URL ? `${APP_URL}/#/login` : '/entrar';
}

/**
 * Para onde vai um plano. `null` = não há destino self-service; quem chamou
 * deve abrir o caminho comercial (Enterprise).
 */
export function conversionDestination(planCode, screens, intervalo) {
  switch (planCode) {
    case 'gratis':
    case 'loja':
    case 'rede':
      return signupUrl(planCode, screens, intervalo);
    default:
      return null;
  }
}
