import type { EmailMessage, Prisma } from '@prisma/client';

import prisma from '../lib/prisma';
import { isEmailDispatchEnabled, warnEmailDispatchDisabledOnce } from '../lib/email-dispatch';
import { settingsService } from './settings.service';

/**
 * ─── Fila de e-mail (padrão outbox) ─────────────────────────────────────────
 *
 * POR QUE EXISTE: até 2026-09-09 todo envio era SÍNCRONO ao pedido. Provedor
 * fora do ar significava e-mail PERDIDO — não adiado —, não havia retentativa e
 * não havia onde olhar quando um cliente dizia "não recebi o convite". São as
 * três lacunas que [[email-e-provedores-smtp]] §7 lista, e as três são a mesma
 * tabela: `EmailMessage`.
 *
 * O desenho é COPIADO de `event-dispatcher.service.ts` de propósito (lote de
 * 50, 5 tentativas, backoff 30s→1h, trava anti-sobreposição): duas filas com
 * comportamentos diferentes no mesmo processo seriam duas coisas para depurar
 * às 3h da manhã, e a de e-mail não tem nenhum requisito que justifique
 * divergir.
 *
 * O QUE É NOVO AQUI, e não existe no despachante de eventos:
 *
 *   1. **Prioridade por `kind`.** Uma campanha de 500 destinatários NÃO pode
 *      atrasar uma redefinição de senha. Sem isso, o primeiro disparo de
 *      "novidades" empurraria todo transacional para o fim de uma fila de 500 —
 *      e quem clicou em "esqueci minha senha" esperaria a campanha inteira sair.
 *      É este o motivo de o campo `kind` existir no schema.
 *
 *   2. **Supressão de marketing.** `kind: 'campaign'` só sai para quem tem
 *      `marketingOptInAt`. A checagem é feita NA HORA DE ENVIAR, e não só na
 *      hora de enfileirar, porque entre uma coisa e outra a pessoa pode ter
 *      clicado no link de descadastro — e mandar mesmo assim transformaria o
 *      link de descadastro em enfeite (LGPD art. 18, direito de oposição).
 *
 * Garantia de entrega: PELO MENOS UMA VEZ para o provedor. A idempotência de
 * quem enfileira é responsabilidade de `dedupeKey` (ver `enqueue`).
 */

/** Tentativas antes de declarar a mensagem morta (`failed`) e parar. */
export const EMAIL_MAX_ATTEMPTS = 5;

/** Mensagens lidas por varredura. */
export const EMAIL_BATCH_SIZE = 50;

/**
 * Teto de mensagens entregues por DIA, somando todos os tipos.
 *
 * 450, e não 500, de propósito: a caixa Gmail padrão da instalação entrega
 * cerca de 500 destinatários por dia, e gastar a cota inteira deixa zero de
 * folga para o convite ou a redefinição de senha que aparecerem no fim do dia.
 * A margem é o ponto.
 *
 * `EMAIL_DAILY_LIMIT=0` (ou vazio) desliga o teto — o certo depois de migrar
 * para um transacional (Brevo, Resend), onde o limite é outro e é do plano.
 */
export const EMAIL_DAILY_LIMIT: number | null = (() => {
  const raw = process.env.EMAIL_DAILY_LIMIT?.trim();
  if (raw === undefined || raw === '') return 450;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
})();

/** Meia-noite local do dia de `reference` — a janela em que a cota é contada. */
export function startOfDay(reference: Date): Date {
  const day = new Date(reference);
  day.setHours(0, 0, 0, 0);
  return day;
}

/** Espera da 1ª retentativa. Dobra a cada falha (30s, 1min, 2min, 4min…). */
export const EMAIL_BACKOFF_BASE_MS = 30_000;

/** Teto do backoff — 1h. Sem teto, a 10ª tentativa cairia em dias. */
export const EMAIL_BACKOFF_MAX_MS = 60 * 60 * 1000;

export type EmailKind = 'transactional' | 'automation' | 'campaign';

export type EmailStatus = 'queued' | 'sent' | 'failed' | 'bounced' | 'suppressed';

/**
 * Ordem de atendimento da fila. Não é alfabética nem por data: é a resposta a
 * "quem espera pior". Transacional está SEMPRE ligado a uma ação que a pessoa
 * acabou de fazer (senha, convite, comprovante); automação é um aviso com dias
 * de antecedência; campanha não tem hora marcada nenhuma.
 */
