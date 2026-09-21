/**
 * Lista de clientes — as sete visões de assinatura.
 *
 * O recorte vive na URL (`?view=&busca=&dias=&page=`) pelo mesmo motivo de
 * `SessionsPage`: a sidebar já linka `/admin/clientes?view=past_due`, e um
 * estado local faria o link do menu abrir a lista "Todos" com o item do menu
 * aceso — a pior combinação possível, porque o operador acredita estar olhando
 * inadimplentes e não está.
 *
 * As visões são LINKS, não botões de filtro: mudam a URL, são compartilháveis e
 * herdam `aria-current="page"` da mesma forma que a navegação do `AdminLayout`.
 *
 * ⚠️ DINHEIRO: `billing.cycleCents` JÁ É o caixa do ciclo (no anual, os 12
 * meses). Não passe por `formatCycleMoney` — essa função multiplica por 12 e
 * existe para o funil, onde o campo guarda o mensal equivalente. Aqui isso
 * mostraria R$ 16.848 onde entraram R$ 1.404, que é a US-A-05 ao contrário. O
 * vizinho dele, `billing.monthlyEquivalentCents`, é o MRR: mesmo dinheiro,
 * outro recorte, e a coluna diz qual dos dois está mostrando.
 *
 * ⚠️ FORMA DA LINHA: o servidor devolve `{ organization, subscription, screens,
 * billing, lastPayment, hasActiveOverride }` — aninhado, e com `subscription`
 * NULA para organização que nunca assinou (a visão "Todos" tem dessas). A tela
 * lia uma linha plana inventada antes do serviço; cada célula caía em
 * `undefined`, e `undefined` formatado como dinheiro vira "R$ 0,00" — que se lê
 * como cliente que não paga, e não como tela quebrada.
 *
 * ⚠️ CONTAGENS: não existe `counts` por visão no servidor, e nunca existiu.
 * `pagination.total` conta a visão CONSULTADA, então só a aba ativa mostra
 * número. Sete contadores exigiriam sete consultas que ninguém escreveu, e
 * inventá-los aqui (contando as linhas da página) daria "25" para toda visão
 * com mais de 25 clientes.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, Search, Sparkles, Users, X } from 'lucide-react';

import { fetchClientes } from '../backoffice-api';
import type {
  AdminOrganizationRow,
  ClienteView,
  ClientesResponse,
  SubscriptionStatus,
} from '../backoffice-types';
import {
  billingIntervalLabel,
  cycleMoneyCaption,
  formatDate,
  formatMoney,
  formatNumber,
  formatRelative,
} from '../format';
import { useAdminQuery } from '../useAdminQuery';
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
} from '../ui';

const PAGE_SIZE = 25;

// ─── Vocabulário compartilhado com a tela de detalhe ─────────────────────────
//
// Mora aqui, e não em `ui.tsx`, porque `ui.tsx` é território comum às telas do
// funil e este vocabulário é só de assinatura. Duas listas de rótulos para o
// mesmo `status` é como o painel passa a chamar a mesma conta de "inadimplente"
// num lugar e "vencida" noutro.

export const SUB_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: 'Em teste',
  active: 'Ativa',
  past_due: 'Inadimplente',
  canceled: 'Encerrada',
};

export const SUB_STATUS_HINT: Record<SubscriptionStatus, string> = {
  trialing: 'Período de teste. Ainda não houve cobrança.',
  active: 'Em dia. Renova no fim do ciclo.',
  past_due: 'Pagamento não confirmado. Ainda dentro da carência, dá para recuperar.',
  canceled: 'Sem acesso pago. Veja o motivo para saber se foi falta de pagamento ou pedido do cliente.',
};

/** Mesmos tokens semânticos dos badges do funil; texto escurecido para 4.5:1. */
const SUB_STATUS_STYLE: Record<SubscriptionStatus, { badge: string; dot: string }> = {
  trialing: { badge: 'border-info/25 bg-info/10 text-info-ink', dot: 'bg-info' },
  active: { badge: 'border-success/25 bg-success/10 text-success-ink', dot: 'bg-success' },
  // Amarelo, não vermelho: inadimplente é o estado ACIONÁVEL (ainda dá para
  // cobrar). O vermelho fica reservado para a carência que está acabando.
  past_due: { badge: 'border-warning/25 bg-warning/10 text-warning-ink', dot: 'bg-warning' },
  canceled: { badge: 'border-line bg-app text-ink-muted', dot: 'bg-ink-subtle' },
};

