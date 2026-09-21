import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Fundo do painel: grade fina + poucos brilhos na cor de destaque que derivam
 * devagar entre as interseções.
 *
 * Adaptado do `GridGlowBackground` do 21st.dev, com mudanças deliberadas:
 * - a GRADE é CSS (`.th-grid-bg::before` em index.css), não canvas — é
 *   estática, então não há por que redesenhá-la a cada frame;
 * - o canvas só pinta os brilhos, em resolução 1x (são borrões; retina não
 *   acrescenta nada) e a ~30 fps;
 * - a cor vem de `--th-accent-rgb` e é relida quando `libs/theme.ts` troca o
 *   preset (observa o `style` do <html>), então funciona com todos os presets;
 * - PAUSA com a aba oculta e, com `prefers-reduced-motion`, pinta um único
 *   quadro parado;
 * - não aparece no Player (a TV tem o próprio conteúdo) nem nas telas claras,
 *   que cobrem a viewport com fundo próprio (animar por baixo delas é custo
 *   sem retorno).
 */

// Rotas que NÃO recebem o fundo. `/player` é a TV; as demais são telas claras.
const ROTAS_SEM_FUNDO = [
  '/player',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/assinatura',
  '/conecte-sua-tv',
];

const TAMANHO_GRADE = 48; // igual ao background-size da grade em index.css
const QTD_BRILHOS = 5;
const INTERVALO_FRAME = 1000 / 30;

interface Brilho {
  x: number;
  y: number;
  alvoX: number;
  alvoY: number;
  raio: number;
  velocidade: number;
  alpha: number;
  /** 0 = accent base, 1 = accent-soft */
  tom: 0 | 1;
}

const lerRgb = (nome: string, reserva: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || reserva;

const CanvasBrilhos: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)');
    let cores: [string, string] = ['14, 165, 233', '56, 189, 248'];
    let brilhos: Brilho[] = [];
    let frameId = 0;
    let ultimo = 0;

    const lerCores = () => {
      cores = [lerRgb('--th-accent-rgb', cores[0]), lerRgb('--th-accent-soft-rgb', cores[1])];
    };

    const pontoDaGrade = (max: number) =>
      Math.floor(Math.random() * Math.max(1, max / TAMANHO_GRADE)) * TAMANHO_GRADE;

    const novoBrilho = (): Brilho => {
      const x = pontoDaGrade(canvas.width);
      const y = pontoDaGrade(canvas.height);
      return {
        x,
        y,
        alvoX: pontoDaGrade(canvas.width),
        alvoY: pontoDaGrade(canvas.height),
        raio: Math.random() * 110 + 90,
        velocidade: Math.random() * 0.006 + 0.004,
        alpha: reduzir.matches ? 1 : 0,
        tom: Math.random() > 0.5 ? 1 : 0,
      };
    };

    const redimensionar = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      brilhos = Array.from({ length: QTD_BRILHOS }, novoBrilho);
    };

    const desenhar = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const b of brilhos) {
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.raio);
        grad.addColorStop(0, `rgba(${cores[b.tom]}, ${0.22 * b.alpha})`);
        grad.addColorStop(1, `rgba(${cores[b.tom]}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.raio, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const atualizar = () => {
      for (const b of brilhos) {
        b.x += (b.alvoX - b.x) * b.velocidade;
        b.y += (b.alvoY - b.y) * b.velocidade;
        if (Math.abs(b.alvoX - b.x) < 1 && Math.abs(b.alvoY - b.y) < 1) {
          b.alvoX = pontoDaGrade(canvas.width);
          b.alvoY = pontoDaGrade(canvas.height);
        }
        if (b.alpha < 1) b.alpha = Math.min(1, b.alpha + 0.01);
      }
    };

    const loop = (agora: number) => {
      frameId = requestAnimationFrame(loop);
      if (agora - ultimo < INTERVALO_FRAME) return;
      ultimo = agora;
      atualizar();
      desenhar();
    };

    const parar = () => {
      cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const iniciar = () => {
      parar();
      if (reduzir.matches) {
        // movimento reduzido: um quadro estático e mais nada
        brilhos.forEach(b => { b.alpha = 1; });
        desenhar();
        return;
      }
      if (!document.hidden) frameId = requestAnimationFrame(loop);
    };

    const aoMudarVisibilidade = () => {
      if (document.hidden) parar();
      else iniciar();
    };

    const aoRedimensionar = () => {
      redimensionar();
      if (reduzir.matches) desenhar();
    };

    // `libs/theme.ts` troca o preset reescrevendo o style do <html>
    const observador = new MutationObserver(() => {
      lerCores();
      if (reduzir.matches) desenhar();
    });
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

    lerCores();
    redimensionar();
    iniciar();

    window.addEventListener('resize', aoRedimensionar);
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    reduzir.addEventListener('change', iniciar);

    return () => {
      parar();
      observador.disconnect();
      window.removeEventListener('resize', aoRedimensionar);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      reduzir.removeEventListener('change', iniciar);
    };
  }, []);

  return <canvas ref={canvasRef} />;
};

export const GridGlowBackground: React.FC = () => {
  const { pathname } = useLocation();
  const semFundo = ROTAS_SEM_FUNDO.some(rota => pathname === rota || pathname.startsWith(`${rota}/`));
  if (semFundo) return null;

  return (
    <div className="th-grid-bg" aria-hidden="true">
      <CanvasBrilhos />
    </div>
  );
};

export default GridGlowBackground;
