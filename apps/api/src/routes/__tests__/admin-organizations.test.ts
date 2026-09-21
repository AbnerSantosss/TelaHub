import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';

import prisma from '../../lib/prisma';
import adminRoutes from '../admin';
import uptimeRoutes from '../uptime.routes';
import { generateToken } from '../../services/auth.service';
import { FREE_PLAN_CODE } from '../../services/subscription.service';

/**
 * ─── BACKOFFICE: CLIENTES E ASSINATURAS ─────────────────────────────────────
 *
 * O router montado aqui é o REAL (`routes/admin/index.ts`), com a guarda de
 * `master` na raiz. Montar os routers filhos separadamente passaria em todos os
 * testes de comportamento e não testaria a única coisa que, se quebrar, expõe a
 * base inteira de clientes — foi assim que uma guarda "declarada e não aplicada"
 * já passou por revisão neste projeto.
 *
 * O que estes testes protegem, em ordem de gravidade:
 *
 *   1. Matriz de papéis em TODA rota (user e admin de tenant → 403).
 *   2. "Não renovaram" não pode conter quem cancelou voluntariamente — são
 *      problemas opostos (cobrança falhando × produto) e uma lista só faz o
 *      operador tratar churn como inadimplência.
 *   3. Concessão VENCIDA não libera nada, sem depender de job nenhum.
 *   4. SEM concessão, o gate se comporta exatamente como antes de existir
 *      override. É a prova de que a mudança foi aditiva.
 *   5. Toda rota de escrita grava `AuditLog`. Como `adminAuditService` nunca
 *      lança, esquecer a chamada não quebra nada em produção — só apaga a
 *      resposta de "quem fez isso com a conta do cliente". Este teste é o que
 *      transforma essa convenção em regra.
 */

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
// Montado para exercitar o gate de feature REAL (`requireFeature('relatorios')`)
// por HTTP. Testar a função pura reproduziria a armadilha de 2026-07-31, quando
// `hasFeature` estava correto e nenhuma rota o chamava.
app.use('/api/uptime', uptimeRoutes);

