import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { uptimeService, DeviceUptimeReport, UptimePeriod } from '../services/uptime.service';

const router = Router();

const DEFAULT_PERIOD_DAYS = 30;
const MAX_PERIOD_DAYS = 366;

/**
 * Lê `startDate`/`endDate` da query. Ambos opcionais: o padrão é os últimos 30
 * dias, que é o recorte que o painel abre.
 */
function parsePeriod(req: Request): UptimePeriod | { error: string } {
  const now = new Date();

  const rawStart = typeof req.query.startDate === 'string' ? req.query.startDate.trim() : '';
  const rawEnd = typeof req.query.endDate === 'string' ? req.query.endDate.trim() : '';

  const endDate = rawEnd ? new Date(rawEnd) : now;
  if (Number.isNaN(endDate.getTime())) return { error: 'endDate inválido. Use uma data ISO 8601.' };

  const startDate = rawStart
    ? new Date(rawStart)
    : new Date(endDate.getTime() - DEFAULT_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  if (Number.isNaN(startDate.getTime())) return { error: 'startDate inválido. Use uma data ISO 8601.' };

  if (startDate.getTime() >= endDate.getTime()) {
    return { error: 'startDate deve ser anterior a endDate.' };
  }

  const spanDays = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
  if (spanDays > MAX_PERIOD_DAYS) {
    return { error: `Período máximo de ${MAX_PERIOD_DAYS} dias.` };
  }

  return { startDate, endDate };
}

/**
 * Serializa um relatório para JSON.
 *
 * `previousStatusMs` é `BigInt` no banco e BigInt NÃO é serializável por
 * `JSON.stringify`. Todo cálculo interno já usa `number` (diferença de
 * timestamps), então a borda só precisa garantir números — e arredondar os ms
 * para inteiro, porque MTTF/MTTR são médias.
 */
function serializeDevice(report: DeviceUptimeReport) {
  return {
    device_id: report.deviceId,
    name: report.name,
    has_data: report.hasData,
    period_ms: report.periodMs,
    uptime_percent: report.availability === null ? null : Number((report.availability * 100).toFixed(4)),
    availability: report.availability,
    online_ms: report.onlineMs,
    offline_ms: report.offlineMs,
    failures: report.failures,
    repairs: report.repairs,
    mttf_ms: report.mttfMs === null ? null : Math.round(report.mttfMs),
    mttr_ms: report.mttrMs === null ? null : Math.round(report.mttrMs),
    classification: report.classification,
    current_status: report.currentStatus,
  };
}

// GET /api/uptime/devices — uma linha por tela, da PIOR para a MELHOR.
router.get('/devices', authMiddleware, requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const period = parsePeriod(req);
    if ('error' in period) {
      res.status(400).json({ error: period.error });
      return;
    }

    const reports = await uptimeService.getDevicesUptime(req.tenantId, period);

    res.json({
      start_date: period.startDate.toISOString(),
      end_date: period.endDate.toISOString(),
      devices: reports.map(serializeDevice),
    });
  } catch (error: any) {
    console.error('Erro ao calcular uptime por dispositivo:', error);
    res.status(500).json({ error: 'Erro ao calcular disponibilidade.' });
  }
});

// GET /api/uptime/summary — agregado da organização no período.
router.get('/summary', authMiddleware, requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const period = parsePeriod(req);
    if ('error' in period) {
      res.status(400).json({ error: period.error });
      return;
    }

    const summary = await uptimeService.getOrganizationSummary(req.tenantId, period);

    res.json({
      start_date: summary.startDate,
      end_date: summary.endDate,
      period_ms: summary.periodMs,
      total_devices: summary.totalDevices,
      devices_with_data: summary.devicesWithData,
      devices_without_data: summary.devicesWithoutData,
      average_availability: summary.averageAvailability,
      average_uptime_percent:
        summary.averageAvailability === null
          ? null
          : Number((summary.averageAvailability * 100).toFixed(4)),
      total_failures: summary.totalFailures,
      total_offline_ms: summary.totalOfflineMs,
      classification: summary.classification,
      worst_device: summary.worstDevice
        ? {
            device_id: summary.worstDevice.deviceId,
            name: summary.worstDevice.name,
            availability: summary.worstDevice.availability,
            uptime_percent: Number((summary.worstDevice.availability * 100).toFixed(4)),
            failures: summary.worstDevice.failures,
            offline_ms: summary.worstDevice.offlineMs,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Erro ao agregar uptime da organização:', error);
    res.status(500).json({ error: 'Erro ao calcular disponibilidade.' });
  }
});

export default router;
