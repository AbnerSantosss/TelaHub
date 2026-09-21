import prisma from '../lib/prisma';
import type { TenantScope } from './display.repository';

function tenantWhere(organizationId: TenantScope) {
  return organizationId ? { organizationId } : {};
}

export class BroadcastRepository {
  /** Lista broadcasts. Com `organizationId`, restringe ao tenant. */
  async findAll(organizationId?: TenantScope) {
    return prisma.broadcast.findMany({
      where: tenantWhere(organizationId),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.broadcast.findUnique({ where: { id } });
  }

  /** Busca escopada: retorna null se o broadcast for de outro tenant. */
  async findByIdScoped(id: string, organizationId?: TenantScope) {
    return prisma.broadcast.findFirst({ where: { id, ...tenantWhere(organizationId) } });
  }

  async upsert(data: {
    id?: string;
    name: string;
    page: string;
    startTime: string;
    endTime: string;
    isPermanent: boolean;
    displayIds: string;
    active: boolean;
    createdAt?: Date;
    createdBy?: string | null;
    organizationId?: string | null;
  }) {
    return prisma.broadcast.upsert({
      where: { id: data.id || '' },
      update: {
        name: data.name,
        page: data.page,
        startTime: data.startTime,
        endTime: data.endTime,
        isPermanent: data.isPermanent,
        displayIds: data.displayIds,
        active: data.active,
        createdBy: data.createdBy || null,
        ...(data.organizationId !== undefined ? { organizationId: data.organizationId } : {}),
      },
      create: {
        id: data.id,
        name: data.name,
        page: data.page,
        startTime: data.startTime,
        endTime: data.endTime,
        isPermanent: data.isPermanent,
        displayIds: data.displayIds,
        active: data.active,
        createdAt: data.createdAt || new Date(),
        createdBy: data.createdBy || null,
        organizationId: data.organizationId ?? null,
      },
    });
  }

  async delete(id: string) {
    return prisma.broadcast.delete({ where: { id } });
  }

  /** Delete escopado: retorna a quantidade removida (0 = fora do tenant). */
  async deleteScoped(id: string, organizationId?: TenantScope) {
    const result = await prisma.broadcast.deleteMany({ where: { id, ...tenantWhere(organizationId) } });
    return result.count;
  }
}

export const broadcastRepository = new BroadcastRepository();
