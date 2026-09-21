import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// O e-mail de compra com as credenciais é fire-and-forget; o teste não envia.
const sendPurchaseConfirmationEmail = vi.fn(async () => {});
vi.mock('../email.service', () => ({
  sendPurchaseConfirmationEmail: (...args: unknown[]) =>
    sendPurchaseConfirmationEmail(...(args as [])),
}));

import prisma from '../../lib/prisma';
import { generatePublicToken } from '../checkout.service';
import { PAID_AUDIT_ACTION, PAID_AUDIT_ACTION_ALREADY, paidHandler } from '../checkout-handlers/paid.handler';
import { parseMetadata } from '../checkout-handlers/shared';

const SUFFIX = `paidh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const PLAN_CODE = `loja-${SUFFIX}`;

const planIds: string[] = [];
const sessionIds: string[] = [];
const eventIds: string[] = [];
const orgIds: string[] = [];

async function seed(sessionData: Record<string, unknown> = {}) {
  const session = await prisma.checkoutSession.create({
    data: {
      publicToken: generatePublicToken(),
      status: 'paid',
      planCode: PLAN_CODE,
      screens: 3,
      amountCents: 14700,
      name: 'Fulana de Tal',
      email: `pago-${SUFFIX}-${sessionIds.length}@example.com`,
      companyName: `Mercado ${SUFFIX}-${sessionIds.length}`,
      paidAt: new Date(),
      ...sessionData,
    },
  });
  sessionIds.push(session.id);

  const event = await prisma.checkoutEvent.create({
    data: { sessionId: session.id, type: 'paid', metadata: JSON.stringify({ amountCents: 14700 }) },
  });
  eventIds.push(event.id);

  return { session, event, metadata: parseMetadata(event.metadata), now: new Date() };
}

async function reloadSession(id: string) {
  const session = await prisma.checkoutSession.findUnique({ where: { id } });
  if (!session) throw new Error('sessão sumiu');
  if (session.organizationId && !orgIds.includes(session.organizationId)) {
    orgIds.push(session.organizationId);
  }
  return session;
}

beforeEach(() => {
  sendPurchaseConfirmationEmail.mockClear();
});

let plan: { id: string };

beforeAll(async () => {
  plan = await prisma.plan.create({
    data: {
      code: PLAN_CODE,
      name: PLAN_CODE,
      pricePerScreenCents: 4900,
      minScreens: 1,
      maxDevices: null,
      maxUsers: null,
      maxOrganizations: null,
      features: '[]',
      active: true,
    },
  });
  planIds.push(plan.id);
});

afterAll(async () => {
  // A ORDEM É O TESTE. Toda linha aqui apaga quem aponta antes de apagar quem é
  // apontado; inverter derruba a limpeza numa violação de chave estrangeira.
  //
  // `payment` faltava, e o efeito era traiçoeiro: os cinco casos passavam e só o
  // `afterAll` estourava com `Payment_organizationId_fkey`, deixando a suíte
  // vermelha por causa da faxina — e, pior, deixando organizações órfãs no banco
  // de teste, que fazem a PRÓXIMA execução partir de um estado sujo. O
  // `paid.handler` registra `Payment` desde que a cobrança real entrou; a
  // limpeza é que ficou para trás.
  await prisma.auditLog.deleteMany({ where: { entityId: { in: eventIds } } });
  await prisma.checkoutSession.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.payment.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.subscription.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.plan.deleteMany({ where: { id: { in: planIds } } });
});

describe('paidHandler — provisionamento', () => {
  it('cria organização, usuário e assinatura, e vincula a sessão', async () => {
    const ctx = await seed();

    await paidHandler.handle(ctx);

    const session = await reloadSession(ctx.session.id);
    expect(session.organizationId).not.toBeNull();

    const org = await prisma.organization.findUnique({ where: { id: session.organizationId! } });
    expect(org!.name).toBe(ctx.session.companyName);

    const user = await prisma.user.findUnique({ where: { email: ctx.session.email! } });
    expect(user!.organizationId).toBe(session.organizationId);
    expect(user!.role).toBe('admin');
    // Senha aleatória, nunca em claro no banco.
    expect(user!.password).not.toContain('pago-');

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: session.organizationId! },
    });
    expect(subscription!.planId).toBe(plan.id);
    expect(subscription!.status).toBe('active');

    const logs = await prisma.auditLog.findMany({
      where: { entityId: ctx.event.id, action: PAID_AUDIT_ACTION },
    });
    expect(logs).toHaveLength(1);

    // Credenciais saem por e-mail, fora da transação.
    expect(sendPurchaseConfirmationEmail).toHaveBeenCalledTimes(1);

    // O e-mail é de COMPRA, não o convite genérico: precisa carregar o que foi
    // contratado. Sem esta asserção, trocar de volta para um convite sem plano
    // nem valor passaria despercebido.
    const [to, payload] = sendPurchaseConfirmationEmail.mock.calls[0] as unknown as [
      string,
      { planName: string; screens: number; amountCents: number; password: string; simulated: boolean },
    ];
    expect(to).toBe(ctx.session.email);
    expect(payload.planName).toBeTruthy();
    expect(payload.screens).toBe(ctx.session.screens);
    expect(payload.amountCents).toBe(ctx.session.amountCents);
    expect(payload.password).toBeTruthy();
  });

  it('idempotência: processar o mesmo evento duas vezes não duplica nada', async () => {
    const ctx = await seed();

    await paidHandler.handle(ctx);
    const first = await reloadSession(ctx.session.id);

    await paidHandler.handle(ctx);
    await paidHandler.handle(ctx);

    const after = await reloadSession(ctx.session.id);
    expect(after.organizationId).toBe(first.organizationId);

    expect(await prisma.organization.count({ where: { name: ctx.session.companyName! } })).toBe(1);
    expect(await prisma.user.count({ where: { email: ctx.session.email! } })).toBe(1);
    expect(await prisma.subscription.count({ where: { organizationId: first.organizationId! } })).toBe(1);

    expect(
      await prisma.auditLog.count({ where: { entityId: ctx.event.id, action: PAID_AUDIT_ACTION } })
    ).toBe(1);
    // A reentrega registra que já estava provisionado — uma vez só.
    expect(
      await prisma.auditLog.count({
        where: { entityId: ctx.event.id, action: PAID_AUDIT_ACTION_ALREADY },
      })
    ).toBe(1);

    // Só o primeiro provisionamento manda credenciais.
    expect(sendPurchaseConfirmationEmail).toHaveBeenCalledTimes(1);
  });

  it('reaproveita a conta quando o e-mail já pertence a um usuário', async () => {
    const org = await prisma.organization.create({ data: { name: `Preexistente ${SUFFIX}` } });
    orgIds.push(org.id);
    const email = `reuso-${SUFFIX}@example.com`;
    await prisma.user.create({
      data: {
        username: `reuso-${SUFFIX}`,
        name: 'Já Existe',
        email,
        password: 'hash-irrelevante',
        role: 'admin',
        organizationId: org.id,
      },
    });

    const ctx = await seed({ email, companyName: `Ignorado ${SUFFIX}` });
    await paidHandler.handle(ctx);

    const session = await reloadSession(ctx.session.id);
    expect(session.organizationId).toBe(org.id);
    // Nenhuma segunda conta para a mesma pessoa.
    expect(await prisma.user.count({ where: { email } })).toBe(1);
    expect(await prisma.organization.findFirst({ where: { name: `Ignorado ${SUFFIX}` } })).toBeNull();

    const subscription = await prisma.subscription.findUnique({ where: { organizationId: org.id } });
    expect(subscription!.planId).toBe(plan.id);
    expect(sendPurchaseConfirmationEmail).not.toHaveBeenCalled();
  });

  it('sessão sem plano/e-mail não provisiona nada e não fica girando na fila', async () => {
    const ctx = await seed({ email: null, name: null });

    await expect(paidHandler.handle(ctx)).resolves.toBeUndefined();

    const session = await reloadSession(ctx.session.id);
    expect(session.organizationId).toBeNull();
    expect(
      await prisma.auditLog.count({
        where: { entityId: ctx.event.id, action: PAID_AUDIT_ACTION_ALREADY },
      })
    ).toBe(1);
  });

  it('plano indisponível FALHA (é transitório: o catálogo pode ser corrigido)', async () => {
    const ctx = await seed({ planCode: `inexistente-${SUFFIX}` });

    await expect(paidHandler.handle(ctx)).rejects.toThrow(/indispon/i);

    const session = await reloadSession(ctx.session.id);
    expect(session.organizationId).toBeNull();
  });
});
