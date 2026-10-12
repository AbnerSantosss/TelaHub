/**
 * Papéis e permissões da conta do cliente — o mapa ÚNICO (2026-09-18).
 *
 * Até aqui a API tinha dois papéis de fato (`admin` e `user`) e a checagem era
 * espalhada: `adminMiddleware` em algumas rotas, nada em outras. Resultado: um
 * operador (`user`) conseguia cancelar a assinatura, convidar outra pessoa como
 * `admin` (ou `master`) e apagar telas — a interface escondia o botão, a API
 * não barrava. Ver Planejamento/Plano-Correcoes-2026-09-18.md §3.2.
 *
 * Regras que este arquivo sustenta:
 * - Toda rota de cliente declara UMA permissão via `requirePermission` (ver
 *   `middlewares/permission.middleware.ts`). O teste `rbac-matrix` percorre os
 *   routers e falha se alguma rota não declarar.
 * - O papel vem do BANCO (o `authMiddleware` o recarrega), nunca do corpo.
 * - `user` (papel antigo) é lido como `editor`. Sem reescrita em massa.
 * - Papel desconhecido vira `viewer`: na dúvida, o mínimo.
 * - `master` não é papel de organização: nas rotas de cliente ele age como
 *   administrador SÓ em modo suporte (org escolhida + motivo), o que é
 *   garantido pelo `requireTenant`, não aqui.
 *
 * Este arquivo é puro (sem Prisma, sem Express) para poder ser importado pelo
 * teste e, se um dia for preciso, copiado para o painel sem arrastar a API.
 */

// ─── Papéis ──────────────────────────────────────────────────────────────────

/** Papéis que uma pessoa pode ter DENTRO de uma organização. */
export const ORG_ROLES = ['admin', 'editor', 'viewer'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

/** Papel efetivo, já normalizado. `master` = dono da plataforma. */
export type Role = OrgRole | 'master';

/** Rótulos exibidos (PT-BR). O Titular é um admin com `isOwner`. */
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Leitor',
  master: 'Suporte TelaHub',
};
export const OWNER_LABEL = 'Titular';

/**
 * Normaliza o valor gravado em `User.role`.
 *
 * `user` é o papel antigo de "operador": na prática ele criava e editava telas,
 * que é exatamente o Editor. Ler assim (em vez de reescrever a coluna) mantém a
 * mudança reversível e não mexe em dado de cliente.
 */
export function normalizeRole(raw: string | null | undefined): Role {
  switch ((raw ?? '').trim().toLowerCase()) {
    case 'master':
      return 'master';
    case 'admin':
      return 'admin';
    case 'editor':
    case 'user':
      return 'editor';
    case 'viewer':
      return 'viewer';
    default:
      return 'viewer';
  }
}

export function isOrgRole(value: unknown): value is OrgRole {
  return typeof value === 'string' && (ORG_ROLES as readonly string[]).includes(value);
}

/**
 * Quem pode atribuir qual papel na equipe.
 *
 * - Só Titular e Administrador atribuem (é o `team:write`), e o master em modo
 *   suporte, que age como administrador.
 * - Nunca `master`: esse papel não existe dentro de uma organização.
 * - Nunca acima do próprio papel — como só admin atribui e admin é o topo da
 *   organização, isso se resume a `targetRole ∈ ORG_ROLES`.
 */
export function canAssignRole(actorRole: Role, targetRole: string): targetRole is OrgRole {
  if (!isOrgRole(targetRole)) return false;
  return actorRole === 'admin' || actorRole === 'master';
}

// ─── Permissões ──────────────────────────────────────────────────────────────

export const PERMISSIONS = [
  // Leitura (todos os papéis). No escopo `own`, Editor e Leitor veem só o que
  // criaram ou o que lhes foi atribuído.
  'display:read',
  'device:read',
  'broadcast:read',
  'media:read',
  'report:read',
  /** Plano, status e uso — SEM dados de pagamento. */
  'plan:read',

  // Conteúdo
  'display:write',
  'display:delete',
  'broadcast:write',
  'media:write',

  // TVs
  'device:link',
  'device:write',
  'device:delete',

  // Equipe e conta
  'team:read',
  'team:write',
  'audit:read',
  'org:write',
  'org:transfer',

  // Cobrança (valores, faturas, cancelar, reativar)
  'billing:read',
  'billing:write',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value);
}

