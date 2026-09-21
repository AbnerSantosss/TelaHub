import { describe, it, expect, vi, beforeEach } from 'vitest';

// O serviço fala direto com o Prisma (não há repositório de status). Mockamos o
// client para exercitar a matemática de disponibilidade sem depender do banco.
vi.mock('../../lib/prisma', () => ({
  default: {
    deviceStatusChange: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    device: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from '../../lib/prisma';
import { uptimeService, classifyNines } from '../uptime.service';

const HOUR = 60 * 60 * 1000;
const DEVICE = { id: 'dev-1', name: 'TV Recepção' };

function change(status: string, changedAt: Date, previousStatusMs: bigint | null = null) {
  return { id: `c-${changedAt.getTime()}`, deviceId: DEVICE.id, organizationId: 'org-a', status, changedAt, previousStatusMs };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UptimeService.recordStatusChange — idempotência da transição', () => {
  it('NÃO grava nada quando o estado atual já é o mesmo da última transição', async () => {
    vi.mocked(prisma.deviceStatusChange.findFirst).mockResolvedValue(
      change('online', new Date(Date.now() - HOUR)) as any
    );

    const result = await uptimeService.recordStatusChange(DEVICE.id, 'online', { organizationId: 'org-a' });

    expect(result).toBeNull();
    expect(prisma.deviceStatusChange.create).not.toHaveBeenCalled();
  });

  it('grava quando o estado muda de fato', async () => {
    vi.mocked(prisma.deviceStatusChange.findFirst).mockResolvedValue(
      change('online', new Date(Date.now() - HOUR)) as any
    );
    vi.mocked(prisma.deviceStatusChange.create).mockResolvedValue({} as any);

    await uptimeService.recordStatusChange(DEVICE.id, 'offline', { organizationId: 'org-a' });

    expect(prisma.deviceStatusChange.create).toHaveBeenCalledTimes(1);
    const data = vi.mocked(prisma.deviceStatusChange.create).mock.calls[0]![0].data as any;
    expect(data.status).toBe('offline');
    expect(data.organizationId).toBe('org-a');
  });

  it('grava a primeira transição do device com previousStatusMs nulo (não há estado anterior medido)', async () => {
    vi.mocked(prisma.deviceStatusChange.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.deviceStatusChange.create).mockResolvedValue({} as any);

    await uptimeService.recordStatusChange(DEVICE.id, 'online', { organizationId: 'org-a' });

    const data = vi.mocked(prisma.deviceStatusChange.create).mock.calls[0]![0].data as any;
    expect(data.previousStatusMs).toBeNull();
  });

  it('previousStatusMs bate exatamente com a duração do estado anterior', async () => {
    const wentOnlineAt = new Date('2026-01-01T00:00:00.000Z');
    const fellAt = new Date('2026-01-01T09:00:00.000Z'); // 9h online

    vi.mocked(prisma.deviceStatusChange.findFirst).mockResolvedValue(change('online', wentOnlineAt) as any);
    vi.mocked(prisma.deviceStatusChange.create).mockResolvedValue({} as any);

    await uptimeService.recordStatusChange(DEVICE.id, 'offline', {
      organizationId: 'org-a',
      changedAt: fellAt,
    });

    const data = vi.mocked(prisma.deviceStatusChange.create).mock.calls[0]![0].data as any;
    expect(data.previousStatusMs).toBe(BigInt(9 * HOUR));
    expect(data.changedAt).toEqual(fellAt);
  });

  it('nunca deixa previousStatusMs negativo: changedAt anterior à última transição é clampado', async () => {
    const last = new Date('2026-01-01T10:00:00.000Z');
    vi.mocked(prisma.deviceStatusChange.findFirst).mockResolvedValue(change('online', last) as any);
    vi.mocked(prisma.deviceStatusChange.create).mockResolvedValue({} as any);

    await uptimeService.recordStatusChange(DEVICE.id, 'offline', {
      changedAt: new Date('2026-01-01T08:00:00.000Z'),
    });

    const data = vi.mocked(prisma.deviceStatusChange.create).mock.calls[0]![0].data as any;
    expect(data.previousStatusMs).toBe(0n);
    expect(data.changedAt).toEqual(last);
  });
});

describe('UptimeService.getDeviceUptime — cálculo de disponibilidade', () => {
  it('9h online + 1h offline = 90% de disponibilidade, MTTF 9h, MTTR 1h', async () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-01T10:00:00.000Z');

    // Estado herdado: online desde antes do período.
    vi.mocked(prisma.deviceStatusChange.findFirst).mockResolvedValue(
      change('online', new Date('2025-12-31T20:00:00.000Z')) as any
    );
    // Caiu às 09:00 e não voltou até o fim do período.
    vi.mocked(prisma.deviceStatusChange.findMany).mockResolvedValue([
      change('offline', new Date('2026-01-01T09:00:00.000Z')),
    ] as any);

    const report = await uptimeService.getDeviceUptime(DEVICE, { startDate: start, endDate: end });

    expect(report.hasData).toBe(true);
    expect(report.onlineMs).toBe(9 * HOUR);
    expect(report.offlineMs).toBe(1 * HOUR);
    expect(report.failures).toBe(1);
    expect(report.availability).toBeCloseTo(0.9, 10);
    expect(report.mttfMs).toBe(9 * HOUR);
    expect(report.mttrMs).toBe(1 * HOUR);
    expect(report.currentStatus).toBe('offline');
    // 90% não chega nem a dois noves.
    expect(report.classification?.level).toBe(0);
  });

  it('borda de INÍCIO: usa a última transição ANTERIOR ao período, não o começo do histórico', async () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-01T10:00:00.000Z');

    // Estava OFFLINE desde muito antes do período.
    vi.mocked(prisma.deviceStatusChange.findFirst).mockResolvedValue(
      change('offline', new Date('2025-12-20T00:00:00.000Z')) as any
    );
    // Voltou 2h depois do início do período.
    vi.mocked(prisma.deviceStatusChange.findMany).mockResolvedValue([
      change('online', new Date('2026-01-01T02:00:00.000Z')),
    ] as any);

    const report = await uptimeService.getDeviceUptime(DEVICE, { startDate: start, endDate: end });

    // Só as 2h DENTRO do período contam como offline — o offline anterior a
    // 01/01 pertence a outro período e não pode vazar para este.
    expect(report.offlineMs).toBe(2 * HOUR);
    expect(report.onlineMs).toBe(8 * HOUR);
    expect(report.availability).toBeCloseTo(0.8, 10);
    expect(report.failures).toBe(0);
    expect(report.repairs).toBe(1);
  });

  it('borda de FIM: o estado ainda aberto é fechado no fim do período, não em now', async () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-01T04:00:00.000Z'); // período curto, no passado

    vi.mocked(prisma.deviceStatusChange.findFirst).mockResolvedValue(
      change('online', new Date('2025-12-31T00:00:00.000Z')) as any
    );
    vi.mocked(prisma.deviceStatusChange.findMany).mockResolvedValue([] as any);

    const report = await uptimeService.getDeviceUptime(DEVICE, { startDate: start, endDate: end });

    // Exatamente as 4h do período — nada além disso, mesmo com a transição
    // aberta desde 31/12 e "agora" sendo muito depois.
    expect(report.periodMs).toBe(4 * HOUR);
    expect(report.onlineMs).toBe(4 * HOUR);
    expect(report.offlineMs).toBe(0);
    expect(report.availability).toBe(1);
    expect(report.classification?.level).toBe(5);
  });

  it('sem NENHUMA transição no histórico → "sem dados", e NÃO 100%', async () => {
    vi.mocked(prisma.deviceStatusChange.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.deviceStatusChange.findMany).mockResolvedValue([] as any);

    const report = await uptimeService.getDeviceUptime(DEVICE, {
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-01-02T00:00:00.000Z'),
    });

    expect(report.hasData).toBe(false);
    expect(report.availability).toBeNull();
    expect(report.availability).not.toBe(1);
    expect(report.classification).toBeNull();
    expect(report.currentStatus).toBeNull();
  });

  it('sem transição anterior ao período: infere o estado de entrada pelo inverso da primeira transição', async () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-01T10:00:00.000Z');

    vi.mocked(prisma.deviceStatusChange.findFirst).mockResolvedValue(null);
    // Primeira transição do histórico é uma SUBIDA → antes dela estava offline.
    vi.mocked(prisma.deviceStatusChange.findMany).mockResolvedValue([
      change('online', new Date('2026-01-01T01:00:00.000Z')),
    ] as any);

    const report = await uptimeService.getDeviceUptime(DEVICE, { startDate: start, endDate: end });

    expect(report.hasData).toBe(true);
    expect(report.offlineMs).toBe(1 * HOUR);
    expect(report.onlineMs).toBe(9 * HOUR);
  });

  it('conta múltiplas quedas e calcula MTTF/MTTR como médias', async () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-01T12:00:00.000Z');

    vi.mocked(prisma.deviceStatusChange.findFirst).mockResolvedValue(
      change('online', new Date('2025-12-31T00:00:00.000Z')) as any
    );
    vi.mocked(prisma.deviceStatusChange.findMany).mockResolvedValue([
      change('offline', new Date('2026-01-01T04:00:00.000Z')), // 4h online
      change('online', new Date('2026-01-01T05:00:00.000Z')), //  1h offline
      change('offline', new Date('2026-01-01T09:00:00.000Z')), // 4h online
      change('online', new Date('2026-01-01T10:00:00.000Z')), //  1h offline
    ] as any);

    const report = await uptimeService.getDeviceUptime(DEVICE, { startDate: start, endDate: end });

    expect(report.onlineMs).toBe(10 * HOUR); // 4 + 4 + 2 (cauda)
    expect(report.offlineMs).toBe(2 * HOUR);
    expect(report.failures).toBe(2);
    expect(report.repairs).toBe(2);
    expect(report.mttfMs).toBe(5 * HOUR);
    expect(report.mttrMs).toBe(1 * HOUR);
    expect(report.availability).toBeCloseTo(10 / 12, 10);
  });
});

