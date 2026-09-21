#!/usr/bin/env node
/**
 * verificar-claims-proibidos.mjs — guarda de CI contra promessa que o produto
 * não cumpre.
 *
 * ── POR QUE ESTE ARQUIVO EXISTE ──────────────────────────────────────────────
 * Este projeto já publicou QUATRO vezes copy vendendo coisa que o código não
 * faz: "14 dias grátis" (o trial nunca foi implementado), "funciona offline"
 * (o player não guarda conteúdo na memória da TV), "SLA/SSO/API externa/
 * múltiplas unidades" na grade de planos (vendidos e inexistentes), depoimentos
 * e domínio `telahub.com.br` (que é de TERCEIRO desde 2025). Cada volta dessas
 * é propaganda enganosa (CDC art. 37) e chargeback garantido.
 *
 * Toda vez a correção foi manual, e toda vez a frase voltou — porque nada no
 * pipeline impedia. Este script é o que impede: roda em job próprio do CI, sem
 * banco e sem dependência nenhuma, e falha o build com arquivo:linha.
 *
 * A reincidência nº 5 é questão de tempo. Se você está lendo isto porque o CI
 * quebrou, a saída certa quase nunca é afrouxar o script — é apagar a frase.
 *
 * ── COMO LIBERAR UMA OCORRÊNCIA LEGÍTIMA (leia antes de mexer nas regras) ────
 * As mesmas palavras aparecem legitimamente em dois lugares:
 *
 *   1. COMENTÁRIO DE CÓDIGO explicando por que aquilo é proibido. Comentário
 *      não chega ao usuário (o build o remove), então linhas que começam com
 *      `//`, `*`, `/*`, `#` ou `<!--` são ignoradas automaticamente.
 *
 *   2. PÁGINAS LEGAIS (Termos, Privacidade, FAQ) que dizem a VERDADE: que o
 *      produto NÃO funciona sem internet, que NÃO há marca própria, SLA nem
 *      app nativo. Frase que NEGA o claim é permitida — o script procura
 *      negação ("não", "nunca", "nenhum", "jamais", "inexistente") na mesma
 *      frase e deixa passar. Isso vale para todas as regras marcadas
 *      `negavel: true` (ou seja, todas menos o domínio de terceiro e o
 *      placeholder do GTM, que nunca podem aparecer em texto publicado).
 *
 * Quando as duas saídas acima não bastarem, use o MARCADOR EXPLÍCITO:
 *
 *      claims-permitido                → libera A LINHA em que aparece
 *      claims-permitido:bloco-inicio   → libera daqui até…
 *      claims-permitido:bloco-fim      → …aqui
 *      claims-permitido:arquivo        → libera o arquivo inteiro (só nas 40
 *                                        primeiras linhas; use em página legal)
 *
 * Sempre escreva ao lado do marcador POR QUE aquela frase é verdadeira. O
 * marcador é uma afirmação de que o produto entrega aquilo — ou de que a frase
 * nega o claim —, não um "silencia o linter".
 *
 * ── ARMADILHA: FALSO POSITIVO DERRUBA A GUARDA INTEIRA ───────────────────────
 * Se este script travar o build de quem escreveu a verdade, alguém vai
 * desligá-lo do CI, e aí não há guarda nenhuma. Por isso ele erra
 * DELIBERADAMENTE para o lado de deixar passar:
 *
 *   · `offline` e `sem internet` só acusam em contexto de PROMESSA ("funciona
 *     offline", "modo offline"). O painel usa "offline" como STATUS de tela o
 *     tempo todo (`isOnline ? 'ONLINE' : 'OFFLINE'`) e o checkout vende
 *     "alerta de tela offline" — nada disso é claim.
 *   · `SSO` e `SLA` são casadas em MAIÚSCULA com fronteira de palavra. Sem
 *     isso, `-i` casaria "nosso", "isso", "processo" e — pior — a cor
 *     `slate-500` do Tailwind, que aparece em 58 arquivos do painel.
 *   · `sem fidelidade` só acusa quando a frase NÃO tem o qualificador
 *     "mensal" (o anual TEM fidelidade de 12 meses; o mensal não).
 *
 * Prefira ajustar o contexto da regra a remover a regra.
 *
 * ── USO ──────────────────────────────────────────────────────────────────────
 *      npm run verificar:claims                    (na raiz do monorepo)
 *      node scripts/verificar-claims-proibidos.mjs [pasta…]
 *      node scripts/verificar-claims-proibidos.mjs --regras   (lista as regras)
 *
 * Saída 0 = limpo. Saída 1 = achou claim. Saída 2 = erro de uso.
 * Zero dependências de propósito: o job do CI não instala nada nem sobe banco.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const RAIZ_MONOREPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Superfícies que o cliente lê. O painel não tem `src/`: o código fica na raiz. */
