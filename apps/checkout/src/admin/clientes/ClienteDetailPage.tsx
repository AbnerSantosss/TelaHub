/**
 * Detalhe de um cliente — a tela onde as decisões de cobrança acontecem.
 *
 * A ordem dos blocos é a ordem das perguntas de quem abre esta tela: em que pé
 * está a assinatura, o que este cliente REALMENTE tem direito (plano ∪
 * concessão), o que ele já pagou, quem usa e o que já foi feito com esta conta.
 *
 * Duas escolhas que valem explicação:
 *
 * 1. As ações ficam num bloco próprio, não espalhadas pelos cards. Botão de
 *    cancelar ao lado do dado que ele destrói é como um clique de curiosidade
 *    vira um cancelamento.
 * 2. Depois de agir, a tela RECARREGA o detalhe. O contrato antigo dizia que
 *    toda ação devolvia o `ClienteDetail` inteiro e a tela o adotava; o servidor
 *    devolve só a assinatura (`{ subscription }`), quando muito com o pagamento
 *    ao lado. Adotar aquilo como "detalhe" apagaria no clique o nome do
 *    cliente, os pagamentos, os usuários e a trilha — a tela ficaria vazia
 *    exatamente no instante em que a pessoa precisa conferir o que fez.
 *
 * ⚠️ O que o servidor manda, e o contrato provisório errava:
 *   • a atribuição é um bloco `attribution` com NOVE campos, não três campos
 *     soltos dentro de `organization`;
 *   • dinheiro e telas faturadas vivem em `billing`, com `cycleCents` (caixa) e
 *     `monthlyEquivalentCents` (MRR) SEPARADOS — cada um com o seu rótulo,
 *     nunca somados, nunca trocados (US-A-05);
 *   • a trilha é `auditLogs`, e `metadata` é JSON EM TEXTO (por isso passa por
 *     `parseMetadata`; `Object.entries` numa string desmonta a string em
 *     caracteres);
 *   • a carência vem como `graceEndsAt` (um instante), não como dias;
 *   • `subscription` pode ser NULA — organização sem assinatura existe, e
 *     nenhuma ação de cobrança se aplica a ela;
 *   • NÃO existe `emails` no detalhe. O histórico de e-mail de uma organização
 *     sai de `GET /admin/email/messages?organizationId=`, que é outra rota e
 *     outra tela; o bloco que ficava aqui lia um campo inexistente.
 */
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  ExternalLink,
  Info,
  Mail,
  Megaphone,
  Repeat,
  Sparkles,
  Undo2,
  Wallet,
  XCircle,
} from 'lucide-react';

import { fetchClienteDetail } from '../backoffice-api';
import type { ClienteDetail } from '../backoffice-types';
import {
  billingIntervalLabel,
  cycleMoneyCaption,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatRelative,
  parseMetadata,
} from '../format';
import { useAdminQuery } from '../useAdminQuery';
import { Button, Card, EmptyState, ErrorState, ForbiddenState, Loading, PageHeader, cx } from '../ui';
import { PaymentStatusBadge, nfseStatusLabel } from '../PagamentosPage';
import AcaoModal, { type AcaoTipo } from './AcaoModal';
import EmailAvulsoModal from './EmailAvulsoModal';
import OverrideModal from './OverrideModal';
import {
  SubscriptionBadge,
  cancelReasonLabel,
  graceDaysLeft,
  graceText,
  isUnpaidCancel,
  subStatusMeta,
} from './ClientesPage';

/** Linha rótulo/valor. Ausência vira "—", nunca um espaço em branco silencioso. */
const Row = ({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  tone?: 'warning' | 'danger';
}) => (
  <div className="flex items-start justify-between gap-4 border-b border-line py-2.5 last:border-0">
    <span className="shrink-0 text-[13px] text-ink-muted">{label}</span>
    <span
      className={cx(
        'min-w-0 text-right text-[13px] font-semibold break-words',
        mono && 'money',
        tone === 'danger' ? 'text-danger-ink' : tone === 'warning' ? 'text-warning-ink' : 'text-ink'
      )}
    >
      {value ?? '-'}
    </span>
  </div>
);

const empty = <span className="font-normal text-ink-subtle">-</span>;

