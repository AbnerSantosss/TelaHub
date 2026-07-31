import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// SMTP fora do caminho: o aviso ao master é fire-and-forget e o teste não pode
// depender (nem disparar) envio real.
vi.mock('../settings.service', () => ({
  settingsService: {
    getSmtpConfig: vi.fn(async () => null),
    getMultiple: vi.fn(async () => ({})),
  },
}));

import prisma from '../../lib/prisma';
import { generatePublicToken } from '../checkout.service';
import { SUBMIT_AUDIT_ACTION, submitHandler } from '../checkout-handlers/submit.handler';
import { ABANDONED_AUDIT_ACTION, abandonedHandler } from '../checkout-handlers/abandoned.handler';
import { parseMetadata } from '../checkout-handlers/shared';

const SUFFIX = `subh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const sessionIds: string[] = [];
const eventIds: string[] = [];

async function seed(type: string, metadata: unknown, sessionData: Record<string, unknown> = {}) {
  const session = await prisma.checkoutSession.create({
    data: {
      publicToken: generatePublicToken(),
      status: 'payment_pending',
      planCode: `loja-${SUFFIX}`,
      screens: 3,
      amountCents: 14700,
      name: 'Fulano de Tal',
      email: `lead-${SUFFIX}@example.com`,
      phone: '+55 11 90000-0000',
      companyName: 'Mercado do Fulano',
      ...sessionData,
    },
  });
  sessionIds.push(session.id);

  const event = await prisma.checkoutEvent.create({
    data: { sessionId: session.id, type, metadata: metadata ? JSON.stringify(metadata) : null },
  });
  eventIds.push(event.id);

  return { session, event, metadata: parseMetadata(event.metadata), now: new Date() };
}

async function auditFor(eventId: string, action: string) {
  return prisma.auditLog.findMany({ where: { entityId: eventId, action } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { entityId: { in: eventIds } } });
  await prisma.checkoutSession.deleteMany({ where: { id: { in: sessionIds } } });
});

describe('submitHandler', () => {
  it('registra a contratação aguardando atendimento em AuditLog', async () => {
    const ctx = await seed('submit', { amountCents: 14700, planCode: `loja-${SUFFIX}` });

    await submitHandler.handle(ctx);

    const logs = await auditFor(ctx.event.id, SUBMIT_AUDIT_ACTION);
    expect(logs).toHaveLength(1);

    const metadata = JSON.parse(logs[0].metadata!);
    expect(metadata.sessionId).toBe(ctx.session.id);
    expect(metadata.amountCents).toBe(14700);
    expect(metadata.charged).toBe(false);
    expect(metadata.nextStep).toBe('contato-comercial');
    expect(metadata.email).toBe(ctx.session.email);
  });

  it('é idempotente: processar duas vezes não duplica a auditoria', async () => {
    const ctx = await seed('submit', { amountCents: 9800 });

    await submitHandler.handle(ctx);
    await submitHandler.handle(ctx);
    await submitHandler.handle(ctx);

    expect(await auditFor(ctx.event.id, SUBMIT_AUDIT_ACTION)).toHaveLength(1);
  });

  it('NÃO cria organização, usuário nem assinatura (não há pagamento confirmado)', async () => {
    const ctx = await seed('submit', { amountCents: 14700 }, { companyName: `Empresa ${SUFFIX}` });
    await submitHandler.handle(ctx);

    // Nada com a identidade deste lead pode ter nascido no banco.
    expect(await prisma.organization.findFirst({ where: { name: `Empresa ${SUFFIX}` } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { email: ctx.session.email! } })).toBeNull();

    const session = await prisma.checkoutSession.findUnique({ where: { id: ctx.session.id } });
    expect(session!.organizationId).toBeNull();
    // O status também não muda: quem manda no status é o checkout, não o tratador.
    expect(session!.status).toBe('payment_pending');
  });
});

describe('abandonedHandler', () => {
  it('registra o abandono com o passo em que parou, sem enviar e-mail', async () => {
    const ctx = await seed(
      'abandoned',
      { fromStatus: 'identified', step: 'identified', amountCents: 14700 },
      { status: 'abandoned', utmSource: 'meta', utmCampaign: `camp-${SUFFIX}` }
    );

    await abandonedHandler.handle(ctx);

    const logs = await auditFor(ctx.event.id, ABANDONED_AUDIT_ACTION);
    expect(logs).toHaveLength(1);

    const metadata = JSON.parse(logs[0].metadata!);
    expect(metadata.step).toBe('identified');
    expect(metadata.fromStatus).toBe('identified');
    expect(metadata.amountCents).toBe(14700);
    expect(metadata.utmSource).toBe('meta');
    // Contrato explícito: nada é disparado automaticamente.
    expect(metadata.emailNotified).toBe(false);
  });

  it('é idempotente', async () => {
    const ctx = await seed('abandoned', { step: 'plan_selected' }, { status: 'abandoned' });

    await abandonedHandler.handle(ctx);
    await abandonedHandler.handle(ctx);

    expect(await auditFor(ctx.event.id, ABANDONED_AUDIT_ACTION)).toHaveLength(1);
  });
});