const ALVOS_PADRAO = ['apps/site/src', 'apps/checkout/src', 'apps/painel'];

/** Só código e conteúdo. `.png`/`.mp4` do painel e mapas de build ficam de fora. */
const EXTENSOES = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.json', '.html', '.htm', '.css', '.md', '.txt',
]);

const PASTAS_IGNORADAS = new Set([
  'node_modules', 'dist', 'build', 'coverage', '.git', '.vite', '.turbo',
  '.next', '.cache', 'storybook-static',
]);

/**
 * Documentação interna. README/DESIGN/ADR discutem os claims para explicar por
 * que foram removidos — é prosa em markdown, onde o filtro de comentário não
 * alcança, e nada disso vai para a tela do cliente.
 */
const ARQUIVOS_IGNORADOS = [
  /^package-lock\.json$/i,
  /\.min\.(js|css)$/i,
  /\.map$/i,
  /^(README|DESIGN|CHANGELOG|CONTRIBUTING|ADR[-_].*)\.md$/i,
];

const MARCADOR = 'claims-permitido';
const MARCADOR_BLOCO_INICIO = `${MARCADOR}:bloco-inicio`;
const MARCADOR_BLOCO_FIM = `${MARCADOR}:bloco-fim`;
const MARCADOR_ARQUIVO = `${MARCADOR}:arquivo`;

// ─── Fronteiras de palavra cientes de acento ─────────────────────────────────
// `\b` do JS é ASCII: em "múltiplas" ele acha fronteira no meio da palavra.
// Com `\p{L}` (flag `u`) isso não acontece.
const ANTES = '(?<![\\p{L}\\p{N}])';
const DEPOIS = '(?![\\p{L}\\p{N}])';

/**
 * Verbo/advérbio que transforma uma palavra técnica em PROMESSA de venda.
 *
 * ARMADILHA já vivida aqui: escrever `at[ée]` (para pegar "até") faz a classe
 * casar "ate" — e "date" vira gatilho, acusando `{ date: 'Seg', offline: 2 }`
 * do painel. Só a forma acentuada entra, e o grupo inteiro é usado SEMPRE
 * entre fronteiras de palavra (senão "uso" casa dentro de "uppercase").
 */
const PROMESSA =
  'funciona\\w*|roda\\w*|opera\\w*|toca\\w*|reproduz\\w*|exibe\\w*|continua\\w*|' +
  'trabalha\\w*|segue\\w*|mant[eé]m|aguenta\\w*|suporta\\w*|modo|suporte|uso|' +
  '100\\s*%|mesmo|até|inclusive|também|sem\\s+depender';

/** O grupo de promessa, já com fronteiras. */
const GATILHO = `${ANTES}(?:${PROMESSA})${DEPOIS}`;

/** Negação: a frase está DIZENDO QUE NÃO TEM. Isso é honestidade, não claim. */
const NEGACAO = /(?<![\p{L}\p{N}])(n[ãa]o|nunca|jamais|nenhum[ao]?|inexistente|ausente|deixa(?:mos)?\s+de|ainda\s+n[ãa]o)(?![\p{L}\p{N}])/iu;

