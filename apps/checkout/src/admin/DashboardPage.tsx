/**
 * Início do painel — a visão consolidada da plataforma no período.
 *
 * A tela cresceu do funil de checkout para quatro blocos, e a ordem é
 * deliberada: funil ponta a ponta (de onde vem gente), receita (o que isso
 * virou de dinheiro), indicadores da estratégia (se pode gastar mais ou tem de
 * cortar) e origem (qual campanha traz visita e qual traz pagante).
 *
 * A distinção que essa tela não pode borrar: `funnel` conta quem ALCANÇOU cada
 * passo (histórico, pelos marcos) e `byStatus` conta onde a sessão ESTÁ agora.
 * São perguntas diferentes; num gráfico só, os números não fecham e o operador
 * perde confiança no painel. Por isso são dois blocos, cada um com o seu
 * subtítulo dizendo o que está contando.
 *
 * Duas fontes de dado, de propósito: `fetchMetrics` (funil do checkout, o que
 * já existia) e `fetchOverview` (plataforma inteira: visitas, leads, receita,
 * coortes). Elas falham separado e se recarregam separado — se a rota nova cair,
 * o operador continua com o funil do checkout em vez de uma tela de erro
 * inteira. Sem biblioteca de gráfico em lugar nenhum: barra é `div` com
 * Tailwind, e isso é escolha, não limitação.
 *
 * ⚠️ O contrato desta tela foi reconciliado com o servidor. O que ela lia antes
 * (`overview.cohorts`, `overview.sources` como lista plana, indicadores em
 * snake_case, semáforo em inglês, taxa em pontos percentuais) nunca existiu na
 * API: o que existe é `overview.indicators.weeks`, `overview.sources.bySource`
 * / `.bySourceCampaign`, chaves em camelCase, semáforo em português e TAXA EM
 * RAZÃO (0.09 = 9%). A parte da unidade era a perigosa — ver `IndicadorCard`.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  Gauge,
  Hourglass,
  Megaphone,
  Plus,
  ShoppingCart,
  TrendingDown,
  Undo2,
  Wallet,
} from 'lucide-react';

import { fetchMetrics, getStoredUser } from './api';
import { fetchOverview } from './backoffice-api';
import type { IndicatorKey, PlatformOverview } from './backoffice-types';
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
  Button,
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
import AdSpendModal from './metricas/AdSpendModal';
import FunilCompleto from './metricas/FunilCompleto';
import IndicadorCard, { formatIndicatorValue, toneOf } from './metricas/IndicadorCard';
import ReceitaPanel from './metricas/ReceitaPanel';

const PERIODS = [
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
] as const;

/**
 * Indicadores que dependem de gasto informado — os únicos que oferecem o modal.
 *
 * As chaves são as do servidor, em camelCase. Com os nomes antigos
 * (`cost_per_conversation`, `cac_cash`) a lista nunca casava, e o cartão de CAC
 * ficava sem o botão que resolve o problema que ele mesmo denuncia.
 */
const DEPENDEM_DE_GASTO: ReadonlyArray<IndicatorKey> = ['costPerConversation', 'cacCash'];

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const semanaCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

/**
 * `weekStart` → "07/09" no fuso local.
 *
 * `new Date('2026-09-07')` é meia-noite UTC e no Brasil vira dia 06 — a semana
 * apareceria um dia adiantada para trás em toda a tela. Daí a montagem manual.
 */
function rotuloSemana(weekStart: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(weekStart ?? '');
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(weekStart);
  return Number.isNaN(date.getTime()) ? weekStart : semanaCurta.format(date);
}

/**
 * "07/09 a 13/09". O servidor manda `weekEnd` junto — usá-lo evita que a tela
 * recalcule o domingo e discorde do recorte que gerou os números.
 */
