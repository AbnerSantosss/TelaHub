/**
 * Efeitos que seguem o cursor e efeitos que só rodam quando estão na tela.
 *
 * ── Spotlight e reflexo: UM listener para a página inteira ──────────────────
 * Cartões (`.card`, `.cena`) e botões (`.btn`) desenham uma luz em CSS
 * posicionada por duas variáveis, --mx e --my (ver index.css). Este módulo só
 * escreve essas duas variáveis no elemento que está sob o ponteiro.
 *
 * Por que delegado, e não um onPointerMove em cada componente (que é como o
 * "Feature Grid Spotlight Cards" do 21st.dev faz): a landing tem ~30 cartões e
 * botões espalhados por uma dúzia de componentes. Um handler por elemento é uma
 * dúzia de lugares para esquecer de ligar — e uma prop a mais em cada um. Aqui
 * é um listener passivo no documento, com no máximo uma escrita por quadro
 * (requestAnimationFrame), e qualquer elemento novo com a classe já ganha o
 * efeito sem ninguém lembrar deste arquivo.
 *
 * Só liga com mouse de verdade (`hover: hover` + `pointer: fine`) e sem
 * `prefers-reduced-motion`. No toque não há cursor para seguir; o CSS já não
 * desenha a camada nesses casos, e este listener nem chega a existir.
 *
 * ── Aurora: pausada fora da tela ────────────────────────────────────────────
 * As faixas `.secao--noite` têm uma aurora animada em CSS que nasce PAUSADA.
 * Um IntersectionObserver acrescenta `.is-visivel` enquanto a faixa aparece e
 * tira quando ela sai — animação fora da tela é quadro gasto à toa, e no
 * celular é bateria. Sem JavaScript a aurora fica parada, que é um estado
 * aceitável (o fundo continua bonito, só não se mexe).
 *
 * ⚠️ Roda só no navegador. As duas funções saem cedo quando não há `window`
 * (prerender/SSR) e devolvem uma função de limpeza vazia.
 */

const ALVOS_SPOT = '.card, .cena, .btn:not(.btn--texto)';

export function iniciarSpotlight() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  const mouse = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)');

  let quadro = 0;
  let ultimo = null;
  let ligado = false;

  const aoMover = (evento) => {
    ultimo = evento;
    if (quadro) return;
    quadro = window.requestAnimationFrame(() => {
      quadro = 0;
      const e = ultimo;
      if (!e || !(e.target instanceof Element)) return;
      const alvo = e.target.closest(ALVOS_SPOT);
      if (!alvo) return;
      const r = alvo.getBoundingClientRect();
      alvo.style.setProperty('--mx', `${e.clientX - r.left}px`);
      alvo.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  };

  const ligar = () => {
    if (ligado) return;
    ligado = true;
    document.addEventListener('pointermove', aoMover, { passive: true });
  };

  const desligar = () => {
    if (!ligado) return;
    ligado = false;
    document.removeEventListener('pointermove', aoMover);
    if (quadro) window.cancelAnimationFrame(quadro);
    quadro = 0;
  };

  // Liga e desliga se o ambiente mudar no meio da visita (mouse conectado a um
  // tablet, preferência de movimento alterada no sistema).
  const avaliar = () => (mouse.matches && !reduzido.matches ? ligar() : desligar());
  avaliar();
  mouse.addEventListener?.('change', avaliar);
  reduzido.addEventListener?.('change', avaliar);

  return () => {
    desligar();
    mouse.removeEventListener?.('change', avaliar);
    reduzido.removeEventListener?.('change', avaliar);
  };
}

export function iniciarAurora() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (!('IntersectionObserver' in window)) return () => {};

  const faixas = Array.from(document.querySelectorAll('.secao--noite'));
  if (faixas.length === 0) return () => {};

  const observer = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      entrada.target.classList.toggle('is-visivel', entrada.isIntersecting);
    });
  });

  faixas.forEach((faixa) => observer.observe(faixa));

  return () => {
    observer.disconnect();
    faixas.forEach((faixa) => faixa.classList.remove('is-visivel'));
  };
}