/**
 * Regras.
 *
 *   padrao       — o que caça (sempre global + unicode)
 *   porque       — o que dizer para quem quebrou o build
 *   negavel      — frase que nega o claim é permitida (padrão: true)
 *   qualificador — se casar na mesma frase, a ocorrência é permitida
 */
const REGRAS = [
  {
    id: 'trial-14-dias',
    padrao: new RegExp(`${ANTES}14\\s*dias${DEPOIS}`, 'giu'),
    porque: 'O trial de 14 dias foi DESCONTINUADO e nunca existiu no código. Esta frase já voltou quatro vezes.',
  },
  {
    id: 'teste-gratis',
    padrao: new RegExp(`${ANTES}teste\\s+(gr[áa]tis|gratuito)${DEPOIS}`, 'giu'),
    porque: 'Não há período de teste. O que existe é plano mensal sem fidelidade — venda isso, que é verdade.',
  },
  {
    id: 'trial-de',
    padrao: new RegExp(`${ANTES}trial\\s+de${DEPOIS}`, 'giu'),
    porque: 'Não há trial de duração nenhuma.',
  },
  {
    id: 'sem-fidelidade-sem-qualificador',
    padrao: new RegExp(`${ANTES}sem\\s+fidelidade${DEPOIS}`, 'giu'),
    // A própria expressão começa com "sem"; a negação genérica não se aplica.
    negavel: false,
    // Qualificador procurado na JANELA (± 3 linhas), não só na frase: em JSX o
    // "Mensal" costuma estar no `label=` duas linhas acima, e a mesma string
    // aparece no ramo `: '…'` de um ternário `yearly ? … : …` — nesses casos a
    // copy JÁ está correta e travar o build seria falso positivo.
    qualificador: /(?<![\p{L}\p{N}])(mensal|monthly|yearly|billingInterval|12\s+meses)(?![\p{L}\p{N}])/iu,
    porque: 'O plano ANUAL tem compromisso de 12 meses. "Sem fidelidade" seco é falso — escreva "sem fidelidade no mensal".',
  },
  {
    id: 'funciona-offline',
    padrao: new RegExp(
      `(?:${GATILHO}[^.!?;\\n]{0,40}${ANTES}offline${DEPOIS})|(?:${ANTES}offline[-\\s]?first${DEPOIS})`,
      'giu',
    ),
    porque: 'O player NÃO guarda conteúdo na memória da TV: aparelho reiniciado sem internet não volta a exibir. (Status "offline" de tela não é claim e não é acusado.)',
  },
  {
    id: 'funciona-sem-internet',
    padrao: new RegExp(`${GATILHO}[^.!?;\\n]{0,40}${ANTES}sem\\s+internet${DEPOIS}`, 'giu'),
    porque: 'Mesmo caso do offline: sem internet o conteúdo não carrega. O FAQ diz isso corretamente — dizer o contrário na copy é o problema.',
  },
  {
    id: 'app-nativo',
    padrao: new RegExp(`${ANTES}(app|aplicativo)\\s+nativo${DEPOIS}`, 'giu'),
    porque: 'Não existe app nativo publicado em loja nenhuma. O player é web.',
  },
  {
    id: 'white-label',
    // "marca própria" é a mesma promessa em português — entra junto, senão a
    // regra só pega a versão em inglês e a copy migra para a tradução.
    padrao: new RegExp(`${ANTES}(white[\\s-]?label|marca\\s+pr[óo]pria)${DEPOIS}`, 'giu'),
    porque: 'Não há marca própria/white-label implementada: logo, cores e domínio do cliente não existem no produto.',
  },
  {
    id: 'sso',
    // MAIÚSCULA obrigatória: com `-i` isto casaria "nosso", "isso", "processo".
    padrao: new RegExp(`${ANTES}SSO${DEPOIS}`, 'gu'),
    porque: 'Não há login corporativo/SSO. Só e-mail e senha.',
  },
  {
    id: 'sla',
    // MAIÚSCULA obrigatória: com `-i` isto casaria a cor `slate-500` do Tailwind.
    padrao: new RegExp(`${ANTES}SLA${DEPOIS}`, 'gu'),
    porque: 'Não há SLA contratado, nem monitoramento que permita apurar um.',
  },
  {
    id: 'api-externa',
    padrao: new RegExp(`${ANTES}API[\\s-]externa${DEPOIS}`, 'giu'),
    porque: 'Não há API pública/externa documentada para cliente.',
  },
  {
    id: 'multiplas-unidades',
    padrao: new RegExp(`${ANTES}(m[úu]ltiplas\\s+unidades|multi[\\s-]?unidades?)${DEPOIS}`, 'giu'),
    porque: 'Gestão de múltiplas unidades foi vendida na grade e não existe.',
  },
  {
    id: 'multi-org',
    padrao: new RegExp(`${ANTES}multi[\\s-]?org${DEPOIS}`, 'giu'),
    porque: 'Uma conta = uma organização. Alternar entre organizações não existe no painel.',
  },
  {
    id: 'uptime-de',
    padrao: new RegExp(`${ANTES}uptime\\s+de${DEPOIS}`, 'giu'),
    porque: 'Não há medição de uptime publicada — prometer um número é inventar.',
  },
  {
    id: 'numero-99-9',
    padrao: /99[,.]9/gu,
    porque: '"99,9%" é o número que ninguém mediu. Não há status page nem histórico.',
  },
  {
    id: 'mais-vendido',
    padrao: new RegExp(`${ANTES}mais\\s+vendid[oa]${DEPOIS}`, 'giu'),
    porque: 'Não há volume de vendas que sustente "mais vendido". Selo inventado.',
  },
  {
    id: 'depoimento',
    padrao: new RegExp(`${ANTES}depoimentos?${DEPOIS}`, 'giu'),
    porque: 'Não há cliente que tenha autorizado depoimento. Depoimento fabricado é o claim mais fácil de processar.',
  },
  {
    id: 'dominio-de-terceiro',
    padrao: /telahub\.com\.br/giu,
    // Nunca pode aparecer em texto publicado, nem negado: o domínio é de outra
    // empresa desde 2025 e qualquer link/placeholder manda gente para lá.
    negavel: false,
    porque: 'O domínio `telahub.com.br` é de TERCEIRO desde 2025. O domínio público é vendas.proxserverabner.site.',
  },
  {
    id: 'gtm-placeholder',
    padrao: /GTM-X{3,}/giu,
    negavel: false,
    porque: 'Placeholder de container do GTM. Publicado assim, a medição não existe e o console do navegador acusa erro.',
  },
];

