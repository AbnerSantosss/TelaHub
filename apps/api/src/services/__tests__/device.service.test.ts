import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../repositories/device.repository', () => ({
  deviceRepository: {
    findAll: vi.fn(),
    findLinkedSeenBefore: vi.fn(),
    countLinked: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findAll: vi.fn(),
    findAlertRecipients: vi.fn(),
  },
}));

vi.mock('../email.service', () => ({
  sendDeviceOfflineAlertEmail: vi.fn(),
}));

vi.mock('../uptime.service', () => ({
  uptimeService: {
    recordStatusChange: vi.fn(),
    devicesWithLastStatus: vi.fn(),
  },
}));

import {
  deviceService,
  HEARTBEAT_INTERVAL_MS,
  OFFLINE_ALERT_THRESHOLD_MS,
  ONLINE_THRESHOLD_MS,
} from '../device.service';
import { deviceRepository } from '../../repositories/device.repository';
import { userRepository } from '../../repositories/user.repository';
import { sendDeviceOfflineAlertEmail } from '../email.service';
import { uptimeService } from '../uptime.service';

const ORG_A = 'org-a';
const ORG_B = 'org-b';

const offlineDevice = (over: Record<string, unknown> = {}) =>
  ({
    id: 'dev-1',
    name: 'TV Recepção',
    organizationId: ORG_A,
    lastSeen: new Date(Date.now() - OFFLINE_ALERT_THRESHOLD_MS - 1000),
    lastAlertedAt: null,
    ...over,
  }) as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('limite de online x intervalo do heartbeat', () => {
  // A regressão que este teste trava: limite de 60 s com o player batendo a
  // cada 120 s fazia toda TV saudável aparecer offline metade do tempo.
  it('o limite de online cobre pelo menos duas batidas do player', () => {
    expect(ONLINE_THRESHOLD_MS).toBeGreaterThanOrEqual(HEARTBEAT_INTERVAL_MS * 2);
  });

  it('cobre também o player antigo em cache, que bate a cada 120 s', () => {
    expect(ONLINE_THRESHOLD_MS).toBeGreaterThan(120_000);
  });

  it('isOnline: uma batida perdida não derruba a TV', () => {
    expect(deviceService.isOnline(new Date(Date.now() - HEARTBEAT_INTERVAL_MS * 2))).toBe(true);
    expect(deviceService.isOnline(new Date(Date.now() - ONLINE_THRESHOLD_MS - 1000))).toBe(false);
  });
});

describe('DeviceService.getHealthSummary', () => {
  it('conta no banco, sem carregar a lista de devices', async () => {
    vi.mocked(deviceRepository.countLinked).mockResolvedValue({ total: 7, online: 5 });

    const summary = await deviceService.getHealthSummary(ORG_A as any);

    expect(summary).toEqual({ total: 7, online: 5, offline: 2 });
    expect(deviceRepository.findAll).not.toHaveBeenCalled();
    const [, seenSince] = vi.mocked(deviceRepository.countLinked).mock.calls[0];
    expect(Date.now() - (seenSince as Date).getTime()).toBeGreaterThanOrEqual(ONLINE_THRESHOLD_MS);
  });
});

describe('DeviceService.recordOfflineTransitions', () => {
  it('grava a queda no instante em que o limite estourou, não no da varredura', async () => {
    const lastSeen = new Date(Date.now() - ONLINE_THRESHOLD_MS - 30_000);
    vi.mocked(deviceRepository.findLinkedSeenBefore).mockResolvedValue([offlineDevice({ lastSeen })]);
    vi.mocked(uptimeService.devicesWithLastStatus).mockResolvedValue(new Set());

    await deviceService.recordOfflineTransitions();

    expect(uptimeService.recordStatusChange).toHaveBeenCalledTimes(1);
    const [deviceId, status, options] = vi.mocked(uptimeService.recordStatusChange).mock.calls[0];
    expect(deviceId).toBe('dev-1');
    expect(status).toBe('offline');
    expect((options as any).changedAt.getTime()).toBe(lastSeen.getTime() + ONLINE_THRESHOLD_MS);
  });

  it('não grava nada para quem já está marcado como offline', async () => {
    vi.mocked(deviceRepository.findLinkedSeenBefore).mockResolvedValue([
      offlineDevice({ id: 'dev-1' }),
      offlineDevice({ id: 'dev-2' }),
    ]);
    vi.mocked(uptimeService.devicesWithLastStatus).mockResolvedValue(new Set(['dev-1']));

    await deviceService.recordOfflineTransitions();

    const ids = vi.mocked(uptimeService.recordStatusChange).mock.calls.map((call) => call[0]);
    expect(ids).toEqual(['dev-2']);
  });

  it('não carrega a tabela inteira de devices', async () => {
    vi.mocked(deviceRepository.findLinkedSeenBefore).mockResolvedValue([]);

    await deviceService.recordOfflineTransitions();

    expect(deviceRepository.findAll).not.toHaveBeenCalled();
    expect(uptimeService.devicesWithLastStatus).not.toHaveBeenCalled();
  });
});

