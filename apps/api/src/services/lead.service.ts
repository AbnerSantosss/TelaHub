import type { Lead } from '@prisma/client';

import prisma from '../lib/prisma';
import { hashIp } from './checkout.service';
import { sendLeadNotificationEmail } from './email.service';
import { buildFbc, newEventId, sendMetaEventAsync } from './meta-capi.service';
import type { CreateLeadInput } from '../schemas/leads.schema';

export interface LeadContext {
  ip?: string | null;
  referrer?: string | null;
  /**
   * User-agent e URL de origem vêm da REQUISIÇÃO, nunca do corpo. São o que a
   * Meta usa para casar o lead com o clique no anúncio quando o cookie do
   * Pixel não existe — e valor enviado pelo navegador é valor que dá para
   * forjar.
   */
  userAgent?: string | null;
  sourceUrl?: string | null;
}

function truncate(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

export const leadService = {
  /**
   * Grava o lead e avisa o comercial.
   *
   * O e-mail é best-effort de propósito: se o SMTP estiver fora do ar, o lead
   * **já está no banco** e a pessoa vê a confirmação. Falhar a requisição aqui
   * transformaria um problema nosso de infraestrutura em "o formulário não
   * funciona" para quem quer comprar. Quem não recebeu aviso fica com
   * `notifiedAt = null` e aparece na lista de pendentes.
   */
  async create(input: CreateLeadInput, context: LeadContext = {}): Promise<Lead> {
    const lead = await prisma.lead.create({
      data: {
        name: input.name,
        email: input.email,
        company: input.company ?? null,
        phone: input.phone ?? null,
        planCode: input.planCode ?? null,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        referrer: truncate(input.referrer ?? context.referrer, 1000),
        ipHash: hashIp(context.ip),
      },
    });

    // `Lead` na Conversions API: o formulário "Falar com a gente" é a única
    // conversão do site que não passa pelo checkout, e sem este evento toda
    // campanha de plano sob consulta otimizaria às cegas.
    //
    // Dispara DEPOIS do insert e nunca antes: o que vale é o lead gravado. E
    // com a versão `Async`, que engole a exceção — Meta fora do ar não pode
    // transformar "quero comprar" em "o formulário não funciona".
    try {
      sendMetaEventAsync({
        eventName: 'Lead',
        eventId: input.metaEventId || newEventId(),
        actionSource: 'website',
        sourceUrl: context.sourceUrl ?? input.referrer ?? context.referrer ?? null,
        userData: {
          email: lead.email,
          phone: lead.phone,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
          fbp: input.fbp ?? null,
          // Sem o cookie `_fbc` (bloqueador, Safari), reconstruímos a partir do
          // `fbclid` da URL do anúncio — senão o clique pago se perde.
          fbc: input.fbc || buildFbc(input.fbclid) || null,
        },
        custom: { plan_code: lead.planCode ?? undefined },
      });
    } catch (err) {
      // O lead JÁ está gravado. Medição quebrada não pode virar "o formulário
      // não funciona" para quem estava tentando comprar.
      console.warn(
        '[leads] falha ao medir Lead (lead gravado):',
        err instanceof Error ? err.message : err
      );
    }

    try {
      await sendLeadNotificationEmail(lead);
      await prisma.lead.update({
        where: { id: lead.id },
        data: { notifiedAt: new Date() },
      });
    } catch (error) {
      console.error(
        `Lead ${lead.id} salvo, mas o aviso por e-mail falhou (será listado como não notificado):`,
        error
      );
    }

    return lead;
  },

  /** Leads salvos cujo aviso ao comercial não saiu. */
  async listNotNotified(limit = 50): Promise<Lead[]> {
    return prisma.lead.findMany({
      where: { notifiedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
