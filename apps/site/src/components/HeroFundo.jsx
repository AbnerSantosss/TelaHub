import { useEffect, useRef } from 'react';

/**
 * Fundo do herói: grade fina com pontos de luz em --marca que acendem e
 * derivam de cruzamento em cruzamento.
 *
 * ── De onde veio ────────────────────────────────────────────────────────────
 * Ideia do "GridGlowBackground" (21st.dev): grade + manchas radiais que andam
 * até um cruzamento sorteado. O original é escuro, pinta a grade inteira no
 * canvas a cada quadro, mede a JANELA (não o contêiner) e roda para sempre,
 * mesmo com a aba escondida. Aqui mudou quase tudo em volta da ideia:
 *
 *   - A grade em si é CSS (`.hero__fundo`, background com dois gradientes):
 *     existe no HTML pré-renderizado, sem JavaScript, e não custa quadro.
 *   - O canvas só desenha as manchas de luz e as RECORTA pela mesma grade
 *     (`destination-in` com um padrão de linhas): o efeito é a grade acendendo
 *     por baixo da luz, e não uma névoa azul sobre o texto do herói.
 *   - Mede o próprio herói (ResizeObserver), limita o devicePixelRatio a 1,5 e
 *     desenha a ~30 quadros por segundo — é fundo, não jogo.
 *   - PAUSA quando o herói sai da tela (IntersectionObserver) e quando a aba
 *     fica oculta (visibilitychange).
 *   - Não inicia com `prefers-reduced-motion` (e o CSS também esconde o canvas).
 *
 * ── SSR ─────────────────────────────────────────────────────────────────────
 * O render devolve só dois elementos vazios; tudo que toca `window`,
 * `document` ou o canvas mora no useEffect, que não roda no prerender.
 *
 * O tamanho da célula precisa bater com `--grade-passo` em Hero.css: se um
 * mudar sem o outro, a luz acende fora das linhas.
 */

const PASSO = 40; // px — igual a --grade-passo em Hero.css
const INTERVALO_MS = 1000 / 30;

function sortearCruzamento(largura, altura) {
  return {
    x: Math.round((Math.random() * largura) / PASSO) * PASSO,
    y: Math.round((Math.random() * altura) / PASSO) * PASSO,
  };
}

/**
 * A mesma cor com alfa 0. 'transparent' no gradiente do canvas é PRETO
 * transparente, e a transição passa por um cinza sujo nas bordas da luz.
 */
function transparente(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return 'rgba(3, 105, 161, 0)';
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, 0)`;
}

const HeroFundo = () => {
  const refCanvas = useRef(null);

  useEffect(() => {
    const canvas = refCanvas.current;
    if (!canvas) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const ctx = canvas.getContext('2d');
    // Mede a camada .hero__fundo (inset: 0 dentro do herói), não a janela.
    const hospedeiro = canvas.parentElement;
    if (!ctx || !hospedeiro) return undefined;

    const cor = getComputedStyle(document.documentElement).getPropertyValue('--marca').trim() || '#0369a1';
    const corApagada = transparente(cor);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    // Padrão de recorte: uma célula da grade (linha à esquerda e no topo),
    // com o cruzamento um pouco mais forte, para os "nós" brilharem.
    const celula = document.createElement('canvas');
    celula.width = PASSO * dpr;
    celula.height = PASSO * dpr;
    const cc = celula.getContext('2d');
    cc.scale(dpr, dpr);
    cc.fillStyle = '#000';
    cc.fillRect(0, 0, PASSO, 1);
    cc.fillRect(0, 0, 1, PASSO);
    cc.beginPath();
    cc.arc(0.5, 0.5, 2, 0, Math.PI * 2);
    cc.fill();
    const padrao = ctx.createPattern(celula, 'repeat');
    // O padrão foi desenhado em pixels de dispositivo; o contexto principal
    // trabalha em px CSS (setTransform abaixo), então o padrão desfaz a escala.
    padrao?.setTransform?.(new DOMMatrix().scale(1 / dpr, 1 / dpr));

    let largura = 0;
    let altura = 0;
    let luzes = [];

    const criarLuzes = () => {
      const quantidade = largura < 640 ? 4 : 7;
      luzes = Array.from({ length: quantidade }, () => {
        const inicio = sortearCruzamento(largura, altura);
        return {
          ...inicio,
          alvo: sortearCruzamento(largura, altura),
          raio: 90 + Math.random() * 110,
          velocidade: 0.008 + Math.random() * 0.01,
          alfa: 0,
        };
      });
    };

    const medir = () => {
      const r = hospedeiro.getBoundingClientRect();
      largura = Math.max(1, Math.round(r.width));
      altura = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(largura * dpr);
      canvas.height = Math.round(altura * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      criarLuzes();
    };

    const desenhar = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, largura, altura);

      luzes.forEach((l) => {
        l.x += (l.alvo.x - l.x) * l.velocidade;
        l.y += (l.alvo.y - l.y) * l.velocidade;
        if (Math.abs(l.alvo.x - l.x) < 1 && Math.abs(l.alvo.y - l.y) < 1) {
          l.alvo = sortearCruzamento(largura, altura);
        }
        if (l.alfa < 1) l.alfa = Math.min(1, l.alfa + 0.02);

        const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.raio);
        g.addColorStop(0, cor);
        g.addColorStop(1, corApagada);
        ctx.globalAlpha = l.alfa * 0.85;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(l.x, l.y, l.raio, 0, Math.PI * 2);
        ctx.fill();
      });

      // Mantém a luz só onde há linha de grade.
      ctx.globalAlpha = 1;
      if (padrao) {
        ctx.globalCompositeOperation = 'destination-in';
        ctx.fillStyle = padrao;
        ctx.fillRect(0, 0, largura, altura);
      }
    };

    let quadro = 0;
    let anterior = 0;
    let naTela = true;

    const laco = (agora) => {
      quadro = window.requestAnimationFrame(laco);
      if (agora - anterior < INTERVALO_MS) return;
      anterior = agora;
      desenhar();
    };

    const iniciar = () => {
      if (quadro || !naTela || document.hidden) return;
      quadro = window.requestAnimationFrame(laco);
    };

    const parar = () => {
      if (quadro) window.cancelAnimationFrame(quadro);
      quadro = 0;
    };

    medir();
    const ro = 'ResizeObserver' in window ? new ResizeObserver(medir) : null;
    ro?.observe(hospedeiro);

    const io =
      'IntersectionObserver' in window
        ? new IntersectionObserver(([entrada]) => {
            naTela = entrada.isIntersecting;
            if (naTela) iniciar();
            else parar();
          })
        : null;
    io?.observe(hospedeiro);

    const aoMudarVisibilidade = () => (document.hidden ? parar() : iniciar());
    document.addEventListener('visibilitychange', aoMudarVisibilidade);

    canvas.classList.add('hero__canvas--pronto');
    iniciar();

    return () => {
      parar();
      ro?.disconnect();
      io?.disconnect();
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      canvas.classList.remove('hero__canvas--pronto');
    };
  }, []);

  return (
    <div className="hero__fundo" aria-hidden="true">
      <canvas ref={refCanvas} className="hero__canvas" />
    </div>
  );
};

export default HeroFundo;
