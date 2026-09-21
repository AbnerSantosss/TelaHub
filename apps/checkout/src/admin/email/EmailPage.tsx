/**
 * E-mail do backoffice: automações, campanhas e histórico.
 *
 * A aba vive na URL (`?tab=automacoes|campanhas|historico`), pelo mesmo motivo
 * dos filtros de `SessionsPage`: recorte compartilhável por link e botão Voltar
 * que funciona. "O cliente diz que não recebeu o convite" vira um link direto
 * para `?tab=historico&status=failed`.
 *
 * Cada aba é um componente próprio, e não um `if` dentro de um componente só,
 * porque cada uma tem o seu `useAdminQuery`: montadas juntas, as três buscariam
 * dado que ninguém está olhando toda vez que a tela abre.
 *
 * ── Envelopes ────────────────────────────────────────────────────────────────
 * Todas as rotas de e-mail embrulham a resposta. O desembrulho mora em
 * `backoffice-api`; aqui só se lê o dado. O contrato antigo tratava o envelope
 * como se fosse o dado — `{ automations }` chegava onde a tela esperava um
 * array, `data.length` virava `undefined` e as duas listas caíam no estado
 * vazio. Tela vazia com dado no banco não parece defeito: parece base nova.
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Inbox,
  Megaphone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';

import { isApiError } from '../../lib/api';
import {
  fetchAutomations,
  fetchCampaigns,
  fetchClientes,
  fetchEmailMessage,
  fetchEmailMessages,
  fetchEmailQueueStatus,
  retryEmailMessage,
} from '../backoffice-api';
import type {
  AutomationState,
  AutomationsResponse,
  Campaign,
  CampaignStatus,
  ClientesResponse,
  EmailMessageDetail,
  EmailMessageRow,
  EmailMessagesResponse,
  EmailQueueStatus,
} from '../backoffice-types';
import { formatDateTime, formatNumber, formatRelative } from '../format';
import { useAdminQuery } from '../useAdminQuery';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  ForbiddenState,
  Loading,
  Modal,
  PageHeader,
  SkeletonRows,
  cx,
  inputClass,
} from '../ui';
import AutomacaoCard, { AUTOMATION_GROUPS, GROUP_BY_TRIGGER } from './AutomacaoCard';

// ─── Vocabulário compartilhado com o editor de campanha ──────────────────────

interface StatusMeta {
  label: string;
  className: string;
}

const NEUTRAL = 'border-line bg-app text-ink-muted';

const STATUS_VALUES = ['queued', 'sent', 'failed', 'bounced', 'suppressed'] as const;
const KIND_VALUES = ['transactional', 'automation', 'campaign'] as const;

type MessageStatusFilter = (typeof STATUS_VALUES)[number];
type MessageKindFilter = (typeof KIND_VALUES)[number];

/**
 * Rótulos: `Record` fechado para o COMPILADOR, `Map` para o RUNTIME.
 *
 * O `Record` obriga uma entrada por valor que o servidor conhece hoje — status
 * novo no vocabulário não compila até alguém decidir o rótulo. O `Map` existe
 * porque `status` e `kind` chegam do banco como TEXTO LIVRE: um valor legado, ou
 * gravado por um caminho que ninguém previu, tem que aparecer com o código cru,
 * que é a única pista de quem for investigar. Indexar o `Record` direto com uma
 * string devolveria `undefined` e a tela quebraria ao ler `.label`.
 */
const CAMPAIGN_STATUS_META: Record<CampaignStatus, StatusMeta> = {
  draft: { label: 'Rascunho', className: NEUTRAL },
  scheduled: { label: 'Agendada', className: 'border-info/25 bg-info/10 text-info-ink' },
  sending: { label: 'Enviando', className: 'border-warning/25 bg-warning/10 text-warning-ink' },
  sent: { label: 'Enviada', className: 'border-success/25 bg-success/10 text-success-ink' },
  canceled: { label: 'Cancelada', className: NEUTRAL },
};

const CAMPAIGN_STATUS = new Map<string, StatusMeta>(Object.entries(CAMPAIGN_STATUS_META));

export const campaignStatusMeta = (status: string): StatusMeta =>
  CAMPAIGN_STATUS.get(status) ?? { label: status || 'sem status', className: NEUTRAL };

