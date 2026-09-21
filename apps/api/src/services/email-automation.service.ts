import type { EmailAutomation, Plan, Subscription } from '@prisma/client';

import prisma from '../lib/prisma';
import { emailQueueService } from './email-queue.service';
import {
  PAST_DUE_GRACE_DAYS,
  estimateCycleCents,
  type BillingInterval,
} from './subscription.service';

/**
 * ─── Automações de ciclo de vida da assinatura ──────────────────────────────
 *
 * Catálogo FECHADO de nove gatilhos. Fechado de propósito: cada um deles
 * corresponde a um momento do contrato que já existe no schema
 * (`currentPeriodEnd`, `pastDueSince`, `cancelReason`), e um gatilho "livre"
 * exigiria uma linguagem de condições que ninguém vai manter. O que o `master`
 * edita é o TEXTO, o LIGA/DESLIGA e os DIAS — nunca a regra.
 *
 * ── LGPD: por que isto NÃO exige opt-in ──────────────────────────────────────
 * Aviso de vencimento, de inadimplência e de não-renovação é EXECUÇÃO DE
 * CONTRATO (art. 7º, V), não marketing. Exigir consentimento para avisar que a
 * assinatura vence deixaria o cliente sem aviso justamente antes de perder o
 * acesso — o oposto do que a lei protege. Por isso estas mensagens saem com
 * `kind: 'automation'`, que a fila NÃO submete à checagem de opt-in. Só
 * campanha ("novidades") passa por lá.
 *
 * ── A regra do dinheiro (defeito US-A-05) ────────────────────────────────────
 * O valor que vai no e-mail é o do CICLO (`estimateCycleCents`), nunca o mensal
 * equivalente. Numa assinatura anual do Loja com 3 telas, o mensal equivalente
 * é R$ 117 e a cobrança é R$ 1.404. Mandar "R$ 117" para quem vai ver R$ 1.404
 * na fatura é repetir o defeito que já custou caro neste projeto — e, aqui,
 * seria informação de preço errada num aviso de cobrança (CDC art. 31).
 *
 * ── Idempotência ─────────────────────────────────────────────────────────────
 * Toda mensagem carrega `dedupeKey = <template>:<organização>:<âncora>`. Sem
 * isso, um reinício do processo (deploy, queda, execução manual do job) manda o
 * mesmo D-3 duas vezes. A âncora é a data que originou o disparo — o fim do
 * ciclo, o início da inadimplência, o cancelamento —, então ela só muda quando
 * o evento é genuinamente outro.
 */

export type AutomationKey =
  | 'renewal_d7'
  | 'renewal_d3'
  | 'renewal_d0'
  | 'past_due_d1'
  | 'past_due_d5'
  | 'past_due_d9'
  | 'not_renewed_d3'
  | 'welcome_d1'
  | 'inactive_d14';

/**
 * A que data o gatilho se ancora. Define o `where` da varredura E a âncora da
 * chave de idempotência.
 */
export type AutomationTrigger =
  | 'renewal'
  | 'past_due'
  | 'not_renewed'
  | 'welcome'
  | 'inactive';

export interface AutomationDefinition {
  key: AutomationKey;
  trigger: AutomationTrigger;
  /** Negativo = ANTES do evento (D-7 = -7). */
  defaultOffsetDays: number;
  /**
   * Só assinaturas anuais. Existe por um motivo prático: no mensal, um aviso
   * com 7 dias de antecedência chega quatro vezes por mês na caixa de quem paga
   * em dia — vira ruído e ensina o cliente a ignorar o remetente, prejudicando
   * inclusive os avisos que importam.
   */
  yearlyOnly?: boolean;
  /** Rótulo curto para a tela de automações do backoffice. */
  label: string;
  defaultSubject: string;
  /** Fragmento HTML; o layout do sistema é aplicado no envio. */
  defaultHtmlBody: string;
}

