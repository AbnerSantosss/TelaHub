/**
 * Quando uma TV conta como "online" no painel.
 *
 * Mesmo valor de `ONLINE_THRESHOLD_MS` em
 * `apps/api/src/services/device.service.ts` (2,5 intervalos do heartbeat de
 * 60 s do player). Se mudar lá, mude aqui.
 *
 * ARMADILHA (corrigida em 2026-11-10): este limite estava escrito à mão como
 * `60000` em quatro telas, enquanto o player batia a cada 120 s. O selo de
 * "online" piscava em toda TV saudável. Um lugar só, para não divergir de novo.
 */
export const DEVICE_ONLINE_THRESHOLD_MS = 150_000;

export function isDeviceOnline(lastSeen: number, now: number = Date.now()): boolean {
  return now - lastSeen < DEVICE_ONLINE_THRESHOLD_MS;
}
