/**
 * Concessão manual (override): dar a um cliente algo que o plano dele não dá.
 *
 * Existe porque a alternativa — editar o `Plan` para atender um caso — muda o
 * catálogo de todo mundo. A concessão é por organização, some quando removida e
 * fica visível no catálogo efetivo do detalhe.
 *
 * ⚠️ A armadilha desta tela é a validade em branco. Concessão sem prazo não
 * expira, ninguém revisa, e o desconto combinado "só até fechar o piloto" vira
 * permanente sem que nada na interface tenha mentido. Por isso o vazio é dito
 * com todas as letras e há um atalho para colocar uma data.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Trash2 } from 'lucide-react';

import { isApiError } from '../../lib/api';
import { fetchPlanCatalog, type Plan } from '../../lib/plans';
import { removeOverride, saveOverride } from '../backoffice-api';
import type { ClienteDetail } from '../backoffice-types';
import { formatDate } from '../format';
import { Button, Field, Modal, cx, inputClass } from '../ui';

const REASON_MIN = 3;

/** `YYYY-MM-DD` do input + N dias — para os atalhos de validade. */
function isoDateInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Número digitado → limite. Vazio significa "usa o limite do plano", não zero. */
function parseLimit(value: string): number | null {
  const clean = value.trim();
  if (!clean) return null;
  const parsed = Number(clean);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

const OverrideModal = ({
  detail,
  onClose,
  onApplied,
}: {
  /** O detalhe inteiro: organização, plano e a concessão como ela está hoje. */
  detail: ClienteDetail;
  onClose: () => void;
  /** Avisa que a concessão mudou. Quem recarrega o cliente é a tela. */
  onApplied: () => void;
}) => {
  const organizationId = detail.organization.id;
  const subscription = detail.subscription;
  const override = detail.override;
  const [extraFeatures, setExtraFeatures] = useState<string[]>(override?.extraFeatures ?? []);
  const [maxDevices, setMaxDevices] = useState(override?.maxDevices != null ? String(override.maxDevices) : '');
  const [maxUsers, setMaxUsers] = useState(override?.maxUsers != null ? String(override.maxUsers) : '');
  const [expiresAt, setExpiresAt] = useState(override?.expiresAt ? override.expiresAt.slice(0, 10) : '');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<Plan[] | null>(null);
  const [catalogFailed, setCatalogFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchPlanCatalog()
      .then((data) => {
        if (alive) setCatalog(data.plans);
      })
      .catch(() => {
        if (alive) setCatalogFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const plan = useMemo(
    () => catalog?.find((item) => item.code === subscription?.plan.code) ?? null,
    [catalog, subscription?.plan.code]
  );

  /**
   * As opções são a união das funções do catálogo inteiro, marcando o que o
   * plano já entrega. Listar só o que falta esconderia o mais importante: ver
   * que a função já está incluída evita conceder algo que o cliente já tinha —
   * e depois "remover a concessão" tirando o que era do plano.
   */
  const allFeatures = useMemo(() => {
    const set = new Set<string>();
    for (const item of catalog ?? []) for (const feature of item.features) set.add(feature);
    for (const feature of extraFeatures) set.add(feature);
    return Array.from(set).sort();
  }, [catalog, extraFeatures]);

  const planFeatures = useMemo(() => new Set(plan?.features ?? []), [plan]);

  const toggleFeature = (feature: string) =>
    setExtraFeatures((current) =>
      current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature]
    );

  const reasonOk = reason.trim().length >= REASON_MIN;
  const nothingGranted = extraFeatures.length === 0 && !maxDevices.trim() && !maxUsers.trim();

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (submitting || !reasonOk || nothingGranted) return;

    setSubmitting(true);
    setError(null);
    try {
      await saveOverride(organizationId, {
        reason: reason.trim(),
        extraFeatures,
        maxDevices: parseLimit(maxDevices),
        maxUsers: parseLimit(maxUsers),
        // Fim do dia escolhido: uma concessão que vence "em 30/09" tem de valer
        // o dia 30 inteiro, senão ela some na virada da madrugada e o cliente
        // perde acesso num dia que a tela dizia estar coberto.
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
      });
      onApplied();
      toast.success('Concessão salva.', {
        description: expiresAt
          ? `Vale até ${formatDate(new Date(`${expiresAt}T23:59:59`).toISOString())}.`
          : 'Sem data de validade, vale por tempo indeterminado.',
      });
      onClose();
    } catch (saveError) {
      setError(
        isApiError(saveError) ? saveError.message : 'Não foi possível salvar a concessão. Nada foi alterado.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onRemove = async () => {
    if (removing) return;

    // Remover também exige motivo: é o `DELETE` que apaga o que o cliente
    // tinha, e a trilha grava o "antes" junto do porquê. O servidor recusa sem
    // ele (400), então checar aqui é o que evita o operador confirmar o diálogo
    // e receber um erro que parece falha de rede.
    setTouched(true);
    if (!reasonOk) {
      setError('Escreva o motivo antes de remover. Ele vai para a trilha de auditoria junto com o que foi retirado.');
      return;
    }

    const ok = window.confirm(
      'Remover a concessão? O cliente volta imediatamente aos limites e funções do plano contratado.'
    );
    if (!ok) return;

    setRemoving(true);
    setError(null);
    try {
      // O motivo vai em `?reason=` — `api.delete` não manda corpo nenhum.
      await removeOverride(organizationId, reason.trim());
      onApplied();
      toast.success('Concessão removida.', { description: 'O cliente voltou ao catálogo do plano.' });
      onClose();
    } catch (removeError) {
      setError(
        isApiError(removeError) ? removeError.message : 'Não foi possível remover a concessão. Nada foi alterado.'
      );
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Modal
      title={override ? 'Editar concessão manual' : 'Conceder acesso extra'}
      description={`${detail.organization.name} · plano ${
        subscription ? subscription.plan.name || subscription.plan.code : 'nenhum'
      }`}
      onClose={onClose}
      footer={
        <>
          {override && (
            <Button
              type="button"
              variant="danger"
              onClick={onRemove}
              loading={removing}
              className="mr-auto"
              disabled={submitting}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Remover concessão
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting || removing}>
            Voltar
          </Button>
          <Button type="submit" form="override-form" variant="primary" loading={submitting} disabled={removing}>
            Salvar concessão
          </Button>
        </>
      }
    >
      <form id="override-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <p className="rounded-lg border border-line bg-app px-3 py-2.5 text-[13px] leading-relaxed text-ink-muted">
          A concessão soma ao plano contratado, não o substitui. Ela aparece marcada no catálogo efetivo do cliente,
          para ninguém confundir o que foi vendido com o que foi liberado à mão.
        </p>

        {/*
          O servidor devolve a concessão VENCIDA junto (marcada `active: false`),
          e o formulário abre preenchido com ela — inclusive com a data que já
          passou. Sem este aviso, salvar "de novo" gravaria uma concessão que
          nasce vencida, e o operador desligaria o telefone achando que liberou.
        */}
        {override && !override.active && (
          <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-[13px] leading-relaxed text-warning-ink">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              A concessão que está aqui <strong>venceu</strong> em {formatDate(override.expiresAt)}. Hoje o cliente só
              tem o plano. Os campos vieram preenchidos com o que ela era; para valer de novo, ponha uma data
              <strong> no futuro</strong> antes de salvar.
            </span>
          </p>
        )}

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink">Funções extras</p>
          {catalogFailed ? (
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-[13px] text-warning-ink">
              O catálogo de planos não carregou, então não dá para listar as funções disponíveis. Você ainda pode
              ajustar os limites abaixo, ou fechar e tentar de novo.
            </p>
          ) : !catalog ? (
            <p className="text-[13px] text-ink-muted">Carregando o catálogo de funções…</p>
          ) : allFeatures.length === 0 ? (
            <p className="text-[13px] text-ink-muted">
              Nenhum plano do catálogo declara funções nomeadas. Use os limites abaixo.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {allFeatures.map((feature) => {
                const included = planFeatures.has(feature);
                const checked = included || extraFeatures.includes(feature);
                return (
                  <li key={feature}>
                    <label
                      className={cx(
                        'flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px]',
                        included
                          ? 'cursor-default border-line bg-app text-ink-muted'
                          : 'cursor-pointer border-line bg-surface text-ink hover:bg-app'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={included}
                        onChange={() => toggleFeature(feature)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-accent-strong"
                      />
                      <span className="min-w-0">
                        <span className="break-all font-medium">{feature}</span>
                        {included && <span className="ml-1.5 text-[12px]">(já incluída no plano)</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Limite de telas"
            htmlFor="override-devices"
            optional
            hint={
              plan
                ? `Em branco = o limite do plano (${plan.limits.maxDevices ?? 'sem limite'}).`
                : 'Em branco = o limite do plano.'
            }
          >
            <input
              id="override-devices"
              type="number"
              min={0}
              value={maxDevices}
              onChange={(event) => setMaxDevices(event.target.value)}
              placeholder="do plano"
              className={inputClass}
            />
          </Field>

          <Field
            label="Limite de usuários"
            htmlFor="override-users"
            optional
            hint={
              plan
                ? `Em branco = o limite do plano (${plan.limits.maxUsers ?? 'sem limite'}).`
                : 'Em branco = o limite do plano.'
            }
          >
            <input
              id="override-users"
              type="number"
              min={0}
              value={maxUsers}
              onChange={(event) => setMaxUsers(event.target.value)}
              placeholder="do plano"
              className={inputClass}
            />
          </Field>
        </div>

        <Field
          label="Vale até"
          htmlFor="override-validade"
          optional
          hint={
            expiresAt
              ? `A concessão cai sozinha depois de ${formatDate(new Date(`${expiresAt}T23:59:59`).toISOString())}.`
              : undefined
          }
        >
          <input
            id="override-validade"
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            className={inputClass}
          />
          {!expiresAt && (
            <p className="mt-1.5 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] leading-relaxed text-warning-ink">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Sem data, a concessão vale <strong>para sempre</strong>, e ninguém vai lembrar de revisá-la. Se isto é
                uma cortesia ou um piloto, ponha um prazo:
              </span>
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { days: 30, label: '30 dias' },
              { days: 90, label: '90 dias' },
              { days: 180, label: '6 meses' },
            ].map((option) => (
              <button
                key={option.days}
                type="button"
                onClick={() => setExpiresAt(isoDateInDays(option.days))}
                className="rounded-full border border-line bg-surface px-3 py-1 text-[12px] font-semibold text-ink-muted transition-colors hover:bg-app"
              >
                +{option.label}
              </button>
            ))}
            {expiresAt && (
              <button
                type="button"
                onClick={() => setExpiresAt('')}
                className="rounded-full border border-line bg-surface px-3 py-1 text-[12px] font-semibold text-ink-muted transition-colors hover:bg-app"
              >
                sem prazo
              </button>
            )}
          </div>
        </Field>

        <Field
          label="Motivo"
          htmlFor="override-motivo"
          hint="Fica na trilha de auditoria do cliente com seu usuário e a data. Escreva o acordo, não a ação: 'piloto do condomínio X até 30/11', não 'liberado'."
          error={touched && !reasonOk ? `Escreva pelo menos ${REASON_MIN} caracteres.` : null}
        >
          <textarea
            id="override-motivo"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: Piloto de 3 telas extras combinado com o síndico até o fim da obra."
            className={inputClass}
          />
        </Field>

        {touched && nothingGranted && (
          <p className="text-[13px] font-medium text-danger-ink">
            Marque uma função ou preencha um limite. Uma concessão vazia não muda nada para o cliente.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-[13px] text-danger-ink"
          >
            {error}
          </p>
        )}

        <p aria-live="polite" className="sr-only">
          {submitting ? 'Salvando a concessão…' : removing ? 'Removendo a concessão…' : ''}
        </p>
      </form>
    </Modal>
  );
};

export default OverrideModal;