/** Variáveis aceitas no assunto e no corpo. O painel lê esta lista. */
export const AUTOMATION_VARIABLES = [
  '{{nome}}',
  '{{empresa}}',
  '{{plano}}',
  '{{vencimento}}',
  '{{valor}}',
  '{{link}}',
] as const;

const APP_URL = process.env.APP_URL || 'https://display.proxserverabner.site';
const PANEL_URL = `${APP_URL}/#/login`;

function p(text: string): string {
  return `<p style="margin:0 0 14px;color:#94a3b8;font-size:14px;line-height:1.7;">${text}</p>`;
}

function h(text: string): string {
  return `<h2 style="margin:0 0 12px;color:#e2e8f0;font-size:20px;font-weight:700;">${text}</h2>`;
}

function cta(label: string): string {
  return `<p style="margin:24px 0 0;"><a href="{{link}}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5 0%,#06b6d4 100%);color:#fff;text-decoration:none;padding:13px 34px;border-radius:12px;font-size:14px;font-weight:700;">${label}</a></p>`;
}

/**
 * O catálogo. `defaultOffsetDays` de `past_due_d9` é DERIVADO de
 * `PAST_DUE_GRACE_DAYS`, nunca escrito como `9`: o último aviso tem que cair na
 * véspera do corte, e o dia do corte está definido em `subscription.service` e
 * PROMETIDO no item 9 dos Termos de Uso. Se a carência mudar para 15 dias e
 * este número ficasse literal, o "último aviso" passaria a chegar seis dias
 * antes do corte — e o cliente ficaria sem o aviso que importa.
 */
