/**
 * Sincroniza o snapshot de preços do site com o catálogo real da API.
 *
 * ## Por que este script existe
 *
 * Até 2026-07-31 os preços da página de vendas eram três constantes escritas à
 * mão em `src/components/Pricing.jsx` (a grade, o simulador e o `priceNote`; hoje
 * `Precos.jsx`),
 * enquanto o preço que o cliente realmente paga vem de `Plan` no banco, semeado
 * por `apps/api/prisma/seed-plans.ts` e servido em `GET /api/plans`.
 *
 * Duas fontes de verdade para o mesmo número, em repositórios que na época nem
 * eram o mesmo. Isso não é dívida técnica de estilo: preço anunciado numa
 * página pública **vincula o contrato** (CDC art. 30) e anunciar um e cobrar
 * outro é publicidade enganosa (art. 37). A divergência não precisava nem de má
 * fé — bastava um reajuste aplicado no seed e esquecido no JSX.
 *
 * ## Por que no BUILD e não em runtime
 *
 * O site é pré-renderizado para ranquear (ver `scripts/prerender.mjs`). Buscar
 * preço no navegador devolveria o preço certo para o visitante, mas entregaria
 * ao crawler um HTML com o preço vazio ou desatualizado — perde-se justamente
 * o que o SSR foi montado para ganhar. Buscando no build, o número entra no
 * HTML estático.
 *
 * ## Por que a falha NÃO derruba o build
 *
 * Se a API estiver fora do ar (ou inacessível a partir do runner do GitHub),
 * abortar o build significaria não conseguir publicar nem uma correção de
 * texto. Neste caso o script mantém o snapshot versionado em
 * `src/data/planos.json` e apenas AVISA. O snapshot é commitado de propósito:
 * ele é o contrato mínimo que garante um build reproduzível e offline.
 *
 * O risco residual — snapshot velho após um reajuste — é mitigado por não haver
 * outro lugar onde o preço seja escrito: para atualizar, roda-se este script e
 * a mudança aparece no diff, revisável.
 *
 * ## Uso
 *
 *   npm run sync:plans                       # usa a API de produção
 *   PLANS_API_URL=http://localhost:3002/api npm run sync:plans
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = path.resolve(__dirname, '../src/data/planos.json');

const API_BASE = (process.env.PLANS_API_URL || 'https://devtelahubpainel.proxserverabner.site/api').replace(/\/+$/, '');
const TIMEOUT_MS = Number(process.env.PLANS_API_TIMEOUT_MS || 10000);

/** Códigos que a página de preços precisa encontrar para renderizar. */
const CODIGOS_OBRIGATORIOS = ['gratis', 'loja', 'rede', 'enterprise'];

const aviso = (msg) => console.warn(`\x1b[33m⚠ preços:\x1b[0m ${msg}`);
const ok = (msg) => console.log(`\x1b[32m✓ preços:\x1b[0m ${msg}`);

async function buscarCatalogo() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resposta = await fetch(`${API_BASE}/plans`, { signal: controller.signal });
    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }
    return await resposta.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Reduz a resposta da API ao que a página realmente usa.
 *
 * Só NÚMERO entra aqui — nome comercial, bullets e CTA continuam em
 * `Precos.jsx`, porque são texto editorial, não dado do catálogo. A lista de
 * `features` da API é técnica (chaves como `powerbi`) e não serve de copy.
 */
