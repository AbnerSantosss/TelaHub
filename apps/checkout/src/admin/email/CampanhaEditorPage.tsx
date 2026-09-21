/**
 * Editor de campanha.
 *
 * A ordem da tela é a regra, não uma sugestão de layout: contar o público →
 * enviar teste para si mesmo → agendar ou disparar. Nada sai enquanto ninguém
 * contou quantas pessoas vão receber, porque campanha cujo alcance só se
 * descobre depois do envio é exatamente como uma base inteira recebe algo por
 * engano — e e-mail enviado não volta.
 *
 * O segundo cuidado é menos óbvio: a contagem é feita pelo SERVIDOR, sobre o
 * público GRAVADO, porque é o público gravado que o disparo vai usar. Se o
 * operador mexer no filtro e não salvar, o número na tela passa a descrever
 * outro recorte. Por isso qualquer alteração pendente invalida a contagem e
 * trava o disparo até salvar e contar de novo.
 *
 * ── AGENDAR NÃO É DISPARAR (a correção que motivou esta reescrita) ───────────
 * A tela gravava `scheduledAt` e, em seguida, chamava `/send` — porque o
 * comentário antigo supunha que só `/send` registrava motivo. Duas coisas
 * mudaram no servidor e derrubam essa suposição:
 *
 *   1. `PUT /campaigns/:id` também EXIGE motivo e também audita
 *      (`email.campaign.update`). Agendar já fica registrado sem passar por
 *      `/send`.
 *   2. `POST /send` agora RECUSA (400) uma campanha com `scheduledAt` no
 *      futuro, a menos que venha `sendNow: true`. Ou seja, o fluxo antigo de
 *      agendar hoje termina em erro — e, antes da guarda existir, terminava
 *      pior: a campanha "agendada para sexta" saía para a base inteira no
 *      mesmo minuto, com a tela confirmando "agendada".
 *
 * Então: agendar é só `updateCampaign` com `scheduledAt` (o serviço grava
 * `status: 'scheduled'` sozinho, e o job dispara na data); "enviar agora" é
 * `/send` com `sendNow: true`. `status` NÃO é campo do corpo — o Zod descarta
 * chave desconhecida em silêncio, então mandá-lo parecia funcionar e não
 * agendava nada.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CalendarX,
  Eye,
  EyeOff,
  Save,
  Send,
  Users,
} from 'lucide-react';

import { isApiError } from '../../lib/api';
import {
  createCampaign,
  fetchCampaign,
  previewAudience,
  sendCampaign,
  sendCampaignTest,
  updateCampaign,
} from '../backoffice-api';
import type {
  AudiencePreviewResponse,
  Campaign,
  CampaignAudience,
  SubscriptionStatus,
} from '../backoffice-types';
import { formatDateTime, formatNumber } from '../format';
import { useAdminQuery } from '../useAdminQuery';
import {
  Button,
  Card,
  ErrorState,
  Field,
  ForbiddenState,
  Loading,
  Modal,
  PageHeader,
  cx,
  inputClass,
} from '../ui';
import { campaignStatusMeta, Pill } from './EmailPage';
import PublicoSelector from './PublicoSelector';

/** Mínimo do `reasonSchema` é 3; a tela pede 5 — motivo de uma letra não explica nada. */
const MIN_REASON = 5;

/** Campanha só pode ser editada enquanto não saiu (o servidor recusa com 400). */
const isLocked = (campaign: Campaign | null): boolean =>
  !!campaign &&
  (campaign.status === 'sending' || campaign.status === 'sent' || campaign.status === 'canceled');

// ─── Público gravado ─────────────────────────────────────────────────────────

const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  'trialing',
  'active',
  'past_due',
  'canceled',
];

const isSubscriptionStatus = (value: unknown): value is SubscriptionStatus =>
  typeof value === 'string' && SUBSCRIPTION_STATUSES.some((status) => status === value);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;

