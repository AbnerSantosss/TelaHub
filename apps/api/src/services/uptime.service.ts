import prisma from '../lib/prisma';
import type { TenantScope } from '../repositories/display.repository';

/**
 * Relatório de disponibilidade (uptime) das telas.
 *
 * Base conceitual: Sommerville, caps. 10–11 (ver
 * `7 - EngenhariaSoftware/wiki/confiabilidade/dependabilidade.md`).
 *
 *   Disponibilidade = MTTF / (MTTF + MTTR)
 *     MTTF = Mean Time To Failure → tempo médio em que a tela ficou ONLINE
 *     MTTR = Mean Time To Repair  → tempo médio em que a tela ficou OFFLINE
 *
 * O estado online/offline do device é DERIVADO do `lastSeen` em tempo real; o
 * histórico vive em `DeviceStatusChange`, uma linha por TRANSIÇÃO. Cada linha
 * já carrega `previousStatusMs` (duração do estado anterior fechada naquele
 * instante), então o relatório é uma agregação de segmentos, sem pareamento.
 */

export type DeviceStatus = 'online' | 'offline';

/** Metas de disponibilidade ("noves"), da mais exigente para a menos. */
export const NINES_TIERS = [
  { level: 5, target: 0.99999, label: 'Cinco noves (99,999%)' },
  { level: 4, target: 0.9999, label: 'Quatro noves (99,99%)' },
  { level: 3, target: 0.999, label: 'Três noves (99,9%)' },
  { level: 2, target: 0.99, label: 'Dois noves (99%)' },
] as const;

export interface NinesClassification {
  /** 0 = não atingiu nem dois noves. */
  level: number;
  label: string;
  /** Meta da faixa atingida (ex.: 0.999). Para level 0, 0.99 (a meta perdida). */
  target: number;
  /** Downtime máximo tolerado pela meta DENTRO do período analisado, em ms. */
  allowedDowntimeMs: number;
}

export interface DeviceUptimeReport {
  deviceId: string;
  name: string;
  /**
   * `false` quando não existe NENHUMA transição registrada até o fim do
   * período. Isso NÃO é 100% de disponibilidade — é ausência de medição, e o
   * consumidor precisa exibir "sem dados".
   */
  hasData: boolean;
  /** Janela realmente medida (o fim é limitado a `now`), em ms. */
  periodMs: number;
  onlineMs: number;
  offlineMs: number;
  /** Nº de quedas (transições para `offline`) dentro do período. */
  failures: number;
  /** Nº de recuperações (transições para `online`) dentro do período. */
  repairs: number;
  /** Mean Time To Failure em ms. `null` quando não há tempo online medido. */
  mttfMs: number | null;
  /** Mean Time To Repair em ms. `null` quando não houve queda. */
  mttrMs: number | null;
  /** 0..1. `null` quando `hasData` é false. */
  availability: number | null;
  classification: NinesClassification | null;
  /** Estado no fim do período medido. `null` quando sem dados. */
  currentStatus: DeviceStatus | null;
}

export interface OrganizationUptimeSummary {
  startDate: string;
  endDate: string;
  periodMs: number;
  totalDevices: number;
  devicesWithData: number;
  devicesWithoutData: number;
  /** Média aritmética da disponibilidade das telas COM dados. `null` se nenhuma. */
  averageAvailability: number | null;
  totalFailures: number;
  totalOfflineMs: number;
  classification: NinesClassification | null;
  worstDevice: {
    deviceId: string;
    name: string;
    availability: number;
    failures: number;
    offlineMs: number;
  } | null;
}

export interface UptimePeriod {
  startDate: Date;
  endDate: Date;
}

function tenantWhere(organizationId: TenantScope) {
  return organizationId ? { organizationId } : {};
}

/** Classifica uma disponibilidade em "noves" e devolve o downtime tolerado. */
export function classifyNines(availability: number, periodMs: number): NinesClassification {
  for (const tier of NINES_TIERS) {
    if (availability >= tier.target) {
      return {
        level: tier.level,
        label: tier.label,
        target: tier.target,
        allowedDowntimeMs: Math.round(periodMs * (1 - tier.target)),
      };
    }
  }
  return {
    level: 0,
    label: 'Abaixo de dois noves (< 99%)',
    target: 0.99,
    allowedDowntimeMs: Math.round(periodMs * 0.01),
  };
}