describe('DeviceService.checkOfflineDevicesAndAlert', () => {
  it('alerta um device linked que está offline há mais que o limite e ainda não foi alertado', async () => {
    vi.mocked(deviceRepository.findLinkedSeenBefore).mockResolvedValue([offlineDevice()]);
    vi.mocked(userRepository.findAlertRecipients).mockResolvedValue([
      { id: 'u1', email: 'admin@example.com', role: 'admin', organizationId: ORG_A } as any,
    ]);

    await deviceService.checkOfflineDevicesAndAlert();

    expect(sendDeviceOfflineAlertEmail).toHaveBeenCalledWith('admin@example.com', 'TV Recepção');
    expect(deviceRepository.update).toHaveBeenCalledWith('dev-1', { lastAlertedAt: expect.any(Date) });
  });

  it('pede ao banco só quem passou do limite do alerta e ainda não foi alertado', async () => {
    vi.mocked(deviceRepository.findLinkedSeenBefore).mockResolvedValue([]);

    await deviceService.checkOfflineDevicesAndAlert();

    const [cutoff, options] = vi.mocked(deviceRepository.findLinkedSeenBefore).mock.calls[0];
    expect(Date.now() - (cutoff as Date).getTime()).toBeGreaterThanOrEqual(OFFLINE_ALERT_THRESHOLD_MS);
    expect(options).toEqual({ onlyNotAlerted: true });
    // Sem ninguém para alertar, nem consulta usuários nem manda e-mail.
    expect(userRepository.findAlertRecipients).not.toHaveBeenCalled();
    expect(userRepository.findAll).not.toHaveBeenCalled();
    expect(sendDeviceOfflineAlertEmail).not.toHaveBeenCalled();
  });

  it('busca destinatários só das organizações afetadas', async () => {
    vi.mocked(deviceRepository.findLinkedSeenBefore).mockResolvedValue([
      offlineDevice({ id: 'dev-1', organizationId: ORG_A }),
      offlineDevice({ id: 'dev-2', organizationId: ORG_A }),
      offlineDevice({ id: 'dev-3', organizationId: null }),
    ]);
    vi.mocked(userRepository.findAlertRecipients).mockResolvedValue([]);

    await deviceService.checkOfflineDevicesAndAlert();

    expect(userRepository.findAlertRecipients).toHaveBeenCalledWith([ORG_A]);
  });

  it('avisa apenas os admins da organização do device (e o master), nunca admins de outro tenant', async () => {
    vi.mocked(deviceRepository.findLinkedSeenBefore).mockResolvedValue([offlineDevice({ name: 'TV Loja A' })]);
    // Mesmo que o repositório devolvesse gente a mais, o serviço filtra de novo.
    vi.mocked(userRepository.findAlertRecipients).mockResolvedValue([
      { id: 'a1', email: 'admin-a@example.com', role: 'admin', organizationId: ORG_A } as any,
      { id: 'b1', email: 'admin-b@example.com', role: 'admin', organizationId: ORG_B } as any,
      { id: 'm1', email: 'master@example.com', role: 'master', organizationId: null } as any,
      { id: 'u1', email: 'user-a@example.com', role: 'user', organizationId: ORG_A } as any,
    ]);

    await deviceService.checkOfflineDevicesAndAlert();

    const recipients = vi.mocked(sendDeviceOfflineAlertEmail).mock.calls.map((call) => call[0]);
    expect(recipients).toEqual(['admin-a@example.com', 'master@example.com']);
  });
});
