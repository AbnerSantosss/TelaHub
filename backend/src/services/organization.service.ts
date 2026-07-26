import { organizationRepository } from '../repositories/organization.repository';
import { displayRepository, TenantScope } from '../repositories/display.repository';
import { deviceRepository } from '../repositories/device.repository';
import { broadcastRepository } from '../repositories/broadcast.repository';
import { deviceService } from './device.service';

export const DEFAULT_ORG_NAME = 'Loja Padrão';

/**
 * Organização padrão — destino de dados legados (displays/devices/broadcasts e
 * mídia sem `organizationId`). Criada sob demanda, de forma idempotente.
 */
export async function resolveDefaultOrganizationId(): Promise<string> {
  const existing = await organizationRepository.findByName(DEFAULT_ORG_NAME);
  if (existing) return existing.id;
  const created = await organizationRepository.create(DEFAULT_ORG_NAME);
  return created.id;
}

export class OrganizationService {
  /** Lista sem escopo — apenas para rotinas internas. */
  async getAll() {
    return organizationRepository.findAll();
  }

  /**
   * Lista escopada: `master` (tenantId null) vê todas; qualquer outro usuário vê
   * exatamente a sua própria organização.
   */
  async getAllScoped(tenantId: TenantScope) {
    return organizationRepository.findAllScoped(tenantId);
  }

  async create(name: string) {
    return organizationRepository.create(name);
  }

  async getDefaultOrganizationId() {
    return resolveDefaultOrganizationId();
  }

  // Relatório agregado: displays/devices online-offline e uso de broadcasts de uma
  // Organização, opcionalmente restrito a um período (por data de criação do broadcast).
  async getReport(organizationId: string, period?: { startDate?: Date; endDate?: Date }) {
    const displays = await displayRepository.findByOrganizationId(organizationId);

    // Devices e broadcasts agora carregam `organizationId` próprio — a agregação
    // é feita direto pelo tenant, sem varrer o banco inteiro.
    const orgDevices = (await deviceRepository.findAll(organizationId)).filter((d) => d.status === 'linked');
    const devicesOnline = orgDevices.filter((d) => deviceService.isOnline(d.lastSeen)).length;

    const orgBroadcasts = (await broadcastRepository.findAll(organizationId)).filter((b) => {
      if (period?.startDate && b.createdAt < period.startDate) return false;
      if (period?.endDate && b.createdAt > period.endDate) return false;
      return true;
    });

    return {
      organizationId,
      displaysCount: displays.length,
      devicesOnline,
      devicesOffline: orgDevices.length - devicesOnline,
      broadcastsCount: orgBroadcasts.length,
      period: {
        startDate: period?.startDate?.toISOString() ?? null,
        endDate: period?.endDate?.toISOString() ?? null,
      },
    };
  }
}

export const organizationService = new OrganizationService();
