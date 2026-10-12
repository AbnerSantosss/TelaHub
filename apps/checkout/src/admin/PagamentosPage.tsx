/**
 * Pagamentos e webhooks.
 *
 * As duas abas estão na mesma tela porque respondem à mesma pergunta em dois
 * níveis: "entrou dinheiro?" e, quando a resposta parece errada, "o aviso do
 * provedor chegou e foi processado?". Separá-las em páginas diferentes faria
 * alguém concluir que o pagamento não existiu, quando na verdade o webhook
 * falhou e está ali, com o erro na tela.
 *
 * ⚠️ DINHEIRO: `amountCents` do `Payment` JÁ É o caixa do ciclo. Não passe por
 * `formatCycleMoney` — ela multiplica o anual por 12 e existe para o funil, onde
 * o campo guarda o mensal equivalente. Somar esta coluna dá RECEITA RECEBIDA,
 * nunca MRR.
 *
 * ⚠️ O que o contrato provisório errava, e o servidor devolve de fato:
 *   • os envelopes são `{ payments, pagination }` e `{ events, pagination }` —
 *     não `{ rows, total, page, pageSize }`. Com o nome errado, `rows` chega
 *     `undefined`, a tela cai no vazio e diz "nenhum pagamento registrado" com
 *     o caixa do mês inteiro do outro lado do fio;
 *   • cada pagamento traz a organização ANINHADA (`organization.name`);
 *   • os status são enums FECHADOS e diferentes entre as abas. Pagamento é
 *     `pending|confirmed|refunded|failed|canceled` ("overdue", que este filtro
 *     oferecia, não existe) e webhook é `received|processed|ignored|failed`
 *     ("pending" não existe). Valor fora da lista não filtra nada: volta 400 e
 *     a aba inteira vira tela de erro.
 */
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, ExternalLink, Info, Wallet, Webhook } from 'lucide-react';

import { fetchPayments, fetchWebhookEvents } from './backoffice-api';
import type { Pagination, PaymentsResponse, WebhooksResponse } from './backoffice-types';
import { cycleMoneyCaption, formatDate, formatDateTime, formatMoney, formatNumber, isoDaysAgo } from './format';
import { PAYMENT_TONE, TONE } from './status';
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

// Mandado explicitamente nas duas abas: o servidor tem um padrão próprio, e o
// dia em que ele mudar as duas listas mudariam de tamanho sem ninguém pedir.
const PAGE_SIZE = 25;

// ─── Vocabulário de pagamento ────────────────────────────────────────────────
//
// Exportado porque o detalhe do cliente mostra a mesma lista de pagamentos. Dois
// dicionários para o mesmo `status` é como "confirmed" vira "Confirmado" numa
// tela e "confirmed" na outra, e ninguém sabe se são a mesma coisa.

const PAYMENT_LABEL: Record<string, string> = {
  paid: 'Pago',
  confirmed: 'Confirmado',
  received: 'Recebido',
  pending: 'Aguardando',
  overdue: 'Vencido',
  failed: 'Falhou',
  refunded: 'Estornado',
  canceled: 'Cancelado',
};

/** Rótulo aqui, cor no tom único de `./status`. */
const PAYMENT_STATUS: Record<string, { label: string; badge: string; dot: string }> = Object.fromEntries(
  Object.entries(PAYMENT_LABEL).map(([status, label]) => {
    const tone = TONE[PAYMENT_TONE[status] ?? 'neutral'];
    return [status, { label, badge: tone.badge, dot: tone.dot }];
  })
);

/**
 * Status desconhecido aparece com o código cru, e não some.
 *
 * O provedor pode criar um estado novo a qualquer momento; escondê-lo (ou
 * chamá-lo de "outro") faria uma linha de caixa desaparecer da conferência.
 */
export const PaymentStatusBadge = ({ status }: { status: string }) => {
  const style = PAYMENT_STATUS[status] ?? {
    label: status,
    badge: TONE.neutral.badge,
    dot: TONE.neutral.dot,
  };
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap',
        style.badge
      )}
    >
      <span aria-hidden="true" className={cx('h-1.5 w-1.5 rounded-full', style.dot)} />
      {style.label}
    </span>
  );
};