export const AUTOMATION_CATALOG: readonly AutomationDefinition[] = [
  {
    key: 'renewal_d7',
    trigger: 'renewal',
    defaultOffsetDays: -7,
    yearlyOnly: true,
    label: 'Renovação anual (7 dias antes)',
    defaultSubject: 'Sua assinatura TelaHub renova em 7 dias',
    defaultHtmlBody: [
      h('Sua assinatura renova em 7 dias'),
      p('Olá, {{nome}}.'),
      p(
        'A assinatura da <strong>{{empresa}}</strong> no plano <strong>{{plano}}</strong> renova em <strong>{{vencimento}}</strong>, no valor de <strong>{{valor}}</strong>.'
      ),
      p(
        'A renovação é automática e você não precisa fazer nada. Se quiser trocar de plano, ajustar o número de telas ou revisar a forma de pagamento, este é o melhor momento.'
      ),
      cta('Ver minha assinatura'),
    ].join('\n'),
  },
  {
    key: 'renewal_d3',
    trigger: 'renewal',
    defaultOffsetDays: -3,
    label: 'Renovação (3 dias antes)',
    defaultSubject: 'Sua assinatura TelaHub renova em 3 dias',
    defaultHtmlBody: [
      h('Sua assinatura renova em 3 dias'),
      p('Olá, {{nome}}.'),
      p(
        'Em <strong>{{vencimento}}</strong> renovamos a assinatura da <strong>{{empresa}}</strong> no plano <strong>{{plano}}</strong>, no valor de <strong>{{valor}}</strong>.'
      ),
      p('Se o cartão mudou ou você prefere pagar de outra forma, atualize antes da data.'),
      cta('Atualizar pagamento'),
    ].join('\n'),
  },
  {
    key: 'renewal_d0',
    trigger: 'renewal',
    defaultOffsetDays: 0,
    label: 'Renovação (no dia)',
    defaultSubject: 'Sua assinatura TelaHub renova hoje',
    defaultHtmlBody: [
      h('Sua assinatura renova hoje'),
      p('Olá, {{nome}}.'),
      p(
        'Hoje ({{vencimento}}) é o dia da renovação da <strong>{{empresa}}</strong> no plano <strong>{{plano}}</strong>, no valor de <strong>{{valor}}</strong>. Suas telas continuam no ar normalmente.'
      ),
      cta('Acessar o painel'),
    ].join('\n'),
  },
  {
    key: 'past_due_d1',
    trigger: 'past_due',
    defaultOffsetDays: 1,
    label: 'Inadimplência (1 dia)',
    defaultSubject: 'Não conseguimos confirmar seu pagamento no TelaHub',
    defaultHtmlBody: [
      h('Não conseguimos confirmar seu pagamento'),
      p('Olá, {{nome}}.'),
      p(
        'A cobrança de <strong>{{valor}}</strong> do plano <strong>{{plano}}</strong> não foi confirmada. Normalmente é algo simples, como limite do cartão, cartão vencido ou um Pix que ficou para depois.'
      ),
      p(
        `Suas telas continuam funcionando normalmente durante ${PAST_DUE_GRACE_DAYS} dias, então dá para resolver com calma.`
      ),
      cta('Regularizar pagamento'),
    ].join('\n'),
  },
  {
    key: 'past_due_d5',
    trigger: 'past_due',
    defaultOffsetDays: 5,
    label: 'Inadimplência (5 dias)',
    defaultSubject: 'Sua fatura TelaHub continua em aberto',
    defaultHtmlBody: [
      h('Sua fatura continua em aberto'),
      p('Olá, {{nome}}.'),
      p(
        'A cobrança de <strong>{{valor}}</strong> do plano <strong>{{plano}}</strong> ainda não foi confirmada. Suas telas seguem no ar, mas o prazo está correndo.'
      ),
      p('Se houve algum problema com a cobrança, é só responder este e-mail que a gente resolve junto.'),
      cta('Regularizar pagamento'),
    ].join('\n'),
  },
  {
    key: 'past_due_d9',
    trigger: 'past_due',
    // Véspera do corte. Derivado, não literal — ver o comentário do catálogo.
    defaultOffsetDays: PAST_DUE_GRACE_DAYS - 1,
    label: `Inadimplência, véspera do corte (D+${PAST_DUE_GRACE_DAYS - 1})`,
    defaultSubject: 'Último aviso: suas telas do TelaHub saem do ar amanhã',
    defaultHtmlBody: [
      h('Último aviso antes da suspensão'),
      p('Olá, {{nome}}.'),
      p(
        `A fatura de <strong>{{valor}}</strong> do plano <strong>{{plano}}</strong> segue em aberto. Amanhã termina o prazo de ${PAST_DUE_GRACE_DAYS} dias previsto nos Termos de Uso e a assinatura da <strong>{{empresa}}</strong> será encerrada.`
      ),
      p(
        'Nada é apagado: telas, mídias e configurações continuam salvos, e voltam a funcionar assim que o pagamento for confirmado.'
      ),
      cta('Pagar agora'),
    ].join('\n'),
  },
  {
    key: 'not_renewed_d3',
    trigger: 'not_renewed',
    defaultOffsetDays: 3,
    label: 'Não renovou (3 dias depois)',
    defaultSubject: 'Suas telas continuam cadastradas no TelaHub',
    defaultHtmlBody: [
      h('Suas telas continuam aqui'),
      p('Olá, {{nome}}.'),
      p(
        'A assinatura da <strong>{{empresa}}</strong> foi encerrada por falta de confirmação do pagamento, mas <strong>nada foi apagado</strong>: telas, mídias e programações continuam salvas.'
      ),
      p('Reativar leva um clique e a conta volta exatamente como estava.'),
      cta('Reativar assinatura'),
    ].join('\n'),
  },
  {
    key: 'welcome_d1',
    trigger: 'welcome',
    defaultOffsetDays: 1,
    label: 'Boas-vindas (1 dia depois)',
    defaultSubject: 'Como colocar sua primeira tela do TelaHub no ar',
    defaultHtmlBody: [
      h('Vamos colocar sua primeira tela no ar?'),
      p('Olá, {{nome}}.'),
      p('A conta da <strong>{{empresa}}</strong> foi criada ontem. São três passos até a TV ligada:'),
      p(
        '1. Crie um display e monte a cena no editor.<br>2. Abra o player na TV e informe o código de pareamento.<br>3. Pronto. Se a tela cair, você recebe um aviso por e-mail.'
      ),
      p('Se travar em algum passo, responda este e-mail. Quem lê é uma pessoa do nosso time.'),
      cta('Abrir o painel'),
    ].join('\n'),
  },
  {
    key: 'inactive_d14',
    trigger: 'inactive',
    defaultOffsetDays: 14,
    label: 'Sem tela no ar (14 dias)',
    defaultSubject: 'Sua conta TelaHub ainda não tem tela no ar',
    defaultHtmlBody: [
      h('Sua conta ainda não tem tela no ar'),
      p('Olá, {{nome}}.'),
      p(
        'A conta da <strong>{{empresa}}</strong> foi criada há duas semanas e nenhuma tela foi pareada ainda. Se ficou faltando alguma coisa (um cabo, um aparelho, uma dúvida sobre o player), responda este e-mail.'
      ),
      p('A primeira tela é gratuita, sem prazo e sem cartão.'),
      cta('Parear minha primeira tela'),
    ].join('\n'),
  },
] as const;

