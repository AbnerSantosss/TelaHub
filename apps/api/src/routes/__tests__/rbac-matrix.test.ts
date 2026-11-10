/**
 * Cobertura da matriz de papéis (RBAC) por varredura dos routers.
 *
 * Este teste existe para uma classe de falha que nenhuma revisão enxerga: rota
 * nova esquecida SEM guarda de permissão. Escrever a guarda depende de alguém
 * lembrar; este teste faz o contrário, e quem cria uma rota só passa no CI se
 * escolher, por escrito, uma de duas saídas:
 *
 *   - `requirePermission('...')` na cadeia da rota (a permissão vem de
 *     `lib/permissions.ts`); ou
 *   - `publicRoute('motivo')`, quando a rota é pública de propósito (login,
 *     cadastro, checkout, webhook, player da TV).
 *
 * ── Exceção declarada: backoffice do `master` ───────────────────────────────
 * O backoffice da plataforma não passa por papel de organização, e sim por
 * `masterMiddleware`, que é MAIS estrito que qualquer permissão da matriz (só o
 * dono da plataforma entra). Por isso ele não precisa de `requirePermission`,
 * mas a exceção é verificada em vez de presumida:
 *
 *   1. `/api/admin` e `/api/checkout/admin` têm a guarda aplicada UMA vez, na
 *      raiz do router (`authMiddleware` e depois `masterMiddleware`, antes de
 *      qualquer rota). O teste confere essa ordem; o que estiver sob esses
 *      routers fica coberto por ela.
 *   2. Nos demais routers, a rota que carrega `masterMiddleware` na própria
 *      cadeia (ex.: `POST /api/organizations`, `/api/settings/smtp`) conta como
 *      guardada. `adminMiddleware` SOZINHO não conta: ele aceita o admin de
 *      qualquer cliente e é justamente o caso que a matriz precisa cobrir.
 *
 * Nada aqui conecta ao banco: a varredura lê `router.stack` e as negações por
 * HTTP acontecem antes de qualquer consulta.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import app from '../../server';
import { adminMiddleware, authMiddleware, masterMiddleware } from '../../middlewares/auth.middleware';
import { requireTenant } from '../../middlewares/tenant.middleware';
import { requireActiveSubscription } from '../../middlewares/quota.middleware';
import { routeGuardOf } from '../../middlewares/permission.middleware';
import { permissionsFor, type Permission } from '../../lib/permissions';
import { authHeaderFor } from './tenant-helpers';

import adminRoutes from '../admin';
import aiRoutes from '../ai.routes';
import auditRoutes from '../audit.routes';
import authRoutes from '../auth.routes';
import billingRoutes from '../billing.routes';
import broadcastsRoutes from '../broadcasts.routes';
import checkoutAdminRoutes from '../checkout-admin.routes';
import checkoutRoutes from '../checkout.routes';
import devicesRoutes from '../devices.routes';
import displaysRoutes from '../displays.routes';
import emailPublicRoutes from '../email-public.routes';
import eventsRoutes from '../events.routes';
import leadsRoutes from '../leads.routes';
import mediaRoutes from '../media.routes';
import organizationsRoutes from '../organizations.routes';
import plansRoutes from '../plans.routes';
import proxyRoutes from '../proxy.routes';
import settingsRoutes from '../settings.routes';
import signupRoutes from '../signup.routes';
import uptimeRoutes from '../uptime.routes';
import usersRoutes from '../users.routes';
import webhooksRoutes from '../webhooks.routes';

// ─── Estrutura interna do Express 5 que a varredura lê ───────────────────────
// A `Layer` do Express 5 NÃO guarda o caminho em que o router foi montado, só o
// caminho da rota dentro dele. Por isso o prefixo vem da tabela MONTAGENS (e o
// primeiro teste garante que a tabela bate com o `server.ts`).

interface CamadaExpress {
  handle: unknown;
  route?: RotaExpress;
}
interface RotaExpress {
  path: unknown;
  methods: Record<string, boolean>;
  stack: CamadaExpress[];
}

function pilhaDe(router: unknown): CamadaExpress[] {
  const pilha = (router as { stack?: CamadaExpress[] } | undefined)?.stack;
  return Array.isArray(pilha) ? pilha : [];
}

// ─── Tabela de montagem (espelha as linhas `app.use('/api/...')` do server.ts) ─

interface Montagem {
  prefixo: string;
  router: unknown;
  /**
   * Backoffice do master: a guarda está na raiz do router, não em cada rota.
   * Ver a "Exceção declarada" no cabeçalho.
   */
  guardaMasterNaRaiz?: boolean;
}