const READ: Permission[] = [
  'display:read',
  'device:read',
  'broadcast:read',
  'media:read',
  'report:read',
  'plan:read',
];

const EDITOR: Permission[] = [
  ...READ,
  'display:write',
  'broadcast:write',
  'media:write',
  'device:link',
  'device:write',
  'team:read',
];

const ADMIN: Permission[] = [
  ...EDITOR,
  'display:delete',
  'device:delete',
  'team:write',
  'audit:read',
  'org:write',
  'billing:read',
  'billing:write',
];

/** Permissões por papel. O Titular recebe `org:transfer` além das de admin. */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  viewer: new Set(READ),
  editor: new Set(EDITOR),
  admin: new Set(ADMIN),
  // Master nas rotas de cliente = administrador em modo suporte. Nunca
  // transfere titularidade de conta alheia.
  master: new Set(ADMIN),
};

/**
 * Permissões que valem mesmo com `RBAC_MODE=log`. São as que protegem dinheiro
 * e quem manda na conta — observar antes de barrar não se aplica a elas.
 */
export const ALWAYS_ENFORCED: ReadonlySet<Permission> = new Set<Permission>([
  'team:write',
  'org:write',
  'org:transfer',
  'billing:read',
  'billing:write',
]);

export interface PermissionSubject {
  role: string | null | undefined;
  isOwner?: boolean | null;
}

export function permissionsFor(subject: PermissionSubject): Set<Permission> {
  const role = normalizeRole(subject.role);
  const set = new Set(ROLE_PERMISSIONS[role]);
  // Titular é sempre admin; um Titular gravado com outro papel (dado antigo ou
  // inconsistente) recebe o conjunto de admin mesmo assim.
  if (subject.isOwner && role !== 'master') {
    for (const p of ROLE_PERMISSIONS.admin) set.add(p);
    set.add('org:transfer');
  }
  return set;
}

export function can(subject: PermissionSubject, permission: Permission): boolean {
  return permissionsFor(subject).has(permission);
}

/** Lista ordenada, para `/auth/me`. */
export function listPermissions(subject: PermissionSubject): Permission[] {
  const set = permissionsFor(subject);
  return PERMISSIONS.filter((p) => set.has(p));
}

// ─── Escopo dos itens dentro da conta ────────────────────────────────────────

export type MemberScope = 'all' | 'own';

export function normalizeMemberScope(raw: string | null | undefined): MemberScope {
  return raw === 'own' ? 'own' : 'all';
}

/**
 * O que esta pessoa enxerga dentro da própria conta.
 *
 * - Titular, Administrador e master (suporte): sempre `all`.
 * - Editor e Leitor: seguem o `memberScope` da organização.
 *
 * `own` = só os itens criados por ela (`createdById`/`linkedById`) ou
 * atribuídos a ela. Item fora do escopo responde 404, como item de outra conta.
 */
export function itemScopeFor(
  subject: PermissionSubject,
  orgMemberScope: string | null | undefined,
): MemberScope {
  const role = normalizeRole(subject.role);
  if (role === 'admin' || role === 'master' || subject.isOwner) return 'all';
  return normalizeMemberScope(orgMemberScope);
}

// ─── Modo de aplicação ───────────────────────────────────────────────────────

export type RbacMode = 'enforce' | 'log';

/**
 * `enforce` (padrão): nega com 403 `permission_denied`.
 * `log`: registra a negação e deixa passar — para observar o primeiro deploy.
 * As permissões de `ALWAYS_ENFORCED` são negadas nos dois modos.
 */
export function rbacMode(env: NodeJS.ProcessEnv = process.env): RbacMode {
  return (env.RBAC_MODE ?? '').trim().toLowerCase() === 'log' ? 'log' : 'enforce';
}