const CATALOG_BY_KEY = new Map<string, AutomationDefinition>(
  AUTOMATION_CATALOG.map((definition) => [definition.key, definition])
);

export function isAutomationKey(key: string): key is AutomationKey {
  return CATALOG_BY_KEY.has(key);
}

export function automationDefinition(key: AutomationKey): AutomationDefinition {
  const definition = CATALOG_BY_KEY.get(key);
  if (!definition) throw new Error(`gatilho desconhecido: ${key}`);
  return definition;
}

// ==============================================================================
// Datas — tudo em UTC
// ==============================================================================

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Janela do DIA de `date`, em UTC.
 *
 * UTC e não o fuso do servidor: `currentPeriodEnd` é gravado em UTC, e casar a
 * janela com o fuso local faria o mesmo cliente cair (ou não) na varredura
 * conforme o `TZ` do contêiner — um aviso que aparece e some conforme a máquina
 * é pior que aviso nenhum, porque ninguém consegue reproduzir.
 */
export function utcDayWindow(date: Date): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
  );
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

function formatDate(date: Date | null): string {
  if (!date) return '-';
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface AutomationVariables {
  nome: string;
  empresa: string;
  plano: string;
  vencimento: string;
  valor: string;
  link: string;
}

/**
 * Substitui as variáveis do template.
 *
 * Escapa o valor ANTES de injetar: nome de empresa é texto que o cliente digita
 * no cadastro, e ele acaba dentro de um HTML que sai da nossa infraestrutura
 * com o nosso domínio no remetente. Sem escapar, um `<a href>` colado no nome
 * da empresa viraria link nosso no e-mail de outra pessoa.
 */
export function renderTemplate(template: string, variables: AutomationVariables): string {
  const values: Record<string, string> = {
    nome: variables.nome,
    empresa: variables.empresa,
    plano: variables.plano,
    vencimento: variables.vencimento,
    valor: variables.valor,
    link: variables.link,
  };

  // Variável desconhecida fica LITERAL no texto (`{{plnao}}` continua
  // `{{plnao}}`) em vez de virar string vazia: um erro de digitação que some
  // sozinho produz uma frase truncada que ninguém percebe até o cliente
  // receber. Aparecendo cru, a prévia do editor denuncia o erro.
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : escapeHtml(value);
  });
}

// ==============================================================================
// Serviço
// ==============================================================================

type SubscriptionWithPlan = Subscription & { plan: Plan };

export interface AutomationSweepResult {
  /** Gatilhos habilitados encontrados. */
  enabled: number;
  /** Assinaturas que casaram com algum gatilho. */
  matched: number;
  /** Mensagens efetivamente enfileiradas (dedupe já descontado). */
  queued: number;
  byKey: Record<string, number>;
}

