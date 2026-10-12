/**
 * Receita da plataforma — a única tela onde MRR e caixa aparecem juntos.
 *
 * REGRA DE DINHEIRO, NÃO NEGOCIÁVEL (US-A-05):
 *
 *   MRR   = MENSAL EQUIVALENTE. O anual entra dividido por 12.
 *   Caixa = O VALOR DO CICLO QUE ENTROU (`Payment.amountCents`). O anual entra
 *           pelos 12 meses de uma vez.
 *
 * São duas colunas com significados diferentes e NUNCA se somam. Somar as duas
 * conta o mesmo dinheiro duas vezes; trocar uma pela outra é o defeito que fez
 * o admin exibir R$ 117 onde tinham entrado R$ 1.404 — o mesmo número, doze
 * vezes menor, sem nada na tela que denunciasse a diferença. O conserto que
 * pegou foi o RÓTULO: nenhum valor aqui aparece sem dizer qual dos dois é.
 *
 * Por isso os dois números ficam em cartões separados, com legenda própria, e
 * há um aviso explícito entre eles. Parece redundante para quem já sabe; é
 * exatamente para quem ainda não sabe que ele existe.
 *
 * ⚠️ UNIDADE — o que mudou aqui e por quê: o contrato provisório declarava
 * `annualMixPercent`/`churnPercent` em PONTOS PERCENTUAIS, e a tela imprimia o
 * número cru com um "%" ao lado. A API manda `yearlyMixRate` e `churn.rate` em
 * RAZÃO (0.7 = 70%). Com a formatação antiga, um mix anual de 70% — a meta da
 * estratégia, o número que autoriza gastar em mídia — apareceria como "0,7%", e
 * a leitura seria "o anual não vende". Agora tudo que é razão passa por
 * `formatPercent` (`format.ts`), que multiplica por 100 porque é isso que ele
 * espera receber.
 *
 * E `null` NÃO é zero: sem conta paga não existe mix, e "0%" seria uma
 * afirmação sobre um dado que ninguém tem.
 */
import { CalendarClock, Coins, Layers, Repeat, TrendingDown, Tv, Wallet } from 'lucide-react';

import type { RevenueOverview } from '../backoffice-types';
import { formatNumber, formatPercent } from '../format';
import { EmptyState, Money } from '../ui';

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** Razão 0–1 → "70%". `null` vira travessão, nunca "0%". */
const razao = (value: number | null): string => (value === null ? '-' : formatPercent(value));

/** Contagem média (telas por conta). `null` vira travessão pelo mesmo motivo. */
const media = (value: number | null): string => (value === null ? '-' : decimal.format(value));