const NEUTRAL_BADGE = { badge: 'border-line bg-app text-ink-muted', dot: 'bg-ink-subtle' };

const isKnownStatus = (status: string): status is SubscriptionStatus => status in SUB_STATUS_LABEL;

/**
 * Rótulo, dica e cor de um status que chega como TEXTO do banco.
 *
 * Duas ausências têm significados diferentes e a tela não pode fundi-las:
 * `null` é organização SEM assinatura (existe, nunca contratou — a visão
 * "Todos" está cheia delas), e um status fora do vocabulário é dado novo ou
 * legado. O segundo aparece com o código cru, e não some nem vira "Encerrada":
 * uma conta escondida por causa de um status desconhecido é uma conta que
 * ninguém cobra.
 */
export function subStatusMeta(status: string | null): {
  label: string;
  hint: string;
  badge: string;
  dot: string;
} {
  if (!status) {
    return {
      label: 'Sem assinatura',
      hint: 'A organização existe, mas nunca teve assinatura. Nenhuma ação de cobrança se aplica a ela.',
      ...NEUTRAL_BADGE,
    };
  }
  if (isKnownStatus(status)) {
    return { label: SUB_STATUS_LABEL[status], hint: SUB_STATUS_HINT[status], ...SUB_STATUS_STYLE[status] };
  }
  return {
    label: status,
    hint: 'Status que o painel ainda não conhece. O código é o que veio do banco.',
    ...NEUTRAL_BADGE,
  };
}

export const SubscriptionBadge = ({ status, title }: { status: string | null; title?: string }) => {
  const meta = subStatusMeta(status);
  return (
    <span
      title={title ?? meta.hint}
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap',
        meta.badge
      )}
    >
      <span aria-hidden="true" className={cx('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
};

/**
 * Por que a conta foi encerrada.
 *
 * A distinção não é decorativa: "carência vencida" pede cobrança e um telefonema
 * de recuperação; "pedido do cliente" pede entender o que faltou no produto.
 * Tratar as duas como "cancelado" é o que faz alguém ligar oferecendo desconto
 * para quem já disse que quer sair — e não ligar para quem só esqueceu de pagar.
 */
export function cancelReasonLabel(reason: string | null): string | null {
  if (!reason) return null;
  // O cancelamento feito pelo backoffice grava `admin:<motivo digitado>` — o
  // prefixo é o que mantém a lista "não renovaram" limpa de encerramento pela
  // plataforma. Procurar a chave "admin" no mapa nunca acertaria: a chave real
  // carrega o texto do operador colado nela.
  if (reason.startsWith('admin:')) {
    const motivo = reason.slice('admin:'.length).trim();
    return motivo ? `Encerrada pelo administrador: ${motivo}` : 'Encerrada pelo administrador';
  }
  const map: Record<string, string> = {
    grace_expired: 'Carência vencida (falta de pagamento)',
    period_end_unpaid: 'Fim do ciclo sem pagamento',
    customer_request: 'Pedido do cliente',
    refund: 'Estorno confirmado pelo gateway',
  };
  // Quando a PESSOA cancela pelo painel, o campo guarda o texto livre que ela
  // escreveu. Devolvê-lo como veio é melhor do que traduzir: é a frase do
  // cliente, e vale mais para entender churn do que qualquer código.
  return map[reason] ?? reason;
}

/**
 * Encerramento por falta de pagamento.
 *
 * ⚠️ Cobre MAIS do que a visão "Não renovaram": o servidor monta aquela lista
 * só com `grace_expired` (`NOT_RENEWED_CANCEL_REASON`), porque em
 * `period_end_unpaid` a pessoa PEDIU para sair e o ciclo apenas terminou
 * depois. Aqui os dois pintam de vermelho — é rótulo de linha, não filtro —,
 * mas usar esta função para decidir quem entra na lista devolveria contas que a
 * consulta do servidor não traz, e as duas telas passariam a discordar.
 */
export const isUnpaidCancel = (reason: string | null): boolean =>
  reason === 'grace_expired' || reason === 'period_end_unpaid';

/**
 * Dias que faltam de carência, a partir do INSTANTE que o servidor manda.
 *
 * `graceDaysLeft` nunca existiu na API: o campo é `subscription.graceEndsAt`,
 * calculado por `graceEndsAt(pastDueSince)` (10 dias). A conta vive aqui porque
 * é a tela que precisa da unidade "dias" — e porque um número de dias congelado
 * no servidor envelheceria dentro da aba aberta a manhã inteira.
 *
 * `ceil` de propósito: faltando 12 horas ainda é "1 dia", e arredondar para
 * baixo mostraria "0 — carência encerrada" para quem ainda dá tempo de cobrar.
 */
export function graceDaysLeft(graceEndsAt: string | null, now: number = Date.now()): number | null {
  if (!graceEndsAt) return null;
  const end = new Date(graceEndsAt).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - now) / (24 * 60 * 60 * 1000));
}

