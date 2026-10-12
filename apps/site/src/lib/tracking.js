/**
 * Medição do funil — site de vendas.
 *
 * DESENHO: o `dataLayer` é a única fonte. O GTM (container `GTM-W7K6QK7Z`,
 * compartilhado pelos três apps) escuta e distribui para o GA4 e para o Google
 * Ads. O Pixel do Meta é a exceção: ele é chamado DIRETO daqui, não pelo GTM,
 * porque o mesmo evento também sai pelo servidor (Conversions API) e os dois
 * precisam carregar o MESMO `eventID` para a Meta descartar a cópia. Passar
 * pelo GTM no meio tornaria esse id um campo que alguém pode desconfigurar pela
 * interface — e a duplicata resultante não dá erro, só divide por dois todo
 * custo por resultado do painel.
 *
 * UM CONTAINER PARA OS TRÊS APPS de propósito: a jornada atravessa site →
 * painel → checkout, em domínios diferentes. Um container por app produziria
 * três relatórios que não se somam, e a pergunta que importa ("quanto custou o
 * pagante que veio deste anúncio") não teria resposta em lugar nenhum.
 *
 * ⚠️ Nenhuma função aqui pode lançar. Medição quebrada não pode impedir alguém
 * de clicar em "criar minha tela" — por isso todo acesso a `window` é
 * defensivo e todo bloco arriscado tem `catch` vazio.
 *
 * Há uma SEGUNDA via de medição no fim deste arquivo (`recordPageview`), que
 * não passa pelo GTM nem por tag nenhuma e fala direto com a nossa API. O
 * raciocínio de por que ela é separada — e por que não pode ser fundida com o
 * `dataLayer` — está lá embaixo, junto da função.
 */

import { API_URL, attributionFields } from './funnel';

/**
 * Nomes dos eventos. Constantes e não texto solto porque estes nomes são
 * CONTRATO com o GTM, o GA4 e o servidor: um `sign_up` que virasse `signup`
 * aqui não daria erro em lugar nenhum — a conversão simplesmente pararia de
 * chegar, e a campanha continuaria gastando otimizando para nada.
 */
export const EVENT = {
  CTA_CLICK: 'cta_click',
  LEAD_FORM_OPEN: 'lead_form_open',
  GENERATE_LEAD: 'generate_lead',
  SIGN_UP: 'sign_up',
  DEVICE_LINKED: 'device_linked',
  BEGIN_CHECKOUT: 'begin_checkout',
  ADD_PAYMENT_INFO: 'add_payment_info',
  PURCHASE: 'purchase',
  SUBSCRIPTION_PAID: 'subscription_paid',
};

/** Eventos do Meta correspondentes. `TelaPareada` é próprio: não há padrão para "a TV conectou". */
export const META_EVENT = {
  LEAD: 'Lead',
  COMPLETE_REGISTRATION: 'CompleteRegistration',
  TELA_PAREADA: 'TelaPareada',
  INITIATE_CHECKOUT: 'InitiateCheckout',
  ADD_PAYMENT_INFO: 'AddPaymentInfo',
  PURCHASE: 'Purchase',
  SUBSCRIBE: 'Subscribe',
};

