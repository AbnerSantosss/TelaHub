import React from 'react';

const Navbar = ({ scrollToSection, triggerConversionModal }) => {
  return (
    <nav id="navbar" role="navigation" aria-label="Navegação principal">
      <div className="nav-inner">
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
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
          <li>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--text-secondary)' }}>Documentação</a>
          </li>
        </ul>
        
        <div className="nav-cta">
          <button 
            onClick={() => triggerConversionModal('Starter')} 
            className="btn btn-ghost" 
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Entrar
          </button>
          <button 
            onClick={() => triggerConversionModal('Starter')} 
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
      </div>
    </nav>
  );
};

export default Navbar;
