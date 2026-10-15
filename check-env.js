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

// 3. Portas: quem responde em cada uma
//
// POR QUE NÃO BASTA VER SE A PORTA ESTÁ ABERTA: no Windows dois processos
// bindam a mesma porta sem erro, e quem responde é o que subiu primeiro. Já
// aconteceu três vezes (3000, 5173 e 3010): o "Entrar" da landing page abria
// outro produto desta máquina, com a porta "aberta" e tudo parecendo certo.
// Por isso cada porta é testada pelo conteúdo: o HTML precisa ter o <title>
// do TelaHub e a API precisa responder o JSON do /api/health.
const PORTAS = [
  { port: 5432, name: 'PostgreSQL', tcp: true },
  { port: 3001, name: 'API', path: '/api/health', espera: '"status":"ok"' },
  { port: 4100, name: 'Site (vendas)', espera: '<title>TelaHub' },
  { port: 4110, name: 'Painel', espera: '<title>Painel TelaHub' },
  { port: 4130, name: 'Checkout', espera: '<title>Contratar TelaHub' },
];

function portaEscutando(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: 'localhost' });
    const fim = (escutando) => { socket.destroy(); resolve(escutando); };
    socket.setTimeout(1500, () => fim(false));
    socket.once('connect', () => fim(true));
    socket.once('error', () => fim(false));
  });
}

async function quemResponde(item) {
  try {
    const res = await fetch(`http://localhost:${item.port}${item.path || '/'}`, {
      signal: AbortSignal.timeout(3000),
    });
    const corpo = await res.text();
    if (corpo.includes(item.espera)) return { telahub: true };
    const titulo = /<title>([^<]*)<\/title>/i.exec(corpo);
    return { telahub: false, quem: titulo ? titulo[1].trim() : `HTTP ${res.status}, sem <title>` };
  } catch (e) {
    return { telahub: false, quem: `não respondeu HTTP (${e.cause?.code || e.name})` };
  }
}

async function runPortDiagnostics() {
  console.log(`
${colors.bold}${colors.cyan}--- Portas do TelaHub ---${colors.reset}`);
  let portConflicts = 0;
  for (const item of PORTAS) {
    const rotulo = `Porta ${item.port} (${item.name})`;
    if (!(await portaEscutando(item.port))) {
      console.log(`${colors.yellow}○ ${rotulo}:${colors.reset} livre, o serviço não está rodando.`);
      continue;
    }
    if (item.tcp) {
      console.log(`${colors.green}✓ ${rotulo}:${colors.reset} escutando.`);
      continue;
    }
    const r = await quemResponde(item);
    if (r.telahub) {
      console.log(`${colors.green}✓ ${rotulo}:${colors.reset} TelaHub respondendo.`);
    } else {
      console.log(`${colors.red}✗ ${rotulo}:${colors.reset} OCUPADA POR OUTRO APP. Responde: "${r.quem}".`);
      console.log(`  Os links entre site, painel e checkout vão abrir esse outro app. Feche o processo dono da porta`);
      console.log(`  (netstat -ano | findstr :${item.port}) ou suba o TelaHub antes dele.`);
      portConflicts++;
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
    console.log(`1. Uma ou mais portas do TelaHub estão com outro app respondendo. Veja acima.`);
  } else {
    console.log(`${colors.green}Environment is ready! You can run the project.${colors.reset}`);
  }
}

runPortDiagnostics();
