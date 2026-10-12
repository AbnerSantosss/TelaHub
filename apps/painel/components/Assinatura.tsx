import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Info, Loader2, RotateCcw } from 'lucide-react';

import {
  cancelSubscription,
  formatCentsOrDash,
  formatDateBR,
  formatDateLongBR,
  getBillingAccount,
  intervalLabel,
  reactivateSubscription,
  startCheckout,
  type BillingAccount,
  type BillingPayment,
} from '../services/billing';
import {
  billingStatusExplanation,
  billingStatusLabel,
  billingStatusTone,
} from '../services/subscription';
import { getApiErrorMessage } from '../libs/api';
import { checkoutUrl } from '../libs/external-urls';
// tokens e efeitos do tema claro, antes do CSS da tela
import './claro.css';
import './Assinatura.css';

// =============================================================================
// PÁGINA "ASSINATURA"
//
// POR QUE ELA EXISTE, e não é só uma tela bonita:
//   • o CDC dá ao consumidor o direito de rescindir, e esconder o cancelamento
//     atrás de "fale com o suporte" é prática que gera passivo — o botão fica
//     aqui, visível, e o texto diz exatamente o que acontece depois dele;
//   • a landing promete cancelamento pelo painel; página que não existe
//     transforma promessa publicada em propaganda enganosa.
//
// REGRA DE CONTEÚDO: nada de número inventado. Sem banco de dados no ar, um
// valor plausível na tela seria indistinguível de um valor real — e este é um
// documento de cobrança. Campo que a API não mandou aparece como "—", e a
// lista de pagamentos vazia diz "nenhuma cobrança ainda", não some.
// =============================================================================

const rotuloStatusPagamento = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'Pago';
    case 'pending':
      return 'Aguardando';
    case 'failed':
      return 'Não aprovado';
    case 'refunded':
      return 'Devolvido';
    case 'canceled':
      return 'Cancelado';
    default:
      return status;
  }
};

const LinhaPagamento: React.FC<{ pagamento: BillingPayment }> = ({ pagamento }) => (
  <tr>
    <td>{formatDateBR(pagamento.paidAt) ?? formatDateBR(pagamento.dueDate) ?? '-'}</td>
    <td>{rotuloStatusPagamento(pagamento.status)}</td>
    <td>{formatCentsOrDash(pagamento.amountCents)}</td>
    <td>{pagamento.method ?? '-'}</td>
    <td>
      {/* Só mostramos link quando ele existe. Botão de fatura que não abre nada
          é pior do que não ter botão. */}
      {pagamento.invoiceUrl ? (
        <a className="asn-link" href={pagamento.invoiceUrl} target="_blank" rel="noopener noreferrer">
          Ver fatura
        </a>
      ) : (
        '-'
      )}
      {pagamento.nfseUrl && (
        <>
          {' · '}
          <a className="asn-link" href={pagamento.nfseUrl} target="_blank" rel="noopener noreferrer">
            Nota fiscal
          </a>
        </>
      )}
    </td>
  </tr>
);