// ─── Utilidades ──────────────────────────────────────────────────────────────

/**
 * Linha que é só comentário — o build a remove, então ela nunca chega ao
 * cliente e nunca é claim. `{/*` entra porque é como o JSX comenta, e é
 * justamente onde os quatro incidentes foram documentados no código.
 */
function ehComentario(linha) {
  const t = linha.trimStart();
  return (
    t.startsWith('//') ||
    t.startsWith('/*') ||
    t.startsWith('{/*') ||
    t.startsWith('*') ||
    t.startsWith('#') ||
    t.startsWith('<!--')
  );
}

/**
 * Recorta a FRASE em volta da ocorrência. Serve para avaliar negação perto do
 * claim, e não em qualquer lugar do arquivo.
 */
function frase(texto, indice) {
  const limites = ['.', '!', '?', ';', '\n', '·', '|'];
  let inicio = 0;
  for (const c of limites) {
    const p = texto.lastIndexOf(c, Math.max(0, indice - 1));
    if (p !== -1 && p + 1 > inicio) inicio = p + 1;
  }
  let fim = texto.length;
  for (const c of limites) {
    const p = texto.indexOf(c, indice);
    if (p !== -1 && p < fim) fim = p;
  }
  return texto.slice(inicio, fim);
}

/**
 * Janela de ± N linhas. Em JSX a frase quebra em várias linhas: o qualificador
 * ("Mensal") costuma estar num `label=` acima e o ramo do ternário abaixo. Sem
 * a janela, a regra do "sem fidelidade" acusaria copy correta — e falso
 * positivo é o que faz alguém desligar a guarda do CI.
 */
