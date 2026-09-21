// Backfill do histórico de status dos devices (`DeviceStatusChange`).
//
// O relatório de disponibilidade nasceu depois das telas: devices já existentes
// não têm nenhuma transição registrada e apareceriam eternamente como "sem
// dados". Este script cria a TRANSIÇÃO INICIAL de cada device pareado, a partir
// do estado atual derivado do `lastSeen` — o mesmo critério que o painel usa
// (`ONLINE_THRESHOLD_MS`, 60s).
//
// `changedAt` da linha inicial:
//   - device ONLINE  → `lastSeen` (a melhor prova que temos de que ele estava
//     no ar; não usamos `now`, que fingiria uma medição mais recente);
//   - device OFFLINE → `lastSeen + 60s`, o instante em que ele cruzou o limite.
//
// `previousStatusMs` fica NULO de propósito: não existe estado anterior medido,
// e inventar uma duração aqui contaminaria o MTTF/MTTR do primeiro período.
//
// Idempotente: pula qualquer device que JÁ tenha alguma transição registrada.
// Pode rodar quantas vezes quiser.
//
// Uso: npm run db:backfill-device-status
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ONLINE_THRESHOLD_MS = 60_000;

async function main() {
  const devices = await prisma.device.findMany({
    where: { status: 'linked' },
    select: { id: true, name: true, lastSeen: true, organizationId: true },
  });

  console.log(`Devices pareados encontrados: ${devices.length}`);

  const now = Date.now();
  let created = 0;
  let skipped = 0;

  for (const device of devices) {
    const existing = await prisma.deviceStatusChange.findFirst({
      where: { deviceId: device.id },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    const isOnline = now - device.lastSeen.getTime() < ONLINE_THRESHOLD_MS;
    const status = isOnline ? 'online' : 'offline';
    const changedAt = isOnline
      ? device.lastSeen
      : new Date(Math.min(device.lastSeen.getTime() + ONLINE_THRESHOLD_MS, now));

    await prisma.deviceStatusChange.create({
      data: {
        deviceId: device.id,
        organizationId: device.organizationId ?? null,
        status,
        changedAt,
        previousStatusMs: null,
      },
    });

    created += 1;
    console.log(`  + ${device.name ?? device.id}: ${status} em ${changedAt.toISOString()}`);
  }

  console.log(`\nTransições iniciais criadas: ${created}`);
  console.log(`Devices que já tinham histórico (pulados): ${skipped}`);
}

main()
  .catch((err) => {
    console.error('Erro no backfill de status dos devices:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