const rotuloIntervalo = (weekStart: string, weekEnd: string): string =>
  `${rotuloSemana(weekStart)} a ${rotuloSemana(weekEnd)}`;

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
          // "em jogo" sem qualificação lia-se como caixa. É a soma dos mensais
          // equivalentes: no anual, um doze avos do que estava em jogo.
          <p className="text-xs text-ink-muted">
            <Money cents={amountCents} />/mês equivalente em jogo
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

  // Segunda consulta, independente: plataforma inteira (visitas, leads, receita,
  // coortes, origem). Estado próprio para que uma falha aqui não apague o funil.
  const [overviewState, reloadOverview] = useAdminQuery<PlatformOverview>(
    () => fetchOverview({ startDate: isoDaysAgo(days) }),
    [days]
  );

  /** Semana da coorte escolhida. `null` = a mais recente que o servidor mandou. */
  const [semanaEscolhida, setSemanaEscolhida] = useState<string | null>(null);
  /** Semana cujo gasto está sendo informado. `null` = modal fechado. */
  const [gastoDaSemana, setGastoDaSemana] = useState<string | null>(null);
  /**
   * Origem colapsada (`bySource`) × quebra fina (`bySourceCampaign`).
   *
   * O servidor manda as DUAS listas prontas, e a escolha é do leitor: "esta
   * origem presta?" e "qual criativo desta origem presta?" são perguntas
   * diferentes. Somar as campanhas na mão para ver a origem dupla-contaria as
   * linhas sem campanha; escolher a lista certa não.
   */
  const [origemPorCampanha, setOrigemPorCampanha] = useState(false);

  const user = getStoredUser();
  const periodLabel = PERIODS.find((period) => period.days === days)?.label ?? `${days} dias`;

  const overview = overviewState.data;

  // Coortes da mais recente para a mais antiga. Ordenar aqui — e não confiar na
  // ordem que veio — é o que garante que "a semana atual" seja mesmo a atual.
  const coortes = [...(overview?.indicators.weeks ?? [])].sort((a, b) =>
    b.weekStart.localeCompare(a.weekStart)
  );
  const coorteAtiva = coortes.find((c) => c.weekStart === semanaEscolhida) ?? coortes[0] ?? null;

  const header = (
    <PageHeader
      eyebrow="Visão da plataforma"
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

  // Antes esta condição fazia a página inteira parar num estado vazio. Agora ela
  // só apaga os blocos DO CHECKOUT: MRR, caixa e renovações existem mesmo numa
  // semana em que ninguém abriu o checkout, e esconder receita porque o funil
  // está vazio seria trocar uma tela honesta por uma tela cega.
  const semCheckouts = data.total === 0;

  // Origem consolidada: ordena por visitas porque a pergunta do bloco é "esta
  // campanha traz gente?" — e a coluna de pagos, ao lado, responde a outra
  // metade: "traz gente que paga?".
  const sources = [...((origemPorCampanha ? overview?.sources.bySourceCampaign : overview?.sources.bySource) ?? [])]
    .filter((row) => row.visits > 0 || row.leads > 0 || row.paid > 0)
    .sort((a, b) => b.visits - a.visits || b.paid - a.paid)
    .slice(0, 10);

  /** Bloco do overview com os três estados que ele pode ter sozinho. */
  const overviewFallback = (label: string) => {
    if (overviewState.forbidden) return <ForbiddenState message={overviewState.error} />;
    if (overviewState.loading && !overview) return <Loading label={label} />;
    if (overviewState.error || !overview) {
      return (
        <ErrorState
          message={overviewState.error ?? 'As métricas da plataforma não vieram como esperado.'}
          onRetry={reloadOverview}
        />
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {header}

      {/* ── 1. Funil ponta a ponta ─────────────────────────────────────────── */}
      <Card
        title="Funil completo"
        description="Do site ao pagamento, tudo do mesmo banco. Visitas e leads são as duas pontas que o funil do checkout não enxergava."
      >
        {overviewFallback('Somando visitas, leads e pagamentos…') ?? (
          <FunilCompleto funnel={overview!.funnel} />
        )}
      </Card>

      {/* ── 2. Receita ─────────────────────────────────────────────────────── */}
      <Card
        title="Receita"
        description="MRR e caixa são colunas diferentes e nunca se somam. A legenda de cada uma diz qual é qual."
      >
        {overviewFallback('Consolidando receita…') ?? (
          <ReceitaPanel revenue={overview!.revenue} periodLabel={periodLabel} />
        )}
      </Card>

      {/* ── 3. Indicadores da estratégia, por coorte semanal ───────────────── */}
      <Card
        title="Indicadores da estratégia"
        description="Os 5 números que liberam ou cortam o gasto de mídia. Sempre por SEMANA, porque a média acumulada esconde a piora recente atrás de um bom começo."
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => setGastoDaSemana(coorteAtiva?.weekStart ?? new Date().toISOString())}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Informar gasto
          </Button>
        }
      >
        {overviewFallback('Calculando as coortes semanais…') ??
          (coortes.length === 0 || !coorteAtiva ? (
            <EmptyState
              icon={<Gauge aria-hidden="true" className="h-5 w-5" />}
              title="Nenhuma semana fechada no período"
              message="Os indicadores são calculados por coorte semanal. Escolha um período maior acima, ou volte quando a primeira semana tiver dados de visita, lead e gasto de mídia."
            />
          ) : (
            <div className="space-y-5">
              {/* Seletor de semana: escolher a coorte é o gesto central deste
                  bloco, então ele fica visível, e não escondido num menu. */}
              <div role="group" aria-label="Semana da coorte" className="flex flex-wrap gap-1.5">
                {coortes.map((coorte, index) => {
                  const ativa = coorte.weekStart === coorteAtiva.weekStart;
                  return (
                    <button
                      key={coorte.weekStart}
                      type="button"
                      aria-pressed={ativa}
                      onClick={() => setSemanaEscolhida(coorte.weekStart)}
                      className={cx(
                        'rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors',
                        ativa
                          ? 'border-nav bg-nav text-white'
                          : 'border-line bg-surface text-ink-muted hover:bg-app hover:text-ink'
                      )}
                    >
                      {rotuloSemana(coorte.weekStart)}
                      {index === 0 && (
                        <span className={cx('ml-1.5 font-normal', ativa ? 'text-white/70' : 'text-ink-subtle')}>
                          atual
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/*
                O que ALIMENTA os cinco indicadores da semana escolhida. Está
                aqui porque o número sozinho não se contesta: um CAC alto pode
                ser gasto alto ou venda de menos, e são conclusões opostas.

                `adSpendCents: null` NÃO vira "R$ 0,00" — vira o texto e o botão
                que resolvem. CAC zero se lê como campanha de graça, e é essa
                leitura que faz alguém aumentar orçamento na pior hora.
              */}
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-xl border border-line bg-app/60 p-3.5">
                  <dt className="text-[12px] font-semibold text-ink-muted">Gasto de mídia</dt>
                  {coorteAtiva.adSpendCents === null ? (
                    <>
                      <dd className="mt-1 text-[13px] leading-snug text-ink-muted">
                        sem gasto informado
                      </dd>
                      <button
                        type="button"
                        onClick={() => setGastoDaSemana(coorteAtiva.weekStart)}
                        className="mt-1.5 text-[12px] font-bold text-accent hover:underline"
                      >
                        Informar o gasto desta semana
                      </button>
                    </>
                  ) : (
                    <>
                      <dd className="money mt-1 text-xl leading-none font-extrabold text-ink">
                        {formatMoney(coorteAtiva.adSpendCents)}
                      </dd>
                      {coorteAtiva.adSpendByChannel.length > 0 && (
                        <p className="mt-1.5 text-[11px] leading-snug text-ink-subtle">
                          {coorteAtiva.adSpendByChannel
                            .map((canal) => `${canal.channel}: ${formatMoney(canal.amountCents)}`)
                            .join(' · ')}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="rounded-xl border border-line bg-app/60 p-3.5">
                  <dt className="text-[12px] font-semibold text-ink-muted">Conversas iniciadas</dt>
                  <dd className="money mt-1 text-xl leading-none font-extrabold text-ink">
                    {formatNumber(coorteAtiva.conversations)}
                  </dd>
                  <p className="mt-1.5 text-[11px] leading-snug text-ink-subtle">
                    Proxy declarado: leads da semana. Não há integração de WhatsApp neste produto.
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-app/60 p-3.5">
                  <dt className="text-[12px] font-semibold text-ink-muted">Vendas</dt>
                  <dd className="money mt-1 text-xl leading-none font-extrabold text-ink">
                    {formatNumber(coorteAtiva.sales)}
                  </dd>
                  <p className="mt-1.5 text-[11px] leading-snug text-ink-subtle">
                    {formatNumber(coorteAtiva.yearlySales)} no anual
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-app/60 p-3.5">
                  <dt className="text-[12px] font-semibold text-ink-muted">Caixa das vendas</dt>
                  <dd className="money mt-1 text-xl leading-none font-extrabold text-ink">
                    <Money cents={coorteAtiva.salesCashCents} />
                  </dd>
                  <p className="mt-1.5 text-[11px] leading-snug text-ink-subtle">
                    Valor cheio do ciclo (no anual, os 12 meses). Não é mensal equivalente.
                  </p>
                </div>
              </dl>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {coorteAtiva.indicators.map((indicator) => (
                  <IndicadorCard
                    key={indicator.key}
                    indicator={indicator}
                    weekLabel={rotuloIntervalo(coorteAtiva.weekStart, coorteAtiva.weekEnd)}
                    onInformarGasto={
                      indicator.value === null && DEPENDEM_DE_GASTO.includes(indicator.key)
                        ? () => setGastoDaSemana(coorteAtiva.weekStart)
                        : undefined
                    }
                  />
                ))}
              </div>

              {/*
                Histórico semana a semana. É aqui que "duas semanas seguidas no
                verde" (o gatilho de escala) e "dois indicadores no vermelho na
                mesma semana" (o de corte) ficam visíveis — nenhum dos dois se
                enxerga olhando só a semana atual. Rótulo textual junto do ponto
                colorido: a cor não pode ser o único sinal.
              */}
              {coortes.length > 1 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <caption className="sr-only">Indicadores por semana</caption>
                    <thead>
                      <tr className="border-b border-line text-left">
                        <th scope="col" className="py-2.5 pr-3 text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase">
                          Semana
                        </th>
                        {coorteAtiva.indicators.map((indicator) => (
                          <th
                            key={indicator.key}
                            scope="col"
                            className="px-2 py-2.5 text-right text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase"
                          >
                            {indicator.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {coortes.map((coorte) => (
                        <tr key={coorte.weekStart} className="border-b border-line last:border-0">
                          <th scope="row" className="py-2.5 pr-3 text-left text-[13px] font-semibold text-ink">
                            {rotuloSemana(coorte.weekStart)}
                          </th>
                          {coorte.indicators.map((indicator) => {
                            // `status` pode ser `null` (sem dado) — e `null` não
                            // é um quarto semáforo nem vira verde por omissão.
                            const tone = toneOf(indicator.status);
                            return (
                              <td key={indicator.key} className="px-2 py-2.5 text-right">
                                <span className="inline-flex items-center justify-end gap-1.5">
                                  <span aria-hidden="true" className={cx('h-1.5 w-1.5 rounded-full', tone.dot)} />
                                  <span className="money text-[13px] font-semibold text-ink">
                                    {formatIndicatorValue(indicator)}
                                  </span>
                                  <span className="text-[11px] text-ink-subtle">{tone.label}</span>
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
      </Card>

      {/* ── Blocos do checkout (o que o painel já fazia) ────────────────────── */}
      {semCheckouts ? (
        <Card>
          <EmptyState
            icon={<ShoppingCart aria-hidden="true" className="h-5 w-5" />}
            title="Nenhum checkout iniciado neste período"
            message={
              <>
                O funil do checkout começa a registrar assim que alguém abre a página de
                contratação. Divulgue o link com UTM (<span className="money">?utm_source=</span>)
                para que a origem apareça aqui, ou amplie o período acima se a divulgação foi
                antes. Receita e indicadores acima continuam valendo.
              </>
            }
          />
        </Card>
      ) : (
        <>
          {/* KPIs principais */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Kpi
              icon={<ShoppingCart aria-hidden="true" className="h-4 w-4" />}
              label="Checkouts iniciados"
              value={formatNumber(data.total)}
              hint={`${formatPercent(data.abandonmentRate)} viraram abandono`}
            />
            {/*
              US-A-05 no relatório: `amounts.paidCents` é a SOMA DOS MENSAIS
              EQUIVALENTES das sessões do período, e não o caixa. Uma contratação
              anual entra aqui pelo valor de UM mês — a mesma distorção da lista,
              só que agregada, onde é ainda mais difícil de perceber.

              Aqui não dá para consertar o número: a rota de métricas devolve um
              total só, sem separar mensal de anual, então multiplicar por 12 seria
              inventar caixa para quem contratou no mensal. O que dá para consertar
              é o RÓTULO — e é o que está feito. O caixa de verdade está no bloco
              de Receita acima, vindo de `Payment`.
            */}
            <Kpi
              icon={<Wallet aria-hidden="true" className="h-4 w-4" />}
              label="Contratado (mensal equivalente)"
              value={formatMoney(data.amounts.paidCents)}
              hint={
                <>
                  Soma dos valores por mês. Contratação anual entra pelo valor de um mês, não pelo
                  caixa do ano. <Money cents={data.amounts.pendingCents} /> aguardando pagamento.
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
              title="Funil por passo (checkout)"
              description="Quantas sessões alcançaram cada passo no período. É leitura histórica pelos marcos: uma sessão abandonada continua contada no passo a que chegou."
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
            description="Passo em que estavam as sessões abandonadas. É o dado que diz o que consertar primeiro. Os valores são mensais equivalentes (no anual, um doze avos do que ficou pelo caminho)."
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
        </>
      )}

      {/* ── 4. Origem: visita, lead e pagante lado a lado ───────────────────── */}
      <Card
        title="Origem: visita, lead e pagante"
        description="Por utm_source e utm_campaign, no período. Com as três colunas lado a lado dá para ver se a campanha traz só visita ou traz quem paga."
        actions={
          <div
            role="group"
            aria-label="Detalhe da origem"
            className="flex rounded-lg border border-line bg-surface p-0.5"
          >
            <button
              type="button"
              aria-pressed={!origemPorCampanha}
              onClick={() => setOrigemPorCampanha(false)}
              className={cx(
                'rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors',
                origemPorCampanha ? 'text-ink-muted hover:text-ink' : 'bg-nav text-white'
              )}
            >
              Por origem
            </button>
            <button
              type="button"
              aria-pressed={origemPorCampanha}
              onClick={() => setOrigemPorCampanha(true)}
              className={cx(
                'rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors',
                origemPorCampanha ? 'bg-nav text-white' : 'text-ink-muted hover:text-ink'
              )}
            >
              Por campanha
            </button>
          </div>
        }
        bodyClassName={sources.length > 0 ? 'px-0 py-0' : undefined}
      >
        {overviewFallback('Cruzando visitas, leads e pagamentos por origem…') ??
          (sources.length === 0 ? (
            <EmptyState
              icon={<Megaphone aria-hidden="true" className="h-5 w-5" />}
              title="Nenhuma origem com movimento no período"
              message={
                <>
                  Nenhuma visita, lead ou contratação chegou com UTM neste intervalo. Divulgue os
                  links com <span className="money">?utm_source=</span> e{' '}
                  <span className="money">?utm_campaign=</span>. O site e o checkout já gravam esses
                  parâmetros sozinhos.
                </>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <caption className="px-4 pt-3 pb-1 text-left text-[11px] leading-snug text-ink-subtle sm:px-5">
                  {/*
                    Caixa e mensal equivalente são as MESMAS vendas em duas
                    leituras — somar as duas colunas conta cada venda duas vezes,
                    e foi trocar uma pela outra que fez o painel exibir R$ 117
                    onde entraram R$ 1.404.
                  */}
                  Caixa e mensal equivalente são o mesmo dinheiro em duas leituras. Não some as duas
                  colunas.
                </caption>
                <thead>
                  <tr className="border-b border-line text-left">
                    <th scope="col" className="px-4 py-2.5 text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase sm:px-5">
                      Origem
                    </th>
                    {origemPorCampanha && (
                      <th scope="col" className="px-4 py-2.5 text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase">
                        Campanha
                      </th>
                    )}
                    <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase">
                      Visitas únicas
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase">
                      Leads
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase">
                      Pagantes
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase">
                      Caixa
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase">
                      Mensal equiv.
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase sm:px-5">
                      Visita → pagante
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((row) => (
                    <tr key={`${row.utmSource}·${row.utmCampaign}`} className="border-b border-line last:border-0">
                      <th scope="row" className="max-w-[180px] truncate px-4 py-3 text-left text-[13px] font-semibold text-ink sm:px-5">
                        {row.utmSource}
                      </th>
                      {origemPorCampanha && (
                        <td className="max-w-[200px] truncate px-4 py-3 text-[13px] text-ink-muted">
                          {row.utmCampaign}
                        </td>
                      )}
                      <td className="money px-4 py-3 text-right text-[13px] text-ink">
                        {formatNumber(row.uniqueVisits)}
                        {/* A página vista fica ao lado, menor: o denominador da
                            taxa é a visita ÚNICA — quem abre quatro páginas não
                            é quatro oportunidades. */}
                        <span className="ml-1.5 text-[11px] text-ink-subtle">
                          {formatNumber(row.visits)} views
                        </span>
                      </td>
                      <td className="money px-4 py-3 text-right text-[13px] text-ink">
                        {formatNumber(row.leads)}
                      </td>
                      <td className="money px-4 py-3 text-right text-[13px] font-semibold text-ink">
                        {formatNumber(row.paid)}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold text-ink">
                        <Money cents={row.paidCashCents} />
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] text-ink-muted">
                        <Money cents={row.paidMrrCents} className="text-ink-muted" />
                      </td>
                      <td className="money px-4 py-3 text-right text-[13px] text-ink-muted sm:px-5">
                        {/* Sem visita, a taxa não é 0% — ela não existe. Um zero
                            aqui faria a origem parecer ruim quando ela só não foi
                            medida (ex.: pagante que veio por indicação). */}
                        {row.uniqueVisits === 0
                          ? '-'
                          : `${decimal.format((row.paid / row.uniqueVisits) * 100)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </Card>

      {/*
        A tabela de origem do CHECKOUT continua aqui, separada de propósito: ela
        é por `utm_source` apenas, enquanto a de cima cruza visita, lead e
        pagante. Juntar as duas exigiria distribuir os checkouts de uma origem
        entre suas campanhas — o que dupla-contaria linha. Duas tabelas honestas
        valem mais que uma tabela que soma o que não é somável.
      */}
      {!semCheckouts && hasRealUtm && (
        <Card
          title="Checkout por origem (utm_source)"
          description="Iniciados, abandonos e contratações do checkout, por origem. Valores em mensal equivalente."
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
                    Contratado (mensal equiv.)
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

      {gastoDaSemana && (
        <AdSpendModal
          weekStart={gastoDaSemana}
          onClose={() => setGastoDaSemana(null)}
          // Recarrega só o overview: o funil do checkout não muda com o gasto,
          // e refetch desnecessário faz a tela piscar sem motivo.
          onSaved={reloadOverview}
        />
      )}
    </div>
  );
};

export default DashboardPage;
