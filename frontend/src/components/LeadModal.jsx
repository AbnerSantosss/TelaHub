import React from 'react';

const LeadModal = ({
  isModalOpen,
  setIsModalOpen,
  selectedPlan,
  formName,
  setFormName,
  formEmail,
  setFormEmail,
  formCompany,
  setFormCompany,
  formPhone,
  setFormPhone,
  submitStatus,
  handleLeadSubmit
}) => {
  if (!isModalOpen) return null;

  return (
    <div className="lead-modal-overlay" onClick={() => setIsModalOpen(false)}>
      <div className="lead-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Modal Button */}
        <button 
          className="modal-close" 
          onClick={() => setIsModalOpen(false)} 
          aria-label="Fechar modal"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ width: 20, height: 20 }}
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Conditional Modal Contents */}
        {!submitStatus.success ? (
          <>
            <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: 800 }}>Experimente o TelaHub Grátis</h3>
            <p style={{ marginTop: '8px' }}>
              Preencha os dados abaixo para criar sua conta profissional e obter 14 dias de teste completo do plano <strong>{selectedPlan}</strong>.
            </p>
            
            <form onSubmit={handleLeadSubmit} style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label htmlFor="lead-name">Seu Nome</label>
                <input 
                  id="lead-name" 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Carlos Mendes" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="lead-email">E-mail Corporativo</label>
                <input 
                  id="lead-email" 
                  type="email" 
                  className="form-input" 
                  placeholder="Ex: carlos@empresa.com" 
                  value={formEmail} 
                  onChange={(e) => setFormEmail(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="lead-company">Nome da Empresa / Condomínio</label>
                <input 
                  id="lead-company" 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Alameda Towers" 
                  value={formCompany} 
                  onChange={(e) => setFormCompany(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label htmlFor="lead-phone">Telefone / WhatsApp</label>
                <input 
                  id="lead-phone" 
                  type="tel" 
                  className="form-input" 
                  placeholder="Ex: (11) 99999-9999" 
                  value={formPhone} 
                  onChange={(e) => setFormPhone(e.target.value)} 
                />
              </div>

              {submitStatus.error && (
                <p style={{ color: '#DC2626', fontSize: '0.82rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>⚠️</span> {submitStatus.error}
                </p>
              )}

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center', marginTop: 12, padding: '14px 24px' }} 
                disabled={submitStatus.loading}
              >
                {submitStatus.loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg className="animate-spin" viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16, stroke: '#ffffff', strokeWidth: 3 }}>
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"></circle>
                      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="#ffffff"></path>
                    </svg>
                    Processando...
                  </span>
                ) : 'Ativar Meus 14 Dias Grátis'}
              </button>
            </form>
          </>
        ) : (
          <div className="lead-success-card">
            <div className="success-icon-wrapper">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                style={{ width: 30, height: 30 }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: 800 }}>Conta Reservada!</h3>
            <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>
              Seus 14 dias de teste grátis no plano <strong>{selectedPlan}</strong> estão ativos. Enviamos as instruções de login e o código de pareamento para seu e-mail corporativo.
            </p>
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="btn btn-primary" 
              style={{ marginTop: 28, width: '100%', justifyContent: 'center', padding: '14px 24px' }}
            >
              Acessar Painel TelaHub
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadModal;
