// Importado primeiro pelo efeito colateral de carregar o `.env` (dotenv) antes
// de qualquer módulo que valide `JWT_SECRET` no carregamento.
import '../../server';

import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import prisma from '../../lib/prisma';
import uptimeRoutes from '../uptime.routes';
import { authHeaderFor, createTestOrganization, masterAuthHeader } from './tenant-helpers';

// O router é montado num app próprio: a fiação em `server.ts` é feita à parte e
// este teste não deve depender dela para valer.
const app = express();
app.use(express.json());
app.use('/api/uptime', uptimeRoutes);

const HOUR = 60 * 60 * 1000;

// Período fixo no passado, para o cálculo ser determinístico.
const START = new Date('2026-01-01T00:00:00.000Z');
const END = new Date('2026-01-01T10:00:00.000Z');
const QS = `startDate=${START.toISOString()}&endDate=${END.toISOString()}`;

let orgA: { id: string };
let orgB: { id: string };
let authA: string;
let deviceRuimId: string;
let deviceSemDadosId: string;

beforeAll(async () => {
  orgA = await createTestOrganization('Uptime A');
  orgB = await createTestOrganization('Uptime B');
  authA = authHeaderFor({ organizationId: orgA.id });

  // Tela da org A: online desde antes do período, cai às 09:00 → 9h online +
  // 1h offline = 90%.
  const ruim = await prisma.device.create({
    data: { organizationId: orgA.id, status: 'linked', name: 'TV Ruim' },
  });
  deviceRuimId = ruim.id;

  await prisma.deviceStatusChange.createMany({
    data: [
      {
        deviceId: ruim.id,
        organizationId: orgA.id,
        status: 'online',
        changedAt: new Date('2025-12-31T20:00:00.000Z'),
        previousStatusMs: null,
      },
      {
        deviceId: ruim.id,
        organizationId: orgA.id,
        status: 'offline',
        changedAt: new Date('2026-01-01T09:00:00.000Z'),
        previousStatusMs: BigInt(13 * HOUR),
      },
    ],
  });

  // Tela da org A sem nenhuma transição registrada → "sem dados".
  const semDados = await prisma.device.create({
    data: { organizationId: orgA.id, status: 'linked', name: 'TV Sem Dados' },
  });
  deviceSemDadosId = semDados.id;

  // Tela da org B — nunca pode aparecer no relatório da org A.
  const outra = await prisma.device.create({
    data: { organizationId: orgB.id, status: 'linked', name: 'TV Do Vizinho' },
  });
  await prisma.deviceStatusChange.create({
    data: {
      deviceId: outra.id,
      organizationId: orgB.id,
      status: 'online',
      changedAt: new Date('2025-12-31T00:00:00.000Z'),
      previousStatusMs: null,
    },
  });
});

describe('GET /api/uptime/devices', () => {
  it('rejeita sem autenticação com 401', async () => {
    const res = await request(app).get('/api/uptime/devices');
    expect(res.status).toBe(401);
  });

  it('rejeita com 403 usuário sem organização (órfão)', async () => {
    const res = await request(app)
      .get('/api/uptime/devices')
      .set('Authorization', authHeaderFor({ organizationId: null, role: 'admin' }));
    expect(res.status).toBe(403);
  });

  it('rejeita período inválido com 400', async () => {
    const res = await request(app)
      .get('/api/uptime/devices?startDate=2026-02-01T00:00:00Z&endDate=2026-01-01T00:00:00Z')
      .set('Authorization', authA);
    expect(res.status).toBe(400);
  });

  it('calcula 90% para a tela que ficou 9h online e 1h offline', async () => {
    const res = await request(app).get(`/api/uptime/devices?${QS}`).set('Authorization', authA);

    expect(res.status).toBe(200);
    const ruim = res.body.devices.find((d: any) => d.device_id === deviceRuimId);
    expect(ruim).toBeDefined();
    expect(ruim.has_data).toBe(true);
    expect(ruim.uptime_percent).toBeCloseTo(90, 6);
    expect(ruim.online_ms).toBe(9 * HOUR);
    expect(ruim.offline_ms).toBe(1 * HOUR);
    expect(ruim.failures).toBe(1);
    expect(ruim.mttf_ms).toBe(9 * HOUR);
    expect(ruim.mttr_ms).toBe(1 * HOUR);
    expect(ruim.current_status).toBe('offline');
  });

  it('tela sem histórico volta como "sem dados", e não como 100%', async () => {
    const res = await request(app).get(`/api/uptime/devices?${QS}`).set('Authorization', authA);

    const sem = res.body.devices.find((d: any) => d.device_id === deviceSemDadosId);
    expect(sem).toBeDefined();
    expect(sem.has_data).toBe(false);
    expect(sem.uptime_percent).toBeNull();
    expect(sem.availability).toBeNull();
    expect(sem.classification).toBeNull();
  });

  it('ordena da pior para a melhor, com as telas sem dados no fim', async () => {
    const res = await request(app).get(`/api/uptime/devices?${QS}`).set('Authorization', authA);

    const ids = res.body.devices.map((d: any) => d.device_id);
    expect(ids.indexOf(deviceRuimId)).toBeLessThan(ids.indexOf(deviceSemDadosId));
    expect(res.body.devices[res.body.devices.length - 1].has_data).toBe(false);
  });

  it('não vaza telas de outro tenant', async () => {
    const res = await request(app).get(`/api/uptime/devices?${QS}`).set('Authorization', authA);

    const names = res.body.devices.map((d: any) => d.name);
    expect(names).not.toContain('TV Do Vizinho');
  });

  it('responde JSON válido (nenhum BigInt cru vaza para a serialização)', async () => {
    const res = await request(app).get(`/api/uptime/devices?${QS}`).set('Authorization', authA);
    expect(res.status).toBe(200);
    expect(() => JSON.stringify(res.body)).not.toThrow();
  });
});

describe('GET /api/uptime/summary', () => {
  it('rejeita sem autenticação com 401', async () => {
    const res = await request(app).get('/api/uptime/summary');
    expect(res.status).toBe(401);
  });

  it('agrega a organização: pior tela, quedas e telas sem dados', async () => {
    const res = await request(app).get(`/api/uptime/summary?${QS}`).set('Authorization', authA);

    expect(res.status).toBe(200);
    expect(res.body.total_devices).toBe(2);
    expect(res.body.devices_with_data).toBe(1);
    expect(res.body.devices_without_data).toBe(1);
    expect(res.body.total_failures).toBe(1);
    expect(res.body.total_offline_ms).toBe(1 * HOUR);
    expect(res.body.worst_device.device_id).toBe(deviceRuimId);
    expect(res.body.worst_device.uptime_percent).toBeCloseTo(90, 6);
    // 90% não alcança nem dois noves.
    expect(res.body.classification.level).toBe(0);
  });

  it('master escopado por header vê apenas a organização escolhida', async () => {
    const res = await request(app)
      .get(`/api/uptime/summary?${QS}`)
      .set('Authorization', masterAuthHeader())
      .set('x-organization-id', orgB.id);

    expect(res.status).toBe(200);
    expect(res.body.total_devices).toBe(1);
    expect(res.body.worst_device?.name).toBe('TV Do Vizinho');
  });
});
