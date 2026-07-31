import { useEffect, useRef } from 'react';

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
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const lastFocusedRef = useRef(null);

  // Focus management: move focus into the modal on open, trap Tab inside it,
  // close on Escape, and return focus to whatever triggered it on close.
  useEffect(() => {
    if (!isModalOpen) return;

    lastFocusedRef.current = document.activeElement;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        return;
      }
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      lastFocusedRef.current?.focus?.();
    };
  }, [isModalOpen, setIsModalOpen]);

  if (!isModalOpen) return null;

  return (
    <div className="lead-modal-overlay" onClick={() => setIsModalOpen(false)}>
      <div
        className="lead-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-modal-title"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Modal Button */}
        <button
          className="modal-close"
          onClick={() => setIsModalOpen(false)}
          aria-label="Fechar modal"
          ref={closeButtonRef}
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
            <h3 id="lead-modal-title" style={{ fontFamily: 'var(--font-title)', fontWeight: 800 }}>Experimente o TelaHub Grátis</h3>
            <p style={{ marginTop: '8px' }}>
              {/* NÃO prometer "14 dias de teste": o trial de 14 dias foi descontinuado
                  no backend e substituído por freemium (1 tela, para sempre). */}
              Preencha os dados abaixo para criar sua conta. Sua primeira tela é grátis para sempre — sem cartão de crédito.
              {selectedPlan && selectedPlan !== 'Grátis' ? <> Depois você sobe para o plano <strong>{selectedPlan}</strong> quando quiser.</> : null}
            </p>

            <form onSubmit={handleLeadSubmit} style={{ marginTop: '20px' }} noValidate>
              <div className="form-group">
                <label htmlFor="lead-name">Seu Nome <span aria-hidden="true">*</span></label>
                <input
                  id="lead-name"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Carlos Mendes"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  autoComplete="name"
                  required
                  aria-required="true"
                />
              </div>

              <div className="form-group">
                <label htmlFor="lead-email">E-mail Corporativo <span aria-hidden="true">*</span></label>
                <input
                  id="lead-email"
                  type="email"
                  className="form-input"
                  placeholder="Ex: carlos@empresa.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  autoComplete="email"
                  required
                  aria-required="true"
                  aria-describedby={submitStatus.error ? 'lead-form-error' : undefined}
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
                  autoComplete="organization"
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
                  autoComplete="tel"
                />
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                <span aria-hidden="true">*</span> Campos obrigatórios
              </p>

              {submitStatus.error && (
                <p
                  id="lead-form-error"
                  role="alert"
                  aria-live="assertive"
                  style={{ color: '#DC2626', fontSize: '0.82rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span aria-hidden="true">⚠️</span> {submitStatus.error}
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
                    <svg className="animate-spin" viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16, stroke: '#ffffff', strokeWidth: 3 }} aria-hidden="true">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"></circle>
                      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="#ffffff"></path>
                    </svg>
                    Processando...
                  </span>
                ) : 'Quero minha tela grátis'}
                {/* NÃO voltar a escrever "14 dias": o trial de 14 dias foi
                    descontinuado em 2026-07-25 e substituído por 1 tela grátis
                    sem prazo. Prometer prazo inexistente é o mesmo problema de
                    CDC (arts. 30 e 37) já corrigido no resto da página. */}
              </button>
            </form>
          </>
        ) : (
          <div className="lead-success-card" role="status" aria-live="polite">
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
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 id="lead-modal-title" style={{ fontFamily: 'var(--font-title)', fontWeight: 800 }}>Recebemos seu contato!</h3>
            {/* A mensagem anterior afirmava que a conta estava ativa e que um
                e-mail com login e código de pareamento havia sido enviado.
                Nada disso acontece: `handleLeadSubmit` em `src/App.jsx` é um
                mock com `setTimeout` e o lead não é enviado a lugar nenhum.
                Afirmar entrega que não ocorreu é a falha mais grave possível
                aqui — o visitante fica esperando um e-mail que nunca vem.
                Só volte a prometer envio quando o formulário estiver de fato
                integrado (webhook/CRM) e o cadastro criar a conta. */}
            <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>
              Vamos falar com você em breve para liberar sua primeira tela grátis. Se preferir adiantar, chame no WhatsApp — respondemos por lá.
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