const MONTAGENS: Montagem[] = [
  { prefixo: '/api/signup', router: signupRoutes },
  { prefixo: '/api/plans', router: plansRoutes },
  { prefixo: '/api/leads', router: leadsRoutes },
  { prefixo: '/api/events', router: eventsRoutes },
  { prefixo: '/api/email', router: emailPublicRoutes },
  { prefixo: '/api/webhooks', router: webhooksRoutes },
  { prefixo: '/api/checkout/admin', router: checkoutAdminRoutes, guardaMasterNaRaiz: true },
  { prefixo: '/api/checkout', router: checkoutRoutes },
  { prefixo: '/api/proxy', router: proxyRoutes },
  { prefixo: '/api/auth', router: authRoutes },
  { prefixo: '/api/billing', router: billingRoutes },
  { prefixo: '/api/displays', router: displaysRoutes },
  { prefixo: '/api/devices', router: devicesRoutes },
  { prefixo: '/api/uptime', router: uptimeRoutes },
  { prefixo: '/api/broadcasts', router: broadcastsRoutes },
  { prefixo: '/api/users', router: usersRoutes },
  { prefixo: '/api/media', router: mediaRoutes },
  { prefixo: '/api/settings', router: settingsRoutes },
  { prefixo: '/api/ai', router: aiRoutes },
  { prefixo: '/api/organizations', router: organizationsRoutes },
  { prefixo: '/api/audit-logs', router: auditRoutes },
  { prefixo: '/api/admin', router: adminRoutes, guardaMasterNaRaiz: true },
];

/**
 * Rotas registradas direto no `app` (fora de qualquer router). Hoje só o health
 * check do balanceador, que não devolve dado de cliente. Rota nova aqui precisa
 * entrar nesta lista de propósito.
 */
const ROTAS_DIRETAS_NO_APP = new Set(['GET /api/health']);

// ─── Coleta ──────────────────────────────────────────────────────────────────

type Classe = 'permissao' | 'publica' | 'master' | 'sem-guarda';

interface RotaColetada {
  /** `GET /api/displays/:id` */
  chave: string;
  metodo: string;
  caminho: string;
  classe: Classe;
  permissao?: Permission;
  motivoPublico?: string;
  handlers: unknown[];
}

function juntarCaminho(prefixo: string, caminho: unknown): string {
  const resto = String(caminho);
  return resto === '/' ? prefixo : `${prefixo}${resto}`;
}

function classificar(handlers: unknown[]): Pick<RotaColetada, 'classe' | 'permissao' | 'motivoPublico'> {
  const guardas = handlers.map((h) => routeGuardOf(h));
  const comPermissao = guardas.find((g) => g.permission);
  if (comPermissao) return { classe: 'permissao', permissao: comPermissao.permission };
  const publica = guardas.find((g) => g.publicReason);
  if (publica) return { classe: 'publica', motivoPublico: publica.publicReason };
  if (handlers.includes(masterMiddleware)) return { classe: 'master' };
  return { classe: 'sem-guarda' };
}

function coletarRotas(router: unknown, prefixo: string): RotaColetada[] {
  const rotas: RotaColetada[] = [];
  for (const camada of pilhaDe(router)) {
    if (camada.route) {
      const handlers = camada.route.stack.map((c) => c.handle);
      for (const metodo of Object.keys(camada.route.methods)) {
        const caminho = juntarCaminho(prefixo, camada.route.path);
        const nome = metodo.toUpperCase();
        rotas.push({ chave: `${nome} ${caminho}`, metodo: nome, caminho, handlers, ...classificar(handlers) });
      }
    } else if (pilhaDe(camada.handle).length > 0) {
      // Sub-router aninhado: o caminho de montagem dele não é legível, então o
      // prefixo fica marcado. Hoje nenhum router de cliente aninha outro.
      rotas.push(...coletarRotas(camada.handle, `${prefixo}/<sub-router>`));
    }
  }
  return rotas;
}

