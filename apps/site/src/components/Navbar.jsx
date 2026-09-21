import { useCallback, useEffect, useRef, useState } from 'react';
import { APP_URL } from '../lib/funnel';
import { EVENT, track } from '../lib/tracking';
import './Navbar.css';

/**
 * Barra de navegação da landing v2.
 *
 * Decisões que não são estéticas:
 *
 * 1. **O botão do topo leva à GRADE DE PLANOS, não ao cadastro.** Antes ele
 *    mandava direto para o `signup`, e o visitante saía do site sem nunca ver
 *    que existem Loja e Rede — todo clique de topo virava conversão para R$ 0.
 *    Quem escolhe o plano é o visitante, na grade; este botão só o leva até lá.
 *    (Os botões DOS CARDS de plano continuam indo direto ao destino: lá o plano
 *    já foi escolhido.)
 *
 * 2. **"Entrar" existe e fica separado do CTA.** A landing v2 é a porta de
 *    entrada de quem já é cliente também; sem esse link, o síndico que quer
 *    trocar o aviso da portaria pelo celular precisa lembrar a URL do painel.
 *
 * 3. **Abaixo de 1100px os links de seção vão para uma gaveta; a marca,
 *    "Entrar" e o CTA continuam na barra.** Até 21/09/2026 os links apenas
 *    SUMIAM ("um menu seria mais um estado para manter"): quem estava no
 *    celular ou num notebook de 1024px não tinha como pular para "Preços" sem
 *    rolar a página inteira — justamente o visitante que chega por anúncio. A
 *    gaveta usa EXATAMENTE os mesmos itens e as mesmas ações da barra desktop
 *    (`SECOES` e `irParaPlanos` abaixo são compartilhados), então não existe
 *    segundo destino para manter em sincronia. O que NÃO pode sumir da barra é
 *    o "Entrar": ele sumia abaixo de 640px, e é no celular que quem já é
 *    cliente chega. Ver Navbar.css.
 *
 *    Acessibilidade da gaveta: botão com aria-expanded/aria-controls; a gaveta
 *    é um diálogo modal (role="dialog", aria-modal) que fica `inert` quando
 *    fechada; fecha com Esc, com clique no véu, no X ou em qualquer item; trava
 *    a rolagem do fundo; ao abrir, o foco vai para o primeiro item e o Tab fica
 *    preso dentro dela; ao fechar pelo X/Esc/véu, o foco volta ao botão que a
 *    abriu.
 *
 * 4. **A medição do CTA sai daqui, com `cta_location: 'navbar'`.** O `plan` vai
 *    como 'nao_escolhido' porque este botão de fato não escolhe plano — ele
 *    rola até a grade. Marcá-lo como 'gratis' faria o relatório atribuir ao
 *    topo uma escolha que quem clicou ainda não fez. O "Começar grátis" da
 *    gaveta é o MESMO botão (mesma função, mesmo evento): para o relatório, os
 *    dois são o CTA do topo. ARMADILHA: `goToPlans` (App.jsx) empurra um
 *    `cta_click` próprio; enquanto os dois existirem, o GA4 conta este clique
 *    duas vezes. A correção é do lado do App.jsx.
 */

const SECOES = [
  { id: '#como-funciona', nome: 'como-funciona', rotulo: 'Como funciona' },
  { id: '#segmentos', nome: 'segmentos', rotulo: 'Para o seu negócio' },
  { id: '#na-tela', nome: 'na-tela', rotulo: 'O que vai na tela' },
  { id: '#precos', nome: 'precos', rotulo: 'Preços' },
];

// Acima disto a barra desktop mostra os links e a gaveta não existe (Navbar.css).
const LARGURA_GAVETA = '(max-width: 1100px)';

const FOCAVEIS =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea';

/** Trava a rolagem do fundo e devolve a função que destrava. */
function travarRolagem() {
  const html = document.documentElement;
  const body = document.body;
  // Compensa a barra de rolagem que some, senão a página "pula" de lado.
  const barra = window.innerWidth - html.clientWidth;
  const anterior = { overflow: html.style.overflow, padding: body.style.paddingRight };
  html.style.overflow = 'hidden';
  if (barra > 0) body.style.paddingRight = `${barra}px`;
  return () => {
    html.style.overflow = anterior.overflow;
    body.style.paddingRight = anterior.padding;
  };
}

const IconeMenu = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

