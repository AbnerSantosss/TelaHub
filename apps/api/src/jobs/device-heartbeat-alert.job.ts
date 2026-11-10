import { deviceService } from '../services/device.service';

const CHECK_INTERVAL_MS = 60_000;

/**
 * Uma varredura: medição das quedas e, em seguida, o alerta por e-mail.
 *
 * 1) MEDIÇÃO: registra a transição para `offline` de quem passou do limite de
 *    heartbeat (`ONLINE_THRESHOLD_MS`). É a varredura que "fecha" o estado
 *    online no histórico — sem ela o relatório só teria as subidas.
 * 2) NOTIFICAÇÃO: independente da medição e com limite próprio (5 min), para
 *    não mandar e-mail a cada instabilidade curta de rede.
 *
 * Uma etapa falhar não impede a outra.
 */
export async function runDeviceHeartbeatSweep(): Promise<void> {
  try {
    await deviceService.recordOfflineTransitions();
  } catch (err) {
    console.error('Erro ao registrar quedas de dispositivos:', err);
  }

  try {
    await deviceService.checkOfflineDevicesAndAlert();
  } catch (err) {
    console.error('Erro no job de verificação de heartbeat:', err);
  }
}

export function startDeviceHeartbeatAlertJob(): NodeJS.Timeout {
  // Trava contra sobreposição: se uma varredura passar de 60 s (banco lento,
  // SMTP travado), a próxima batida do timer é descartada em vez de rodar em
  // paralelo. Duas varreduras juntas gravariam a mesma queda duas vezes e
  // mandariam o mesmo e-mail em dobro.
  let running = false;

  return setInterval(() => {
    if (running) return;
    running = true;
    runDeviceHeartbeatSweep().finally(() => {
      running = false;
    });
  }, CHECK_INTERVAL_MS);
}