function janela(linhas, i, n = 3) {
  return linhas.slice(Math.max(0, i - n), Math.min(linhas.length, i + n + 1)).join('\n');
}

/** Linha anterior com conteúdo — é onde mora o "não oferecemos:" de uma lista. */
function linhaAnteriorUtil(linhas, i) {
  for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
    if (linhas[j].trim()) return linhas[j];
  }
  return '';
}

function deveIgnorarArquivo(nome) {
  return ARQUIVOS_IGNORADOS.some((re) => re.test(nome));
}

function* varrer(dir) {
  let entradas;
  try {
    entradas = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entradas) {
    const completo = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (PASTAS_IGNORADAS.has(e.name)) continue;
      yield* varrer(completo);
    } else if (e.isFile()) {
      if (!EXTENSOES.has(path.extname(e.name).toLowerCase())) continue;
      if (deveIgnorarArquivo(e.name)) continue;
      yield completo;
    }
  }
}

// ─── Verificação ─────────────────────────────────────────────────────────────

function verificarArquivo(arquivo) {
  let conteudo;
  try {
    conteudo = fs.readFileSync(arquivo, 'utf8');
  } catch {
    return [];
  }

  const linhas = conteudo.split(/\r?\n/);

  // Liberação do arquivo inteiro (páginas legais).
  if (linhas.slice(0, 40).some((l) => l.includes(MARCADOR_ARQUIVO))) return [];

  const achados = [];
  let dentroDeBloco = false;
  let dentroDeComentario = false;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];

    // Comentário de bloco de várias linhas (`/* … */`, `{/* … */}`): só a
    // primeira linha começa com o delimitador, as do meio parecem texto solto.
    if (dentroDeComentario) {
      if (linha.includes('*/')) dentroDeComentario = false;
      continue;
    }
    const abre = linha.lastIndexOf('/*');
    if (abre !== -1 && abre > linha.lastIndexOf('*/')) dentroDeComentario = true;

    if (linha.includes(MARCADOR_BLOCO_INICIO)) { dentroDeBloco = true; continue; }
    if (linha.includes(MARCADOR_BLOCO_FIM)) { dentroDeBloco = false; continue; }
    if (dentroDeBloco) continue;
    if (linha.includes(MARCADOR)) continue;   // liberação de linha única
    if (ehComentario(linha)) continue;        // comentário não vai para o cliente
    if (!linha.trim()) continue;

    const contexto = janela(linhas, i);
    const anterior = linhaAnteriorUtil(linhas, i);

    for (const regra of REGRAS) {
      regra.padrao.lastIndex = 0;
      let m;
      while ((m = regra.padrao.exec(linha)) !== null) {
        if (m[0] === '') { regra.padrao.lastIndex++; continue; }

        const negavel = regra.negavel !== false;

        // Negação: procurada na frase da PRÓPRIA linha mais a linha anterior
        // (é lá que fica o "não oferecemos:" que introduz uma lista). Mantida
        // local de propósito: um "não" a cinco linhas de distância não é
        // negação do claim, e aceitá-lo abriria um buraco na guarda.
        // O trecho casado sai antes do teste para que "sem fidelidade" e
        // "sem internet" não neguem a si mesmas.
        const alvoNegacao = `${anterior}\n${frase(linha, m.index)}`.replace(m[0], ' ');
        if (negavel && NEGACAO.test(alvoNegacao)) continue;

        // Qualificador: procurado na janela inteira (JSX quebra a frase).
        if (regra.qualificador && regra.qualificador.test(contexto)) continue;

        achados.push({
          arquivo,
          linha: i + 1,
          coluna: m.index + 1,
          regra,
          trecho: linha.trim().slice(0, 160),
        });
      }
    }
  }

  return achados;
}