/** Etiqueta de origem: plano contratado × concessão manual. */
const OriginTag = ({ manual }: { manual: boolean }) =>
  manual ? (
    <span className="inline-flex items-center gap-1 rounded border border-info/25 bg-info/10 px-1.5 py-px text-[11px] font-semibold text-info-ink">
      <Sparkles aria-hidden="true" className="h-3 w-3" />
      concessão manual
    </span>
  ) : (
    <span className="text-[11px] font-medium text-ink-subtle">do plano</span>
  );

/** Valor de metadado da trilha: `null` e `false` são informação, não vazio. */
function metadataText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'sim' : 'não';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const th = 'px-3 py-2 text-left text-[11px] font-bold tracking-[0.1em] text-ink-subtle uppercase';

const ClienteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [acao, setAcao] = useState<AcaoTipo | null>(null);
  const [emailAberto, setEmailAberto] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const [{ data, loading, error, forbidden }, reload] = useAdminQuery<ClienteDetail>(
    () => fetchClienteDetail(id ?? ''),
    [id]
  );

  const back = (
    <Link
      to="/admin/clientes"
      className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted transition-colors hover:text-ink"
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      Todos os clientes
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
          <Loading label="Carregando o cliente…" />
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        {back}
        <ErrorState
          title="Não foi possível abrir este cliente"
          message={error ?? 'A organização não foi encontrada. Ela pode ter sido removida.'}
          onRetry={reload}
        />
      </div>
    );
  }

  const { organization, subscription, billing, usage, entitlements, override, attribution, payments, users, auditLogs } =
    data;

  const grace = graceText(graceDaysLeft(subscription?.graceEndsAt ?? null));
  const reason = cancelReasonLabel(subscription?.cancelReason ?? null);
  const canceled = subscription?.status === 'canceled';
  const pastDue = subscription?.status === 'past_due';
  const planLabel = subscription ? subscription.plan.name || subscription.plan.code : 'Sem assinatura';

  /**
   * Só a concessão VÁLIDA marca uma feature como "concedida à mão". A vencida
   * continua chegando (`active: false`) porque é histórico; usá-la para pintar
   * o catálogo efetivo diria que o cliente TEM hoje o que ele teve até agosto.
   */
  const activeOverride = override?.active ? override : null;
  const overrideFeatures = new Set(activeOverride?.extraFeatures ?? []);

  return (
    <div>
      {back}

      <PageHeader
        eyebrow="Cliente"
        title={organization.name || 'Organização sem nome'}
        subtitle={
          <>
            {planLabel} · {billingIntervalLabel(billing.interval)} · cliente desde{' '}
            <span className="money">{formatDate(organization.createdAt)}</span>
          </>
        }
        actions={
          <SubscriptionBadge
            status={subscription?.status ?? null}
            title={subStatusMeta(subscription?.status ?? null).hint}
          />
        }
      />

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card
            title="Assinatura"
            description="O valor em destaque é o do ciclo, ou seja, o que entra de caixa de uma vez. O mensal equivalente aparece embaixo, com esse nome, e os dois nunca se somam."
          >
            {!subscription ? (
              <p className="text-[13px] leading-relaxed text-ink-muted">
                Esta organização <strong>nunca teve assinatura</strong>. Ela existe, tem usuários e pode ter telas, mas
                nenhuma ação de cobrança se aplica. O servidor recusa todas com "esta organização não tem assinatura".
                O caminho é a contratação pelo checkout.
              </p>
            ) : (
              <>
                <Row label="Situação" value={<SubscriptionBadge status={subscription.status} />} />
                <Row label="Plano" value={planLabel} />
                <Row label="Periodicidade" value={billingIntervalLabel(billing.interval)} />
                <Row
                  label={`Valor do ciclo (${cycleMoneyCaption(billing.interval)})`}
                  value={<span className="money text-[15px] font-extrabold">{formatMoney(billing.cycleCents)}</span>}
                />
                <Row
                  label="Mensal equivalente (MRR)"
                  value={
                    <span className="money">
                      {formatMoney(billing.monthlyEquivalentCents)}
                      <span className="font-normal text-ink-muted">/mês</span>
                    </span>
                  }
                />
                <Row label="Vence em" value={formatDate(subscription.currentPeriodEnd)} mono />
                {/* "Último pagamento" é a última entrada de DINHEIRO, então a
                    busca exige `confirmed` — a mesma regra da listagem. Uma
                    cobrança `pending` nesta linha faria um inadimplente parecer
                    em dia. */}
                <Row
                  label="Último pagamento"
                  value={formatDateTime(
                    payments.find((payment) => payment.status === 'confirmed' && payment.paidAt)?.paidAt ?? null
                  )}
                  mono
                />
                {subscription.pastDueSince && (
                  <Row label="Inadimplente desde" value={formatDate(subscription.pastDueSince)} mono tone="warning" />
                )}
                {grace && <Row label="Carência" value={grace.text} tone={grace.urgent ? 'danger' : 'warning'} />}
                {subscription.cancelAtPeriodEnd && (
                  <Row
                    label="Cancelamento agendado"
                    value={`Sai em ${formatDate(subscription.currentPeriodEnd)} , usa até lá`}
                    tone="warning"
                  />
                )}
                {canceled && reason && (
                  <Row
                    label="Motivo do encerramento"
                    value={
                      isUnpaidCancel(subscription.cancelReason)
                        ? `${reason} (o cliente não pediu para sair)`
                        : reason
                    }
                    tone={isUnpaidCancel(subscription.cancelReason) ? 'danger' : undefined}
                  />
                )}
                <Row
                  label="Telas"
                  value={
                    <>
                      <span className="money">{formatNumber(billing.billedScreens)}</span> faturadas ·{' '}
                      <span className="money">{formatNumber(usage.devices)}</span> em uso
                    </>
                  }
                />
              </>
            )}
          </Card>

          {/*
            Catálogo EFETIVO: o que o cliente tem de verdade hoje.
            Mostrar só o plano seria mentira sempre que houvesse concessão — e a
            concessão é justamente o caso em que alguém precisa entender por que
            aquela conta faz algo que o plano não permite.
          */}
          <Card
            title="Catálogo efetivo"
            description="Plano contratado somado às concessões manuais VÁLIDAS. É o que vale na prática."
            actions={
              <Button type="button" variant="secondary" onClick={() => setOverrideOpen(true)}>
                <Sparkles aria-hidden="true" className="h-4 w-4" />
                {override ? 'Editar concessão' : 'Conceder acesso'}
              </Button>
            }
          >
            {activeOverride && (
              <div className="mb-3 rounded-lg border border-info/25 bg-info/5 px-3 py-2.5 text-[13px] leading-relaxed text-ink-muted">
                <p>
                  <strong className="text-ink">Concessão ativa.</strong> {activeOverride.note}
                </p>
                <p className="mt-1">
                  {activeOverride.expiresAt ? (
                    <>
                      Vale até <span className="money font-semibold">{formatDate(activeOverride.expiresAt)}</span>.
                    </>
                  ) : (
                    <span className="font-semibold text-warning-ink">
                      Sem data de validade, vale por tempo indeterminado.
                    </span>
                  )}{' '}
                  Concedida em <span className="money">{formatDateTime(activeOverride.createdAt)}</span>, alterada pela
                  última vez em <span className="money">{formatDateTime(activeOverride.updatedAt)}</span>.
                </p>
              </div>
            )}

            {/*
              A concessão VENCIDA continua chegando marcada `active: false`, e é
              histórico — "este cliente teve isto até tal dia". Exibi-la com a
              mesma cara da vigente faria o operador prometer ao telefone um
              acesso que o gate já não dá; escondê-la apagaria a resposta de
              "por que ele usou isso em agosto".
            */}
            {override && !override.active && (
              <div className="mb-3 rounded-lg border border-line bg-app px-3 py-2.5 text-[13px] leading-relaxed text-ink-muted">
                <p>
                  <strong className="text-ink">Concessão vencida, não vale mais.</strong> {override.note}
                </p>
                <p className="mt-1">
                  Valeu até <span className="money font-semibold">{formatDate(override.expiresAt)}</span> e hoje o
                  cliente está só com o plano. Continua aqui como histórico:{' '}
                  {override.extraFeatures.length > 0
                    ? `chegou a ter ${override.extraFeatures.join(', ')}.`
                    : 'não concedia função nomeada, só limites.'}
                </p>
              </div>
            )}

            <Row
              label="Limite de telas"
              value={
                <span className="inline-flex items-center gap-2">
                  <span className="money">{entitlements.maxDevices ?? 'sem limite'}</span>
                  <OriginTag manual={activeOverride?.maxDevices != null} />
                </span>
              }
            />
            <Row
              label="Limite de usuários"
              value={
                <span className="inline-flex items-center gap-2">
                  <span className="money">{entitlements.maxUsers ?? 'sem limite'}</span>
                  <OriginTag manual={activeOverride?.maxUsers != null} />
                </span>
              }
            />

            <div className="pt-3">
              <p className="mb-2 text-[13px] text-ink-muted">Funções liberadas</p>
              {entitlements.features.length === 0 ? (
                <p className="text-[13px] text-ink-subtle">
                  O plano não declara funções nomeadas. Valem os limites acima.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {entitlements.features.map((feature) => {
                    const manual = overrideFeatures.has(feature);
                    return (
                      <li
                        key={feature}
                        className={cx(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold',
                          manual
                            ? 'border-info/25 bg-info/10 text-info-ink'
                            : 'border-line bg-app text-ink-muted'
                        )}
                      >
                        {manual && <Sparkles aria-hidden="true" className="h-3 w-3" />}
                        {feature}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>

          <Card
            title="Pagamentos"
            description="Caixa que entrou por esta conta. Cada linha é o valor do ciclo, não a mensalidade."
            bodyClassName="px-0 py-0"
          >
            {payments.length === 0 ? (
              <EmptyState
                icon={<Wallet aria-hidden="true" className="h-5 w-5" />}
                title="Nenhum pagamento registrado"
                message="Se o dinheiro entrou por Pix fora do gateway, use “Registrar pagamento manual”. É isso que faz o caixa aparecer aqui e reativa a assinatura."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <caption className="sr-only">Pagamentos desta organização, do mais recente para o mais antigo.</caption>
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className={`${th} sm:px-5`}>
                        Data
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
                      <th scope="col" className={`${th} sm:px-5`}>
                        Fatura / NFS-e
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-line last:border-0">
                        <th scope="row" className="px-3 py-2.5 text-left font-normal sm:px-5">
                          <p className="money text-[13px] whitespace-nowrap text-ink">
                            {formatDate(payment.paidAt ?? payment.dueDate ?? payment.createdAt)}
                          </p>
                          <p className="text-[12px] text-ink-subtle">
                            {payment.paidAt ? 'pago' : payment.dueDate ? 'vencimento' : 'criado'}
                          </p>
                        </th>
                        <td className="px-3 py-2.5 text-right">
                          <p className="money text-[13px] font-bold text-ink">{formatMoney(payment.amountCents)}</p>
                          <p className="text-[12px] whitespace-nowrap text-ink-subtle">
                            {cycleMoneyCaption(payment.billingInterval)} · {formatNumber(payment.screens)} telas
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          <PaymentStatusBadge status={payment.status} />
                        </td>
                        <td className="px-3 py-2.5 text-[13px] text-ink-muted">
                          {payment.method ?? payment.provider}
                        </td>
                        <td className="px-3 py-2.5 sm:px-5">
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
            )}
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {/*
            Bloco de ações. "Agendar" vem primeiro e com peso visual; "cancelar
            agora" fica separado por uma linha, embaixo, como exceção — porque é
            exceção mesmo. Ver o aviso do CDC dentro do próprio modal.
          */}
          {subscription && (
            <Card title="Ações" description="Toda ação exige motivo e entra na trilha de auditoria.">
              <div className="space-y-2">
                {subscription.cancelAtPeriodEnd ? (
                  <Button type="button" variant="primary" className="w-full" onClick={() => setAcao('reactivate')}>
                    <Undo2 aria-hidden="true" className="h-4 w-4" />
                    Desfazer o cancelamento agendado
                  </Button>
                ) : (
                  !canceled && (
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full"
                      onClick={() => setAcao('schedule_cancel')}
                    >
                      <CalendarClock aria-hidden="true" className="h-4 w-4" />
                      Agendar cancelamento
                    </Button>
                  )
                )}

                <Button type="button" className="w-full" onClick={() => setAcao('manual_payment')}>
                  <Wallet aria-hidden="true" className="h-4 w-4" />
                  Registrar pagamento manual
                </Button>
                <Button type="button" className="w-full" onClick={() => setAcao('change_plan')}>
                  <Repeat aria-hidden="true" className="h-4 w-4" />
                  Trocar plano
                </Button>
                <Button type="button" className="w-full" onClick={() => setAcao('extend')}>
                  <CalendarPlus aria-hidden="true" className="h-4 w-4" />
                  Estender período
                </Button>
                <Button type="button" className="w-full" onClick={() => setOverrideOpen(true)}>
                  <Sparkles aria-hidden="true" className="h-4 w-4" />
                  {override ? 'Editar concessão manual' : 'Conceder acesso extra'}
                </Button>
                <Button type="button" className="w-full" onClick={() => setEmailAberto(true)}>
                  <Mail aria-hidden="true" className="h-4 w-4" />
                  Enviar e-mail
                </Button>
              </div>

              {/*
                O botão "Reativar" saiu daqui para inadimplente e encerrada, e
                isso não é redução de recurso: `reactivate` no servidor SÓ desfaz
                cancelamento agendado. Num `past_due` ele não muda nada (devolve
                a assinatura como está) e numa `canceled` responde 409. O botão
                dava a impressão de resolver, e o operador saía da tela achando
                que tinha recuperado o cliente.
              */}
              {pastDue && (
                <p className="mt-4 flex items-start gap-2 border-t border-line pt-3 text-[12px] leading-snug text-ink-muted">
                  <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" />
                  <span>
                    Inadimplente volta a ficar ativa com <strong>pagamento confirmado</strong>. Registre o Pix acima. O
                    botão de reativar não serve aqui: ele só desfaz cancelamento agendado.
                  </span>
                </p>
              )}

              {canceled && (
                <p className="mt-4 flex items-start gap-2 border-t border-line pt-3 text-[12px] leading-snug text-ink-muted">
                  <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" />
                  <span>
                    Assinatura já encerrada não se reativa por aqui: seria plano pago sem cobrança nenhuma. Ou o cliente
                    contrata de novo pelo checkout, ou você registra o pagamento recebido, que reativa a conta com o
                    caixa correspondente.
                  </span>
                </p>
              )}

              {!canceled && (
                <div className="mt-4 border-t border-line pt-3">
                  <p className="mb-2 text-[12px] leading-snug text-ink-subtle">
                    Corta o acesso na hora, inclusive do período já pago. Use só quando não houver período pago a
                    entregar.
                  </p>
                  <Button type="button" variant="danger" className="w-full" onClick={() => setAcao('cancel_now')}>
                    <XCircle aria-hidden="true" className="h-4 w-4" />
                    Cancelar agora
                  </Button>
                </div>
              )}
            </Card>
          )}

          <Card title="Uso" description="O que a conta consome hoje, contra o limite efetivo.">
            <Row
              label="Telas cadastradas"
              value={
                <>
                  <span className="money">{formatNumber(usage.devices)}</span>
                  {entitlements.maxDevices != null && (
                    <span className="font-normal text-ink-muted"> de {entitlements.maxDevices}</span>
                  )}
                </>
              }
            />
            <Row
              label="Usuários"
              value={
                <>
                  <span className="money">{formatNumber(usage.users)}</span>
                  {entitlements.maxUsers != null && (
                    <span className="font-normal text-ink-muted"> de {entitlements.maxUsers}</span>
                  )}
                </>
              }
            />
            <Row label="Telas faturadas" value={<span className="money">{formatNumber(billing.billedScreens)}</span>} />
          </Card>

          <Card title="Usuários" description="Quem entra na conta.">
            {users.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-ink-muted">
                Nenhum usuário cadastrado. Uma organização sem usuário não consegue publicar nada. Vale checar se o
                convite de acesso chegou.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {users.map((user) => (
                  <li key={user.id} className="border-b border-line pb-2.5 last:border-0 last:pb-0">
                    <p className="text-[13px] font-semibold text-ink">{user.name ?? user.email}</p>
                    <p className="text-[12px] break-all text-ink-subtle">
                      <a href={`mailto:${user.email}`} className="text-accent hover:underline">
                        {user.email}
                      </a>{' '}
                      · {user.role}
                    </p>
                    <p className="text-[12px] text-ink-subtle">
                      {user.lastLogin ? `Último acesso ${formatRelative(user.lastLogin)}` : 'Nunca entrou'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Origem" description="De onde esta organização veio.">
            {attribution.utmSource || attribution.referrer || attribution.landingPath || attribution.gclid || attribution.fbclid ? (
              <>
                <Row label="utm_source" value={attribution.utmSource ?? empty} mono={!!attribution.utmSource} />
                <Row label="utm_medium" value={attribution.utmMedium ?? empty} mono={!!attribution.utmMedium} />
                <Row label="utm_campaign" value={attribution.utmCampaign ?? empty} mono={!!attribution.utmCampaign} />
                {/* `utm_content`, `utm_term` e os cliques de anúncio só aparecem
                    quando existem: sete linhas com "—" escondem as três que
                    importam. Mas eles CHEGAM — o contrato antigo nem sabia
                    deles, e era por ali que se descobre qual criativo trouxe o
                    cliente. */}
                {attribution.utmContent && <Row label="utm_content" value={attribution.utmContent} mono />}
                {attribution.utmTerm && <Row label="utm_term" value={attribution.utmTerm} mono />}
                {attribution.gclid && <Row label="Clique do Google (gclid)" value={attribution.gclid} mono />}
                {attribution.fbclid && <Row label="Clique da Meta (fbclid)" value={attribution.fbclid} mono />}
                <Row
                  label="Página de entrada"
                  value={attribution.landingPath ? <span className="break-all">{attribution.landingPath}</span> : empty}
                />
                <Row
                  label="Referrer"
                  value={attribution.referrer ? <span className="break-all">{attribution.referrer}</span> : empty}
                />
              </>
            ) : (
              <EmptyState
                icon={<Megaphone aria-hidden="true" className="h-5 w-5" />}
                title="Sem atribuição registrada"
                message="Chegou sem UTM e sem referrer: acesso direto, link salvo ou origem que não repassa referência. Para rastrear as próximas, divulgue o link com utm_source."
              />
            )}
          </Card>

          <Card title="Trilha de auditoria" description="Toda ação administrativa sobre esta conta, com o motivo.">
            {auditLogs.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-ink-muted">
                Nenhuma ação administrativa nesta conta ainda. Tudo que for feito pelos botões acima aparece aqui, com
                quem fez, quando e por quê.
              </p>
            ) : (
              <ul className="space-y-3">
                {auditLogs.map((entry) => {
                  // `metadata` chega como JSON EM TEXTO. `parseMetadata` é
                  // tolerante de propósito: trilha corrompida vira uma linha
                  // esquisita, nunca uma tela em branco no dia em que alguém
                  // precisa provar o que foi feito.
                  const metadata = parseMetadata(entry.metadata);
                  return (
                    <li key={entry.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                      <p className="text-[13px] font-bold text-ink">{entry.action}</p>
                      <p className="text-[12px] text-ink-subtle">
                        <span className="money">{formatDateTime(entry.createdAt)}</span> ·{' '}
                        {entry.userEmail ?? 'sistema'}
                      </p>
                      {metadata && Object.keys(metadata).length > 0 && (
                        <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                          {Object.entries(metadata).map(([key, value]) => (
                            <div key={key} className="flex items-baseline gap-1.5">
                              <dt className="text-[11px] font-semibold tracking-wide text-ink-subtle uppercase">
                                {key}
                              </dt>
                              <dd className="text-[12px] font-medium break-all text-ink-muted">
                                {metadataText(value)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {acao && (
        <AcaoModal
          acao={acao}
          detail={data}
          onClose={() => setAcao(null)}
          // Recarrega em vez de adotar a resposta: nenhuma ação devolve o
          // cliente inteiro, e é o servidor que decide como a conta ficou
          // (vencimento recalculado, motivo normalizado, status novo).
          onApplied={reload}
        />
      )}

      {overrideOpen && (
        <OverrideModal
          detail={data}
          onClose={() => setOverrideOpen(false)}
          onApplied={reload}
        />
      )}

      {emailAberto && (
        <EmailAvulsoModal
          detail={data}
          onClose={() => setEmailAberto(false)}
          // Recarrega para a trilha de auditoria da organização já mostrar o
          // envio — é lá que se confere o que a plataforma mandou para o cliente.
          onSent={reload}
        />
      )}
    </div>
  );
};

export default ClienteDetailPage;
