import { useEffect, useRef, useState } from 'react';
import { API_URL, attributionFields } from '../lib/funnel';
import { EVENT, META_EVENT, newEventId, readFbCookies, track } from '../lib/tracking';

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
 * ── Por que o envio mora AQUI, e não no App.jsx ─────────────────────────────
 * Ele morava lá, e o envio funcionava. O que não funcionava era a medição: o
 * `generate_lead` era disparado com um `event_id` sorteado na hora e o corpo do
 * `POST /api/leads` não levava id nenhum. Quando a Conversions API repete esse
 * mesmo `Lead` pelo servidor — que é o caminho que sobrevive a bloqueador de
 * anúncio —, a Meta precisa dos DOIS eventos com o MESMO `eventID` para
 * descartar a cópia. Ids diferentes não dão erro em lugar nenhum: a Meta conta
 * a conversão duas vezes, o custo por resultado do painel cai pela metade e a
 * campanha passa a otimizar em cima de um número inventado.
 *
 * O id não pode ser criado depois da resposta, porque ele precisa VIAJAR no
 * corpo do pedido. Então a ordem é: `newEventId()` antes do `fetch` →
 * `metaEventId` no corpo → e, só DEPOIS do sucesso, `track()` com esse mesmo
 * id. Disparar o evento antes da resposta contaria lead que o servidor recusou.
 *
 * `fbp` e `fbc` vão junto pelo mesmo motivo: são os cookies que o Pixel grava
 * (navegador e clique no anúncio) e é com eles que o servidor consegue casar o
 * evento com a pessoa. Sem os dois, o `Lead` de servidor chega anônimo e não
 * alimenta público semelhante — o ativo mais valioso dos primeiros 90 dias.
 *
 * ⚠️ CONSEQUÊNCIA PARA QUEM MEXER NO App.jsx: as props `handleLeadSubmit` e
 * `submitStatus` que ele ainda passa não são mais usadas. Não volte a ligar o
 * envio lá sem trazer o `metaEventId` junto — o defeito de deduplicação
 * reaparece sem sintoma nenhum.
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
const ESTADO_INICIAL = { loading: false, success: false, error: null };

