import { useEffect, useRef } from 'react';

/**
 * Fundo ambiente: uma parede de telas que se atualiza sozinha.
 *
 * ── Por que trocou ──────────────────────────────────────────────────────────
 * O fundo anterior era a rede de partículas com linhas ligando pontos — o
 * fundo padrão de página de tecnologia, que aparece igual em produto de
 * cibersegurança, de blockchain e de IA. Não dizia nada sobre ESTE produto, e
 * em azul a 30% sobre branco mal era perceptível: custava um `requestAnimation
 * Frame` permanente para entregar quase nada.
 *
 * ── O que é agora ───────────────────────────────────────────────────────────
 * O TelaHub vende uma coisa concreta: a tela da loja muda de conteúdo em 30
 * segundos, sem ninguém ir até lá. Então o fundo é literalmente isso — uma
 * parede de telas vista de longe, onde uma onda de atualização passa
 * periodicamente e cada tela "troca de conteúdo" ao ser alcançada.
 *
 * É a promessa da página acontecendo atrás do texto, em vez de decoração.
 *
 * ── As três regras que mantêm isto discreto ─────────────────────────────────
 * 1. **Nunca competir com o texto.** As telas vivem entre 4% e 14% de opacidade
 *    e o brilho de atualização não passa de 22%. O contraste do conteúdo é o
 *    problema que este redesenho veio resolver; seria absurdo reintroduzi-lo
 *    pelo fundo.
 * 2. **Custo previsível.** DPR limitado a 2 (num monitor 4K, 3x só queima
 *    bateria), grade menor no celular, e a animação PARA quando a aba sai de
 *    foco — o `requestAnimationFrame` antigo rodava para sempre.
 * 3. **`prefers-reduced-motion` desenha o quadro parado.** A parede continua
 *    lá, só não se move. Quem pediu menos movimento não perde o visual.
 */

const CELULA_DESKTOP = 104;
const CELULA_MOBILE = 78;
/** Segundos que a onda leva para atravessar a tela inteira. */
const PERIODO_ONDA = 9;

const ScreenWall = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let telas = [];
    let larguraCss = 0;
    let alturaCss = 0;

    /** Ruído determinístico: mesma célula, mesmo valor — sem `Math.random()`
     *  por quadro, que faria a parede cintilar sem sentido a cada redimensionamento. */
    const ruido = (x, y) => {
      const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return n - Math.floor(n);
    };

    const montarGrade = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      larguraCss = window.innerWidth;
      alturaCss = window.innerHeight;

      canvas.width = Math.floor(larguraCss * dpr);
      canvas.height = Math.floor(alturaCss * dpr);
      canvas.style.width = `${larguraCss}px`;
      canvas.style.height = `${alturaCss}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const passo = larguraCss < 768 ? CELULA_MOBILE : CELULA_DESKTOP;
      const colunas = Math.ceil(larguraCss / passo) + 1;
      const linhas = Math.ceil(alturaCss / passo) + 1;

      telas = [];
      for (let c = 0; c < colunas; c += 1) {
        for (let l = 0; l < linhas; l += 1) {
          const r = ruido(c, l);
          // Uma em cada cinco células fica vazia: parede cheia demais vira
          // textura de xadrez e some; com falhas, lê-se como telas espalhadas.
          if (r > 0.8) continue;

          const largura = passo * (0.5 + r * 0.16);
          const altura = largura * 0.62; // proporção de tela, não quadrado
          const x = c * passo + (passo - largura) / 2;
          const y = l * passo + (passo - altura) / 2;

          // Desvanecimento em direção ao centro: a coluna de leitura fica
          // limpa e a parede vive nas bordas. Feito aqui, e não com máscara
          // CSS, porque máscara sobre canvas fixo recompõe a página inteira a
          // cada quadro (ver o comentário de #network-canvas em index.css).
          const dx = (x + largura / 2 - larguraCss / 2) / (larguraCss * 0.5);
          const dy = (y + altura / 2 - alturaCss * 0.42) / (alturaCss * 0.5);
          const distancia = Math.sqrt(dx * dx + dy * dy);
          const borda = Math.min(1, Math.max(0, (distancia - 0.62) / 0.5));
          if (borda <= 0.02) continue; // célula central: nem entra na lista

          telas.push({
            x,
            y,
            largura,
            altura,
            borda,
            base: 0.028 + r * 0.038,
            // Fase própria: as telas não atualizam todas no mesmo instante.
            fase: ruido(l, c),
          });
        }
      }
    };

    const desenhar = (tempoSegundos) => {
      ctx.clearRect(0, 0, larguraCss, alturaCss);

      const diagonal = larguraCss + alturaCss;
      const frenteOnda = ((tempoSegundos % PERIODO_ONDA) / PERIODO_ONDA) * diagonal;

      telas.forEach((tela) => {
        // Distância da tela até a frente da onda que percorre a diagonal.
        const posicao = tela.x + tela.y;
        const distancia = Math.abs(posicao - frenteOnda);
        const alcance = 190;
        const aceso = distancia < alcance ? (1 - distancia / alcance) ** 2 : 0;

        const opacidade = (tela.base + aceso * 0.13) * tela.borda;

        // Corpo da tela.
        ctx.beginPath();
        ctx.roundRect(tela.x, tela.y, tela.largura, tela.altura, 5);
        ctx.fillStyle = `rgba(3, 105, 161, ${opacidade * 0.5})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(3, 105, 161, ${opacidade})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // A "troca de conteúdo": uma faixa clara que varre a tela acesa. É o
        // detalhe que transforma retângulo em tela sendo atualizada.
        if (aceso > 0.12) {
          const progresso = (tempoSegundos * 0.6 + tela.fase) % 1;
          const y = tela.y + tela.altura * progresso;
          ctx.beginPath();
          ctx.moveTo(tela.x + 2, y);
          ctx.lineTo(tela.x + tela.largura - 2, y);
          ctx.strokeStyle = `rgba(56, 189, 248, ${aceso * 0.22 * tela.borda})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    };

    montarGrade();

    if (reduzirMovimento) {
      // Quadro parado, com a onda no meio para a parede não ficar chapada.
      desenhar(PERIODO_ONDA * 0.5);
      const aoRedimensionar = () => {
        montarGrade();
        desenhar(PERIODO_ONDA * 0.5);
      };
      window.addEventListener('resize', aoRedimensionar);
      return () => window.removeEventListener('resize', aoRedimensionar);
    }

    let quadro = 0;
    let inicio = null;
    const laco = (agora) => {
      if (inicio === null) inicio = agora;
      desenhar((agora - inicio) / 1000);
      quadro = window.requestAnimationFrame(laco);
    };
    quadro = window.requestAnimationFrame(laco);

    // Aba em segundo plano não precisa de animação. O canvas anterior seguia
    // desenhando indefinidamente, o que em notebook é bateria à toa.
    const aoTrocarVisibilidade = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(quadro);
      } else {
        inicio = null;
        quadro = window.requestAnimationFrame(laco);
      }
    };

    let debounce;
    const aoRedimensionar = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(montarGrade, 150);
    };

    window.addEventListener('resize', aoRedimensionar);
    document.addEventListener('visibilitychange', aoTrocarVisibilidade);

    return () => {
      window.cancelAnimationFrame(quadro);
      window.clearTimeout(debounce);
      window.removeEventListener('resize', aoRedimensionar);
      document.removeEventListener('visibilitychange', aoTrocarVisibilidade);
    };
  }, []);

  return <canvas ref={canvasRef} id="network-canvas" aria-hidden="true" />;
};

export default ScreenWall;
