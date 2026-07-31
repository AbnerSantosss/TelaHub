/**
 * Início do painel — a leitura do funil no período.
 *
 * A distinção que essa tela não pode borrar: `funnel` conta quem ALCANÇOU cada
 * passo (histórico, pelos marcos) e `byStatus` conta onde a sessão ESTÁ agora.
 * São perguntas diferentes; num gráfico só, os números não fecham e o operador
 * perde confiança no painel. Por isso são dois blocos, cada um com o seu
 * subtítulo dizendo o que está contando.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  Hourglass,
  Megaphone,
  ShoppingCart,
  TrendingDown,
  Undo2,
  Wallet,
} from 'lucide-react';

import { fetchMetrics, getStoredUser } from './api';
import {
  STATUS_LABEL,
  STATUS_HINT,
  STEP_LABEL,
  firstName,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  greeting,
  isoDaysAgo,
} from './format';
import { CHECKOUT_STATUSES, type CheckoutMetrics, type CheckoutStatus } from './types';
import { useAdminQuery } from './useAdminQuery';
import {
  Card,
  EmptyState,
  ErrorState,
  ForbiddenState,
  Loading,
  Money,
  PageHeader,
  STATUS_STYLE,
  cx,
} from './ui';

const PERIODS = [
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
] as const;

/** KPI principal: número grande em mono, rótulo abaixo. */
const Kpi = ({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) => (
  <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
    <div className="mb-3 flex items-center gap-2 text-ink-muted">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-app text-ink-muted">{icon}</span>
      <span className="text-[13px] font-semibold">{label}</span>
    </div>
    <p className="money text-[30px] leading-none font-extrabold text-ink sm:text-[32px]">{value}</p>
    {hint && <p className="mt-2 text-xs leading-snug text-ink-muted">{hint}</p>}
  </div>
);

/**
 * Card de ação: mais apagado que o KPI e SEMPRE navegável — card que não navega
 * é enfeite (DESIGN.md). Leva à lista já filtrada pelo status correspondente.
 */
const ActionCard = ({
  to,
  icon,
  label,
  count,
  amountCents,
  tone,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  count: number;
  amountCents?: number;
  tone: CheckoutStatus;
}) => (
  <Link
    to={to}
    className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-app/60 px-4 py-3.5 transition-colors hover:border-ink-subtle/40 hover:bg-surface"
  >
    <div className="flex min-w-0 items-center gap-3">
      <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', STATUS_STYLE[tone].badge)}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-ink">{label}</p>
        {amountCents !== undefined && (
          <p className="text-xs text-ink-muted">
            <Money cents={amountCents} /> em jogo
          </p>
        )}
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-1.5">
      <span className="money text-xl font-extrabold text-ink">{formatNumber(count)}</span>
      <ArrowRight
        aria-hidden="true"
        className="h-4 w-4 text-ink-subtle transition-transform group-hover:translate-x-0.5"
      />
    </div>
  </Link>
);

const FunnelChart = ({ metrics }: { metrics: CheckoutMetrics }) => {
  const steps = [
    { key: 'viewed', label: 'Abriu o checkout', value: metrics.funnel.viewed, bar: 'bg-accent' },
    { key: 'planSelected', label: 'Escolheu o plano', value: metrics.funnel.planSelected, bar: 'bg-accent' },
    { key: 'identified', label: 'Se identificou', value: metrics.funnel.identified, bar: 'bg-accent' },
    { key: 'submitted', label: 'Finalizou o checkout', value: metrics.funnel.submitted, bar: 'bg-accent' },
    { key: 'paid', label: 'Contratou', value: metrics.funnel.paid, bar: 'bg-success' },
  ];

  const base = Math.max(1, metrics.funnel.viewed);

  return (
    <ul className="space-y-3.5">
      {steps.map((step, index) => {
        const previous = index === 0 ? null : steps[index - 1]!.value;
        const dropped = previous === null ? 0 : previous - step.value;
        const pct = Math.round((step.value / base) * 100);

        return (
          <li key={step.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-semibold text-ink">{step.label}</span>
              <span className="shrink-0 text-[13px] text-ink-muted">
                <span className="money font-bold text-ink">{formatNumber(step.value)}</span>
                <span className="money ml-1.5 text-ink-subtle">{pct}%</span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-app">
              <div
                className={cx('h-full rounded-full', step.bar)}
                style={{ width: `${Math.max(step.value === 0 ? 0 : 1.5, pct)}%` }}
              />
            </div>
            {previous !== null && dropped > 0 && (
              <p className="mt-1 text-[11px] font-medium text-ink-subtle">
                {formatNumber(dropped)} não chegaram até aqui
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
};

const DashboardPage = () => {
  const [days, setDays] = useState<number>(30);
  const [{ data, loading, error, forbidden }, reload] = useAdminQuery<CheckoutMetrics>(
    () => fetchMetrics({ startDate: isoDaysAgo(days) }),
    [days]
  );

  const user = getStoredUser();
  const periodLabel = PERIODS.find((period) => period.days === days)?.label ?? `${days} dias`;

  const header = (
    <PageHeader
      eyebrow="Funil de checkout"
      title={`${greeting()}, ${firstName(user?.name ?? user?.username)}.`}
      subtitle={
        data
          ? `Últimos ${periodLabel} · ${formatDate(data.period.startDate)} a ${formatDate(data.period.endDate)}`
          : `Últimos ${periodLabel}`
      }
      actions={
        <div
          role="group"
          aria-label="Período do relatório"
          className="flex rounded-lg border border-line bg-surface p-0.5"
        >
          {PERIODS.map((period) => (
            <button
              key={period.days}
              type="button"
              aria-pressed={days === period.days}
              onClick={() => setDays(period.days)}
              className={cx(
                'rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors',
                days === period.days ? 'bg-nav text-white' : 'text-ink-muted hover:text-ink'
              )}
            >
              {period.label}
            </button>
          ))}
        </div>
      }
    />
  );

  if (forbidden) {
    return (
      <div className="space-y-6">
        {header}
        <ForbiddenState message={error} />
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <Loading label="Calculando o funil…" />
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState
          message={error ?? 'O relatório do funil não veio como esperado.'}
          onRetry={reload}
        />
      </div>
    );
  }

  const utmRows = data.byUtmSource.filter((row) => row.total > 0).slice(0, 6);
  const hasRealUtm = utmRows.some((row) => row.value !== '(sem atribuição)');
  const abandonedSteps = data.abandonmentByStep.filter((row) => row.count > 0);
  const maxAbandon = Math.max(1, ...data.abandonmentByStep.map((row) => row.count));

  if (data.total === 0) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <EmptyState
            icon={<ShoppingCart aria-hidden="true" className="h-5 w-5" />}
            title="Nenhum checkout iniciado neste período"
            message={
              <>
                O funil começa a registrar assim que alguém abre o checkout. Divulgue o link de
                contratação com UTM (<span className="money">?utm_source=</span>) para que a origem
                apareça aqui — ou amplie o período acima, se a divulgação foi antes.
              </>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      {/* KPIs principais */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi
          icon={<ShoppingCart aria-hidden="true" className="h-4 w-4" />}
          label="Checkouts iniciados"
          value={formatNumber(data.total)}
          hint={`${formatPercent(data.abandonmentRate)} viraram abandono`}
        />
        <Kpi
          icon={<Wallet aria-hidden="true" className="h-4 w-4" />}
          label="Valor contratado"
          value={formatMoney(data.amounts.paidCents)}
          hint={
            <>
              mensal · <Money cents={data.amounts.pendingCents} /> aguardando pagamento
            </>
          }
        />
        <Kpi
          icon={<BadgeCheck aria-hidden="true" className="h-4 w-4" />}
          label="Contratações"
          value={formatNumber(data.funnel.paid)}
          hint={`${formatPercent(data.conversionRate)} de conversão sobre os iniciados`}
        />
      </div>

      {/* Cards de ação — cada um navega para a lista já filtrada. */}
      <Card
        title="O que fazer agora"
        description="Recortes acionáveis da situação atual. Cada card abre a lista já filtrada."
        bodyClassName="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <ActionCard
          to="/admin/sessions?status=abandoned"
          icon={<Undo2 aria-hidden="true" className="h-4 w-4" />}
          label="Checkouts para recuperar"
          count={data.byStatus.abandoned}
          amountCents={data.amounts.abandonedCents}
          tone="abandoned"
        />
        <ActionCard
          to="/admin/sessions?status=payment_pending"
          icon={<Hourglass aria-hidden="true" className="h-4 w-4" />}
          label="Aguardando pagamento"
          count={data.byStatus.payment_pending}
          amountCents={data.amounts.pendingCents}
          tone="payment_pending"
        />
        <ActionCard
          to="/admin/sessions?status=expired"
          icon={<Clock aria-hidden="true" className="h-4 w-4" />}
          label="Expirados"
          count={data.byStatus.expired}
          tone="expired"
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Funil por passo — leitura HISTÓRICA. */}
        <Card
          className="lg:col-span-2"
          title="Funil por passo"
          description="Quantas sessões alcançaram cada passo no período. É leitura histórica pelos marcos — uma sessão abandonada continua contada no passo que ela chegou."
        >
          <FunnelChart metrics={data} />
        </Card>

        {/* byStatus — leitura de AGORA. Deliberadamente separado do funil. */}
        <Card
          title="Situação atual"
          description="Onde cada sessão do período está agora. Some tudo e dá os checkouts iniciados."
          bodyClassName="px-2 py-2 sm:px-2"
        >
          <ul>
            {CHECKOUT_STATUSES.map((status) => (
              <li key={status}>
                <Link
                  to={`/admin/sessions?status=${status}`}
                  title={STATUS_HINT[status]}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-app"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className={cx('h-2 w-2 shrink-0 rounded-full', STATUS_STYLE[status].dot)}
                    />
                    <span className="truncate text-[13px] font-medium text-ink-muted">
                      {STATUS_LABEL[status]}
                    </span>
                  </span>
                  <span className="money shrink-0 text-sm font-bold text-ink">
                    {formatNumber(data.byStatus[status])}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Onde o abandono aconteceu */}
      <Card
        title="Onde as pessoas param"
        description="Passo em que estavam as sessões abandonadas. É o dado que diz o que consertar primeiro."
        actions={
          <Link
            to="/admin/sessions?status=abandoned"
            className="text-[13px] font-bold text-accent hover:underline"
          >
            Ver a lista
          </Link>
        }
      >
        {abandonedSteps.length === 0 ? (
          <EmptyState
            icon={<TrendingDown aria-hidden="true" className="h-5 w-5" />}
            title="Nenhum abandono registrado no período"
            message="Uma sessão só é marcada como abandonada depois de 30 minutos sem atividade. Se o período é recente, volte mais tarde."
          />
        ) : (
          <ul className="space-y-3.5">
            {data.abandonmentByStep.map((row) => (
              <li key={row.step}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-semibold text-ink">{STEP_LABEL[row.step]}</span>
                  <span className="shrink-0 text-[13px] text-ink-muted">
                    <span className="money font-bold text-ink">{formatNumber(row.count)}</span>
                    {row.amountCents > 0 && (
                      <>
                        {' · '}
                        <Money cents={row.amountCents} className="text-ink-muted" />
                      </>
                    )}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-app">
                  <div
                    className="h-full rounded-full bg-danger"
                    style={{ width: `${row.count === 0 ? 0 : Math.max(1.5, (row.count / maxAbandon) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Origem — só aparece quando há atribuição real para mostrar. */}
      {hasRealUtm && (
        <Card
          title="Origem do tráfego"
          description="Por utm_source, no período. Ordenado por checkouts iniciados."
          bodyClassName="px-0 py-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th scope="col" className="px-4 py-2.5 text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase sm:px-5">
                    Origem
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase">
                    Iniciados
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase">
                    Abandonados
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase">
                    Contratações
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase sm:px-5">
                    Valor contratado
                  </th>
                </tr>
              </thead>
              <tbody>
                {utmRows.map((row) => (
                  <tr key={row.value} className="border-b border-line last:border-0">
                    <th scope="row" className="max-w-[220px] truncate px-4 py-3 text-left text-[13px] font-semibold text-ink sm:px-5">
                      {row.value}
                    </th>
                    <td className="money px-4 py-3 text-right text-[13px] text-ink">{formatNumber(row.total)}</td>
                    <td className="money px-4 py-3 text-right text-[13px] text-ink-muted">
                      {formatNumber(row.abandoned)}
                    </td>
                    <td className="money px-4 py-3 text-right text-[13px] text-ink">{formatNumber(row.paid)}</td>
                    <td className="px-4 py-3 text-right text-[13px] font-semibold text-ink sm:px-5">
                      <Money cents={row.paidCents} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!hasRealUtm && (
        <Card title="Origem do tráfego">
          <EmptyState
            icon={<Megaphone aria-hidden="true" className="h-5 w-5" />}
            title="Nenhuma campanha identificada"
            message={
              <>
                Todos os checkouts do período chegaram sem UTM. Para saber o que traz contratação,
                divulgue o link com <span className="money">?utm_source=</span> e{' '}
                <span className="money">?utm_campaign=</span> — o checkout já grava esses parâmetros
                sozinho.
              </>
            }
          />
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;
