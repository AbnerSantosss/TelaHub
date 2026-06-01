import React from 'react';
import DashboardMockup from './DashboardMockup';

const Hero = ({ 
  triggerConversionModal, 
  scrollToSection, 
  telemetry, 
  lastSyncTime 
}) => {
  return (
    <section id="hero" aria-labelledby="hero-heading">
      <div className="container">
        <div className="hero-inner">
          <div className="hero-content">
            <div className="label animate-in" style={{ background: '#ECFDF5', color: '#10B981', borderColor: '#A7F3D0' }}>
              +200 operações ativas no Brasil
            </div>
            <h1 id="hero-heading" className="hero-headline animate-in">
              Cada TV parada é dinheiro que você está queimando.<br />
              <span className="text-gradient">Ative todas. Agora.</span>
            </h1>
            <p className="hero-subheadline animate-in">
              Aposente os pen-drives e as telas pretas. Transforme qualquer monitor em uma central de comunicação inteligente, atualizada via celular, de qualquer lugar do mundo.
            </p>
            <div className="hero-actions animate-in">
              <button onClick={() => triggerConversionModal('Starter')} className="btn btn-primary">
                Começar Agora
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  style={{ width: 16, height: 16 }}
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              <button onClick={() => scrollToSection('#recursos', 'recursos')} className="btn btn-ghost">
                Ver recursos
              </button>
            </div>
            <div className="hero-trust animate-in">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                style={{ color: 'var(--cyan)', width: 14, height: 14 }}
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Pareamento em 2 min · Sem cartão de crédito · 14 dias de teste completo
            </div>
          </div>

          <div className="hero-visual animate-in">
            <DashboardMockup telemetry={telemetry} lastSyncTime={lastSyncTime} triggerConversionModal={triggerConversionModal} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
