/**
 * setup-dev.js — Configuração automática do ambiente de desenvolvimento local
 * 
 * Uso: node setup-dev.js
 * 
 * O que faz:
 * 1. Cria backend/.env se não existir (usando as credenciais do .env da raiz)
 * 2. Cria docker-compose.override.yml para expor a porta do banco localmente
 * 3. Detecta conflito de porta do PostgreSQL e ajusta automaticamente
 * 4. Cria frontend/.env com VITE_API_URL apontando para o backend local
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const { execSync } = require('child_process');

const ROOT = __dirname;

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

function log(color, icon, msg) {
  console.log(`${color}${icon}${colors.reset} ${msg}`);
}

// Detecta se uma porta tem algo escutando (tenta conectar)
function isPortResponding(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

// Verifica se existe um processo postgres local (não-Docker) rodando
function hasLocalPostgres() {
  try {
    const { execSync } = require('child_process');
    // No Windows, checa se existe postgres.exe rodando fora do Docker
    const output = execSync('tasklist /FI "IMAGENAME eq postgres.exe" /NH', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return output.includes('postgres.exe');
  } catch {
    return false;
  }
}

// Lê variáveis do .env da raiz
function parseEnvFile(filePath) {
  const vars = {};
  if (!fs.existsSync(filePath)) return vars;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    vars[key] = value;
  }
  return vars;
}

async function main() {
  console.log(`\n${colors.bold}${colors.cyan}🔧 TelaHub — Setup de Desenvolvimento Local${colors.reset}\n`);

  // 1. Determinar porta do PostgreSQL
  const defaultPort = 5432;
  const altPort = 5433;
  let dbPort = defaultPort;

  const localPg = hasLocalPostgres();
  const portResponding = await isPortResponding(defaultPort);

  if (localPg || portResponding) {
    log(colors.yellow, '⚠', `PostgreSQL local detectado na porta ${defaultPort}`);
    log(colors.green, '→', `Usando porta alternativa ${altPort} para o Docker`);
    dbPort = altPort;
  } else {
    log(colors.green, '✓', `Porta ${defaultPort} livre — usando porta padrão`);
  }

  // 2. Criar docker-compose.override.yml
  const overridePath = path.join(ROOT, 'docker-compose.override.yml');
  const overrideContent = `# Override para desenvolvimento local (NÃO sobe para o Git)
# Gerado automaticamente por: node setup-dev.js
services:
  db:
    ports:
      - "${dbPort}:5432"
`;

  fs.writeFileSync(overridePath, overrideContent, 'utf-8');
  log(colors.green, '✓', `docker-compose.override.yml criado (porta ${dbPort})`);

  // 2b. Rede compartilhada pelas stacks (painel, site, checkout, cloudflared).
  // O compose a declara como `external`, então ela precisa existir ANTES do
  // `docker compose up` — inclusive localmente, senão o comando falha com
  // "network telahub_net declared as external, but could not be found".
  try {
    execSync('docker network inspect telahub_net', { stdio: 'ignore' });
    log(colors.green, '✓', 'Rede docker telahub_net já existe');
  } catch {
    try {
      execSync('docker network create telahub_net', { stdio: 'ignore' });
      log(colors.green, '✓', 'Rede docker telahub_net criada');
    } catch {
      log(colors.yellow, '!', 'Não foi possível criar a rede telahub_net (o Docker está rodando?). Crie com: docker network create telahub_net');
    }
  }

  // 3. Criar backend/.env
  const backendEnvPath = path.join(ROOT, 'backend', '.env');
  const rootEnv = parseEnvFile(path.join(ROOT, '.env'));

  const pgUser = rootEnv.POSTGRES_USER || 'display_user';
  const pgPass = rootEnv.POSTGRES_PASSWORD || 'devpassword123';
  const pgDb = rootEnv.POSTGRES_DB || 'display_db';
  const jwtSecret = rootEnv.JWT_SECRET || 'telahub-jwt-dev-secret-key-1234567890';
  const adminEmail = rootEnv.ADMIN_EMAIL || 'admin@telahub.com';
  const adminPass = rootEnv.ADMIN_PASSWORD || 'adminpass123';

  const backendEnvContent = `# Gerado automaticamente por: node setup-dev.js
# Banco de dados (PostgreSQL via Docker local na porta ${dbPort})
DATABASE_URL=postgresql://${pgUser}:${pgPass}@localhost:${dbPort}/${pgDb}?schema=public

# Segurança
JWT_SECRET=${jwtSecret}

# Servidor
PORT=3001

# URL do frontend (dev local)
APP_URL=http://localhost:3000

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Admin padrão
ADMIN_EMAIL=${adminEmail}
ADMIN_PASSWORD=${adminPass}
`;

  if (fs.existsSync(backendEnvPath)) {
    log(colors.yellow, '⚠', 'backend/.env já existe — sobrescrevendo com novas configurações');
  }
  fs.writeFileSync(backendEnvPath, backendEnvContent, 'utf-8');
  log(colors.green, '✓', 'backend/.env criado');

  // 4. Criar frontend/.env
  const frontendEnvPath = path.join(ROOT, 'frontend', '.env');
  const frontendEnvContent = `# Gerado automaticamente por: node setup-dev.js
VITE_API_URL=http://localhost:3001/api
`;

  if (fs.existsSync(frontendEnvPath)) {
    log(colors.yellow, '⚠', 'frontend/.env já existe — sobrescrevendo com novas configurações');
  }
  fs.writeFileSync(frontendEnvPath, frontendEnvContent, 'utf-8');
  log(colors.green, '✓', 'frontend/.env criado');

  // 5. Resumo
  console.log(`\n${colors.bold}${colors.cyan}📋 Resumo${colors.reset}`);
  console.log(`   PostgreSQL Docker: localhost:${dbPort}`);
  console.log(`   Backend API:       http://localhost:3001`);
  console.log(`   Frontend Vite:     http://localhost:3000`);

  console.log(`\n${colors.bold}${colors.cyan}🚀 Para rodar o projeto:${colors.reset}`);
  console.log(`   1. docker compose up db -d`);
  console.log(`   2. cd backend && npx prisma db push && npm run dev`);
  console.log(`   3. cd frontend && npm run dev`);
  console.log('');
}

main().catch(console.error);
