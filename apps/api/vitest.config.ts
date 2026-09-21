/**
 * Configuração do Vitest da API — existe para uma coisa só: IMPEDIR QUE A
 * SUÍTE RODE CONTRA O BANCO DE DESENVOLVIMENTO.
 *
 * ── O incidente que motivou este arquivo ─────────────────────────────────────
 * Até aqui não havia `vitest.config.ts`. Sem ele, `npm test` herdava o
 * `apps/api/.env` (carregado por `dotenv.config()` em `src/server.ts`, que
 * vários testes importam) e escrevia no MESMO banco em que o dev trabalha.
 *
 * Os testes criam dados reais: `src/routes/__tests__/payment.test.ts` faz
 * `prisma.plan.create({ code: 'pay-loja-…', active: true })` e só apaga no
 * `afterAll`. Uma execução interrompida no meio (Ctrl-C, timeout, o processo
 * morto pelo watcher) pula a limpeza — e foi assim que 13 planos `pay-loja-*`
 * ficaram ATIVOS no catálogo, visíveis em `GET /api/plans`, ou seja, na
 * vitrine de quem ia comprar.
 *
 * Lembrar de exportar `DATABASE_URL` antes de rodar o teste não é proteção:
 * proteção é o processo se recusar a subir. É o que este arquivo faz.
 *
 * ── Como a URL é resolvida ───────────────────────────────────────────────────
 *   1. `TEST_DATABASE_URL`  — variável PRÓPRIA do teste. É a forma correta.
 *   2. `DATABASE_URL` do ambiente — aceita SÓ se passar na validação abaixo
 *      (é o caso do CI, que sobe um Postgres efêmero e aponta para
 *      `telahub_ci`). Se for a de desenvolvimento, o processo ABORTA.
 *   3. Nada definido — deriva do `.env` de desenvolvimento trocando o nome do
 *      banco por `<banco>_test`. Nunca aponta para o banco original.
 *
 * A URL resolvida é gravada em `process.env` AQUI (processo principal) e
 * repassada em `test.env` (processo de cada worker).
 *
 * ── Armadilha que faz isto funcionar (não desfaça) ───────────────────────────
 * `dotenv.config()` e o carregador do Prisma NÃO sobrescrevem variável que já
 * existe em `process.env`. Como este arquivo roda ANTES de qualquer teste, o
 * valor definido aqui vence o `.env` de desenvolvimento. Se algum dia alguém
 * trocar por `dotenv.config({ override: true })`, esta guarda deixa de valer
 * silenciosamente — e o banco de dev volta a ser o banco de teste.
 *
 * ── Como criar o banco de teste (uma vez) ────────────────────────────────────
 *   docker compose up -d db
 *   docker compose exec db createdb -U display_user display_db_test
 *   TEST_DATABASE_URL=postgresql://display_user:<senha>@localhost:5432/display_db_test \
 *     npx prisma db push --skip-generate
 *
 * Não altera nenhum teste existente: só o alvo do banco.
 */
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Raiz da API. `__dirname` existe quando o Vite compila este config como CJS
 * (é o caso hoje: `apps/api/package.json` tem `"type": "commonjs"`), mas some
 * se algum dia isso virar ESM — e um `__dirname` indefinido faria a guarda
 * comparar contra `.env` nenhum e liberar tudo em silêncio. Por isso a
 * detecção se AUTOVERIFICA procurando o `prisma/schema.prisma`.
 */
const RAIZ_API = (() => {
  const candidatos = [
    typeof __dirname !== 'undefined' ? __dirname : null,
    process.cwd(),
    path.resolve(process.cwd(), 'apps', 'api'),
  ].filter((v): v is string => Boolean(v));
  for (const c of candidatos) {
    if (fs.existsSync(path.join(c, 'prisma', 'schema.prisma'))) return c;
  }
  return candidatos[0];
})();
const RAIZ_MONOREPO = path.resolve(RAIZ_API, '..', '..');

