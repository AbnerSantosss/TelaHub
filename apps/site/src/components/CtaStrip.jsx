const CtaStrip = ({ startConversion }) => {
  return (
    <div className="cta-strip">
      <div className="container">
        <div className="label" style={{ margin: '0 auto 20px', width: 'fit-content', background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)', color: '#FFFFFF' }}>Última chamada</div>
        <h2 className="reveal">
          Daqui a 5 minutos, sua primeira tela pode estar no ar.<br /><span style={{ color: 'rgba(255,255,255,0.75)' }}>Ou você pode continuar procurando o pen-drive.</span>
        </h2>
        <p className="reveal" style={{ marginTop: '16px', marginBottom: '32px' }}>
          Crie a conta. Escolha um modelo. Gere o código. Digite na TV. Quatro passos, nenhum instalador, nenhum técnico — e a próxima oferta você troca do celular, em 30 segundos.
        </p>
        
        <div className="cta-strip-actions reveal">
          <button
            onClick={() => startConversion('gratis', 'cta_strip', 'Quero ativar minha tela grátis')}
            className="btn btn-primary"
            style={{ fontSize: '1rem', padding: '14px 32px', background: '#FFFFFF', color: 'var(--brand)' }}
          >
            Quero ativar minha tela grátis
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
            onClick={() => startConversion('enterprise', 'cta_strip', 'Falar com especialista')}
            className="btn btn-ghost"
            style={{ fontSize: '1rem', padding: '14px 32px', borderColor: 'rgba(255,255,255,0.35)', color: '#FFFFFF' }}
          >
            Falar com especialista
          </button>
        </div>
        <p style={{ marginTop: '20px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}>
          {/* Antes dizia "Teste grátis por 14 dias", contradizendo os "7 dias" da Hero.
              Prazo de teste só volta aqui depois de definida a oferta oficial. */}
          Primeira tela grátis para sempre · Sem cartão · Pareamento em 2 min · Garantia de 7 dias
        </p>
      </div>
    </div>
  );
};

export default CtaStrip;