export class UptimeService {
  /**
   * Grava uma transição de estado — e SÓ quando o estado muda de fato.
   *
   * A última linha de `DeviceStatusChange` do device é a máquina de estado:
   * se ela já está no `status` pedido, nada é gravado (duplicar transições é o
   * erro que mais suja o relatório: infla o número de quedas e zera o MTTF).
   *
   * @param changedAt instante REAL da transição. Para a queda, é o momento em
   *   que o `lastSeen` estourou o limite — não o instante da varredura.
   * @returns a linha criada, ou `null` quando não houve mudança de estado.
   */
  async recordStatusChange(
    deviceId: string,
    status: DeviceStatus,
    options: { organizationId?: string | null; changedAt?: Date } = {}
  ) {
    const last = await prisma.deviceStatusChange.findFirst({
      where: { deviceId },
      orderBy: { changedAt: 'desc' },
    });

    // Idempotência: mesmo estado → não é transição.
    if (last && last.status === status) return null;

    const now = new Date();
    let changedAt = options.changedAt ?? now;
    // Nunca no futuro, nunca antes da transição anterior — senão
    // `previousStatusMs` sai negativo e o período fica inconsistente.
    if (changedAt.getTime() > now.getTime()) changedAt = now;
    if (last && changedAt.getTime() < last.changedAt.getTime()) changedAt = last.changedAt;

    const previousStatusMs = last ? BigInt(changedAt.getTime() - last.changedAt.getTime()) : null;

    return prisma.deviceStatusChange.create({
      data: {
        deviceId,
        organizationId: options.organizationId ?? null,
        status,
        changedAt,
        previousStatusMs,
      },
    });
  }

  /** Última transição conhecida do device (ou `null`). */
  async getLastStatusChange(deviceId: string) {
    return prisma.deviceStatusChange.findFirst({
      where: { deviceId },
      orderBy: { changedAt: 'desc' },
    });
  }

  /**
   * Relatório de uma tela no período.
   *
   * Bordas (é onde o número mente se for feito de qualquer jeito):
   * - INÍCIO: o device entra no período num estado herdado de antes. Buscamos a
   *   última transição ANTERIOR a `startDate`. Se não houver, inferimos o
   *   estado de entrada como o inverso da primeira transição de dentro do
   *   período (uma transição para `online` prova que antes estava `offline`).
   * - FIM: o último estado fica ABERTO. Fechamos em `endDate` (limitado a
   *   `now`, para não inventar disponibilidade futura), nunca em `now` puro.
   * - SEM DADOS: zero transições até o fim do período → `hasData: false`. Isso
   *   não é 100%.
   */
  async getDeviceUptime(
    device: { id: string; name: string | null },
    period: UptimePeriod
  ): Promise<DeviceUptimeReport> {
    const start = period.startDate.getTime();
    // Não medimos o futuro: o fim efetivo é o menor entre endDate e agora.
    const end = Math.min(period.endDate.getTime(), Date.now());
    const periodMs = Math.max(0, end - start);

    const empty: DeviceUptimeReport = {
      deviceId: device.id,
      name: device.name ?? device.id,
      hasData: false,
      periodMs,
      onlineMs: 0,
      offlineMs: 0,
      failures: 0,
      repairs: 0,
      mttfMs: null,
      mttrMs: null,
      availability: null,
      classification: null,
      currentStatus: null,
    };

    if (periodMs <= 0) return empty;

    const [previous, inPeriod] = await Promise.all([
      prisma.deviceStatusChange.findFirst({
        where: { deviceId: device.id, changedAt: { lt: period.startDate } },
        orderBy: { changedAt: 'desc' },
      }),
      prisma.deviceStatusChange.findMany({
        where: { deviceId: device.id, changedAt: { gte: period.startDate, lte: new Date(end) } },
        orderBy: { changedAt: 'asc' },
      }),
    ]);

    if (!previous && inPeriod.length === 0) return empty;

    const entryState: DeviceStatus = previous
      ? (previous.status as DeviceStatus)
      : // Sem histórico anterior: o estado de entrada é o inverso da primeira
        // transição observada dentro do período.
        (inPeriod[0]!.status === 'online' ? 'offline' : 'online');

    let onlineMs = 0;
    let offlineMs = 0;
    let failures = 0;
    let repairs = 0;

    let cursor = start;
    let state: DeviceStatus = entryState;

    for (const change of inPeriod) {
      const at = Math.min(Math.max(change.changedAt.getTime(), start), end);
      const duration = at - cursor;
      if (duration > 0) {
        if (state === 'online') onlineMs += duration;
        else offlineMs += duration;
      }
      const next = change.status as DeviceStatus;
      if (next !== state) {
        if (next === 'offline') failures += 1;
        else repairs += 1;
      }
      state = next;
      cursor = at;
    }

    // Fecha o estado ainda aberto no FIM DO PERÍODO.
    const tail = end - cursor;
    if (tail > 0) {
      if (state === 'online') onlineMs += tail;
      else offlineMs += tail;
    }

    const measuredMs = onlineMs + offlineMs;
    const availability = measuredMs > 0 ? onlineMs / measuredMs : null;

    // MTTF/MTTR = tempo acumulado ÷ nº de eventos. Sem eventos no período (a
    // tela ficou o tempo todo no mesmo estado), o próprio total é a melhor
    // estimativa do tempo médio até o evento — ainda é um limite inferior.
    const mttfMs = failures > 0 ? onlineMs / failures : onlineMs > 0 ? onlineMs : null;
    const mttrMs = repairs > 0 ? offlineMs / repairs : offlineMs > 0 ? offlineMs : null;

    return {
      deviceId: device.id,
      name: device.name ?? device.id,
      hasData: true,
      periodMs,
      onlineMs,
      offlineMs,
      failures,
      repairs,
      mttfMs,
      mttrMs,
      availability,
      classification: availability !== null ? classifyNines(availability, periodMs) : null,
      currentStatus: state,
    };
  }

