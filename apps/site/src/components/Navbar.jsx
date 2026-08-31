import { useEffect, useState } from 'react';
import { APP_URL } from '../lib/funnel';
import './Navbar.css';

/**
 * Barra de navegação da landing v2.
 *
 * Três decisões que não são estéticas:
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
 * 3. **No celular os links de seção somem, o CTA fica.** O artboard de 390px
 *    (`Planejamento/design-2026-08-30/Mobile.dc.html`) tem só marca + botão. Um
 *    menu sanfona aqui seria mais um estado para manter e mais uma coisa para
 *    quebrar numa página cuja única tarefa é levar ao cadastro — as seções
 *    continuam alcançáveis rolando, e o rodapé repete os atalhos.
 */
const Navbar = ({ scrollToSection, goToPlans }) => {
  const [descolada, setDescolada] = useState(false);

  // Sombra só depois que a página rola: sobre o herói (que já tem fundo
  // `--papel-2`) a sombra permanente cria uma linha dupla com a borda.
  useEffect(() => {
    const aoRolar = () => setDescolada(window.scrollY > 8);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  const secoes = [
    { id: '#como-funciona', nome: 'como-funciona', rotulo: 'Como funciona' },
    { id: '#segmentos', nome: 'segmentos', rotulo: 'Para o seu negócio' },
    { id: '#na-tela', nome: 'na-tela', rotulo: 'O que vai na tela' },
    { id: '#precos', nome: 'precos', rotulo: 'Preços' },
  ];

  return (
    <nav
      className={`navbar${descolada ? ' navbar--descolada' : ''}`}
      aria-label="Navegação principal"
    >
      <div className="navbar__inner">
        <a className="navbar__marca" href="#topo" aria-label="TelaHub — início">
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
          {secoes.map((secao) => (
            <li key={secao.id}>
              <button type="button" onClick={() => scrollToSection(secao.id, secao.nome)}>
                {secao.rotulo}
              </button>
            </li>
          ))}
        </ul>

        <div className="navbar__acoes">
          <a className="navbar__entrar" href={`${APP_URL}/`}>
            Entrar
          </a>
          <button
            type="button"
            className="btn navbar__btn"
            onClick={() => goToPlans('navbar', 'Começar grátis')}
          >
            Começar grátis
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