/**
 * Lê o público gravado na campanha.
 *
 * `EmailCampaign.audience` é uma STRING JSON no banco, não um objeto — o
 * contrato antigo prometia objeto, então `campaign.audience.plans` era
 * `undefined` e a assinatura do recorte nunca casava: a contagem nascia
 * "vencida" e o disparo ficava travado para sempre, sem erro nenhum.
 *
 * Tolerante de propósito, igual ao `parseAudience` do servidor: JSON quebrado
 * (edição manual, migração) vira "público vazio", que significa TODA a base
 * consentida — e a contagem obrigatória mostra esse tamanho antes de qualquer
 * disparo. Derrubar o editor por causa de um JSON torto seria pior.
 */
export function parseCampaignAudience(raw: string | null | undefined): CampaignAudience {
  if (!raw) return {};
  try {
    const record = asRecord(JSON.parse(raw));
    if (!record) return {};

    return {
      plans: Array.isArray(record.plans)
        ? record.plans.filter((item): item is string => typeof item === 'string')
        : undefined,
      statuses: Array.isArray(record.statuses)
        ? record.statuses.filter(isSubscriptionStatus)
        : undefined,
      optInOnly: typeof record.optInOnly === 'boolean' ? record.optInOnly : undefined,
    };
  } catch {
    return {};
  }
}

/** Assinatura do público, para saber se a contagem ainda descreve este recorte. */
const audienceSignature = (audience: CampaignAudience): string =>
  JSON.stringify({
    plans: [...(audience.plans ?? [])].sort(),
    statuses: [...(audience.statuses ?? [])].sort(),
  });

/** Numera os passos, para a ordem ficar visível e não só imposta pelo `disabled`. */
const Step = ({
  number,
  title,
  description,
  blocked,
  children,
}: {
  number: number;
  title: string;
  description: string;
  blocked?: string | null;
  children: React.ReactNode;
}) => (
  <section
    className={cx('rounded-xl border border-line bg-surface', blocked && 'opacity-70')}
    aria-labelledby={`passo-${number}`}
  >
    <header className="flex items-start gap-3 border-b border-line px-4 py-3.5 sm:px-5">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-app text-[12px] font-bold text-ink-muted"
      >
        {number}
      </span>
      <div className="min-w-0">
        <h2 id={`passo-${number}`} className="text-[15px] font-bold text-ink">
          {title}
        </h2>
        <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{description}</p>
      </div>
    </header>
    <div className="space-y-3 px-4 py-4 sm:px-5">
      {blocked && (
        <p className="rounded-lg border border-line bg-app px-3 py-2.5 text-[13px] leading-relaxed text-ink-muted">
          {blocked}
        </p>
      )}
      {children}
    </div>
  </section>
);

type DispatchMode = 'now' | 'schedule';

/**
 * O que a tela diz depois de tentar disparar.
 *
 * Tem `tone` porque nem todo 400 desta rota é falha: "campanha agendada para
 * <data>; ela será disparada automaticamente" é o servidor CONFIRMANDO o
 * agendamento. Pintado de vermelho, o operador desfaz o agendamento e manda na
 * mão — desfazendo justamente a proteção.
 */
interface DispatchNotice {
  tone: 'info' | 'error';
  message: string;
}

const CampanhaEditorPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'novo';

  const [{ data, loading, error, forbidden }, reload] = useAdminQuery<Campaign | null>(
    () => (isNew ? Promise.resolve(null) : fetchCampaign(id)),
    [id, isNew]
  );

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [audience, setAudience] = useState<CampaignAudience>({ optInOnly: true });

  const [count, setCount] = useState<AudiencePreviewResponse | null>(null);
  const [countedFor, setCountedFor] = useState<string | null>(null);
  const [counting, setCounting] = useState(false);

  const [testEmail, setTestEmail] = useState('');
  const [testSent, setTestSent] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const [mode, setMode] = useState<DispatchMode>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [notice, setNotice] = useState<DispatchNotice | null>(null);

  const [draftReason, setDraftReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // O servidor é a fonte: ao carregar (ou depois de salvar) a tela reflete o que
  // está gravado, nunca o que o operador digitou e não confirmou.
  useEffect(() => {
    if (!data) return;
    setCampaign(data);
    setName(data.name);
    setSubject(data.subject);
    setPreviewText(data.previewText ?? '');
    setHtmlBody(data.htmlBody);
    setAudience({ ...parseCampaignAudience(data.audience), optInOnly: true });
  }, [data]);

  const locked = isLocked(campaign);
  const signature = audienceSignature(audience);
  const stale = countedFor !== null && countedFor !== signature;

  const dirty = campaign
    ? name !== campaign.name ||
      subject !== campaign.subject ||
      previewText !== (campaign.previewText ?? '') ||
      htmlBody !== campaign.htmlBody ||
      signature !== audienceSignature(parseCampaignAudience(campaign.audience))
    : true;

  const fieldsFilled =
    name.trim().length >= 3 && subject.trim().length >= 3 && htmlBody.trim().length >= 10;
  const draftReasonValid = draftReason.trim().length >= MIN_REASON;
  const reasonValid = reason.trim().length >= MIN_REASON;
  const counted = count !== null && !stale;

  /** Agendamento gravado que ainda não chegou — é o que muda o que "enviar" significa. */
  const scheduledAhead =
    !!campaign?.scheduledAt && new Date(campaign.scheduledAt).getTime() > Date.now();

  const scheduledIso = useMemo(() => {
    if (!scheduledAt) return null;
    const parsed = new Date(scheduledAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }, [scheduledAt]);
  const scheduleValid =
    mode === 'now' || (!!scheduledIso && new Date(scheduledIso).getTime() > Date.now());

  /**
   * Disparo imediato com público zerado é PROIBIDO, e não é preciosismo: o
   * servidor marca a campanha como `sent` e recusa qualquer envio posterior
   * ("campanha já foi enviada"). Enviar para zero pessoa queima a campanha para
   * sempre. Como hoje ninguém na base tem opt-in, zero é o resultado comum —
   * seria o caminho mais fácil da tela, não o mais raro. Agendar continua
   * liberado: até a data, alguém pode consentir.
   */
  const emptyAudience = counted && count !== null && count.optedIn === 0;
  const canDispatch =
    counted && reasonValid && scheduleValid && !(mode === 'now' && emptyAudience);

  const previewHtml = useMemo(
    () =>
      `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#1f2937">${htmlBody}</div>`,
    [htmlBody]
  );

  const onSaveDraft = async () => {
    if (!fieldsFilled || !draftReasonValid || saving || locked) return;
    setSaving(true);
    setFormError(null);
    try {
      const shared = {
        name: name.trim(),
        subject: subject.trim(),
        htmlBody,
        audience: { ...audience, optInOnly: true },
        reason: draftReason.trim(),
      };

      if (isNew) {
        // Na criação, `previewText` só aceita string ou ausência — `null` daria
        // 400. Na edição é o contrário: `null` é o que APAGA o texto de prévia,
        // e omitir significa "não mexa". Mandar `undefined` nos dois casos
        // deixava o texto antigo colado na campanha para sempre.
        const created = await createCampaign({
          ...shared,
          previewText: previewText.trim() || undefined,
        });
        setCampaign(created);
        setDraftReason('');
        toast.success('Rascunho criado.', { description: 'Nada foi enviado ainda.' });
        // `replace` para o Voltar não cair no formulário "novo" já salvo.
        navigate(`/admin/email/campanhas/${created.id}`, { replace: true });
      } else {
        const updated = await updateCampaign(id, {
          ...shared,
          previewText: previewText.trim() || null,
        });
        setCampaign(updated);
        setDraftReason('');
        toast.success('Rascunho salvo.', { description: 'Nada foi enviado ainda.' });
      }

      // Alteração salva não devolve validade à contagem antiga: o recorte pode
      // ter mudado, e é a contagem que autoriza o disparo.
      setCount(null);
      setCountedFor(null);
    } catch (saveError) {
      setFormError(
        isApiError(saveError) ? saveError.message : 'Não foi possível salvar o rascunho.'
      );
    } finally {
      setSaving(false);
    }
  };

  const onCount = async () => {
    if (isNew || dirty || counting) return;
    setCounting(true);
    try {
      const result = await previewAudience(id);
      setCount(result);
      setCountedFor(signature);
    } catch (countError) {
      toast.error(
        isApiError(countError) ? countError.message : 'Não foi possível contar o público.'
      );
    } finally {
      setCounting(false);
    }
  };

  const onSendTest = async () => {
    const email = testEmail.trim();
    if (isNew || !email || sendingTest) return;
    setSendingTest(true);
    try {
      await sendCampaignTest(id, email);
      setTestSent(true);
      toast.success(`Teste enfileirado para ${email}.`, {
        description: 'O envio passa pela fila, então pode levar alguns minutos para chegar.',
      });
    } catch (testError) {
      toast.error(isApiError(testError) ? testError.message : 'Não foi possível enviar o teste.');
    } finally {
      setSendingTest(false);
    }
  };

  const onDispatch = async () => {
    if (dispatching || !canDispatch) return;
    setDispatching(true);
    setNotice(null);
    try {
      if (mode === 'schedule' && scheduledIso) {
        // AGENDAR É SÓ ISTO. O `PUT` grava a data, o serviço deriva
        // `status: 'scheduled'` e o job dispara na hora marcada. Chamar `/send`
        // em seguida — como a tela fazia — hoje volta 400, e antes da guarda
        // mandava a campanha inteira na hora.
        const updated = await updateCampaign(id, {
          scheduledAt: scheduledIso,
          reason: reason.trim(),
        });
        setCampaign(updated);
        setConfirming(false);
        setReason('');
        setNotice({
          tone: 'info',
          message: `Agendada para ${formatDateTime(scheduledIso)}. Ela sai sozinha na data, não precisa voltar aqui.`,
        });
        toast.success('Campanha agendada.', {
          description: `${formatNumber(count?.optedIn ?? 0)} destinatários no recorte contado agora. O envio é do job, na data marcada.`,
        });
      } else {
        // `sendNow: true` sempre que o operador pede "enviar agora": é o único
        // jeito de furar um agendamento existente, e numa campanha sem
        // agendamento não muda nada. O servidor limpa `scheduledAt` junto, para
        // "enviada" e "agendada para sexta" não conviverem na mesma linha.
        const result = await sendCampaign(id, { reason: reason.trim(), sendNow: true });
        setConfirming(false);
        setReason('');
        setNotice({
          tone: 'info',
          message: `${formatNumber(result.queued)} ${result.queued === 1 ? 'mensagem entrou' : 'mensagens entraram'} na fila. O envio é do job, não é instantâneo.`,
        });
        toast.success('Campanha enfileirada para envio.', {
          description: 'Acompanhe os contadores nesta tela e as falhas no histórico.',
        });
      }

      // A resposta de `/send` é `{ queued }`, NÃO a campanha: adotá-la como
      // campanha apagaria nome, assunto e contadores da tela. Quem diz como a
      // campanha ficou é o servidor, na recarga.
      reload();
    } catch (sendError) {
      setConfirming(false);
      const apiError = isApiError(sendError) ? sendError : null;
      setNotice({
        // 400 com agendamento no futuro é o servidor dizendo "ela sai sozinha
        // na data", não uma falha de envio.
        tone: apiError?.status === 400 && scheduledAhead ? 'info' : 'error',
        message: apiError?.message ?? 'Não foi possível concluir a ação.',
      });
    } finally {
      setDispatching(false);
    }
  };

  /** Desfaz o agendamento: `scheduledAt: null` devolve a campanha para rascunho. */
  const onUnschedule = async () => {
    if (dispatching || !reasonValid) return;
    setDispatching(true);
    setNotice(null);
    try {
      const updated = await updateCampaign(id, { scheduledAt: null, reason: reason.trim() });
      setCampaign(updated);
      setReason('');
      setNotice({ tone: 'info', message: 'Agendamento cancelado. A campanha voltou a rascunho.' });
      reload();
    } catch (unscheduleError) {
      setNotice({
        tone: 'error',
        message: isApiError(unscheduleError)
          ? unscheduleError.message
          : 'Não foi possível cancelar o agendamento.',
      });
    } finally {
      setDispatching(false);
    }
  };

  if (forbidden) return <ForbiddenState message={error} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!isNew && loading && !campaign) return <Loading label="Carregando a campanha…" />;

  const status = campaign ? campaignStatusMeta(campaign.status) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Backoffice · E-mail"
        title={isNew ? 'Nova campanha' : name || 'Campanha'}
        subtitle={
          campaign
            ? `Criada em ${formatDateTime(campaign.createdAt)}${
                campaign.sentAt ? ` · enviada em ${formatDateTime(campaign.sentAt)}` : ''
              }`
            : 'Rascunho ainda não salvo. Nada é enviado até você passar pelos três passos abaixo.'
        }
        actions={
          <>
            {status && <Pill label={status.label} className={status.className} />}
            <Link
              to="/admin/email?tab=campanhas"
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-app"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Campanhas
            </Link>
          </>
        }
      />

      {locked && (
        <p className="flex items-start gap-2 rounded-lg border border-line bg-app px-3 py-2.5 text-[13px] leading-relaxed text-ink-muted">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" />
          <span>
            Esta campanha já saiu da fase de rascunho ({status?.label.toLowerCase()}). O conteúdo
            fica somente leitura. Mudar o texto agora não altera o que já foi enviado e só
            confundiria o histórico.
          </span>
        </p>
      )}

      {!locked && scheduledAhead && campaign?.scheduledAt && (
        <p className="flex items-start gap-2 rounded-lg border border-info/25 bg-info/10 px-3 py-2.5 text-[13px] leading-relaxed text-ink">
          <CalendarClock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" />
          <span>
            Agendada para <strong>{formatDateTime(campaign.scheduledAt)}</strong>. Ela sai sozinha
            nessa data, pelo job, e você não precisa voltar aqui. Para adiantar, use “Enviar agora” no
            passo 3: o agendamento é limpo junto.
          </span>
        </p>
      )}

      {campaign && (campaign.status === 'sending' || campaign.status === 'sent') && (
        <Card title="Resultado do envio">
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            {(
              [
                ['Na fila', campaign.queuedCount],
                ['Enviados', campaign.sentCount],
                ['Falhas', campaign.failedCount],
                ['Suprimidos (sem opt-in)', campaign.suppressedCount],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-ink-subtle">{label}</dt>
                <dd className="money text-lg font-bold text-ink">{formatNumber(value)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
            Suprimidos não são falha: são as pessoas que não consentiram em receber novidades. As
            falhas individuais aparecem no{' '}
            <Link
              to="/admin/email?tab=historico&status=failed"
              className="font-semibold text-accent hover:underline"
            >
              histórico
            </Link>
            , com opção de reenviar.
          </p>
        </Card>
      )}

      {/* ── Conteúdo ─────────────────────────────────────────────────────── */}
      <Card
        title="Conteúdo"
        description="É o que o cliente vê na caixa de entrada."
        actions={
          <Button type="button" variant="ghost" onClick={() => setShowPreview((current) => !current)}>
            {showPreview ? (
              <EyeOff aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Eye aria-hidden="true" className="h-4 w-4" />
            )}
            {showPreview ? 'Esconder prévia' : 'Ver prévia'}
          </Button>
        }
      >
        <div className="space-y-4">
          <Field
            label="Nome da campanha"
            htmlFor="campanha-nome"
            hint="Só para você reconhecer na lista. O cliente não vê. Mínimo de 3 caracteres."
          >
            <input
              id="campanha-nome"
              type="text"
              value={name}
              disabled={locked}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Novidade: playlist agendada por horário"
              className={inputClass}
            />
          </Field>

          <Field label="Assunto" htmlFor="campanha-assunto" hint="Aparece na caixa de entrada.">
            <input
              id="campanha-assunto"
              type="text"
              value={subject}
              disabled={locked}
              onChange={(event) => setSubject(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Texto de prévia"
            htmlFor="campanha-previa"
            optional
            hint="A linha cinza que o Gmail mostra depois do assunto. Sem ela, o cliente vê o começo do HTML."
          >
            <input
              id="campanha-previa"
              type="text"
              value={previewText}
              disabled={locked}
              onChange={(event) => setPreviewText(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Corpo do e-mail (HTML)"
            htmlFor="campanha-corpo"
            hint="HTML simples: parágrafos, negrito e links. Não há editor visual: o texto sai do jeito que você escrever."
          >
            <textarea
              id="campanha-corpo"
              value={htmlBody}
              rows={12}
              disabled={locked}
              onChange={(event) => setHtmlBody(event.target.value)}
              spellCheck
              className={`${inputClass} resize-y font-mono text-[13px]`}
            />
          </Field>

          {showPreview && (
            /* `sandbox=""` e iframe: o corpo é HTML colado por um operador, e
               injetá-lo na árvore do painel faria um `<style>` distraído vazar
               para a interface inteira. */
            <div className="overflow-hidden rounded-lg border border-line">
              <p className="border-b border-line bg-app px-3 py-2 text-[13px] text-ink-muted">
                Assunto: <strong className="text-ink">{subject || '(sem assunto)'}</strong>
                {previewText && <span className="ml-2 text-ink-subtle">· {previewText}</span>}
              </p>
              <iframe
                title="Prévia da campanha"
                srcDoc={previewHtml}
                sandbox=""
                className="h-72 w-full bg-white"
              />
              <p className="border-t border-line bg-app px-3 py-2 text-xs text-ink-subtle">
                Sem o layout do sistema: no envio, o servidor embrulha este corpo no cabeçalho e no
                rodapé de descadastro da campanha.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* ── Público ──────────────────────────────────────────────────────── */}
      <Card title="Público" description="Quem recebe esta campanha.">
        <PublicoSelector
          value={audience}
          onChange={setAudience}
          disabled={locked}
          preview={count}
          stale={stale}
        />
      </Card>

      {!locked && (
        <Card
          title="Salvar rascunho"
          description="Salvar não envia nada. O servidor exige o motivo em toda escrita."
        >
          <div className="space-y-3">
            <Field
              label="Motivo desta alteração"
              htmlFor="campanha-motivo-rascunho"
              hint="Vai para a trilha de auditoria com o nome, o status e o público gravados."
              error={
                draftReason.length > 0 && !draftReasonValid
                  ? 'Escreva pelo menos 5 caracteres.'
                  : null
              }
            >
              <input
                id="campanha-motivo-rascunho"
                type="text"
                value={draftReason}
                onChange={(event) => setDraftReason(event.target.value)}
                placeholder="Ex.: texto aprovado pelo marketing em 09/09."
                className={inputClass}
              />
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p aria-live="polite" className="text-[13px] text-ink-muted">
                {saving
                  ? 'Salvando…'
                  : dirty
                    ? 'Há alterações não salvas. Salvar não envia nada.'
                    : 'Rascunho salvo.'}
              </p>
              <Button
                type="button"
                variant="secondary"
                loading={saving}
                disabled={!fieldsFilled || !dirty || !draftReasonValid}
                onClick={onSaveDraft}
              >
                <Save aria-hidden="true" className="h-4 w-4" />
                Salvar rascunho
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!locked && (
        <div className="space-y-4">
          <Step
            number={1}
            title="Contar o público"
            description="Quantas pessoas recebem e quantas ficam de fora por não terem consentido."
            blocked={
              isNew
                ? 'Salve o rascunho primeiro: a contagem é feita pelo servidor sobre a campanha gravada.'
                : dirty
                  ? 'Há alterações não salvas. A contagem leria o público antigo, não o que está na tela.'
                  : null
            }
          >
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="primary"
                loading={counting}
                disabled={isNew || dirty}
                onClick={onCount}
              >
                <Users aria-hidden="true" className="h-4 w-4" />
                {count && !stale ? 'Contar de novo' : 'Contar o público'}
              </Button>
              <p aria-live="polite" className="text-[13px] text-ink-muted">
                {counting
                  ? 'Contando…'
                  : counted && count
                    ? `${formatNumber(count.optedIn)} vão receber · ${formatNumber(count.withoutOptIn)} sem opt-in · ${formatNumber(count.total)} no filtro.`
                    : 'Ainda não contado.'}
              </p>
            </div>
          </Step>

          <Step
            number={2}
            title="Enviar teste para mim"
            description="Ver o e-mail como ele chega, antes de qualquer cliente receber."
            blocked={isNew ? 'Disponível depois de salvar o rascunho.' : null}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label
                  htmlFor="campanha-teste"
                  className="mb-1.5 block text-[13px] font-semibold text-ink"
                >
                  E-mail para o teste
                </label>
                <input
                  id="campanha-teste"
                  type="email"
                  value={testEmail}
                  disabled={isNew}
                  onChange={(event) => setTestEmail(event.target.value)}
                  placeholder="voce@suaempresa.com.br"
                  className={inputClass}
                />
              </div>
              <Button
                type="button"
                loading={sendingTest}
                disabled={isNew || !testEmail.trim()}
                onClick={onSendTest}
                className="sm:mb-0"
              >
                <Send aria-hidden="true" className="h-4 w-4" />
                Enviar teste
              </Button>
            </div>
            <p aria-live="polite" className="text-[13px] text-ink-muted">
              {testSent
                ? 'Teste enfileirado. Ele não conta nos números da campanha.'
                : 'O teste vai só para este endereço e não conta nos contadores. Sai como transacional, então chega mesmo sem opt-in.'}
            </p>
          </Step>

          <Step
            number={3}
            title="Agendar ou enviar"
            description="A partir daqui o e-mail sai para clientes de verdade."
            blocked={
              !counted
                ? 'Conte o público no passo 1 antes de disparar. Enviar sem saber o alcance é como uma base inteira recebe algo por engano.'
                : null
            }
          >
            <fieldset disabled={!counted}>
              <legend className="mb-1.5 text-[13px] font-semibold text-ink">Quando enviar</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    [
                      'now',
                      'Enviar agora',
                      scheduledAhead
                        ? 'Fura o agendamento: entra na fila agora e a data marcada é apagada.'
                        : 'Entra na fila imediatamente.',
                    ],
                    [
                      'schedule',
                      'Agendar',
                      'Grava a data. O job envia na hora marcada, nada sai agora.',
                    ],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label
                    key={value}
                    className={cx(
                      'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px] transition-colors',
                      counted ? 'cursor-pointer' : 'cursor-not-allowed',
                      mode === value
                        ? 'border-accent bg-accent/10'
                        : 'border-line bg-surface hover:bg-app'
                    )}
                  >
                    <input
                      type="radio"
                      name="campanha-modo"
                      value={value}
                      checked={mode === value}
                      onChange={() => setMode(value)}
                      className="mt-0.5 h-4 w-4 accent-accent"
                    />
                    <span>
                      <span className="block font-semibold text-ink">{label}</span>
                      <span className="block text-xs text-ink-muted">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {mode === 'schedule' && (
              <Field
                label="Data e hora do envio"
                htmlFor="campanha-agenda"
                hint="Horário do seu computador. O job varre de hora em hora, então o envio sai na virada da hora seguinte."
                error={scheduledAt && !scheduleValid ? 'Escolha um momento no futuro.' : null}
              >
                <input
                  id="campanha-agenda"
                  type="datetime-local"
                  value={scheduledAt}
                  disabled={!counted}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  className={inputClass}
                />
              </Field>
            )}

            <Field
              label={mode === 'schedule' ? 'Motivo do agendamento' : 'Motivo do disparo'}
              htmlFor="campanha-motivo"
              hint="Fica no registro de auditoria. Sem motivo não há envio nem agendamento. É o que permite explicar depois por que esta campanha saiu."
              error={reason.length > 0 && !reasonValid ? 'Escreva pelo menos 5 caracteres.' : null}
            >
              <input
                id="campanha-motivo"
                type="text"
                value={reason}
                disabled={!counted}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ex.: comunicado da função de agendamento, aprovado em 09/09."
                className={inputClass}
              />
            </Field>

            {!testSent && counted && (
              <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-[13px] leading-relaxed text-warning-ink">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Você ainda não enviou um teste para si mesmo (passo 2).</span>
              </p>
            )}

            {emptyAudience && (
              <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-[13px] leading-relaxed text-warning-ink">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Ninguém neste recorte consentiu em receber novidades, então o envio agora não
                  alcançaria ninguém, e o servidor marcaria a campanha como enviada, sem
                  permitir mandá-la de novo. Agendar continua liberado: até a data, alguém pode
                  consentir.
                </span>
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="primary"
                disabled={!canDispatch}
                onClick={() => setConfirming(true)}
              >
                {mode === 'schedule' ? (
                  <CalendarClock aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Send aria-hidden="true" className="h-4 w-4" />
                )}
                {mode === 'schedule' ? 'Agendar campanha' : 'Enviar agora'}
              </Button>

              {scheduledAhead && (
                <Button
                  type="button"
                  variant="secondary"
                  loading={dispatching}
                  disabled={!reasonValid}
                  onClick={onUnschedule}
                >
                  <CalendarX aria-hidden="true" className="h-4 w-4" />
                  Cancelar agendamento
                </Button>
              )}
            </div>
          </Step>
        </div>
      )}

      {notice && (
        <p
          role="status"
          className={cx(
            'rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed',
            notice.tone === 'info'
              ? 'border-line bg-app text-ink-muted'
              : 'border-danger/25 bg-danger/10 text-danger-ink'
          )}
        >
          {notice.message}
        </p>
      )}

      {formError && (
        <p role="alert" className="text-[13px] font-medium text-danger-ink">
          {formError}
        </p>
      )}

      {confirming && count && (
        <Modal
          title={mode === 'schedule' ? 'Confirmar agendamento' : 'Confirmar envio'}
          description={
            mode === 'schedule'
              ? 'A campanha sai sozinha na data marcada. Até lá, ainda dá para cancelar.'
              : 'Depois disto não há como recolher o que já saiu.'
          }
          onClose={() => setConfirming(false)}
          footer={
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={dispatching}
              >
                Cancelar
              </Button>
              <Button type="button" variant="primary" loading={dispatching} onClick={onDispatch}>
                {mode === 'schedule' ? 'Agendar' : 'Enviar agora'}
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-[13px] leading-relaxed text-ink-muted">
            {/* A confirmação REPETE o número. Quem clicou em "enviar agora"
                dois passos atrás já não tem o alcance na frente dos olhos. */}
            <p className="rounded-lg border border-line bg-app px-3 py-3 text-ink">
              <strong className="money text-lg font-bold">{formatNumber(count.optedIn)}</strong>{' '}
              {count.optedIn === 1 ? 'pessoa vai receber' : 'pessoas vão receber'} “
              {subject.trim() || 'sem assunto'}”.
            </p>
            <p>
              <span className="money font-bold text-ink">{formatNumber(count.withoutOptIn)}</span>{' '}
              ficam de fora por não terem aceitado receber novidades. Isso é o filtro
              de consentimento funcionando, e não uma falha.
            </p>
            {mode === 'schedule' && scheduledIso && (
              <p>
                Envio marcado para{' '}
                <strong className="text-ink">{formatDateTime(scheduledIso)}</strong>. O número acima
                é do recorte de hoje: na data, quem tiver consentido no meio do caminho também
                recebe.
              </p>
            )}
            {mode === 'now' && scheduledAhead && campaign?.scheduledAt && (
              <p>
                Isto <strong className="text-ink">apaga o agendamento</strong> de{' '}
                {formatDateTime(campaign.scheduledAt)} e manda agora.
              </p>
            )}
            <p>
              Motivo registrado: <strong className="text-ink">{reason.trim()}</strong>
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CampanhaEditorPage;
