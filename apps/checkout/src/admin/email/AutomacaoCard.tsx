/**
 * Um gatilho de e-mail automático, editável na própria lista.
 *
 * O agrupamento dos gatilhos NÃO é organização visual: é a base legal. Aviso de
 * vencimento, cobrança de inadimplência e encerramento são execução do contrato
 * — vão para todo cliente, com ou sem opt-in de marketing. Campanha de novidade
 * é outra coisa e mora na outra aba, atrás do filtro de consentimento. Misturar
 * os dois numa tela só é exatamente como uma base de marketing é construída por
 * acidente (ver §2.6 do plano do backoffice).
 *
 * ── O que mudou na reconciliação com o servidor ──────────────────────────────
 *   • O grupo de cada gatilho é derivado do `trigger` que o servidor manda, e
 *     não de uma tabela local por chave. Um gatilho novo no catálogo cai no
 *     grupo certo sozinho; com a tabela local ele apareceria sem grupo — ou
 *     seja, sumiria da tela sem nenhum erro.
 *   • O título é o `label` do catálogo do servidor. O texto local dizia
 *     "Pagamento falhou — 9º dia", enquanto o servidor DERIVA esse número de
 *     `PAST_DUE_GRACE_DAYS`: mudar a carência para 15 dias faria a tela mentir
 *     sobre o dia do corte, e é o aviso em que mentir custa o acesso do cliente.
 *   • A lista de variáveis vem de `GET /automations` (`variables`). A lista
 *     fixa que existia aqui tinha quatro dos seis tokens — faltavam
 *     `{{empresa}}` e `{{link}}`, e `{{link}}` é o botão de pagar.
 *   • A prévia é a do servidor (`POST /automations/:key/preview`), com dados
 *     reais. A prévia de exemplo daqui inventava "R$ 1.404,00" num campo em que
 *     o valor certo é o do CICLO calculado pelo servidor — inventar dinheiro
 *     dentro do editor é a US-A-05 acontecendo de novo, num lugar novo.
 *
 * A prévia roda dentro de um `iframe` com `sandbox=""`: o corpo é HTML escrito
 * à mão por um operador (e agora vem embrulhado no layout do sistema), e
 * injetá-lo na árvore do painel faria um `<style>` distraído vazar para a
 * interface inteira — sem contar script colado de um modelo qualquer.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Eye, EyeOff, Save } from 'lucide-react';

import { isApiError } from '../../lib/api';
import { previewAutomation, saveAutomation } from '../backoffice-api';
import type {
  Automation,
  AutomationKey,
  AutomationPreview,
  AutomationState,
  AutomationTrigger,
} from '../backoffice-types';
import { formatDateTime } from '../format';
import { Button, Field, cx, inputClass } from '../ui';

// ─── Agrupamento por natureza ────────────────────────────────────────────────

export type AutomationGroupKey = 'vencimento' | 'inadimplencia' | 'encerramento' | 'relacionamento';

export interface AutomationGroup {
  key: AutomationGroupKey;
  title: string;
  description: string;
  /**
   * A frase que aparece no topo do grupo dizendo se aquele e-mail depende de
   * consentimento. Está no dado, e não solta no JSX, para nunca existir um
   * grupo novo sem essa resposta.
   */
  basis: string;
  /** `true` quando o grupo dispensa opt-in por ser execução de contrato. */
  contractual: boolean;
}