/** NFS-e ausente é dito com palavras: "—" seria lido como "já emitida". */
export function nfseStatusLabel(status: string | null): string {
  if (!status) return 'NFS-e não emitida';
  const map: Record<string, string> = {
    issued: 'NFS-e emitida',
    pending: 'NFS-e em processamento',
    error: 'NFS-e com erro',
    canceled: 'NFS-e cancelada',
  };
  return map[status] ?? `NFS-e: ${status}`;
}

/** Exatamente o enum de `listPaymentsQuerySchema`. Nem um valor a mais. */
const STATUS_OPTIONS: Array<{ value: '' | PaymentStatus; label: string }> = [
  { value: '', label: 'Qualquer situação' },
  { value: 'pending', label: 'Aguardando' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'refunded', label: 'Estornado' },
  { value: 'failed', label: 'Falhou' },
  { value: 'canceled', label: 'Cancelado' },
];

const isPaymentStatus = (value: string): value is PaymentStatus =>
  STATUS_OPTIONS.some((option) => option.value !== '' && option.value === value);

const PERIOD_OPTIONS = [
  { value: '', label: 'Qualquer período' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

/**
 * Exatamente o enum de `listWebhooksQuerySchema`.
 *
 * `ignored` no lugar do antigo "pending": um aviso que o gateway mandou e o
 * código decidiu não tratar não está "na fila", ele já terminou — e quem
 * procura um pagamento que não apareceu precisa justamente enxergar essa
 * diferença.
 */
const WEBHOOK_STATUS_OPTIONS: Array<{ value: '' | WebhookStatus; label: string }> = [
  { value: '', label: 'Todos os eventos' },
  { value: 'failed', label: 'Só os que falharam' },
  { value: 'processed', label: 'Processados' },
  { value: 'received', label: 'Recebidos, ainda não tratados' },
  { value: 'ignored', label: 'Ignorados pelo código' },
];

const isWebhookStatus = (value: string): value is WebhookStatus =>
  WEBHOOK_STATUS_OPTIONS.some((option) => option.value !== '' && option.value === value);

/** Rótulo do estado de um evento. Status desconhecido aparece com o código cru. */
const WEBHOOK_STATE_LABEL: Record<string, string> = {
  received: 'Recebido',
  processed: 'Processado',
  ignored: 'Ignorado',
  failed: 'Falhou',
};

const th = 'px-4 py-2.5 text-left text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase';

/** Os dois enums fechados do servidor, um por aba. Não se misturam. */
type PaymentStatus = 'pending' | 'confirmed' | 'refunded' | 'failed' | 'canceled';
type WebhookStatus = 'received' | 'processed' | 'ignored' | 'failed';

/**
 * Paginação a partir do envelope do servidor.
 *
 * `totalPages` vem calculado de lá: refazer a divisão aqui daria outro número
 * no dia em que o `pageSize` do servidor mudar, e o botão "Próxima" ficaria
 * apagado com páginas ainda por ver.
 */
const Paginacao = ({
  page,
  pagination,
  loading,
  onChange,
}: {
  page: number;
  pagination: Pagination | undefined;
  loading: boolean;
  onChange: (page: number) => void;
}) => {
  const total = pagination?.total ?? 0;
  const totalPages = pagination?.totalPages ?? 1;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
      <p className="text-[13px] text-ink-muted">
        Página <span className="money font-bold text-ink">{page}</span> de <span className="money">{totalPages}</span> ·{' '}
        <span className="money">{formatNumber(total)}</span> no total
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" disabled={page <= 1 || loading} onClick={() => onChange(page - 1)}>
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          Anterior
        </Button>
        <Button type="button" disabled={page >= totalPages || loading} onClick={() => onChange(page + 1)}>
          Próxima
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// ─── Aba: pagamentos ─────────────────────────────────────────────────────────

const PagamentosTab = ({
  status,
  dias,
  page,
  onParams,
}: {
  status: string;
  dias: string;
  page: number;
  onParams: (changes: Record<string, string | undefined>) => void;
}) => {
  const startDate = dias ? isoDaysAgo(Number(dias)) : undefined;

  // O status sai da URL como texto e só é enviado se for do enum do servidor:
  // um `?status=overdue` colado de um link antigo derrubaria a listagem com
  // 400 em vez de mostrar o caixa.
  const statusFilter = isPaymentStatus(status) ? status : undefined;

  const [{ data, loading, error, forbidden }, reload] = useAdminQuery<PaymentsResponse>(
    () => fetchPayments({ status: statusFilter, startDate, page, pageSize: PAGE_SIZE }),
    [statusFilter, startDate, page]
  );

  const rows = data?.payments ?? [];
  const hasFilters = !!status || !!dias;

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="sm:w-56">
          <label htmlFor="pag-status" className="mb-1.5 block text-[13px] font-semibold text-ink">
            Situação
          </label>
          <select
            id="pag-status"
            value={status}
            onChange={(event) => onParams({ status: event.target.value || undefined })}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:w-56">
          <label htmlFor="pag-periodo" className="mb-1.5 block text-[13px] font-semibold text-ink">
            Período
          </label>
          <select
            id="pag-periodo"
            value={dias}
            onChange={(event) => onParams({ dias: event.target.value || undefined })}
            className={inputClass}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
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
              icon={<Wallet aria-hidden="true" className="h-5 w-5" />}
              title={hasFilters ? 'Nenhum pagamento com esses filtros' : 'Nenhum pagamento registrado'}
              message={
                hasFilters
                  ? 'Amplie o período ou tire o filtro de situação. Pagamento por Pix manual só aparece depois de ser registrado no detalhe do cliente.'
                  : 'Toda cobrança confirmada, pelo gateway ou por Pix registrado à mão, entra nesta lista com o valor do ciclo.'
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <caption className="sr-only">Pagamentos da plataforma, do mais recente para o mais antigo.</caption>
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className={`${th} sm:px-5`}>
                        Cliente
                      </th>
                      <th scope="col" className={`${th} text-right`}>
                        Valor do ciclo
                      </th>
                      <th scope="col" className={th}>
                        Situação
                      </th>
                      <th scope="col" className={th}>
                        Forma
                      </th>
                      <th scope="col" className={th}>
                        Datas
                      </th>
                      <th scope="col" className={`${th} sm:px-5`}>
                        Fatura / NFS-e
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((payment) => (
                      <tr key={payment.id} className="border-b border-line last:border-0 hover:bg-app/60">
                        <th scope="row" className="max-w-[240px] px-4 py-3 text-left font-normal sm:px-5">
                          <Link
                            to={`/admin/clientes/${payment.organizationId}`}
                            className="truncate text-[13px] font-bold text-ink hover:underline"
                          >
                            {payment.organization.name || payment.organizationId}
                          </Link>
                          <p className="text-[12px] text-ink-subtle">
                            {formatNumber(payment.screens)} telas · {payment.provider}
                          </p>
                        </th>
                        <td className="px-4 py-3 text-right">
                          <p className="money text-[13px] font-bold text-ink">{formatMoney(payment.amountCents)}</p>
                          <p className="text-[12px] whitespace-nowrap text-ink-subtle">
                            {cycleMoneyCaption(payment.billingInterval)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <PaymentStatusBadge status={payment.status} />
                        </td>
                        <td className="px-4 py-3 text-[13px] text-ink-muted">{payment.method ?? '-'}</td>
                        <td className="px-4 py-3">
                          <p className="money text-[13px] whitespace-nowrap text-ink">
                            {payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.dueDate)}
                          </p>
                          <p className="text-[12px] whitespace-nowrap text-ink-subtle">
                            {payment.paidAt ? 'pago' : 'vencimento'}
                          </p>
                        </td>
                        <td className="px-4 py-3 sm:px-5">
                          {payment.invoiceUrl ? (
                            <a
                              href={payment.invoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:underline"
                            >
                              Fatura
                              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="text-[13px] text-ink-subtle">sem link</span>
                          )}
                          <p className="text-[12px] text-ink-subtle">{nfseStatusLabel(payment.nfseStatus)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginacao
                page={page}
                pagination={data?.pagination}
                loading={loading}
                onChange={(next) => onParams({ page: String(next) })}
              />
            </>
          )}
        </Card>
      )}
    </>
  );
};

// ─── Aba: webhooks ───────────────────────────────────────────────────────────

const WebhooksTab = ({
  status,
  page,
  onParams,
}: {
  status: string;
  page: number;
  onParams: (changes: Record<string, string | undefined>) => void;
}) => {
  const statusFilter = isWebhookStatus(status) ? status : undefined;

  const [{ data, loading, error, forbidden }, reload] = useAdminQuery<WebhooksResponse>(
    () => fetchWebhookEvents({ status: statusFilter, page, pageSize: PAGE_SIZE }),
    [statusFilter, page]
  );

  const rows = data?.events ?? [];

  /*
    O botão "Reprocessar" saiu daqui, e a razão é de tabela, não de gosto:
    `POST /admin/payments/events/:id/retry` reenfileira um `CheckoutEvent` (o
    outbox interno), não um `WebhookEvent`. Mandar para ele o id de um aviso do
    gateway devolve 404 "evento não encontrado" — sempre, para todos os eventos,
    inclusive os que falharam. Um botão que nunca funciona é pior do que nenhum:
    o operador clica, vê um erro genérico e conclui que o sistema está quebrado,
    em vez de ir olhar o painel do provedor, que é onde o reenvio do webhook
    realmente mora. (O corpo, aliás, também estava errado: aquela rota exige
    `reason`, e a tela mandava `{}` — 400 garantido.)
  */

  return (
    <>
      <div className="sm:w-56">
        <label htmlFor="hook-status" className="mb-1.5 block text-[13px] font-semibold text-ink">
          Situação do evento
        </label>
        <select
          id="hook-status"
          value={status}
          onChange={(event) => onParams({ status: event.target.value || undefined })}
          className={inputClass}
        >
          {WEBHOOK_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/*
        Esta aba DIAGNOSTICA; ela não conserta. Dizer isso em voz alta é o que
        evita o operador ficar recarregando a lista à espera de um botão que a
        API não oferece — o reenvio de um webhook mora no painel do provedor.
      */}
      <p className="flex items-start gap-2 rounded-lg border border-line bg-app px-3 py-2.5 text-[13px] leading-relaxed text-ink-muted">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" />
        <span>
          Esta lista mostra o que o provedor mandou e o que o código fez com isso. O reenvio de um aviso é feito{' '}
          <strong>no painel do provedor</strong>; se o dinheiro entrou e a conta não foi provisionada, o caminho aqui é
          registrar o pagamento no detalhe do cliente, que reativa a assinatura e deixa o caixa registrado.
        </span>
      </p>

      {forbidden ? (
        <ForbiddenState message={error} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <Card bodyClassName="px-0 py-0">
          {loading && !data ? (
            <SkeletonRows rows={5} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Webhook aria-hidden="true" className="h-5 w-5" />}
              title={status === 'failed' ? 'Nenhum webhook falhou' : 'Nenhum evento recebido'}
              message={
                status === 'failed'
                  ? 'Todo aviso do provedor foi processado. Se um pagamento não apareceu, o problema está antes, no provedor, e não aqui.'
                  : 'Assim que o provedor de pagamento avisar alguma coisa, o evento cru aparece aqui, com o erro quando houver.'
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <caption className="sr-only">Eventos de webhook recebidos dos provedores de pagamento.</caption>
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className={`${th} sm:px-5`}>
                        Evento
                      </th>
                      <th scope="col" className={th}>
                        Situação
                      </th>
                      <th scope="col" className={th}>
                        Recebido
                      </th>
                      <th scope="col" className={`${th} sm:px-5`}>
                        Erro
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((event) => {
                      // A situação vem do CAMPO `status`, não de `processedAt`.
                      // Um evento `ignored` tem `processedAt` nulo e não está
                      // "na fila": o código olhou e decidiu não tratar. Deduzir
                      // pela data punha esses eventos em amarelo para sempre, e
                      // quem procura um pagamento perdido perseguia uma fila que
                      // não existe.
                      const failed = event.status === 'failed' || !!event.error;
                      const label = WEBHOOK_STATE_LABEL[event.status] ?? event.status;
                      return (
                        <tr key={event.id} className="border-b border-line last:border-0 hover:bg-app/60">
                          <th scope="row" className="px-4 py-3 text-left font-normal sm:px-5">
                            <p className="text-[13px] font-bold text-ink">{event.eventType}</p>
                            <p className="text-[12px] text-ink-subtle">{event.provider}</p>
                          </th>
                          <td className="px-4 py-3">
                            <span
                              className={cx(
                                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap',
                                failed
                                  ? 'border-danger/25 bg-danger/10 text-danger-ink'
                                  : event.status === 'processed'
                                    ? 'border-success/25 bg-success/10 text-success-ink'
                                    : event.status === 'ignored'
                                      ? 'border-line bg-app text-ink-muted'
                                      : 'border-warning/25 bg-warning/10 text-warning-ink'
                              )}
                            >
                              {label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="money text-[13px] whitespace-nowrap text-ink">
                              {formatDateTime(event.receivedAt)}
                            </p>
                            <p className="text-[12px] whitespace-nowrap text-ink-subtle">
                              {event.processedAt ? `processado ${formatDateTime(event.processedAt)}` : 'não processado'}
                            </p>
                          </td>
                          <td className="max-w-[280px] px-4 py-3 sm:px-5">
                            {event.error ? (
                              <p className="flex items-start gap-1.5 text-[12px] leading-snug break-words text-danger-ink">
                                <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                {event.error}
                              </p>
                            ) : (
                              <span className="text-[13px] text-ink-subtle">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Paginacao
                page={page}
                pagination={data?.pagination}
                loading={loading}
                onChange={(next) => onParams({ page: String(next) })}
              />
            </>
          )}
        </Card>
      )}
    </>
  );
};

const PagamentosPage = () => {
  const [params, setParams] = useSearchParams();

  const aba = params.get('aba') === 'webhooks' ? 'webhooks' : 'pagamentos';
  const status = params.get('status') ?? '';
  const dias = params.get('dias') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const onParams = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: false });
  };

  // Trocar de aba zera os filtros: "failed" quer dizer coisas diferentes num
  // pagamento e num webhook, e carregar o filtro de uma aba para a outra
  // devolveria uma lista vazia que parece defeito.
  const abaHref = (target: 'pagamentos' | 'webhooks') =>
    target === 'pagamentos' ? '/admin/pagamentos' : '/admin/pagamentos?aba=webhooks';

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Backoffice"
        title="Pagamentos"
        subtitle={
          <span aria-live="polite">
            {aba === 'pagamentos'
              ? 'Caixa que entrou, sempre pelo valor do ciclo.'
              : 'Avisos crus dos provedores. É aqui que se descobre por que um pagamento não apareceu.'}
          </span>
        }
      />

      <nav aria-label="Abas de pagamentos" className="flex gap-2">
        {(
          [
            { value: 'pagamentos', label: 'Pagamentos' },
            { value: 'webhooks', label: 'Eventos de webhook' },
          ] as const
        ).map((item) => {
          const active = item.value === aba;
          return (
            <Link
              key={item.value}
              to={abaHref(item.value)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors',
                active ? 'border-nav bg-nav text-white' : 'border-line bg-surface text-ink-muted hover:bg-app'
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {aba === 'pagamentos' ? (
        <PagamentosTab status={status} dias={dias} page={page} onParams={onParams} />
      ) : (
        <WebhooksTab status={status} page={page} onParams={onParams} />
      )}
    </div>
  );
};

export default PagamentosPage;