const SUFFIX = `admorg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const createdOrgIds: string[] = [];
const createdPlanIds: string[] = [];
const createdUserIds: string[] = [];

let planPago = '';
let planDestino = '';
let planSemFeature = '';
let planComFeature = '';
let planAnualId = '';
let freePlanId = '';

let masterHeader = '';
let adminHeader = '';
let userHeader = '';

/** Organizações de cenário (uma por visão da lista). */
const org: Record<string, string> = {};

async function makePlan(
  code: string,
  options: {
    features?: string[];
    pricePerScreenCents?: number;
    priceAnnualPerScreenCents?: number;
    minScreens?: number;
    maxDevices?: number | null;
    active?: boolean;
  } = {}
): Promise<string> {
  const plan = await prisma.plan.create({
    data: {
      code: `${code}-${SUFFIX}`,
      name: code.toUpperCase(),
      pricePerScreenCents: options.pricePerScreenCents ?? 4900,
      priceAnnualPerScreenCents: options.priceAnnualPerScreenCents ?? 0,
      minScreens: options.minScreens ?? 1,
      maxDevices: options.maxDevices ?? null,
      maxUsers: null,
      maxOrganizations: null,
      features: JSON.stringify(options.features ?? []),
      // `active: false` por padrão: só o plano de DESTINO da troca precisa estar
      // ativo (o serviço recusa plano inativo). Resíduo de teste não pode
      // aparecer na vitrine de quem vai comprar — 13 planos `pay-loja-*` já
      // ficaram visíveis em `GET /api/plans` exatamente assim.
      active: options.active ?? false,
    },
  });
  createdPlanIds.push(plan.id);
  return plan.id;
}

interface OrgOptions {
  planId: string;
  status?: string;
  cancelReason?: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: Date | null;
  pastDueSince?: Date | null;
  billingInterval?: string;
  devices?: number;
}

async function makeOrg(label: string, options: OrgOptions): Promise<string> {
  const organization = await prisma.organization.create({
    data: { name: `${label} ${SUFFIX}`, utmSource: 'teste-backoffice' },
  });
  createdOrgIds.push(organization.id);

  await prisma.subscription.create({
    data: {
      organizationId: organization.id,
      planId: options.planId,
      status: options.status ?? 'active',
      cancelReason: options.cancelReason ?? null,
      cancelAtPeriodEnd: options.cancelAtPeriodEnd ?? false,
      currentPeriodEnd: options.currentPeriodEnd ?? null,
      pastDueSince: options.pastDueSince ?? null,
      billingInterval: options.billingInterval ?? 'monthly',
    },
  });

  for (let i = 0; i < (options.devices ?? 0); i += 1) {
    await prisma.device.create({ data: { organizationId: organization.id, status: 'linked' } });
  }

  return organization.id;
}

async function makeUser(
  role: 'master' | 'admin' | 'user',
  organizationId: string | null
): Promise<string> {
  const user = await prisma.user.create({
    data: {
      username: `ao-${role}-${Math.random().toString(36).slice(2, 9)}`,
      email: `ao-${role}-${Math.random().toString(36).slice(2, 9)}@telahub.test`,
      password: 'hash',
      role,
      organizationId,
    },
  });
  createdUserIds.push(user.id);
  return `Bearer ${generateToken({ id: user.id, email: user.email, role, organizationId })}`;
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

beforeAll(async () => {
  planPago = await makePlan('pago', { features: ['relatorios'] });
  planDestino = await makePlan('destino', { features: ['relatorios'], active: true });
  planSemFeature = await makePlan('sem-feature', { features: [] });
  planComFeature = await makePlan('com-feature', { features: ['relatorios'] });
  planAnualId = await makePlan('anual', { priceAnnualPerScreenCents: 3200, minScreens: 1 });

  // O plano `gratis` é o CÓDIGO REAL do catálogo (a visão "Grátis" filtra por
  // ele, não por preço), então precisa existir no banco de teste. `upsert` para
  // não brigar com o seed nem com outra suíte, e ele NUNCA entra na limpeza.
  const free = await prisma.plan.upsert({
    where: { code: FREE_PLAN_CODE },
    update: {},
    create: {
      code: FREE_PLAN_CODE,
      name: 'Grátis',
      pricePerScreenCents: 0,
      minScreens: 1,
      maxDevices: 1,
      features: '[]',
      active: true,
    },
  });
  freePlanId = free.id;

  // Alvo EXCLUSIVO da matriz de papéis: o teste do master executa as escritas
  // de verdade, e reutilizar `org.paying` cancelaria a assinatura que as
  // asserções de listagem conferem depois.
  org.matrix = await makeOrg('Matriz', {
    planId: planPago,
    currentPeriodEnd: daysFromNow(30),
  });

  org.paying = await makeOrg('Pagante', {
    planId: planPago,
    currentPeriodEnd: daysFromNow(100),
    devices: 2,
  });
  org.expiring = await makeOrg('Vencendo', {
    planId: planPago,
    currentPeriodEnd: daysFromNow(3),
  });
  org.pastDue = await makeOrg('Inadimplente', {
    planId: planPago,
    status: 'past_due',
    pastDueSince: daysFromNow(-2),
  });
  org.notRenewed = await makeOrg('Nao renovou', {
    planId: planPago,
    status: 'canceled',
    cancelReason: 'grace_expired',
  });
  org.voluntaryCancel = await makeOrg('Pediu para sair', {
    planId: planPago,
    status: 'canceled',
    cancelReason: 'nao uso mais',
  });
  org.periodEndUnpaid = await makeOrg('Agendado que venceu', {
    planId: planPago,
    status: 'canceled',
    cancelAtPeriodEnd: true,
    cancelReason: 'period_end_unpaid',
  });
  org.scheduled = await makeOrg('Cancelamento agendado', {
    planId: planPago,
    cancelAtPeriodEnd: true,
    currentPeriodEnd: daysFromNow(10),
  });
  org.free = await makeOrg('Gratuito', { planId: freePlanId });
  org.gate = await makeOrg('Gate', { planId: planSemFeature });
  org.gateComPlano = await makeOrg('Gate com plano', { planId: planComFeature });

  await prisma.payment.create({
    data: {
      organizationId: org.paying,
      provider: 'manual',
      status: 'confirmed',
      method: 'pix',
      amountCents: 9800,
      billingInterval: 'monthly',
      screens: 2,
      paidAt: new Date(),
    },
  });

  masterHeader = await makeUser('master', null);
  adminHeader = await makeUser('admin', org.paying);
  userHeader = await makeUser('user', org.paying);
});

afterAll(async () => {
  await prisma.subscriptionOverride.deleteMany({
    where: { subscription: { organizationId: { in: createdOrgIds } } },
  });
  await prisma.payment.deleteMany({ where: { organizationId: { in: createdOrgIds } } });
  await prisma.device.deleteMany({ where: { organizationId: { in: createdOrgIds } } });
  await prisma.auditLog.deleteMany({ where: { organizationId: { in: createdOrgIds } } });
  await prisma.subscription.deleteMany({ where: { organizationId: { in: createdOrgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
  await prisma.plan.deleteMany({ where: { id: { in: createdPlanIds } } });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Matriz de papéis
// ─────────────────────────────────────────────────────────────────────────────

interface RouteCase {
  label: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: () => string;
  body?: () => Record<string, unknown>;
}

/**
 * Toda rota do backoffice, de leitura e de escrita.
 *
 * A lista é o teste: uma rota nova que não apareça aqui não é coberta pela
 * matriz de papéis. É por isso que ela vive num array e não espalhada em `it`s
 * copiados — acrescentar uma linha custa nada, copiar um bloco custa esquecer.
 */
const ALL_ROUTES: RouteCase[] = [
  { label: 'GET /organizations', method: 'get', path: () => '/api/admin/organizations' },
  {
    label: 'GET /organizations/:id',
    method: 'get',
    path: () => `/api/admin/organizations/${org.matrix}`,
  },
  {
    label: 'POST /organizations/:id/subscription/cancel',
    method: 'post',
    path: () => `/api/admin/organizations/${org.matrix}/subscription/cancel`,
    body: () => ({ reason: 'teste de papel' }),
  },
  {
    label: 'POST /organizations/:id/subscription/schedule-cancel',
    method: 'post',
    path: () => `/api/admin/organizations/${org.matrix}/subscription/schedule-cancel`,
    body: () => ({ reason: 'teste de papel' }),
  },
  {
    label: 'POST /organizations/:id/subscription/reactivate',
    method: 'post',
    path: () => `/api/admin/organizations/${org.matrix}/subscription/reactivate`,
    body: () => ({ reason: 'teste de papel' }),
  },
  {
    label: 'POST /organizations/:id/subscription/change-plan',
    method: 'post',
    path: () => `/api/admin/organizations/${org.matrix}/subscription/change-plan`,
    body: () => ({ planCode: `destino-${SUFFIX}`, reason: 'teste de papel' }),
  },
  {
    label: 'POST /organizations/:id/subscription/extend',
    method: 'post',
    path: () => `/api/admin/organizations/${org.matrix}/subscription/extend`,
    body: () => ({ days: 5, reason: 'teste de papel' }),
  },
  {
    label: 'POST /organizations/:id/subscription/manual-payment',
    method: 'post',
    path: () => `/api/admin/organizations/${org.matrix}/subscription/manual-payment`,
    body: () => ({ amountCents: 9800, screens: 2, interval: 'monthly', reason: 'teste de papel' }),
  },
  {
    label: 'PUT /organizations/:id/override',
    method: 'put',
    path: () => `/api/admin/organizations/${org.matrix}/override`,
    body: () => ({ extraFeatures: ['relatorios'], reason: 'teste de papel' }),
  },
  {
    label: 'DELETE /organizations/:id/override',
    method: 'delete',
    path: () => `/api/admin/organizations/${org.matrix}/override`,
    body: () => ({ reason: 'teste de papel' }),
  },
  { label: 'GET /payments', method: 'get', path: () => '/api/admin/payments' },
  { label: 'GET /payments/webhooks', method: 'get', path: () => '/api/admin/payments/webhooks' },
  {
    label: 'POST /payments/events/:id/retry',
    method: 'post',
    path: () => '/api/admin/payments/events/inexistente/retry',
    body: () => ({ reason: 'teste de papel' }),
  },
  { label: 'GET /leads', method: 'get', path: () => '/api/admin/leads' },
  {
    label: 'PATCH /leads/:id',
    method: 'patch',
    path: () => '/api/admin/leads/inexistente',
    body: () => ({ status: 'contacted' }),
  },
];

describe('matriz de papéis em /api/admin', () => {
  it('recusa sem token (401)', async () => {
    for (const route of ALL_ROUTES) {
      const res = await request(app)[route.method](route.path()).send(route.body?.() ?? {});
      expect(res.status, route.label).toBe(401);
    }
  });

  it('recusa usuário comum de tenant (403)', async () => {
    for (const route of ALL_ROUTES) {
      const res = await request(app)
        [route.method](route.path())
        .set('Authorization', userHeader)
        .send(route.body?.() ?? {});
      expect(res.status, route.label).toBe(403);
    }
  });

  it('recusa ADMIN de tenant (403) — admin de cliente não é operador da plataforma', async () => {
    for (const route of ALL_ROUTES) {
      const res = await request(app)
        [route.method](route.path())
        .set('Authorization', adminHeader)
        .send(route.body?.() ?? {});
      expect(res.status, route.label).toBe(403);
    }
  });

  it('deixa o master passar da guarda em todas as rotas', async () => {
    for (const route of ALL_ROUTES) {
      const res = await request(app)
        [route.method](route.path())
        .set('Authorization', masterHeader)
        .send(route.body?.() ?? {});
      // O que se afirma é que a GUARDA deixou passar: 404 (id inventado) e 409
      // (estado incompatível) são respostas do handler, não da guarda. Exigir
      // 200 aqui acoplaria a matriz de papéis ao estado do banco.
      expect(res.status, `${route.label} → ${res.status} ${JSON.stringify(res.body)}`).not.toBe(403);
      expect(res.status, route.label).not.toBe(401);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. As sete visões
// ─────────────────────────────────────────────────────────────────────────────

async function listar(view: string, extra = ''): Promise<string[]> {
  const res = await request(app)
    // `search=SUFFIX` recorta o resultado às organizações DESTE arquivo: a lista
    // é da plataforma inteira e o banco de teste é compartilhado.
    .get(`/api/admin/organizations?view=${view}&search=${SUFFIX}&pageSize=100${extra}`)
    .set('Authorization', masterHeader);

  expect(res.status).toBe(200);
  return res.body.organizations.map((row: { organization: { id: string } }) => row.organization.id);
}

describe('GET /api/admin/organizations — visões de §2.8', () => {
  it('all traz todas as organizações da busca', async () => {
    const ids = await listar('all');
    expect(ids).toEqual(expect.arrayContaining([org.paying, org.free, org.notRenewed]));
  });

  it('paying traz assinatura ativa em plano pago e exclui o grátis', async () => {
    const ids = await listar('paying');
    expect(ids).toContain(org.paying);
    expect(ids).not.toContain(org.free);
    expect(ids).not.toContain(org.notRenewed);
  });

  it('expiring respeita a janela de dias', async () => {
    const em7 = await listar('expiring', '&days=7');
    expect(em7).toContain(org.expiring);
    // Vence em 100 dias: está ativo e pagante, mas não é assunto de renovação.
    expect(em7).not.toContain(org.paying);

    const em2 = await listar('expiring', '&days=2');
    expect(em2).not.toContain(org.expiring);
  });

  it('past_due traz o inadimplente com o fim da carência calculado', async () => {
    const res = await request(app)
      .get(`/api/admin/organizations?view=past_due&search=${SUFFIX}&pageSize=100`)
      .set('Authorization', masterHeader);

    const row = res.body.organizations.find(
      (r: { organization: { id: string } }) => r.organization.id === org.pastDue
    );
    expect(row).toBeTruthy();
    // O prazo é o dos Termos de Uso (10 dias). Ele vem calculado do servidor
    // para a tela não reimplementar a conta — texto publicado e código já
    // divergiram neste projeto por muito menos.
    expect(new Date(row.subscription.graceEndsAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('not_renewed traz SÓ quem perdeu a carência — nunca quem pediu para sair', async () => {
    const ids = await listar('not_renewed');

    expect(ids).toContain(org.notRenewed);
    // Cancelamento voluntário (texto livre que o cliente escreveu).
    expect(ids).not.toContain(org.voluntaryCancel);
    // `period_end_unpaid` é cancelamento AGENDADO que venceu: a pessoa pediu
    // para sair e o ciclo apenas terminou depois. Misturá-lo aqui refaz a
    // confusão que o `cancelReason` foi criado para desfazer.
    expect(ids).not.toContain(org.periodEndUnpaid);
  });

  it('scheduled_cancel traz quem está ativo e de saída', async () => {
    const ids = await listar('scheduled_cancel');
    expect(ids).toContain(org.scheduled);
    // Já cancelado não está "de saída": saiu.
    expect(ids).not.toContain(org.periodEndUnpaid);
  });

  it('free traz o plano de entrada', async () => {
    const ids = await listar('free');
    expect(ids).toContain(org.free);
    expect(ids).not.toContain(org.paying);
  });

  it('devolve telas em uso × cobradas, valor do ciclo, origem e último pagamento', async () => {
    const res = await request(app)
      .get(`/api/admin/organizations?view=paying&search=${SUFFIX}&pageSize=100`)
      .set('Authorization', masterHeader);

    const row = res.body.organizations.find(
      (r: { organization: { id: string } }) => r.organization.id === org.paying
    );

    expect(row.screens).toMatchObject({ inUse: 2, billed: 2 });
    expect(row.billing).toMatchObject({
      interval: 'monthly',
      monthlyEquivalentCents: 9800,
      cycleCents: 9800,
    });
    expect(row.organization.utmSource).toBe('teste-backoffice');
    expect(row.lastPayment).toMatchObject({ amountCents: 9800, provider: 'manual' });
  });
});

describe('GET /api/admin/organizations/:id', () => {
  it('devolve detalhe sem hash de senha dos usuários', async () => {
    const res = await request(app)
      .get(`/api/admin/organizations/${org.paying}`)
      .set('Authorization', masterHeader);

    expect(res.status).toBe(200);
    expect(res.body.subscription.plan.code).toBe(`pago-${SUFFIX}`);
    expect(res.body.payments.length).toBeGreaterThan(0);
    expect(res.body.attribution.utmSource).toBe('teste-backoffice');
    for (const user of res.body.users) {
      expect(user).not.toHaveProperty('password');
    }
  });

  it('responde 404 para organização inexistente', async () => {
    const res = await request(app)
      .get('/api/admin/organizations/nao-existe')
      .set('Authorization', masterHeader);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Motivo obrigatório
// ─────────────────────────────────────────────────────────────────────────────

describe('motivo obrigatório', () => {
  it('recusa 400 quando o motivo falta ou é só espaço', async () => {
    const semMotivo = await request(app)
      .post(`/api/admin/organizations/${org.paying}/subscription/extend`)
      .set('Authorization', masterHeader)
      .send({ days: 3 });
    expect(semMotivo.status).toBe(400);

    // `trim()` antes do `min(3)`: sem isso, três espaços passariam — que é
    // exatamente o que o operador digita para escapar do campo.
    const soEspaco = await request(app)
      .post(`/api/admin/organizations/${org.paying}/subscription/extend`)
      .set('Authorization', masterHeader)
      .send({ days: 3, reason: '   ' });
    expect(soEspaco.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Concessão manual (override) × gating
// ─────────────────────────────────────────────────────────────────────────────

async function pedirRelatorio(organizationId: string): Promise<request.Response> {
  const header = await makeUser('admin', organizationId);
  return request(app).get('/api/uptime/summary').set('Authorization', header);
}

describe('override e o gate de feature', () => {
  it('SEM override, o gate se comporta como antes: plano manda', async () => {
    const semFeature = await pedirRelatorio(org.gate);
    expect(semFeature.status).toBe(403);
    expect(semFeature.body.code).toBe('feature_not_in_plan');

    const comFeature = await pedirRelatorio(org.gateComPlano);
    // Não se afirma 200: o que este teste mede é o GATE, não o cálculo de
    // uptime. Acoplar ao corpo da resposta faria uma mudança de relatório
    // quebrar um teste de direito de uso.
    expect(comFeature.status).not.toBe(403);
  });

  it('override VENCIDO não concede nada', async () => {
    const put = await request(app)
      .put(`/api/admin/organizations/${org.gate}/override`)
      .set('Authorization', masterHeader)
      .send({
        extraFeatures: ['relatorios'],
        expiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
        reason: 'concessao que ja venceu',
      });
    expect(put.status).toBe(200);

    const res = await pedirRelatorio(org.gate);
    // A concessão está NO BANCO e mesmo assim não vale. Nenhum job precisou
    // rodar: a validade é conferida na leitura. Se dependesse de varredura, um
    // job parado manteria a cortesia valendo para sempre.
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('feature_not_in_plan');
  });

  it('override VÁLIDO concede a feature que o plano não tem', async () => {
    const put = await request(app)
      .put(`/api/admin/organizations/${org.gate}/override`)
      .set('Authorization', masterHeader)
      .send({
        extraFeatures: ['relatorios'],
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        reason: 'liberado para fechar a venda',
      });
    expect(put.status).toBe(200);
    expect(put.body.entitlements.features).toContain('relatorios');

    const res = await pedirRelatorio(org.gate);
    expect(res.status).not.toBe(403);
  });

  it('remover a concessão devolve o gate ao estado do plano', async () => {
    const del = await request(app)
      .delete(`/api/admin/organizations/${org.gate}/override`)
      .set('Authorization', masterHeader)
      .send({ reason: 'fim do piloto' });
    expect(del.status).toBe(200);
    expect(del.body.removed).toBe(true);

    const res = await pedirRelatorio(org.gate);
    expect(res.status).toBe(403);
  });

  it('concessão sem prazo é marcada como perpétua na auditoria', async () => {
    await request(app)
      .put(`/api/admin/organizations/${org.gateComPlano}/override`)
      .set('Authorization', masterHeader)
      .send({ extraFeatures: ['powerbi'], reason: 'sem prazo de propósito' });

    const log = await prisma.auditLog.findFirst({
      where: { organizationId: org.gateComPlano, action: 'admin.override.set' },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).toBeTruthy();
    expect(JSON.parse(log!.metadata ?? '{}')).toMatchObject({ perpetual: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Ações de assinatura
// ─────────────────────────────────────────────────────────────────────────────

describe('ações de assinatura', () => {
  it('cancelar grava o motivo com prefixo admin: — o que mantém "não renovaram" limpa', async () => {
    const alvo = await makeOrg('Alvo cancel', { planId: planPago });

    const res = await request(app)
      .post(`/api/admin/organizations/${alvo}/subscription/cancel`)
      .set('Authorization', masterHeader)
      .send({ reason: 'fraude confirmada' });

    expect(res.status).toBe(200);
    expect(res.body.subscription.status).toBe('canceled');
    expect(res.body.subscription.cancelReason).toBe('admin:fraude confirmada');

    // E não aparece como "não renovou": foi a plataforma que cancelou, não uma
    // cobrança que falhou.
    const ids = await listar('not_renewed');
    expect(ids).not.toContain(alvo);
  });

  it('estender parte de AGORA quando o período já venceu', async () => {
    const alvo = await makeOrg('Alvo extend vencido', {
      planId: planPago,
      currentPeriodEnd: daysFromNow(-14),
    });

    const res = await request(app)
      .post(`/api/admin/organizations/${alvo}/subscription/extend`)
      .set('Authorization', masterHeader)
      .send({ days: 10, reason: 'incidente de infraestrutura' });

    expect(res.status).toBe(200);
    // Somar sobre a data vencida devolveria 4 dias NO PASSADO, e o operador
    // acharia que tinha resolvido.
    expect(new Date(res.body.subscription.currentPeriodEnd).getTime()).toBeGreaterThan(Date.now());
  });

  it('estender empurra o vencimento futuro, preservando a âncora', async () => {
    const fim = daysFromNow(20);
    const alvo = await makeOrg('Alvo extend futuro', { planId: planPago, currentPeriodEnd: fim });

    const res = await request(app)
      .post(`/api/admin/organizations/${alvo}/subscription/extend`)
      .set('Authorization', masterHeader)
      .send({ days: 5, reason: 'cortesia negociada' });

    const esperado = fim.getTime() + 5 * 24 * 60 * 60 * 1000;
    expect(new Date(res.body.subscription.currentPeriodEnd).getTime()).toBe(esperado);
  });

  it('trocar de plano manualmente ativa plano pago sem pagamento e marca gateway manual', async () => {
    const alvo = await makeOrg('Alvo plano', { planId: planSemFeature });

    const res = await request(app)
      .post(`/api/admin/organizations/${alvo}/subscription/change-plan`)
      .set('Authorization', masterHeader)
      .send({ planCode: `destino-${SUFFIX}`, reason: 'pix recebido fora do checkout' });

    expect(res.status).toBe(200);
    expect(res.body.subscription.plan.code).toBe(`destino-${SUFFIX}`);
    // É assim que o piloto com Pix manual funciona (decisão do dono). O que
    // impede o abuso não é a recusa, é a trilha.
    expect(res.body.subscription.gateway).toBe('manual');

    const log = await prisma.auditLog.findFirst({
      where: { organizationId: alvo, action: 'admin.subscription.plan_change' },
    });
    expect(JSON.parse(log!.metadata ?? '{}')).toMatchObject({ paymentConfirmedByAdmin: true });
  });

  it('recusa plano inexistente com 400', async () => {
    const res = await request(app)
      .post(`/api/admin/organizations/${org.scheduled}/subscription/change-plan`)
      .set('Authorization', masterHeader)
      .send({ planCode: 'plano-que-nao-existe', reason: 'teste' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('plan_unavailable');
  });

  it('pagamento manual anual grava o CAIXA DO CICLO, não o mensal (US-A-05)', async () => {
    const alvo = await makeOrg('Alvo pagamento', { planId: planAnualId });

    const res = await request(app)
      .post(`/api/admin/organizations/${alvo}/subscription/manual-payment`)
      .set('Authorization', masterHeader)
      .send({
        // R$ 32,00/tela/mês no anual × 1 tela × 12 meses = R$ 384,00.
        amountCents: 38400,
        screens: 1,
        interval: 'yearly',
        reason: 'pix do plano anual',
      });

    expect(res.status).toBe(201);
    expect(res.body.payment).toMatchObject({
      amountCents: 38400,
      billingInterval: 'yearly',
      provider: 'manual',
      method: 'pix',
      status: 'confirmed',
    });
    expect(res.body.expectedCycleCents).toBe(38400);
    expect(res.body.divergesFromCatalog).toBe(false);
    // O pagamento reativa a assinatura e ancora o próximo vencimento.
    expect(res.body.subscription.status).toBe('active');
    expect(new Date(res.body.subscription.currentPeriodEnd).getTime()).toBeGreaterThan(Date.now());
  });

  it('sinaliza quando o valor lançado diverge do catálogo (o mensal digitado no anual)', async () => {
    const alvo = await makeOrg('Alvo divergente', { planId: planAnualId });

    const res = await request(app)
      .post(`/api/admin/organizations/${alvo}/subscription/manual-payment`)
      .set('Authorization', masterHeader)
      .send({ amountCents: 3200, screens: 1, interval: 'yearly', reason: 'lancamento suspeito' });

    expect(res.status).toBe(201);
    // 1/12 do combinado. Não é recusado (desconto negociado é legítimo), mas
    // fica marcado — é o que permite achar o erro na conciliação.
    expect(res.body.divergesFromCatalog).toBe(true);
    expect(res.body.expectedCycleCents).toBe(38400);
  });

  it('recusa lançar o mesmo comprovante duas vezes', async () => {
    const alvo = await makeOrg('Alvo duplicado', { planId: planAnualId });
    const body = {
      amountCents: 38400,
      screens: 1,
      interval: 'yearly',
      reference: `pix-${SUFFIX}`,
      reason: 'primeiro lancamento',
    };

    const primeiro = await request(app)
      .post(`/api/admin/organizations/${alvo}/subscription/manual-payment`)
      .set('Authorization', masterHeader)
      .send(body);
    expect(primeiro.status).toBe(201);

    const segundo = await request(app)
      .post(`/api/admin/organizations/${alvo}/subscription/manual-payment`)
      .set('Authorization', masterHeader)
      .send({ ...body, reason: 'segundo lancamento' });
    expect(segundo.status).toBe(409);
    expect(segundo.body.code).toBe('payment_already_registered');
  });

  it('reativar assinatura já encerrada devolve 409, não plano de graça', async () => {
    const alvo = await makeOrg('Alvo reativar', { planId: planPago, status: 'canceled' });

    const res = await request(app)
      .post(`/api/admin/organizations/${alvo}/subscription/reactivate`)
      .set('Authorization', masterHeader)
      .send({ reason: 'cliente pediu de volta' });

    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Auditoria — o teste que sustenta a convenção
// ─────────────────────────────────────────────────────────────────────────────

describe('toda rota de escrita grava AuditLog', () => {
  /**
   * Um alvo NOVO por rota. Reaproveitar a mesma organização faria a segunda ação
   * cair num estado incompatível (não se reativa o que acabou de ser cancelado)
   * e o teste passaria por acidente, encontrando o log da ação anterior.
   */
  const WRITE_ROUTES: Array<{
    label: string;
    method: 'post' | 'put' | 'delete';
    suffix: string;
    body: Record<string, unknown>;
    setup?: OrgOptions;
  }> = [
    {
      label: 'cancel',
      method: 'post',
      suffix: '/subscription/cancel',
      body: { reason: 'auditoria cancel' },
    },
    {
      label: 'schedule-cancel',
      method: 'post',
      suffix: '/subscription/schedule-cancel',
      body: { reason: 'auditoria schedule' },
    },
    {
      label: 'reactivate',
      method: 'post',
      suffix: '/subscription/reactivate',
      body: { reason: 'auditoria reactivate' },
      setup: { planId: '', cancelAtPeriodEnd: true, currentPeriodEnd: null },
    },
    {
      label: 'change-plan',
      method: 'post',
      suffix: '/subscription/change-plan',
      body: { planCode: '', reason: 'auditoria change-plan' },
    },
    {
      label: 'extend',
      method: 'post',
      suffix: '/subscription/extend',
      body: { days: 7, reason: 'auditoria extend' },
    },
    {
      label: 'manual-payment',
      method: 'post',
      suffix: '/subscription/manual-payment',
      body: { amountCents: 4900, screens: 1, interval: 'monthly', reason: 'auditoria pagamento' },
    },
    {
      label: 'override PUT',
      method: 'put',
      suffix: '/override',
      body: { extraFeatures: ['powerbi'], reason: 'auditoria override' },
    },
    {
      label: 'override DELETE',
      method: 'delete',
      suffix: '/override',
      body: { reason: 'auditoria remocao' },
    },
  ];

  it('nenhuma escrita passa sem deixar rastro', async () => {
    for (const route of WRITE_ROUTES) {
      const alvo = await makeOrg(`Auditoria ${route.label}`, {
        ...(route.setup ?? {}),
        planId: planPago,
      });

      const body = { ...route.body };
      if (route.label === 'change-plan') body.planCode = `destino-${SUFFIX}`;

      const res = await request(app)
        [route.method](`/api/admin/organizations/${alvo}${route.suffix}`)
        .set('Authorization', masterHeader)
        .send(body);

      expect(res.status, `${route.label} → ${JSON.stringify(res.body)}`).toBeLessThan(300);

      const logs = await prisma.auditLog.findMany({ where: { organizationId: alvo } });

      expect(logs.length, `${route.label} não gravou AuditLog`).toBeGreaterThan(0);
      // Prefixo `admin.`: é a única forma de separar, na trilha que o cliente
      // pode ler (feature `auditoria`), o que a PLATAFORMA fez do que a própria
      // equipe dele fez.
      expect(logs.every((log) => log.action.startsWith('admin.')), route.label).toBe(true);
      // O motivo tem de estar gravado, não só exigido na entrada.
      const metadata = JSON.parse(logs[0]!.metadata ?? '{}');
      expect(metadata.reason, route.label).toBe(route.body.reason);
      expect(metadata.performedBy, route.label).toBe('backoffice');
    }
  });
});
