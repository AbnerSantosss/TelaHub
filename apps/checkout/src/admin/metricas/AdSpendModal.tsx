/**
 * Entrada MANUAL do gasto de mídia, por semana e por canal.
 *
 * Por que manual, e por que isso está escrito também na tela: não existe
 * integração com Meta Ads nem Google Ads neste sistema. Ninguém puxa o gasto
 * sozinho. E sem o gasto informado os indicadores 1 (custo por conversa) e 3
 * (CAC caixa) simplesmente NÃO EXISTEM — o painel os mostra como "sem gasto
 * informado", nunca como zero, porque custo zero se lê como campanha de graça e
 * é a leitura que faz alguém subir orçamento no pior momento possível.
 *
 * O gasto é semanal porque a estratégia é medida por coorte semanal. Gasto
 * diário daria precisão falsa (a atribuição do lead não é do mesmo dia) e gasto
 * mensal chegaria tarde demais para cortar campanha ruim.
 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { isApiError } from '../../lib/api';
import { fetchAdSpend, saveAdSpend } from '../backoffice-api';
import type { AdSpendChannel, AdSpendRow } from '../backoffice-types';
import { Button, Field, Modal, Money, cx, inputClass } from '../ui';

/**
 * O canal do FORMULÁRIO é a união fechada da escrita, não o `channel` da linha
 * lida (que é `string`, porque uma linha antiga do banco pode trazer um canal
 * fora do catálogo). Tipar o formulário pela leitura deixaria passar um valor
 * que o servidor recusa com 400 — e a chave única é `(weekStart, channel)`:
 * "Meta" e "meta" viram dois baldes para o mesmo dinheiro.
 */
type Channel = AdSpendChannel;

const CHANNELS: Array<{ value: Channel; label: string }> = [
  { value: 'meta', label: 'Meta' },
  { value: 'google', label: 'Google' },
  { value: 'outros', label: 'Outros' },
];

const diaLongo = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Data ISO → `Date` no fuso LOCAL.
 *
 * Armadilha clássica: `new Date('2026-09-07')` é interpretado como meia-noite
 * UTC, e no Brasil (UTC-3) vira dia 06 na leitura local — a semana inteira
 * andaria um dia para trás na tela e o gasto seria gravado na coorte errada.
 * Por isso a parte `YYYY-MM-DD` é montada componente a componente.
 */
