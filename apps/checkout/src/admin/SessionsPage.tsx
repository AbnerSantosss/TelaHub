/**
 * Lista de checkouts.
 *
 * Todo filtro vive na URL (`?status=&email=&dias=&page=`), não em estado local:
 * assim o card do Início consegue navegar "para a lista já filtrada", o operador
 * pode salvar/compartilhar o recorte e o botão Voltar funciona.
 *
 * No mobile a tabela vira lista de cards (ver comentário em `SessionCard`).
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, ShoppingCart, UserRoundPlus, X } from 'lucide-react';

import { fetchSessions } from './api';
import {
  STATUS_HINT,
  STATUS_LABEL,
  formatDateTime,
  formatNumber,
  formatRelative,
  isoDaysAgo,
  recoveryChannelLabel,
} from './format';
import RecoveryModal from './RecoveryModal';
import {
  CHECKOUT_STATUSES,
  type AdminCheckoutSession,
  type CheckoutStatus,
  type SessionsResponse,
} from './types';
import { useAdminQuery } from './useAdminQuery';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  ForbiddenState,
  Money,
  PageHeader,
  STATUS_STYLE,
  SkeletonRows,
  StatusBadge,
  cx,
  inputClass,
} from './ui';

const PAGE_SIZE = 25;

const PERIOD_OPTIONS = [
  { value: '', label: 'Qualquer período' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

const isStatus = (value: string | null): value is CheckoutStatus =>
  !!value && (CHECKOUT_STATUSES as readonly string[]).includes(value);

/** Identificação do lead em duas linhas. Anônimo é dito com palavras, não com "—". */
const LeadCell = ({ session }: { session: AdminCheckoutSession }) => {
  const name = session.name?.trim();
  return (
    <div className="min-w-0">
      <p className="truncate text-[13px] font-bold text-ink">
        {name || session.companyName?.trim() || 'Visitante anônimo'}
      </p>
      <p className="truncate text-[12px] text-ink-muted">
        {session.email ?? 'ainda não se identificou'}
      </p>
    </div>
  );
};

const PlanCell = ({ session }: { session: AdminCheckoutSession }) => (
  <div className="min-w-0">
    <p className="truncate text-[13px] font-medium text-ink">{session.planCode ?? 'Sem plano escolhido'}</p>
    <p className="text-[12px] text-ink-subtle">
      <span className="money">{session.screens}</span> {session.screens === 1 ? 'tela' : 'telas'}
    </p>
  </div>
);

const WhenCell = ({ session }: { session: AdminCheckoutSession }) => (
  <div>
    <p className="money text-[13px] whitespace-nowrap text-ink">{formatDateTime(session.lastSeenAt)}</p>
    <p className="text-[12px] whitespace-nowrap text-ink-subtle">{formatRelative(session.lastSeenAt)}</p>
  </div>
);

const RecoveryButton = ({
  session,
  onClick,
  full,
}: {
  session: AdminCheckoutSession;
  onClick: () => void;
  full?: boolean;
}) => (
  <Button
    type="button"
    variant="secondary"
    onClick={onClick}
    title={
      session.recoveryNotifiedAt
        ? `Contato já registrado em ${formatDateTime(session.recoveryNotifiedAt)} por ${recoveryChannelLabel(session.recoveryChannel)}`
        : 'Registrar que você entrou em contato (não envia mensagem)'
    }
    className={cx('px-2.5 py-1.5 text-[12px]', full && 'w-full')}
  >
    <UserRoundPlus aria-hidden="true" className="h-3.5 w-3.5" />
    {session.recoveryNotifiedAt ? 'Contato registrado' : 'Registrar contato'}
  </Button>
);

/**
 * Mobile: cada checkout é um card, não uma linha de tabela rolando na
 * horizontal. Com 360px de largura, uma tabela de 6 colunas só existe dentro de
 * um scroll lateral que esconde justamente o valor e o status — as duas colunas
 * que decidem se vale ligar para o lead. O card mantém tudo visível e o alvo de
 * toque cheio.
 */
const SessionCard = ({
  session,
  onRecovery,
}: {
  session: AdminCheckoutSession;
  onRecovery: () => void;
}) => (
  <li className="border-b border-line p-4 last:border-0">
    <div className="flex items-start justify-between gap-3">
      <Link to={`/admin/sessions/${session.id}`} className="min-w-0 flex-1">
        <LeadCell session={session} />
      </Link>
      <StatusBadge status={session.status} title={STATUS_HINT[session.status]} />
    </div>
    <div className="mt-3 flex items-end justify-between gap-3">
      <PlanCell session={session} />
      <Money cents={session.amountCents} className="text-[15px] font-bold text-ink" />
    </div>
    <p className="mt-2 text-[12px] text-ink-subtle">
      Última atividade {formatRelative(session.lastSeenAt)} ·{' '}
      <span className="money">{formatDateTime(session.lastSeenAt)}</span>
    </p>
    <div className="mt-3">
      <RecoveryButton session={session} onClick={onRecovery} full />
    </div>
  </li>
);

const th = 'px-4 py-2.5 text-left text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase';