  /**
   * Relatório de todas as telas do tenant, da PIOR para a MELHOR — que é a
   * ordem em que o operador quer olhar. Telas sem dados vão para o fim (não
   * são "boas", só não foram medidas).
   */
  async getDevicesUptime(tenantId: TenantScope, period: UptimePeriod): Promise<DeviceUptimeReport[]> {
    const devices = await prisma.device.findMany({
      where: { status: 'linked', ...tenantWhere(tenantId) },
      select: { id: true, name: true },
    });

    const reports = await Promise.all(devices.map((d) => this.getDeviceUptime(d, period)));

    return reports.sort((a, b) => {
      if (a.hasData !== b.hasData) return a.hasData ? -1 : 1;
      if (!a.hasData) return (a.name || '').localeCompare(b.name || '');
      const diff = (a.availability ?? 0) - (b.availability ?? 0);
      if (diff !== 0) return diff;
      // Empate na disponibilidade: mais quedas é pior.
      return b.failures - a.failures;
    });
  }

  /** Agregado da organização no período. */
  async getOrganizationSummary(
    tenantId: TenantScope,
    period: UptimePeriod
  ): Promise<OrganizationUptimeSummary> {
    const reports = await this.getDevicesUptime(tenantId, period);
    const withData = reports.filter((r) => r.hasData && r.availability !== null);

    const periodMs = Math.max(0, Math.min(period.endDate.getTime(), Date.now()) - period.startDate.getTime());

    const averageAvailability =
      withData.length > 0
        ? withData.reduce((acc, r) => acc + (r.availability as number), 0) / withData.length
        : null;

    const worst = withData.length > 0 ? withData[0]! : null;

    return {
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString(),
      periodMs,
      totalDevices: reports.length,
      devicesWithData: withData.length,
      devicesWithoutData: reports.length - withData.length,
      averageAvailability,
      totalFailures: reports.reduce((acc, r) => acc + r.failures, 0),
      totalOfflineMs: reports.reduce((acc, r) => acc + r.offlineMs, 0),
      classification:
        averageAvailability !== null ? classifyNines(averageAvailability, periodMs) : null,
      worstDevice: worst
        ? {
            deviceId: worst.deviceId,
            name: worst.name,
            availability: worst.availability as number,
            failures: worst.failures,
            offlineMs: worst.offlineMs,
          }
        : null,
    };
  }
}

export const uptimeService = new UptimeService();
