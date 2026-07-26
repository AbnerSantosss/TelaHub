import { deviceRepository } from '../repositories/device.repository';
import { displayRepository, TenantScope } from '../repositories/display.repository';
import { userRepository } from '../repositories/user.repository';
import { sendDeviceOfflineAlertEmail } from './email.service';
import { uptimeService } from './uptime.service';

// Um device é considerado offline se não manda heartbeat há mais desse tempo.
export const ONLINE_THRESHOLD_MS = 60_000;

// Só alertamos se o device ficar offline por mais tempo que isso — evita
// disparar e-mail para instabilidades curtas de rede.
export const OFFLINE_ALERT_THRESHOLD_MS = 5 * 60_000;

export class DeviceService {
  /** Lista devices do tenant (`null` = todas, só master). */
  async getAll(tenantId?: TenantScope) {
    return deviceRepository.findAll(tenantId);
  }

  isOnline(lastSeen: Date): boolean {
    return Date.now() - lastSeen.getTime() < ONLINE_THRESHOLD_MS;
  }

  // Agrega o status (online/offline) dos devices do tenant a partir do lastSeen —
  // fonte única de verdade para o painel de saúde do Dashboard.
  async getHealthSummary(tenantId?: TenantScope) {
    const devices = await deviceRepository.findAll(tenantId);
    const linked = devices.filter((d) => d.status === 'linked');
    const online = linked.filter((d) => this.isOnline(d.lastSeen)).length;

    return {
      total: linked.length,
      online,
      offline: linked.length - online,
    };
  }

  /**
   * Registro PÚBLICO da TV. O device nasce sem organização — o tenant é definido
   * no ato do pareamento (`link`).
   */
  async register(deviceId: string, code: string) {
    return deviceRepository.upsert(deviceId, {
      pairingCode: code,
      status: 'pending',
    });
  }

  /** Status PÚBLICO (a TV consulta o próprio id). Sem escopo por design. */
  async getStatus(deviceId: string) {
    return deviceRepository.findById(deviceId);
  }

  /** Busca escopada por tenant. */
  async getByIdScoped(deviceId: string, tenantId: TenantScope) {
    return deviceRepository.findByIdScoped(deviceId, tenantId);
  }

  /**
   * Vincula um device pendente a um display do tenant.
   *
   * Retorna:
   * - `'display-not-found'` → o display informado não é do tenant (a rota
   *   responde 404, sem vazar existência);
   * - `null` → código de pareamento inválido / device já vinculado.
   */
  async link(
    code: string,
    displayId: string,
    name: string,
    tenantId: TenantScope
  ): Promise<{ device: any } | null | 'display-not-found'> {
    const display = await displayRepository.findByIdScoped(displayId, tenantId);
    if (!display) return 'display-not-found';

    const device = await deviceRepository.findByPairingCode(code);
    if (!device) return null;

    // O tenant do device vem do display ao qual ele foi pareado (fallback: escopo
    // da requisição). `activatedAt` marca quando ele passou a contar como tela
    // ativa para cobrança — só é gravado uma vez.
    const organizationId = display.organizationId ?? tenantId ?? null;

    const updated = await deviceRepository.update(device.id, {
      displayId,
      name,
      status: 'linked',
      pairingCode: null,
      organizationId,
      ...(device.activatedAt ? {} : { activatedAt: new Date() }),
    });

    return { device: updated };
  }

  /**
   * Reatribui o display de um device. Ambos (device e novo display) precisam ser
   * do tenant. Retorna false quando algum não pertence ao escopo.
   */
  async updateDisplayIdScoped(deviceId: string, displayId: string, tenantId: TenantScope): Promise<boolean> {
    const display = await displayRepository.findByIdScoped(displayId, tenantId);
    if (!display) return false;

    const count = await deviceRepository.updateScoped(deviceId, tenantId, { displayId });
    return count > 0;
  }

  /** Delete escopado: false quando o device não existe no tenant. */
  async unlinkScoped(deviceId: string, tenantId: TenantScope): Promise<boolean> {
    const count = await deviceRepository.deleteScoped(deviceId, tenantId);
    return count > 0;
  }