// ─── Execução ────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);

if (argv.includes('--ajuda') || argv.includes('-h') || argv.includes('--help')) {
  console.log('uso: node scripts/verificar-claims-proibidos.mjs [pasta…] [--regras]');
  console.log(`marcador de exceção: ${MARCADOR} (linha) · ${MARCADOR_BLOCO_INICIO}/${MARCADOR_BLOCO_FIM} · ${MARCADOR_ARQUIVO}`);
  process.exit(0);
}

if (argv.includes('--regras')) {
  console.log('Regras ativas:\n');
  for (const r of REGRAS) console.log(`  ${r.id.padEnd(32)} ${r.porque}`);
  process.exit(0);
}

const alvos = (argv.filter((a) => !a.startsWith('--')).length ? argv.filter((a) => !a.startsWith('--')) : ALVOS_PADRAO)
  .map((a) => (path.isAbsolute(a) ? a : path.join(RAIZ_MONOREPO, a)));

const achados = [];
let arquivosLidos = 0;

for (const alvo of alvos) {
  if (!fs.existsSync(alvo)) {
    console.error(`✗ alvo inexistente: ${path.relative(RAIZ_MONOREPO, alvo)}`);
    process.exit(2);
  }
  // Aceitar um ARQUIVO como alvo é o que permite testar uma regra sem varrer o
  // monorepo inteiro — e foi assim que os falsos positivos deste script
  // (`date` casando "até", `slate-500` casando SLA) foram encontrados.
  const arquivos = fs.statSync(alvo).isFile() ? [alvo] : [...varrer(alvo)];
  for (const arquivo of arquivos) {
    arquivosLidos++;
    achados.push(...verificarArquivo(arquivo));
  }
}

if (achados.length === 0) {
  console.log(`✓ claims: ${arquivosLidos} arquivos verificados, nenhuma promessa proibida encontrada.`);
  process.exit(0);
}

console.error('');
console.error('✗ CLAIMS PROIBIDOS ENCONTRADOS — promessa que o produto não cumpre.');
console.error(`  ${achados.length} ocorrência(s) em ${arquivosLidos} arquivos verificados.`);
console.error('');

const porRegra = new Map();
for (const a of achados) {
  if (!porRegra.has(a.regra.id)) porRegra.set(a.regra.id, []);
  porRegra.get(a.regra.id).push(a);
}

for (const [id, lista] of porRegra) {
  console.error(`── ${id} (${lista.length}) ────────────────────────────────────`);
  console.error(`   ${lista[0].regra.porque}`);
  for (const a of lista) {
    const rel = path.relative(RAIZ_MONOREPO, a.arquivo).replace(/\\/g, '/');
    console.error(`   ${rel}:${a.linha}:${a.coluna}`);
    console.error(`      ${a.trecho}`);
  }
  console.error('');
}

console.error('O que fazer:');
console.error('  1. Apague a frase. É quase sempre a resposta certa — o produto não faz isso.');
console.error('  2. Se o produto PASSOU a fazer, mude o texto e remova a regra deste script,');
console.error('     explicando no commit o que foi entregue.');
console.error(`  3. Se a frase NEGA o claim (página legal, FAQ), escreva "${MARCADOR}" na linha`);
console.error(`     — ou "${MARCADOR_ARQUIVO}" no topo da página legal — com o motivo ao lado.`);
console.error('');

process.exit(1);
