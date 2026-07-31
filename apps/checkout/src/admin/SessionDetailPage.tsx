/**
 * Detalhe de um checkout.
 *
 * A peça central é a linha do tempo de eventos: é ela que responde "o que a
 * pessoa fez antes de desistir". Os cards de lead/plano/atribuição existem para
 * dar o contexto de quem ligar e sobre o quê — nesta ordem, porque quem abre
 * esta tela normalmente já decidiu que vai fazer contato.
 */
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Building2,
  CircleDot,
  Clock,
  CreditCard,
  Eye,
  History,
  Mail,
  Megaphone,
  MonitorSmartphone,
  Phone,
  Send,
  Undo2,
  UserRound,
  UserRoundPlus,
} from 'lucide-react';

import { fetchSessionDetail } from './api';
import {
  STATUS_HINT,
  STEP_LABEL,
  eventLabel,
  formatDateTime,
  formatDocument,
  formatPhone,
  formatRelative,
  metadataLabel,
  metadataValue,
  parseMetadata,
  recoveryChannelLabel,
} from './format';
import RecoveryModal from './RecoveryModal';
import type { AdminCheckoutSession, CheckoutEventRow, SessionDetailResponse } from './types';
import { useAdminQuery } from './useAdminQuery';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  ForbiddenState,
  Loading,
  Money,
  NoSendingNotice,
  PageHeader,
  StatusBadge,
  cx,
} from './ui';

