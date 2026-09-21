/**
 * Leads — quem pediu contato sem passar pelo checkout.
 *
 * A troca de status é INLINE, na própria linha, e não num modal. Triagem de
 * lead é trabalho em lote: são vinte decisões de dois segundos, e um diálogo por
 * decisão faz a lista ser abandonada pela metade — que é o mesmo que não ter
 * lista. O preço dessa escolha é não haver campo de motivo aqui; por isso a
 * mudança de status de lead não é ação sobre a conta de ninguém, ao contrário
 * das ações de assinatura.
 *
 * ⚠️ O que o contrato provisório errava:
 *   • a resposta é `{ leads, pagination }`, não `{ rows, total, page, pageSize }`
 *     — com o nome errado a lista chega `undefined` e a tela diz "nenhum lead
 *     recebido ainda" com a fila comercial cheia do outro lado;
 *   • o `PATCH` devolve `{ lead }` com um `select` REDUZIDO, SEM `utmSource`,
 *     `utmCampaign` nem `referrer`. Trocar a linha inteira pelo que ele devolve
 *     apagaria a coluna "Origem" do lead recém-triado — e origem sumindo ao
 *     clicar parece perda de dado, não recorte de resposta. Por isso a tela
 *     mescla só o `status`.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Search, UserPlus, X } from 'lucide-react';

import { isApiError } from '../lib/api';
import { fetchLeads, updateLeadStatus } from './backoffice-api';
import type { LeadRow, LeadStatus, LeadsResponse } from './backoffice-types';
import { formatDateTime, formatNumber, formatPhone, formatRelative } from './format';
import { LEAD_TONE, TONE } from './status';
import { useAdminQuery } from './useAdminQuery';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  ForbiddenState,
  PageHeader,
  SkeletonRows,
  cx,
  inputClass,
} from './ui';

const PAGE_SIZE = 25;

/** Chip e badge do lead vêm do tom único em `./status`. */
const toneOf = (status: LeadStatus) => ({
  chip: TONE[LEAD_TONE[status]].chipActive,
  badge: TONE[LEAD_TONE[status]].badge,
});

const LEAD_STATUSES: Array<{ value: LeadStatus; label: string; hint: string; chip: string; badge: string }> = [
  {
    value: 'new',
    label: 'Novo',
    hint: 'Chegou e ninguém falou com ele ainda.',
    ...toneOf('new'),
  },
  {
    value: 'contacted',
    label: 'Contatado',
    hint: 'Já houve um contato. Aguardando resposta.',
    ...toneOf('contacted'),
  },
  {
    value: 'qualified',
    label: 'Qualificado',
    hint: 'Tem perfil e interesse. Vale proposta.',
    ...toneOf('qualified'),
  },
  {
    value: 'discarded',
    label: 'Descartado',
    hint: 'Sem perfil, sem interesse ou duplicado.',
    ...toneOf('discarded'),
  },
];

const statusMeta = (status: LeadStatus) => LEAD_STATUSES.find((item) => item.value === status) ?? LEAD_STATUSES[0];

const isLeadStatus = (value: string | null): value is LeadStatus =>
  !!value && LEAD_STATUSES.some((item) => item.value === value);

const th = 'px-4 py-2.5 text-left text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase';

/**
 * Seletor de status da linha.
 *
 * Fica desabilitado enquanto salva para o operador não disparar duas mudanças
 * na mesma linha — a segunda chegaria antes da primeira num dia de rede ruim, e
 * o lead terminaria com o status errado sem nenhum aviso.
 */