export class EmailAutomationService {
  /**
   * Cria as nove automações DESABILITADAS, com o texto padrão, sem tocar no que
   * o `master` já editou.
   *
   * O `skipDuplicates` é a regra inteira: seria trivial (e errado) escrever um
   * `upsert` aqui — ele reescreveria a cada reinício o assunto que o dono
   * ajustou, e o texto voltaria ao de fábrica sem ninguém pedir. Semear é uma
   * operação de PRIMEIRA execução, mesmo quando roda todo dia.
   *
   * Nascem desligadas de propósito: ninguém deve começar a receber e-mail
   * automático porque um deploy subiu.
   */
  async seedDefaults(): Promise<number> {
    const existing = await prisma.emailAutomation.findMany({ select: { key: true } });
    const known = new Set(existing.map((row) => row.key));

    const missing = AUTOMATION_CATALOG.filter((definition) => !known.has(definition.key));
    if (missing.length === 0) return 0;

    const created = await prisma.emailAutomation.createMany({
      data: missing.map((definition) => ({
        key: definition.key,
        enabled: false,
        subject: definition.defaultSubject,
        htmlBody: definition.defaultHtmlBody,
        offsetDays: definition.defaultOffsetDays,
      })),
      skipDuplicates: true,
    });

    return created.count;
  }

  /** Catálogo + estado gravado, para a tela de automações. */
  async list(): Promise<
    Array<AutomationDefinition & { enabled: boolean; subject: string; htmlBody: string; offsetDays: number; updatedAt: Date | null }>
  > {
    await this.seedDefaults();
    const rows = await prisma.emailAutomation.findMany();
    const byKey = new Map(rows.map((row) => [row.key, row]));

    return AUTOMATION_CATALOG.map((definition) => {
      const row = byKey.get(definition.key);
      return {
        ...definition,
        enabled: row?.enabled ?? false,
        subject: row?.subject ?? definition.defaultSubject,
        htmlBody: row?.htmlBody ?? definition.defaultHtmlBody,
        offsetDays: row?.offsetDays ?? definition.defaultOffsetDays,
        updatedAt: row?.updatedAt ?? null,
      };
    });
  }

  /** Edição do `master`: liga/desliga, dias, assunto e corpo. */
  async update(
    key: AutomationKey,
    data: { enabled?: boolean; subject?: string; htmlBody?: string; offsetDays?: number }
  ): Promise<EmailAutomation> {
    const definition = automationDefinition(key);

    return prisma.emailAutomation.upsert({
      where: { key },
      update: {
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        ...(data.subject !== undefined ? { subject: data.subject } : {}),
        ...(data.htmlBody !== undefined ? { htmlBody: data.htmlBody } : {}),
        ...(data.offsetDays !== undefined ? { offsetDays: data.offsetDays } : {}),
      },
      create: {
        key,
        enabled: data.enabled ?? false,
        subject: data.subject ?? definition.defaultSubject,
        htmlBody: data.htmlBody ?? definition.defaultHtmlBody,
        offsetDays: data.offsetDays ?? definition.defaultOffsetDays,
      },
    });
  }

  /**
   * Varredura diária: para cada automação habilitada, enfileira o aviso das
   * assinaturas cuja âncora cai no dia alvo.
   *
   * O dia alvo é `now - offsetDays` para TODOS os gatilhos, inclusive os de
   * antecedência: `renewal_d7` tem `offsetDays = -7`, logo o alvo é
   * `now + 7 dias` — a data em que o ciclo termina. Uma fórmula só evita a
   * classe de defeito em que "antes" e "depois" recebem tratamentos diferentes
   * e um deles fica invertido.
   */
  async run(now: Date = new Date()): Promise<AutomationSweepResult> {
    await this.seedDefaults();

    const automations = await prisma.emailAutomation.findMany({ where: { enabled: true } });
    const result: AutomationSweepResult = {
      enabled: automations.length,
      matched: 0,
      queued: 0,
      byKey: {},
    };

    for (const automation of automations) {
      if (!isAutomationKey(automation.key)) continue;
      const definition = automationDefinition(automation.key);

      const window = utcDayWindow(addDays(now, -automation.offsetDays));
      const subscriptions = await this.findTargets(definition, window);
      result.matched += subscriptions.length;

      for (const subscription of subscriptions) {
        try {
          const queued = await this.enqueueFor(definition, automation, subscription);
          if (queued) {
            result.queued += 1;
            result.byKey[automation.key] = (result.byKey[automation.key] ?? 0) + 1;
          }
        } catch (err) {
          // Uma organização com dado estranho (sem usuário, sem plano) não pode
          // impedir o aviso das outras — que é o efeito de deixar a exceção
          // subir num laço que percorre a base inteira.
          console.error(
            `[email-automation] falha em ${automation.key} para ${subscription.organizationId}:`,
            err instanceof Error ? err.message : err
          );
        }
      }
    }

    return result;
  }

