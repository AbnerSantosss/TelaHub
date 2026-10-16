#!/usr/bin/env node
// Dev local com o mesmo desenho do domínio único de produção.
//
// Sobe os dev servers de site (4100), painel (4110) e checkout (4130) e, com
// --api, também a API (3001). Abra só http://localhost:4100: o vite do site
// faz proxy de /app para o painel, /checkout para o checkout e /api e /uploads
// para a API, e responde os 302 de /entrar e /cadastro (apps/site/vite.config.js).
//
// Uso:
//   npm run dev:unificado          site + painel + checkout
//   npm run dev:unificado -- --api também sobe a API (precisa do Postgres)
//
// Ctrl+C derruba todos os processos.
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const comApi = process.argv.includes('--api');

const apps = [
  { nome: 'site', cor: 36 },
  { nome: 'painel', cor: 35 },
  { nome: 'checkout', cor: 33 },
  ...(comApi ? [{ nome: 'api', cor: 32 }] : []),
];

const filhos = [];
let encerrando = false;

function prefixar(nome, cor, chunk) {
  const etiqueta = `\x1b[${cor}m[${nome.padEnd(8)}]\x1b[0m `;
  const linhas = chunk.toString().split(/\r?\n/);
  if (linhas.at(-1) === '') linhas.pop();
  for (const linha of linhas) process.stdout.write(etiqueta + linha + '\n');
}

for (const { nome, cor } of apps) {
  // shell: true para o Windows achar o npm.cmd. Comando numa string só: com
  // shell, args em array geram aviso de depreciação no Node 22+.
  const filho = spawn(`npm --prefix apps/${nome} run dev`, {
    cwd: raiz,
    shell: true,
    env: process.env,
  });
  filho.stdout.on('data', (c) => prefixar(nome, cor, c));
  filho.stderr.on('data', (c) => prefixar(nome, cor, c));
  filho.on('exit', (codigo) => {
    prefixar(nome, cor, `saiu com código ${codigo}`);
    if (!encerrando) encerrar(codigo ?? 1);
  });
  filhos.push(filho);
}

console.log('\nAbra http://localhost:4100 (site, /app, /checkout, /api e /entrar no mesmo endereço).\n');

function encerrar(codigo = 0) {
  if (encerrando) return;
  encerrando = true;
  for (const filho of filhos) {
    if (filho.exitCode !== null) continue;
    if (process.platform === 'win32') {
      // Com shell: true o pid é do cmd.exe; /T derruba o vite junto. Síncrono:
      // se o processo pai sair antes, os vite ficam órfãos segurando a porta.
      spawnSync('taskkill', ['/pid', String(filho.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      filho.kill('SIGTERM');
    }
  }
  setTimeout(() => process.exit(codigo), 500);
}

process.on('SIGINT', () => encerrar(0));
process.on('SIGTERM', () => encerrar(0));
