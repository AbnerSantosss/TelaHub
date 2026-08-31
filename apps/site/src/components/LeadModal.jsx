import { useEffect, useRef } from 'react';

/**
 * Formulário de contato da landing.
 *
 * ── Quem cai aqui ───────────────────────────────────────────────────────────
 * Só quem NÃO tem caminho self-service: Enterprise (não tem preço público),
 * Parceiro (o programa ainda não tem contrato publicado) e quem pede ajuda para
 * montar a primeira tela. Grátis, Loja e Rede não passam por aqui — vão direto
 * ao cadastro ou ao checkout. Pedir dado a quem já podia se cadastrar sozinho é
 * perder a venda para o formulário.
 *
 * ── A tela de sucesso não pode prometer entrega que não acontece ────────────
 * A versão antiga afirmava que a conta estava ativa e que um e-mail com login e
 * código de pareamento havia sido enviado. Nada disso acontecia: o envio era um
 * `setTimeout` e o lead não ia a lugar nenhum. Hoje o lead é gravado de verdade
 * (`POST /api/leads`), mas a conta continua não sendo criada aqui — então a
 * mensagem diz exatamente isso, e o botão fecha a caixa em vez de fingir que
 * leva a um painel que ainda não existe para essa pessoa.
 *
 * Também não citamos WhatsApp: não há número publicável, e mandar alguém para
 * um canal inexistente é pior do que não oferecer canal nenhum.
 */
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
  handleLeadSubmit,
}) => {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const lastFocusedRef = useRef(null);

  // Foco entra na caixa ao abrir, fica preso enquanto ela estiver aberta, sai
  // no Escape e volta para quem a abriu. Sem isso, quem navega por teclado
  // continua tabulando pela página atrás do overlay, sem saber onde está.
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
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
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

  const ehParceiro = selectedPlan === 'Parceiro';
  const ehSetup = selectedPlan === 'Setup assistido';

  const titulo = ehParceiro
    ? 'Quero ser parceiro'
    : ehSetup
      ? 'Montamos sua primeira tela com você'
      : 'Falar com a gente';

  const introducao = ehParceiro
    ? 'Conte onde você instala e quantas telas costuma atender. Retornamos com as condições do programa.'
    : ehSetup
      ? 'Deixe seu contato e a gente marca um horário para montar a primeira tela junto com você — do zero até o conteúdo no ar.'
      : `Deixe seu contato e a gente responde com uma proposta${
          selectedPlan && !['Contato', 'Grátis'].includes(selectedPlan)
            ? ` para o plano ${selectedPlan}`
            : ''
        }.`;

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
        <button
          className="modal-close"
          onClick={() => setIsModalOpen(false)}
          aria-label="Fechar"
          ref={closeButtonRef}
          type="button"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 20, height: 20 }}
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {!submitStatus.success ? (
          <>
            <h2 id="lead-modal-title">{titulo}</h2>
            <p style={{ marginTop: 8 }}>{introducao}</p>

            <form onSubmit={handleLeadSubmit} style={{ marginTop: 20 }} noValidate>
              <div className="form-group">
                <label htmlFor="lead-name">
                  Seu nome <span aria-hidden="true">*</span>
                </label>
                <input
                  id="lead-name"
                  type="text"
                  className="form-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  autoComplete="name"
                  required
                  aria-required="true"
                />
              </div>

              <div className="form-group">
                <label htmlFor="lead-email">
                  E-mail <span aria-hidden="true">*</span>
                </label>
                <input
                  id="lead-email"
                  type="email"
                  className="form-input"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  autoComplete="email"
                  required
                  aria-required="true"
                  aria-describedby={submitStatus.error ? 'lead-form-error' : undefined}
                />
              </div>

              <div className="form-group">
                <label htmlFor="lead-company">Empresa, condomínio ou loja</label>
                <input
                  id="lead-company"
                  type="text"
                  className="form-input"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  autoComplete="organization"
                />
              </div>

              <div className="form-group">
                <label htmlFor="lead-phone">Telefone</label>
                <input
                  id="lead-phone"
                  type="tel"
                  className="form-input"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>

              <p className="micro" style={{ marginBottom: 14 }}>
                <span aria-hidden="true">*</span> Campos obrigatórios. Usamos seus dados só para
                responder este contato.
              </p>

              {submitStatus.error && (
                <p
                  id="lead-form-error"
                  role="alert"
                  aria-live="assertive"
                  style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 14 }}
                >
                  {submitStatus.error}
                </p>
              )}

              <button type="submit" className="btn btn--largo" disabled={submitStatus.loading}>
                {submitStatus.loading ? 'Enviando…' : 'Enviar contato'}
              </button>
            </form>
          </>
        ) : (
          <div className="lead-success-card" role="status" aria-live="polite">
            <div className="success-icon-wrapper" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: 30, height: 30 }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 id="lead-modal-title">Recebemos seu contato</h2>
            <p style={{ marginTop: 12 }}>
              Seu pedido foi registrado e vai para a nossa fila de atendimento. Enquanto isso, você
              pode colocar sua primeira tela no ar sozinho — ela é grátis e não pede cartão.
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn--fantasma btn--largo"
              style={{ marginTop: 24 }}
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadModal;
