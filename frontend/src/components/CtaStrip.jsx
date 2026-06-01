import React from 'react';

const CtaStrip = ({ triggerConversionModal }) => {
  return (
    <div className="cta-strip">
      <div className="container">
        <div className="label" style={{ margin: '0 auto 20px', width: 'fit-content' }}>Última chamada</div>
        <h2 className="reveal">
          Daqui a 5 minutos, sua primeira tela pode estar no ar.<br /><span className="text-gradient">Ou você pode continuar procurando o pen-drive.</span>
        </h2>
        <p className="reveal" style={{ marginTop: '16px', marginBottom: '32px' }}>
          Crie a conta. Monte o conteúdo. Gere o código. Conecte a TV. Sem instalador, sem técnico, sem enrolação.
        </p>
        
        <div className="cta-strip-actions reveal">
          <button 
            onClick={() => triggerConversionModal('Starter')} 
            className="btn btn-primary" 
            style={{ fontSize: '1rem', padding: '14px 32px' }}
          >
            Quero ativar minha tela agora
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              style={{ width: 18, height: 18 }}
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
          <button 
            onClick={() => triggerConversionModal('Enterprise')} 
            className="btn btn-ghost" 
            style={{ fontSize: '1rem', padding: '14px 32px' }}
          >
            Falar com especialista
          </button>
        </div>
        <p style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Teste grátis por 14 dias · Pareamento em 2 min · Cancele quando quiser
        </p>
      </div>
    </div>
  );
};

export default CtaStrip;
