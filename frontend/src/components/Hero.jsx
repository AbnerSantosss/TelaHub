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
            <h1 id="hero-heading" className="hero-headline animate-in" style={{ fontSize: 'clamp(1.9rem, 3.5vw, 2.75rem)', fontWeight: '900', lineHeight: '1.2', letterSpacing: '-0.02em', color: '#111827', marginBottom: '20px' }}>
              Diga adeus aos fios soltos, pen-drives e telas pretas.
            </h1>
            <p className="hero-subheadline animate-in" style={{ fontSize: 'clamp(0.95rem, 1.25vw, 1.1rem)', color: '#4B5563', lineHeight: '1.65', marginBottom: '32px', maxWidth: '540px' }}>
              Exiba promoções, cardápios dinâmicos e vídeos institucionais em qualquer TV, atualizando tudo pelo celular ou computador em menos de 5 minutos.
            </p>
            <div className="hero-actions animate-in">
              <button onClick={() => triggerConversionModal('Business')} className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '0.95rem', fontWeight: '700' }}>
                Quero modernizar minhas telas
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
              <button onClick={() => scrollToSection('#recursos', 'recursos')} className="btn btn-ghost" style={{ padding: '14px 28px', fontSize: '0.95rem' }}>
                Ver recursos
              </button>
            </div>
            <div className="hero-trust animate-in" style={{ color: '#6B7280', fontSize: '0.85rem', marginTop: '24px' }}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                style={{ color: '#10B981', width: 14, height: 14, marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }}
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
 
        {/* Objection Breaking Banner - Directly under the mockup/video */}
        <div className="hero-objection-banner animate-in" style={{
          marginTop: '56px',
          padding: '24px 32px',
          background: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '2px',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: '20px',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left'
        }}>
          <p className="objection-text" style={{ fontSize: 'clamp(0.9rem, 1.1vw, 1rem)', color: '#111827', margin: 0, lineHeight: '1.5', maxWidth: '640px', flex: '1 1 450px' }}>
            <strong>O passo a passo para modernizar sua loja e anunciar suas ofertas</strong> mesmo que você não entenda nada de tecnologia ou design.
          </p>
          <button onClick={() => triggerConversionModal('Business')} className="btn btn-primary" style={{
            padding: '12px 24px',
            fontSize: '0.9rem',
            fontWeight: '700',
            width: '100%',
            maxWidth: '300px',
            flex: '0 0 auto'
          }}>
            Quero modernizar minhas telas
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
