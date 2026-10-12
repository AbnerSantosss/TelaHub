import type { EmailCampaign, Prisma } from '@prisma/client';

import prisma from '../lib/prisma';
import { emailQueueService } from './email-queue.service';

/**
 * ─── Campanhas ("novidades") ────────────────────────────────────────────────
 *
 * A diferença que importa entre isto e `email-automation.service`: campanha é
 * MARKETING. Só vai para quem tem `marketingOptInAt` (LGPD art. 7º, I), sai com
 * rodapé e cabeçalho de descadastro, e é o único tipo que a fila submete à
 * checagem de opt-in. Aviso de cobrança nunca entra aqui.
 *
 * O envio é sempre por ENFILEIRAMENTO, uma mensagem por destinatário. Nunca um
 * `Promise.all` de 500 envios: além de o provedor cortar a conexão (e, no caso
 * do Gmail, bloquear a conta — derrubando junto os transacionais), um lote
 * paralelo não tem retentativa individual, então uma falha no meio deixaria uma
 * fatia do público sem a mensagem e sem registro de quem ficou de fora.
 */

export interface CampaignAudience {
  /** Códigos de plano (`gratis`, `loja`, `rede`). Vazio = todos. */
  plans?: string[];
  /** `active`, `trialing`, `past_due`, `canceled`. Vazio = todos. */
  statuses?: string[];
  /** Restringe ao público que consentiu. Ver `resolveRecipients`. */
  optInOnly?: boolean;
}

export interface AudiencePreview {
  /** Pessoas que casam com os filtros de plano/status. */
  total: number;
  /** Dessas, quantas têm opt-in — as que de fato vão receber. */
  optedIn: number;
  /** Diferença entre as duas: seriam suprimidas na saída. */
  withoutOptIn: number;
}

export interface CampaignInput {
  name: string;
  subject: string;
  htmlBody: string;
  previewText?: string | null;
  audience?: CampaignAudience;
  scheduledAt?: Date | null;
}

/**
 * Lê o JSON de público de forma tolerante.
 *
 * Campo `String` no banco: um JSON quebrado (edição manual, migração) NÃO pode
 * derrubar a listagem de campanhas. Público vazio significa "todo mundo que
 * consentiu", que é o padrão seguro — e a contagem prévia obriga o operador a
 * ver o tamanho antes de disparar de qualquer forma.
 */
export function parseAudience(raw: string | null | undefined): CampaignAudience {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const record = parsed as Record<string, unknown>;

    const list = (value: unknown): string[] | undefined =>
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : undefined;

    return {
      plans: list(record.plans),
      statuses: list(record.statuses),
      optInOnly: typeof record.optInOnly === 'boolean' ? record.optInOnly : undefined,
    };
  } catch {
    return {};
  }
}

export interface CampaignRecipient {
  id: string;
  email: string;
  name: string | null;
  organizationId: string | null;
}

export class EmailCampaignService {
  async list(status?: string): Promise<EmailCampaign[]> {
    return prisma.emailCampaign.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string): Promise<EmailCampaign | null> {
    return prisma.emailCampaign.findUnique({ where: { id } });
  }

  async create(input: CampaignInput, createdByUserId: string): Promise<EmailCampaign> {
    return prisma.emailCampaign.create({
      data: {
        name: input.name,
        subject: input.subject,
        htmlBody: input.htmlBody,
        previewText: input.previewText ?? null,
        audience: JSON.stringify(input.audience ?? {}),
        status: input.scheduledAt ? 'scheduled' : 'draft',
        scheduledAt: input.scheduledAt ?? null,
        createdByUserId,
      },
    });
  }

  /**
   * Edita uma campanha. Recusa depois de `sending`/`sent`: o corpo gravado é o
   * registro do que a base RECEBEU. Editá-lo depois do disparo apagaria a única
   * prova do texto enviado — e é justamente essa prova que responde a uma
   * reclamação de propaganda enganosa (CDC art. 37).
   */
  async update(id: string, input: Partial<CampaignInput>): Promise<EmailCampaign> {
    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) throw new Error('campanha não encontrada');
    if (campaign.status === 'sending' || campaign.status === 'sent') {
      throw new Error('campanha já enviada não pode ser editada');
    }