/**
 * O texto da carência é a informação que decide a ação do dia: com 6 dias dá
 * para mandar e-mail e esperar; com 1 dia é telefonema hoje. Por isso vira
 * frase, e não um número solto que exigiria o operador saber de cor que a
 * carência é de 10 dias para interpretar.
 */
export function graceText(days: number | null): { text: string; urgent: boolean } | null {
  if (days === null || days === undefined) return null;
  if (days <= 0) return { text: 'Carência encerrada. A conta sai na próxima varredura', urgent: true };
  if (days === 1) return { text: 'Último dia de carência, encerra amanhã', urgent: true };
  if (days <= 3) return { text: `Faltam ${days} dias de carência`, urgent: true };
  return { text: `Faltam ${days} dias de carência`, urgent: false };
}

// ─── Visões ──────────────────────────────────────────────────────────────────

const VIEWS: Array<{ value: ClienteView; label: string; hint: string }> = [
  { value: 'all', label: 'Todos', hint: 'Toda organização cadastrada, paga ou não.' },
  { value: 'paying', label: 'Pagantes', hint: 'Assinatura ativa em plano pago.' },
  { value: 'expiring', label: 'Vencendo', hint: 'Ativas cujo ciclo termina no prazo escolhido.' },
  { value: 'past_due', label: 'Inadimplentes', hint: 'Pagamento não confirmado, ainda dentro da carência.' },
  {
    value: 'not_renewed',
    label: 'Não renovaram',
    hint: 'Encerradas por falta de pagamento, e não por pedido do cliente.',
  },
  {
    value: 'scheduled_cancel',
    label: 'Cancelamento agendado',
    hint: 'Ainda usam, mas já pediram para sair no fim do ciclo.',
  },
  { value: 'free', label: 'Grátis', hint: 'Plano de entrada, base de upgrade.' },
];

const isView = (value: string | null): value is ClienteView =>
  !!value && VIEWS.some((item) => item.value === value);

const EXPIRING_DAYS = [
  { value: '7', label: 'Vencem em 7 dias' },
  { value: '15', label: 'Vencem em 15 dias' },
  { value: '30', label: 'Vencem em 30 dias' },
];

// ─── Células ─────────────────────────────────────────────────────────────────

const OrgCell = ({ row }: { row: AdminOrganizationRow }) => (
  <div className="min-w-0">
    <p className="truncate text-[13px] font-bold text-ink">
      {row.organization.name || 'Organização sem nome'}
    </p>
    <p className="truncate text-[12px] text-ink-subtle">
      Cliente desde {formatDate(row.organization.createdAt)}
      {row.hasActiveOverride && (
        <span className="ml-1.5 inline-flex items-center gap-1 rounded border border-info/25 bg-info/10 px-1.5 py-px text-[11px] font-semibold text-info-ink">
          <Sparkles aria-hidden="true" className="h-3 w-3" />
          concessão manual
        </span>
      )}
    </p>
  </div>
);