const Assinatura: React.FC = () => {
  const navigate = useNavigate();

  const [conta, setConta] = useState<BillingAccount | null>(null);
  const [falha, setFalha] = useState<{ motivo: 'no_subscription' | 'unavailable'; texto: string } | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [processando, setProcessando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const resultado = await getBillingAccount();
    if (resultado.account) {
      setConta(resultado.account);
      setFalha(null);
    } else {
      setConta(null);
      setFalha({
        motivo: resultado.reason === 'no_subscription' ? 'no_subscription' : 'unavailable',
        texto: resultado.message ?? 'Não foi possível carregar sua assinatura agora.',
      });
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const assinar = async () => {
    setProcessando(true);
    setErroAcao(null);
    try {
      const destino = await startCheckout({ planCode: conta?.planCode ?? undefined });
      window.location.href = destino;
    } catch (error) {
      // O gateway ainda não está integrado (501). Em vez de encerrar aqui,
      // mandamos para o app de checkout, que é quem conduz a contratação hoje.
      console.error('Checkout indisponível pela API, usando o app de checkout:', error);
      window.location.href = checkoutUrl();
    } finally {
      setProcessando(false);
    }
  };

  const cancelar = async () => {
    setProcessando(true);
    setErroAcao(null);
    try {
      const resultado = await cancelSubscription(motivoCancelamento);
      setConfirmandoCancelamento(false);
      setMotivoCancelamento('');
      const ate = formatDateLongBR(resultado.currentPeriodEnd ?? conta?.currentPeriodEnd);
      setRecado(
        ate
          ? `Assinatura cancelada. Seu acesso continua até ${ate}.`
          : 'Assinatura cancelada. Seu acesso continua até o fim do período já pago.'
      );
      await carregar();
    } catch (error) {
      setErroAcao(
        getApiErrorMessage(
          error,
          'Não foi possível registrar o cancelamento agora. Tente de novo em instantes.'
        )
      );
    } finally {
      setProcessando(false);
    }
  };

  const reativar = async () => {
    setProcessando(true);
    setErroAcao(null);
    try {
      await reactivateSubscription();
      setRecado('Assinatura reativada. A cobrança volta ao ciclo normal.');
      await carregar();
    } catch (error) {
      setErroAcao(
        getApiErrorMessage(error, 'Não foi possível reativar a assinatura agora.')
      );
    } finally {
      setProcessando(false);
    }
  };

  const Cabecalho = (
    <header className="asn-topo">
      <div>
        <h1 className="asn-titulo">Assinatura</h1>
        <p className="asn-subtitulo">
          Aqui você vê o plano, as cobranças e pode cancelar sem precisar falar com o suporte.
        </p>
      </div>
      <button type="button" className="asn-btn asn-btn-secundario" onClick={() => navigate('/')}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar ao painel
      </button>
    </header>
  );

  if (carregando) {
    return (
      <div className="asn">
        <div className="asn-wrap">
          {Cabecalho}
          <div className="asn-cartao">
            <p className="asn-carregando">
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              Carregando sua assinatura…
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Sem dados: conta sem assinatura, ou API fora do ar ───────────────────
  if (!conta) {
    const semAssinatura = falha?.motivo === 'no_subscription';
    return (
      <div className="asn">
        <div className="asn-wrap">
          {Cabecalho}
          <div className="asn-cartao">
            <h2 className="asn-cartao-titulo">
              {semAssinatura ? 'Esta conta não tem assinatura' : 'Não conseguimos carregar sua assinatura'}
            </h2>
            <p className="asn-vazio">{falha?.texto}</p>
            <div className="asn-acoes">
              {semAssinatura ? (
                <button
                  type="button"
                  className="asn-btn asn-btn-primario"
                  onClick={assinar}
                  disabled={processando}
                >
                  Ver planos
                </button>
              ) : (
                <button type="button" className="asn-btn asn-btn-secundario" onClick={carregar}>
                  <RotateCcw size={16} aria-hidden="true" />
                  Tentar de novo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tom = billingStatusTone(conta.status);
  const explicacao = billingStatusExplanation(conta.status);
  const fimPeriodo = formatDateBR(conta.currentPeriodEnd);
  const fimPeriodoLongo = formatDateLongBR(conta.currentPeriodEnd);
  const proximaCobranca = formatDateBR(conta.nextChargeAt);

  /** Cancelada mas ainda dentro do ciclo pago: dá para voltar atrás. */
  const podeReativar =
    (conta.cancelAtPeriodEnd || conta.status === 'canceled') &&
    conta.currentPeriodEnd !== null &&
    new Date(conta.currentPeriodEnd).getTime() > Date.now();

  const podeCancelar = !conta.free && !conta.cancelAtPeriodEnd && conta.status !== 'canceled';

  return (
    <div className="asn">
      <div className="asn-wrap">
        {Cabecalho}

        {recado && (
          <p className="asn-aviso asn-aviso-neutro" role="status">
            <Info size={16} className="asn-aviso-icone" aria-hidden="true" />
            <span>{recado}</span>
          </p>
        )}

        {explicacao && (
          <p
            className={`asn-aviso ${conta.status === 'past_due' ? 'asn-aviso-atencao' : 'asn-aviso-erro'}`}
            role="alert"
          >
            <AlertTriangle size={16} className="asn-aviso-icone" aria-hidden="true" />
            <span>{explicacao}</span>
          </p>
        )}

        {/* ── Plano atual ─────────────────────────────────────────────────── */}
        <section className="asn-cartao">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 className="asn-cartao-titulo" style={{ margin: 0 }}>
              Plano {conta.planName}
            </h2>
            <span className={`asn-selo asn-selo-${tom}`}>{billingStatusLabel(conta.status)}</span>
            {conta.cancelAtPeriodEnd && (
              <span className="asn-selo asn-selo-atencao">Cancelamento agendado</span>
            )}
          </div>

          {conta.free ? (
            <>
              <p className="asn-vazio" style={{ marginTop: 12 }}>
                Você está no plano de entrada: <strong>1 tela, sem prazo e sem cartão</strong>. Não
                há cobrança nenhuma nesta conta e não existe nada para cancelar.
              </p>
              <div className="asn-acoes">
                <button
                  type="button"
                  className="asn-btn asn-btn-primario"
                  onClick={assinar}
                  disabled={processando}
                >
                  {processando ? (
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  ) : null}
                  Ver planos pagos
                </button>
              </div>
              <p className="asn-nota">
                Ao ligar a segunda tela, a cobrança começa naquele dia e é proporcional aos dias que
                faltam no período. O tempo em que você usou de graça nunca vira fatura.
              </p>
            </>
          ) : (
            <>
              <div className="asn-dados">
                <div>
                  <p className="asn-dado-rotulo">Cobrança</p>
                  <p className="asn-dado-valor">{intervalLabel(conta.billingInterval)}</p>
                </div>
                <div>
                  <p className="asn-dado-rotulo">Telas cobradas</p>
                  <p className="asn-dado-valor">
                    {conta.screensBilled === null ? '-' : conta.screensBilled}
                  </p>
                  {conta.screensBilled !== null && (
                    <p className="asn-dado-apoio">É o que entra na fatura deste ciclo.</p>
                  )}
                </div>
                <div>
                  <p className="asn-dado-rotulo">Valor do ciclo</p>
                  <p className="asn-dado-valor">{formatCentsOrDash(conta.cycleAmountCents)}</p>
                </div>
                <div>
                  <p className="asn-dado-rotulo">
                    {conta.cancelAtPeriodEnd || conta.status === 'canceled'
                      ? 'Acesso até'
                      : proximaCobranca
                        ? 'Próxima cobrança'
                        : 'Fim do período atual'}
                  </p>
                  <p className="asn-dado-valor">
                    {conta.cancelAtPeriodEnd || conta.status === 'canceled'
                      ? (fimPeriodo ?? '-')
                      : (proximaCobranca ?? fimPeriodo ?? '-')}
                  </p>
                  {!proximaCobranca && !conta.cancelAtPeriodEnd && conta.status !== 'canceled' && (
                    // Sem `nextChargeAt` na resposta, mostramos o fim do período
                    // com o rótulo certo em vez de apresentá-lo como se fosse a
                    // data de cobrança — que pode ser outra.
                    <p className="asn-dado-apoio">A data exata da cobrança ainda não foi informada.</p>
                  )}
                </div>
              </div>

              {conta.cancelAtPeriodEnd && fimPeriodoLongo && (
                <p className="asn-aviso asn-aviso-atencao" style={{ marginTop: 16 }}>
                  <Info size={16} className="asn-aviso-icone" aria-hidden="true" />
                  <span>
                    Sua assinatura foi cancelada
                    {conta.canceledAt ? ` em ${formatDateBR(conta.canceledAt)}` : ''} e{' '}
                    <strong>não haverá nova cobrança</strong>. O acesso continua normalmente até{' '}
                    <strong>{fimPeriodoLongo}</strong>.
                  </span>
                </p>
              )}

              {erroAcao && (
                <p className="asn-aviso asn-aviso-erro" role="alert" style={{ marginTop: 16 }}>
                  <AlertTriangle size={16} className="asn-aviso-icone" aria-hidden="true" />
                  <span>{erroAcao}</span>
                </p>
              )}

              {!confirmandoCancelamento && (
                <div className="asn-acoes">
                  {podeReativar && (
                    <button
                      type="button"
                      className="asn-btn asn-btn-primario"
                      onClick={reativar}
                      disabled={processando}
                    >
                      {processando ? (
                        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <RotateCcw size={16} aria-hidden="true" />
                      )}
                      Reativar assinatura
                    </button>
                  )}
                  {podeCancelar && (
                    <button
                      type="button"
                      className="asn-btn asn-btn-cancelar"
                      onClick={() => {
                        setConfirmandoCancelamento(true);
                        setErroAcao(null);
                      }}
                      disabled={processando}
                    >
                      Cancelar assinatura
                    </button>
                  )}
                </div>
              )}

              {/* ── Confirmação: diz o que acontece ANTES de acontecer ────── */}
              {confirmandoCancelamento && (
                <div className="asn-confirma">
                  <h3 className="asn-confirma-titulo">Confirmar o cancelamento</h3>
                  <ul className="asn-lista">
                    <li>
                      {fimPeriodoLongo ? (
                        <>
                          Seu acesso continua até <strong>{fimPeriodoLongo}</strong>, fim do
                          período que você já pagou.
                        </>
                      ) : (
                        <>
                          Seu acesso continua até o fim do período que você já pagou.
                        </>
                      )}
                    </li>
                    <li>Não haverá nova cobrança depois disso.</li>
                    <li>
                      Suas telas param de exibir conteúdo quando o período terminar. Os conteúdos
                      que você montou continuam salvos.
                    </li>
                    <li>Enquanto o período não acabar, dá para reativar por esta mesma página.</li>
                  </ul>

                  <label className="asn-rotulo" htmlFor="asn-motivo">
                    Por que está cancelando? (opcional)
                  </label>
                  <textarea
                    id="asn-motivo"
                    className="asn-textarea"
                    value={motivoCancelamento}
                    onChange={(e) => setMotivoCancelamento(e.target.value)}
                    placeholder="Ajuda a gente a melhorar. Não é obrigatório e não muda o cancelamento."
                    maxLength={500}
                  />

                  <div className="asn-acoes">
                    <button
                      type="button"
                      className="asn-btn asn-btn-cancelar"
                      onClick={cancelar}
                      disabled={processando}
                    >
                      {processando ? (
                        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                      ) : null}
                      Confirmar cancelamento
                    </button>
                    <button
                      type="button"
                      className="asn-btn asn-btn-secundario"
                      onClick={() => setConfirmandoCancelamento(false)}
                      disabled={processando}
                    >
                      Manter assinatura
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Histórico de pagamentos ─────────────────────────────────────── */}
        <section className="asn-cartao">
          <h2 className="asn-cartao-titulo">Pagamentos</h2>
          {conta.payments.length === 0 ? (
            <p className="asn-vazio">
              Nenhuma cobrança ainda. Quando houver, cada pagamento aparece aqui com data, valor e
              o link da fatura.
            </p>
          ) : (
            <div className="asn-tabela-rolagem">
              <table className="asn-tabela">
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Situação</th>
                    <th scope="col">Valor</th>
                    <th scope="col">Forma</th>
                    <th scope="col">Documentos</th>
                  </tr>
                </thead>
                <tbody>
                  {conta.payments.map((pagamento) => (
                    <LinhaPagamento key={pagamento.id} pagamento={pagamento} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Assinatura;
