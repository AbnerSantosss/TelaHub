import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import crypto from 'crypto';
import express from 'express';
import request from 'supertest';

import prisma from '../../lib/prisma';
import checkoutAdminRoutes from '../checkout-admin.routes';
import { authHeaderFor, masterAuthHeader } from './tenant-helpers';

const app = express();
app.use(express.json());
app.use('/api/checkout/admin', checkoutAdminRoutes);

const SUFFIX = `chkadm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const PLAN_CODE = `loja-${SUFFIX}`;

/**
 * Janela de tempo exclusiva deste arquivo. As métricas são globais (o funil não
 * tem tenant), então isolar por período é o que impede o relatório de contar
 * sessões criadas por outros testes rodando em paralelo.
 */
const WINDOW_START = new Date('2019-03-01T00:00:00.000Z');
const WINDOW_END = new Date('2019-03-31T23:59:59.000Z');
const inWindow = (day: number) => new Date(`2019-03-${String(day).padStart(2, '0')}T12:00:00.000Z`);

const sessionIds: string[] = [];
let planId = '';

interface SeedOptions {
  status: string;
  amountCents?: number;
  identified?: boolean;
  submitted?: boolean;
  paid?: boolean;
  planCode?: string | null;
  day?: number;
  utmSource?: string | null;
  utmCampaign?: string | null;
  email?: string | null;
}

async function seed(options: SeedOptions) {
  const day = options.day ?? 10;
  const at = inWindow(day);
  // `lastSeenAt` fica no presente de propósito: o job de abandono (que outro
  // arquivo de teste executa em paralelo) marcaria como `abandoned` qualquer
  // sessão em andamento com `lastSeenAt` antigo, quebrando as asserções de
  // status. O período do relatório é filtrado por `startedAt`, que continua
  // dentro da janela histórica deste arquivo. O offset preserva a ordem
  // esperada em `lastSeenAt desc` (dia maior = mais recente).
  const lastSeenAt = new Date(Date.now() - (40 - day) * 1000);
  const session = await prisma.checkoutSession.create({
    data: {
      publicToken: crypto.randomBytes(32).toString('hex'),
      status: options.status,
      planCode: options.planCode === undefined ? PLAN_CODE : options.planCode,
      screens: 2,
      amountCents: options.amountCents ?? 9800,
      name: options.identified ? 'Lead Teste' : null,
      email: options.email === undefined ? (options.identified ? `lead-${SUFFIX}@exemplo.com` : null) : options.email,
      startedAt: at,
      lastSeenAt,
      identifiedAt: options.identified ? at : null,
      paymentAt: options.submitted ? at : null,
      paidAt: options.paid ? at : null,
      abandonedAt: options.status === 'abandoned' ? at : null,
      utmSource: options.utmSource ?? null,
      utmCampaign: options.utmCampaign ?? null,
      events: { create: { type: 'view', createdAt: at } },
    },
  });
  sessionIds.push(session.id);
  return session;
}

beforeAll(async () => {
  const plan = await prisma.plan.create({
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
  planId = plan.id;
});

afterAll(async () => {
  await prisma.checkoutSession.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.plan.deleteMany({ where: { id: planId } });
});

describe('autorização do painel de checkout', () => {
  it('exige autenticação', async () => {
    const res = await request(app).get('/api/checkout/admin/sessions');
    expect(res.status).toBe(401);
  });

  it('BLOQUEIA role admin — o funil tem lead de toda a plataforma', async () => {
    const header = authHeaderFor({ organizationId: 'org-qualquer', role: 'admin' });

    for (const path of ['/api/checkout/admin/sessions', '/api/checkout/admin/metrics']) {
      const res = await request(app).get(path).set('Authorization', header);
      expect(res.status).toBe(403);
    }

    const detail = await request(app)
      .get('/api/checkout/admin/sessions/qualquer-id')
      .set('Authorization', header);
    expect(detail.status).toBe(403);

    const recovery = await request(app)
      .post('/api/checkout/admin/sessions/qualquer-id/recovery')
      .set('Authorization', header)
      .send({ channel: 'whatsapp' });
    expect(recovery.status).toBe(403);
  });

  it('libera role master', async () => {
    const res = await request(app).get('/api/checkout/admin/sessions').set('Authorization', masterAuthHeader());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.pagination).toMatchObject({ page: 1, pageSize: 25 });
  });
});

describe('GET /api/checkout/admin/sessions', () => {
  it('filtra por período, status e e-mail, ordenando por lastSeenAt desc', async () => {
    const antiga = await seed({ status: 'abandoned', identified: true, day: 5 });
    const recente = await seed({ status: 'abandoned', identified: true, day: 20 });
    await seed({ status: 'paid', identified: true, paid: true, submitted: true, day: 15 });

    const res = await request(app)
      .get('/api/checkout/admin/sessions')
      .query({
        status: 'abandoned',
        startDate: WINDOW_START.toISOString(),
        endDate: WINDOW_END.toISOString(),
        email: `lead-${SUFFIX}`,
      })
      .set('Authorization', masterAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.sessions.map((s: { id: string }) => s.id)).toEqual([recente.id, antiga.id]);
    expect(res.body.pagination.total).toBe(2);
    // O painel é do dono: vê o lead, mas o hash de IP não serve à UI.
    expect(res.body.sessions[0]).not.toHaveProperty('ipHash');
    expect(res.body.sessions[0].email).toBe(`lead-${SUFFIX}@exemplo.com`);
  });

  it('pagina', async () => {
    const res = await request(app)
      .get('/api/checkout/admin/sessions')
      .query({ page: 1, pageSize: 1, startDate: WINDOW_START.toISOString(), endDate: WINDOW_END.toISOString() })
      .set('Authorization', masterAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.sessions).toHaveLength(1);
    expect(res.body.pagination.pageSize).toBe(1);
    expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(3);
  });

  it('rejeita status inválido com 400', async () => {
    const res = await request(app)
      .get('/api/checkout/admin/sessions')
      .query({ status: 'inventado' })
      .set('Authorization', masterAuthHeader());

    expect(res.status).toBe(400);
  });
});

describe('GET /api/checkout/admin/sessions/:id', () => {
  it('devolve detalhe com linha do tempo de eventos', async () => {
    const session = await seed({ status: 'identified', identified: true, day: 12 });
    await prisma.checkoutEvent.create({
      data: { sessionId: session.id, type: 'identify', metadata: JSON.stringify({ hasPhone: false }) },
    });

    const res = await request(app)
      .get(`/api/checkout/admin/sessions/${session.id}`)
      .set('Authorization', masterAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.session.id).toBe(session.id);
    expect(res.body.step).toBe('identified');
    expect(res.body.events.map((e: { type: string }) => e.type)).toEqual(['view', 'identify']);
  });

  it('404 quando não existe', async () => {
    const res = await request(app)
      .get(`/api/checkout/admin/sessions/${crypto.randomUUID()}`)
      .set('Authorization', masterAuthHeader());

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('session_not_found');
  });
});

describe('GET /api/checkout/admin/metrics', () => {
  it('devolve funil, taxas, valores, quebra de abandono por passo e UTM', async () => {
    // Janela própria para este relatório: nada de outro teste cai aqui.
    const isolated: string[] = [];
    const at = new Date('2018-06-10T12:00:00.000Z');
    const make = async (data: Record<string, unknown>) => {
      const s = await prisma.checkoutSession.create({
        data: {
          publicToken: crypto.randomBytes(32).toString('hex'),
          screens: 2,
          startedAt: at,
          // Ver comentário em `seed()`: presente para o job de abandono de
          // outro arquivo não reclassificar estas sessões.
          lastSeenAt: new Date(),
          ...data,
        } as never,
      });
      isolated.push(s.id);
      sessionIds.push(s.id);
      return s;
    };

    // 1 paga, 3 abandonadas (uma em cada passo), 1 aguardando pagamento.
    await make({ status: 'paid', planCode: PLAN_CODE, amountCents: 9800, identifiedAt: at, paymentAt: at, paidAt: at, utmSource: 'google', utmCampaign: 'marca' });
    await make({ status: 'abandoned', planCode: null, amountCents: 0, abandonedAt: at, utmSource: 'facebook', utmCampaign: 'remarketing' });
    await make({ status: 'abandoned', planCode: PLAN_CODE, amountCents: 4900, abandonedAt: at, utmSource: 'facebook', utmCampaign: 'remarketing' });
    await make({ status: 'abandoned', planCode: PLAN_CODE, amountCents: 9800, identifiedAt: at, paymentAt: at, abandonedAt: at, utmSource: null });
    await make({ status: 'payment_pending', planCode: PLAN_CODE, amountCents: 19500, identifiedAt: at, paymentAt: at });

    const res = await request(app)
      .get('/api/checkout/admin/metrics')
      .query({ startDate: '2018-06-01T00:00:00.000Z', endDate: '2018-06-30T00:00:00.000Z' })
      .set('Authorization', masterAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5);
    expect(res.body.byStatus).toMatchObject({ paid: 1, abandoned: 3, payment_pending: 1, started: 0 });
    expect(res.body.funnel).toMatchObject({ viewed: 5, planSelected: 4, identified: 3, submitted: 3, paid: 1 });
    expect(res.body.conversionRate).toBeCloseTo(0.2, 5);
    expect(res.body.abandonmentRate).toBeCloseTo(0.6, 5);
    expect(res.body.amounts).toMatchObject({
      currency: 'BRL',
      paidCents: 9800,
      abandonedCents: 14700,
      pendingCents: 19500,
    });

    const steps = Object.fromEntries(
      res.body.abandonmentByStep.map((s: { step: string; count: number }) => [s.step, s.count])
    );
    expect(steps).toMatchObject({ view: 1, plan_selected: 1, identified: 0, payment_pending: 1 });

    const facebook = res.body.byUtmSource.find((u: { value: string }) => u.value === 'facebook');
    expect(facebook).toMatchObject({ total: 2, abandoned: 2, paid: 0 });
    expect(res.body.byUtmSource.some((u: { value: string }) => u.value === '(sem atribuição)')).toBe(true);
    const campanha = res.body.byUtmCampaign.find((u: { value: string }) => u.value === 'marca');
    expect(campanha).toMatchObject({ total: 1, paid: 1, paidCents: 9800 });

    await prisma.checkoutSession.deleteMany({ where: { id: { in: isolated } } });
  });

  it('usa os últimos 30 dias quando o período não é informado', async () => {
    const res = await request(app).get('/api/checkout/admin/metrics').set('Authorization', masterAuthHeader());

    expect(res.status).toBe(200);
    const days =
      (new Date(res.body.period.endDate).getTime() - new Date(res.body.period.startDate).getTime()) /
      (24 * 60 * 60 * 1000);
    expect(Math.round(days)).toBe(30);
  });
});

describe('POST /api/checkout/admin/sessions/:id/recovery', () => {
  it('registra o contato sem enviar mensagem', async () => {
    const session = await seed({ status: 'abandoned', identified: true, day: 18 });

    const res = await request(app)
      .post(`/api/checkout/admin/sessions/${session.id}/recovery`)
      .set('Authorization', masterAuthHeader())
      .send({ channel: 'whatsapp', note: 'Ligou, vai retomar amanhã.' });

    expect(res.status).toBe(200);
    expect(res.body.notified).toBe(false);
    expect(res.body.session.recoveryChannel).toBe('whatsapp');
    expect(res.body.session.recoveryNotifiedAt).toBeTruthy();
    // Registrar contato NÃO muda o status: quem recupera é o visitante voltando.
    expect(res.body.session.status).toBe('abandoned');

    const events = await prisma.checkoutEvent.findMany({ where: { sessionId: session.id } });
    expect(events.map((e) => e.type)).toContain('recovery_notified');
  });

  it('rejeita canal inválido com 400 e sessão inexistente com 404', async () => {
    const session = await seed({ status: 'abandoned', identified: true, day: 19 });

    const invalid = await request(app)
      .post(`/api/checkout/admin/sessions/${session.id}/recovery`)
      .set('Authorization', masterAuthHeader())
      .send({ channel: 'pombo-correio' });
    expect(invalid.status).toBe(400);

    const missing = await request(app)
      .post(`/api/checkout/admin/sessions/${crypto.randomUUID()}/recovery`)
      .set('Authorization', masterAuthHeader())
      .send({ channel: 'email' });
    expect(missing.status).toBe(404);
  });
});