const PlanCell = ({ row }: { row: AdminOrganizationRow }) => (
  <div className="min-w-0">
    <p className="truncate text-[13px] font-medium text-ink">
      {row.subscription ? row.subscription.plan.name || row.subscription.plan.code : 'Sem plano'}
    </p>
    <p className="text-[12px] text-ink-subtle">
      {row.subscription ? billingIntervalLabel(row.billing.interval) : 'nunca contratou'}
    </p>
  </div>
);

/**
 * Telas faturadas × em uso.
 *
 * As duas juntas porque a diferença é dinheiro: usar mais telas do que as
 * faturadas é receita não cobrada, e usar bem menos é o motivo de churn que só
 * aparece três meses depois. Um número só esconde os dois casos.
 */
const ScreensCell = ({ row }: { row: AdminOrganizationRow }) => {
  const over = row.screens.inUse > row.screens.billed;
  return (
    <div className="whitespace-nowrap">
      <p className="text-[13px] text-ink">
        <span className="money font-bold">{formatNumber(row.screens.billed)}</span> faturadas
      </p>
      <p className={cx('text-[12px]', over ? 'font-semibold text-warning-ink' : 'text-ink-subtle')}>
        <span className="money">{formatNumber(row.screens.inUse)}</span> em uso
        {over && ' (acima do faturado)'}
      </p>
    </div>
  );
};

/**
 * Caixa do ciclo, com a periodicidade colada, e o MRR embaixo com o nome dele.
 *
 * Os dois números são o MESMO dinheiro em recortes diferentes: no anual,
 * `cycleCents` é doze vezes `monthlyEquivalentCents`. Mostrar um sem dizer qual
 * é foi a US-A-05; somar os dois contaria a mesma venda duas vezes.
 */
const CycleAmountCell = ({ row, className }: { row: AdminOrganizationRow; className?: string }) => (
  <div className="min-w-0">
    <p className={cx('money font-bold text-ink', className ?? 'text-[13px]')}>
      {formatMoney(row.billing.cycleCents)}
    </p>
    <p className="text-[12px] whitespace-nowrap text-ink-subtle">{cycleMoneyCaption(row.billing.interval)}</p>
    {row.billing.interval === 'yearly' && (
      <p className="text-[12px] whitespace-nowrap text-ink-subtle">
        <span className="money">{formatMoney(row.billing.monthlyEquivalentCents)}</span>/mês equivalente
      </p>
    )}
  </div>
);

const DueCell = ({ row }: { row: AdminOrganizationRow }) => {
  const subscription = row.subscription;
  const grace = graceText(graceDaysLeft(subscription?.graceEndsAt ?? null));
  const reason = cancelReasonLabel(subscription?.cancelReason ?? null);

  if (!subscription) {
    return <p className="text-[13px] text-ink-subtle">sem assinatura</p>;
  }

  return (
    <div className="min-w-0">
      <p className="money text-[13px] whitespace-nowrap text-ink">{formatDate(subscription.currentPeriodEnd)}</p>
      {subscription.currentPeriodEnd && (
        <p className="text-[12px] whitespace-nowrap text-ink-subtle">
          {formatRelative(subscription.currentPeriodEnd)}
        </p>
      )}
      {grace && (
        <p
          className={cx(
            'mt-1 inline-flex items-center gap-1 rounded border px-1.5 py-px text-[11px] font-semibold',
            grace.urgent
              ? 'border-danger/30 bg-danger/10 text-danger-ink'
              : 'border-warning/30 bg-warning/10 text-warning-ink'
          )}
        >
          <AlertTriangle aria-hidden="true" className="h-3 w-3" />
          {grace.text}
        </p>
      )}
      {subscription.cancelAtPeriodEnd && (
        <p className="mt-1 text-[11px] font-semibold text-warning-ink">Sai no fim deste ciclo</p>
      )}
      {subscription.status === 'canceled' && reason && (
        <p
          className={cx(
            'mt-1 text-[11px] font-semibold',
            isUnpaidCancel(subscription.cancelReason) ? 'text-danger-ink' : 'text-ink-muted'
          )}
        >
          {reason}
        </p>
      )}
    </div>
  );
};

