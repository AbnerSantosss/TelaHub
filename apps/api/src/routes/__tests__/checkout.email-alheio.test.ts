import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// O e-mail de compra é fire-and-forget; o teste não envia nada.
vi.mock('../../services/email.service', () => ({
  sendPurchaseConfirmationEmail: vi.fn(async () => {}),
}));

import prisma from '../../lib/prisma';
import checkoutRoutes from '../checkout.routes';
import { generateToken } from '../../services/auth.service';
import { generatePublicToken } from '../../services/checkout.service';
import {
  PAID_AUDIT_ACTION_CONFLICT,
  paidHandler,
} from '../../services/checkout-handlers/paid.handler';
import { parseMetadata } from '../../services/checkout-handlers/shared';

/**
 * Checkout com o e-mail de uma conta que já existe.
 *
 * A falha que estes testes prendem: o checkout é público e o `paid.handler`
 * tratava "pagou com o e-mail X" como "é o dono da organização de X". Qualquer
 * pessoa que soubesse o e-mail de um cliente trocava o plano dele e zerava o
 * cancelamento agendado (`cancelAtPeriodEnd`). Agora só quem está logado na
 * própria conta, com permissão de cobrança, contrata para ela.
 *
 * As asserções são sobre o ESTADO no banco (assinatura, sessão), não só sobre
 * o corpo da resposta: a resposta certa com a assinatura alterada continuaria
 * sendo a falha.
 */

const app = express();
app.use(express.json());
app.use('/api/checkout', checkoutRoutes);

