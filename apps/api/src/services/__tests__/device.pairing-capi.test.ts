import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `TelaPareada` — a ativação real do produto.
 *
 * O que precisa ser verdade: dispara no PRIMEIRO pareamento do aparelho e
 * apenas nele (senão a mesma tela, trocada de sala, viraria duas ativações no
 * relatório de campanha), e nenhuma falha de medição derruba o pareamento.
 */

const mocks = vi.hoisted(() => ({
  sendMetaEventAsync: vi.fn(),
}));

vi.mock('../../repositories/device.repository', () => ({
  deviceRepository: {
    findByPairingCode: vi.fn(),
    update: vi.fn(),
    findAll: vi.fn(),
  },
}));

vi.mock('../../repositories/display.repository', () => ({
  displayRepository: { findByIdScoped: vi.fn() },
}));

vi.mock('../../repositories/user.repository', () => ({
  userRepository: { findAll: vi.fn() },
}));

vi.mock('../email.service', () => ({ sendDeviceOfflineAlertEmail: vi.fn() }));
vi.mock('../uptime.service', () => ({ uptimeService: { recordStatusChange: vi.fn() } }));

vi.mock('../meta-capi.service', async () => {
  const actual = await vi.importActual<typeof import('../meta-capi.service')>('../meta-capi.service');
  return { ...actual, sendMetaEventAsync: mocks.sendMetaEventAsync, newEventId: () => 'evento-servidor' };
});

import { deviceService } from '../device.service';
import { deviceRepository } from '../../repositories/device.repository';
import { displayRepository } from '../../repositories/display.repository';

const ORG = 'org-123';
const CONTEXT = { ip: '203.0.113.7', userAgent: 'Mozilla/5.0', sourceUrl: 'https://app.telahub.com.br/telas' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(displayRepository.findByIdScoped).mockResolvedValue({ id: 'disp-1', organizationId: ORG } as any);
  vi.mocked(deviceRepository.update).mockImplementation(async (id: string) => ({ id }) as any);
});

describe('deviceService.link — TelaPareada', () => {
  it('dispara na PRIMEIRA ativação, com o id da organização como external_id', async () => {
    vi.mocked(deviceRepository.findByPairingCode).mockResolvedValue({
      id: 'dev-1',
      activatedAt: null,
    } as any);

    await deviceService.link('123456', 'disp-1', 'TV Recepção', ORG, CONTEXT);

    expect(mocks.sendMetaEventAsync).toHaveBeenCalledTimes(1);
    expect(mocks.sendMetaEventAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'TelaPareada',
        eventId: 'evento-servidor',
        actionSource: 'website',
        sourceUrl: CONTEXT.sourceUrl,
        userData: expect.objectContaining({
          externalId: ORG,
          ip: CONTEXT.ip,
          userAgent: CONTEXT.userAgent,
        }),
      })
    );
  });

  it('NÃO dispara no repareamento de um aparelho já ativado antes', async () => {
    vi.mocked(deviceRepository.findByPairingCode).mockResolvedValue({
      id: 'dev-1',
      activatedAt: new Date('2026-01-10T12:00:00Z'),
    } as any);

    await deviceService.link('123456', 'disp-1', 'TV Recepção', ORG, CONTEXT);

    // A mesma TV trocada de sala não é uma ativação nova: contar de novo
    // inflaria a conversão e a campanha otimizaria para o número errado.
    expect(mocks.sendMetaEventAsync).not.toHaveBeenCalled();
  });

  it('não dispara quando o código de pareamento é inválido', async () => {
    vi.mocked(deviceRepository.findByPairingCode).mockResolvedValue(null as any);

    const result = await deviceService.link('000000', 'disp-1', 'TV', ORG, CONTEXT);

    expect(result).toBeNull();
    expect(mocks.sendMetaEventAsync).not.toHaveBeenCalled();
  });

  it('não dispara quando o display é de outro tenant', async () => {
    vi.mocked(displayRepository.findByIdScoped).mockResolvedValue(null as any);

    const result = await deviceService.link('123456', 'disp-de-outro', 'TV', ORG, CONTEXT);

    expect(result).toBe('display-not-found');
    expect(mocks.sendMetaEventAsync).not.toHaveBeenCalled();
  });

  it('falha da medição não derruba o pareamento — a TV já está no ar', async () => {
    vi.mocked(deviceRepository.findByPairingCode).mockResolvedValue({ id: 'dev-1', activatedAt: null } as any);
    mocks.sendMetaEventAsync.mockImplementation(() => {
      throw new Error('Meta fora do ar');
    });

    await expect(
      deviceService.link('123456', 'disp-1', 'TV Recepção', ORG, CONTEXT)
    ).resolves.toMatchObject({ device: { id: 'dev-1' } });
  });

  it('continua funcionando sem contexto — a assinatura antiga não quebra', async () => {
    vi.mocked(deviceRepository.findByPairingCode).mockResolvedValue({ id: 'dev-1', activatedAt: null } as any);

    await expect(deviceService.link('123456', 'disp-1', 'TV', ORG)).resolves.toMatchObject({
      device: { id: 'dev-1' },
    });
    expect(mocks.sendMetaEventAsync).toHaveBeenCalledTimes(1);
  });
});
