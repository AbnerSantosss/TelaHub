/**
 * Convite de usuário não pode escalar privilégio (2026-10-19).
 *
 * Falha encontrada no teste ponta a ponta por HTTP: `POST /api/users/invite`
 * com `role: 'master'` devolvia 201 e criava um master (dono da plataforma)
 * dentro da organização, e qualquer papel autenticado (Leitor, Editor) podia
 * convidar. Aqui fica provado que:
 * - `master` (ou qualquer papel que não é de organização) é recusado com 400;
 * - Leitor, Editor e o Operador antigo (`user`) recebem 403;
 * - Administrador convida os papéis válidos, inclusive o `user` que o painel
 *   envia hoje para "Operador";
 * - o master em modo suporte continua convidando dentro da org escolhida.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// O convite valida o SMTP e manda e-mail. Nada disso interessa aqui; o resto do
// módulo segue real porque o servidor inteiro o importa.
vi.mock('../../services/email.service', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/email.service')>();
  return {
    ...original,
    testSmtpConnection: vi.fn(async () => ({ ok: true })),
    sendInviteEmail: vi.fn(async () => undefined),
  };
});

import request from 'supertest';
import crypto from 'crypto';
import app from '../../server';
import prisma from '../../lib/prisma';
import { authHeaderFor, createTestOrganization, grantFeatures } from './tenant-helpers';
import { userService, InvalidInviteRoleError } from '../../services/user.service';

let org: { id: string };
const createdEmails: string[] = [];

function newEmail(tag: string) {
  const email = `convite-${tag}-${crypto.randomUUID().slice(0, 8)}@example.com`;
  createdEmails.push(email);
  return email;
}

function headerAs(role: string) {
  return authHeaderFor({ organizationId: org.id, role, id: `user-${role}`, email: `${role}@example.com` });
}

async function invite(authHeader: string, body: Record<string, unknown>, extraHeaders: Record<string, string> = {}) {
  const req = request(app).post('/api/users/invite').set('Authorization', authHeader);
  for (const [k, v] of Object.entries(extraHeaders)) req.set(k, v);
  return req.send(body);
}

beforeAll(async () => {
  org = await createTestOrganization('Convite Papel');
  // Plano sem limite de usuários: o teste mede papel, não quota.
  await grantFeatures(org.id, []);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

describe('POST /api/users/invite: papel do convite', () => {
  it('recusa role master com 400 e não cria usuário', async () => {
    const email = newEmail('master');
    const res = await invite(headerAs('admin'), { email, role: 'master' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Payload inválido.');
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it('recusa papel desconhecido com 400', async () => {
    const email = newEmail('dono');
    const res = await invite(headerAs('admin'), { email, role: 'superadmin' });

    expect(res.status).toBe(400);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it.each(['viewer', 'editor', 'user'])('papel %s não convida (403) e nada é criado', async (role) => {
    const email = newEmail(`por-${role}`);
    const res = await invite(headerAs(role), { email, role: 'viewer' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('permission_denied');
    expect(typeof res.body.error).toBe('string');
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it('viewer pedindo admin também é 403 (não chega a escolher papel)', async () => {
    const email = newEmail('viewer-admin');
    const res = await invite(headerAs('viewer'), { email, role: 'admin' });

    expect(res.status).toBe(403);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it.each(['admin', 'editor', 'viewer', 'user'])('admin convida %s (201) dentro da própria org', async (role) => {
    const email = newEmail(`admin-${role}`);
    const res = await invite(headerAs('admin'), { email, role });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe(role);

    const saved = await prisma.user.findUnique({ where: { email } });
    expect(saved?.role).toBe(role);
    expect(saved?.organizationId).toBe(org.id);
  });

  it('sem role no corpo grava Operador (user), como o painel espera', async () => {
    const email = newEmail('sem-role');
    const res = await invite(headerAs('admin'), { email });

    expect(res.status).toBe(201);
    const saved = await prisma.user.findUnique({ where: { email } });
    expect(saved?.role).toBe('user');
  });

  it('master em modo suporte convida admin na org escolhida, mas não master', async () => {
    const masterHeader = authHeaderFor({ organizationId: null, role: 'master', id: 'test-master', email: 'master@example.com' });
    const scope = { 'X-Organization-Id': org.id, 'X-Support-Reason': 'teste de convite' };

    const okEmail = newEmail('suporte-admin');
    const ok = await invite(masterHeader, { email: okEmail, role: 'admin' }, scope);
    expect(ok.status).toBe(201);
    expect((await prisma.user.findUnique({ where: { email: okEmail } }))?.organizationId).toBe(org.id);

    const badEmail = newEmail('suporte-master');
    const bad = await invite(masterHeader, { email: badEmail, role: 'master' }, scope);
    expect(bad.status).toBe(400);
    expect(await prisma.user.findUnique({ where: { email: badEmail } })).toBeNull();
  });
});

describe('userService.inviteUser: defesa no serviço', () => {
  it('recusa master mesmo chamado direto, antes de tocar no banco', async () => {
    const email = newEmail('servico-master');
    await expect(userService.inviteUser(email, 'master', org.id)).rejects.toBeInstanceOf(InvalidInviteRoleError);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });
});
