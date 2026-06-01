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
            <div className="label animate-in" style={{ background: '#ECFDF5', color: '#10B981', borderColor: '#A7F3D0', borderRadius: '99px', fontSize: '12px' }}>
              <span style={{ display: 'inline-block', marginRight: '6px' }}>🟢</span>
              Mais de 200 empresas já aboliram o pen-drive no Brasil
            </div>
            <h1 id="hero-heading" className="hero-headline animate-in">
              Diga adeus aos fios soltos, pen-drives e telas pretas. Exiba promoções, cardápios dinâmicos e vídeos institucionais em qualquer TV, atualizando tudo pelo celular ou computador em menos de 5 minutos.
            </h1>
            <p className="hero-subheadline animate-in">
              Transforme a TV da sua loja em um vendedor silencioso que trabalha 24 horas por dia.
            </p>
            <div className="hero-actions animate-in">
              <button onClick={() => triggerConversionModal('Starter')} className="btn btn-primary">
                Quero modernizar minhas telas agora
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
            <div className="hero-trust animate-in" style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                style={{ color: '#9CA3AF', width: 14, height: 14, marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Teste gratuito de 7 dias. Não exige cartão de crédito.
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
