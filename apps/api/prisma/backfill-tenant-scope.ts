// Backfill do escopo multi-tenant.
//
// Depois do isolamento por organização no servidor, todo registro precisa saber
// a que tenant pertence. Este script preenche o que ficou para trás:
//
//   1. `User.organizationId` → organização padrão (exceto role `master`, que
//      opera acima dos tenants e por definição não tem organização).
//   2. `Device.organizationId` → herdado do display vinculado; devices sem
//      display caem na organização padrão.
//   3. `Broadcast.organizationId` → herdado do primeiro display da lista
//      `displayIds`; sem lista utilizável, cai na organização padrão.
//   4. `Device.activatedAt` → para devices já `linked`, usa `createdAt` se
//      existir no schema; na ausência dele usa `lastSeen`.
//
// Idempotente: só toca registros com o campo ainda nulo. Pode rodar quantas
// vezes quiser.
//
// Uso: npm run db:backfill-tenant
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_ORG_NAME = 'Loja Padrão';

async function resolveDefaultOrganizationId(): Promise<string> {
  const existing = await prisma.organization.findFirst({ where: { name: DEFAULT_ORG_NAME } });
  if (existing) {
    console.log(`Organização padrão já existia: ${existing.id}`);
    return existing.id;
  }
  const created = await prisma.organization.create({ data: { name: DEFAULT_ORG_NAME } });
  console.log(`Organização padrão criada: ${created.id}`);
  return created.id;
}

async function backfillDisplays(defaultOrgId: string) {
  const result = await prisma.display.updateMany({
    where: { organizationId: null },
    data: { organizationId: defaultOrgId },
  });
  console.log(`Displays: ${result.count} atribuído(s) à organização padrão.`);
}

async function backfillUsers(defaultOrgId: string) {
  // O `master` é o proprietário da plataforma: precisa continuar sem organização
  // para poder operar sobre todos os tenants.
  const result = await prisma.user.updateMany({
    where: { organizationId: null, role: { not: 'master' } },
    data: { organizationId: defaultOrgId },
  });
  console.log(`Users: ${result.count} atribuído(s) à organização padrão (masters preservados sem org).`);
}

async function backfillDevices(defaultOrgId: string) {
  const devices = await prisma.device.findMany({
    where: { organizationId: null },
    select: { id: true, displayId: true, status: true },
  });

  let fromDisplay = 0;
  let fromDefault = 0;
  let skippedPending = 0;

  for (const device of devices) {
    let organizationId: string | null = null;

    if (device.displayId) {
      const display = await prisma.display.findUnique({
        where: { id: device.displayId },
        select: { organizationId: true },
      });
      organizationId = display?.organizationId ?? null;
    }

    if (organizationId) {
      fromDisplay++;
    } else if (device.status === 'linked') {
      // Vinculado mas sem display resolvível: cai na organização padrão.
      organizationId = defaultOrgId;
      fromDefault++;
    } else {
      // Device `pending` é uma TV que se registrou e ainda não foi pareada por
      // ninguém: precisa continuar SEM organização para que qualquer tenant
      // possa reivindicá-la no `POST /api/devices/link`.
      skippedPending++;
      continue;
    }

    await prisma.device.update({ where: { id: device.id }, data: { organizationId } });
  }

  console.log(
    `Devices: ${fromDisplay} pelo display vinculado, ${fromDefault} pela organização padrão, ` +
    `${skippedPending} pendente(s) mantido(s) sem organização.`
  );
}

async function backfillBroadcasts(defaultOrgId: string) {
  const broadcasts = await prisma.broadcast.findMany({
    where: { organizationId: null },
    select: { id: true, displayIds: true },
  });

  let fromDisplay = 0;
  let fromDefault = 0;

  for (const broadcast of broadcasts) {
    let organizationId: string | null = null;

    const ids = parseDisplayIds(broadcast.displayIds);
    for (const displayId of ids) {
      const display = await prisma.display.findUnique({
        where: { id: displayId },
        select: { organizationId: true },
      });
      if (display?.organizationId) {
        organizationId = display.organizationId;
        break;
      }
    }

    if (organizationId) {
      fromDisplay++;
    } else {
      organizationId = defaultOrgId;
      fromDefault++;
    }

    await prisma.broadcast.update({ where: { id: broadcast.id }, data: { organizationId } });
  }

  console.log(`Broadcasts: ${fromDisplay} pelo primeiro display da lista, ${fromDefault} pela organização padrão.`);
}

async function backfillActivatedAt() {
  const devices = await prisma.device.findMany({
    where: { status: 'linked', activatedAt: null },
    select: { id: true, lastSeen: true },
  });

  for (const device of devices) {
    // `Device` não tem `createdAt` no schema — `lastSeen` é a melhor aproximação
    // disponível de "desde quando essa tela existe".
    const createdAt = (device as { createdAt?: Date }).createdAt;
    await prisma.device.update({
      where: { id: device.id },
      data: { activatedAt: createdAt ?? device.lastSeen ?? new Date() },
    });
  }

  console.log(`Devices linked: ${devices.length} com activatedAt preenchido.`);
}

function parseDisplayIds(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((id): id is string => typeof id === 'string');
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

async function main() {
  const defaultOrgId = await resolveDefaultOrganizationId();

  // Displays primeiro: devices e broadcasts herdam a organização deles.
  await backfillDisplays(defaultOrgId);
  await backfillUsers(defaultOrgId);
  await backfillDevices(defaultOrgId);
  await backfillBroadcasts(defaultOrgId);
  await backfillActivatedAt();

  console.log('Backfill de escopo multi-tenant concluído.');
}

main()
  .catch((err) => {
    console.error('Erro no backfill de escopo multi-tenant:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