    const data: Prisma.EmailCampaignUpdateInput = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.subject !== undefined ? { subject: input.subject } : {}),
      ...(input.htmlBody !== undefined ? { htmlBody: input.htmlBody } : {}),
      ...(input.previewText !== undefined ? { previewText: input.previewText } : {}),
      ...(input.audience !== undefined ? { audience: JSON.stringify(input.audience) } : {}),
      ...(input.scheduledAt !== undefined
        ? {
            scheduledAt: input.scheduledAt,
            status: input.scheduledAt ? 'scheduled' : 'draft',
          }
        : {}),
    };

    return prisma.emailCampaign.update({ where: { id }, data });
  }

  async cancel(id: string): Promise<EmailCampaign> {
    return prisma.emailCampaign.update({ where: { id }, data: { status: 'canceled' } });
  }

  /**
   * Quem receberia a campanha.
   *
   * O alvo é a PESSOA, não a organização: consentimento de marketing é
   * individual (cada usuário deu, ou não deu, o seu). Filtrar por plano/status
   * é filtro da ORGANIZAÇÃO a que a pessoa pertence — é assim que "novidades
   * para quem está no plano grátis" funciona.
   *
   * `master` fica de fora: é o dono da plataforma, não público de campanha.
   */
  async resolveRecipients(audience: CampaignAudience): Promise<CampaignRecipient[]> {
    const hasPlans = !!audience.plans?.length;
    const hasStatuses = !!audience.statuses?.length;

    const where: Prisma.UserWhereInput = {
      role: { not: 'master' },
      ...(audience.optInOnly === false ? {} : { marketingOptInAt: { not: null } }),
      ...(hasPlans || hasStatuses
        ? {
            organization: {
              subscription: {
                ...(hasPlans ? { plan: { code: { in: audience.plans } } } : {}),
                ...(hasStatuses ? { status: { in: audience.statuses } } : {}),
              },
            },
          }
        : { organizationId: { not: null } }),
    };

    return prisma.user.findMany({
      where,
      select: { id: true, email: true, name: true, organizationId: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Contagem prévia — obrigatória antes de disparar.
   *
   * Devolve o total do filtro E quantos têm opt-in porque os dois números
   * respondem perguntas diferentes: "quantos clientes se encaixam" (potencial) e
   * "quantos vão receber" (real). Mostrar só o primeiro faria o operador contar
   * com um alcance que a supressão vai cortar na saída.
   */
  async previewAudience(audience: CampaignAudience): Promise<AudiencePreview> {
    const all = await this.resolveRecipients({ ...audience, optInOnly: false });
    const optedIn = await this.resolveRecipients({ ...audience, optInOnly: true });

    return {
      total: all.length,
      optedIn: optedIn.length,
      withoutOptIn: all.length - optedIn.length,
    };
  }

  /**
   * Envio de teste para um endereço escolhido pelo operador.
   *
   * Vai como `transactional` DE PROPÓSITO, e não como `campaign`: o `master` não
   * tem (nem deve ter) opt-in de marketing, então uma mensagem de teste marcada
   * como campanha seria suprimida pela fila e ele concluiria que "o envio está
   * quebrado". Sem `dedupeKey`, para poder testar quantas vezes quiser.
   */
  async sendTest(campaignId: string, toEmail: string): Promise<void> {
    const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('campanha não encontrada');

    await emailQueueService.enqueue({
      toEmail,
      subject: `[TESTE] ${campaign.subject}`,
      htmlBody: campaign.htmlBody,
      kind: 'transactional',
      templateKey: 'campaign_test',
      campaignId: null,
    });
  }

  /**
   * Enfileira a campanha para o público resolvido.
   *
   * `dedupeKey` por (campanha, usuário) fecha a porta do clique duplo em
   * "enviar": sem ela, dois cliques em sequência mandariam a mesma novidade
   * duas vezes para a base inteira — o tipo de erro que se descobre pelas
   * reclamações.
   *
   * Enfileira TAMBÉM quem não tem opt-in quando o filtro assim pedir: a
   * supressão acontece na saída e fica registrada como `suppressed`. É de
   * propósito — o registro "tentamos e suprimimos" é a prova de que a base sem
   * consentimento não recebeu, e some se a filtragem for silenciosa aqui.
   */
  async send(
    campaignId: string,
    options: { ignoreSchedule?: boolean; now?: Date } = {}
  ): Promise<{ queued: number }> {
    const now = options.now ?? new Date();
    const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('campanha não encontrada');
    if (campaign.status === 'sending' || campaign.status === 'sent') {
      throw new Error('campanha já foi enviada');
    }

    // AGENDAMENTO NO FUTURO BLOQUEIA O DISPARO.
    //
    // Sem esta guarda, `send()` enfileirava na hora e ignorava `scheduledAt` por
    // completo: quem marcasse a campanha para a semana que vem veria a tela
    // confirmar "agendada" e a base inteira receber no mesmo minuto. É o pior
    // tipo de defeito de e-mail — irreversível assim que a fila anda, e sem
    // sintoma nenhum antes de acontecer.
    //
    // `ignoreSchedule` é a porta consciente para "disparar agora mesmo estando
    // agendada": quem chama é a rota, quando o operador pede explicitamente, e
    // isso limpa o agendamento em vez de deixar os dois estados convivendo.
    if (!options.ignoreSchedule && campaign.scheduledAt && campaign.scheduledAt > now) {
      throw new Error(
        `campanha agendada para ${campaign.scheduledAt.toISOString()}; ela será disparada automaticamente na data marcada`
      );
    }

    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'sending' },
    });

    const audience = parseAudience(campaign.audience);
    const recipients = await this.resolveRecipients(audience);

    let queued = 0;
    for (const recipient of recipients) {
      await emailQueueService.enqueue({
        toEmail: recipient.email,
        toUserId: recipient.id,
        organizationId: recipient.organizationId,
        subject: campaign.subject,
        htmlBody: campaign.htmlBody,
        kind: 'campaign',
        campaignId: campaign.id,
        dedupeKey: `campaign:${campaign.id}:${recipient.id}`,
      });
      queued += 1;
    }

    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'sent',
        sentAt: now,
        queuedCount: queued,
        // Limpa o agendamento junto: campanha enviada com `scheduledAt` de uma
        // data futura ainda preenchido é um estado que se contradiz, e a tela
        // (com razão) mostraria "agendada para sexta" ao lado de "enviada".
        scheduledAt: null,
      },
    });

    return { queued };
  }

  /**
   * Dispara as campanhas agendadas cujo horário chegou. Chamado pelo job.
   *
   * Granularidade de HORA, herdada do intervalo do job: agendar às 10h05 dispara
   * na virada da hora seguinte. É suficiente para "novidades" e evita mais um
   * timer curto rodando uma consulta a cada 15 segundos numa tabela que quase
   * sempre está vazia.
   */
  async runScheduled(now: Date = new Date()): Promise<{ dispatched: number }> {
    const due = await prisma.emailCampaign.findMany({
      where: { status: 'scheduled', scheduledAt: { not: null, lte: now } },
      select: { id: true },
    });

    let dispatched = 0;
    for (const campaign of due) {
      try {
        // `ignoreSchedule` aqui é obrigatório e não é contradição: a consulta
        // acima já filtrou por `scheduledAt <= now`, mas entre a consulta e esta
        // linha a guarda de `send()` compararia com um `now` novo — e uma
        // campanha marcada para o segundo exato ficaria presa para sempre,
        // reprovada a cada varredura por alguns milissegundos.
        await this.send(campaign.id, { ignoreSchedule: true, now });
        dispatched += 1;
      } catch (err) {
        console.error(
          `[email-campaign] falha ao disparar campanha agendada ${campaign.id}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    return { dispatched };
  }
}

export const emailCampaignService = new EmailCampaignService();