function normalizar(payload) {
  const todos = Array.isArray(payload?.plans) ? payload.plans : [];
  const faltando = CODIGOS_OBRIGATORIOS.filter((c) => !todos.some((p) => p.code === c));
  if (faltando.length > 0) {
    throw new Error(`catálogo sem os planos: ${faltando.join(', ')}`);
  }

  // Só entram no snapshot os códigos que a página sabe apresentar.
  //
  // Isto não é paranoia: em 2026-08-31 o catálogo de desenvolvimento apareceu
  // com 13 planos `pay-loja-<timestamp>` ativos — restos de uma execução de
  // teste interrompida, que roda contra o MESMO banco e limpa no `afterAll`.
  // Sem este filtro eles entrariam no snapshot, e o componente de preços
  // renderizaria (ou explodiria com) planos que não têm nome comercial, bullets
  // nem CTA. Plano novo de verdade só chega à página quando alguém escrever a
  // copy dele e acrescentar o código em `CODIGOS_OBRIGATORIOS` — que é
  // exatamente a revisão que se quer nesse caso.
  const planos = todos.filter((p) => CODIGOS_OBRIGATORIOS.includes(p.code));
  const ignorados = todos.filter((p) => !CODIGOS_OBRIGATORIOS.includes(p.code));
  if (ignorados.length > 0) {
    aviso(
      `${ignorados.length} plano(s) ativo(s) fora da lista da página foram ignorados: ` +
        `${ignorados.map((p) => p.code).join(', ')}. Se algum deles é real, escreva a copy e ` +
        'acrescente o código em CODIGOS_OBRIGATORIOS.',
    );
  }

  return {
    _origem: `${API_BASE}/plans`,
    currency: payload.currency ?? 'BRL',
    freeScreens: payload.billingPolicy?.freeScreens ?? 1,
    planos: planos.map((p) => ({
      code: p.code,
      name: p.name,
      /** Reais por tela/mês. `null` quando é sob consulta (Enterprise). */
      precoPorTela: p.quoteOnly ? null : p.pricePerScreen,
      /**
       * Reais por tela/mês quando a assinatura é anual. `null` quando o plano
       * não tem oferta anual (grátis e Enterprise) — a API devolve `0` nesse
       * caso, e `0` na página viraria "R$ 0 no anual", que é o oposto do que a
       * grade quer dizer. Normalizar para `null` obriga o componente a decidir
       * o que fazer com a ausência, em vez de imprimir um preço falso.
       */
      precoAnualPorTela:
        p.quoteOnly || !p.priceAnnualPerScreen ? null : p.priceAnnualPerScreen,
      /** Piso de telas cobradas na fatura. */
      minScreens: p.minScreens ?? 1,
      quoteOnly: Boolean(p.quoteOnly),
      free: Boolean(p.free),
    })),
  };
}

async function main() {
  let snapshotAtual = null;
  try {
    snapshotAtual = JSON.parse(await readFile(SNAPSHOT, 'utf-8'));
  } catch {
    // Primeira execução: não há snapshot ainda. Aí sim a falha é fatal, porque
    // sem snapshot a página de preços não tem de onde renderizar.
  }

  let novo;
  try {
    novo = normalizar(await buscarCatalogo());
  } catch (erro) {
    if (!snapshotAtual) {
      console.error(`\x1b[31m✗ preços:\x1b[0m ${erro.message} e não existe snapshot em src/data/planos.json.`);
      process.exit(1);
    }
    aviso(`${erro.message} — mantendo o snapshot versionado (${API_BASE}).`);
    aviso('O build segue com os preços do último sync. Confirme antes de publicar reajuste.');
    return;
  }

  const antes = snapshotAtual ? JSON.stringify(snapshotAtual.planos) : null;
  if (antes === JSON.stringify(novo.planos)) {
    ok('snapshot já está igual ao catálogo da API.');
    return;
  }

  await writeFile(SNAPSHOT, `${JSON.stringify(novo, null, 2)}\n`, 'utf-8');
  ok('snapshot atualizado a partir da API — revise o diff antes de commitar.');
  for (const p of novo.planos) {
    const anual = p.precoAnualPorTela === null ? '' : ` · R$ ${p.precoAnualPorTela}/tela no anual`;
    console.log(`    ${p.code.padEnd(12)} ${p.precoPorTela === null ? 'sob consulta' : `R$ ${p.precoPorTela}/tela`}${anual}  (mín. ${p.minScreens})`);
  }
}

await main();