/** Lê `DATABASE_URL=` de um `.env` sem depender do dotenv. */
function lerVariavel(arquivo: string, chave: string): string | null {
  try {
    const conteudo = fs.readFileSync(arquivo, 'utf8');
    for (const linha of conteudo.split(/\r?\n/)) {
      const t = linha.trim();
      if (!t || t.startsWith('#')) continue;
      const igual = t.indexOf('=');
      if (igual === -1) continue;
      if (t.slice(0, igual).trim() !== chave) continue;
      return t.slice(igual + 1).trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    /* arquivo pode não existir — é um palpite, não um requisito */
  }
  return null;
}

/** Nome do banco dentro da URL (`…/display_db?schema=public` → `display_db`). */
function nomeDoBanco(url: string): string | null {
  const m = /^[^:]+:\/\/[^/]+\/([^/?#]+)/.exec(url.trim());
  return m ? decodeURIComponent(m[1]) : null;
}

function normalizar(url: string): string {
  return url.trim().replace(/\/+$/, '').toLowerCase();
}

// ── O que é "o banco de desenvolvimento" ────────────────────────────────────
// Duas fontes: a URL literal do `.env` da API e o nome do banco do `.env` da
// raiz (é ele que o docker-compose usa). Basta bater com uma para abortar.
const URL_DEV = lerVariavel(path.join(RAIZ_API, '.env'), 'DATABASE_URL');
const BANCOS_DE_DEV = new Set(
  [
    URL_DEV ? nomeDoBanco(URL_DEV) : null,
    lerVariavel(path.join(RAIZ_MONOREPO, '.env'), 'POSTGRES_DB'),
    'display_db',
  ]
    .filter((v): v is string => Boolean(v))
    .map((v) => v.toLowerCase()),
);

/** Aceita `*_test`, `*_ci`, `telahub_ci`… Recusa o resto. */
function pareceBancoDeTeste(banco: string): boolean {
  return /(^|[_-])(test|tests|teste|ci)([_-]|$)/i.test(banco) || /test/i.test(banco);
}

function abortar(motivo: string, url: string): never {
  const banco = nomeDoBanco(url) ?? '(indeterminado)';
  throw new Error(
    [
      '',
      '╔══════════════════════════════════════════════════════════════════════╗',
      '║  TESTE ABORTADO — a suíte ia escrever no banco errado.               ║',
      '╚══════════════════════════════════════════════════════════════════════╝',
      '',
      `Motivo:  ${motivo}`,
      `Banco:   ${banco}`,
      '',
      'Os testes CRIAM dados de verdade (planos `pay-loja-*` com active=true,',
      'organizações, usuários) e só limpam no afterAll. Uma execução',
      'interrompida deixa lixo ATIVO no catálogo público — já aconteceu: 13',
      'planos de teste ficaram visíveis em GET /api/plans para quem ia comprar.',
      '',
      'Saída correta — aponte para um banco descartável:',
      '',
      '  docker compose up -d db',
      '  docker compose exec db createdb -U display_user display_db_test',
      '  TEST_DATABASE_URL=postgresql://display_user:<senha>@localhost:5432/display_db_test \\',
      '    npm --prefix apps/api run db:push',
      '',
      'Depois: TEST_DATABASE_URL=…display_db_test npm --prefix apps/api test',
      '',
      'Não contorne isto exportando a URL de desenvolvimento: o teste apaga o',
      'que cria, e o que ele não apagar fica no ar.',
      '',
    ].join('\n'),
  );
}

function resolverUrlDeTeste(): string {
  const explicita = process.env.TEST_DATABASE_URL?.trim();
  const doAmbiente = process.env.DATABASE_URL?.trim();

  const candidata =
    explicita ||
    doAmbiente ||
    // Derivada: mesmo servidor, banco `<banco>_test`. Nunca o banco original.
    (URL_DEV ? URL_DEV.replace(/\/([^/?#]+)(\?|$)/, '/$1_test$2') : '');

  if (!candidata) {
    abortar(
      'nenhuma URL de banco foi encontrada (defina TEST_DATABASE_URL).',
      '',
    );
  }

  const banco = nomeDoBanco(candidata);
  if (!banco) abortar('não consegui extrair o nome do banco da URL.', candidata);

  // 1) Igual à URL de desenvolvimento, ao pé da letra.
  if (URL_DEV && normalizar(candidata) === normalizar(URL_DEV)) {
    abortar('a URL resolvida é EXATAMENTE a de desenvolvimento (apps/api/.env).', candidata);
  }

  // 2) Nome de banco de desenvolvimento, ainda que em outro host/usuário.
  //    Cobre o caso de apontar para o Postgres da VPS com o mesmo banco.
  if (BANCOS_DE_DEV.has(banco.toLowerCase())) {
    abortar(`o banco "${banco}" é o de desenvolvimento/produção, não um banco de teste.`, candidata);
  }

  // 3) Nome que não parece descartável. Sem isto, `…/telahub` passaria.
  if (!pareceBancoDeTeste(banco)) {
    abortar(
      `o banco "${banco}" não parece descartável. Use um nome terminado em _test (ou _ci no CI).`,
      candidata,
    );
  }

  return candidata;
}

const DATABASE_URL_DE_TESTE = resolverUrlDeTeste();

// Processo principal: precisa valer antes de qualquer import de teste.
process.env.DATABASE_URL = DATABASE_URL_DE_TESTE;
process.env.TEST_DATABASE_URL = DATABASE_URL_DE_TESTE;
// `src/server.ts` só deixa de abrir listener e cron quando NODE_ENV === 'test'.
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

export default defineConfig({
  test: {
    // Repassado a cada worker: `test.env` tem precedência sobre `.env` lido
    // pelo Vite, então o banco de dev não volta pela porta dos fundos.
    env: {
      DATABASE_URL: DATABASE_URL_DE_TESTE,
      TEST_DATABASE_URL: DATABASE_URL_DE_TESTE,
      NODE_ENV: 'test',
    },
    // Mesmos padrões de antes (não havia config): nada de `globals`, os testes
    // importam `describe`/`it` explicitamente.
    //
    // O `src/` no início não é decoração: o CI roda `npm run build` antes de
    // `npm test` e, quando `dist/` chegou a conter os testes compilados, o
    // vitest coletava DUAS cópias de cada suíte e as de `dist` falhavam
    // (ver o cabeçalho de `tsconfig.build.json`). Isto fecha essa porta.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Os testes compartilham UM banco e criam registros com sufixo único, mas
    // ainda assim disputam tabelas. Arquivo por vez é mais lento e muito menos
    // sujeito a erro de chave duplicada em `seed`/`plan`.
    fileParallelism: false,
  },
});
