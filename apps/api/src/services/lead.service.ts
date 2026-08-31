import type { Lead } from '@prisma/client';

import prisma from '../lib/prisma';
import { hashIp } from './checkout.service';
import { sendLeadNotificationEmail } from './email.service';
import type { CreateLeadInput } from '../schemas/leads.schema';

export interface LeadContext {
  ip?: string | null;
  referrer?: string | null;
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
