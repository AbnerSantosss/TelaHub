const Footer = ({ scrollToSection, setActiveTab, activeDock, startConversion }) => {
  return (
    <>
      <footer>
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand">
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
                className="nav-logo" 
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: '16px' }}
              >
                <div className="nav-logo-icon">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    style={{ width: 16, height: 16, color: '#FFFFFF' }}
                  >
                    <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
                    <polyline points="17 2 12 7 7 2" />
                  </svg>
                </div>
                TelaHub
              </button>
              <p style={{ fontSize: '0.85rem', lineHeight: '1.7', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                A plataforma universal de sinalização digital para gerenciar telas em elevadores residenciais, murais comerciais, shoppings, lojas físicas, consultórios, hotéis e escritórios. Do pequeno painel de avisos à rede nacional de displays corporativos.
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Feito com orgulho no Brasil para operações que não podem parar.
              </p>
            </div>
            
            <div className="footer-links">
              <div className="footer-col">
                <h4>Plataforma</h4>
                <ul>
                  <li><button onClick={() => scrollToSection('#recursos', 'recursos')}>Recursos</button></li>
                  <li><button onClick={() => scrollToSection('#casos', 'casos')}>Aplicações</button></li>
                  <li><button onClick={() => scrollToSection('#precos', 'precos')}>Preços</button></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); scrollToSection('#argumento', 'argumento'); }}>Tecnologia</a></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Aplicações</h4>
                <ul>
                  <li><button onClick={() => { setActiveTab('cond'); scrollToSection('#casos', 'casos'); }}>Condomínios & Elevadores</button></li>
                  <li><button onClick={() => { setActiveTab('corp'); scrollToSection('#casos', 'casos'); }}>Prédios Corporativos</button></li>
                  <li><button onClick={() => { setActiveTab('varejo'); scrollToSection('#casos', 'casos'); }}>Varejo & Shoppings</button></li>
                  <li><button onClick={() => { setActiveTab('rh'); scrollToSection('#casos', 'casos'); }}>Endomarketing & RH</button></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Termos & Legal</h4>
                <ul>
                  {/* PENDÊNCIA REAL, não cosmética: estes links estão mortos
                      (href="#" + preventDefault). Como este site captura lead
                      (LeadModal) e usa cookies de campanha, a LGPD exige uma
                      política de privacidade acessível de verdade, com canal de
                      contato do titular. Enquanto as páginas não existirem, o
                      site coleta dado pessoal sem informar o titular.
                      "Políticas de SLA" foi removido: não há SLA contratado. */}
                  <li><a href="#" onClick={(e) => e.preventDefault()}>Privacidade</a></li>
                  <li><a href="#" onClick={(e) => e.preventDefault()}>Termos de Uso</a></li>
                  <li><a href="#" onClick={(e) => e.preventDefault()}>Suporte Geral</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom" style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <p>© 2026 TelaHub. Todos os direitos reservados.</p>
            <p>CNPJ 00.000.000/0001-00 · São Paulo, Brasil</p>
          </div>
        </div>
      </footer>

      {/* 10. Ergonomic mobile dock bar */}
      <div className="mobile-dock">
        <button 
          className={`mobile-dock-btn ${activeDock === 'recursos' ? 'active' : ''}`} 
          onClick={() => scrollToSection('#recursos', 'recursos')}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ width: 18, height: 18 }}
          >
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          Recursos
        </button>
        
        <button 
          className={`mobile-dock-btn ${activeDock === 'casos' ? 'active' : ''}`} 
          onClick={() => scrollToSection('#casos', 'casos')}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ width: 18, height: 18 }}
          >
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          Casos
        </button>
        
        <button 
          className={`mobile-dock-btn ${activeDock === 'precos' ? 'active' : ''}`} 
          onClick={() => scrollToSection('#precos', 'precos')}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ width: 18, height: 18 }}
          >
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          Planos
        </button>
        
        <button
          className="mobile-dock-cta"
          onClick={() => startConversion('gratis', 'mobile_dock', 'Grátis')}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ width: 13, height: 13 }}
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Grátis
        </button>
      </div>
    </>
  );
};

export default Footer;