function parseDiaLocal(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const fallback = new Date(iso);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

const toInputValue = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Segunda-feira da semana da data informada. A coorte começa na segunda. */
function inicioDaSemana(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // getDay(): 0 = domingo. `(dia + 6) % 7` dá quantos dias voltar até segunda.
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function fimDaSemana(inicio: Date): Date {
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 6);
  return fim;
}

/**
 * "R$ 1.234,56" → 123456 centavos.
 *
 * O ponto só é separador de milhar quando há vírgula na string. Sem essa regra,
 * quem digita "1500.50" (teclado numérico, hábito de planilha) teria o valor
 * lido como R$ 150.050 — erro de duas ordens de grandeza no denominador do CAC.
 */
export function parseReaisParaCentavos(raw: string): number | null {
  const limpo = (raw ?? '').replace(/[R$\s]/gi, '').trim();
  if (!limpo) return null;

  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo;

  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null;

  const reais = Number(normalizado);
  if (!Number.isFinite(reais) || reais < 0) return null;
  return Math.round(reais * 100);
}

const AdSpendModal = ({
  weekStart,
  onClose,
  onSaved,
}: {
  /** Semana sugerida — normalmente a coorte que o operador estava olhando. */
  weekStart: string;
  onClose: () => void;
  /** Recarrega o overview: o indicador só sai de "sem gasto" depois do refetch. */
  onSaved: () => void;
}) => {
  const inicial = inicioDaSemana(parseDiaLocal(weekStart) ?? new Date());

  const [semana, setSemana] = useState<string>(toInputValue(inicial));
  const [channel, setChannel] = useState<Channel>('meta');
  const [valor, setValor] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // O que JÁ foi informado nesta semana. Sem isso o operador não tem como saber
  // se está complementando ou substituindo — e `saveAdSpend` é PUT: grava por
  // (semana, canal) e sobrescreve o que havia.
  const [existentes, setExistentes] = useState<AdSpendRow[] | null>(null);

  const inicioSemana = inicioDaSemana(parseDiaLocal(semana) ?? inicial);
  const fimSemana = fimDaSemana(inicioSemana);
  const semanaIso = toInputValue(inicioSemana);

  useEffect(() => {
    let alive = true;
    setExistentes(null);

    fetchAdSpend({ startDate: semanaIso, endDate: toInputValue(fimSemana) })
      .then((rows) => {
        if (alive) setExistentes(rows);
      })
      .catch(() => {
        // Falha aqui não bloqueia o registro do gasto: é informação de apoio.
        if (alive) setExistentes([]);
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semanaIso]);

  const jaInformado = (existentes ?? []).filter((row) => row.channel === channel);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const amountCents = parseReaisParaCentavos(valor);
    if (amountCents === null) {
      setError('Informe o valor gasto na semana, em reais. Ex.: 480,00');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await saveAdSpend({
        weekStart: semanaIso,
        channel,
        amountCents,
        // Observação em branco é OMITIDA, nunca `null`. O schema do servidor
        // (`optional(z.string()...)`) trata string vazia como ausente, mas
        // recusa `null` explícito com 400 — era o que o painel mandava antes,
        // ou seja, o caso mais comum do formulário (sem observação) era
        // justamente o que falhava, e a mensagem de erro falava de "payload
        // inválido" sem dizer qual campo.
        note: note.trim() ? note.trim() : undefined,
      });
      toast.success('Gasto registrado.', {
        description: 'Custo por conversa e CAC desta semana passam a ter valor no próximo cálculo.',
      });
      onSaved();
      onClose();
    } catch (saveError) {
      setError(
        isApiError(saveError)
          ? saveError.message
          : 'Não foi possível gravar o gasto. Tente de novo.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Informar gasto de mídia"
      description={`Semana de ${diaLongo.format(inicioSemana)} a ${diaLongo.format(fimSemana)}`}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="ad-spend-form" variant="primary" loading={submitting}>
            Gravar gasto
          </Button>
        </>
      }
    >
      <form id="ad-spend-form" onSubmit={onSubmit} className="space-y-4">
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-[13px] leading-relaxed text-warning-ink">
          <strong>Este número é digitado à mão, de propósito.</strong> Não existe
          integração com Meta Ads nem Google Ads aqui, então ninguém puxa o gasto sozinho. Enquanto a
          semana ficar sem gasto informado, <strong>custo por conversa</strong> e{' '}
          <strong>CAC</strong> aparecem como “sem gasto informado”, e não como zero: campanha que
          parece de graça é o que faz alguém aumentar orçamento na hora errada.
        </p>

        <Field
          label="Semana (qualquer dia dela)"
          htmlFor="ad-spend-week"
          hint="A coorte começa na segunda-feira. Escolher uma quarta grava na semana daquela quarta."
        >
          <input
            id="ad-spend-week"
            type="date"
            value={semana}
            onChange={(event) => setSemana(event.target.value)}
            className={inputClass}
          />
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-ink">Canal</legend>
          <div className="grid grid-cols-3 gap-2">
            {CHANNELS.map((option) => {
              const active = channel === option.value;
              return (
                <label
                  key={option.value}
                  className={cx(
                    'flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2.5 text-[13px] font-semibold transition-colors',
                    active
                      ? 'border-accent bg-accent/10 text-accent-ink'
                      : 'border-line bg-surface text-ink-muted hover:bg-app'
                  )}
                >
                  <input
                    type="radio"
                    name="ad-spend-channel"
                    value={option.value}
                    checked={active}
                    onChange={() => setChannel(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        {jaInformado.length > 0 && (
          <p className="rounded-lg border border-line bg-app px-3 py-2.5 text-[13px] leading-relaxed text-ink-muted">
            Esta semana já tem{' '}
            <strong className="text-ink">
              <Money cents={jaInformado[0]!.amountCents} />
            </strong>{' '}
            informados neste canal. Gravar de novo <strong className="text-ink">substitui</strong> o
            valor, não soma. Para lançar um complemento, some você mesmo e informe o total da semana.
          </p>
        )}

        <Field
          label="Gasto na semana (R$)"
          htmlFor="ad-spend-amount"
          hint="Valor total do canal nesta semana, como aparece na fatura da plataforma. Ex.: 480,00"
          error={error}
        >
          <input
            id="ad-spend-amount"
            inputMode="decimal"
            value={valor}
            onChange={(event) => setValor(event.target.value)}
            aria-describedby={error ? 'ad-spend-amount-error' : undefined}
            placeholder="0,00"
            className={`${inputClass} money`}
          />
        </Field>

        <Field
          label="Observação"
          htmlFor="ad-spend-note"
          optional
          hint="Ex.: trocamos o criativo na quarta; três dias parados por cartão recusado."
        >
          <input
            id="ad-spend-note"
            value={note}
            maxLength={200}
            onChange={(event) => setNote(event.target.value)}
            className={inputClass}
          />
        </Field>
      </form>
    </Modal>
  );
};

export default AdSpendModal;