const MESSAGE_STATUS_META: Record<MessageStatusFilter, StatusMeta> = {
  queued: { label: 'Na fila', className: 'border-accent/25 bg-accent/10 text-accent-ink' },
  sent: { label: 'Enviado', className: 'border-success/25 bg-success/10 text-success-ink' },
  failed: { label: 'Falhou', className: 'border-danger/25 bg-danger/10 text-danger-ink' },
  bounced: { label: 'Devolvido', className: 'border-danger/25 bg-danger/10 text-danger-ink' },
  // Suprimido não é falha: é o consentimento funcionando. Cinza, nunca vermelho.
  suppressed: { label: 'Suprimido', className: NEUTRAL },
};

const MESSAGE_STATUS = new Map<string, StatusMeta>(Object.entries(MESSAGE_STATUS_META));

const messageStatusMeta = (status: string): StatusMeta =>
  MESSAGE_STATUS.get(status) ?? { label: status || 'sem status', className: NEUTRAL };

const MESSAGE_KIND_META: Record<MessageKindFilter, string> = {
  transactional: 'Transacional',
  automation: 'Automação',
  campaign: 'Campanha',
};

const MESSAGE_KIND = new Map<string, string>(Object.entries(MESSAGE_KIND_META));

const messageKindLabel = (kind: string): string => MESSAGE_KIND.get(kind) ?? kind;

export const Pill = ({ label, className }: { label: string; className: string }) => (
  <span
    className={cx(
      'inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap',
      className
    )}
  >
    {label}
  </span>
);

const th = 'px-4 py-2.5 text-left text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase';

/**
 * "Nova campanha" navega, então é `<Link>` e não `<button>`: âncora dentro de
 * botão é HTML inválido e quebra o teclado. Repete o visual do `Button`
 * primário sem importar o componente para dentro de uma âncora.
 */
const linkButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-accent-strong px-3.5 py-2 ' +
  'text-sm font-semibold text-white transition-colors hover:bg-accent-strong-hover';

/** Mínimo do `reasonSchema` é 3; a tela pede 5 — motivo de uma letra não explica nada. */
const MIN_REASON = 5;

// ─── Aba: automações ─────────────────────────────────────────────────────────

