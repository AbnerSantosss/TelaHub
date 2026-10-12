/**
 * UM modal para todas as ações administrativas sobre a assinatura.
 *
 * É um modal só, e não seis, porque a parte que NÃO pode variar é justamente a
 * que se perde na cópia: o motivo obrigatório. Seis diálogos parecidos viram,
 * em três meses, cinco com motivo e um sem — e o "sem" é sempre o mais grave.
 * Aqui o campo de motivo é do invólucro; cada ação só contribui com os campos
 * próprios.
 *
 * ⚠️ A ordem visual não é estética: "agendar" é a ação primária e "cancelar
 * agora" é destrutiva secundária. Cortar acesso já pago é cláusula abusiva
 * (CDC art. 51, IV) — e um botão vermelho bonito ao lado do outro é como o
 * caminho errado vira o caminho de um clique.
 *
 * ⚠️ O QUE O SERVIDOR ACEITA, e o contrato provisório errava:
 *   • pagamento manual manda `interval`, NÃO `billingInterval` — com o nome
 *     errado o Zod recusa o corpo inteiro e nenhum Pix é registrado (400);
 *   • não existe `method` no pagamento manual: o servidor grava `provider:
 *     'manual'`, `method: 'pix'`. O seletor "Forma" era um controle que não
 *     mudava nada. No lugar dele entrou `reference`, que EXISTE e resolve algo
 *     real — vira `providerPaymentId` e faz o mesmo comprovante lançado duas
 *     vezes voltar 409 em vez de dobrar o caixa do mês;
 *   • trocar plano aceita só `planCode` e `reason`: a periodicidade que a tela
 *     mandava era descartada em silêncio pelo Zod, e o operador escolhia
 *     "anual" achando que tinha mudado o contrato;
 *   • nenhuma ação devolve o cliente inteiro — a tela recarrega depois.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CalendarClock, Info } from 'lucide-react';

import { isApiError } from '../../lib/api';
import { MONTHS_PER_YEAR, fetchPlanCatalog, type Plan } from '../../lib/plans';
import {
  cancelSubscription,
  changePlan,
  extendPeriod,
  reactivateSubscription,
  registerManualPayment,
  scheduleCancelSubscription,
} from '../backoffice-api';
import type { BillingInterval, ClienteDetail } from '../backoffice-types';
import { billingIntervalLabel, formatDate, formatMoney } from '../format';
import { Button, Field, Modal, cx, inputClass } from '../ui';

export type AcaoTipo =
  | 'cancel_now'
  | 'schedule_cancel'
  | 'reactivate'
  | 'change_plan'
  | 'extend'
  | 'manual_payment';

interface AcaoMeta {
  title: string;
  description: string;
  submit: string;
  /** `danger` só onde a ação realmente destrói acesso pago. */
  variant: 'primary' | 'danger';
}

const META: Record<AcaoTipo, AcaoMeta> = {
  cancel_now: {
    title: 'Cancelar agora',
    description: 'Corta o acesso imediatamente, inclusive o período já pago.',
    submit: 'Cancelar agora, mesmo assim',
    variant: 'danger',
  },
  schedule_cancel: {
    title: 'Agendar cancelamento',
    description: 'O cliente usa até o fim do ciclo que já pagou e não renova.',
    submit: 'Agendar para o fim do ciclo',
    variant: 'primary',
  },
  reactivate: {
    title: 'Desfazer o cancelamento agendado',
    // Descrição estreitada até o que a rota REALMENTE faz: `reactivate` só
    // limpa `cancelAtPeriodEnd`. Prometer "volta a assinatura para ativa" fazia
    // o operador clicar num inadimplente e sair achando que recuperou a conta.
    description: 'A assinatura deixa de sair no fim do ciclo e volta a renovar.',
    submit: 'Desfazer o cancelamento',
    variant: 'primary',
  },
  change_plan: {
    title: 'Trocar plano',
    description: 'Ativa o plano escolhido sem passar pelo gateway de pagamento.',
    submit: 'Trocar plano',
    variant: 'primary',
  },
  extend: {
    title: 'Estender período',
    description: 'Empurra o vencimento para frente (cortesia, incidente ou negociação).',
    submit: 'Estender',
    variant: 'primary',
  },
  manual_payment: {
    title: 'Registrar pagamento manual',
    description: 'Pix ou transferência recebida por fora do gateway.',
    submit: 'Registrar pagamento',
    variant: 'primary',
  },
};