/**
 * Mobile: card por cliente. Uma tabela de 8 colunas em 360px vira scroll
 * lateral, e as duas colunas que somem primeiro são justamente vencimento e
 * valor — as que decidem para quem ligar hoje.
 */
const ClienteCard = ({ row }: { row: AdminOrganizationRow }) => (
  <li className="border-b border-line last:border-0">
    <Link to={`/admin/clientes/${row.organization.id}`} className="block p-4">
      <div className="flex items-start justify-between gap-3">
        <OrgCell row={row} />
        <SubscriptionBadge status={row.subscription?.status ?? null} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <PlanCell row={row} />
        <div className="shrink-0 text-right">
          <CycleAmountCell row={row} className="text-[15px]" />
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <DueCell row={row} />
        <div className="shrink-0 text-right">
          <ScreensCell row={row} />
        </div>
      </div>
    </Link>
  </li>
);

/**
 * Vazio diz o PRÓXIMO PASSO, nunca "nenhum resultado".
 *
 * Em três destas visões o vazio é boa notícia (ninguém inadimplente, ninguém
 * saindo) e a tela precisa dizer isso — um zero mudo parece defeito de carga, e
 * já levou gente a recarregar o painel achando que a lista não tinha vindo.
 */
const EMPTY_TITLE: Record<ClienteView, string> = {
  all: 'Nenhum cliente cadastrado ainda',
  paying: 'Nenhuma assinatura paga ativa',
  expiring: 'Nada vencendo nesse prazo',
  past_due: 'Ninguém inadimplente agora',
  not_renewed: 'Ninguém saiu por falta de pagamento',
  scheduled_cancel: 'Ninguém pediu para sair',
  free: 'Ninguém no plano grátis',
};

const EMPTY_MESSAGE: Record<ClienteView, string> = {
  all: 'Assim que a primeira contratação virar organização, ela aparece aqui. Enquanto isso, acompanhe o funil em Checkouts.',
  paying:
    'Nenhuma conta ativa em plano pago. Se você acabou de receber um Pix, abra o cliente e registre o pagamento manual. É isso que ativa a assinatura.',
  expiring:
    'Aumente o prazo para 30 dias ou volte a esta visão na semana que vem. É a lista de quem merece o e-mail de renovação ANTES do vencimento.',
  past_due:
    'Nenhuma cobrança falhou. Esta lista se enche sozinha quando um pagamento não é confirmado, já com os dias de carência restantes.',
  not_renewed:
    'Nenhuma conta encerrou por carência vencida. Quando encerrar, ela cai aqui com as telas ainda cadastradas, e reativar costuma bastar.',
  scheduled_cancel:
    'Ninguém com saída marcada para o fim do ciclo. Quando alguém pedir para sair, agende o cancelamento em vez de cancelar na hora.',
  free: 'Nenhuma conta no plano de entrada. É desta lista que saem os upgrades. Vale povoá-la antes de gastar em mídia.',
};

const EMPTY_WITH_SEARCH =
  'A busca cobre o nome da organização e o e-mail dos usuários dela. Confira a grafia, tente só um pedaço do nome, ou limpe a busca para ver a visão inteira.';

const th = 'px-4 py-2.5 text-left text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase';

