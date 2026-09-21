// Cria uma Organização padrão e atribui todos os Displays sem organizationId a ela.
// Idempotente: pode rodar mais de uma vez sem duplicar a organização padrão nem sobrescrever
// displays que já tenham uma organização atribuída.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_ORG_NAME = 'Loja Padrão';

async function main() {
  let defaultOrg = await prisma.organization.findFirst({ where: { name: DEFAULT_ORG_NAME } });

  if (!defaultOrg) {
    defaultOrg = await prisma.organization.create({ data: { name: DEFAULT_ORG_NAME } });
    console.log(`Organização padrão criada: ${defaultOrg.id}`);
  } else {
    console.log(`Organização padrão já existia: ${defaultOrg.id}`);
  }

  const result = await prisma.display.updateMany({
    where: { organizationId: null },
    data: { organizationId: defaultOrg.id },
  });

  console.log(`${result.count} display(s) atribuído(s) à organização padrão.`);
}

main()
  .catch((err) => {
    console.error('Erro no backfill de organização padrão:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