export const AUTOMATION_GROUPS: AutomationGroup[] = [
  {
    key: 'vencimento',
    title: 'Vencimento',
    description: 'Avisos antes de a assinatura renovar ou vencer.',
    basis:
      'Execução de contrato: vai para todos os clientes, inclusive quem não aceitou receber novidades. Não passa pelo filtro de opt-in.',
    contractual: true,
  },
  {
    key: 'inadimplencia',
    title: 'Inadimplência',
    description: 'Cobrança depois de o pagamento falhar, dentro da carência.',
    basis:
      'Execução de contrato: vai para todos os clientes, inclusive quem não aceitou receber novidades. Não passa pelo filtro de opt-in.',
    contractual: true,
  },
  {
    key: 'encerramento',
    title: 'Encerramento',
    description: 'Quem passou da carência e teve a assinatura encerrada.',
    basis:
      'Execução de contrato: vai para todos os clientes, inclusive quem não aceitou receber novidades. Não passa pelo filtro de opt-in.',
    contractual: true,
  },
  {
    key: 'relacionamento',
    title: 'Relacionamento',
    description: 'Onboarding e retenção de quem já contratou.',
    basis:
      'Acompanha o uso do serviço que a pessoa contratou. Não é divulgação de novidade. Novidade é campanha, fica na aba ao lado e só vai para quem consentiu.',
    contractual: false,
  },
];

/**
 * Grupo de cada gatilho, a partir do `trigger` do SERVIDOR.
 *
 * `Record` sobre a união fechada `AutomationTrigger`: o compilador exige uma
 * entrada para cada gatilho que o servidor conhece. Antes o grupo vinha de uma
 * tabela por CHAVE mantida aqui, e uma chave nova (ou renomeada) devolvia
 * `undefined` — o cartão sumia da tela em silêncio, que num painel de e-mail
 * significa "esse aviso não existe mais" para quem está olhando.
 */
export const GROUP_BY_TRIGGER: Record<AutomationTrigger, AutomationGroupKey> = {
  renewal: 'vencimento',
  past_due: 'inadimplencia',
  not_renewed: 'encerramento',
  welcome: 'relacionamento',
  inactive: 'relacionamento',
};

export interface AutomationMeta {
  /** O que faz o e-mail sair, em uma frase. */
  trigger: string;
  /** Como ler o campo de dias neste gatilho. */
  offsetHint: string;
  /** Observação de operação (não é alerta). */
  note?: string;
  /** Alerta que muda o significado jurídico do número — só onde existe de fato. */
  warning?: string;
}

/**
 * Explicação operacional de cada gatilho.
 *
 * O que sobrou aqui é só o que o servidor NÃO diz: como ler o campo de dias e
 * onde mexer nele tem consequência jurídica. Título e dias padrão saem do
 * catálogo (`label`, `defaultOffsetDays`), para a tela não ter uma segunda
 * versão da verdade.
 */
export const AUTOMATION_META: Record<AutomationKey, AutomationMeta> = {
  renewal_d7: {
    trigger: 'Sai alguns dias ANTES da data de renovação da assinatura.',
    offsetHint: 'Negativo = dias de antecedência. −7 é uma semana antes do vencimento.',
    note: 'Padrão apenas para assinatura anual. No mensal este aviso cai em cima do anterior e vira ruído.',
  },
  renewal_d3: {
    trigger: 'Sai alguns dias ANTES da data de renovação da assinatura.',
    offsetHint: 'Negativo = dias de antecedência. −3 é três dias antes do vencimento.',
  },
  renewal_d0: {
    trigger: 'Sai no próprio dia da renovação.',
    offsetHint: 'Zero é o dia do vencimento. Negativo antecipa, positivo atrasa.',
  },
  past_due_d1: {
    trigger: 'Sai logo depois de a cobrança falhar.',
    offsetHint: 'Positivo = dias DEPOIS de a assinatura entrar em inadimplência.',
  },
  past_due_d5: {
    trigger: 'Sai no meio da carência, com a fatura ainda em aberto.',
    offsetHint: 'Positivo = dias DEPOIS de a assinatura entrar em inadimplência.',
  },
  past_due_d9: {
    trigger: 'Último aviso: sai na véspera do fim da carência.',
    offsetHint: 'Positivo = dias DEPOIS de a assinatura entrar em inadimplência.',
    warning:
      'Este é o último aviso antes do corte: a carência contratada é de 10 dias (item 9 dos Termos), e o padrão do servidor é a véspera dela. Aumentar o número deixa o cliente sem aviso nenhum antes de perder o acesso; diminuir faz o aviso final chegar cedo demais. E mexer no prazo aqui sem alterar os Termos publicados é suspender o serviço antes do que foi contratado.',
  },
  not_renewed_d3: {
    trigger: 'Sai alguns dias depois de a assinatura ser encerrada por falta de pagamento.',
    offsetHint: 'Positivo = dias depois do encerramento.',
    note: 'As telas continuam cadastradas: este e-mail é o convite para reativar sem refazer nada.',
  },
  welcome_d1: {
    trigger: 'Sai pouco depois da contratação.',
    offsetHint: 'Positivo = dias depois da contratação.',
  },
  inactive_d14: {
    trigger: 'Sai quando a conta passa dias sem nenhuma tela pareada.',
    offsetHint: 'Positivo = dias desde a criação da conta, ainda sem tela no ar.',
  },
};

