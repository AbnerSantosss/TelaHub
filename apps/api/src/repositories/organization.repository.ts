import prisma from '../lib/prisma';
import type { TenantScope } from './display.repository';

export class OrganizationRepository {
  async findAll() {
    return prisma.organization.findMany({ orderBy: { name: 'asc' } });
  }

  /**
   * Lista organizações visíveis para o escopo: `null` (master) → todas;
   * tenant definido → apenas a própria.
   */
  async findAllScoped(organizationId: TenantScope) {
    if (!organizationId) return this.findAll();
    return prisma.organization.findMany({ where: { id: organizationId }, orderBy: { name: 'asc' } });
  }

  async findById(id: string) {
    return prisma.organization.findUnique({ where: { id } });
  }

  async findByName(name: string) {
    return prisma.organization.findFirst({ where: { name } });
  }

  async create(name: string) {
    return prisma.organization.create({ data: { name } });
  }
}

export const organizationRepository = new OrganizationRepository();