/** Linha rótulo/valor dos cards. Valor ausente é "—", nunca vazio silencioso. */
const Row = ({
  icon,
  label,
  value,
  mono,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="flex items-start justify-between gap-4 border-b border-line py-2.5 last:border-0">
    <span className="flex shrink-0 items-center gap-2 text-[13px] text-ink-muted">
      {icon}
      {label}
    </span>
    <span className={cx('min-w-0 text-right text-[13px] font-semibold break-words text-ink', mono && 'money')}>
      {value ?? '—'}
    </span>
  </div>
);

const empty = <span className="font-normal text-ink-subtle">—</span>;

const EVENT_ICON: Record<string, React.ReactNode> = {
  view: <Eye aria-hidden="true" className="h-3.5 w-3.5" />,
  plan_selected: <CircleDot aria-hidden="true" className="h-3.5 w-3.5" />,
  screens_changed: <MonitorSmartphone aria-hidden="true" className="h-3.5 w-3.5" />,
  identify: <UserRound aria-hidden="true" className="h-3.5 w-3.5" />,
  payment_selected: <CreditCard aria-hidden="true" className="h-3.5 w-3.5" />,
  submit: <Send aria-hidden="true" className="h-3.5 w-3.5" />,
  paid: <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />,
  abandoned: <Ban aria-hidden="true" className="h-3.5 w-3.5" />,
  recovered: <Undo2 aria-hidden="true" className="h-3.5 w-3.5" />,
  recovery_notified: <UserRoundPlus aria-hidden="true" className="h-3.5 w-3.5" />,
};

/** Cor do marcador na linha do tempo — mesma família semântica dos status. */
const EVENT_TONE: Record<string, string> = {
  paid: 'border-success/40 bg-success/10 text-[#166534]',
  submit: 'border-warning/40 bg-warning/10 text-[#92400E]',
  abandoned: 'border-danger/40 bg-danger/10 text-[#B91C1C]',
  identify: 'border-info/40 bg-info/10 text-[#6D28D9]',
  recovered: 'border-info/40 bg-info/10 text-[#6D28D9]',
  recovery_notified: 'border-accent/40 bg-accent/10 text-[#0369A1]',
};

const TimelineItem = ({ event, last }: { event: CheckoutEventRow; last: boolean }) => {
  const metadata = parseMetadata(event.metadata);
  const entries = metadata ? Object.entries(metadata).filter(([, value]) => value !== null && value !== '') : [];

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!last && <span aria-hidden="true" className="absolute top-7 bottom-0 left-[13px] w-px bg-line" />}
      <span
        aria-hidden="true"
        className={cx(
          'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-surface',
          EVENT_TONE[event.type] ?? 'border-line bg-app text-ink-subtle'
        )}
      >
        {EVENT_ICON[event.type] ?? <CircleDot aria-hidden="true" className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[13px] font-bold text-ink">{eventLabel(event.type)}</p>
        <p className="text-[12px] text-ink-subtle">
          <span className="money">{formatDateTime(event.createdAt)}</span> · {formatRelative(event.createdAt)}
        </p>
        {entries.length > 0 && (
          <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {entries.map(([key, value]) => (
              <div key={key} className="flex items-baseline gap-1.5">
                <dt className="text-[11px] font-semibold tracking-wide text-ink-subtle uppercase">
                  {metadataLabel(key)}
                </dt>
                <dd className="text-[12px] font-medium text-ink-muted">{metadataValue(key, value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </li>
  );
};

const AttributionCard = ({ session }: { session: AdminCheckoutSession }) => {
  const utms = [
    ['utm_source', session.utmSource],
    ['utm_medium', session.utmMedium],
    ['utm_campaign', session.utmCampaign],
    ['utm_content', session.utmContent],
    ['utm_term', session.utmTerm],
  ] as const;

  const hasAny = utms.some(([, value]) => !!value) || !!session.referrer;

  return (
    <Card title="Atribuição" description="De onde este checkout veio.">
      {hasAny ? (
        <div>
          {utms.map(([label, value]) => (
            <Row key={label} label={label} value={value ?? empty} mono={!!value} />
          ))}
          <Row
            label="Referrer"
            value={
              session.referrer ? <span className="break-all">{session.referrer}</span> : empty
            }
          />
          <Row
            label="Navegador"
            value={
              session.userAgent ? (
                <span className="line-clamp-2 break-all text-[12px] font-normal text-ink-muted">
                  {session.userAgent}
                </span>
              ) : (
                empty
              )
            }
          />
        </div>
      ) : (
        <EmptyState
          icon={<Megaphone aria-hidden="true" className="h-5 w-5" />}
          title="Sem atribuição registrada"
          message="Chegou sem UTM e sem referrer — acesso direto, link salvo ou origem que não repassa referência. Para rastrear, divulgue o link com utm_source."
        />
      )}
    </Card>
  );
};

const SessionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  const [{ data, loading, error, forbidden }, reload, patch] = useAdminQuery<SessionDetailResponse>(
    () => fetchSessionDetail(id ?? ''),
    [id]
  );

  const back = (
    <Link
      to="/admin/sessions"
      className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted transition-colors hover:text-ink"
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      Todos os checkouts
    </Link>
  );

  if (forbidden) {
    return (
      <div>
        {back}
        <ForbiddenState message={error} />
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div>
        {back}
        <Card>
          <Loading label="Carregando o checkout…" />
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        {back}
        <ErrorState
          title="Não foi possível abrir este checkout"
          message={error ?? 'O checkout não foi encontrado. Ele pode ter sido removido pela purga de dados vencidos.'}
          onRetry={reload}
        />
      </div>
    );
  }

  const { session, step, events } = data;
  const leadName = session.name?.trim() || session.companyName?.trim() || 'Visitante anônimo';

  return (
    <div>
      {back}

      <PageHeader
        eyebrow="Checkout"
        title={leadName}
        subtitle={
          <>
            Iniciado em <span className="money">{formatDateTime(session.startedAt)}</span> ·{' '}
            {formatRelative(session.startedAt)}
          </>
        }
        actions={
          <>
            <StatusBadge status={session.status} title={STATUS_HINT[session.status]} />
            <Button type="button" variant="primary" onClick={() => setRecoveryOpen(true)}>
              <UserRoundPlus aria-hidden="true" className="h-4 w-4" />
              Registrar contato
            </Button>
          </>
        }
      />

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card title="Lead" description="Só o que a própria pessoa digitou no checkout.">
            <Row
              icon={<UserRound aria-hidden="true" className="h-3.5 w-3.5" />}
              label="Nome"
              value={session.name ?? <span className="font-normal text-ink-subtle">não se identificou</span>}
            />
            <Row
              icon={<Mail aria-hidden="true" className="h-3.5 w-3.5" />}
              label="E-mail"
              value={
                session.email ? (
                  <a href={`mailto:${session.email}`} className="text-accent hover:underline">
                    {session.email}
                  </a>
                ) : (
                  empty
                )
              }
            />
            <Row
              icon={<Phone aria-hidden="true" className="h-3.5 w-3.5" />}
              label="WhatsApp / telefone"
              value={formatPhone(session.phone) ?? empty}
              mono={!!session.phone}
            />
            <Row
              label="CPF / CNPJ"
              value={formatDocument(session.document) ?? empty}
              mono={!!session.document}
            />
            <Row
              icon={<Building2 aria-hidden="true" className="h-3.5 w-3.5" />}
              label="Empresa"
              value={session.companyName ?? empty}
            />
          </Card>

          <Card title="Plano e valor" description="Recalculado pelo servidor a cada passo, pelo catálogo vigente.">
            <Row label="Plano" value={session.planCode ?? <span className="font-normal text-ink-subtle">não escolheu</span>} />
            <Row label="Telas" value={session.screens} mono />
            <Row
              label="Valor mensal"
              value={<Money cents={session.amountCents} className="text-[15px] font-extrabold" />}
            />
            <Row label="Passo alcançado" value={STEP_LABEL[step]} />
            <Row
              label="Token público"
              value={<span className="break-all text-[12px] font-normal">{session.publicToken}</span>}
              mono
            />
          </Card>

          <AttributionCard session={session} />
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card
            title="Recuperação"
            description="Contato feito pela equipe — registro manual."
          >
            {session.recoveryNotifiedAt ? (
              <>
                <Row label="Último contato" value={formatDateTime(session.recoveryNotifiedAt)} mono />
                <Row label="Canal" value={recoveryChannelLabel(session.recoveryChannel)} />
                <Row label="Quando" value={formatRelative(session.recoveryNotifiedAt)} />
              </>
            ) : (
              <p className="text-[13px] leading-relaxed text-ink-muted">
                Nenhum contato registrado para este checkout.
              </p>
            )}
            <NoSendingNotice className="mt-3" />
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRecoveryOpen(true)}
              className="mt-3 w-full"
            >
              <UserRoundPlus aria-hidden="true" className="h-4 w-4" />
              {session.recoveryNotifiedAt ? 'Registrar novo contato' : 'Registrar contato'}
            </Button>
          </Card>

          <Card title="Marcos" description="Datas gravadas pelo próprio funil.">
            <Row icon={<Clock aria-hidden="true" className="h-3.5 w-3.5" />} label="Início" value={formatDateTime(session.startedAt)} mono />
            <Row label="Última atividade" value={formatDateTime(session.lastSeenAt)} mono />
            <Row label="Identificou-se" value={formatDateTime(session.identifiedAt)} mono />
            <Row label="Finalizou" value={formatDateTime(session.paymentAt)} mono />
            <Row label="Pagou" value={formatDateTime(session.paidAt)} mono />
            <Row label="Abandonou" value={formatDateTime(session.abandonedAt)} mono />
            <Row label="Expira em" value={formatDateTime(session.expiresAt)} mono />
          </Card>
        </div>
      </div>

      <Card
        className="mt-4"
        title="Linha do tempo"
        description="Todos os eventos deste checkout, do mais antigo ao mais recente. É aqui que se vê onde a pessoa parou."
      >
        {events.length === 0 ? (
          <EmptyState
            icon={<History aria-hidden="true" className="h-5 w-5" />}
            title="Nenhum evento registrado"
            message="Sessão criada sem eventos — situação incomum. Se repetir, é sinal de falha no registro do checkout."
          />
        ) : (
          <ol className="pt-1">
            {events.map((event, index) => (
              <TimelineItem
                key={event.id ?? `${event.type}-${event.createdAt}-${index}`}
                event={event}
                last={index === events.length - 1}
              />
            ))}
          </ol>
        )}
      </Card>

      {recoveryOpen && (
        <RecoveryModal
          session={session}
          onClose={() => setRecoveryOpen(false)}
          onRegistered={(updated) => {
            patch((current) => ({ ...current, session: updated }));
            // Recarrega para a linha do tempo já mostrar o evento
            // `recovery_notified` que o backend acabou de criar.
            reload();
          }}
        />
      )}
    </div>
  );
};

export default SessionDetailPage;
