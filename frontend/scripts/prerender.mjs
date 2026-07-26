// Pré-renderiza o HTML estático do app dentro de dist/index.html.
// Resolve o problema estrutural de SPA: crawlers que não executam JS
// (GPTBot, ClaudeBot, e o Googlebot sob orçamento de rastreamento apertado)
// recebem o conteúdo real da página, não um <div id="root"></div> vazio.
// O React ainda hidrata o mesmo HTML no cliente normalmente (ver main.jsx).
import { readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const { render } = await import(pathToFileURL(path.resolve(root, 'dist-ssr/entry-server.js')));

const appHtml = render();

const indexPath = path.resolve(root, 'dist/index.html');
const html = await readFile(indexPath, 'utf-8');
const prerendered = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

await writeFile(indexPath, prerendered, 'utf-8');
await rm(path.resolve(root, 'dist-ssr'), { recursive: true, force: true });

console.log('Pré-renderização concluída: dist/index.html agora contém o HTML do app.');