const AutomacoesTab = () => {
  const [{ data, loading, error, forbidden }, reload, patch] = useAdminQuery<AutomationsResponse>(
    () => fetchAutomations(),
    []
  );

  /**
   * Organizações para a prévia do servidor.
   *
   * A prévia real precisa de uma organização com assinatura — é dela que saem
   * plano, vencimento e o valor do CICLO. Não há rota de "organizações para
   * escolher", então reaproveito a listagem de clientes e descarto quem não tem
   * assinatura: pedir a prévia dessas volta 400 ("organização sem assinatura
   * para servir de prévia"), e oferecer no seletor uma opção que sempre falha é
   * pior do que não oferecer.
   */
  const [organizations] = useAdminQuery<ClientesResponse>(
    () => fetchClientes({ view: 'all', pageSize: 100, sort: 'name', sortDir: 'asc' }),
    []
  );

  const [previewOrganizationId, setPreviewOrganizationId] = useState('');

  const previewOptions = (organizations.data?.organizations ?? []).filter(
    (row) => row.subscription !== null
  );
  const previewOrganizationName =
    previewOptions.find((row) => row.organization.id === previewOrganizationId)?.organization.name ??
    null;

  if (forbidden) return <ForbiddenState message={error} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <Loading label="Carregando os gatilhos…" />;
  if (!data || data.automations.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Zap aria-hidden="true" className="h-5 w-5" />}
          title="Nenhum gatilho configurado"
          message="Os nove gatilhos são semeados pelo próprio servidor na primeira listagem. Se a lista está vazia, a migração do backoffice ainda não rodou neste ambiente."
          action={
            <Button type="button" onClick={reload}>
              Recarregar
            </Button>
          }
        />
      </Card>
    );
  }

  const automations = data.automations;

  /**
   * `PUT /automations/:key` devolve a linha CRUA (sem `label`, `trigger` nem os
   * `default*` do catálogo). Por isso o estado novo é FUNDIDO sobre o item, e
   * não colocado no lugar dele: substituir apagaria o título do cartão
   * recém-salvo até alguém recarregar a página.
   */
  const onSaved = (updated: AutomationState) =>
    patch((current) => ({
      ...current,
      automations: current.automations.map((item) =>
        item.key === updated.key ? { ...item, ...updated } : item
      ),
    }));

  return (
    <div className="space-y-8">
      <Card
        title="Prévia com dados reais"
        description="A prévia de cada gatilho é renderizada pelo servidor com os dados desta organização."
      >
        <div className="space-y-2">
          <label
            htmlFor="previa-organizacao"
            className="mb-1.5 block text-[13px] font-semibold text-ink"
          >
            Organização de referência
          </label>
          <select
            id="previa-organizacao"
            value={previewOrganizationId}
            onChange={(event) => setPreviewOrganizationId(event.target.value)}
            className={inputClass}
          >
            <option value="">Escolha uma organização…</option>
            {previewOptions.map((row) => (
              <option key={row.organization.id} value={row.organization.id}>
                {row.organization.name}
              </option>
            ))}
          </select>
          <p className="text-xs leading-relaxed text-ink-subtle">
            Só aparecem organizações COM assinatura: a prévia usa plano, vencimento e o valor do
            ciclo, e sem assinatura o servidor recusa. O valor mostrado é o do ciclo inteiro (no
            anual, os doze meses de uma vez), que é o mesmo que o cliente vê na fatura.
          </p>
        </div>
      </Card>

      {AUTOMATION_GROUPS.map((group) => {
        const items = automations.filter(
          (item) => GROUP_BY_TRIGGER[item.trigger] === group.key
        );
        if (items.length === 0) return null;

        return (
          <section key={group.key} aria-labelledby={`grupo-${group.key}`}>
            <header className="mb-3">
              <h2 id={`grupo-${group.key}`} className="text-[15px] font-bold text-ink">
                {group.title}
              </h2>
              <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{group.description}</p>
              <p
                className={cx(
                  'mt-2 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed',
                  group.contractual
                    ? 'border-success/25 bg-success/5 text-ink-muted'
                    : 'border-line bg-app text-ink-muted'
                )}
              >
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" />
                <span>{group.basis}</span>
              </p>
            </header>

            <div className="space-y-4">
              {items.map((automation) => (
                <AutomacaoCard
                  key={automation.key}
                  automation={automation}
                  variables={data.variables}
                  previewOrganizationId={previewOrganizationId || null}
                  previewOrganizationName={previewOrganizationName}
                  onSaved={onSaved}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

// ─── Aba: campanhas ──────────────────────────────────────────────────────────

/**
 * Os quatro contadores aparecem sempre, inclusive zerados. "Suprimidos" some da
 * tela se só for mostrado quando maior que zero, e é justamente o número que
 * explica por que a campanha alcançou menos gente do que a base tem.
 */
const CampaignCounters = ({ campaign }: { campaign: Campaign }) => (
  <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
    {(
      [
        ['Na fila', campaign.queuedCount],
        ['Enviados', campaign.sentCount],
        ['Falhas', campaign.failedCount],
        ['Suprimidos', campaign.suppressedCount],
      ] as const
    ).map(([label, count]) => (
      <div key={label} className="flex items-baseline gap-1.5">
        <dt className="text-ink-subtle">{label}</dt>
        <dd className="money font-bold text-ink">{formatNumber(count)}</dd>
      </div>
    ))}
  </dl>
);

const CampanhasTab = () => {
  const [{ data, loading, error, forbidden }, reload] = useAdminQuery<Campaign[]>(
    () => fetchCampaigns(),
    []
  );

  if (forbidden) return <ForbiddenState message={error} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Campanha é comunicação de novidade e só vai para quem aceitou recebê-la. Vencimento e
          cobrança não passam por aqui, são automações.
        </p>
        <Link to="/admin/email/campanhas/novo" className={`${linkButtonClass} shrink-0`}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Nova campanha
        </Link>
      </div>

      <Card bodyClassName="px-0 py-0">
        {loading && !data ? (
          <SkeletonRows rows={4} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={<Megaphone aria-hidden="true" className="h-5 w-5" />}
            title="Nenhuma campanha ainda"
            message="Uma campanha começa como rascunho: você escreve, conta quantas pessoas vão receber, manda um teste para você mesmo e só então agenda ou dispara."
            action={
              <Link to="/admin/email/campanhas/novo" className={linkButtonClass}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Criar a primeira
              </Link>
            }
          />
        ) : (
          <ul>
            {data.map((campaign) => {
              const status = campaignStatusMeta(campaign.status);
              return (
                <li key={campaign.id} className="border-b border-line last:border-0">
                  <Link
                    to={`/admin/email/campanhas/${campaign.id}`}
                    className="block px-4 py-4 transition-colors hover:bg-app/60 sm:px-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold text-ink">{campaign.name}</p>
                        <p className="truncate text-[13px] text-ink-muted">{campaign.subject}</p>
                      </div>
                      <Pill label={status.label} className={status.className} />
                    </div>
                    <div className="mt-2.5">
                      <CampaignCounters campaign={campaign} />
                    </div>
                    <p className="mt-2 text-[12px] text-ink-subtle">
                      {campaign.sentAt
                        ? `Enviada em ${formatDateTime(campaign.sentAt)}`
                        : campaign.scheduledAt
                          ? `Agendada para ${formatDateTime(campaign.scheduledAt)}`
                          : `Criada ${formatRelative(campaign.createdAt)}`}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};

// ─── Aba: histórico ──────────────────────────────────────────────────────────

/**
 * Filtro só vale se estiver no vocabulário do servidor.
 *
 * `messagesQuerySchema` termina em `.catch(() => ({}))`: valor fora do enum não
 * volta 400, ele descarta o FILTRO INTEIRO e lista tudo. Uma URL adulterada
 * (`?status=erro`) mostraria a base inteira com o seletor dizendo "Falharam" —
 * então a checagem tem que ser feita aqui, antes de mandar.
 */
const isStatusFilter = (value: string): value is MessageStatusFilter =>
  STATUS_VALUES.some((option) => option === value);
const isKindFilter = (value: string): value is MessageKindFilter =>
  KIND_VALUES.some((option) => option === value);

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos os status' },
  { value: 'queued', label: 'Na fila' },
  { value: 'sent', label: 'Enviados' },
  { value: 'failed', label: 'Falharam' },
  { value: 'bounced', label: 'Devolvidos' },
  { value: 'suppressed', label: 'Suprimidos' },
];

const KIND_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos os tipos' },
  { value: 'transactional', label: 'Transacional (convite, senha, alerta)' },
  { value: 'automation', label: 'Automação (vencimento, cobrança)' },
  { value: 'campaign', label: 'Campanha' },
];

/**
 * A paginação é `limit`/`offset` — o servidor não conhece `page`.
 *
 * O contrato antigo mandava `page`, que `messagesQuerySchema` descartava em
 * silêncio: "Próxima" devolvia exatamente a mesma primeira página, e o rodapé
 * ainda dizia "Página 2 de 7".
 */
const PAGE_SIZE = 25;

/** Retrato da fila: separa "envio falhou" de "a fila inteira não anda". */
const FilaResumo = () => {
  const [{ data }] = useAdminQuery<EmailQueueStatus>(() => fetchEmailQueueStatus(), []);
  if (!data) return null;

  const parada = data.due > 0;

  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-3">
      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
        {(
          [
            ['Na fila', data.queued],
            ['Vencidos', data.due],
            ['Enviados', data.sent],
            ['Falhas', data.failed],
            ['Suprimidos', data.suppressed],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-ink-subtle">{label}</dt>
            <dd className="money font-bold text-ink">{formatNumber(value)}</dd>
          </div>
        ))}
      </dl>
      {parada && (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
          <strong className="text-ink">{formatNumber(data.due)}</strong> mensagens já passaram da
          hora de sair
          {data.oldestQueuedAt ? ` (a mais antiga espera desde ${formatDateTime(data.oldestQueuedAt)})` : ''}
          . Se esse número não cai, o problema é a fila (SMTP não configurado ou o job fora do ar),
          e não os endereços de destino. Sem provedor configurado a varredura nem começa, de
          propósito: as mensagens ficam guardadas em vez de queimarem as tentativas.
        </p>
      )}
    </div>
  );
};

const HistoricoTab = ({
  params,
  updateParams,
}: {
  params: URLSearchParams;
  updateParams: (changes: Record<string, string | undefined>) => void;
}) => {
  const status = params.get('status') ?? '';
  const kind = params.get('tipo') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const [retryTarget, setRetryTarget] = useState<EmailMessageRow | null>(null);
  const [retryReason, setRetryReason] = useState('');
  const [retrying, setRetrying] = useState(false);

  const [openMessage, setOpenMessage] = useState<EmailMessageDetail | null>(null);
  const [openingMessage, setOpeningMessage] = useState<string | null>(null);

  const [{ data, loading, error, forbidden }, reload] = useAdminQuery<EmailMessagesResponse>(
    () =>
      fetchEmailMessages({
        status: isStatusFilter(status) ? status : undefined,
        kind: isKindFilter(kind) ? kind : undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    [status, kind, page]
  );

  const onRetry = async () => {
    if (!retryTarget || retryReason.trim().length < MIN_REASON) return;
    setRetrying(true);
    try {
      await retryEmailMessage(retryTarget.id, { reason: retryReason.trim() });
      toast.success('E-mail recolocado na fila.', {
        description: `Nova tentativa para ${retryTarget.toEmail}. O envio é do job, não é instantâneo.`,
      });
      setRetryTarget(null);
      setRetryReason('');
      reload();
    } catch (retryError) {
      toast.error(
        isApiError(retryError) ? retryError.message : 'Não foi possível reenfileirar o e-mail.'
      );
    } finally {
      setRetrying(false);
    }
  };

  const onOpenMessage = async (row: EmailMessageRow) => {
    setOpeningMessage(row.id);
    try {
      setOpenMessage(await fetchEmailMessage(row.id));
    } catch (openError) {
      toast.error(
        isApiError(openError) ? openError.message : 'Não foi possível abrir a mensagem.'
      );
    } finally {
      setOpeningMessage(null);
    }
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!status || !!kind;

  if (forbidden) return <ForbiddenState message={error} />;

  const rows = data?.messages ?? [];

  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed text-ink-muted">
        Todo e-mail que a plataforma tenta enviar passa por aqui: convite de usuário, redefinição
        de senha, alerta de tela offline, automação e campanha. É onde se responde “o cliente diz
        que não recebeu”.
      </p>

      <FilaResumo />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="sm:w-56">
          <label
            htmlFor="historico-status"
            className="mb-1.5 block text-[13px] font-semibold text-ink"
          >
            Status do envio
          </label>
          <select
            id="historico-status"
            value={status}
            onChange={(event) => updateParams({ status: event.target.value || undefined })}
            className={inputClass}
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:w-80">
          <label htmlFor="historico-tipo" className="mb-1.5 block text-[13px] font-semibold text-ink">
            Tipo de e-mail
          </label>
          <select
            id="historico-tipo"
            value={kind}
            onChange={(event) => updateParams({ tipo: event.target.value || undefined })}
            className={inputClass}
          >
            {KIND_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <p aria-live="polite" className="text-[13px] text-ink-muted sm:mb-2.5">
          {loading && !data
            ? 'Carregando…'
            : `${formatNumber(total)} ${total === 1 ? 'mensagem' : 'mensagens'}`}
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <Card bodyClassName="px-0 py-0">
          {loading && !data ? (
            <SkeletonRows rows={6} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Inbox aria-hidden="true" className="h-5 w-5" />}
              title={hasFilters ? 'Nenhuma mensagem com esses filtros' : 'Nenhuma mensagem registrada'}
              message={
                hasFilters
                  ? 'Tente “Todos os status”. Um e-mail suprimido, por exemplo, não aparece na busca por falhas, porque são coisas diferentes.'
                  : 'Assim que a plataforma enfileirar o primeiro e-mail (convite, senha, alerta de tela offline), ele aparece aqui com o resultado do envio.'
              }
              action={
                hasFilters ? (
                  <Button
                    type="button"
                    onClick={() => updateParams({ status: undefined, tipo: undefined })}
                  >
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-sm">
                  <caption className="sr-only">
                    E-mails da plataforma, do mais recente para o mais antigo.
                  </caption>
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className={`${th} sm:px-5`}>
                        Destinatário
                      </th>
                      <th scope="col" className={th}>
                        Assunto
                      </th>
                      <th scope="col" className={th}>
                        Tipo
                      </th>
                      <th scope="col" className={th}>
                        Status
                      </th>
                      <th scope="col" className={th}>
                        Quando
                      </th>
                      <th scope="col" className={`${th} sm:px-5`}>
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const meta = messageStatusMeta(row.status);
                      const retryable = row.status === 'failed' || row.status === 'bounced';
                      return (
                        <tr key={row.id} className="border-b border-line last:border-0 hover:bg-app/60">
                          <th scope="row" className="max-w-[240px] px-4 py-3 text-left font-normal sm:px-5">
                            <p className="truncate text-[13px] font-bold text-ink">{row.toEmail}</p>
                            <p className="text-[12px] text-ink-subtle">
                              {row.attempts === 1 ? '1 tentativa' : `${row.attempts} tentativas`}
                              {row.nextAttemptAt && ` · volta ${formatRelative(row.nextAttemptAt)}`}
                            </p>
                          </th>
                          <td className="max-w-[260px] px-4 py-3">
                            <p className="truncate text-[13px] text-ink">{row.subject}</p>
                            {row.lastError && (
                              <p className="truncate text-[12px] text-danger-ink" title={row.lastError}>
                                {row.lastError}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-ink-muted">
                            {messageKindLabel(row.kind)}
                            {row.templateKey && (
                              <span className="block text-[12px] text-ink-subtle">{row.templateKey}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Pill label={meta.label} className={meta.className} />
                          </td>
                          <td className="px-4 py-3">
                            <p className="money text-[13px] whitespace-nowrap text-ink">
                              {formatDateTime(row.sentAt ?? row.createdAt)}
                            </p>
                            <p className="text-[12px] whitespace-nowrap text-ink-subtle">
                              {row.sentAt ? 'enviado' : 'criado'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right sm:px-5">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                className="px-2.5 py-1.5 text-[12px]"
                                loading={openingMessage === row.id}
                                onClick={() => onOpenMessage(row)}
                              >
                                <FileText aria-hidden="true" className="h-3.5 w-3.5" />
                                Ver corpo
                              </Button>
                              {retryable && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="px-2.5 py-1.5 text-[12px]"
                                  onClick={() => setRetryTarget(row)}
                                >
                                  <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                                  Reenviar
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: card por mensagem — a tabela de 6 colunas só existiria
                  dentro de um scroll lateral que esconde justamente o status. */}
              <ul className="md:hidden">
                {rows.map((row) => {
                  const meta = messageStatusMeta(row.status);
                  const retryable = row.status === 'failed' || row.status === 'bounced';
                  return (
                    <li key={row.id} className="border-b border-line p-4 last:border-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-ink">{row.toEmail}</p>
                          <p className="truncate text-[13px] text-ink-muted">{row.subject}</p>
                        </div>
                        <Pill label={meta.label} className={meta.className} />
                      </div>
                      <p className="mt-2 text-[12px] text-ink-subtle">
                        {messageKindLabel(row.kind)} · {formatDateTime(row.sentAt ?? row.createdAt)}
                      </p>
                      {row.lastError && (
                        <p className="mt-1 text-[12px] text-danger-ink">{row.lastError}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-2.5 py-1.5 text-[12px]"
                          loading={openingMessage === row.id}
                          onClick={() => onOpenMessage(row)}
                        >
                          <FileText aria-hidden="true" className="h-3.5 w-3.5" />
                          Ver corpo
                        </Button>
                        {retryable && (
                          <Button
                            type="button"
                            variant="secondary"
                            className="px-2.5 py-1.5 text-[12px]"
                            onClick={() => setRetryTarget(row)}
                          >
                            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                            Reenviar
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
                <p className="text-[13px] text-ink-muted">
                  Página <span className="money font-bold text-ink">{page}</span> de{' '}
                  <span className="money">{totalPages}</span>
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

      {retryTarget && (
        /* Reenviar EXIGE motivo (`retryMessageSchema`): o corpo vazio que a tela
           mandava voltava 400 em todo clique, e o botão nunca reenviou nada. O
           motivo vai para a trilha da ORGANIZAÇÃO destinatária — quem sofre o
           reenvio é o cliente. */
        <Modal
          title="Reenviar e-mail"
          description="A mensagem volta para a fila com as tentativas zeradas. Ela sai na próxima varredura, não na hora."
          onClose={() => setRetryTarget(null)}
          footer={
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRetryTarget(null)}
                disabled={retrying}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={retrying}
                disabled={retryReason.trim().length < MIN_REASON}
                onClick={onRetry}
              >
                Reenviar
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="rounded-lg border border-line bg-app px-3 py-3 text-[13px] leading-relaxed text-ink">
              Para <strong>{retryTarget.toEmail}</strong>: “{retryTarget.subject}”.
              {retryTarget.lastError && (
                <span className="mt-1 block text-[12px] text-danger-ink">
                  Última falha: {retryTarget.lastError}
                </span>
              )}
            </p>
            <Field
              label="Motivo do reenvio"
              htmlFor="reenvio-motivo"
              hint="Fica na trilha de auditoria do cliente. Corrija antes a causa da falha. Reenviar sem corrigir só repete o erro."
              error={
                retryReason.length > 0 && retryReason.trim().length < MIN_REASON
                  ? 'Escreva pelo menos 5 caracteres.'
                  : null
              }
            >
              <input
                id="reenvio-motivo"
                type="text"
                value={retryReason}
                onChange={(event) => setRetryReason(event.target.value)}
                placeholder="Ex.: SMTP reconfigurado, endereço confirmado com o cliente."
                className={inputClass}
              />
            </Field>
          </div>
        </Modal>
      )}

      {openMessage && (
        /* O corpo NÃO vem na listagem (até 200 linhas × 50 KB de HTML): quem
           quiser ler o que de fato saiu abre a mensagem. Vai num iframe
           `sandbox=""` pelo mesmo motivo das outras prévias — é HTML que saiu
           da plataforma, e injetá-lo na árvore do painel deixaria um `<style>`
           vazar para a interface inteira. */
        <Modal
          title="Mensagem enviada"
          description={`Para ${openMessage.toEmail} · ${messageKindLabel(openMessage.kind)}`}
          onClose={() => setOpenMessage(null)}
          footer={
            <Button type="button" variant="ghost" onClick={() => setOpenMessage(null)}>
              Fechar
            </Button>
          }
        >
          <div className="space-y-3">
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[12px]">
              <div>
                <dt className="text-ink-subtle">Assunto</dt>
                <dd className="font-semibold text-ink">{openMessage.subject}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle">Status</dt>
                <dd className="font-semibold text-ink">
                  {messageStatusMeta(openMessage.status).label}
                </dd>
              </div>
              <div>
                <dt className="text-ink-subtle">Tentativas</dt>
                <dd className="money font-semibold text-ink">{openMessage.attempts}</dd>
              </div>
            </dl>
            {openMessage.lastError && (
              <p className="text-[13px] text-danger-ink">{openMessage.lastError}</p>
            )}
            <div className="overflow-hidden rounded-lg border border-line">
              <iframe
                title="Corpo do e-mail enviado"
                srcDoc={openMessage.htmlBody}
                sandbox=""
                className="h-72 w-full bg-white"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── Página ──────────────────────────────────────────────────────────────────

const TABS = [
  { value: 'automacoes', label: 'Automações' },
  { value: 'campanhas', label: 'Campanhas' },
  { value: 'historico', label: 'Histórico' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

const isTab = (value: string | null): value is TabValue =>
  !!value && TABS.some((tab) => tab.value === value);

const EmailPage = () => {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: TabValue = isTab(tabParam) ? tabParam : 'automacoes';

  /** Muda um filtro preservando a aba e voltando para a página 1. */
  const updateParams = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: false });
  };

  /**
   * Trocar de aba limpa os filtros da anterior: `?tab=campanhas&status=failed`
   * carregaria um filtro que não existe ali e daria a impressão de lista vazia.
   */
  const selectTab = (value: TabValue) => {
    const next = new URLSearchParams();
    if (value !== 'automacoes') next.set('tab', value);
    setParams(next, { replace: false });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Backoffice"
        title="E-mail"
        subtitle="Gatilhos automáticos, campanhas e o registro de tudo que a plataforma tentou enviar."
      />

      <div role="tablist" aria-label="Seções de e-mail" className="flex flex-wrap gap-2">
        {TABS.map((option) => {
          const active = tab === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              id={`tab-${option.value}`}
              aria-selected={active}
              aria-controls={`painel-${option.value}`}
              onClick={() => selectTab(option.value)}
              className={cx(
                'rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors',
                active
                  ? 'border-nav bg-nav text-white'
                  : 'border-line bg-surface text-ink-muted hover:bg-app'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`painel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        tabIndex={-1}
        className="focus:outline-none"
      >
        {tab === 'automacoes' && <AutomacoesTab />}
        {tab === 'campanhas' && <CampanhasTab />}
        {tab === 'historico' && <HistoricoTab params={params} updateParams={updateParams} />}
      </div>
    </div>
  );
};

export default EmailPage;
