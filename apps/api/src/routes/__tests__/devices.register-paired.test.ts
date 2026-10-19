/**
 * Registro público da TV não pode desparear ninguém (2026-10-19).
 *
 * Falha encontrada no teste ponta a ponta por HTTP: `POST /api/devices/register`
 * é público e, para um `deviceId` já pareado, o upsert devolvia o device a
 * `pending` com o código de quem chamou. Bastava saber o id da TV para tirá-la
 * do ar (e pareá-la na própria conta com esse código).
 *
 * Aqui fica provado que:
 * - device pareado mantém status, display, organização e nome;
 * - o código "plantado" não serve para parear a TV em outra conta;
 * - device novo e device pendente continuam recebendo código (boot do player);
 * - re-parear depois de remover a TV no painel continua funcionando;
 * - TV cujo display foi apagado volta a aceitar código, mas só na mesma org;
 * - heartbeat de id inexistente responde 404, e não 500.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import app from '../../server';
import prisma from '../../lib/prisma';
import { authHeaderFor, createTestOrganization, grantFeatures } from './tenant-helpers';

let orgA: { id: string };
let orgB: { id: string };
let headerA: string;
let headerB: string;
const createdDevices: string[] = [];

function newDeviceId() {
  const id = `dev-par-${crypto.randomUUID()}`;
  createdDevices.push(id);
  return id;
}

function newCode() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
}

async function createDisplay(authHeader: string, name: string) {
  const res = await request(app)
    .post('/api/displays')
    .set('Authorization', authHeader)
    .send({ name, slug: `par-${crypto.randomUUID().slice(0, 8)}`, pages: [] });
  expect(res.status).toBe(200);
  return res.body as { id: string };
}

async function register(deviceId: string, code: string) {
  return request(app).post('/api/devices/register').send({ deviceId, code });
}

async function link(authHeader: string, code: string, displayId: string, name = 'TV do caixa') {
  return request(app).post('/api/devices/link').set('Authorization', authHeader).send({ code, displayId, name });
}

/** Device registrado e pareado no display informado. */
async function pairedDevice(authHeader: string, displayId: string) {
  const deviceId = newDeviceId();
  const code = newCode();
  expect((await register(deviceId, code)).status).toBe(200);
  expect((await link(authHeader, code, displayId)).status).toBe(200);
  return deviceId;
}

beforeAll(async () => {
  orgA = await createTestOrganization('Par A');
  orgB = await createTestOrganization('Par B');
  // Sem limite de telas: o teste pareia várias TVs na mesma org.
  await grantFeatures(orgA.id, []);
  await grantFeatures(orgB.id, []);
  headerA = authHeaderFor({ organizationId: orgA.id, id: 'user-par-a', email: 'par-a@example.com' });
  headerB = authHeaderFor({ organizationId: orgB.id, id: 'user-par-b', email: 'par-b@example.com' });
});

afterAll(async () => {
  await prisma.deviceStatusChange.deleteMany({ where: { deviceId: { in: createdDevices } } }).catch(() => undefined);
  await prisma.device.deleteMany({ where: { id: { in: createdDevices } } });
});

describe('POST /api/devices/register com device já pareado', () => {
  it('não altera pareamento, org, display nem nome', async () => {
    const display = await createDisplay(headerA, 'Vitrine A');
    const deviceId = await pairedDevice(headerA, display.id);
    const before = await prisma.device.findUnique({ where: { id: deviceId } });
    expect(before?.status).toBe('linked');

    const res = await register(deviceId, newCode());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Dispositivo já pareado.', status: 'linked', display_id: display.id });
    // Nada da organização vaza pela rota pública.
    expect(res.body).not.toHaveProperty('name');
    expect(res.body).not.toHaveProperty('organizationId');
    expect(res.body).not.toHaveProperty('pairing_code');

    const after = await prisma.device.findUnique({ where: { id: deviceId } });
    expect(after?.status).toBe('linked');
    expect(after?.displayId).toBe(display.id);
    expect(after?.organizationId).toBe(orgA.id);
    expect(after?.name).toBe(before?.name);
    expect(after?.pairingCode).toBeNull();
  });

  it('o código plantado por terceiro não pareia a TV em outra conta', async () => {
    const displayA = await createDisplay(headerA, 'Balcão A');
    const displayB = await createDisplay(headerB, 'Balcão B');
    const deviceId = await pairedDevice(headerA, displayA.id);

    const plantedCode = newCode();
    await register(deviceId, plantedCode);
    const hijack = await link(headerB, plantedCode, displayB.id, 'Roubada');

    expect(hijack.status).toBe(404);
    const after = await prisma.device.findUnique({ where: { id: deviceId } });
    expect(after?.organizationId).toBe(orgA.id);
    expect(after?.displayId).toBe(displayA.id);
  });

  it('o status público continua mostrando a TV pareada', async () => {
    const display = await createDisplay(headerA, 'Status A');
    const deviceId = await pairedDevice(headerA, display.id);
    await register(deviceId, newCode());

    const status = await request(app).get(`/api/devices/${deviceId}/status`);
    expect(status.status).toBe(200);
    expect(status.body.status).toBe('linked');
    expect(status.body.display_id).toBe(display.id);
  });
});

