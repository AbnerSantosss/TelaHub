import { deviceService } from '../services/device.service';

const CHECK_INTERVAL_MS = 60_000;

export function startDeviceHeartbeatAlertJob(): NodeJS.Timeout {
  return setInterval(() => {
    // 1) MEDIÇÃO: registra a transição para `offline` de quem passou do limite
    //    de heartbeat (60s). É a varredura que "fecha" o estado online no
    //    histórico — sem ela o relatório de disponibilidade só teria as subidas.
    deviceService.recordOfflineTransitions().catch((err) => {
      console.error('Erro ao registrar quedas de dispositivos:', err);
    });

    // 2) NOTIFICAÇÃO: independente da medição e com limite próprio (5 min),
    //    para não mandar e-mail a cada instabilidade curta de rede.
    deviceService.checkOfflineDevicesAndAlert().catch((err) => {
      console.error('Erro no job de verificação de heartbeat:', err);
    });
  }, CHECK_INTERVAL_MS);
}
