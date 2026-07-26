import dotenv from 'dotenv';
dotenv.config();

// Em produção, uploads de mídia precisam ser persistidos no R2 — sem isso,
// arquivos salvos em disco local são perdidos a cada reinício de container.
if (process.env.NODE_ENV === 'production') {
  const requiredR2Vars = ['R2_ENDPOINT', 'R2_ACCESS_KEY', 'R2_SECRET_KEY', 'R2_BUCKET'];
  const missingR2Vars = requiredR2Vars.filter((key) => !process.env[key]);
  if (missingR2Vars.length > 0) {
    console.error(
      `❌ Boot abortado: variáveis de R2 obrigatórias em produção ausentes: ${missingR2Vars.join(', ')}. ` +
      'Configure-as antes de subir o backend (ver backend/.env.example).'
    );
    process.exit(1);
  }
}

// A validação do JWT_SECRET NÃO fica aqui de propósito: ela vive em
// `services/auth.service.ts` (`assertJwtSecretIsSafe`), que roda no carregamento
// do módulo. Assim ela cobre TODA porta de entrada — API, jobs, seeds e scripts
// de backfill — e não só este servidor HTTP. Duplicar a checagem aqui só criaria
// dois lugares com o mesmo segredo literal para esquecer de atualizar.

import express from 'express';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/auth.routes';
import displaysRoutes from './routes/displays.routes';
import devicesRoutes from './routes/devices.routes';
import broadcastsRoutes from './routes/broadcasts.routes';
import usersRoutes from './routes/users.routes';
import mediaRoutes from './routes/media.routes';
import settingsRoutes from './routes/settings.routes';
import organizationsRoutes from './routes/organizations.routes';
import signupRoutes from './routes/signup.routes';
import plansRoutes from './routes/plans.routes';
import billingRoutes from './routes/billing.routes';
import uptimeRoutes from './routes/uptime.routes';
import checkoutRoutes from './routes/checkout.routes';
import checkoutAdminRoutes from './routes/checkout-admin.routes';
import { startCheckoutAbandonJob } from './jobs/checkout-abandon.job';
import { startEventDispatchJob } from './jobs/event-dispatch.job';
import { errorMiddleware } from './middlewares/error.middleware';
import { startDeviceHeartbeatAlertJob } from './jobs/device-heartbeat-alert.job';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Em produção o backend fica atrás de Nginx + Cloudflare Tunnel. Sem
// `trust proxy`, `req.ip` é o IP do proxy para TODA requisição — e aí o rate
// limit de login/signup vira um único contador global: não protege contra
// força bruta e derruba todos os usuários juntos ao estourar.
// `TRUST_PROXY` aceita um número de saltos (ex.: "1", "2"), "loopback", ou
// "false" para desligar. Ver DEPLOY.md antes de mudar.
const TRUST_PROXY = process.env.TRUST_PROXY;
if (TRUST_PROXY && TRUST_PROXY !== 'false') {
  const hops = Number(TRUST_PROXY);
  app.set('trust proxy', Number.isFinite(hops) && String(hops) === TRUST_PROXY ? hops : TRUST_PROXY);
} else if (process.env.NODE_ENV === 'production') {
  console.warn(
    '⚠️  TRUST_PROXY não configurado em produção. Atrás de Nginx/Cloudflare Tunnel, ' +
    'o rate limit de autenticação vai agrupar todos os visitantes no IP do proxy. ' +
    'Defina TRUST_PROXY (ver DEPLOY.md).'
  );
}

// CORS configurado para produção + desenvolvimento
// Padrões de desenvolvimento: 3000 = painel, 5173 = site de vendas,
// 3030 = app de checkout. Em produção, `CORS_ORIGINS` precisa listar as origens
// EXATAS de cada um desses três — a comparação abaixo é por igualdade, então
// esquecer uma delas faz aquele app parar de falar com a API.
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3030'];

if (process.env.NODE_ENV === 'production' && ALLOWED_ORIGINS.includes('*')) {
  console.warn(
    '⚠️  CORS_ORIGINS está como "*" em produção, e a API usa credentials. ' +
    'Liste as origens exatas do painel e do player (ex.: https://app.seudominio.com).'
  );
}

// A comparação é por IGUALDADE, não por prefixo. `origin.startsWith(allowed)`
// — como era antes — deixava `https://telahub.com.br.evil.com` casar com
// `https://telahub.com.br`: bastava registrar esse domínio para, com
// `credentials: true`, ler respostas autenticadas da API em nome do usuário.
const isAllowedOrigin = (origin: string): boolean =>
  ALLOWED_ORIGINS.some((allowed) => {
    if (allowed === '*') return true;
    // Normaliza barra final para evitar falso negativo bobo de configuração.
    return origin.replace(/\/$/, '') === allowed.replace(/\/$/, '');
  });

app.use(cors({
  origin: (origin, callback) => {
    // Requisição sem `Origin` (curl, app nativo, server-to-server) não é
    // navegador — CORS não se aplica e o token continua sendo a garantia.
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    callback(new Error('Origem não permitida pelo CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos de uploads (modo local/dev)
const uploadsPath = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1d',
  etag: true,
}));

// Servir ícones/assets do sistema (logo, etc.)
const iconsPath = path.resolve(__dirname, '../icones-do-sistema');
app.use('/assets/system', express.static(iconsPath, {
  maxAge: '7d',
  etag: true,
}));

// Rotas públicas de aquisição — precisam vir antes de qualquer guarda de
// autenticação/tenant: quem se cadastra ainda não tem conta nem organização.
app.use('/api/signup', signupRoutes);
app.use('/api/plans', plansRoutes);

// Funil de checkout. O painel vem antes por clareza de leitura — os caminhos não
// colidem. As rotas públicas de `/api/checkout` são anônimas de propósito: a
// sessão nasce antes de qualquer login, e é isso que torna abandono mensurável.
app.use('/api/checkout/admin', checkoutAdminRoutes);
app.use('/api/checkout', checkoutRoutes);

// Rotas
app.use('/api/auth', authRoutes);
// `billing.routes` autentica internamente (router.use(authMiddleware)).
app.use('/api/billing', billingRoutes);
app.use('/api/displays', displaysRoutes);
app.use('/api/devices', devicesRoutes);
// Disponibilidade das telas (MTTF/MTTR). O job de heartbeat já grava as
// transições — aqui só se expõe o cálculo.
app.use('/api/uptime', uptimeRoutes);
app.use('/api/broadcasts', broadcastsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/organizations', organizationsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorMiddleware);

// Start server (não sobe listener/job em testes — supertest usa o app diretamente)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend disponível em http://localhost:${PORT}`);
    console.log(`📁 Uploads servidos em http://localhost:${PORT}/uploads/`);
    console.log(`🔧 Modo R2: ${!!(process.env.R2_ENDPOINT) ? 'ATIVADO' : 'DESATIVADO (local)'}`);
  });

  startDeviceHeartbeatAlertJob();
  startCheckoutAbandonJob();
  // Entrega os eventos do checkout aos tratadores do domínio (padrão outbox).
  // ATENÇÃO ao escalar: o despachante assume UMA instância. Rodar duas exige um
  // passo de reserva (`updateMany` marcando o evento antes de executar), senão
  // o mesmo evento é processado em paralelo.
  startEventDispatchJob();
}

export default app;