describe('POST /api/devices/register: fluxos legítimos do player', () => {
  it('device novo recebe o código e fica pending', async () => {
    const deviceId = newDeviceId();
    const code = newCode();

    const res = await register(deviceId, code);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'pending', pairing_code: code });
    const saved = await prisma.device.findUnique({ where: { id: deviceId } });
    expect(saved?.status).toBe('pending');
    expect(saved?.pairingCode).toBe(code);
    expect(saved?.organizationId).toBeNull();
  });

  it('device pendente re-registrado fica com o código novo', async () => {
    const deviceId = newDeviceId();
    await register(deviceId, newCode());
    const second = newCode();

    const res = await register(deviceId, second);

    expect(res.status).toBe(200);
    expect((await prisma.device.findUnique({ where: { id: deviceId } }))?.pairingCode).toBe(second);
  });

  it('depois de remover a TV no painel, o mesmo id volta a parear', async () => {
    const display = await createDisplay(headerA, 'Remover A');
    const deviceId = await pairedDevice(headerA, display.id);

    const removed = await request(app).delete(`/api/devices/${deviceId}`).set('Authorization', headerA);
    expect(removed.status).toBe(200);

    const code = newCode();
    const res = await register(deviceId, code);
    expect(res.body).toMatchObject({ status: 'pending', pairing_code: code });

    const relinked = await link(headerA, code, display.id);
    expect(relinked.status).toBe(200);
    expect((await prisma.device.findUnique({ where: { id: deviceId } }))?.status).toBe('linked');
  });

  it('TV cujo display foi apagado volta a aceitar código, só na mesma org', async () => {
    const display = await createDisplay(headerA, 'Apagado A');
    const deviceId = await pairedDevice(headerA, display.id);
    await prisma.display.delete({ where: { id: display.id } });

    const orphan = await prisma.device.findUnique({ where: { id: deviceId } });
    expect(orphan?.status).toBe('linked');
    expect(orphan?.displayId).toBeNull();

    const code = newCode();
    const res = await register(deviceId, code);
    expect(res.body).toMatchObject({ status: 'pending', pairing_code: code });
    const pending = await prisma.device.findUnique({ where: { id: deviceId } });
    expect(pending?.organizationId).toBe(orgA.id);

    // Outra conta não leva a TV, mesmo com o código certo.
    const displayB = await createDisplay(headerB, 'Ladrão B');
    expect((await link(headerB, code, displayB.id)).status).toBe(404);

    // A dona pareia de novo num display dela.
    const newDisplay = await createDisplay(headerA, 'Novo A');
    expect((await link(headerA, code, newDisplay.id)).status).toBe(200);
    const relinked = await prisma.device.findUnique({ where: { id: deviceId } });
    expect(relinked?.status).toBe('linked');
    expect(relinked?.displayId).toBe(newDisplay.id);
    expect(relinked?.organizationId).toBe(orgA.id);
  });
});

describe('PATCH /api/devices/:id/heartbeat', () => {
  it('id inexistente responde 404', async () => {
    const res = await request(app).patch(`/api/devices/dev-que-nao-existe-${crypto.randomUUID()}/heartbeat`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Dispositivo não encontrado.');
  });

  it('id existente continua 200', async () => {
    const deviceId = newDeviceId();
    await register(deviceId, newCode());

    const res = await request(app).patch(`/api/devices/${deviceId}/heartbeat`);
    expect(res.status).toBe(200);
  });
});
