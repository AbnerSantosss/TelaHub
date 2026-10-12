const fs = require('fs');
const net = require('net');
const { execSync } = require('child_process');
const path = require('path');

// Colors
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

console.log(`${colors.bold}${colors.cyan}=== TelaHub Environment Diagnostic ===${colors.reset}\n`);

// 1. Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
if (majorVersion >= 20) {
  console.log(`${colors.green}✓ Node.js:${colors.reset} Version ${nodeVersion} (Recommended is >= 20.x)`);
} else {
  console.log(`${colors.yellow}⚠ Node.js:${colors.reset} Version ${nodeVersion} detected. Recommended version is 20.x or higher.`);
}

// 2. Check Docker
let dockerRunning = false;
try {
  execSync('docker ps', { stdio: 'ignore' });
  console.log(`${colors.green}✓ Docker:${colors.reset} Docker is running and active.`);
  dockerRunning = true;
} catch (e) {
  console.log(`${colors.red}✗ Docker:${colors.reset} Docker Desktop is not running or not installed.`);
}

// 3. Probe Ports
const portsToCheck = [
  { port: 5432, name: 'PostgreSQL Database' },
  { port: 3001, name: 'Backend API' },
  { port: 5173, name: 'Frontend Dev Server (Vite)' }
];

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true); // port is in use
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(false); // port is free
    });
    server.listen(port, '127.0.0.1');
  });
}

async function runPortDiagnostics() {
  console.log(`\n${colors.bold}${colors.cyan}--- Port Diagnostics ---${colors.reset}`);
  let portConflicts = 0;
  for (const item of portsToCheck) {
    const inUse = await checkPort(item.port);
    if (inUse) {
      console.log(`${colors.yellow}⚠ Port ${item.port} (${item.name}):${colors.reset} Already in use (occupied).`);
      portConflicts++;
    } else {
      console.log(`${colors.green}✓ Port ${item.port} (${item.name}):${colors.reset} Free.`);
    }
  }
  
  // 4. Check Environment Variables in Backend
  console.log(`\n${colors.bold}${colors.cyan}--- Backend Configuration ---${colors.reset}`);
  const envPath = path.join(__dirname, 'apps', 'api', '.env');
  if (fs.existsSync(envPath)) {
    console.log(`${colors.green}✓ .env File:${colors.reset} Found at apps/api/.env`);
    const envContent = fs.readFileSync(envPath, 'utf8');
    const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
    if (dbUrlLine) {
      console.log(`  Database URL configured: ${dbUrlLine.trim()}`);
    } else {
      console.log(`${colors.red}✗ DATABASE_URL:${colors.reset} Missing in apps/api/.env`);
    }
  } else {
    console.log(`${colors.red}✗ .env File:${colors.reset} Missing at apps/api/.env (Copy from .env.example)`);
  }

  // 5. Banco de TESTE separado do de desenvolvimento
  //
  // POR QUE ISTO ESTÁ AQUI: a suíte da API cria dados de verdade (planos
  // `pay-loja-*` com active=true) e só limpa no afterAll. Rodando contra o
  // banco de desenvolvimento, uma execução interrompida deixa lixo ATIVO no
  // catálogo — já aconteceu, com 13 planos de teste visíveis em GET /api/plans.
  // `apps/api/vitest.config.ts` recusa rodar contra o banco de dev; este bloco
  // é só o aviso amigável, antes de a pessoa esbarrar no erro.
  console.log(`\n${colors.bold}${colors.cyan}--- Banco de teste (isolamento da suíte) ---${colors.reset}`);
  const testUrl = (process.env.TEST_DATABASE_URL || '').trim();
  const nomeDoBanco = (url) => {
    const m = /^[^:]+:\/\/[^/]+\/([^/?#]+)/.exec(url);
    return m ? m[1] : null;
  };
  if (testUrl) {
    const banco = nomeDoBanco(testUrl);
    if (banco && /test/i.test(banco)) {
      console.log(`${colors.green}✓ TEST_DATABASE_URL:${colors.reset} aponta para "${banco}" (separado do de desenvolvimento).`);
    } else {
      console.log(`${colors.red}✗ TEST_DATABASE_URL:${colors.reset} aponta para "${banco || '?'}" — não parece um banco descartável.`);
    }
  } else {
    console.log(`${colors.yellow}⚠ TEST_DATABASE_URL:${colors.reset} não definida. O vitest deriva "<seu_banco>_test"; se esse banco não existir, os testes falham na conexão — e falhar é o certo, melhor do que escrever no banco de desenvolvimento.`);
    console.log(`  Criar uma vez:  docker compose exec db createdb -U display_user display_db_test`);
  }

  // Final Actionable Summary
  console.log(`\n${colors.bold}${colors.cyan}--- Next Steps ---${colors.reset}`);
  if (!dockerRunning && !fs.existsSync(envPath)) {
    console.log(`1. Start Docker Desktop so PostgreSQL can be spun up.`);
    console.log(`2. Create apps/api/.env based on apps/api/.env.example.`);
  } else if (!dockerRunning) {
    console.log(`1. Start Docker Desktop so the database can be initialized.`);
  } else if (portConflicts > 0) {
    console.log(`1. One or more ports are already in use. Please shut down conflicting processes.`);
  } else {
    console.log(`${colors.green}Environment is ready! You can run the project.${colors.reset}`);
  }
}

runPortDiagnostics();