export const EMAIL_KIND_PRIORITY: readonly EmailKind[] = [
  'transactional',
  'automation',
  'campaign',
] as const;

export interface EnqueueInput {
  toEmail: string;
  subject: string;
  htmlBody: string;
  /** Padrão `transactional`: o tipo mais urgente é o que não se esquece de marcar. */
  kind?: EmailKind;
  templateKey?: string | null;
  campaignId?: string | null;
  organizationId?: string | null;
  toUserId?: string | null;
  /**
   * Chave de idempotência. Colisão NÃO é erro — significa "já foi enfileirado",
   * e a mensagem existente é devolvida. Ver `enqueue`.
   */
  dedupeKey?: string | null;
}

/** Uma mensagem pronta para o provedor. */
export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  /** Cabeçalhos extras (`List-Unsubscribe` nas campanhas). */
  headers?: Record<string, string>;
}

/**
 * Quem efetivamente coloca a mensagem no provedor.
 *
 * É uma interface, e não uma chamada direta ao nodemailer, por dois motivos: o
 * teste injeta um transporte falso (a suíte não pode depender de SMTP nem de
 * rede) e o dia em que entrar API HTTP de provedor (Resend/Brevo) muda um
 * arquivo só.
 */
export interface EmailTransport {
  send(message: OutgoingEmail): Promise<{ messageId?: string | null }>;
}

export interface EmailDispatchOptions {
  /** Instante lógico da varredura. Injetável para teste de backoff. */
  now?: Date;
  batchSize?: number;
  maxAttempts?: number;
  /** Substitui o transporte real (usado nos testes). */
  transport?: EmailTransport;
  /** Teto do dia. `null` desliga. Injetável para teste. */
  dailyLimit?: number | null;
}

export interface EmailDispatchOutcome {
  messageId: string;
  kind: string;
  status: EmailStatus;
  attempts: number;
  nextAttemptAt: Date | null;
  error?: string;
}

export interface EmailSweepResult {
  processed: number;
  sent: number;
  suppressed: number;
  /** Falhou agora e vai voltar (ainda tem tentativa). */
  retrying: number;
  /** Estourou `EMAIL_MAX_ATTEMPTS` e virou `failed`. */
  failed: number;
  /**
   * `true` quando a varredura nem começou por falta de SMTP configurado.
   * NÃO é erro: o sistema sobe sem provedor de e-mail e apenas não envia.
   */
  skippedNoSmtp: boolean;
  /** `true` quando outra varredura já estava rodando (trava anti-sobreposição). */
  skippedOverlap: boolean;
  /**
   * Quantas mensagens ainda cabem na cota do dia. `null` = sem teto configurado.
   *
   * Zero NÃO é falha: é a fila esperando o dia virar, exatamente como esperaria
   * um provedor fora do ar.
   */
  dailyRemaining?: number | null;
  outcomes: EmailDispatchOutcome[];
}

export interface EmailQueueStatus {
  queued: number;
  /** Enfileirados já vencidos (`nextAttemptAt` nulo ou no passado). */
  due: number;
  sent: number;
  failed: number;
  suppressed: number;
  oldestQueuedAt: Date | null;
  oldestQueuedAgeMs: number | null;
}

/**
 * Espera antes da próxima tentativa: exponencial a partir de
 * `EMAIL_BACKOFF_BASE_MS`, limitada por `EMAIL_BACKOFF_MAX_MS`.
 * `attempts` é o número de tentativas JÁ feitas (>= 1).
 */
export function emailBackoffMs(attempts: number): number {
  const exponent = Math.max(0, attempts - 1);
  const delay = EMAIL_BACKOFF_BASE_MS * 2 ** exponent;
  return Math.min(delay, EMAIL_BACKOFF_MAX_MS);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return String(err);
  } catch {
    return 'erro desconhecido';
  }
}

/** Log estruturado — uma linha JSON por mensagem. */
function log(payload: Record<string, unknown>): void {
  try {
    console.log(`[email-dispatch] ${JSON.stringify(payload)}`);
  } catch {
    console.log('[email-dispatch] (payload não serializável)', payload);
  }
}