/** Id de deduplicação entre o Pixel do navegador e a Conversions API. */
export function newEventId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Navegador antigo ou contexto sem crypto: cai no gerador abaixo.
  }
  return `e-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

/**
 * Cookies que o Pixel grava e que a Conversions API precisa receber.
 *
 * `_fbp` identifica o navegador; `_fbc` guarda o clique no anúncio. Sem os dois,
 * o casamento do evento de servidor com a pessoa cai muito — e um `Purchase`
 * que a Meta não consegue atribuir não vira público de lookalike, que é o
 * ativo mais valioso dos primeiros 90 dias.
 */
export function readFbCookies() {
  if (typeof document === 'undefined') return {};
  try {
    const jar = document.cookie.split(';').reduce((acc, part) => {
      const [name, ...rest] = part.trim().split('=');
      if (name) acc[name] = rest.join('=');
      return acc;
    }, {});
    return { fbp: jar._fbp || undefined, fbc: jar._fbc || undefined };
  } catch {
    return {};
  }
}

/** Empurra um evento para o `dataLayer`. É o caminho do GA4 e do Google Ads. */
export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...params });
  } catch {
    // dataLayer indisponível não pode quebrar a página.
  }
}

/** Chama o Pixel do Meta direto, com o `eventID` de deduplicação. */
export function trackMetaEvent(metaEventName, params = {}, eventId) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  try {
    window.fbq('track', metaEventName, params, eventId ? { eventID: eventId } : undefined);
  } catch {
    // Pixel bloqueado por extensão é o caso comum, não um erro nosso.
  }
}

/**
 * Dispara o mesmo momento nos dois destinos e devolve o `eventID` usado.
 *
 * Devolver o id é o ponto: quem chamou precisa mandá-lo ao servidor no mesmo
 * pedido (cadastro, pagamento) para que a Conversions API repita o evento com
 * o id igual. Guardar esse id em qualquer outro lugar — estado global, storage —
 * abriria espaço para ele se perder entre um evento e outro.
 */
export function track({ event, params = {}, metaEvent, metaParams, eventId }) {
  const id = eventId || newEventId();
  if (event) trackEvent(event, { ...params, event_id: id });
  // Quando `metaParams` não é informado, o Meta recebe os mesmos parâmetros do
  // GA4 — os nomes divergem, mas campo a mais é ignorado e campo a menos some
  // do relatório. Informe `metaParams` quando o Meta precisar de outra forma
  // (`content_ids`, `contents`) que o GA4 não usa.
  if (metaEvent) trackMetaEvent(metaEvent, metaParams ?? params, id);
  return id;
}

/**
 * Valor monetário para o Meta e o GA4: REAIS, não centavos, e sempre o CAIXA.
 *
 * No anual, é o total dos 12 meses — não o mensal equivalente. Otimizar por
 * mensal equivalente ensinaria o algoritmo a buscar o cliente que paga menos à
 * vista, que é o oposto da estratégia (o anual é o que financia a mídia).
 * Confundir os dois foi exatamente o defeito registrado em US-A-05.
 */
export function toReais(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return 0;
  return Number((n / 100).toFixed(2));
}

// ─── Consentimento (LGPD) ────────────────────────────────────────────────────
// O Consent Mode v2 nega tudo por padrão no `index.html`, ANTES de qualquer tag
// carregar. Estas funções são o que a faixa de cookies usa para liberar.

export function updateConsent(state) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  try {
    window.gtag('consent', 'update', state);
  } catch {
    // Sem gtag, o Consent Mode simplesmente segue negado — que é o lado seguro.
  }
}

export const CONSENT_STORAGE_KEY = 'telahub_consent';
export const CONSENT_POLICY_VERSION = '1.0';

export function readStoredConsent() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeConsent(state) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      ...state,
      decided_at: new Date().toISOString(),
      policy_version: CONSENT_POLICY_VERSION
    }));
  } catch {
    // Navegação privada bloqueia storage; a decisão vale para esta sessão.
  }
}

// ─── Contagem própria de visitas ─────────────────────────────────────────────
// Esta via NÃO passa pelo GTM e NÃO é analytics. É uma contagem agregada por
// dia/caminho/campanha que cai no NOSSO banco (tabela `SiteVisit`), no mesmo
// lugar onde já estão lead, checkout e pagamento — é o que fecha o DENOMINADOR
// do funil. O GA4 segue sendo a ferramenta de mídia, e ele não serve para esta
// conta: o Consent Mode faz o GA4 subcontar justamente quem recusou cookie, e o
// funil ficaria com numerador (nosso banco) e denominador (GA4) vindos de
// fontes diferentes — uma taxa de conversão inventada, que ninguém consegue
// auditar depois.
//
// ⚠️ NÃO transforme isto em tag do GTM, evento de `dataLayer`, `gtag` ou `fbq`.
// Quem ler este arquivo vai querer, porque "já existe um caminho de medição
// aqui". No instante em que este pedido virar tag, ele passa a depender do
// consentimento de rastreamento e some para metade dos visitantes — que é o
// defeito que esta função existe para não ter.
//
// Por isso também NÃO depende da faixa de cookies: não grava nem lê cookie, não
// toca `localStorage`, não manda identificador de pessoa e não sabe quem é o
// visitante. Contagem agregada e anônima não é consentimento de rastreamento —
// mas basta acrescentar um id estável (visitante, sessão, device) para virar.
// Não acrescente.

/**
 * Caminho da visita, sem query e sem hash.
 *
 * ⚠️ Toda chegada de campanha traz `?utm_source=...` colada, e URL de anúncio
 * já apareceu carregando `email=` e telefone no meio da query. Query string é
 * campo de texto livre controlado por quem monta o link lá fora: gravá-la é
 * gravar o que o anunciante tiver colado ali, sem saber o que é. Só o caminho
 * sobe.
 *
 * A barra no fim também cai: o nginx serve `/condominio` e `/condominio/` como
 * a MESMA página, e sem normalizar a mesma página vira duas linhas na tabela —
 * um relatório em que nenhuma das duas está certa.
 *
 * Não reaproveita `normalizarCaminho()` de `paginas/rotas.js` de propósito:
 * medição não pode passar a depender da tabela de rotas para funcionar.
 */
function caminhoDaVisita(path) {
  const cru = String(
    path || (typeof window !== 'undefined' ? window.location.pathname : '/')
  );
  const semQuery = cru.split('?')[0].split('#')[0];
  const semBarra = semQuery.replace(/\/+$/, '');
  return semBarra === '' ? '/' : semBarra;
}

/**
 * Só o HOST de quem indicou — nunca a URL inteira do referrer.
 *
 * A URL completa é de OUTRO site e vem com caminho e query junto: link vindo de
 * webmail, de sistema interno ou de página de resultado carrega token de
 * sessão, termo pesquisado e às vezes o e-mail da pessoa dentro da própria
 * query. Nada disso é nosso para guardar, e a pergunta que a tabela responde
 * ("de onde vem o tráfego") precisa apenas do host.
 *
 * Referrer do próprio domínio vira `undefined`: navegação interna não é origem.
 * Sem esse corte, o nosso próprio site apareceria como a maior "fonte de
 * tráfego" do relatório — e a leitura errada aí é cara, porque parece que o
 * orgânico está indo bem.
 */
function hostDoReferrer(referrer) {
  if (!referrer) return undefined;
  try {
    const { hostname } = new URL(referrer);
    if (!hostname) return undefined;
    if (typeof window !== 'undefined' && hostname === window.location.hostname) {
      return undefined;
    }
    return hostname;
  } catch {
    // Referrer malformado (ou `about:`, `android-app:`) não é motivo para
    // perder a visita: ela sobe sem origem.
    return undefined;
  }
}

/**
 * Registra uma visita em `POST /api/events/pageview`.
 *
 * ⚠️ A origem do site precisa estar em `CORS_ORIGINS` na API — o site e a API
 * estão em domínios diferentes, e o corpo em JSON faz o navegador mandar um
 * preflight antes. Fora da lista, o navegador barra e a contagem simplesmente
 * não existe, sem nada aparecer para o visitante (que é o comportamento
 * desejado aqui, e por isso o defeito é fácil de não notar: confira a tabela,
 * não o console).
 *
 * Falha é SILENCIOSA e nunca bloqueia nada: API fora do ar, bloqueador de
 * anúncios, rede caindo no meio. Contagem de visita não pode quebrar navegação
 * nem sujar o console de quem está tentando comprar — e um `unhandled rejection`
 * aqui apareceria como erro do site para qualquer monitoramento de front.
 */
export function recordPageview(path) {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;

  try {
    // A leitura de UTM vem de `funnel.js` (`ATTRIBUTION_KEYS`), que é a MESMA
    // lista que o checkout lê do outro lado da travessia. Reescrever os nomes
    // aqui criaria uma segunda lista, e a divergência não daria erro nenhum:
    // apareceria meses depois como campanha sem origem no relatório.
    const { utmSource, utmMedium, utmCampaign, referrer } = attributionFields();

    fetch(`${API_URL}/events/pageview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `keepalive` é o ponto inteiro desta chamada. O visitante que abre a
      // página e clica no CTA na mesma fração de segundo é justamente o que
      // mais interessa medir — e é ele que o navegador perde: ao descarregar o
      // documento, toda requisição em voo é cancelada. Sem esta linha o funil
      // fica com mais cliques do que visitas, o que faz a conversão parecer
      // ótima exatamente nas campanhas que trazem tráfego apressado.
      keepalive: true,
      // Sem cookie e sem credencial, de propósito: isto é contagem anônima. Um
      // cookie de sessão viajando junto tornaria o pedido identificável e
      // arrastaria a contagem para dentro do consentimento de rastreamento.
      credentials: 'omit',
      body: JSON.stringify({
        path: caminhoDaVisita(path),
        // O campo se chama `referrer` no contrato com a API, mas o valor é só o
        // host (a coluna do outro lado é `referrerHost`). O nome curto não
        // autoriza mandar a URL inteira depois.
        referrer: hostDoReferrer(referrer),
        utmSource,
        utmMedium,
        utmCampaign,
      }),
    }).catch(() => {});
  } catch {
    // `JSON.stringify`, `fetch` bloqueado por política de conteúdo, qualquer
    // coisa: a visita se perde e a página continua.
  }
}