/**
 * "1.404,00", "1404.00" e "R$ 1.404" viram todos 140400 centavos.
 *
 * Ler `Number(input)` direto transformaria "1.404,00" em `1.404` — R$ 1,40 no
 * lugar de R$ 1.404,00. O erro passa despercebido porque o campo continua com
 * cara de preenchido; só a conciliação do mês seguinte denuncia.
 */
export function parseMoneyToCents(input: string): number | null {
  const clean = input.replace(/[^\d,.]/g, '').trim();
  if (!clean) return null;
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

const REASON_MIN = 3;

const AcaoModal = ({
  acao,
  detail,
  onClose,
  onApplied,
}: {
  acao: AcaoTipo;
  /** O detalhe inteiro: é dele que saem organização, plano e telas faturadas. */
  detail: ClienteDetail;
  onClose: () => void;
  /** Avisa que a conta mudou. Quem recarrega é a tela — ver o cabeçalho. */
  onApplied: () => void;
}) => {
  const meta = META[acao];
  const organizationId = detail.organization.id;
  const subscription = detail.subscription;

  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  // Campos por ação
  const [planCode, setPlanCode] = useState(subscription?.plan.code ?? '');
  const [interval, setInterval] = useState<BillingInterval>(detail.billing.interval);
  const [days, setDays] = useState('30');
  const [amount, setAmount] = useState('');
  const [screens, setScreens] = useState(String(detail.billing.billedScreens || 1));
  const [reference, setReference] = useState('');

  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [catalogFailed, setCatalogFailed] = useState(false);

  // O catálogo só é buscado onde muda alguma coisa. Carregá-lo em toda ação
  // seria uma chamada de rede para desenhar um diálogo de "reativar".
  useEffect(() => {
    if (acao !== 'change_plan') return;
    let alive = true;
    fetchPlanCatalog()
      .then((catalog) => {
        if (alive) setPlans(catalog.plans);
      })
      .catch(() => {
        // Sem catálogo o operador ainda precisa conseguir agir: o campo vira
        // texto livre em vez de o diálogo travar.
        if (alive) setCatalogFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [acao]);

  const reasonOk = reason.trim().length >= REASON_MIN;
  const cents = useMemo(() => parseMoneyToCents(amount), [amount]);
  const daysNumber = Number(days);
  const screensNumber = Number(screens);

  const invalid = (): string | null => {
    if (!reasonOk) return `Escreva o motivo (pelo menos ${REASON_MIN} caracteres).`;
    if (acao === 'cancel_now' && !confirmed) return 'Confirme que entendeu o corte imediato de acesso.';
    if (acao === 'change_plan' && !planCode.trim()) return 'Escolha o plano de destino.';
    if (acao === 'extend' && (!Number.isFinite(daysNumber) || daysNumber < 1 || daysNumber > 365)) {
      return 'Informe de 1 a 365 dias.';
    }
    if (acao === 'manual_payment') {
      if (cents === null) return 'Informe o valor recebido do ciclo inteiro.';
      if (!Number.isFinite(screensNumber) || screensNumber < 1) return 'Informe quantas telas o pagamento cobre.';
    }
    return null;
  };

  const problem = invalid();

  /**
   * Executa a ação e devolve o AVISO extra que a resposta trouxe, quando há um.
   *
   * Só duas rotas dizem algo que o operador precisa ver e que a tela recarregada
   * não mostraria: o cancelamento agendado (a recorrência do gateway pode ter
   * continuado viva) e o pagamento manual (o valor lançado bateu com o catálogo
   * ou não). Descartar essas respostas era jogar fora justamente a informação
   * que o servidor calculou para o operador conferir.
   */
  const run = async (): Promise<{ warning?: string } | void> => {
    const body = { reason: reason.trim() };
    switch (acao) {
      case 'cancel_now':
        await cancelSubscription(organizationId, body);
        return;
      case 'schedule_cancel': {
        const { gatewayCanceled } = await scheduleCancelSubscription(organizationId, body);
        return gatewayCanceled === false
          ? {
              warning:
                'A assinatura foi encerrada aqui, mas a recorrência NÃO foi cancelada no gateway, então ela continua cobrando. ' +
                'Entre no painel do provedor e cancele por lá.',
            }
          : undefined;
      }
      case 'reactivate':
        await reactivateSubscription(organizationId, body);
        return;
      case 'change_plan':
        await changePlan(organizationId, { ...body, planCode: planCode.trim() });
        return;
      case 'extend':
        await extendPeriod(organizationId, { ...body, days: daysNumber });
        return;
      case 'manual_payment': {
        const result = await registerManualPayment(organizationId, {
          ...body,
          amountCents: cents ?? 0,
          screens: screensNumber,
          interval,
          reference: reference.trim() || undefined,
        });
        return result.divergesFromCatalog
          ? {
              warning:
                `Lançado ${formatMoney(result.payment.amountCents)}, e o catálogo cobraria ` +
                `${formatMoney(result.expectedCycleCents)} por ${screensNumber} tela(s) no ${billingIntervalLabel(interval).toLowerCase()}. ` +
                'Se foi desconto negociado, está certo. Se não, confira se o valor não é o MENSAL de um contrato anual.',
            }
          : undefined;
      }
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (submitting || problem) return;

    setSubmitting(true);
    setError(null);
    try {
      const result = await run();
      onApplied();
      if (result?.warning) {
        // `duration: Infinity`: é conferência de dinheiro e de cobrança que
        // continua rodando no gateway. Um aviso que some em 4 segundos é um
        // aviso que ninguém leu.
        toast.warning(SUCCESS[acao].title, { description: result.warning, duration: Infinity });
      } else {
        toast.success(SUCCESS[acao].title, { description: SUCCESS[acao].description });
      }
      onClose();
    } catch (actionError) {
      setError(
        isApiError(actionError)
          ? actionError.message
          : 'Não foi possível concluir a ação. Nada foi alterado, tente de novo.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={meta.title}
      description={`${detail.organization.name} · ${meta.description}`}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Voltar
          </Button>
          <Button type="submit" form="acao-form" variant={meta.variant} loading={submitting}>
            {meta.submit}
          </Button>
        </>
      }
    >
      <form id="acao-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* ── Avisos específicos ─────────────────────────────────────────── */}

        {acao === 'cancel_now' && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
            <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <span>
                Isto <strong>corta agora</strong> o acesso de um período que o cliente já pagou
                {subscription?.currentPeriodEnd ? ` (vai até ${formatDate(subscription.currentPeriodEnd)})` : ''}.
                Cobrar por um período e não entregá-lo é cláusula abusiva pelo art. 51, IV do CDC. O caminho normal é{' '}
                <strong>agendar o cancelamento</strong> para o fim do ciclo. Feche este diálogo e use aquele botão.
              </span>
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-[13px] font-medium text-ink">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-danger-ink"
              />
              Entendi: o acesso é cortado imediatamente, sem devolver o período pago.
            </label>
          </div>
        )}

        {acao === 'schedule_cancel' && (
          <p className="flex items-start gap-2 rounded-lg border border-line bg-app px-3 py-2.5 text-[13px] leading-relaxed text-ink-muted">
            <CalendarClock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" />
            <span>
              O cliente continua com tudo funcionando até{' '}
              <strong>{formatDate(subscription?.currentPeriodEnd ?? null)}</strong> e não é cobrado de novo. Enquanto isso ele
              aparece na visão <strong>Cancelamento agendado</strong>, e dá para desfazer a qualquer momento.
            </span>
          </p>
        )}

        {acao === 'change_plan' && (
          <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-[13px] leading-relaxed text-warning-ink">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Isto ativa um plano pago <strong>sem gerar cobrança</strong>. É o caminho do Pix recebido por fora do
              gateway. Se o dinheiro já entrou, registre o <strong>pagamento manual</strong> logo em seguida; sem isso a
              conta fica ativa sem nenhum caixa correspondente, e o relatório de receita fica errado.
            </span>
          </p>
        )}

        {acao === 'reactivate' && (
          <p className="flex items-start gap-2 rounded-lg border border-line bg-app px-3 py-2.5 text-[13px] leading-relaxed text-ink-muted">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" />
            <span>
              Serve <strong>só</strong> para desfazer um cancelamento agendado. Não tira ninguém da inadimplência (quem
              faz isso é o pagamento confirmado) e não ressuscita assinatura já encerrada. Nesse caso o servidor
              recusa, porque seria dar plano pago sem cobrança nenhuma.
            </span>
          </p>
        )}

        {/* ── Campos por ação ────────────────────────────────────────────── */}

        {acao === 'change_plan' && (
          <>
            <Field
              label="Plano de destino"
              htmlFor="acao-plano"
              hint={
                catalogFailed
                  ? 'O catálogo de planos não carregou. Digite o código exato do plano (ex.: loja, pro).'
                  : `Plano atual: ${subscription ? subscription.plan.name || subscription.plan.code : 'nenhum'}.`
              }
            >
              {plans && !catalogFailed ? (
                <select
                  id="acao-plano"
                  value={planCode}
                  onChange={(event) => setPlanCode(event.target.value)}
                  className={inputClass}
                >
                  {plans.map((plan) => (
                    <option key={plan.code} value={plan.code}>
                      {plan.name} ({plan.code})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="acao-plano"
                  type="text"
                  value={planCode}
                  onChange={(event) => setPlanCode(event.target.value)}
                  placeholder={catalogFailed ? 'código do plano' : 'carregando catálogo…'}
                  className={inputClass}
                />
              )}
            </Field>

            {/*
              O seletor de periodicidade SAIU daqui: `changePlanSchema` aceita
              só `planCode` e `reason`, e o Zod descartava o campo em silêncio.
              O operador escolhia "Anual", o servidor mantinha o intervalo atual,
              e a tela seguinte mostrava mensal — sem nenhum erro, sem nenhuma
              pista. Quem muda o intervalo é o pagamento registrado.
            */}
            <p className="flex items-start gap-2 rounded-lg border border-line bg-app px-3 py-2.5 text-[13px] leading-relaxed text-ink-muted">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" />
              <span>
                A periodicidade não muda aqui: continua{' '}
                <strong>{billingIntervalLabel(detail.billing.interval).toLowerCase()}</strong>. Para trocar mensal por
                anual, registre o pagamento com a periodicidade nova.
              </span>
            </p>
          </>
        )}

        {acao === 'extend' && (
          <Field
            label="Dias a acrescentar"
            htmlFor="acao-dias"
            hint={`O vencimento sai de ${formatDate(subscription?.currentPeriodEnd ?? null)} e vai para frente. De 1 a 365 dias.`}
            error={touched && (!Number.isFinite(daysNumber) || daysNumber < 1 || daysNumber > 365) ? 'Informe de 1 a 365 dias.' : null}
          >
            <input
              id="acao-dias"
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(event) => setDays(event.target.value)}
              className={inputClass}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {['7', '15', '30'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDays(option)}
                  className={cx(
                    'rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors',
                    days === option ? 'border-nav bg-nav text-white' : 'border-line bg-surface text-ink-muted hover:bg-app'
                  )}
                >
                  +{option} dias
                </button>
              ))}
            </div>
          </Field>
        )}

        {acao === 'manual_payment' && (
          <>
            {/*
              O rótulo diz CICLO INTEIRO de propósito. "Valor" sozinho num
              contrato anual é lido como mensalidade, e alguém digita 117 onde
              entraram 1.404 — a US-A-05 pelo lado do lançamento, que é pior,
              porque aí o número errado passa a ser o dado gravado.
            */}
            <Field
              label="Valor recebido do ciclo inteiro (R$)"
              htmlFor="acao-valor"
              hint={
                interval === 'yearly'
                  ? 'Os 12 meses de uma vez, não a mensalidade. Se o Pix foi de R$ 1.404,00, digite 1.404,00.'
                  : 'O valor cobrado neste mês.'
              }
              error={touched && cents === null ? 'Informe um valor maior que zero.' : null}
            >
              <input
                id="acao-valor"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0,00"
                className={`${inputClass} money`}
              />
              {cents !== null && (
                <p className="mt-1.5 text-xs text-ink-muted">
                  Vai ser lançado como <strong className="money">{formatMoney(cents)}</strong> de caixa
                  {interval === 'yearly' && (
                    <>
                      {' '}
                      (equivale a{' '}
                      <span className="money">{formatMoney(Math.round(cents / MONTHS_PER_YEAR))}</span>/mês, número que
                      serve só para o MRR e nunca para conciliar o extrato)
                    </>
                  )}
                </p>
              )}
            </Field>

            <Field
              label="Telas cobertas"
              htmlFor="acao-telas"
              hint={`Quantas telas este pagamento cobre. Hoje a assinatura fatura ${detail.billing.billedScreens}.`}
              error={touched && (!Number.isFinite(screensNumber) || screensNumber < 1) ? 'Informe pelo menos 1 tela.' : null}
            >
              <input
                id="acao-telas"
                type="number"
                min={1}
                value={screens}
                onChange={(event) => setScreens(event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Periodicidade paga" htmlFor="acao-intervalo-pag">
              <select
                id="acao-intervalo-pag"
                value={interval}
                onChange={(event) => setInterval(event.target.value as BillingInterval)}
                className={inputClass}
              >
                <option value="monthly">{billingIntervalLabel('monthly')}</option>
                <option value="yearly">{billingIntervalLabel('yearly')}</option>
              </select>
            </Field>

            {/*
              Onde havia um seletor de "Forma" que o servidor ignorava (ele grava
              sempre `provider: manual`, `method: pix`), agora há o comprovante —
              que o servidor USA: vira `providerPaymentId`, único na tabela
              inteira. É o que faz o mesmo Pix lançado duas vezes voltar 409 em
              vez de dobrar o caixa do mês, e é o que a conciliação procura para
              achar a linha depois.
            */}
            <Field
              label="Comprovante / id do Pix"
              htmlFor="acao-referencia"
              optional
              hint="Sem ele, dois lançamentos do mesmo Pix viram dois pagamentos e o caixa do mês dobra. Com ele, o segundo é recusado."
            >
              <input
                id="acao-referencia"
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Ex.: E1234567820260908..."
                className={`${inputClass} money`}
              />
            </Field>
          </>
        )}

        {/* ── Motivo: comum a TODAS as ações ─────────────────────────────── */}

        <Field
          label="Motivo"
          htmlFor="acao-motivo"
          hint="Fica gravado na trilha de auditoria do cliente, com seu usuário e a data. É o que explica, daqui a seis meses, por que esta conta está assim."
          error={touched && !reasonOk ? `Escreva pelo menos ${REASON_MIN} caracteres.` : null}
        >
          <textarea
            id="acao-motivo"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: Pix de R$ 1.404,00 recebido em 08/09, comprovante no e-mail do financeiro."
            className={inputClass}
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-[13px] text-danger-ink">
            {error}
          </p>
        )}

        <p aria-live="polite" className="sr-only">
          {submitting ? 'Enviando a ação…' : problem && touched ? problem : ''}
        </p>
      </form>
    </Modal>
  );
};

const SUCCESS: Record<AcaoTipo, { title: string; description: string }> = {
  cancel_now: {
    title: 'Assinatura cancelada agora.',
    description: 'O acesso foi cortado e o motivo ficou registrado na trilha do cliente.',
  },
  schedule_cancel: {
    title: 'Cancelamento agendado.',
    description: 'O cliente usa até o fim do ciclo pago e não renova. Dá para desfazer reativando.',
  },
  reactivate: {
    title: 'Cancelamento desfeito.',
    description: 'A assinatura volta a renovar no fim do ciclo.',
  },
  change_plan: {
    title: 'Plano trocado.',
    description: 'Nenhuma cobrança foi gerada. Registre o pagamento manual se o dinheiro já entrou.',
  },
  extend: { title: 'Período estendido.', description: 'O novo vencimento já aparece na assinatura.' },
  manual_payment: {
    title: 'Pagamento registrado.',
    description: 'O caixa entrou pelo valor do ciclo e a assinatura foi reativada.',
  },
};

export default AcaoModal;