export class EmailQueueService {
  /**
   * Trava anti-sobreposição no SERVIÇO, e não só no timer do job.
   *
   * O despachante de eventos guarda a trava apenas no job porque um tratador é
   * rápido. Aqui não: um lote de 50 envios SMTP pode passar do intervalo do
   * timer com folga, e uma segunda varredura entrando no meio pegaria as mesmas
   * mensagens ainda `queued` — o cliente receberia o mesmo e-mail duas vezes.
   * Como a rota de campanha e um script manual também podem chamar
   * `dispatchPending`, a trava tem que morar aqui.
   *
   * ATENÇÃO ao escalar: isto protege UMA instância. Rodar duas exige um passo de
   * reserva no banco (`updateMany` marcando a mensagem antes de enviar).
   */
  private sweeping = false;

  /**
   * Enfileira uma mensagem. NÃO envia — quem envia é `dispatchPending`.
   *
   * `dedupeKey` é o que impede o mesmo aviso sair duas vezes quando o job de
   * automação roda de novo depois de um reinício. A colisão do índice único
   * (P2002) é tratada como SUCESSO e devolve a linha que já existia: quem
   * chama não precisa saber se foi o primeiro a pedir, só que a mensagem está
   * na fila. Tratar como erro obrigaria todo chamador a repetir esse `catch`,
   * e o primeiro que esquecesse derrubaria o job inteiro por causa de um
   * e-mail que JÁ tinha sido enfileirado.
   */
  async enqueue(input: EnqueueInput): Promise<EmailMessage> {
    const toEmail = input.toEmail.trim().toLowerCase();
    const kind: EmailKind = input.kind ?? 'transactional';

    const data: Prisma.EmailMessageUncheckedCreateInput = {
      toEmail,
      toUserId: input.toUserId ?? null,
      organizationId: input.organizationId ?? null,
      kind,
      templateKey: input.templateKey ?? null,
      campaignId: input.campaignId ?? null,
      subject: input.subject,
      htmlBody: input.htmlBody,
      status: 'queued',
      dedupeKey: input.dedupeKey ?? null,
    };

    try {
      return await prisma.emailMessage.create({ data });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002' && input.dedupeKey) {
        const existing = await prisma.emailMessage.findUnique({
          where: { dedupeKey: input.dedupeKey },
        });
        if (existing) {
          log({ result: 'deduped', dedupeKey: input.dedupeKey, messageId: existing.id });
          return existing;
        }
      }
      throw err;
    }
  }

  /**
   * Varre a fila e envia. Nunca lança: falha de uma mensagem não derruba o lote,
   * e falha de infra no meio do lote deixa o resto para a próxima varredura.
   */
  async dispatchPending(options: EmailDispatchOptions = {}): Promise<EmailSweepResult> {
    const result: EmailSweepResult = {
      processed: 0,
      sent: 0,
      suppressed: 0,
      retrying: 0,
      failed: 0,
      skippedNoSmtp: false,
      skippedOverlap: false,
      outcomes: [],
    };

    if (this.sweeping) {
      result.skippedOverlap = true;
      return result;
    }
    this.sweeping = true;

    try {
      const now = options.now ?? new Date();
      const batchSize = options.batchSize ?? EMAIL_BATCH_SIZE;

      // SEM SMTP A VARREDURA NEM COMEÇA — e isso é regra, não conveniência.
      //
      // Se a ausência de provedor virasse "falha de envio", cada mensagem
      // queimaria as 5 tentativas em ~2h e a fila inteira estaria `failed`
      // antes de alguém configurar o SMTP pelo painel. Ou seja: instalar o
      // sistema e configurar o e-mail no dia seguinte perderia todo convite
      // emitido no primeiro dia. Sem provedor, as mensagens ficam `queued`
      // esperando — que é exatamente o que a fila existe para fazer.
      const transport = options.transport ?? (await createDefaultTransport());
      if (!transport) {
        result.skippedNoSmtp = true;
        return result;
      }

      // ─── TETO DIÁRIO DE ENVIO ────────────────────────────────────────────
      //
      // O padrão de fábrica é uma caixa Gmail, que entrega cerca de **500
      // destinatários por dia**. Estourar essa cota não devolve "erro de
      // envio": o provedor BLOQUEIA a conta por um tempo — e junto com a
      // campanha param o convite de usuário e a redefinição de senha, que são
      // as mensagens que ninguém pode perder.
      //
      // Por isso o teto é da FILA e não da campanha: o risco não vem de um
      // disparo grande, vem da soma de tudo no mesmo dia. O alerta de tela
      // offline, por exemplo, escala com o número de TELAS — num incidente de
      // rede ele sozinho passa de 500.
      //
      // Atingir o teto deixa as mensagens `queued`, nunca `failed`: elas saem
      // amanhã. E como a fila já ordena `transactional` antes de `campaign`, o
      // que sobra de cota vai primeiro para o que é operacional.
      const dailyLimit = options.dailyLimit ?? EMAIL_DAILY_LIMIT;
      let remaining: number | null = null;
      if (dailyLimit !== null) {
        const sentToday = await prisma.emailMessage.count({
          where: { status: 'sent', sentAt: { gte: startOfDay(now) } },
        });
        remaining = Math.max(0, dailyLimit - sentToday);
        result.dailyRemaining = remaining;
        if (remaining === 0) {
          log({ result: 'daily_limit_reached', scope: 'sweep', dailyLimit, sentToday });
          return result;
        }
      }

      const messages = await this.claimBatch(
        now,
        remaining === null ? batchSize : Math.min(batchSize, remaining)
      );

      for (const message of messages) {
        let outcome: EmailDispatchOutcome;
        try {
          outcome = await this.deliverOne(message, transport, now, options.maxAttempts);
        } catch (err) {
          // Cinto de segurança: banco fora no meio do lote não pode interromper
          // a varredura. A mensagem continua `queued` e volta na próxima.
          const error = errorMessage(err);
          log({ messageId: message.id, result: 'error', scope: 'sweep', error });
          outcome = {
            messageId: message.id,
            kind: message.kind,
            status: 'queued',
            attempts: message.attempts,
            nextAttemptAt: message.nextAttemptAt,
            error,
          };
        }

        result.processed += 1;
        result.outcomes.push(outcome);

        if (outcome.status === 'sent') result.sent += 1;
        else if (outcome.status === 'suppressed') result.suppressed += 1;
        else if (outcome.status === 'failed') result.failed += 1;
        else result.retrying += 1;
      }

      return result;
    } finally {
      this.sweeping = false;
    }
  }

  /**
   * Lê o lote respeitando a prioridade de `kind`.
   *
   * São consultas separadas por tipo, e não um `orderBy` só, porque a prioridade
   * é por uma ORDEM ARBITRÁRIA de strings — o Postgres ordenaria
   * `automation < campaign < transactional` no alfabeto, exatamente o contrário
   * do que se quer. Um `CASE WHEN` em SQL cru resolveria, mas custaria sair do
   * Prisma numa consulta que roda a cada 15 segundos.
   *
   * Dentro de cada tipo, a ordem é de chegada.
   */
  private async claimBatch(now: Date, batchSize: number): Promise<EmailMessage[]> {
    const picked: EmailMessage[] = [];

    for (const kind of EMAIL_KIND_PRIORITY) {
      const remaining = batchSize - picked.length;
      if (remaining <= 0) break;

      const rows = await prisma.emailMessage.findMany({
        where: {
          status: 'queued',
          kind,
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        },
        orderBy: { createdAt: 'asc' },
        take: remaining,
      });

      picked.push(...rows);
    }

    return picked;
  }

  /** Entrega UMA mensagem. Nunca lança por erro de envio. */
  private async deliverOne(
    message: EmailMessage,
    transport: EmailTransport,
    now: Date,
    maxAttempts = EMAIL_MAX_ATTEMPTS
  ): Promise<EmailDispatchOutcome> {
    // ── Supressão de marketing ────────────────────────────────────────────
    // Só campanha passa por aqui. Vencimento, inadimplência e não-renovação
    // são EXECUÇÃO DE CONTRATO (LGPD art. 7º, V): vão para todo mundo, com ou
    // sem opt-in. Exigir consentimento para avisar que a assinatura vence
    // deixaria o cliente sem aviso justamente antes de perder o acesso.
    if (message.kind === 'campaign') {
      const allowed = await this.hasMarketingOptIn(message);
      if (!allowed) {
        await this.persist(message.id, {
          status: 'suppressed',
          attempts: message.attempts,
          nextAttemptAt: null,
          lastError: 'destinatário sem opt-in de marketing (LGPD art. 7º)',
        });
        await bumpCampaignCounter(message.campaignId, 'suppressedCount');
        log({ messageId: message.id, kind: message.kind, result: 'suppressed' });
        return {
          messageId: message.id,
          kind: message.kind,
          status: 'suppressed',
          attempts: message.attempts,
          nextAttemptAt: null,
        };
      }
    }

    const attempt = message.attempts + 1;

    try {
      const prepared = await prepareOutgoing(message);
      const sent = await transport.send(prepared);

      await this.persist(message.id, {
        status: 'sent',
        attempts: attempt,
        sentAt: now,
        nextAttemptAt: null,
        lastError: null,
        providerMessageId: sent.messageId ?? null,
      });
      await bumpCampaignCounter(message.campaignId, 'sentCount');

      log({ messageId: message.id, kind: message.kind, attempt, result: 'sent' });
      return {
        messageId: message.id,
        kind: message.kind,
        status: 'sent',
        attempts: attempt,
        nextAttemptAt: null,
      };
    } catch (err) {
      const error = errorMessage(err).slice(0, 1000);
      const exhausted = attempt >= maxAttempts;
      const nextAttemptAt = exhausted ? null : new Date(now.getTime() + emailBackoffMs(attempt));

      await this.persist(message.id, {
        // Mensagem morta fica `failed` e PARA. Ficar girando para sempre esconde
        // o problema; `failed` aparece no histórico do backoffice e tem botão de
        // reenvio.
        status: exhausted ? 'failed' : 'queued',
        attempts: attempt,
        nextAttemptAt,
        lastError: error,
      });
      if (exhausted) await bumpCampaignCounter(message.campaignId, 'failedCount');

      log({
        messageId: message.id,
        kind: message.kind,
        attempt,
        maxAttempts,
        result: exhausted ? 'failed' : 'retry',
        nextAttemptAt: nextAttemptAt?.toISOString() ?? null,
        error,
      });

      return {
        messageId: message.id,
        kind: message.kind,
        status: exhausted ? 'failed' : 'queued',
        attempts: attempt,
        nextAttemptAt,
        error,
      };
    }
  }

  /**
   * `true` quando o destinatário consentiu em receber marketing.
   *
   * Destinatário que NÃO é usuário do sistema (e-mail digitado à mão numa lista)
   * responde `false`: não existe registro de consentimento dele, e "não sei" em
   * marketing significa NÃO (LGPD art. 8º — o consentimento tem que ser
   * demonstrável, e o ônus da prova é de quem envia).
   */
  private async hasMarketingOptIn(message: EmailMessage): Promise<boolean> {
    const user = message.toUserId
      ? await prisma.user.findUnique({
          where: { id: message.toUserId },
          select: { marketingOptInAt: true },
        })
      : await prisma.user.findUnique({
          where: { email: message.toEmail },
          select: { marketingOptInAt: true },
        });

    return !!user?.marketingOptInAt;
  }

  /**
   * Grava o resultado. Tolera a mensagem ter sumido entre a leitura do lote e a
   * gravação (`P2025`) — não é motivo para derrubar a varredura.
   */
  private async persist(id: string, data: Prisma.EmailMessageUpdateInput): Promise<boolean> {
    try {
      await prisma.emailMessage.update({ where: { id }, data });
      return true;
    } catch (err) {
      if ((err as { code?: string }).code === 'P2025') {
        log({ messageId: id, result: 'vanished' });
        return false;
      }
      throw err;
    }
  }

  /** Retrato da fila, para painel/healthcheck. */
  async getQueueStatus(now: Date = new Date()): Promise<EmailQueueStatus> {
    const [grouped, due, oldest] = await Promise.all([
      prisma.emailMessage.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.emailMessage.count({
        where: {
          status: 'queued',
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        },
      }),
      prisma.emailMessage.findFirst({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);

    const count = (status: EmailStatus): number =>
      grouped.find((g) => g.status === status)?._count._all ?? 0;

    return {
      queued: count('queued'),
      due,
      sent: count('sent'),
      failed: count('failed'),
      suppressed: count('suppressed'),
      oldestQueuedAt: oldest?.createdAt ?? null,
      oldestQueuedAgeMs: oldest ? now.getTime() - oldest.createdAt.getTime() : null,
    };
  }

  /**
   * Devolve uma mensagem `failed` (ou `bounced`) para a fila, com as tentativas
   * zeradas. É o reenvio manual do backoffice, depois de corrigido o motivo.
   *
   * NÃO aceita `suppressed`: aquilo não é falha, é uma pessoa que não consentiu.
   * Reenfileirar seria burlar a supressão pelo botão de "reenviar".
   */
  async retry(messageId: string): Promise<EmailMessage | null> {
    const message = await prisma.emailMessage.findUnique({ where: { id: messageId } });
    if (!message) return null;
    if (message.status !== 'failed' && message.status !== 'bounced') return null;

    const updated = await prisma.emailMessage.update({
      where: { id: messageId },
      data: { status: 'queued', attempts: 0, nextAttemptAt: null, lastError: null },
    });

    log({ messageId, result: 'requeued' });
    return updated;
  }

  /** Histórico, com filtro por status/organização/campanha. */
  async list(filter: {
    status?: string;
    organizationId?: string;
    campaignId?: string;
    kind?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; items: EmailMessage[] }> {
    const where: Prisma.EmailMessageWhereInput = {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.organizationId ? { organizationId: filter.organizationId } : {}),
      ...(filter.campaignId ? { campaignId: filter.campaignId } : {}),
      ...(filter.kind ? { kind: filter.kind } : {}),
    };

    const take = Math.min(Math.max(filter.limit ?? 50, 1), 200);
    const skip = Math.max(filter.offset ?? 0, 0);

    const [total, items] = await Promise.all([
      prisma.emailMessage.count({ where }),
      prisma.emailMessage.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
    ]);

    return { total, items };
  }
}

/**
 * Soma 1 num contador da campanha. Best effort de propósito: contador errado é
 * um número feio num painel; exceção aqui abortaria o envio de uma mensagem que
 * JÁ saiu, e a retentativa mandaria o e-mail de novo.
 */
async function bumpCampaignCounter(
  campaignId: string | null,
  field: 'sentCount' | 'failedCount' | 'suppressedCount'
): Promise<void> {
  if (!campaignId) return;
  try {
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { [field]: { increment: 1 } },
    });
  } catch {
    /* contador é telemetria, não pode derrubar envio */
  }
}