  /** Assinaturas que casam com o gatilho na janela do dia alvo. */
  private async findTargets(
    definition: AutomationDefinition,
    window: { start: Date; end: Date }
  ): Promise<SubscriptionWithPlan[]> {
    const range = { gte: window.start, lt: window.end };

    switch (definition.trigger) {
      case 'renewal':
        return prisma.subscription.findMany({
          where: {
            status: 'active',
            currentPeriodEnd: range,
            // Quem já pediu para sair NÃO recebe "sua assinatura renova": para
            // essa pessoa a data não é renovação, é o fim do acesso. Mandar o
            // texto de renovação aqui seria informação errada sobre cobrança.
            cancelAtPeriodEnd: false,
            // Plano grátis não vence e não gera cobrança.
            plan: { pricePerScreenCents: { gt: 0 } },
            ...(definition.yearlyOnly ? { billingInterval: 'yearly' } : {}),
          },
          include: { plan: true },
        });

      case 'past_due':
        return prisma.subscription.findMany({
          where: { status: 'past_due', pastDueSince: range },
          include: { plan: true },
        });

      case 'not_renewed':
        return prisma.subscription.findMany({
          where: {
            status: 'canceled',
            canceledAt: range,
            // A distinção que sustenta a lista: `grace_expired` e
            // `period_end_unpaid` são cobrança que falhou (recuperável). Quem
            // PEDIU para sair recebeu outro motivo e não pode receber um
            // "reative em um clique" — é insistência com quem já disse não.
            cancelReason: { in: ['grace_expired', 'period_end_unpaid'] },
          },
          include: { plan: true },
        });

      case 'welcome':
        return prisma.subscription.findMany({
          where: { createdAt: range },
          include: { plan: true },
        });

      case 'inactive': {
        const candidates = await prisma.subscription.findMany({
          where: { createdAt: range, status: { in: ['active', 'trialing'] } },
          include: { plan: true },
        });

        // "Nunca publicou" = nenhuma tela pareada. `status: 'linked'` é o mesmo
        // critério de "tela ativa" que a cobrança usa (`countResources`), então
        // a régua do e-mail e a da fatura não divergem.
        const filtered: SubscriptionWithPlan[] = [];
        for (const subscription of candidates) {
          const linked = await prisma.device.count({
            where: { organizationId: subscription.organizationId, status: 'linked' },
          });
          if (linked === 0) filtered.push(subscription);
        }
        return filtered;
      }
    }
  }

  /** A data que originou o disparo — vai na chave de idempotência. */
  private anchorFor(
    definition: AutomationDefinition,
    subscription: SubscriptionWithPlan
  ): Date | null {
    switch (definition.trigger) {
      case 'renewal':
        return subscription.currentPeriodEnd;
      case 'past_due':
        return subscription.pastDueSince;
      case 'not_renewed':
        return subscription.canceledAt ?? subscription.currentPeriodEnd;
      case 'welcome':
      case 'inactive':
        return subscription.createdAt;
    }
  }

