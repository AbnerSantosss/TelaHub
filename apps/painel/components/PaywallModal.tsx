import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2, ShieldCheck, Tv } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import {
  formatBRL,
  getPlansCatalog,
  startCheckout,
  suggestedUpgradeFromCatalog,
  suggestedUpgradeFromError,
  type PlansCatalog,
  type SuggestedUpgrade,
} from '../services/billing';
import { getApiErrorMessage } from '../libs/api';
import { checkoutUrl } from '../libs/external-urls';
import { EVENT, META_EVENT, toReais, track } from '../libs/tracking';
// tokens e efeitos do tema claro, antes do CSS da tela
import './claro.css';
import './PaywallModal.css';

// =============================================================================
// PAYWALL DA 2ª TELA
//
// O QUE ISTO SUBSTITUI: um `toast.error` de 8 segundos com a mensagem crua do
// backend. Quem tentou ligar a segunda TV — ou seja, quem já estava disposto a
// pagar — via um aviso vermelho sumir e ficava sem caminho nenhum. O momento de
// maior intenção de compra do produto inteiro terminava num toast.
//
// TRÊS REGRAS DE CONTEÚDO, todas com motivo:
//
// 1. O VALOR VEM DO SERVIDOR. O 403 do `enforceQuota` já traz
//    `billing.suggestedPlan` com o total JÁ CALCULADO pela mesma função que
//    gera a fatura. Recalcular aqui criaria duas contas para o mesmo número — e
//    a que aparece na tela seria a errada.
//
// 2. A REGRA ANTI-RETROATIVA APARECE POR ESCRITO. É a promessa pública da
//    landing e o argumento contra o concorrente cuja reclamação nº 1 é
//    justamente cobrar retroativo ao ligar a 2ª tela. Se ela não estiver aqui,
//    no exato instante da dúvida, ela não existe.
//
// 3. NADA DE PIX, BOLETO OU NOTA FISCAL. O gateway não está integrado
//    (`POST /api/billing/checkout` responde 501). Prometer meio de pagamento
//    que não existe é propaganda enganosa, não otimismo.
// =============================================================================

export interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  /** Telas ligadas hoje. A conta é feita para `telasAtivas + 1`. */
  telasAtivas: number;
  /** Nome do plano atual, quando o painel já sabe. */
  planoAtual?: string | null;
  /**
   * Mensagem que a API devolveu no 403/402. Tem prioridade sobre qualquer texto
   * nosso: é ela que carrega o limite real da conta.
   */
  mensagemApi?: string | null;
  /** `payload` do `ApiError` — de onde sai o plano sugerido com preço real. */
  payloadApi?: unknown;
  organizationId?: string | null;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  open,
  onClose,
  telasAtivas,
  planoAtual,
  mensagemApi,
  payloadApi,
  organizationId,
}) => {
  const [catalogo, setCatalogo] = useState<PlansCatalog | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /** Quantas telas a conta terá se esta ativação for adiante. */
  const telasDesejadas = Math.max(telasAtivas + 1, 2);

  const sugestaoDoErro = useMemo(() => suggestedUpgradeFromError(payloadApi), [payloadApi]);

  /**
   * O catálogo só é buscado quando o erro NÃO trouxe sugestão. Buscar sempre
   * seria uma requisição a mais no pior momento possível — e com risco de o
   * catálogo e a fatura discordarem.
   */
  useEffect(() => {
    if (!open || sugestaoDoErro || catalogo) return;
    let ativo = true;
    getPlansCatalog().then((resultado) => {
      if (ativo) setCatalogo(resultado);
    });
    return () => {
      ativo = false;
    };
  }, [open, sugestaoDoErro, catalogo]);

  const sugestao: SuggestedUpgrade | null =
    sugestaoDoErro ?? suggestedUpgradeFromCatalog(catalogo, telasDesejadas);

  // Zera o erro a cada abertura: erro velho de uma tentativa anterior confunde.
  useEffect(() => {
    if (open) setErro(null);
  }, [open]);

  /** `paywall_view` mede o funil que começa aqui e termina no pagamento. */
  useEffect(() => {
    if (!open) return;
    track({
      event: EVENT.PAYWALL_VIEW,
      params: {
        org_id: organizationId ?? null,
        screens_active: telasAtivas,
        screens_wanted: telasDesejadas,
        plan_suggested: sugestao?.code ?? null,
        value: sugestao ? toReais(sugestao.totalCents) : 0,
        currency: 'BRL',
      },
    });
    // Só o `open` na lista: o evento é "o paywall apareceu", uma vez por
    // abertura. Incluir a sugestão faria disparar de novo quando o catálogo
    // chegasse, dobrando a contagem do funil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const irParaCheckout = async () => {
    setEnviando(true);
    setErro(null);

    // Dispara ANTES da navegação: `window.location.href` pode descarregar a
    // página antes de o pixel enviar a requisição.
    track({
      event: EVENT.BEGIN_CHECKOUT,
      params: {
        org_id: organizationId ?? null,
        plan_code: sugestao?.code ?? null,
        screens: telasDesejadas,
        value: sugestao ? toReais(sugestao.totalCents) : 0,
        currency: 'BRL',
      },
      metaEvent: META_EVENT.INITIATE_CHECKOUT,
      metaParams: {
        value: sugestao ? toReais(sugestao.totalCents) : 0,
        currency: 'BRL',
        content_type: 'product',
        content_ids: sugestao ? [sugestao.code] : [],
      },
    });

    try {
      const destino = await startCheckout({
        planCode: sugestao?.code,
        screens: telasDesejadas,
      });
      window.location.href = destino;
    } catch (error) {
      // Caminho real de hoje: a rota responde 501 porque o gateway não está
      // integrado. Em vez de encerrar a intenção de compra num erro, mandamos
      // para o app de checkout, que é quem conduz a contratação hoje.
      console.error('Checkout indisponível pela API, usando o app de checkout:', error);
      setErro(
        getApiErrorMessage(error, 'Não foi possível abrir o pagamento agora.') +
          ' Vamos te levar para a contratação.'
      );
      window.location.href = checkoutUrl(sugestao?.code, telasDesejadas);
    } finally {
      setEnviando(false);
    }
  };

  const nomePlanoAtual = planoAtual?.trim() || 'Grátis';

  return (
    <Dialog open={open} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="pwl border-0 bg-white p-0 sm:max-w-[520px]"
      >
        <div className="pwl-topo">
          <span className="pwl-selo">
            <Tv size={14} aria-hidden="true" />
            {telasDesejadas}ª tela
          </span>
          {/* `DialogTitle`/`DialogDescription` do Radix são obrigatórios para o
              leitor de tela anunciar o diálogo. As classes locais vencem as do
              Tailwind porque este CSS não está em `@layer` nenhuma — estilo sem
              camada tem precedência sobre estilo em camada. */}
          <DialogTitle className="pwl-titulo">
            Para ligar mais uma tela, escolha um plano
          </DialogTitle>
          <DialogDescription className="pwl-texto">
            {mensagemApi ||
              `O plano ${nomePlanoAtual} inclui 1 tela, sem prazo e sem cartão. A partir da segunda, o TelaHub passa a ser pago.`}
          </DialogDescription>
        </div>

        <div className="pwl-corpo">
          <div className="pwl-plano">
            {sugestao ? (
              <>
                <p className="pwl-plano-nome">Plano {sugestao.name}</p>
                <div className="pwl-plano-total">
                  <span className="pwl-valor">{formatBRL(sugestao.totalCents)}</span>
                  <span className="pwl-valor-apoio">
                    por mês, com {sugestao.billedScreens || telasDesejadas}{' '}
                    {(sugestao.billedScreens || telasDesejadas) === 1 ? 'tela' : 'telas'}
                  </span>
                </div>
                <p className="pwl-plano-detalhe">
                  {formatBRL(sugestao.pricePerScreenCents)} por tela por mês
                  {sugestao.minScreens > 1 ? ` · mínimo de ${sugestao.minScreens} telas` : ''}.
                  Ligou mais uma tela, entra mais uma na conta; desligou, sai.
                </p>
              </>
            ) : (
              <p className="pwl-sem-preco">
                Não conseguimos carregar os planos agora. Pode continuar: o valor exato
                aparece antes de você confirmar qualquer pagamento.
              </p>
            )}
          </div>

          <div className="pwl-regra">
            <ShieldCheck size={18} className="pwl-regra-icone" aria-hidden="true" />
            <p className="pwl-regra-texto">
              <strong>O tempo no Grátis não é cobrado.</strong> Você começa a pagar no dia
              em que liga a segunda tela, e o primeiro valor é proporcional aos dias que faltam no
              período.
            </p>
          </div>

          {erro && (
            <p className="pwl-erro" role="alert">
              {erro}
            </p>
          )}
        </div>

        <div className="pwl-rodape">
          <button
            type="button"
            className="pwl-btn pwl-btn-primario"
            onClick={irParaCheckout}
            disabled={enviando}
          >
            {enviando ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <ArrowRight size={16} aria-hidden="true" />
            )}
            {enviando ? 'Abrindo…' : 'Continuar para o pagamento'}
          </button>
          <button type="button" className="pwl-btn pwl-btn-secundario" onClick={onClose}>
            Agora não
          </button>
        </div>

        <p className="pwl-nota">
          Sua primeira tela continua no ar do mesmo jeito, com ou sem plano pago.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;