// ─── Limites do servidor (`updateAutomationSchema`) ──────────────────────────
//
// Repetidos aqui para o formulário barrar antes de bater na rota — nunca para
// inventar regra. A faixa de dias é −60 a +60, e o NEGATIVO é o que o contrato
// antigo não sabia: a tela validava 0 a 365 e marcava como inválidos justamente
// os gatilhos de renovação (−7, −3), que chegam assim do servidor. Não havia
// como salvá-los, e o campo abria já em erro.

const OFFSET_MIN = -60;
const OFFSET_MAX = 60;
const SUBJECT_MIN = 3;
const BODY_MIN = 10;

/** Mínimo do `reasonSchema` é 3; a tela pede 5 — motivo de uma letra não explica nada. */
const MIN_REASON = 5;

const AutomacaoCard = ({
  automation,
  variables,
  previewOrganizationId,
  previewOrganizationName,
  onSaved,
}: {
  automation: Automation;
  /** Tokens aceitos, como o servidor os lista. Ver `AutomationsResponse.variables`. */
  variables: string[];
  /** Organização escolhida no topo da aba para a prévia. `null` = ninguém escolheu. */
  previewOrganizationId: string | null;
  previewOrganizationName: string | null;
  onSaved: (updated: AutomationState) => void;
}) => {
  const meta = AUTOMATION_META[automation.key];

  const [enabled, setEnabled] = useState(automation.enabled);
  const [subject, setSubject] = useState(automation.subject);
  const [htmlBody, setHtmlBody] = useState(automation.htmlBody);
  const [offsetDays, setOffsetDays] = useState(String(automation.offsetDays));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<AutomationPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const id = `automacao-${automation.key}`;

  const dirty =
    enabled !== automation.enabled ||
    subject !== automation.subject ||
    htmlBody !== automation.htmlBody ||
    offsetDays !== String(automation.offsetDays);

  const parsedOffset = Number(offsetDays);
  const offsetValid =
    offsetDays.trim() !== '' &&
    Number.isInteger(parsedOffset) &&
    parsedOffset >= OFFSET_MIN &&
    parsedOffset <= OFFSET_MAX;
  const subjectValid = subject.trim().length >= SUBJECT_MIN;
  const bodyValid = htmlBody.trim().length >= BODY_MIN;
  const reasonValid = reason.trim().length >= MIN_REASON;
  const canSave = dirty && offsetValid && subjectValid && bodyValid && reasonValid && !saving;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await saveAutomation(automation.key, {
        enabled,
        subject: subject.trim(),
        htmlBody,
        offsetDays: parsedOffset,
        reason: reason.trim(),
      });
      onSaved(updated);
      setReason('');
      // A prévia guardada descreve o texto ANTERIOR: descartar é o único jeito
      // de o operador não conferir a alteração contra a renderização antiga.
      setPreview(null);
      toast.success(`${automation.label} salvo.`, {
        description: enabled
          ? 'O gatilho está ligado e entra na próxima varredura diária.'
          : 'O gatilho ficou desligado: nenhum e-mail sai por ele.',
      });
    } catch (saveError) {
      setError(
        isApiError(saveError) ? saveError.message : 'Não foi possível salvar. Tente de novo.'
      );
    } finally {
      setSaving(false);
    }
  };

  const onTogglePreview = async () => {
    if (showPreview) {
      setShowPreview(false);
      return;
    }
    setShowPreview(true);
    if (!previewOrganizationId || preview || previewing) return;

    setPreviewing(true);
    setPreviewError(null);
    try {
      setPreview(await previewAutomation(automation.key, previewOrganizationId));
    } catch (err) {
      // 400 aqui é quase sempre "organização sem assinatura para servir de
      // prévia" — informação útil, não falha da tela. Mostrar a mensagem do
      // servidor evita o operador concluir que a prévia está quebrada.
      setPreviewError(
        isApiError(err) ? err.message : 'Não foi possível montar a prévia no servidor.'
      );
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className={cx(
        'rounded-xl border bg-surface',
        enabled ? 'border-line' : 'border-line bg-app/40'
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold text-ink">{automation.label}</h3>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{meta.trigger}</p>
        </div>

        {/* Liga/desliga faz parte do formulário: só vale depois de salvar com
            motivo. Desligar aviso de vencimento é uma decisão que alguém vai
            querer explicar seis meses depois. */}
        <label
          htmlFor={`${id}-enabled`}
          className="flex shrink-0 cursor-pointer items-center gap-2 text-[13px] font-semibold text-ink"
        >
          <input
            id={`${id}-enabled`}
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="h-4 w-4 rounded border-line accent-accent"
          />
          {enabled ? 'Ligado' : 'Desligado'}
        </label>
      </header>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        {meta.warning && (
          <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-[13px] leading-relaxed text-warning-ink">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{meta.warning}</span>
          </p>
        )}

        {meta.note && <p className="text-[13px] leading-relaxed text-ink-muted">{meta.note}</p>}

        {automation.yearlyOnly && (
          <p className="text-[13px] leading-relaxed text-ink-muted">
            O servidor aplica este gatilho <strong className="text-ink">só em assinatura anual</strong>.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <Field
            label="Dias"
            htmlFor={`${id}-offset`}
            hint={`${meta.offsetHint} Padrão do catálogo: ${automation.defaultOffsetDays}.`}
            error={offsetValid ? null : `Use um número inteiro de ${OFFSET_MIN} a ${OFFSET_MAX}.`}
          >
            <input
              id={`${id}-offset`}
              type="number"
              min={OFFSET_MIN}
              max={OFFSET_MAX}
              step={1}
              inputMode="numeric"
              value={offsetDays}
              onChange={(event) => setOffsetDays(event.target.value)}
              className={`${inputClass} money`}
            />
          </Field>

          <Field
            label="Assunto"
            htmlFor={`${id}-subject`}
            hint="Também aceita as variáveis abaixo."
            error={subjectValid ? null : `Escreva pelo menos ${SUBJECT_MIN} caracteres.`}
          >
            <input
              id={`${id}-subject`}
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Ex.: {{nome}}, sua assinatura renova em {{vencimento}}"
              className={inputClass}
            />
          </Field>
        </div>

        <Field
          label="Corpo do e-mail"
          htmlFor={`${id}-body`}
          hint="HTML simples: parágrafos, negrito e links. Não há editor visual: o texto sai como você escrever, dentro do layout do sistema."
          error={bodyValid ? null : `Escreva pelo menos ${BODY_MIN} caracteres.`}
        >
          <textarea
            id={`${id}-body`}
            value={htmlBody}
            rows={8}
            onChange={(event) => setHtmlBody(event.target.value)}
            spellCheck
            className={`${inputClass} resize-y font-mono text-[13px]`}
          />
        </Field>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink">Variáveis disponíveis</p>
          <ul className="flex flex-wrap gap-2">
            {variables.map((token) => (
              <li
                key={token}
                className="rounded-lg border border-line bg-app px-2.5 py-1.5 text-[12px] text-ink-muted"
              >
                <code className="money font-semibold text-ink">{token}</code>
                {preview?.variables && (
                  /* O valor REAL que a prévia usou. É o que transforma
                     "{{valor}} existe" em "{{valor}} é R$ 1.404,00 nesta
                     conta" — e o valor é o do CICLO, calculado pelo servidor. */
                  <span className="ml-1.5">
                    {preview.variables[token.replace(/[{}\s]/g, '')] ?? '-'}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs leading-snug text-ink-subtle">
            Lista enviada pelo servidor. Escreva a variável exatamente assim: qualquer outra chave
            sai literal no e-mail do cliente, sem aviso de erro em lugar nenhum.
          </p>
        </div>

        <div>
          <Button type="button" variant="ghost" onClick={onTogglePreview} loading={previewing}>
            {showPreview ? (
              <EyeOff aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Eye aria-hidden="true" className="h-4 w-4" />
            )}
            {showPreview ? 'Esconder prévia' : 'Ver prévia'}
          </Button>

          {showPreview && (
            <div className="mt-3 space-y-2">
              {!previewOrganizationId ? (
                <p className="rounded-lg border border-line bg-app px-3 py-2.5 text-[13px] leading-relaxed text-ink-muted">
                  Escolha uma organização no topo da aba: a prévia é renderizada pelo servidor com
                  os dados reais dela (plano, vencimento e valor do ciclo).
                </p>
              ) : previewError ? (
                <p
                  role="alert"
                  className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-[13px] leading-relaxed text-warning-ink"
                >
                  {previewError}
                </p>
              ) : preview ? (
                <>
                  {dirty && (
                    /* Armadilha da rota: ela renderiza o template GRAVADO. Sem
                       este aviso, quem editou e não salvou compara a alteração
                       com o texto antigo e conclui que "não pegou". */
                    <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-[13px] leading-relaxed text-warning-ink">
                      <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        Esta prévia é do texto <strong>salvo no servidor</strong>. Suas alterações
                        ainda não estão nela. Salve o gatilho e peça a prévia de novo.
                      </span>
                    </p>
                  )}
                  <div className="overflow-hidden rounded-lg border border-line">
                    <p className="border-b border-line bg-app px-3 py-2 text-[13px] text-ink-muted">
                      Assunto: <strong className="text-ink">{preview.subject}</strong>
                    </p>
                    <iframe
                      title={`Prévia de ${automation.label}`}
                      srcDoc={preview.html}
                      sandbox=""
                      className="h-72 w-full bg-white"
                    />
                    <p className="border-t border-line bg-app px-3 py-2 text-xs text-ink-subtle">
                      Dados reais de {previewOrganizationName ?? 'organização selecionada'},
                      renderizados pelo servidor, inclusive o valor do ciclo.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-ink-muted">Montando a prévia no servidor…</p>
              )}
            </div>
          )}
        </div>

        <Field
          label="Motivo da alteração"
          htmlFor={`${id}-reason`}
          hint="Fica no registro de auditoria junto com o antes e o depois. Sem motivo não dá para salvar."
          error={reason.length > 0 && !reasonValid ? 'Escreva pelo menos 5 caracteres.' : null}
        >
          <input
            id={`${id}-reason`}
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: texto revisado com o jurídico em 09/09."
            className={inputClass}
          />
        </Field>

        {error && (
          <p role="alert" className="text-[13px] font-medium text-danger-ink">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-xs text-ink-subtle">
            {saving
              ? 'Salvando…'
              : dirty
                ? 'Alterações ainda não salvas.'
                : automation.updatedAt
                  ? `Última alteração em ${formatDateTime(automation.updatedAt)}.`
                  : 'Nunca editado: em uso com o texto de fábrica.'}
          </p>
          <Button type="submit" variant="primary" loading={saving} disabled={!canSave}>
            <Save aria-hidden="true" className="h-4 w-4" />
            Salvar gatilho
          </Button>
        </div>
      </div>
    </form>
  );
};

export default AutomacaoCard;
