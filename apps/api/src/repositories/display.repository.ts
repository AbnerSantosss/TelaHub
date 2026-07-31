import prisma from '../lib/prisma';

/** `null`/`undefined` = sem filtro de tenant (apenas master). */
export type TenantScope = string | null | undefined;

function tenantWhere(organizationId: TenantScope) {
  return organizationId ? { organizationId } : {};
}

export class DisplayRepository {
  /** Lista displays. Com `organizationId`, restringe ao tenant. */
  async findAll(organizationId?: TenantScope) {
    return prisma.display.findMany({
      where: tenantWhere(organizationId),
      orderBy: { name: 'asc' },
    });
  }

  /** Busca sem escopo — uso interno / rotas públicas do Player. */
  async findById(id: string) {
    return prisma.display.findUnique({ where: { id } });
  }

  /** Busca escopada: retorna null se o display for de outro tenant. */
  async findByIdScoped(id: string, organizationId?: TenantScope) {
    return prisma.display.findFirst({ where: { id, ...tenantWhere(organizationId) } });
  }

  /** Usado para validar em lote que displayIds pertencem ao tenant. */
  async findManyByIds(ids: string[], organizationId?: TenantScope) {
    if (ids.length === 0) return [];
    return prisma.display.findMany({
      where: { id: { in: ids }, ...tenantWhere(organizationId) },
      select: { id: true, organizationId: true },
    });
  }

  async findBySlug(slug: string) {
    return prisma.display.findUnique({ where: { slug } });
  }

  // Query ultra-leve: retorna apenas o timestamp de atualização
  async findVersionBySlug(slug: string) {
    return prisma.display.findUnique({
      where: { slug },
      select: { updatedAt: true },
    });
  }

  async upsert(data: {
    id?: string;
    name: string;
    slug: string;
    pages: string;
    coverImage?: string | null;
    organizationId?: string | null;
  }) {
    // Determine coverImage value: null clears it, string sets it, undefined means not provided (keep current)
    const coverImageValue = data.coverImage !== undefined ? data.coverImage : undefined;

    return prisma.display.upsert({
      where: { id: data.id || '' },
      update: {
        name: data.name,
        slug: data.slug,
        pages: data.pages,
        coverImage: coverImageValue,
        ...(data.organizationId !== undefined ? { organizationId: data.organizationId } : {}),
      },
      create: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        pages: data.pages,
        coverImage: data.coverImage ?? null,
        organizationId: data.organizationId ?? null,
      },
    });
  }

  async findByOrganizationId(organizationId: string) {
    return prisma.display.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
  }

  async delete(id: string) {
    return prisma.display.delete({ where: { id } });
  }

  /** Delete escopado: retorna a quantidade removida (0 = fora do tenant). */
  async deleteScoped(id: string, organizationId?: TenantScope) {
    const result = await prisma.display.deleteMany({ where: { id, ...tenantWhere(organizationId) } });
    return result.count;
  }
}

export const displayRepository = new DisplayRepository();
