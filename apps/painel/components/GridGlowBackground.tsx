import React from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Fundo do painel: a mesma grade fina da landing sobre o papel, com um brilho
 * claro da marca no topo. Tudo em CSS (`.th-grid-bg` em index.css), parado.
 *
 * Até 15/10/2026 havia aqui um canvas com cinco brilhos na cor de destaque
 * derivando pela grade, a ~30 fps. Saiu junto com o tema escuro: no papel claro
 * o movimento não acrescentava leitura e custava CPU em cada aba aberta.
 *
 * Não aparece no Player (a TV tem o próprio conteúdo) nem nas telas que cobrem
 * a viewport com fundo próprio.
 */

// Rotas que NÃO recebem o fundo. `/player` é a TV; as demais têm fundo próprio.
const ROTAS_SEM_FUNDO = [
  '/player',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/assinatura',
  '/conecte-sua-tv',
];

export const GridGlowBackground: React.FC = () => {
  const { pathname } = useLocation();
  const semFundo = ROTAS_SEM_FUNDO.some(rota => pathname === rota || pathname.startsWith(`${rota}/`));
  if (semFundo) return null;

  return <div className="th-grid-bg" aria-hidden="true" />;
};

export default GridGlowBackground;