const SUFFIX = `alheio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const sessionIds: string[] = [];
const orgIds: string[] = [];
const planIds: string[] = [];

let planAtual: { id: string; code: string };
let planNovo: { id: string; code: string };

async function makePlan(tag: string) {
  const plan = await prisma.plan.create({
    data: {
      code: `alheio-${tag}-${SUFFIX}`,
      name: `Plano ${tag}`,
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
  return plan;
}

/** Conta existente com assinatura ativa e cancelamento JÁ agendado. */
async function makeAccount(tag: string, role: 'admin' | 'editor' = 'admin') {
  const org = await prisma.organization.create({ data: { name: `Org ${tag} ${SUFFIX}` } });
  orgIds.push(org.id);
  const user = await prisma.user.create({
    data: {
      username: `${tag}-${SUFFIX}`,
      name: `Pessoa ${tag}`,
      email: `${tag}-${SUFFIX}@example.com`,
      password: 'hash-irrelevante',
      role,
      organizationId: org.id,
    },
  });
  await prisma.subscription.create({
    data: {
      organizationId: org.id,
      planId: planAtual.id,
      status: 'active',
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
      cancelReason: 'pedido do cliente',
      currentPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  });
  const bearer = `Bearer ${generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    organizationId: org.id,
  })}`;
  return { org, user, bearer };
}

async function newSession() {
  const session = await prisma.checkoutSession.create({
    data: {
      publicToken: generatePublicToken(),
      status: 'started',
      planCode: planNovo.code,
      screens: 3,
      amountCents: 14700,
    },
  });
  sessionIds.push(session.id);
  return session;
}

function identify(publicToken: string, email: string, bearer?: string) {
  const req = request(app).patch(`/api/checkout/sessions/${publicToken}`);
  if (bearer) req.set('Authorization', bearer);
  return req.send({ name: 'Fulana de Tal', email, phone: '11999999999' });
}

/** Paga pelo provedor simulado (Pix + "eu paguei") e roda o provisionamento. */
async function payAndProvision(publicToken: string, bearer?: string) {
  const pay = request(app).post(`/api/checkout/sessions/${publicToken}/pay`);
  if (bearer) pay.set('Authorization', bearer);
  const payRes = await pay.send({ method: 'pix' });

  const sim = request(app).post(`/api/checkout/sessions/${publicToken}/simulate-payment`);
  if (bearer) sim.set('Authorization', bearer);
  const simRes = await sim.send();

  if (simRes.status === 200) {
    await provisionPaidSession(publicToken);
  }
  return { payRes, simRes };
}

async function provisionPaidSession(publicToken: string) {
  const session = await prisma.checkoutSession.findUnique({ where: { publicToken } });
  const event = await prisma.checkoutEvent.findFirst({
    where: { sessionId: session!.id, type: 'paid' },
    orderBy: { createdAt: 'desc' },
  });
  await paidHandler.handle({
    event: event!,
    session: session!,
    metadata: parseMetadata(event!.metadata),
    now: new Date(),
  });
  const after = await prisma.checkoutSession.findUnique({ where: { publicToken } });
  if (after?.organizationId && !orgIds.includes(after.organizationId)) {
    orgIds.push(after.organizationId);
  }
  return after!;
}

const subscriptionOf = (organizationId: string) =>
  prisma.subscription.findUnique({ where: { organizationId } });

beforeAll(async () => {
  planAtual = await makePlan('atual');
  planNovo = await makePlan('novo');
});

afterEach(() => {
  delete process.env.PAYMENT_PROVIDER;
});

afterAll(async () => {
  // Quem aponta antes de quem é apontado (mesma ordem do paid.handler.test).
  const events = await prisma.checkoutEvent.findMany({
    where: { sessionId: { in: sessionIds } },
    select: { id: true },
  });
  await prisma.auditLog.deleteMany({ where: { entityId: { in: events.map((e) => e.id) } } });
  await prisma.checkoutEvent.deleteMany({ where: { sessionId: { in: sessionIds } } });
  await prisma.checkoutSession.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.payment.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.subscription.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.organization.updateMany({ where: { id: { in: orgIds } }, data: { ownerUserId: null } });
  await prisma.user.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.plan.deleteMany({ where: { id: { in: planIds } } });
});

describe('checkout com e-mail de conta existente', () => {
  it('sessão anônima com e-mail existente é recusada e a assinatura não muda', async () => {
    const vitima = await makeAccount('vitima');
    const session = await newSession();

    const res = await identify(session.publicToken, vitima.user.email);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('email_has_account');
    expect(res.body.error).toBe('Este e-mail já tem conta. Entre para contratar.');
    // Nada foi gravado: o e-mail alheio não fica na sessão.
    const after = await prisma.checkoutSession.findUnique({ where: { id: session.id } });
    expect(after!.email).toBeNull();

    // Sessão que já tinha o e-mail (identificada antes da trava existir) também
    // não paga: o `/pay` repete a checagem.
    await prisma.checkoutSession.update({
      where: { id: session.id },
      data: { email: vitima.user.email, name: 'Fulana de Tal', status: 'identified', identifiedAt: new Date() },
    });
    const { payRes, simRes } = await payAndProvision(session.publicToken);
    expect(payRes.status).toBe(403);
    expect(payRes.body.code).toBe('email_has_account');
    expect(simRes.status).toBe(403);

    const sub = await subscriptionOf(vitima.org.id);
    expect(sub!.planId).toBe(planAtual.id);
    expect(sub!.cancelAtPeriodEnd).toBe(true);
    expect(sub!.cancelReason).toBe('pedido do cliente');
  });

  it('sessão autenticada do próprio usuário aplica o plano na conta dele', async () => {
    const dono = await makeAccount('dono');
    const session = await newSession();

    const res = await identify(session.publicToken, dono.user.email, dono.bearer);
    expect(res.status).toBe(200);

    const link = await prisma.checkoutEvent.findFirst({
      where: { sessionId: session.id, type: 'account_linked' },
    });
    expect(JSON.parse(link!.metadata!)).toMatchObject({
      userId: dono.user.id,
      organizationId: dono.org.id,
    });
    // Sem tratador: não pode ficar pendente no outbox.
    expect(link!.dispatchStatus).toBe('skipped');

    const { payRes, simRes } = await payAndProvision(session.publicToken, dono.bearer);
    expect(payRes.status).toBe(200);
    expect(simRes.status).toBe(200);

    const after = await prisma.checkoutSession.findUnique({ where: { id: session.id } });
    expect(after!.organizationId).toBe(dono.org.id);
    const sub = await subscriptionOf(dono.org.id);
    expect(sub!.planId).toBe(planNovo.id);
    // Quem cancelou e voltou a pagar logado desfaz o próprio cancelamento.
    expect(sub!.cancelAtPeriodEnd).toBe(false);
    expect(await prisma.user.count({ where: { email: dono.user.email } })).toBe(1);
  });

  it('conta nova continua funcionando sem login', async () => {
    const session = await newSession();
    const email = `novo-${SUFFIX}@example.com`;

    const res = await identify(session.publicToken, email);
    expect(res.status).toBe(200);

    const { payRes, simRes } = await payAndProvision(session.publicToken);
    expect(payRes.status).toBe(200);
    expect(simRes.status).toBe(200);

    const after = await prisma.checkoutSession.findUnique({ where: { id: session.id } });
    expect(after!.organizationId).toBeTruthy();
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user!.organizationId).toBe(after!.organizationId);
    const sub = await subscriptionOf(after!.organizationId!);
    expect(sub!.planId).toBe(planNovo.id);
  });

  it('não zera o cancelAtPeriodEnd de outra organização', async () => {
    const alvo = await makeAccount('alvo');
    const atacante = await makeAccount('atacante');
    const session = await newSession();

    // Logado na PRÓPRIA conta, mas com o e-mail de outra: recusado.
    const res = await identify(session.publicToken, alvo.user.email, atacante.bearer);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('email_has_account');

    // Última trava: mesmo que a sessão chegue paga com o e-mail do alvo e uma
    // ligação que aponta para OUTRA conta, o tratador não toca em ninguém.
    await prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        email: alvo.user.email,
        name: 'Fulana de Tal',
        status: 'paid',
        paidAt: new Date(),
        paymentProvider: 'simulado',
      },
    });
    await prisma.checkoutEvent.create({
      data: {
        sessionId: session.id,
        type: 'account_linked',
        metadata: JSON.stringify({
          userId: atacante.user.id,
          organizationId: atacante.org.id,
          email: alvo.user.email,
        }),
        dispatchStatus: 'skipped',
        dispatchedAt: new Date(),
      },
    });
    await prisma.checkoutEvent.create({
      data: { sessionId: session.id, type: 'paid', metadata: JSON.stringify({ amountCents: 14700 }) },
    });

    const after = await provisionPaidSession(session.publicToken);
    expect(after.organizationId).toBeNull();

    for (const org of [alvo.org.id, atacante.org.id]) {
      const sub = await subscriptionOf(org);
      expect(sub!.planId).toBe(planAtual.id);
      expect(sub!.cancelAtPeriodEnd).toBe(true);
    }
    expect(await prisma.payment.count({ where: { organizationId: alvo.org.id } })).toBe(0);

    const conflict = await prisma.auditLog.findFirst({
      where: { action: PAID_AUDIT_ACTION_CONFLICT, metadata: { contains: session.id } },
    });
    expect(conflict).toBeTruthy();
  });

  it('usuário da conta sem permissão de cobrança recebe erro próprio', async () => {
    const editor = await makeAccount('editor', 'editor');
    const session = await newSession();

    const res = await identify(session.publicToken, editor.user.email, editor.bearer);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('billing_permission_denied');
    const sub = await subscriptionOf(editor.org.id);
    expect(sub!.cancelAtPeriodEnd).toBe(true);
  });
});
