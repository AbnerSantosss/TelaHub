import { useEffect, useRef, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Cenas from './components/Cenas';
import Passos from './components/Passos';
import Formatos from './components/Formatos';
import Blocos from './components/Blocos';
import Hospedagem from './components/Hospedagem';
import Comparacao from './components/Comparacao';
import Precos from './components/Precos';
import RiscoZero from './components/RiscoZero';
import Faq from './components/Faq';
import CtaFinal from './components/CtaFinal';
import Rodape from './components/Rodape';
import LeadModal from './components/LeadModal';
import ConsentBanner from './components/ConsentBanner';
import Termos from './paginas/Termos';
import Privacidade from './paginas/Privacidade';
import SegmentoCondominio from './paginas/SegmentoCondominio';
import SegmentoClinica from './paginas/SegmentoClinica';
import SegmentoLoja from './paginas/SegmentoLoja';
import { resolverRota } from './paginas/rotas';
import { trackEvent, recordPageview } from './lib/tracking';
import { conversionDestination, API_URL, attributionFields } from './lib/funnel';
import { iniciarReveal } from './lib/reveal';
import { iniciarSpotlight, iniciarAurora } from './lib/spotlight';

/**
 * Landing v2 do TelaHub.
 *
 * ── O que mudou em 30/08/2026 e por quê ─────────────────────────────────────
 * A página anterior era escura, "corporativa", abria com um painel de telemetria
 * falso e vendia por RAMO (cardápio, ofertas). A auditoria do plano comercial v2
 * mostrou dois problemas que se somam: (1) quem chega não sabe que tem o
 * problema, então recurso no herói não converte — dor invisível converte; e (2)
 * ancorar o produto em comida entrega a página a uma disputa que não é a nossa
 * (o termo é dominado por QR/delivery) e faz síndico, gerente e dono de clínica
 * concluírem "não é pra mim". O produto passou a ser apresentado por PORTE:
 * condomínio, escritório, clínica, loja, academia, rede — comida é um caso entre
 * vários e nunca abre nada.
 *
 * ── A ordem das seções é o argumento ────────────────────────────────────────
 * dor → cena reconhecível → como funciona (com a TV real) → dois formatos →
 * o que cabe na tela (só o que existe) → por que é barato → contra o que se
 * compara → preço → risco zero → dúvidas → convite. Cada seção responde à
 * objeção que a anterior levanta; trocar a ordem quebra a corrente.
 *
 * ── O que mudou em 05/09/2026: o site deixou de ter uma página só ───────────
 * Entraram cinco rotas: `/termos` e `/privacidade` (sem elas o site coleta lead
 * e cria conta sem identificar quem está por trás — reprovação certa no Meta e
 * no Google Ads, e infração ao art. 6º, III do CDC) e `/condominio`,
 * `/clinica`, `/loja`, que são os destinos dos anúncios: o herói de cada uma
 * devolve a frase exata do anúncio, e o resto da página continua sendo o da
 * home. A tabela que descreve todas elas é `src/paginas/rotas.js`.
 *
 * ── Roteamento sem router ───────────────────────────────────────────────────
 * Não há react-router aqui, de propósito: são cinco páginas estáticas, sem
 * navegação com estado, e cada uma sai do build como um `index.html` de
 * verdade (ver `scripts/prerender.mjs`). O nginx entrega `/{rota}/index.html`
 * pelo `try_files $uri $uri/`, os links entre páginas são `<a href>` puros, e o
 * React só precisa olhar `location.pathname` para hidratar o componente certo.
 * Um router traria dependência, bundle e um segundo modelo de navegação para
 * manter — sem resolver nada que já não esteja resolvido.
 *
 * ⚠️ ARMADILHA DE SSR: no servidor não existe `window`. A rota chega por
 * `props.url` (que `entry-server.jsx` passa) e, no navegador, por
 * `window.location.pathname`. Se as duas divergirem, o React hidrata a página
 * errada por cima do HTML certo — e isso NÃO dá erro no console: o visitante
 * vê a home piscar por cima de `/condominio`.
 *
 * ── Regras que a página inteira herda ───────────────────────────────────────
 * Nenhum fato que não exista pode aparecer aqui. Sem depoimento, sem nota, sem
 * "+N clientes", sem contador de vagas, sem "14 dias" (o trial foi
 * descontinuado e essa frase já voltou quatro vezes), sem "API externa" nem
 * "múltiplas unidades" (vendidos e inexistentes), sem Pix/boleto (não há
 * gateway).
 */

/** Código do plano → nome exibido. Os eventos de analytics usam o nome. */
const PLAN_LABELS = {
  gratis: 'Grátis',
  loja: 'Loja',
  rede: 'Rede',
  enterprise: 'Enterprise',
};

/**
 * Caminho da rota atual.
 *
 * `url` vem do SSR; no navegador vale o `pathname` real. O fallback `'/'`
 * cobre o único caso em que nenhum dos dois existe (render em ambiente sem
 * DOM e sem url) — e cair na home é o mesmo que o nginx faz com caminho
 * desconhecido, então o comportamento é consistente ponta a ponta.
 */
function caminhoAtual(url) {
  if (url) return url;
  if (typeof window !== 'undefined') return window.location.pathname;
  return '/';
}

function App({ url }) {
  const rota = resolverRota(caminhoAtual(url));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Grátis');

  // Formulário de contato (o único backend que esta página chama).
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [submitStatus, setSubmitStatus] = useState({ loading: false, success: false, error: null });

  useEffect(() => {
    // Revelação ao rolar. Era GSAP + ScrollTrigger de CDN e tinha duas formas de
    // deixar a página em branco — CDN fora do ar e chegada por âncora
    // (`/#precos`, o link que o painel e o checkout usam). Virou CSS +
    // IntersectionObserver com estado padrão VISÍVEL; o raciocínio completo está
    // no cabeçalho de `src/lib/reveal.js`. O herói não participa disso: é a
    // primeira coisa que o visitante vê e não pode depender de JavaScript.
    const pararReveal = iniciarReveal();
    // Spotlight dos cartões/reflexo dos botões (um listener delegado) e a
    // aurora das faixas escuras, que só anima enquanto está na tela. Os dois
    // são decorativos e se desligam sozinhos em toque e em movimento reduzido —
    // ver o cabeçalho de `src/lib/spotlight.js`.
    const pararSpotlight = iniciarSpotlight();
    const pararAurora = iniciarAurora();
    return () => {
      pararReveal();
      pararSpotlight();
      pararAurora();
    };
  }, []);

  /**
   * Contagem própria de visita.
   *
   * É a ÚNICA medição desta página que não passa pelo GTM e não espera a faixa
   * de cookies: ela é agregada e anônima, e vai para o nosso banco fechar o
   * denominador do funil. O porquê completo — e o motivo de não virar tag —
   * está no fim de `lib/tracking.js`.
   *
   * A dependência é `rota.caminho`, não `[]`. Hoje toda troca de página é
   * recarga de documento (não há router, ver `paginas/rotas.js`), então isto
   * roda uma vez por documento e dá no mesmo; a diferença aparece no dia em
   * que alguém trouxer navegação sem recarga: a mudança de caminho já passa a
   * ser contada sozinha, sem depender de alguém lembrar deste arquivo.
   *
   * ⚠️ Roda só no navegador. No SSR (`entry-server.jsx`) efeito não executa —
   * e se executasse, cada pré-render do build viraria uma visita fantasma.
   */
  const caminhoContado = useRef(null);
  useEffect(() => {
    // O `StrictMode` de `main.jsx` dispara os efeitos duas vezes em
    // desenvolvimento. Sem esta trava, toda visita local entraria dobrada e a
    // conversão do ambiente sairia pela metade — o tipo de número errado que
    // não dá erro, só mente para pior.
    if (caminhoContado.current === rota.caminho) return;
    caminhoContado.current = rota.caminho;
    recordPageview(rota.caminho);
  }, [rota.caminho]);

  /**
   * Rola até uma seção — ou vai para a home, se a seção não existir aqui.
   *
   * ⚠️ ARMADILHA: a navbar e o rodapé são os MESMOS em todas as páginas e
   * apontam para âncoras da home (`#segmentos`, `#na-tela`, `#duvidas`,
   * `#precos`). Em `/termos` e `/privacidade` metade delas não existe, e em
   * `/condominio` só existem as seções que a página reaproveita. Sem este
   * fallback, o clique simplesmente não fazia nada — e clique que não anda faz
   * o visitante concluir que o site está quebrado, não que ele errou de link.
   */
  const irParaSecao = (id) => {
    if (typeof document === 'undefined') return;
    const alvo = document.querySelector(id);
    if (alvo) {
      window.scrollTo({ top: alvo.offsetTop - 80, behavior: 'smooth' });
      return;
    }
    window.location.href = `/${id}`;
  };

  /**
   * CTA de navegação: leva à GRADE DE PLANOS, não ao cadastro.
   *
   * Vale para os botões que aparecem ANTES da seção de preços e não dizem qual
   * plano estão oferecendo (hoje, o da navbar). Eles mandavam direto para o
   * `signup`, e o visitante saía do site sem nunca ver que existem Loja e Rede:
   * todo clique de topo virava conversão para R$ 0. Quem escolhe o plano é o
   * visitante, na grade.
   *
   * O botão do herói é a exceção deliberada: ele diz "minha 1ª tela — grátis",
   * então mandá-lo para a grade seria um clique que não anda.
   */
  const goToPlans = (ctaLocation = 'unknown', ctaLabel = 'Ver planos') => {
    // O `cta_click` NÃO sai daqui: quem dispara é o componente do botão
    // (Navbar, Hero, Passos, Precos, CtaFinal, Segmento), que sabe o próprio
    // `cta_location`. Enquanto os dois existiam, todo clique era contado duas
    // vezes no GA4 — e clique inflado divide por dois o custo por resultado do
    // painel de anúncios, o que faz uma campanha ruim parecer boa. É o tipo de
    // erro que não dá defeito nenhum: só mente para melhor.
    // `ctaLabel` continua na assinatura porque os chamadores passam por
    // posição — tirá-lo faria `screens` receber o rótulo. Ele viaja no
    // `view_item_list`, onde ainda diz qual botão levou à grade.
    trackEvent('view_item_list', {
      item_list_name: 'planos',
      cta_location: ctaLocation,
      cta_label: ctaLabel,
      page_path: rota.caminho,
    });
    irParaSecao('#precos');
  };

  /** Abre o formulário de contato (Parceiro, Enterprise, setup assistido). */
  const abrirContato = (planName = 'Contato', ctaLocation = 'unknown') => {
    setSelectedPlan(planName);
    setSubmitStatus({ loading: false, success: false, error: null });
    setIsModalOpen(true);
    trackEvent('modal_open', {
      modal_name: 'lead_capture',
      plan_selected: planName,
      cta_location: ctaLocation,
      page_path: rota.caminho,
    });
  };

  /**
   * Ponto único de conversão da página.
   *
   * Funil híbrido: `gratis` vai para o cadastro (sem cartão, como o FAQ desta
   * página promete), `loja`/`rede` vão para o checkout com plano, telas e
   * INTERVALO sugeridos, e `enterprise` — que não tem preço público — cai no
   * formulário de contato.
   *
   * O `intervalo` é o que impede a incoerência mais cara desta página: o
   * visitante escolhe "anual — R$ 39/tela" na grade e, sem esse parâmetro, o
   * checkout abriria no mensal cobrando R$ 49. Anunciar um preço e cobrar outro
   * é CDC arts. 30 e 37, além de matar a conversão no último passo.
   *
   * O `trackEvent` dispara ANTES de navegar: sair da página cancela requisição
   * em voo, e um clique que não é medido é uma venda que some do funil.
   *
   * `page_path` entrou junto com as páginas de segmento: sem ele, o clique na
   * grade de preços de `/condominio`, `/clinica` e `/loja` cairia na mesma
   * linha do relatório e não daria para saber qual anúncio pagou o clique.
   *
   * O `cta_click` NÃO sai daqui: quem o dispara é o componente do botão, que
   * conhece o próprio `cta_location`. Os dois juntos contavam cada clique duas
   * vezes no GA4 — e clique inflado derruba pela metade o custo por resultado
   * no painel de anúncios, fazendo campanha ruim parecer boa sem dar erro.
   */
  const startConversion = (planCode, ctaLocation = 'unknown', ctaLabel = planCode, screens, intervalo) => {
    const planName = PLAN_LABELS[planCode] || planCode;

    const destination = conversionDestination(planCode, screens, intervalo);

    if (!destination) {
      abrirContato(planName, ctaLocation);
      return;
    }

    // `ctaLabel` continua na assinatura porque os chamadores passam por
    // posição — removê-lo faria `screens` receber o rótulo do botão. Ele viaja
    // aqui, onde diz qual botão iniciou a conversão.
    trackEvent('begin_checkout', {
      plan_selected: planName,
      cta_location: ctaLocation,
      cta_label: ctaLabel,
      billing_interval: intervalo || 'mensal',
      destination: planCode === 'gratis' ? 'signup' : 'checkout',
      page_path: rota.caminho,
    });

    window.location.href = destination;
  };

  /**
   * Envia o lead para `POST /api/leads`.
   *
   * Era um `setTimeout` que mostrava "Recebemos seu contato!" sem gravar nada:
   * todo lead de plano sob consulta era perdido em silêncio. Agora, se o envio
   * falhar, a pessoa VÊ o erro — mostrar sucesso sobre uma falha é o que fazia
   * o problema durar.
   */
  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      setSubmitStatus({ loading: false, success: false, error: 'Preencha nome e e-mail.' });
      return;
    }

    setSubmitStatus({ loading: true, success: false, error: null });

    try {
      const response = await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          company: formCompany || undefined,
          phone: formPhone || undefined,
          planCode: selectedPlan || undefined,
          ...attributionFields(),
        }),
      });

      if (!response.ok) {
        const corpo = await response.json().catch(() => ({}));
        throw new Error(corpo.error || 'Não foi possível enviar agora.');
      }

      setSubmitStatus({ loading: false, success: true, error: null });

      trackEvent('generate_lead', {
        event_id: crypto.randomUUID(),
        plan_selected: selectedPlan,
        lead_company: formCompany || undefined,
        value: 0,
        currency: 'BRL',
        page_path: rota.caminho,
      });

      setFormName('');
      setFormEmail('');
      setFormCompany('');
      setFormPhone('');
    } catch (error) {
      setSubmitStatus({
        loading: false,
        success: false,
        error: `${error.message} Tente de novo em instantes.`,
      });
    }
  };

  /**
   * O miolo da página. A casca — faixa de cookies, navbar, rodapé e modal de
   * contato — é a mesma em todas as rotas, e é isso que faz `/termos` e
   * `/condominio` parecerem o mesmo site e não um anexo esquecido.
   */
  const propsDeSegmento = { startConversion, abrirContato, irParaSecao };

  let conteudo;
  switch (rota.pagina) {
    case 'termos':
      conteudo = <Termos />;
      break;
    case 'privacidade':
      conteudo = <Privacidade />;
      break;
    case 'condominio':
      conteudo = <SegmentoCondominio {...propsDeSegmento} />;
      break;
    case 'clinica':
      conteudo = <SegmentoClinica {...propsDeSegmento} />;
      break;
    case 'loja':
      conteudo = <SegmentoLoja {...propsDeSegmento} />;
      break;
    default:
      conteudo = (
        <>
          <Hero startConversion={startConversion} scrollToSection={irParaSecao} />
          <Cenas />
          <Passos />
          <Formatos />
          <Blocos />
          <Hospedagem />
          <Comparacao />
          <Precos startConversion={startConversion} abrirContato={abrirContato} />
          <RiscoZero abrirContato={() => abrirContato('Setup assistido', 'risco_zero')} />
          <Faq />
          <CtaFinal startConversion={startConversion} />
        </>
      );
  }

  return (
    <>
      {/* Decide o consentimento ANTES de qualquer tag de marketing disparar. */}
      <ConsentBanner />

      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>

      <Navbar scrollToSection={irParaSecao} goToPlans={goToPlans} />

      <main id="conteudo">{conteudo}</main>

      <Rodape scrollToSection={irParaSecao} />

      <LeadModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        selectedPlan={selectedPlan}
        formName={formName}
        setFormName={setFormName}
        formEmail={formEmail}
        setFormEmail={setFormEmail}
        formCompany={formCompany}
        setFormCompany={setFormCompany}
        formPhone={formPhone}
        setFormPhone={setFormPhone}
        submitStatus={submitStatus}
        handleLeadSubmit={handleLeadSubmit}
      />
    </>
  );
}

export default App;