describe('classifyNines', () => {
  const YEAR = 365 * 24 * HOUR;

  it('classifica nas faixas de noves', () => {
    expect(classifyNines(0.9995, YEAR).level).toBe(3);
    expect(classifyNines(0.99995, YEAR).level).toBe(4);
    expect(classifyNines(0.995, YEAR).level).toBe(2);
    expect(classifyNines(0.98, YEAR).level).toBe(0);
  });

  it('99,9% ≈ 8,76h de downtime tolerado no ano', () => {
    const hours = classifyNines(0.999, YEAR).allowedDowntimeMs / HOUR;
    expect(hours).toBeCloseTo(8.76, 2);
  });

  it('99% ≈ 87,6h e 99,99% ≈ 52,6min de downtime tolerado no ano', () => {
    expect(classifyNines(0.992, YEAR).allowedDowntimeMs / HOUR).toBeCloseTo(87.6, 1);
    expect(classifyNines(0.9999, YEAR).allowedDowntimeMs / 60_000).toBeCloseTo(52.56, 1);
  });
});

describe('UptimeService.getDevicesUptime — ordenação e agregado', () => {
  const start = new Date('2026-01-01T00:00:00.000Z');
  const end = new Date('2026-01-01T10:00:00.000Z');

  function mockPerDevice(map: Record<string, { previous: any; inPeriod: any[] }>) {
    vi.mocked(prisma.deviceStatusChange.findFirst).mockImplementation(
      ((args: any) => Promise.resolve(map[args.where.deviceId]?.previous ?? null)) as any
    );
    vi.mocked(prisma.deviceStatusChange.findMany).mockImplementation(
      ((args: any) => Promise.resolve(map[args.where.deviceId]?.inPeriod ?? [])) as any
    );
  }

  it('ordena da PIOR para a MELHOR e joga telas sem dados para o fim', async () => {
    vi.mocked(prisma.device.findMany).mockResolvedValue([
      { id: 'boa', name: 'TV Boa' },
      { id: 'ruim', name: 'TV Ruim' },
      { id: 'muda', name: 'TV Sem Dados' },
    ] as any);

    mockPerDevice({
      boa: {
        previous: { status: 'online', changedAt: new Date('2025-12-31T00:00:00.000Z') },
        inPeriod: [],
      },
      ruim: {
        previous: { status: 'online', changedAt: new Date('2025-12-31T00:00:00.000Z') },
        inPeriod: [{ status: 'offline', changedAt: new Date('2026-01-01T05:00:00.000Z') }],
      },
      muda: { previous: null, inPeriod: [] },
    });

    const reports = await uptimeService.getDevicesUptime('org-a', { startDate: start, endDate: end });

    expect(reports.map((r) => r.deviceId)).toEqual(['ruim', 'boa', 'muda']);
    expect(reports[2]!.hasData).toBe(false);
  });

  it('resumo da organização: pior tela, total de quedas e telas sem dados', async () => {
    vi.mocked(prisma.device.findMany).mockResolvedValue([
      { id: 'boa', name: 'TV Boa' },
      { id: 'ruim', name: 'TV Ruim' },
      { id: 'muda', name: 'TV Sem Dados' },
    ] as any);

    mockPerDevice({
      boa: {
        previous: { status: 'online', changedAt: new Date('2025-12-31T00:00:00.000Z') },
        inPeriod: [],
      },
      ruim: {
        previous: { status: 'online', changedAt: new Date('2025-12-31T00:00:00.000Z') },
        inPeriod: [{ status: 'offline', changedAt: new Date('2026-01-01T05:00:00.000Z') }],
      },
      muda: { previous: null, inPeriod: [] },
    });

    const summary = await uptimeService.getOrganizationSummary('org-a', { startDate: start, endDate: end });

    expect(summary.totalDevices).toBe(3);
    expect(summary.devicesWithData).toBe(2);
    expect(summary.devicesWithoutData).toBe(1);
    expect(summary.totalFailures).toBe(1);
    expect(summary.worstDevice?.deviceId).toBe('ruim');
    expect(summary.worstDevice?.availability).toBeCloseTo(0.5, 10);
    // Média de 100% e 50% — a tela sem dados NÃO entra como 100%.
    expect(summary.averageAvailability).toBeCloseTo(0.75, 10);
  });

  it('filtra por tenant ao listar as telas', async () => {
    vi.mocked(prisma.device.findMany).mockResolvedValue([] as any);

    await uptimeService.getDevicesUptime('org-a', { startDate: start, endDate: end });

    const where = vi.mocked(prisma.device.findMany).mock.calls[0]![0]!.where as any;
    expect(where.organizationId).toBe('org-a');
    expect(where.status).toBe('linked');
  });

  it('master sem tenant escolhido (null) não filtra por organização', async () => {
    vi.mocked(prisma.device.findMany).mockResolvedValue([] as any);

    await uptimeService.getDevicesUptime(null, { startDate: start, endDate: end });

    const where = vi.mocked(prisma.device.findMany).mock.calls[0]![0]!.where as any;
    expect(where.organizationId).toBeUndefined();
  });
});