const SessionsPage = () => {
  const [params, setParams] = useSearchParams();
  const [recoveryTarget, setRecoveryTarget] = useState<AdminCheckoutSession | null>(null);

  const status = isStatus(params.get('status')) ? (params.get('status') as CheckoutStatus) : undefined;
  const email = params.get('email') ?? '';
  const days = params.get('dias') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const [emailDraft, setEmailDraft] = useState(email);

  // A busca do topo escreve `?email=` direto na URL; o campo daqui tem de
  // acompanhar, senão os dois mostram coisas diferentes.
  useEffect(() => setEmailDraft(email), [email]);

  const startDate = useMemo(() => (days ? isoDaysAgo(Number(days)) : undefined), [days]);

  const [{ data, loading, error, forbidden }, reload, patch] = useAdminQuery<SessionsResponse>(
    () => fetchSessions({ page, pageSize: PAGE_SIZE, status, email: email || undefined, startDate }),
    [page, status, email, startDate]
  );

  /** Muda um filtro preservando os outros e voltando para a página 1. */
  const updateParams = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: false });
  };

  const onRegistered = (updated: AdminCheckoutSession) => {
    patch((current) => ({
      ...current,
      sessions: current.sessions.map((item) => (item.id === updated.id ? updated : item)),
    }));
  };

  const total = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;
  const hasFilters = !!status || !!email || !!days;

  const countLabel = loading && !data ? 'Carregando…' : `${formatNumber(total)} ${total === 1 ? 'checkout' : 'checkouts'}`;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Funil de checkout"
        title="Checkouts"
        subtitle={
          <>
            {countLabel}
            {status && ` · filtrando por ${STATUS_LABEL[status].toLowerCase()}`}
            {email && ` · e-mail contendo “${email}”`}
          </>
        }
      />

      {/* Chips de status — mesma cor semântica dos badges da tabela. */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por status">
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
        {CHECKOUT_STATUSES.map((option) => {
          const active = status === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              title={STATUS_HINT[option]}
              onClick={() => updateParams({ status: active ? undefined : option })}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors',
                active
                  ? STATUS_STYLE[option].chipActive
                  : 'border-line bg-surface text-ink-muted hover:bg-app'
              )}
            >
              <span aria-hidden="true" className={cx('h-1.5 w-1.5 rounded-full', STATUS_STYLE[option].dot)} />
              {STATUS_LABEL[option]}
            </button>
          );
        })}
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <form
          className="flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            updateParams({ email: emailDraft.trim() || undefined });
          }}
        >
          <label htmlFor="filter-email" className="mb-1.5 block text-[13px] font-semibold text-ink">
            Buscar por e-mail
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-subtle"
            />
            <input
              id="filter-email"
              type="search"
              value={emailDraft}
              onChange={(event) => setEmailDraft(event.target.value)}
              placeholder="Parte do e-mail do lead"
              className={`${inputClass} pl-9`}
            />
          </div>
        </form>

        <div className="sm:w-52">
          <label htmlFor="filter-period" className="mb-1.5 block text-[13px] font-semibold text-ink">
            Período de início
          </label>
          <select
            id="filter-period"
            value={days}
            onChange={(event) => updateParams({ dias: event.target.value || undefined })}
            className={inputClass}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            className="sm:mb-0.5"
            onClick={() => {
              setEmailDraft('');
              setParams(new URLSearchParams());
            }}
          >
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
          ) : !data || data.sessions.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart aria-hidden="true" className="h-5 w-5" />}
              title={hasFilters ? 'Nenhum checkout com esses filtros' : 'Nenhum checkout registrado'}
              message={
                hasFilters
                  ? 'Tente limpar o status ou ampliar o período — a busca por e-mail é parcial, mas depende de o lead já ter se identificado.'
                  : 'Assim que alguém abrir o link de contratação, o checkout aparece aqui — inclusive quem desistir no primeiro passo.'
              }
              action={
                hasFilters ? (
                  <Button
                    type="button"
                    onClick={() => {
                      setEmailDraft('');
                      setParams(new URLSearchParams());
                    }}
                  >
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Desktop: tabela */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] text-sm">
                  <caption className="sr-only">
                    Checkouts ordenados pela última atividade, do mais recente para o mais antigo.
                  </caption>
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className={`${th} sm:px-5`}>
                        Lead
                      </th>
                      <th scope="col" className={th}>
                        Plano
                      </th>
                      <th scope="col" className={`${th} text-right`}>
                        Valor mensal
                      </th>
                      <th scope="col" className={th}>
                        Última atividade
                      </th>
                      <th scope="col" className={th}>
                        Status
                      </th>
                      <th scope="col" className={`${th} sm:px-5`}>
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sessions.map((session) => (
                      <tr key={session.id} className="border-b border-line last:border-0 hover:bg-app/60">
                        <th scope="row" className="max-w-[260px] px-4 py-3 text-left font-normal sm:px-5">
                          <Link to={`/admin/sessions/${session.id}`} className="block">
                            <LeadCell session={session} />
                          </Link>
                        </th>
                        <td className="max-w-[180px] px-4 py-3">
                          <PlanCell session={session} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Money cents={session.amountCents} className="text-[13px] font-bold text-ink" />
                        </td>
                        <td className="px-4 py-3">
                          <WhenCell session={session} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={session.status} title={STATUS_HINT[session.status]} />
                        </td>
                        <td className="px-4 py-3 text-right sm:px-5">
                          <RecoveryButton session={session} onClick={() => setRecoveryTarget(session)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: lista de cards */}
              <ul className="md:hidden">
                {data.sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onRecovery={() => setRecoveryTarget(session)}
                  />
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
                <p className="text-[13px] text-ink-muted">
                  Página <span className="money font-bold text-ink">{data.pagination.page}</span> de{' '}
                  <span className="money">{totalPages}</span> ·{' '}
                  <span className="money">{formatNumber(total)}</span> no total
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

      {recoveryTarget && (
        <RecoveryModal
          session={recoveryTarget}
          onClose={() => setRecoveryTarget(null)}
          onRegistered={onRegistered}
        />
      )}
    </div>
  );
};

export default SessionsPage;
