import { useState } from 'react';

const Navbar = ({ scrollToSection, startConversion }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavClick = (selector, name) => {
    scrollToSection(selector, name);
    setIsMenuOpen(false);
  };

  return (
    <nav id="navbar" role="navigation" aria-label="Navegação principal" className={isMenuOpen ? 'mobile-menu-active' : ''}>
      <div className="nav-inner">
        <button 
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setIsMenuOpen(false);
          }} 
          className="nav-logo" 
          style={{ background: 'none', border: 'none', cursor: 'pointer' }} 
          aria-label="TelaHub Home"
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
              style={{ width: 18, height: 18, color: '#FFFFFF' }}
            >
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
              <polyline points="17 2 12 7 7 2" />
            </svg>
          </div>
          TelaHub
        </button>
        
        <ul className="nav-links" role="list">
          <li>
            <button onClick={() => scrollToSection('#recursos', 'recursos')}>Recursos</button>
          </li>
          <li>
            <button onClick={() => scrollToSection('#casos', 'casos')}>Casos de Uso</button>
          </li>
          <li>
            <button onClick={() => scrollToSection('#precos', 'precos')}>Preços</button>
          </li>
        </ul>

        <div className="nav-cta">
          <button
            onClick={() => startConversion('gratis', 'navbar', 'Começar grátis')}
            className="btn btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
          >
            Começar grátis
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              style={{ width: 14, height: 14 }}
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        <button 
          className={`mobile-menu-toggle ${isMenuOpen ? 'open' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
      </div>

      {isMenuOpen && (
        <div id="mobile-menu" className="mobile-menu-overlay" role="dialog" aria-modal="true" aria-label="Menu móvel">
          <ul className="mobile-nav-links" role="list">
            <li>
              <button onClick={() => handleNavClick('#recursos', 'recursos')}>Recursos</button>
            </li>
            <li>
              <button onClick={() => handleNavClick('#casos', 'casos')}>Casos de Uso</button>
            </li>
            <li>
              <button onClick={() => handleNavClick('#precos', 'precos')}>Preços</button>
            </li>
          </ul>

          <div className="mobile-nav-cta">
            <button
              onClick={() => { startConversion('gratis', 'navbar_mobile', 'Começar grátis'); setIsMenuOpen(false); }}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '0.95rem' }}
            >
              Começar grátis
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                style={{ width: 14, height: 14 }}
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
