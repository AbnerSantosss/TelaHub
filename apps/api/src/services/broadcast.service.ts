import { broadcastRepository } from '../repositories/broadcast.repository';
import { TenantScope } from '../repositories/display.repository';
import { isSameTenant, TenantScopeError } from '../middlewares/tenant.middleware';

function parseBroadcast<T extends { page: string; displayIds: string }>(b: T) {
  return {
    ...b,
    page: typeof b.page === 'string' ? JSON.parse(b.page) : b.page,
    displayIds: typeof b.displayIds === 'string' ? JSON.parse(b.displayIds) : b.displayIds,
  };
}

export class BroadcastService {
  /** Lista broadcasts do tenant (`null` = todas, só master). */
  async getAll(tenantId?: TenantScope) {
    const broadcasts = await broadcastRepository.findAll(tenantId);
    return broadcasts.map(parseBroadcast);
  }

  async getByIdScoped(id: string, tenantId: TenantScope) {
    const broadcast = await broadcastRepository.findByIdScoped(id, tenantId);
    if (!broadcast) return null;
    return parseBroadcast(broadcast);
  }

  /**
   * Cria ou sobrescreve um broadcast DENTRO do tenant. O `organizationId` é
   * imposto pelo servidor. Sobrescrever broadcast de outro tenant lança
   * `TenantScopeError` (a rota traduz para 404).
   */
  async save(
    data: {
      id?: string;
      name: string;
      page: any;
      startTime: string;
      endTime: string;
      isPermanent: boolean;
      displayIds: any;
      active: boolean;
      createdAt?: string;
      createdBy?: string | null;
    },
    tenantId: TenantScope
  ) {
    let existingOrganizationId: string | null | undefined;

    if (data.id) {
      const existing = await broadcastRepository.findById(data.id);
      if (existing) {
        if (!isSameTenant(existing.organizationId, tenantId)) {
          throw new TenantScopeError('Broadcast não encontrado.');
        }
        existingOrganizationId = existing.organizationId;
      }
    }

    const organizationId = (tenantId ?? undefined) ?? existingOrganizationId ?? null;

    return broadcastRepository.upsert({
      id: data.id,
      name: data.name,
      page: typeof data.page === 'string' ? data.page : JSON.stringify(data.page),
      startTime: data.startTime,
      endTime: data.endTime,
      isPermanent: data.isPermanent,
      displayIds: typeof data.displayIds === 'string' ? data.displayIds : JSON.stringify(data.displayIds),
      active: data.active,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      createdBy: data.createdBy || null,
      organizationId,
    });
  }

  /** Delete sem escopo — uso interno/scripts. */
  async delete(id: string) {
    return broadcastRepository.delete(id);
  }

  /** Delete escopado: false quando o broadcast não existe no tenant. */
  async deleteScoped(id: string, tenantId: TenantScope): Promise<boolean> {
    const count = await broadcastRepository.deleteScoped(id, tenantId);
    return count > 0;
  }
}

export const broadcastService = new BroadcastService();