const montagensDeCliente = MONTAGENS.filter((m) => !m.guardaMasterNaRaiz);
const rotasDeCliente = montagensDeCliente.flatMap((m) => coletarRotas(m.router, m.prefixo));
const rotaPorChave = new Map(rotasDeCliente.map((r) => [r.chave, r]));

function rotaDe(chave: string): RotaColetada {
  const rota = rotaPorChave.get(chave);
  if (!rota) throw new Error(`Rota não encontrada na varredura: ${chave}`);
  return rota;
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('RBAC: a tabela de montagem bate com o server.ts', () => {
  const pilhaDoApp = pilhaDe(
    (app as unknown as { router?: unknown; _router?: unknown }).router ??
      (app as unknown as { _router?: unknown })._router,
  );

  it('todo router montado no app consta na tabela (nenhum fica sem varredura)', () => {
    const conhecidos = new Set(MONTAGENS.map((m) => m.router));
    const naoListados = pilhaDoApp
      .filter((c) => !c.route && pilhaDe(c.handle).length > 0)
      .filter((c) => !conhecidos.has(c.handle));

    expect(
      naoListados.length,
      'Há router montado no server.ts que não está em MONTAGENS: inclua-o para ele ser varrido.',
    ).toBe(0);
  });

  it('todo router da tabela está de fato montado no app (tabela sem entrada velha)', () => {
    const montados = new Set(pilhaDoApp.map((c) => c.handle));
    const orfaos = MONTAGENS.filter((m) => !montados.has(m.router)).map((m) => m.prefixo);

    expect(orfaos, `Entradas de MONTAGENS que o server.ts não monta: ${orfaos.join(', ')}`).toEqual([]);
  });

  it('rota registrada direto no app só existe se estiver na lista declarada', () => {
    const diretas = pilhaDoApp
      .filter((c) => c.route)
      .flatMap((c) => Object.keys(c.route!.methods).map((m) => `${m.toUpperCase()} ${String(c.route!.path)}`));
    const fora = diretas.filter((chave) => !ROTAS_DIRETAS_NO_APP.has(chave));

    expect(fora, `Rotas diretas no app sem declaração: ${fora.join(', ')}`).toEqual([]);
  });

  it('a varredura enxerga rotas em todo router de cliente (não passa em branco)', () => {
    // Se uma versão futura do Express mudar `router.stack`, a varredura voltaria
    // vazia e o teste de cobertura passaria sem verificar nada.
    for (const montagem of montagensDeCliente) {
      const quantas = coletarRotas(montagem.router, montagem.prefixo).length;
      expect(quantas, `Nenhuma rota lida em ${montagem.prefixo}`).toBeGreaterThan(0);
    }
  });
});

describe('RBAC: cobertura da matriz', () => {
  it('toda rota de cliente tem requirePermission ou publicRoute', () => {
    const semGuarda = rotasDeCliente.filter((r) => r.classe === 'sem-guarda').map((r) => r.chave);

    expect(
      semGuarda,
      `Rotas sem requirePermission e sem publicRoute (${semGuarda.length}):\n  ${semGuarda.join('\n  ')}`,
    ).toEqual([]);
  });

  it('só adminMiddleware não basta: rota com adminMiddleware também declara a permissão', () => {
    const soAdmin = rotasDeCliente
      .filter((r) => r.handlers.includes(adminMiddleware) && r.classe !== 'permissao')
      .map((r) => r.chave);

    expect(soAdmin, `Rotas com adminMiddleware sem requirePermission:\n  ${soAdmin.join('\n  ')}`).toEqual([]);
  });

  it('requirePermission vem logo depois de auth/tenant, antes de assinatura, quota e validação', () => {
    const fora: string[] = [];
    const permitidosAntes = new Set<unknown>([authMiddleware, requireTenant]);

    for (const rota of rotasDeCliente.filter((r) => r.classe === 'permissao')) {
      const posicao = rota.handlers.findIndex((h) => routeGuardOf(h).permission);
      const antes = rota.handlers.slice(0, posicao);
      if (antes.some((h) => !permitidosAntes.has(h))) fora.push(rota.chave);
      // Trava dupla para o caso que mais importa: nunca depois da assinatura.
      const assinatura = rota.handlers.indexOf(requireActiveSubscription);
      if (assinatura !== -1 && assinatura < posicao) fora.push(`${rota.chave} (depois de requireActiveSubscription)`);
    }

    expect(fora, `requirePermission fora da posição esperada:\n  ${fora.join('\n  ')}`).toEqual([]);
  });

  it('rota pública sempre carrega o motivo escrito', () => {
    const semMotivo = rotasDeCliente
      .filter((r) => r.classe === 'publica' && !(r.motivoPublico && r.motivoPublico.trim().length >= 5))
      .map((r) => r.chave);

    expect(semMotivo).toEqual([]);
  });
});

describe('RBAC: backoffice do master (exceção declarada)', () => {
  for (const montagem of MONTAGENS.filter((m) => m.guardaMasterNaRaiz)) {
    it(`${montagem.prefixo}: authMiddleware e masterMiddleware são as primeiras camadas do router`, () => {
      const pilha = pilhaDe(montagem.router);

      expect(pilha[0]?.handle).toBe(authMiddleware);
      expect(pilha[1]?.handle).toBe(masterMiddleware);
    });
  }

  it('rota fora do backoffice só conta como master se tiver masterMiddleware na cadeia', () => {
    const masters = rotasDeCliente.filter((r) => r.classe === 'master');

    // Lista conhecida hoje; mudou? confira se a rota nova devia ser da matriz.
    expect(masters.map((r) => r.chave).sort()).toEqual(
      [
        'GET /api/leads/pendentes',
        'GET /api/settings/smtp',
        'GET /api/settings/smtp/providers',
        'POST /api/organizations',
        'POST /api/settings/smtp',
        'POST /api/settings/smtp/test',
        'PUT /api/users/me/email',
      ].sort(),
    );
  });
});

describe('RBAC: permissão de cada rota sensível', () => {
  const ESPERADAS: Record<string, Permission> = {
    'GET /api/displays': 'display:read',
    'GET /api/displays/:id': 'display:read',
    'POST /api/displays': 'display:write',
    'DELETE /api/displays/:id': 'display:delete',
    'GET /api/devices': 'device:read',
    'POST /api/devices/link': 'device:link',
    'PATCH /api/devices/:id/display': 'device:write',
    'DELETE /api/devices/:id': 'device:delete',
    'GET /api/broadcasts': 'broadcast:read',
    'POST /api/broadcasts': 'broadcast:write',
    'GET /api/media': 'media:read',
    'POST /api/media/upload': 'media:write',
    'GET /api/uptime/summary': 'report:read',
    'GET /api/users': 'team:read',
    'POST /api/users/invite': 'team:write',
    'DELETE /api/users/:id': 'team:write',
    'GET /api/audit-logs': 'audit:read',
    'GET /api/billing/subscription': 'plan:read',
    'POST /api/billing/cancel': 'billing:write',
    'POST /api/billing/plan': 'billing:write',
  };

  for (const [chave, permissao] of Object.entries(ESPERADAS)) {
    it(`${chave} exige ${permissao}`, () => {
      expect(rotaDe(chave).permissao).toBe(permissao);
    });
  }
});

describe('RBAC: o que cada papel alcança', () => {
  const editor = permissionsFor({ role: 'user' });
  const leitor = permissionsFor({ role: 'viewer' });

  it('o Editor (papel antigo "user") continua criando telas, agenda, mídia e pareando TV', () => {
    for (const chave of [
      'POST /api/displays',
      'POST /api/broadcasts',
      'POST /api/media/upload',
      'POST /api/devices/link',
      'PATCH /api/devices/:id/display',
    ]) {
      expect(editor.has(rotaDe(chave).permissao!), chave).toBe(true);
    }
  });

  it('apagar tela e TV é só do Administrador: o Editor não alcança', () => {
    for (const chave of ['DELETE /api/displays/:id', 'DELETE /api/devices/:id']) {
      expect(editor.has(rotaDe(chave).permissao!), chave).toBe(false);
    }
  });

  it('o Leitor não alcança nenhuma rota de escrita', () => {
    const escritas = rotasDeCliente.filter(
      (r) => r.classe === 'permissao' && /(:write|:delete|:link)$/.test(r.permissao!),
    );

    expect(escritas.length).toBeGreaterThan(0);
    for (const rota of escritas) {
      expect(leitor.has(rota.permissao!), rota.chave).toBe(false);
    }
  });

  it('as leituras que o painel faz logo após o login não dão 403 ao Leitor', () => {
    // `GET /api/users` fica de fora de propósito: a matriz o põe em `team:read`
    // (Editor para cima), e o painel trata o 403 como lista vazia.
    for (const chave of [
      'GET /api/auth/me',
      'GET /api/displays',
      'GET /api/devices',
      'GET /api/organizations',
      'GET /api/billing/subscription',
      'GET /api/settings/smtp/status',
    ]) {
      const rota = rotaDe(chave);
      const alcanca = rota.classe === 'publica' || leitor.has(rota.permissao!);
      expect(alcanca, chave).toBe(true);
    }
  });
});

describe('RBAC: negação por HTTP (antes de qualquer consulta ao banco)', () => {
  beforeAll(() => {
    // Se o ambiente estiver em modo `log`, a negação vira só aviso.
    vi.stubEnv('RBAC_MODE', 'enforce');
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  const comoLeitor = authHeaderFor({ organizationId: 'org-rbac', role: 'viewer', id: 'u-leitor', email: 'leitor@example.com' });
  const comoEditor = authHeaderFor({ organizationId: 'org-rbac', role: 'user', id: 'u-editor', email: 'editor@example.com' });

  it('Leitor recebe 403 permission_denied ao criar tela, antes da checagem de assinatura', async () => {
    const res = await request(app).post('/api/displays').set('Authorization', comoLeitor).send({});

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('permission_denied');
    expect(res.body.permission).toBe('display:write');
  });

  it('Leitor recebe 403 ao parear TV e ao subir mídia', async () => {
    const link = await request(app).post('/api/devices/link').set('Authorization', comoLeitor).send({});
    const upload = await request(app).post('/api/media/upload').set('Authorization', comoLeitor);

    expect(link.status).toBe(403);
    expect(link.body.permission).toBe('device:link');
    expect(upload.status).toBe(403);
    expect(upload.body.permission).toBe('media:write');
  });

  it('Editor recebe 403 ao apagar tela e TV', async () => {
    const tela = await request(app).delete('/api/displays/qualquer-id').set('Authorization', comoEditor);
    const tv = await request(app).delete('/api/devices/qualquer-id').set('Authorization', comoEditor);

    expect(tela.status).toBe(403);
    expect(tela.body.permission).toBe('display:delete');
    expect(tv.status).toBe(403);
    expect(tv.body.permission).toBe('device:delete');
  });

  it('Editor recebe 403 no que é de gestão: cobrança, auditoria e plano', async () => {
    const cancelar = await request(app).post('/api/billing/cancel').set('Authorization', comoEditor).send({});
    const auditoria = await request(app).get('/api/audit-logs').set('Authorization', comoEditor);

    expect(cancelar.status).toBe(403);
    expect(cancelar.body.permission).toBe('billing:write');
    expect(auditoria.status).toBe(403);
    expect(auditoria.body.permission).toBe('audit:read');
  });

  it('Leitor recebe 403 ao ler a equipe', async () => {
    const res = await request(app).get('/api/users').set('Authorization', comoLeitor);

    expect(res.status).toBe(403);
    expect(res.body.permission).toBe('team:read');
  });
});
