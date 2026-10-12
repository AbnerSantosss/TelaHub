// Pré-renderiza o HTML estático do app: UM `index.html` por rota.
//
// ── Por que isto existe ──────────────────────────────────────────────────────
// Resolve o problema estrutural de SPA: crawlers que não executam JS (GPTBot,
// ClaudeBot, e o Googlebot sob orçamento de rastreamento apertado) recebem o
// conteúdo real da página, não um `<div id="root"></div>` vazio. O React ainda
// hidrata o mesmo HTML no cliente normalmente (ver `src/main.jsx`).
//
// ── O que mudou em 05/09/2026 ────────────────────────────────────────────────
// O site deixou de ter uma página só. Agora saem seis arquivos:
//   dist/index.html            → /
//   dist/condominio/index.html → /condominio      (destino de anúncio)
//   dist/clinica/index.html    → /clinica         (destino de anúncio)
//   dist/loja/index.html       → /loja            (destino de anúncio)
//   dist/termos/index.html     → /termos          (exigido para anunciar)
//   dist/privacidade/index.html→ /privacidade     (exigido para anunciar)
// O nginx entrega cada um pelo `try_files $uri $uri/` — a rota é uma PASTA com
// index dentro, não uma reescrita.
//
// ⚠️ ARMADILHA 1: pré-renderizar sem trocar o `<title>`, a `description` e o
// canonical produz cinco páginas que o Google trata como duplicata da home e
// descarta. Uma página de segmento que o Google não indexa é dinheiro de mídia
// caindo em URL que ninguém acha organicamente.
//
// ⚠️ ARMADILHA 2: `dist/index.html` é ao mesmo tempo o MOLDE e uma das saídas.
// Ele precisa ser lido inteiro ANTES de qualquer escrita; se a home for gravada
// primeiro, as outras rotas herdam o HTML já pré-renderizado da home dentro do
// `<div id="root">` e o React encontra dois conteúdos empilhados na hidratação.
//
// ⚠️ ARMADILHA 3: as substituições de `<head>` são BEST EFFORT e casam com o
// formato atual do `index.html`, que é mantido à mão por outra pessoa. Se uma
// regex deixar de casar, o build NÃO pode quebrar — a página sai com a meta
// genérica da home, que é ruim, mas publicável. Por isso cada troca é
// verificada e reportada no log, e o build falha só se a rota inteira falhar.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// O `render` vem do bundle de SSR (precisa do JSX compilado). A tabela de rotas
// vem do FONTE: `src/paginas/rotas.js` é ESM puro, sem JSX e sem nada do Vite,
// então o Node a lê direto — e assim o `entry-server.jsx` não precisa
// reexportar constantes, o que o lint reprova (`only-export-components`).
const { render } = await import(pathToFileURL(path.resolve(root, 'dist-ssr/entry-server.js')));
const { ROTAS, urlCanonica } = await import(
  pathToFileURL(path.resolve(root, 'src/paginas/rotas.js'))
);

const indexPath = path.resolve(root, 'dist/index.html');

// Lido UMA vez, antes de qualquer escrita. Ver a armadilha 2 acima.
const molde = await readFile(indexPath, 'utf-8');

/** Escapa o que vai virar atributo HTML. Aspas soltas em `content=""` cortam a meta ao meio. */
const attr = (texto) =>
  String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Troca uma tag do `<head>` e diz se conseguiu.
 *
 * Devolver o par [html, trocou] em vez de só o html é o que permite ao log
 * apontar exatamente qual campo parou de casar quando alguém reformatar o
 * `index.html` — sem isso, a falha seria silenciosa e só apareceria semanas
 * depois, no relatório de indexação.
 */
function trocar(html, regex, substituto) {
  if (!regex.test(html)) return [html, false];
  return [html.replace(regex, substituto), true];
}

