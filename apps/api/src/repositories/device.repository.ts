import prisma from '../lib/prisma';
import type { TenantScope } from './display.repository';

function tenantWhere(organizationId: TenantScope) {
  return organizationId ? { organizationId } : {};
}

export class DeviceRepository {
  /** Lista devices. Com `organizationId`, restringe ao tenant. */
  async findAll(organizationId?: TenantScope) {
    return prisma.device.findMany({
      where: tenantWhere(organizationId),
      orderBy: { lastSeen: 'desc' },
    });
  }

  /** Busca sem escopo — rotas públicas do device (status/heartbeat). */
  async findById(id: string) {
    return prisma.device.findUnique({ where: { id } });
  }

  /** Busca escopada: retorna null se o device for de outro tenant. */
  async findByIdScoped(id: string, organizationId?: TenantScope) {
    return prisma.device.findFirst({ where: { id, ...tenantWhere(organizationId) } });
  }

  /**
   * Busca pelo código de pareamento. NÃO é escopada de propósito: um device
   * recém-registrado por uma TV ainda não pertence a nenhuma organização — é o
   * ato de vincular (`POST /api/devices/link`) que define o tenant dele.
   */
  async findByPairingCode(code: string) {
    return prisma.device.findFirst({
      where: { pairingCode: code, status: 'pending' },
    });
  }

  async upsert(id: string, data: { pairingCode: string; status: string }) {
    return prisma.device.upsert({
      where: { id },
      update: {
        pairingCode: data.pairingCode,
        status: data.status,
        lastSeen: new Date(),
      },
      create: {
        id,
        pairingCode: data.pairingCode,
        status: data.status,
        lastSeen: new Date(),
      },
    });
  }

  /**
   * Registro da TV que NUNCA mexe em device pareado.
   *
   * "Pareado" = `status: 'linked'` COM display. O update é condicional na
   * própria query (não "lê e depois grava"), para que um `link` concorrente não
   * seja desfeito entre a leitura e a escrita.
   *
   * Retorna:
   * - `registered` → device criado, ou não pareado que recebeu o código novo;
   * - `already-paired` → device pareado, devolvido como está (nada gravado).
   *
   * Device `linked` SEM display (o display foi apagado: `onDelete: SetNull`)
   * conta como não pareado e volta a `pending`, mantendo a organização. É o
   * caminho pelo qual essa TV volta a mostrar um código válido no boot.
   */
  async registerUnlessPaired(id: string, pairingCode: string) {
    const now = new Date();
    const updated = await prisma.device.updateMany({
      where: { id, OR: [{ status: { not: 'linked' } }, { displayId: null }] },
      data: { pairingCode, status: 'pending', lastSeen: now },
    });

    if (updated.count > 0) {
      const device = await prisma.device.findUnique({ where: { id } });
      return { outcome: 'registered' as const, device: device! };
    }

    const existing = await prisma.device.findUnique({ where: { id } });
    if (existing) return { outcome: 'already-paired' as const, device: existing };

    const created = await prisma.device.create({
      data: { id, pairingCode, status: 'pending', lastSeen: now },
    });
    return { outcome: 'registered' as const, device: created };
  }

  async update(id: string, data: Record<string, any>) {
    return prisma.device.update({ where: { id }, data });
  }

  /** Update escopado: retorna a quantidade afetada (0 = fora do tenant). */
  async updateScoped(id: string, organizationId: TenantScope, data: Record<string, any>) {
    const result = await prisma.device.updateMany({
      where: { id, ...tenantWhere(organizationId) },
      data,
    });
    return result.count;
  }

  async delete(id: string) {
    return prisma.device.delete({ where: { id } });
  }

  /** Delete escopado: retorna a quantidade removida (0 = fora do tenant). */
  async deleteScoped(id: string, organizationId?: TenantScope) {
    const result = await prisma.device.deleteMany({ where: { id, ...tenantWhere(organizationId) } });
    return result.count;
  }
}

export const deviceRepository = new DeviceRepository();