/** Número pequeno com rótulo — o secundário do painel de receita. */
const MiniStat = ({
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
  <div className="rounded-xl border border-line bg-app/60 p-3.5">
    <div className="mb-2 flex items-center gap-2 text-ink-muted">
      <span aria-hidden="true" className="text-ink-subtle">
        {icon}
      </span>
      <span className="text-[12px] font-semibold">{label}</span>
    </div>
    <p className="money text-xl leading-none font-extrabold text-ink">{value}</p>
    {hint && <p className="mt-1.5 text-[11px] leading-snug text-ink-muted">{hint}</p>}
  </div>
);

const ReceitaPanel = ({
  revenue,
  periodLabel,
}: {
  revenue: RevenueOverview;
  /** "7 dias", "30 dias"… O caixa é do PERÍODO; o MRR não é. */
  periodLabel: string;
}) => {
  if (revenue.payingAccounts === 0 && revenue.cashInPeriodCents === 0) {
    return (
      <EmptyState
        icon={<Wallet aria-hidden="true" className="h-5 w-5" />}
        title="Nenhuma conta paga ainda"
        message="Assim que a primeira assinatura for confirmada, MRR, caixa e mix anual aparecem aqui. Até lá, os indicadores de tráfego já funcionam com visitas e leads."
      />
    );
  }

  const planos = revenue.payingByPlan.filter((plan) => plan.accounts > 0);
  const maiorPlano = Math.max(1, ...planos.map((plan) => plan.mrrCents));
  const caixaMensal = revenue.cashInPeriodByInterval.monthly;
  const caixaAnual = revenue.cashInPeriodByInterval.yearly;

  return (
    <div className="space-y-5">
      {/* As duas colunas de dinheiro, lado a lado e nomeadas sem ambiguidade. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="mb-3 flex items-center gap-2 text-ink-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-app text-ink-muted">
              <Repeat aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="text-[13px] font-semibold">MRR (mensal equivalente)</span>
          </div>
          <p className="money text-[30px] leading-none font-extrabold text-ink sm:text-[32px]">
            <Money cents={revenue.mrrCents} />
          </p>
          <p className="mt-2 text-xs leading-snug text-ink-muted">
            Receita recorrente por mês. Uma assinatura anual entra aqui por{' '}
            <strong className="text-ink">um doze avos</strong> do que foi cobrado. Não é caixa.
          </p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="mb-3 flex items-center gap-2 text-ink-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-app text-ink-muted">
              <Coins aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="text-[13px] font-semibold">Caixa no período</span>
          </div>
          <p className="money text-[30px] leading-none font-extrabold text-ink sm:text-[32px]">
            <Money cents={revenue.cashInPeriodCents} />
          </p>
          <p className="mt-2 text-xs leading-snug text-ink-muted">
            Dinheiro que <strong className="text-ink">entrou</strong> nos últimos {periodLabel}: soma
            dos pagamentos confirmados, pelo valor cheio do ciclo (no anual, os 12 meses).
          </p>
          {/*
            A quebra por periodicidade não é enfeite: é o que explica um caixa
            que salta num mês sem a base ter crescido. Um único pagamento anual
            move este número doze vezes mais que um mensal.
          */}
          <p className="mt-1.5 text-[11px] leading-snug text-ink-subtle">
            {formatNumber(caixaMensal.payments)} pagamento(s) mensal(is) ·{' '}
            <Money cents={caixaMensal.cashCents} />; {formatNumber(caixaAnual.payments)} anual(is) ·{' '}
            <Money cents={caixaAnual.cashCents} />
          </p>
        </div>
      </div>

      <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-[12px] leading-relaxed text-warning-ink">
        <strong>Os dois números acima nunca se somam.</strong> São recortes diferentes do mesmo
        dinheiro: o MRR é quanto vale um mês da base; o caixa é quanto entrou na conta no período.
        Somar conta a mesma venda duas vezes.
      </p>

      {/* Pagantes por plano — barra de MRR, sem biblioteca de gráfico. */}
      <div>
        <p className="eyebrow mb-2.5">
          Pagantes por plano · {formatNumber(revenue.payingAccounts)} contas
        </p>
        {planos.length === 0 ? (
          <p className="text-[13px] text-ink-muted">
            Nenhum plano pago com conta ativa. Entrou caixa no período, mas não há assinatura ativa.
            Vale conferir cancelamentos recentes em Clientes.
          </p>
        ) : (
          <ul className="space-y-3">
            {planos.map((plan) => (
              <li key={plan.planCode}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="truncate text-[13px] font-semibold text-ink">{plan.planName}</span>
                  <span className="shrink-0 text-[13px] text-ink-muted">
                    <span className="money font-bold text-ink">{formatNumber(plan.accounts)}</span>
                    <span className="ml-1 text-ink-subtle">contas</span>
                    {' · '}
                    <Money cents={plan.mrrCents} className="text-ink-muted" />
                    <span className="ml-1 text-ink-subtle">/mês equiv.</span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-app">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${plan.mrrCents === 0 ? 0 : Math.max(1.5, (plan.mrrCents / maiorPlano) * 100)}%`,
                    }}
                  />
                </div>
                {plan.yearlyAccounts > 0 && (
                  <p className="mt-1 text-[11px] text-ink-subtle">
                    {formatNumber(plan.yearlyAccounts)} no anual
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat
          icon={<Layers aria-hidden="true" className="h-4 w-4" />}
          label="Mix anual"
          value={razao(revenue.yearlyMixRate)}
          hint={
            revenue.yearlyMixRate === null
              ? 'Sem conta paga no período, então o mix ainda não existe. Não é 0%.'
              : 'Fatia das contas pagas no plano anual. É o anual que financia a mídia. Meta: 70% ou mais.'
          }
        />
        <MiniStat
          icon={<Tv aria-hidden="true" className="h-4 w-4" />}
          label="Telas por conta paga"
          value={media(revenue.screensPerPayingAccount.billed)}
          hint={
            <>
              Telas <strong className="text-ink">faturadas</strong> por conta (respeita o piso do
              plano). Vinculadas de fato: {media(revenue.screensPerPayingAccount.linked)}. A alavanca
              nº 1 do lucro. Meta: 1,8 ou mais.
            </>
          }
        />
        <MiniStat
          icon={<TrendingDown aria-hidden="true" className="h-4 w-4" />}
          label="Churn no período"
          value={razao(revenue.churn.rate)}
          hint={
            <>
              {formatNumber(revenue.churn.canceledInPeriod)} cancelada(s) sobre{' '}
              {formatNumber(revenue.churn.activeAtPeriodStart)} ativas no início.{' '}
              <strong className="text-ink">É estimativa</strong>: não há histórico de status no banco,
              serve para tendência, não para relatório contratual.
            </>
          }
        />
        <MiniStat
          icon={<CalendarClock aria-hidden="true" className="h-4 w-4" />}
          label={`Renovações em ${formatNumber(revenue.upcomingRenewals.horizonDays)} dias`}
          value={formatNumber(revenue.upcomingRenewals.count)}
          hint={
            <>
              {/*
                Os dois valores aparecem SEPARADOS e rotulados. Mostrar só o
                mensal equivalente faria a previsão de caixa do mês sair 12×
                menor numa base anual — a US-A-05 numa tela nova.
              */}
              <Money cents={revenue.upcomingRenewals.cashCents} /> em caixa a cobrar (valor cheio do
              ciclo) · <Money cents={revenue.upcomingRenewals.mrrCents} />/mês equivalente. São o
              mesmo dinheiro em duas leituras: não some.
            </>
          }
        />
      </div>
    </div>
  );
};

export default ReceitaPanel;
