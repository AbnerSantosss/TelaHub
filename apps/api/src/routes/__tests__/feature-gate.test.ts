import { afterAll, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';

import prisma from '../../lib/prisma';
import uptimeRoutes from '../uptime.routes';
import auditRoutes from '../audit.routes';
import displaysRoutes from '../displays.routes';
import broadcastsRoutes from '../broadcasts.routes';
import { generateToken } from '../../services/auth.service';

/**
 * Gate de feature de plano (`requireFeature`).
 *
 * O que estes testes protegem, e por que existem: até 2026-07-31 `hasFeature()`
 * era chamado APENAS em testes de unidade — nenhuma rota de produção o
 * consultava, e uma conta no plano Grátis usava tudo que era vendido como plano
 * pago. Um teste que só exercitasse a função pura reproduziria exatamente essa
 * armadilha, então aqui a checagem é sempre por HTTP: o que se afirma é que a
 * ROTA recusa, não que a função devolve `false`.
 */

const app = express();
app.use(express.json());
app.use('/api/uptime', uptimeRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/displays', displaysRoutes);
app.use('/api/broadcasts', broadcastsRoutes);

const SUFFIX = `featgate-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const createdOrgIds: string[] = [];
const createdPlanIds: string[] = [];
const createdUserIds: string[] = [];
const createdDisplayIds: string[] = [];

async function makePlan(code: string, features: string[]) {
  const plan = await prisma.plan.create({
    data: {
      code: `${code}-${SUFFIX}`,
      name: code.toUpperCase(),
      pricePerScreenCents: features.length === 0 ? 0 : 4900,
      minScreens: 1,
      maxDevices: null,
      maxUsers: null,
      maxOrganizations: null,
      features: JSON.stringify(features),
      active: true,
    },
  });
  createdPlanIds.push(plan.id);
  return plan;
}

/** Tenant completo. `planId: null` cria organização SEM assinatura (conta legada). */
async function makeTenant(planId: string | null, role: 'admin' | 'user' = 'admin') {
  const org = await prisma.organization.create({ data: { name: `Org ${SUFFIX}` } });
  createdOrgIds.push(org.id);

  if (planId) {
    await prisma.subscription.create({
      data: { organizationId: org.id, planId, status: 'active' },
    });
  }

  const user = await prisma.user.create({
    data: {
      username: `fg-${org.id.slice(0, 8)}`,
      email: `fg-${org.id.slice(0, 8)}@telahub.test`,
      password: 'hash',
      role,
      organizationId: org.id,
    },
  });
  createdUserIds.push(user.id);

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    organizationId: org.id,
  });

  return { org, authHeader: `Bearer ${token}` };
}

/** Token de `master`: sem organização, opera acima dos tenants. */
async function makeMaster() {
  const user = await prisma.user.create({
    data: {
      username: `fg-master-${SUFFIX}`,
      email: `fg-master-${SUFFIX}@telahub.test`,
      password: 'hash',
      role: 'master',
      organizationId: null,
    },
  });
  createdUserIds.push(user.id);

  return `Bearer ${generateToken({ id: user.id, email: user.email, role: user.role, organizationId: null })}`;
}

/** Página com um widget de BI, no formato de grid que o editor salva. */
function pagesWithPowerBi() {
  return [
    {
      id: 'page-1',
      name: 'Página 1',
      duration: 10,
      layout: [{ i: 'w1', type: 'POWER_BI', x: 0, y: 0, w: 12, h: 8 }],
    },
  ];
}

/** Página com um widget de documento (PDF), mesmo formato de grid. */
function pagesWithPdf() {
  return [
    {
      id: 'page-1',
      name: 'Página 1',
      duration: 10,
      layout: [{ i: 'w1', type: 'PDF_DOCUMENT', x: 0, y: 0, w: 12, h: 8 }],
    },
  ];
}

afterAll(async () => {
  await prisma.broadcast.deleteMany({ where: { organizationId: { in: createdOrgIds } } });
  await prisma.display.deleteMany({ where: { id: { in: createdDisplayIds } } });
  await prisma.display.deleteMany({ where: { organizationId: { in: createdOrgIds } } });
  await prisma.auditLog.deleteMany({ where: { organizationId: { in: createdOrgIds } } });
  await prisma.subscription.deleteMany({ where: { organizationId: { in: createdOrgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
  await prisma.plan.deleteMany({ where: { id: { in: createdPlanIds } } });
});

describe('requireFeature — relatórios', () => {
  it('recusa com 403 quando o plano não inclui `relatorios`', async () => {
    const plan = await makePlan('gratis', ['widgets-basicos', 'alerta-offline']);
    const { authHeader } = await makeTenant(plan.id);

    const res = await request(app).get('/api/uptime/summary').set('Authorization', authHeader);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('feature_not_in_plan');
    expect(res.body.featureKey).toBe('relatorios');
  });

  it('a resposta diz QUAL plano libera — é o que o front oferece', async () => {
    const gratis = await makePlan('gratis-oferta', ['widgets-basicos']);
    await makePlan('loja-oferta', ['widgets-basicos', 'relatorios']);
    const { authHeader } = await makeTenant(gratis.id);

    const res = await request(app).get('/api/uptime/summary').set('Authorization', authHeader);

    expect(res.status).toBe(403);
    expect(res.body.requiredPlan).toBeTruthy();
    // Contrato consumido pelo frontend: código, nome e preço numérico.
    //
    // Deliberadamente NÃO se afirma QUAL plano vem nem que o preço é > 0: a
    // escolha varre o catálogo ativo inteiro, e as suítes compartilham o mesmo
    // banco — outro arquivo de teste cria planos ativos com `relatorios` e
    // mudaria o vencedor. Fixar o vencedor aqui seria um teste que falha por
    // ordem de execução, não por regressão — o critério de escolha é o mesmo
    // da vitrine (`planService.listActive`) e pertence àquela camada.
    expect(typeof res.body.requiredPlan.code).toBe('string');
    expect(typeof res.body.requiredPlan.pricePerScreenCents).toBe('number');
    expect(res.body.error).toContain(res.body.requiredPlan.name);
  });

  it('libera quando o plano inclui `relatorios`', async () => {
    const plan = await makePlan('loja', ['widgets-basicos', 'relatorios']);
    const { authHeader } = await makeTenant(plan.id);

    const res = await request(app).get('/api/uptime/summary').set('Authorization', authHeader);

    expect(res.status).toBe(200);
  });

  it('organização SEM assinatura passa (fail-open para conta legada)', async () => {
    const { authHeader } = await makeTenant(null);

    const res = await request(app).get('/api/uptime/summary').set('Authorization', authHeader);

    expect(res.status).toBe(200);
  });

  it('`master` passa livre — opera acima dos tenants', async () => {
    const authHeader = await makeMaster();

    const res = await request(app).get('/api/uptime/summary').set('Authorization', authHeader);

    expect(res.status).toBe(200);
  });
});

describe('requireFeature — trilha de auditoria', () => {
  it('recusa com 403 quando o plano não inclui `auditoria`', async () => {
    const plan = await makePlan('gratis-audit', ['widgets-basicos']);
    const { authHeader } = await makeTenant(plan.id);

    const res = await request(app).get('/api/audit-logs').set('Authorization', authHeader);

    expect(res.status).toBe(403);
    expect(res.body.featureKey).toBe('auditoria');
  });

  it('libera e devolve a trilha quando o plano inclui `auditoria`', async () => {
    const plan = await makePlan('loja-audit', ['widgets-basicos', 'auditoria']);
    const { org, authHeader } = await makeTenant(plan.id);

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        action: 'display.publish',
        entityType: 'display',
        userEmail: 'quem@fez.test',
        metadata: JSON.stringify({ name: 'Vitrine' }),
      },
    });

    const res = await request(app).get('/api/audit-logs').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(1);
    expect(res.body.entries[0].action).toBe('display.publish');
    // `metadata` é texto no banco e precisa chegar como objeto na API.
    expect(res.body.entries[0].metadata).toEqual({ name: 'Vitrine' });
  });

  it('não mistura a trilha de outro cliente', async () => {
    const plan = await makePlan('loja-audit-iso', ['auditoria']);
    const mine = await makeTenant(plan.id);
    const other = await makeTenant(plan.id);

    await prisma.auditLog.create({
      data: { organizationId: other.org.id, action: 'display.delete', entityType: 'display' },
    });

    const res = await request(app).get('/api/audit-logs').set('Authorization', mine.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(0);
  });
});

describe('gate de widgets de BI (feature `powerbi`)', () => {
  it('recusa publicar Power BI quando o plano não tem a feature', async () => {
    const plan = await makePlan('loja-bi', ['widgets-basicos', 'relatorios']);
    const { authHeader } = await makeTenant(plan.id);

    const res = await request(app)
      .post('/api/displays')
      .set('Authorization', authHeader)
      .send({ name: `Tela ${SUFFIX}`, slug: `tela-bi-${SUFFIX}`, pages: pagesWithPowerBi() });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('feature_not_in_plan');
    expect(res.body.widgetTypes).toContain('POWER_BI');
  });

  it('permite quando o plano inclui `powerbi`', async () => {
    const plan = await makePlan('rede-bi', ['widgets-basicos', 'powerbi']);
    const { authHeader } = await makeTenant(plan.id);

    const res = await request(app)
      .post('/api/displays')
      .set('Authorization', authHeader)
      .send({ name: `Tela ${SUFFIX}`, slug: `tela-bi-ok-${SUFFIX}`, pages: pagesWithPowerBi() });

    expect(res.status).toBe(200);
    createdDisplayIds.push(res.body.id);
  });

  // REVERSÃO DE POLÍTICA (2026-08-30). Este teste afirmava o contrário:
  // "não bloqueia widgets que nunca foram vendidos como pagos (EMBED_HTML)",
  // porque a oferta da época não os anunciava. A landing v2 passou a vender
  // "Power BI, Bolsa, Snapshot, Airtable, HTML próprio — plano Rede" (§5.1b),
  // então o gate os alcança. O critério continua o mesmo (o gate só cobra o que
  // a oferta diz ser pago); o que mudou foi a oferta.
  it('bloqueia HTML próprio, cotações e snapshot sem a feature — a v2 os vende como Rede', async () => {
    const plan = await makePlan('gratis-embed', ['widgets-basicos']);
    const { authHeader } = await makeTenant(plan.id);

    for (const type of ['EMBED_HTML', 'MARKET_WATCH', 'BROWSER_SNAPSHOT']) {
      const res = await request(app)
        .post('/api/displays')
        .set('Authorization', authHeader)
        .send({
          name: `Tela ${SUFFIX}`,
          slug: `tela-${type.toLowerCase()}-${SUFFIX}`,
          pages: [{ id: 'p1', name: 'P1', duration: 10, layout: [{ i: 'w1', type }] }],
        });

      expect(res.status).toBe(403);
      expect(res.body.featureKey).toBe('powerbi');
      expect(res.body.widgetTypes).toContain(type);
    }
  });

  it('documento NÃO cai mais no gate de BI — quem o cobre é `documentos`', async () => {
    // Plano com `documentos` mas SEM `powerbi`: é o Loja da grade v2.
    const plan = await makePlan('loja-doc-nao-bi', ['widgets-basicos', 'documentos']);
    const { authHeader } = await makeTenant(plan.id);

    const res = await request(app)
      .post('/api/displays')
      .set('Authorization', authHeader)
      .send({ name: `Tela ${SUFFIX}`, slug: `tela-doc-nao-bi-${SUFFIX}`, pages: pagesWithPdf() });

    expect(res.status).toBe(200);
    createdDisplayIds.push(res.body.id);
  });
});

describe('gate de widgets de documento (feature `documentos`)', () => {
  it('recusa publicar PDF no Grátis', async () => {
    const plan = await makePlan('gratis-doc', ['widgets-basicos', 'alerta-offline']);
    const { authHeader } = await makeTenant(plan.id);

    const res = await request(app)
      .post('/api/displays')
      .set('Authorization', authHeader)
      .send({ name: `Tela ${SUFFIX}`, slug: `tela-doc-${SUFFIX}`, pages: pagesWithPdf() });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('feature_not_in_plan');
    expect(res.body.featureKey).toBe('documentos');
    expect(res.body.widgetTypes).toContain('PDF_DOCUMENT');
    // A mensagem tem que dizer a partir de qual plano libera — é o que o front
    // oferece na hora do bloqueio.
    expect(res.body.error).toMatch(/plano Loja/);
  });

  it('bloqueia Google Docs e Office pelo mesmo gate', async () => {
    const plan = await makePlan('gratis-doc-2', ['widgets-basicos']);
    const { authHeader } = await makeTenant(plan.id);

    for (const type of ['GOOGLE_DOCS', 'OFFICE_DOCS']) {
      const res = await request(app)
        .post('/api/displays')
        .set('Authorization', authHeader)
        .send({
          name: `Tela ${SUFFIX}`,
          slug: `tela-${type.toLowerCase()}-${SUFFIX}`,
          pages: [{ id: 'p1', name: 'P1', duration: 10, layout: [{ i: 'w1', type }] }],
        });

      expect(res.status).toBe(403);
      expect(res.body.featureKey).toBe('documentos');
    }
  });

  it('libera no Loja (plano com `documentos`)', async () => {
    const plan = await makePlan('loja-doc', ['widgets-basicos', 'relatorios', 'documentos']);
    const { authHeader } = await makeTenant(plan.id);

    const res = await request(app)
      .post('/api/displays')
      .set('Authorization', authHeader)
      .send({ name: `Tela ${SUFFIX}`, slug: `tela-doc-ok-${SUFFIX}`, pages: pagesWithPdf() });

    expect(res.status).toBe(200);
    createdDisplayIds.push(res.body.id);
  });

  // O fail-open do gate (assinatura ausente passa) existe no serviço, mas nesta
  // rota ele nunca é alcançado: `requireActiveSubscription` responde 402 antes.
  // Fixamos isso aqui para ninguém "consertar" o gate achando que a conta sem
  // assinatura está sendo barrada por falta de feature — cada camada responde
  // por uma pergunta só, e a resposta certa aqui é 402, não 403.
  it('organização SEM assinatura para em `requireActiveSubscription` (402), não no gate', async () => {
    const { authHeader } = await makeTenant(null);

    const res = await request(app)
      .post('/api/displays')
      .set('Authorization', authHeader)
      .send({ name: `Tela ${SUFFIX}`, slug: `tela-doc-legado-${SUFFIX}`, pages: pagesWithPdf() });

    expect(res.status).toBe(402);
    expect(res.body.code).not.toBe('feature_not_in_plan');
  });
});

describe('gate condicional de agendamento (feature `agendamento-avancado`)', () => {
  it('recusa agendamento por faixa de horário sem a feature', async () => {
    const plan = await makePlan('loja-agenda', ['widgets-basicos']);
    const { authHeader } = await makeTenant(plan.id);

    const res = await request(app)
      .post('/api/broadcasts')
      .set('Authorization', authHeader)
      .send({
        name: `Promo ${SUFFIX}`,
        page: { id: 'p1', name: 'P1' },
        start_time: '08:00',
        end_time: '18:00',
        is_permanent: false,
        display_ids: [],
      });

    expect(res.status).toBe(403);
    expect(res.body.featureKey).toBe('agendamento-avancado');
  });

  it('PERMITE aviso permanente/imediato no mesmo plano — é de todos', async () => {
    const plan = await makePlan('gratis-agenda', ['widgets-basicos']);
    const { authHeader } = await makeTenant(plan.id);

    const res = await request(app)
      .post('/api/broadcasts')
      .set('Authorization', authHeader)
      .send({
        name: `Aviso ${SUFFIX}`,
        page: { id: 'p1', name: 'P1' },
        is_permanent: true,
        display_ids: [],
      });

    expect(res.status).toBe(200);
  });

  it('permite agendamento por horário quando o plano tem a feature', async () => {
    const plan = await makePlan('rede-agenda', ['widgets-basicos', 'agendamento-avancado']);
    const { authHeader } = await makeTenant(plan.id);

    const res = await request(app)
      .post('/api/broadcasts')
      .set('Authorization', authHeader)
      .send({
        name: `Promo ok ${SUFFIX}`,
        page: { id: 'p1', name: 'P1' },
        start_time: '08:00',
        end_time: '18:00',
        is_permanent: false,
        display_ids: [],
      });

    expect(res.status).toBe(200);
  });
});