/**
 * Monta a mensagem final a partir da linha da fila.
 *
 * O import de `email.service` é DINÂMICO (vira `require` preguiçoso no
 * CommonJS) porque `email.service` importa esta fila para enfileirar: um import
 * estático dos dois lados criaria um ciclo resolvido na ordem de carga dos
 * módulos, que funciona até o dia em que alguém reordena um `import` e recebe
 * `undefined` em produção.
 */
async function prepareOutgoing(message: EmailMessage): Promise<OutgoingEmail> {
  const { buildCampaignDelivery } = await import('./email.service');

  if (message.kind === 'campaign') {
    return buildCampaignDelivery(message);
  }

  return { to: message.toEmail, subject: message.subject, html: message.htmlBody };
}

/**
 * Transporte real: o SMTP configurado pelo `master` (ou o do ambiente).
 * Devolve `null` quando não há configuração — ver a nota em `dispatchPending`
 * sobre por que isso NÃO é falha de envio.
 */
async function createDefaultTransport(): Promise<EmailTransport | null> {
  // Envio desligado neste ambiente (INF-18): igual a "sem SMTP" — a varredura
  // não começa e as mensagens continuam `queued`. Nunca `sent`, nunca `failed`.
  if (!isEmailDispatchEnabled()) {
    warnEmailDispatchDisabledOnce();
    return null;
  }

  const smtp = await settingsService.getSmtpConfig();
  if (!smtp || !smtp.host) return null;

  const { createTransporter, formatFrom, getLogoAttachment } = await import('./email.service');
  // `pooled`: uma conexão para o lote inteiro. Sem isto, cada mensagem faz um
  // login novo e o provedor trata o lote como ataque — ver a nota extensa em
  // `createTransporter`.
  const transporter = await createTransporter({ pooled: true });
  if (!transporter) return null;

  return {
    async send(outgoing: OutgoingEmail) {
      const info = await transporter.sendMail({
        from: formatFrom(smtp),
        to: outgoing.to,
        subject: outgoing.subject,
        html: outgoing.html,
        headers: outgoing.headers,
        attachments: getLogoAttachment(),
      });
      return { messageId: (info as { messageId?: string }).messageId ?? null };
    },
  };
}

export const emailQueueService = new EmailQueueService();