  /**
   * Monta e enfileira o aviso de UMA assinatura. Devolve `false` quando não há
   * a quem enviar.
   */
  private async enqueueFor(
    definition: AutomationDefinition,
    automation: EmailAutomation,
    subscription: SubscriptionWithPlan
  ): Promise<boolean> {
    const recipient = await this.recipientFor(subscription.organizationId);
    if (!recipient) return false;

    const anchor = this.anchorFor(definition, subscription);
    if (!anchor) return false;

    const variables = await this.variablesFor(subscription, recipient.name ?? recipient.email);
    const { wrapInLayout } = await import('./email.service');

    await emailQueueService.enqueue({
      toEmail: recipient.email,
      toUserId: recipient.id,
      organizationId: subscription.organizationId,
      subject: renderTemplate(automation.subject, variables),
      htmlBody: wrapInLayout(renderTemplate(automation.htmlBody, variables)),
      // `automation`, nunca `campaign`: execução de contrato não passa pela
      // supressão por opt-in. Ver o cabeçalho deste arquivo.
      kind: 'automation',
      templateKey: automation.key,
      dedupeKey: `${automation.key}:${subscription.organizationId}:${anchor.toISOString()}`,
    });

    return true;
  }

  /**
   * Para quem vai o aviso: UM destinatário por organização — o admin mais
   * antigo (na prática, quem criou a conta).
   *
   * Um só, e não todos os admins, porque a chave de idempotência é por
   * organização: mandar para três admins exigiria três chaves, e o dia em que
   * alguém adicionasse um quarto usuário ele receberia a segunda via de um
   * aviso que a conta já tinha recebido.
   */
  private async recipientFor(
    organizationId: string
  ): Promise<{ id: string; email: string; name: string | null } | null> {
    const admin = await prisma.user.findFirst({
      where: { organizationId, role: 'admin' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, name: true },
    });
    if (admin) return admin;

    return prisma.user.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, name: true },
    });
  }

  /** Valores das variáveis do template, incluindo o VALOR DO CICLO. */
  async variablesFor(
    subscription: SubscriptionWithPlan,
    recipientName: string
  ): Promise<AutomationVariables> {
    const organization = await prisma.organization.findUnique({
      where: { id: subscription.organizationId },
      select: { name: true },
    });

    // Mesmo critério de "tela ativa" da cobrança.
    const devices = await prisma.device.count({
      where: { organizationId: subscription.organizationId, status: 'linked' },
    });

    const interval = subscription.billingInterval as BillingInterval;

    return {
      nome: recipientName,
      empresa: organization?.name ?? recipientName,
      plano: subscription.plan.name,
      vencimento: formatDate(subscription.currentPeriodEnd),
      // ⚠️ CICLO, não mensal equivalente. Ver "A regra do dinheiro" no topo.
      valor: formatBRL(estimateCycleCents(subscription.plan, devices, interval)),
      link: PANEL_URL,
    };
  }

  /**
   * Prévia com dados reais de uma organização, para o editor do backoffice.
   * Sem isto o `master` só descobre que escreveu `{{plnao}}` depois de o e-mail
   * chegar torto na caixa do cliente.
   */
  async preview(
    key: AutomationKey,
    organizationId: string
  ): Promise<{ subject: string; html: string; variables: AutomationVariables }> {
    const definition = automationDefinition(key);
    const stored = await prisma.emailAutomation.findUnique({ where: { key } });

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });
    if (!subscription) throw new Error('organização sem assinatura para servir de prévia');

    const recipient = await this.recipientFor(organizationId);
    const variables = await this.variablesFor(
      subscription,
      recipient?.name ?? recipient?.email ?? 'cliente'
    );

    const { wrapInLayout } = await import('./email.service');

    return {
      subject: renderTemplate(stored?.subject ?? definition.defaultSubject, variables),
      html: wrapInLayout(renderTemplate(stored?.htmlBody ?? definition.defaultHtmlBody, variables)),
      variables,
    };
  }
}

export const emailAutomationService = new EmailAutomationService();
