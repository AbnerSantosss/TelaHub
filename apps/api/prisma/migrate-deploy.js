#!/usr/bin/env node
/**
 * Aplica migrações no boot, com baseline automático.
 *
 * Por que não chamar `prisma migrate deploy` direto: até 2026-08-29 o deploy
 * rodava `prisma db push`, que sincroniza o schema comparando o banco com o
 * arquivo — sem histórico e, quando encontra divergência, resolvendo com
 * APAGAR dado (o `start` da raiz chegava a passar `--accept-data-loss`).
 *
 * Trocar para migrações versionadas esbarra num detalhe: o banco de produção
 * já tem as tabelas, criadas por `db push`, e não tem a tabela de controle
 * `_prisma_migrations`. Nesse estado, `migrate deploy` tentaria criar tudo de
 * novo e falharia com "already exists".
 *
 * Então este script decide antes de aplicar:
 *
 *   • banco vazio (sem `User`)            → `deploy` cria tudo do zero;
 *   • banco com tabelas e sem histórico   → marca o baseline como já aplicado
 *                                           (`migrate resolve --applied`) e só
 *                                           então roda `deploy`;
 *   • banco já com histórico              → `deploy` normal.
 *
 * É idempotente: pode rodar em todo boot.
 */
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const BASELINE = '00000000000000_baseline';

// Chama o CLI do Prisma pelo caminho do pacote, e não por `npx`: sem shell no
// meio, funciona igual no Alpine do container e no Windows do dev.
const PRISMA_CLI = path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js');

function run(args) {
  execFileSync(process.execPath, [PRISMA_CLI, ...args], { stdio: 'inherit' });
}

async function main() {
  const prisma = new PrismaClient();
  let temTabelas = false;
  let temHistorico = false;

  try {
    // `to_regclass` devolve null quando a tabela não existe — não lança. O
    // cast para `text` é obrigatório: o Prisma não desserializa `regclass`.
    const [{ user_table: userTable, migrations_table: migrationsTable }] = await prisma.$queryRaw`
      SELECT to_regclass('public."User"')::text AS user_table,
             to_regclass('public."_prisma_migrations"')::text AS migrations_table
    `;
    temTabelas = userTable !== null;
    temHistorico = migrationsTable !== null;
  } finally {
    await prisma.$disconnect();
  }

  if (temTabelas && !temHistorico) {
    console.log(
      `→ Banco já tem schema mas não tem histórico de migração. ` +
        `Marcando "${BASELINE}" como aplicada (baseline) em vez de recriar as tabelas.`
    );
    run(['migrate', 'resolve', '--applied', BASELINE]);
  }

  console.log('→ Aplicando migrações pendentes...');
  run(['migrate', 'deploy']);
  console.log('✅ Banco em dia.');
}

main().catch((error) => {
  console.error('❌ Falha ao aplicar migrações:', error);
  process.exit(1);
});