const IconeFechar = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const Navbar = ({ scrollToSection, goToPlans }) => {
  const [descolada, setDescolada] = useState(false);
  const [aberto, setAberto] = useState(false);
  const refBotao = useRef(null);
  const refGaveta = useRef(null);
  const refDestravar = useRef(null);

  // Sombra só depois que a página rola: sobre o herói (que já tem fundo
  // `--papel-2`) a sombra permanente cria uma linha dupla com a borda.
  useEffect(() => {
    const aoRolar = () => setDescolada(window.scrollY > 8);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  const destravar = useCallback(() => {
    refDestravar.current?.();
    refDestravar.current = null;
  }, []);

  /**
   * Fecha a gaveta. `devolverFoco` é falso quando o fechamento vem de um item
   * que ROLA a página: devolver o foco ao botão do topo faria o navegador
   * rolar de volta até ele no meio da rolagem suave. A rolagem é destravada
   * AQUI, de forma síncrona, antes de o item pedir o scroll.
   */
  const fechar = useCallback(
    (devolverFoco = true) => {
      destravar();
      setAberto(false);
      if (devolverFoco) refBotao.current?.focus();
    },
    [destravar],
  );

  // Enquanto aberta: trava a rolagem, foca o primeiro item, prende o Tab,
  // fecha com Esc e fecha sozinha se a janela crescer além de 1100px.
  useEffect(() => {
    if (!aberto) return undefined;

    refDestravar.current = travarRolagem();
    const gaveta = refGaveta.current;
    gaveta?.querySelector('.navbar__gaveta-links button')?.focus();

    const aoTeclar = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        fechar();
        return;
      }
      if (e.key !== 'Tab' || !gaveta) return;
      const itens = Array.from(gaveta.querySelectorAll(FOCAVEIS));
      if (itens.length === 0) return;
      const inicio = itens[0];
      const fim = itens[itens.length - 1];
      if (!gaveta.contains(document.activeElement)) {
        e.preventDefault();
        inicio.focus();
      } else if (e.shiftKey && document.activeElement === inicio) {
        e.preventDefault();
        fim.focus();
      } else if (!e.shiftKey && document.activeElement === fim) {
        e.preventDefault();
        inicio.focus();
      }
    };

    const largura = window.matchMedia(LARGURA_GAVETA);
    const aoMudarLargura = () => {
      if (!largura.matches) fechar(false);
    };

    document.addEventListener('keydown', aoTeclar);
    largura.addEventListener?.('change', aoMudarLargura);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      largura.removeEventListener?.('change', aoMudarLargura);
      destravar();
    };
  }, [aberto, fechar, destravar]);

  const irParaSecao = (secao) => {
    if (aberto) fechar(false);
    scrollToSection(secao.id, secao.nome);
  };

  const irParaPlanos = () => {
    if (aberto) fechar(false);
    track({
      event: EVENT.CTA_CLICK,
      params: { cta_location: 'navbar', plan: 'nao_escolhido' },
    });
    goToPlans('navbar', 'Começar grátis');
  };

  return (
    <nav
      className={`navbar${descolada ? ' navbar--descolada' : ''}`}
      aria-label="Navegação principal"
    >
      <div className="navbar__inner">
        <a className="navbar__marca" href="#topo" aria-label="TelaHub, página inicial">
          <span className="navbar__logo" aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="5" width="20" height="13" rx="2" />
              <path d="M8 22h8M12 18v4" />
            </svg>
          </span>
          TelaHub
        </a>

        <ul className="navbar__links" role="list">
          {SECOES.map((secao) => (
            <li key={secao.id}>
              <button type="button" onClick={() => irParaSecao(secao)}>
                {secao.rotulo}
              </button>
            </li>
          ))}
        </ul>

        <div className="navbar__acoes">
          <a className="btn btn--texto navbar__entrar" href={`${APP_URL}/`}>
            <span className="btn__rotulo">Entrar</span>
          </a>
          <button type="button" className="btn navbar__btn" onClick={irParaPlanos}>
            Começar grátis
          </button>
          <button
            ref={refBotao}
            type="button"
            className="navbar__menu"
            aria-expanded={aberto}
            aria-controls="navbar-gaveta"
            aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => (aberto ? fechar() : setAberto(true))}
          >
            <IconeMenu />
          </button>
        </div>
      </div>

      {/* Gaveta do celular/tablet. Existe no HTML pré-renderizado, fechada e
          `inert`: nada aqui depende de `window` no render. Acima de 1100px o
          CSS a esconde por completo. */}
      <div
        className={`navbar__veu${aberto ? ' navbar__veu--aberto' : ''}`}
        aria-hidden="true"
        onClick={() => fechar()}
      />
      <div
        ref={refGaveta}
        id="navbar-gaveta"
        className={`navbar__gaveta${aberto ? ' navbar__gaveta--aberta' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!aberto}
      >
        <div className="navbar__gaveta-topo">
          <span className="navbar__gaveta-titulo">Menu</span>
          <button
            type="button"
            className="navbar__fechar"
            aria-label="Fechar menu"
            onClick={() => fechar()}
          >
            <IconeFechar />
          </button>
        </div>

        <ul className="navbar__gaveta-links" role="list">
          {SECOES.map((secao) => (
            <li key={secao.id}>
              <button type="button" onClick={() => irParaSecao(secao)}>
                {secao.rotulo}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>

        <div className="navbar__gaveta-acoes">
          <button type="button" className="btn btn--largo" onClick={irParaPlanos}>
            Começar grátis
          </button>
          <a className="btn btn--fantasma btn--largo" href={`${APP_URL}/`}>
            Entrar
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
