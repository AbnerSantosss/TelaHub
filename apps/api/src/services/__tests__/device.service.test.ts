import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../repositories/device.repository', () => ({
  deviceRepository: {
    findAll: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findAll: vi.fn(),
  },
}));

vi.mock('../email.service', () => ({
  sendDeviceOfflineAlertEmail: vi.fn(),
}));

import { deviceService, OFFLINE_ALERT_THRESHOLD_MS } from '../device.service';
import { deviceRepository } from '../../repositories/device.repository';
import { userRepository } from '../../repositories/user.repository';
import { sendDeviceOfflineAlertEmail } from '../email.service';

const ORG_A = 'org-a';
const ORG_B = 'org-b';

describe('DeviceService.checkOfflineDevicesAndAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('alerta um device linked que está offline há mais que o limite e ainda não foi alertado', async () => {
    const longOfflineDate = new Date(Date.now() - OFFLINE_ALERT_THRESHOLD_MS - 1000);

    vi.mocked(deviceRepository.findAll).mockResolvedValue([
      {
        id: 'dev-1',
        name: 'TV Recepção',
        status: 'linked',
        lastSeen: longOfflineDate,
        lastAlertedAt: null,
        organizationId: ORG_A,
      } as any,
    ]);
    vi.mocked(userRepository.findAll).mockResolvedValue([
      { id: 'u1', email: 'admin@example.com', role: 'admin', organizationId: ORG_A } as any,
    ]);

    await deviceService.checkOfflineDevicesAndAlert();

    expect(sendDeviceOfflineAlertEmail).toHaveBeenCalledWith('admin@example.com', 'TV Recepção');
    expect(deviceRepository.update).toHaveBeenCalledWith('dev-1', { lastAlertedAt: expect.any(Date) });
  });

  it('não alerta um device já alertado nesta queda', async () => {
    const longOfflineDate = new Date(Date.now() - OFFLINE_ALERT_THRESHOLD_MS - 1000);

    vi.mocked(deviceRepository.findAll).mockResolvedValue([
      {
        id: 'dev-1',
        name: 'TV Recepção',
        status: 'linked',
        lastSeen: longOfflineDate,
        lastAlertedAt: new Date(),
        organizationId: ORG_A,
      } as any,
    ]);
    vi.mocked(userRepository.findAll).mockResolvedValue([
      { id: 'u1', email: 'admin@example.com', role: 'admin', organizationId: ORG_A } as any,
    ]);

    await deviceService.checkOfflineDevicesAndAlert();

    expect(sendDeviceOfflineAlertEmail).not.toHaveBeenCalled();
  });

  it('não alerta um device offline há pouco tempo', async () => {
    const shortOfflineDate = new Date(Date.now() - 5_000);

    vi.mocked(deviceRepository.findAll).mockResolvedValue([
      {
        id: 'dev-1',
        name: 'TV Recepção',
        status: 'linked',
        lastSeen: shortOfflineDate,
        lastAlertedAt: null,
        organizationId: ORG_A,
      } as any,
    ]);
    vi.mocked(userRepository.findAll).mockResolvedValue([
      { id: 'u1', email: 'admin@example.com', role: 'admin', organizationId: ORG_A } as any,
    ]);

    await deviceService.checkOfflineDevicesAndAlert();

    expect(sendDeviceOfflineAlertEmail).not.toHaveBeenCalled();
  });

  it('avisa apenas os admins da organização do device (e o master), nunca admins de outro tenant', async () => {
    const longOfflineDate = new Date(Date.now() - OFFLINE_ALERT_THRESHOLD_MS - 1000);

    vi.mocked(deviceRepository.findAll).mockResolvedValue([
      {
        id: 'dev-1',
        name: 'TV Loja A',
        status: 'linked',
        lastSeen: longOfflineDate,
        lastAlertedAt: null,
        organizationId: ORG_A,
      } as any,
    ]);
    vi.mocked(userRepository.findAll).mockResolvedValue([
      { id: 'a1', email: 'admin-a@example.com', role: 'admin', organizationId: ORG_A } as any,
      { id: 'b1', email: 'admin-b@example.com', role: 'admin', organizationId: ORG_B } as any,
      { id: 'm1', email: 'master@example.com', role: 'master', organizationId: null } as any,
      { id: 'u1', email: 'user-a@example.com', role: 'user', organizationId: ORG_A } as any,
    ]);

    await deviceService.checkOfflineDevicesAndAlert();

    const recipients = vi.mocked(sendDeviceOfflineAlertEmail).mock.calls.map((call) => call[0]);
    expect(recipients).toEqual(['admin-a@example.com', 'master@example.com']);
    expect(recipients).not.toContain('admin-b@example.com');
    expect(recipients).not.toContain('user-a@example.com');
  });
});
