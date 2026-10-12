/**
 * Quem recebe a campanha.
 *
 * `optInOnly` aparece na tela LIGADO E TRAVADO. Poderia simplesmente não
 * aparecer — o servidor força de qualquer jeito — mas aí o operador olharia a
 * contagem, veria menos gente do que a base tem e concluiria que o filtro de
 * plano está errado. Mostrar a trava é o que transforma "sumiram 300 contatos"
 * em "300 pessoas não consentiram", que é a leitura certa.
 *
 * O número de suprimidos é apresentado como informação normal, no mesmo peso do
 * número de destinatários. Pintar de vermelho ensinaria o operador a querer
 * derrubar o filtro, e o filtro é justamente a parte que está funcionando.
 */
import { Lock } from 'lucide-react';

import type {
  AudiencePreviewResponse,
  CampaignAudience,
  SubscriptionStatus,
} from '../backoffice-types';
import { formatNumber } from '../format';
import { cx } from '../ui';

/**
 * Códigos do catálogo (`prisma/seed-plans.ts`). Estão fixos aqui porque o
 * contrato do backoffice não expõe listagem de planos, e inventar uma rota
 * seria mexer em arquivo de outro agente. Plano novo no catálogo pede uma linha
 * aqui — está anotado no relatório como dívida conhecida.
 */
const PLAN_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'gratis', label: 'Grátis' },
  { code: 'loja', label: 'Loja' },
  { code: 'rede', label: 'Rede' },
  { code: 'enterprise', label: 'Enterprise' },
];

const STATUS_OPTIONS: Array<{ value: SubscriptionStatus; label: string; hint: string }> = [
  { value: 'trialing', label: 'Em teste', hint: 'Ainda não pagou o primeiro ciclo.' },
  { value: 'active', label: 'Ativa', hint: 'Assinatura em dia.' },
  { value: 'past_due', label: 'Inadimplente', hint: 'Cobrança falhou e a carência corre.' },
  { value: 'canceled', label: 'Cancelada', hint: 'Saiu por escolha ou por falta de pagamento.' },
];

const toggle = <T,>(list: T[] | undefined, value: T): T[] => {
  const current = list ?? [];
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
};

const checkboxClass = 'h-4 w-4 shrink-0 rounded border-line accent-accent';

