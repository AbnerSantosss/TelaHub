/**
 * Tabela de rotas do site de vendas — a ÚNICA fonte de verdade.
 *
 * ── Por que existe uma tabela, e por que ela mora aqui ──────────────────────
 * Três consumidores precisam concordar sobre o mesmo conjunto de páginas:
 *   1. `App.jsx`, que decide o que renderizar a partir de `location.pathname`;
 *   2. `scripts/prerender.mjs`, que grava um `index.html` por rota no build;
 *   3. `public/sitemap.xml`, que diz ao Google que essas URLs existem.
 * Quando essa lista estava espalhada, adicionar página significava lembrar de
 * três lugares — e a falha era silenciosa: a rota funcionava no navegador,
 * não saía pré-renderizada, e o crawler que não executa JavaScript via um
 * `<div id="root"></div>` vazio. O sitemap é o único que não importa daqui
 * (é arquivo estático, servido como está); a lista dele precisa ser conferida
 * à mão contra este arquivo.
 *
 * ── Sem react-router, de propósito ──────────────────────────────────────────
 * O site tem cinco páginas estáticas e nenhuma navegação com estado. Um router
 * traria dependência, bundle e um segundo modelo de navegação (history API)
 * que o servidor não usa: o nginx já serve `/{rota}/index.html` pelo
 * `try_files $uri $uri/`, e cada página é um documento de verdade. Link entre
 * páginas é `<a href>` puro — recarrega, e é isso que queremos: a página
 * chega pronta do servidor, com o `<title>` e o canonical certos.
 *
 * ⚠️ ARMADILHA: `titulo`/`descricao` ausentes significam "não mexa no que o
 * `index.html` já traz". É o caso da home: o `index.html` é mantido à mão
 * (OG, JSON-LD, palavras-chave) e duplicar o título dela aqui criaria duas
 * versões que divergem no primeiro ajuste de copy — e a que o Google leria
 * seria a daqui, a velha.
 */

/**
 * Domínio público — o único.
 *
 * ⚠️ ARMADILHA: o domínio ".com.br" com o nome da marca pertence a TERCEIRO
 * desde 2025 e não tem relação com este projeto. Ele já apareceu 12 vezes no
 * `index.html` e no `sitemap.xml`, mandando o Google para o site de outra
 * empresa. Nunca escreva esse endereço em lugar nenhum deste repositório.
 */
export const SITE_URL = 'https://vendas.proxserverabner.site';

/** Data de vigência dos documentos legais. Mesma string em Termos e Privacidade. */
export const VERSAO_LEGAL = '2026-09-05';

/** CNPJ público do fornecedor (CDC art. 6º, III). */
export const CNPJ = '74.191.667/0001-55';

export const ROTAS = [
  {
    caminho: '/',
    pagina: 'home',
    // Sem `titulo`/`descricao`: a home herda o que está no index.html.
  },
  {
    caminho: '/condominio',
    pagina: 'condominio',
    rotuloCurto: 'Condomínio',
    titulo: 'Painel de avisos para condomínio na TV da portaria | TelaHub',
    descricao:
      'O aviso da assembleia na TV da portaria, em letras grandes, trocado pelo celular do síndico. A primeira tela é grátis para sempre e não pede cartão.',
    ogTitulo: 'O aviso da assembleia, na TV da portaria.',
    ogDescricao:
      'Assembleia, elevador, coleta seletiva: o que hoje vai para o quadro de cortiça passa para a TV da portaria. Trocado do celular, sem descer.',
  },
  {
    caminho: '/clinica',
    pagina: 'clinica',
    rotuloCurto: 'Clínica e consultório',
    titulo: 'TV para sala de espera de clínica e consultório | TelaHub',
    descricao:
      'Serviços, convênios e horários na TV da sala de espera, trocados pela recepção no celular. A primeira tela é grátis para sempre e não pede cartão.',
    ogTitulo: 'Sala de espera no canal de notícias?',
    ogDescricao:
      'O paciente espera 20 minutos olhando para a TV. Coloque nela os seus serviços, convênios, horários e as orientações pré-consulta.',
  },
  {
    caminho: '/loja',
    pagina: 'loja',
    rotuloCurto: 'Loja e vitrine',
    titulo: 'TV de ofertas para loja, mercado e vitrine | TelaHub',
    descricao:
      'A oferta com foto e preço na TV do balcão ou no totem da vitrine, trocada pelo celular. A primeira tela é grátis para sempre e não pede cartão.',
    ogTitulo: 'O cartaz da promoção amarelou.',
    ogDescricao:
      'Na TV do balcão ou no totem da vitrine, a oferta aparece com foto e preço e é trocada pelo celular, sem imprimir de novo.',
  },
  {
    caminho: '/termos',
    pagina: 'termos',
    titulo: 'Termos de uso | TelaHub',
    descricao:
      'Termos de uso do TelaHub: conta grátis de 1 tela sem prazo e sem cartão, planos por tela ativa, cancelamento e os 7 dias de arrependimento do CDC.',
    ogTitulo: 'Termos de uso | TelaHub',
    ogDescricao:
      'O que o serviço faz, o que ele ainda não faz, como se contrata, como se cancela e o que diz o Código de Defesa do Consumidor.',
  },
  {
    caminho: '/privacidade',
    pagina: 'privacidade',
    titulo: 'Política de Privacidade | TelaHub',
    descricao:
      'Como o TelaHub trata seus dados (LGPD): o que coletamos, para quê, com quem compartilhamos, por quanto tempo e como exercer os seus direitos.',
    ogTitulo: 'Política de Privacidade | TelaHub',
    ogDescricao:
      'Quais dados são coletados, a base legal de cada uso, com quem são compartilhados (Google e Meta) e como pedir acesso, correção ou exclusão.',
  },
];

/**
 * Normaliza o caminho antes de comparar.
 *
 * ⚠️ ARMADILHA: o nginx serve `/condominio` e `/condominio/` como a MESMA
 * página (`try_files $uri/`), e um anúncio pode chegar com a barra no fim.
 * Sem normalizar, o servidor entregaria o HTML certo e o React hidrataria a
 * home por cima — tela em branco de conteúdo trocado, sem nenhum erro no
 * console. Query string e hash também entram aqui porque toda campanha traz
 * `?utm_source=...` colado na URL.
 */
export function normalizarCaminho(caminhoBruto) {
  const cru = String(caminhoBruto || '/');
  const semQuery = cru.split('?')[0].split('#')[0];
  const semBarra = semQuery.replace(/\/+$/, '');
  return semBarra === '' ? '/' : semBarra;
}

/**
 * As páginas de segmento, na ordem em que aparecem no rodapé de cada uma.
 *
 * Elas existem para receber anúncio, então nada na home aponta para elas — e
 * página sem link de entrada é página órfã, que o Google rastreia menos e
 * ranqueia pior. O sitemap resolve a descoberta; este cruzamento entre elas
 * resolve o resto, e de quebra dá ao visitante que caiu na cena errada um
 * caminho para a certa em vez de um botão de voltar.
 */
export const SEGMENTOS = ROTAS.filter((rota) => rota.rotuloCurto);

/** Rota correspondente ao caminho. Desconhecido cai na home (o nginx faz igual). */
export function resolverRota(caminho) {
  const alvo = normalizarCaminho(caminho);
  return ROTAS.find((rota) => rota.caminho === alvo) || ROTAS[0];
}

/** URL absoluta canônica de uma rota. */
export function urlCanonica(caminho) {
  const alvo = normalizarCaminho(caminho);
  return alvo === '/' ? `${SITE_URL}/` : `${SITE_URL}${alvo}`;
}