function aplicarMeta(html, rota) {
  const canonical = urlCanonica(rota.caminho);
  const faltando = [];
  let saida = html;
  let ok;

  if (rota.titulo) {
    [saida, ok] = trocar(saida, /<title>[\s\S]*?<\/title>/, `<title>${attr(rota.titulo)}</title>`);
    if (!ok) faltando.push('title');
  }

  if (rota.descricao) {
    [saida, ok] = trocar(
      saida,
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${attr(rota.descricao)}" />`
    );
    if (!ok) faltando.push('description');
  }

  // O canonical muda em TODA rota, inclusive quando título e descrição são
  // herdados: canonical errado é a única falha de SEO que faz o Google
  // desindexar a página nova e manter a antiga.
  [saida, ok] = trocar(
    saida,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonical}" />`
  );
  if (!ok) faltando.push('canonical');

  [saida, ok] = trocar(
    saida,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${canonical}" />`
  );
  if (!ok) faltando.push('og:url');

  if (rota.ogTitulo) {
    [saida] = trocar(
      saida,
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:title" content="${attr(rota.ogTitulo)}" />`
    );
    [saida] = trocar(
      saida,
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
      `<meta name="twitter:title" content="${attr(rota.ogTitulo)}" />`
    );
  }

  if (rota.ogDescricao) {
    [saida] = trocar(
      saida,
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${attr(rota.ogDescricao)}" />`
    );
    [saida] = trocar(
      saida,
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="twitter:description" content="${attr(rota.ogDescricao)}" />`
    );
  }

  // Nó `WebPage` do JSON-LD: `@id`, `url` e `name` apontam para a home no
  // molde. Deixá-los assim faria cada rota declarar ao Google que ELA é a home.
  // Troca best effort: se o `index.html` mudar de forma, o dado estruturado
  // continua válido (só genérico) e o build segue.
  if (rota.titulo) {
    [saida] = trocar(
      saida,
      /"@id":\s*"[^"]*#webpage",\s*"url":\s*"[^"]*",\s*"name":\s*"[^"]*"/,
      `"@id": "${canonical}#webpage",\n          "url": "${canonical}",\n          "name": ${JSON.stringify(rota.titulo)}`
    );
  }

  return { html: saida, faltando };
}

/** Onde o arquivo de cada rota é gravado. `/` é o próprio `dist/index.html`. */
function destino(caminho) {
  if (caminho === '/') return indexPath;
  return path.resolve(root, 'dist', caminho.replace(/^\//, ''), 'index.html');
}

let erros = 0;

for (const rota of ROTAS) {
  try {
    const appHtml = render(rota.caminho);

    if (!appHtml || appHtml.length < 500) {
      throw new Error(`render("${rota.caminho}") devolveu HTML vazio ou curto demais`);
    }

    const { html, faltando } = aplicarMeta(molde, rota);

    if (!html.includes('<div id="root"></div>')) {
      throw new Error('o molde não contém <div id="root"></div> — nada a preencher');
    }

    const final = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

    const arquivo = destino(rota.caminho);
    await mkdir(path.dirname(arquivo), { recursive: true });
    await writeFile(arquivo, final, 'utf-8');

    const aviso = faltando.length ? `  ⚠️ não substituído: ${faltando.join(', ')}` : '';
    console.log(`  ${rota.caminho.padEnd(14)} → ${path.relative(root, arquivo)}${aviso}`);
  } catch (erro) {
    erros += 1;
    console.error(`  ${rota.caminho.padEnd(14)} → FALHOU: ${erro.message}`);
  }
}

await rm(path.resolve(root, 'dist-ssr'), { recursive: true, force: true });

if (erros > 0) {
  // Publicar com uma rota faltando é pior do que não publicar: o anúncio já
  // aponta para a URL, e ela responderia com o HTML de outra página.
  console.error(`Pré-renderização falhou em ${erros} rota(s).`);
  process.exit(1);
}

console.log(`Pré-renderização concluída: ${ROTAS.length} página(s) com HTML, título e canonical próprios.`);