const ClientesPage = () => {
  const [params, setParams] = useSearchParams();

  const view: ClienteView = isView(params.get('view')) ? (params.get('view') as ClienteView) : 'all';
  const busca = params.get('busca') ?? '';
  const dias = params.get('dias') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const [buscaDraft, setBuscaDraft] = useState(busca);

  // A URL muda por fora (link da sidebar, botão Voltar); o campo tem de
  // acompanhar, senão os dois mostram recortes diferentes ao mesmo tempo.
  useEffect(() => setBuscaDraft(busca), [busca]);

  const days = useMemo(() => (view === 'expiring' ? Number(dias) || 30 : undefined), [view, dias]);

  const [{ data, loading, error, forbidden }, reload] = useAdminQuery<ClientesResponse>(
    () => fetchClientes({ view, search: busca || undefined, days, page, pageSize: PAGE_SIZE }),
    [view, busca, days, page]
  );

  /** Link de uma visão preservando a busca e zerando a paginação. */
  const viewHref = (target: ClienteView) => {
    const next = new URLSearchParams();
    if (target !== 'all') next.set('view', target);
    if (busca) next.set('busca', busca);
    if (target === 'expiring' && dias) next.set('dias', dias);
    const qs = next.toString();
    return `/admin/clientes${qs ? `?${qs}` : ''}`;
  };

  const updateParams = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: false });
  };

  const total = data?.pagination.total ?? 0;
  // `totalPages` vem calculado do servidor — a mesma divisão feita aqui daria
  // outro número no dia em que o `pageSize` do servidor mudar sem a tela saber.
  const totalPages = data?.pagination.totalPages ?? 1;
  const rows = data?.organizations ?? [];
  const viewMeta = VIEWS.find((item) => item.value === view) ?? VIEWS[0];

  const countLabel =
    loading && !data ? 'Carregando…' : `${formatNumber(total)} ${total === 1 ? 'cliente' : 'clientes'}`;

  const clearAll = () => {
    setBuscaDraft('');
    setParams(new URLSearchParams());
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Backoffice"
        title="Clientes"
        subtitle={
          <span aria-live="polite">
            {countLabel} · {viewMeta.hint}
            {busca && ` · buscando por “${busca}”`}
          </span>
        }
      />

      {/* Abas das visões. São links (mudam a URL) para que o menu lateral, o
          botão Voltar e um link colado no WhatsApp levem todos ao mesmo recorte. */}
      <div className="-mx-1 overflow-x-auto pb-1">
        <nav aria-label="Visões da carteira" className="flex min-w-max gap-2 px-1">
          {VIEWS.map((item) => {
            const active = item.value === view;
            // Só a visão ATIVA ganha número, e ele é o total dela
            // (`pagination.total`). O servidor não devolve contagem das outras
            // seis; um número inventado ao lado de "Inadimplentes" é pior do que
            // nenhum, porque o operador decide a partir dele se abre a lista.
            const count = active && data ? data.pagination.total : undefined;
            return (
              <Link
                key={item.value}
                to={viewHref(item.value)}
                title={item.hint}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors',
                  active ? 'border-nav bg-nav text-white' : 'border-line bg-surface text-ink-muted hover:bg-app'
                )}
              >
                {item.label}
                {count !== undefined && (
                  <span
                    className={cx(
                      'money rounded-full px-1.5 text-[11px] font-bold',
                      active ? 'bg-white/20 text-white' : 'bg-app text-ink-subtle'
                    )}
                  >
                    {formatNumber(count)}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/*
        A visão "Não renovaram" precisa dizer o que ela é. Sem esta frase, a
        lista se confunde com "Cancelamento agendado" — e as duas pedem ações
        OPOSTAS: aqui a cobrança falhou (ligar, oferecer Pix, reativar); lá o
        cliente pediu para sair (entender o motivo, não insistir com desconto).
      */}
      {view === 'not_renewed' && (
        <p className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-[13px] leading-relaxed text-ink-muted">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <span>
            Estas contas foram encerradas <strong>por falta de pagamento</strong>, depois que a carência venceu.
            Ninguém aqui pediu para sair. Quem pediu está em{' '}
            <Link to={viewHref('scheduled_cancel')} className="font-semibold text-accent hover:underline">
              Cancelamento agendado
            </Link>
            . Reativar costuma bastar: as telas continuam cadastradas.
          </span>
        </p>
      )}

      {/* Barra de filtros */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <form
          className="flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            updateParams({ busca: buscaDraft.trim() || undefined });
          }}
        >
          <label htmlFor="filtro-cliente" className="mb-1.5 block text-[13px] font-semibold text-ink">
            Buscar cliente
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-subtle"
            />
            <input
              id="filtro-cliente"
              type="search"
              value={buscaDraft}
              onChange={(event) => setBuscaDraft(event.target.value)}
              placeholder="Nome da organização ou e-mail de um usuário"
              className={`${inputClass} pl-9`}
            />
          </div>
        </form>

        {/* O prazo só existe em "Vencendo": em qualquer outra visão seria um
            controle que não muda nada, e controle inerte ensina a ignorar a barra. */}
        {view === 'expiring' && (
          <div className="sm:w-56">
            <label htmlFor="filtro-dias" className="mb-1.5 block text-[13px] font-semibold text-ink">
              Prazo
            </label>
            <select
              id="filtro-dias"
              value={dias || '30'}
              onChange={(event) => updateParams({ dias: event.target.value })}
              className={inputClass}
            >
              {EXPIRING_DAYS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {(busca || view !== 'all' || dias) && (
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
              icon={<Users aria-hidden="true" className="h-5 w-5" />}
              title={EMPTY_TITLE[view]}
              message={busca ? EMPTY_WITH_SEARCH : EMPTY_MESSAGE[view]}
              action={
                busca || view !== 'all' ? (
                  <Button type="button" onClick={clearAll}>
                    Ver todos os clientes
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Desktop: tabela */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1040px] text-sm">
                  <caption className="sr-only">
                    Clientes da visão {viewMeta.label.toLowerCase()}. Cada linha abre o detalhe da organização.
                  </caption>
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className={`${th} sm:px-5`}>
                        Organização
                      </th>
                      <th scope="col" className={th}>
                        Plano
                      </th>
                      <th scope="col" className={th}>
                        Status
                      </th>
                      <th scope="col" className={th}>
                        Vencimento
                      </th>
                      <th scope="col" className={th}>
                        Telas
                      </th>
                      {/* "Valor" sem periodicidade é o que criou a US-A-05. O
                          cabeçalho diz CICLO porque a coluna é caixa, não MRR. */}
                      <th scope="col" className={`${th} text-right`}>
                        Valor do ciclo
                      </th>
                      <th scope="col" className={th}>
                        Último pagamento
                      </th>
                      <th scope="col" className={`${th} sm:px-5`}>
                        Origem
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.organization.id} className="border-b border-line last:border-0 hover:bg-app/60">
                        <th scope="row" className="max-w-[240px] px-4 py-3 text-left font-normal sm:px-5">
                          <Link to={`/admin/clientes/${row.organization.id}`} className="block">
                            <OrgCell row={row} />
                          </Link>
                        </th>
                        <td className="max-w-[170px] px-4 py-3">
                          <PlanCell row={row} />
                        </td>
                        <td className="px-4 py-3">
                          <SubscriptionBadge status={row.subscription?.status ?? null} />
                        </td>
                        <td className="px-4 py-3">
                          <DueCell row={row} />
                        </td>
                        <td className="px-4 py-3">
                          <ScreensCell row={row} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CycleAmountCell row={row} />
                        </td>
                        <td className="px-4 py-3">
                          {/* `lastPayment` é o pagamento CONFIRMADO inteiro, não
                              uma data solta: sem ele nunca entrou dinheiro
                              nesta conta. A data usada é `paidAt`, e não
                              `createdAt`, porque a coluna responde "quando o
                              dinheiro entrou". */}
                          <p className="money text-[13px] whitespace-nowrap text-ink">
                            {formatDate(row.lastPayment?.paidAt ?? null)}
                          </p>
                          <p className="text-[12px] whitespace-nowrap text-ink-subtle">
                            {row.lastPayment?.paidAt ? formatRelative(row.lastPayment.paidAt) : 'nunca pagou'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-ink-muted sm:px-5">
                          {row.organization.utmSource ?? (
                            <span className="text-ink-subtle">direto / sem UTM</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <ul className="md:hidden">
                {rows.map((row) => (
                  <ClienteCard key={row.organization.id} row={row} />
                ))}
              </ul>

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

export default ClientesPage;