const StatusSelect = ({
  lead,
  saving,
  onChange,
}: {
  lead: LeadRow;
  saving: boolean;
  onChange: (status: LeadStatus) => void;
}) => (
  <>
    <label htmlFor={`lead-status-${lead.id}`} className="sr-only">
      Situação de {lead.name || lead.email}
    </label>
    <select
      id={`lead-status-${lead.id}`}
      value={lead.status}
      disabled={saving}
      onChange={(event) => onChange(event.target.value as LeadStatus)}
      className={cx(
        'rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-50',
        statusMeta(lead.status).badge
      )}
    >
      {LEAD_STATUSES.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </>
);

const LeadIdentity = ({ lead }: { lead: LeadRow }) => (
  <div className="min-w-0">
    <p className="truncate text-[13px] font-bold text-ink">{lead.name || 'Sem nome'}</p>
    <p className="truncate text-[12px] text-ink-subtle">
      <a href={`mailto:${lead.email}`} className="text-accent hover:underline">
        {lead.email}
      </a>
    </p>
    {lead.phone && <p className="money text-[12px] text-ink-subtle">{formatPhone(lead.phone)}</p>}
  </div>
);

const LeadsPage = () => {
  const [params, setParams] = useSearchParams();

  const status = isLeadStatus(params.get('status')) ? (params.get('status') as LeadStatus) : undefined;
  const busca = params.get('busca') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const [buscaDraft, setBuscaDraft] = useState(busca);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => setBuscaDraft(busca), [busca]);

  const [{ data, loading, error, forbidden }, reload, patch] = useAdminQuery<LeadsResponse>(
    () => fetchLeads({ status, search: busca || undefined, page, pageSize: PAGE_SIZE }),
    [status, busca, page]
  );

  const updateParams = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: false });
  };

  const onStatusChange = async (lead: LeadRow, next: LeadStatus) => {
    if (savingId || next === lead.status) return;
    setSavingId(lead.id);
    try {
      const { lead: updated } = await updateLeadStatus(lead.id, { status: next });
      // Adota o STATUS que o servidor devolveu, e não o `next` local: se a regra
      // do servidor normalizar a mudança, a tela mostra o que de fato ficou
      // gravado. Mas mescla em cima da linha que já estava na tela — a resposta
      // do PATCH não traz a atribuição, e substituir a linha inteira apagaria a
      // origem do lead que o operador acabou de triar.
      patch((current) => ({
        ...current,
        leads: current.leads.map((row) => (row.id === updated.id ? { ...row, status: updated.status } : row)),
      }));
      toast.success(`Lead marcado como ${statusMeta(updated.status).label.toLowerCase()}.`);
    } catch (updateError) {
      toast.error(
        isApiError(updateError) ? updateError.message : 'Não foi possível mudar a situação do lead. Tente de novo.'
      );
    } finally {
      setSavingId(null);
    }
  };

  const rows = data?.leads ?? [];
  const total = data?.pagination.total ?? 0;
  // Vem calculado do servidor: refazer a divisão aqui daria outro número no dia
  // em que o `pageSize` de lá mudar, e o botão "Próxima" apagaria com página
  // ainda por ver.
  const totalPages = data?.pagination.totalPages ?? 1;
  const hasFilters = !!status || !!busca;

  const clearAll = () => {
    setBuscaDraft('');
    setParams(new URLSearchParams());
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Backoffice"
        title="Leads"
        subtitle={
          <span aria-live="polite">
            {loading && !data
              ? 'Carregando…'
              : `${formatNumber(total)} ${total === 1 ? 'lead' : 'leads'}`}
            {status && ` · situação: ${statusMeta(status).label.toLowerCase()}`}
          </span>
        }
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por situação">
        <button
          type="button"
          aria-pressed={!status}
          onClick={() => updateParams({ status: undefined })}
          className={cx(
            'rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors',
            !status ? 'border-nav bg-nav text-white' : 'border-line bg-surface text-ink-muted hover:bg-app'
          )}
        >
          Todos
        </button>
        {LEAD_STATUSES.map((option) => {
          const active = status === option.value;
          return (
            <button
              key={option.value}
              type="button"
              title={option.hint}
              aria-pressed={active}
              onClick={() => updateParams({ status: active ? undefined : option.value })}
              className={cx(
                'rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors',
                active ? option.chip : 'border-line bg-surface text-ink-muted hover:bg-app'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <form
          className="flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            updateParams({ busca: buscaDraft.trim() || undefined });
          }}
        >
          <label htmlFor="filtro-lead" className="mb-1.5 block text-[13px] font-semibold text-ink">
            Buscar lead
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-subtle"
            />
            <input
              id="filtro-lead"
              type="search"
              value={buscaDraft}
              onChange={(event) => setBuscaDraft(event.target.value)}
              placeholder="Nome, e-mail ou empresa"
              className={`${inputClass} pl-9`}
            />
          </div>
        </form>

        {hasFilters && (
          <Button type="button" variant="ghost" className="sm:mb-0.5" onClick={clearAll}>
            <X aria-hidden="true" className="h-4 w-4" />
            Limpar filtros
          </Button>
        )}
      </div>

      {forbidden ? (
        <ForbiddenState message={error} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <Card bodyClassName="px-0 py-0">
          {loading && !data ? (
            <SkeletonRows rows={6} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<UserPlus aria-hidden="true" className="h-5 w-5" />}
              title={hasFilters ? 'Nenhum lead nesse recorte' : 'Nenhum lead recebido ainda'}
              message={
                hasFilters
                  ? 'Tente outra situação ou limpe a busca. Lead descartado continua na base, só sai da visão “Novo”.'
                  : 'Os formulários do site escrevem aqui. Se o site já está no ar e nada chegou, vale conferir se o formulário está apontando para a API antes de aumentar o investimento em mídia.'
              }
              action={
                hasFilters ? (
                  <Button type="button" onClick={clearAll}>
                    Ver todos os leads
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <caption className="sr-only">
                    Leads recebidos pelo site, do mais recente para o mais antigo. A situação é editável na própria
                    linha.
                  </caption>
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className={`${th} sm:px-5`}>
                        Lead
                      </th>
                      <th scope="col" className={th}>
                        Empresa
                      </th>
                      <th scope="col" className={th}>
                        Interesse
                      </th>
                      <th scope="col" className={th}>
                        Origem
                      </th>
                      <th scope="col" className={th}>
                        Chegou
                      </th>
                      <th scope="col" className={`${th} sm:px-5`}>
                        Situação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((lead) => (
                      <tr key={lead.id} className="border-b border-line last:border-0 hover:bg-app/60">
                        <th scope="row" className="max-w-[240px] px-4 py-3 text-left font-normal sm:px-5">
                          <LeadIdentity lead={lead} />
                        </th>
                        <td className="max-w-[180px] px-4 py-3 text-[13px] text-ink-muted">
                          <span className="line-clamp-2">{lead.company ?? '-'}</span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-ink-muted">{lead.planCode ?? 'não informou'}</td>
                        <td className="px-4 py-3 text-[13px] text-ink-muted">
                          <p>{lead.utmSource ?? <span className="text-ink-subtle">direto / sem UTM</span>}</p>
                          {lead.utmCampaign && <p className="text-[12px] text-ink-subtle">{lead.utmCampaign}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="money text-[13px] whitespace-nowrap text-ink">
                            {formatDateTime(lead.createdAt)}
                          </p>
                          <p className="text-[12px] whitespace-nowrap text-ink-subtle">
                            {formatRelative(lead.createdAt)}
                          </p>
                          {/*
                            `notifiedAt` nulo significa que o e-mail de aviso
                            deste lead NÃO saiu — ninguém do time foi avisado de
                            que ele chegou. O campo já vinha na resposta e a tela
                            não mostrava: um lead que ninguém viu parece um lead
                            que ninguém quis atender.
                          */}
                          {!lead.notifiedAt && (
                            <p className="mt-1 inline-flex items-center rounded border border-warning/30 bg-warning/10 px-1.5 py-px text-[11px] font-semibold whitespace-nowrap text-warning-ink">
                              aviso por e-mail não saiu
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 sm:px-5">
                          <StatusSelect
                            lead={lead}
                            saving={savingId === lead.id}
                            onChange={(next) => void onStatusChange(lead, next)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p aria-live="polite" className="sr-only">
                {savingId ? 'Salvando a situação do lead…' : ''}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
                <p className="text-[13px] text-ink-muted">
                  Página <span className="money font-bold text-ink">{page}</span> de{' '}
                  <span className="money">{totalPages}</span> · <span className="money">{formatNumber(total)}</span> no
                  total
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => updateParams({ page: String(page - 1) })}
                  >
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    disabled={page >= totalPages || loading}
                    onClick={() => updateParams({ page: String(page + 1) })}
                  >
                    Próxima
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default LeadsPage;