const LeadModal = ({
  isModalOpen,
  setIsModalOpen,
  selectedPlan,
  formName = '',
  setFormName,
  formEmail = '',
  setFormEmail,
  formCompany = '',
  setFormCompany,
  formPhone = '',
  setFormPhone,
}) => {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const lastFocusedRef = useRef(null);
  const [status, setStatus] = useState(ESTADO_INICIAL);

  /**
   * Fechar limpa o estado do envio.
   *
   * Sem isto, quem envia, fecha e reabre a caixa para falar de outro plano
   * encontra a tela de sucesso do contato anterior e conclui que o segundo
   * pedido também foi enviado — sem ter preenchido nada.
   *
   * A limpeza acontece ao FECHAR, e não num efeito disparado ao abrir, porque
   * `setState` dentro de efeito provoca renderização em cascata (é erro de
   * lint no projeto, com razão). Todo caminho de saída passa por aqui: o X, o
   * clique no fundo, o botão "Fechar" e o Escape.
   */
  const fechar = () => {
    setIsModalOpen(false);
    setStatus(ESTADO_INICIAL);
  };

  // Foco entra na caixa ao abrir, fica preso enquanto ela estiver aberta, sai
  // no Escape e volta para quem a abriu. Sem isso, quem navega por teclado
  // continua tabulando pela página atrás do overlay, sem saber onde está.
  useEffect(() => {
    if (!isModalOpen) return;

    lastFocusedRef.current = document.activeElement;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Mesmo efeito de `fechar()`, escrito aqui porque o efeito não pode
        // depender de uma função recriada a cada render sem se reinscrever no
        // `keydown` toda vez. `setIsModalOpen` e `setStatus` são estáveis.
        setIsModalOpen(false);
        setStatus(ESTADO_INICIAL);
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

  /**
   * Envia o lead e mede a conversão UMA vez.
   *
   * A ordem das quatro linhas do meio é o contrato inteiro desta função:
   * id antes do envio, id dentro do corpo, sucesso conferido, evento disparado
   * com o mesmo id. Trocar qualquer uma de lugar quebra a deduplicação sem
   * quebrar nada visível.
   */
  const enviar = async (e) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      setStatus({ loading: false, success: false, error: 'Preencha nome e e-mail.' });
      return;
    }

    setStatus({ loading: true, success: false, error: null });

    // 1. O id nasce ANTES do envio porque precisa ir no corpo dele.
    const eventId = newEventId();
    const { fbp, fbc } = readFbCookies();

    try {
      const response = await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          company: formCompany || undefined,
          phone: formPhone || undefined,
          planCode: selectedPlan || undefined,
          // 2. O par do evento do navegador. É isto que a Conversions API
          //    repete para a Meta descartar a cópia.
          metaEventId: eventId,
          fbp,
          fbc,
          ...attributionFields(),
        }),
      });

      if (!response.ok) {
        const corpo = await response.json().catch(() => ({}));
        throw new Error(corpo.error || 'Não foi possível enviar agora.');
      }

      // 3. Só há lead quando o servidor confirma. Medir antes contaria como
      //    conversão o formulário que voltou erro.
      setStatus({ loading: false, success: true, error: null });

      // 4. Mesmo id do corpo, nos dois destinos (GA4 e Pixel).
      track({
        event: EVENT.GENERATE_LEAD,
        metaEvent: META_EVENT.LEAD,
        eventId,
        params: {
          plan_selected: selectedPlan,
          lead_company: formCompany || undefined,
          value: 0,
          currency: 'BRL',
        },
      });

      setFormName?.('');
      setFormEmail?.('');
      setFormCompany?.('');
      setFormPhone?.('');
    } catch (error) {
      setStatus({
        loading: false,
        success: false,
        error: `${error.message} Tente de novo em instantes.`,
      });
    }
  };

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
      ? 'Deixe seu contato e a gente marca um horário para montar a primeira tela junto com você, do zero até o conteúdo no ar.'
      : `Deixe seu contato e a gente responde com uma proposta${
          selectedPlan && !['Contato', 'Grátis'].includes(selectedPlan)
            ? ` para o plano ${selectedPlan}`
            : ''
        }.`;

  return (
    <div className="lead-modal-overlay" onClick={fechar}>
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
          onClick={fechar}
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

        {!status.success ? (
          <>
            <h2 id="lead-modal-title">{titulo}</h2>
            <p style={{ marginTop: 8 }}>{introducao}</p>

            <form onSubmit={enviar} style={{ marginTop: 20 }} noValidate>
              <div className="form-group">
                <label htmlFor="lead-name">
                  Seu nome <span aria-hidden="true">*</span>
                </label>
                <input
                  id="lead-name"
                  type="text"
                  className="form-input"
                  value={formName}
                  onChange={(e) => setFormName?.(e.target.value)}
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
                  onChange={(e) => setFormEmail?.(e.target.value)}
                  autoComplete="email"
                  required
                  aria-required="true"
                  aria-describedby={status.error ? 'lead-form-error' : undefined}
                />
              </div>

              <div className="form-group">
                <label htmlFor="lead-company">Empresa, condomínio ou loja</label>
                <input
                  id="lead-company"
                  type="text"
                  className="form-input"
                  value={formCompany}
                  onChange={(e) => setFormCompany?.(e.target.value)}
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
                  onChange={(e) => setFormPhone?.(e.target.value)}
                  autoComplete="tel"
                />
              </div>

              {/* Finalidade + onde ler a política, no ponto exato da coleta:
                  é o que a LGPD chama de informação adequada ao titular, e uma
                  linha aqui vale mais que a política que ninguém abre. */}
              <p className="micro" style={{ marginBottom: 14 }}>
                <span aria-hidden="true">*</span> Campos obrigatórios. Usamos seus dados só para
                responder este contato. Veja a{' '}
                <a href="/privacidade">Política de Privacidade</a>.
              </p>

              {status.error && (
                <p
                  id="lead-form-error"
                  role="alert"
                  aria-live="assertive"
                  style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 14 }}
                >
                  {status.error}
                </p>
              )}

              <button type="submit" className="btn btn--largo" disabled={status.loading}>
                {status.loading ? 'Enviando…' : 'Enviar contato'}
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
              pode colocar sua primeira tela no ar sozinho. Ela é grátis e não pede cartão.
            </p>
            <button
              type="button"
              onClick={fechar}
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