  /** Heartbeat PÚBLICO da TV. Sem escopo por design. */
  async heartbeat(deviceId: string) {
    // Volta a alertar numa próxima queda — limpa o marcador de alerta já enviado.
    const device = await deviceRepository.update(deviceId, { lastSeen: new Date(), lastAlertedAt: null });

    // O heartbeat é a única prova de que a tela voltou. Registrar aqui a
    // transição para `online` — o `recordStatusChange` já ignora o caso em que
    // ela nunca chegou a ser marcada como offline.
    await this.recordStatusChangeSafely(deviceId, 'online', device?.organizationId ?? null);

    return device;
  }

  /**
   * Varre os devices pareados e registra a QUEDA (`offline`) dos que passaram
   * do limite de heartbeat sem dar sinal.
   *
   * Roda no mesmo job do alerta de heartbeat, mas separado dele de propósito:
   * o alerta só dispara depois de `OFFLINE_ALERT_THRESHOLD_MS` (5 min, para não
   * spammar), enquanto a MEDIÇÃO de disponibilidade tem que usar o limite real
   * de online (`ONLINE_THRESHOLD_MS`, 60s) — senão o relatório perderia toda
   * queda curta.
   *
   * O `changedAt` gravado é o instante em que o `lastSeen` estourou o limite,
   * não o instante da varredura: a varredura roda a cada 60s e usar a hora dela
   * arredondaria toda queda para cima.
   */
  async recordOfflineTransitions(): Promise<void> {
    const devices = await deviceRepository.findAll();
    const now = Date.now();

    for (const device of devices) {
      if (device.status !== 'linked') continue;
      if (this.isOnline(device.lastSeen)) continue;

      const crossedAt = new Date(Math.min(device.lastSeen.getTime() + ONLINE_THRESHOLD_MS, now));
      await this.recordStatusChangeSafely(device.id, 'offline', device.organizationId ?? null, crossedAt);
    }
  }

  /**
   * Nunca deixe a medição de uptime derrubar o caminho crítico (heartbeat da TV
   * ou job de alerta). Falha aqui é log, não exceção propagada.
   */
  private async recordStatusChangeSafely(
    deviceId: string,
    status: 'online' | 'offline',
    organizationId: string | null,
    changedAt?: Date
  ): Promise<void> {
    try {
      await uptimeService.recordStatusChange(deviceId, status, { organizationId, changedAt });
    } catch (err) {
      console.error(`Erro ao registrar transição de status do device (${deviceId}):`, err);
    }
  }

  // Varre devices pareados offline há mais que OFFLINE_ALERT_THRESHOLD_MS e ainda
  // não alertados nesta queda, e envia e-mail para os admins DA ORGANIZAÇÃO do
  // device (mais o master da plataforma).
  async checkOfflineDevicesAndAlert(): Promise<void> {
    const devices = await deviceRepository.findAll();
    const now = Date.now();

    const toAlert = devices.filter((d) => {
      if (d.status !== 'linked') return false;
      const offlineFor = now - d.lastSeen.getTime();
      if (offlineFor < OFFLINE_ALERT_THRESHOLD_MS) return false;
      return !d.lastAlertedAt;
    });

    if (toAlert.length === 0) return;

    const users = await userRepository.findAll();
    const masters = users.filter((u) => u.role === 'master');

    for (const device of toAlert) {
      // Um alerta de tela offline é informação do cliente: só os admins daquela
      // organização (e o master, dono da plataforma) devem receber.
      const orgAdmins = device.organizationId
        ? users.filter((u) => u.role === 'admin' && u.organizationId === device.organizationId)
        : [];

      const recipients = dedupeByEmail([...orgAdmins, ...masters]);
      if (recipients.length === 0) continue;

      try {
        for (const recipient of recipients) {
          await sendDeviceOfflineAlertEmail(recipient.email, device.name || device.id);
        }
        await deviceRepository.update(device.id, { lastAlertedAt: new Date() });
      } catch (err) {
        console.error(`Erro ao alertar sobre device offline (${device.id}):`, err);
      }
    }
  }
}

function dedupeByEmail<T extends { email: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    if (seen.has(item.email)) return false;
    seen.add(item.email);
    return true;
  });
}

export const deviceService = new DeviceService();