const PublicoSelector = ({
  value,
  onChange,
  disabled = false,
  preview = null,
  stale = false,
}: {
  value: CampaignAudience;
  onChange: (next: CampaignAudience) => void;
  disabled?: boolean;
  /**
   * Última contagem feita para ESTE público, como o servidor a devolve. Nulo
   * enquanto ninguém contou.
   *
   * ⚠️ Os campos são `total`/`optedIn`/`withoutOptIn`. O contrato antigo lia
   * `recipients`/`suppressed`, que não existem em lugar nenhum do servidor: os
   * dois chegavam `undefined` e `formatNumber(undefined)` imprime "0". Como
   * "0 destinatários" é hoje o resultado CORRETO na base real (ninguém marcou
   * opt-in ainda), o defeito não teria como ser notado olhando a tela.
   */
  preview?: AudiencePreviewResponse | null;
  /** O público mudou depois da contagem: o número na tela não vale mais. */
  stale?: boolean;
}) => {
  const plans = value.plans ?? [];
  const statuses = value.statuses ?? [];

  const set = (patch: Partial<CampaignAudience>) =>
    onChange({ ...value, ...patch, optInOnly: true });

  return (
    <div className="space-y-5">
      <fieldset disabled={disabled}>
        <legend className="mb-1.5 text-[13px] font-semibold text-ink">Planos</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PLAN_OPTIONS.map((plan) => (
            <label
              key={plan.code}
              className={cx(
                'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-semibold transition-colors',
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                plans.includes(plan.code)
                  ? 'border-accent bg-accent/10 text-accent-ink'
                  : 'border-line bg-surface text-ink-muted hover:bg-app'
              )}
            >
              <input
                type="checkbox"
                checked={plans.includes(plan.code)}
                onChange={() => set({ plans: toggle(plans, plan.code) })}
                className={checkboxClass}
              />
              {plan.label}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs leading-snug text-ink-muted">
          {plans.length === 0
            ? 'Nenhum plano marcado significa TODOS os planos, inclusive o Grátis.'
            : `Só quem está em ${plans.length === 1 ? 'um plano' : `${plans.length} planos`}.`}
        </p>
      </fieldset>

      <fieldset disabled={disabled}>
        <legend className="mb-1.5 text-[13px] font-semibold text-ink">Situação da assinatura</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {STATUS_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cx(
                'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px] transition-colors',
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                statuses.includes(option.value)
                  ? 'border-accent bg-accent/10'
                  : 'border-line bg-surface hover:bg-app'
              )}
            >
              <input
                type="checkbox"
                checked={statuses.includes(option.value)}
                onChange={() => set({ statuses: toggle(statuses, option.value) })}
                className={`${checkboxClass} mt-0.5`}
              />
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{option.label}</span>
                <span className="block text-xs leading-snug text-ink-muted">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs leading-snug text-ink-muted">
          {statuses.length === 0
            ? 'Nenhuma situação marcada significa TODAS as situações.'
            : 'Só as situações marcadas.'}
        </p>
      </fieldset>

      {/* Trava de consentimento. Fica desabilitada de propósito: não é uma
          escolha do operador, é a regra da LGPD para comunicação de marketing. */}
      <div className="rounded-lg border border-line bg-app px-3 py-3">
        <label
          htmlFor="publico-opt-in"
          className="flex cursor-not-allowed items-center gap-2 text-[13px] font-semibold text-ink"
        >
          <input
            id="publico-opt-in"
            type="checkbox"
            checked
            readOnly
            disabled
            aria-describedby="publico-opt-in-hint"
            className={checkboxClass}
          />
          Só quem aceitou receber novidades
          <Lock aria-hidden="true" className="h-3.5 w-3.5 text-ink-subtle" />
          <span className="text-xs font-normal text-ink-subtle">(sempre ligado)</span>
        </label>
        <p id="publico-opt-in-hint" className="mt-1.5 text-xs leading-relaxed text-ink-muted">
          Campanha é divulgação, e divulgação só vai para quem consentiu. Quem nunca marcou a caixa
          de novidades, ou clicou no link de descadastro, fica de fora e continua registrado como
          suprimido, sem ser apagado.{' '}
          <strong className="text-ink">
            Aviso de vencimento, cobrança e encerramento não passam por este filtro
          </strong>
          : são execução do contrato e vão para todos, na aba Automações.
        </p>
      </div>

      {/* Contagem: destinatários e suprimidos com o MESMO peso visual. */}
      <div
        aria-live="polite"
        className="rounded-lg border border-line bg-surface px-3 py-3 text-[13px]"
      >
        {preview === null ? (
          <p className="text-ink-muted">
            Público ainda não contado. Conte antes de enviar. É a única forma de saber o alcance
            desta campanha antes que ela saia.
          </p>
        ) : stale ? (
          <p className="text-ink-muted">
            O público mudou depois da última contagem. Salve o rascunho e conte de novo: os números
            abaixo são de outro recorte.
          </p>
        ) : (
          <div className="space-y-2.5">
            <div className="flex flex-wrap gap-6">
              <p>
                <span className="block text-xs text-ink-subtle">Vão receber</span>
                <span className="money text-lg font-bold text-ink">
                  {formatNumber(preview.optedIn)}
                </span>
              </p>
              <p>
                <span className="block text-xs text-ink-subtle">Suprimidos (sem opt-in)</span>
                <span className="money text-lg font-bold text-ink">
                  {formatNumber(preview.withoutOptIn)}
                </span>
              </p>
              <p>
                <span className="block text-xs text-ink-subtle">No filtro de plano e situação</span>
                <span className="money text-lg font-bold text-ink">
                  {formatNumber(preview.total)}
                </span>
              </p>
            </div>

            {preview.optedIn === 0 && preview.total > 0 && (
              /* Estado NORMAL hoje, não erro: a base tem gente, e ninguém
                 marcou a caixa de novidades. Sem esta frase, "0 vão receber"
                 se lê como contagem quebrada — e a reação a uma contagem
                 quebrada é derrubar o filtro de consentimento, que é
                 exatamente a parte que está funcionando. */
              <p className="rounded-lg border border-line bg-app px-3 py-2.5 text-[13px] leading-relaxed text-ink-muted">
                Nenhuma das <strong className="text-ink">{formatNumber(preview.total)}</strong>{' '}
                pessoas deste recorte aceitou receber novidades, então a campanha não tem
                destinatário. Isso não é falha da contagem: é o consentimento ainda não coletado.
                Enquanto ninguém marcar a caixa de novidades, toda campanha vai contar zero.
              </p>
            )}

            {preview.total === 0 && (
              <p className="rounded-lg border border-line bg-app px-3 py-2.5 text-[13px] leading-relaxed text-ink-muted">
                Nenhuma pessoa casa com este filtro de plano e situação. Desmarque alguma opção
                acima. Filtro vazio significa “todos”.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicoSelector;
