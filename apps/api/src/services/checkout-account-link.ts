import jwt from 'jsonwebtoken';

import prisma from '../lib/prisma';
import { can } from '../lib/permissions';
import { verifyToken } from './auth.service';

/**
 * Ligação entre uma sessão de checkout e uma conta que JÁ EXISTE.
 *
 * O checkout é público: quem digita um e-mail não prova que é dono dele. Até
 * 2026-10-19 o `paid.handler` tratava "pagou com o e-mail X" como "é o dono da
 * organização de X" e aplicava o plano (zerando `cancelAtPeriodEnd`) na conta
 * de outra pessoa. Agora a única prova aceita é um evento `account_linked`,
 * gravado quando a identificação chega com o token do painel de um usuário
 * daquele e-mail que pode mexer na cobrança (`billing:write`).
 *
 * Sem mudar o schema: a ligação mora em `CheckoutEvent` (tipo `account_linked`,
 * `dispatchStatus: 'skipped'`, porque não tem tratador).
 */
export const ACCOUNT_LINK_EVENT_TYPE = 'account_linked' as const;

export interface AccountLink {
  userId: string;
  organizationId: string;
  email: string;
}

export interface AuthenticatedBuyer {
  userId: string;
  email: string;
  organizationId: string | null;
  canManageBilling: boolean;
}

/**
 * Usuário dono do token do painel, revalidado no banco. Token ausente,
 * inválido, vencido, revogado (`sessionsValidAfter`) ou de usuário desativado
 * conta como visitante anônimo: o checkout não responde 401, ele só deixa de
 * reconhecer a conta.
 */
export async function resolveAuthenticatedBuyer(
  authToken: string | null | undefined
): Promise<AuthenticatedBuyer | null> {
  if (!authToken) return null;

  let userId: string;
  let issuedAtSec: number | null = null;
  try {
    userId = verifyToken(authToken).id;
    const decoded = jwt.decode(authToken) as { iat?: unknown } | null;
    issuedAtSec = typeof decoded?.iat === 'number' ? decoded.iat : null;
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      organizationId: true,
      disabledAt: true,
      sessionsValidAfter: true,
      ownedOrganization: { select: { id: true } },
    },
  });
  if (!user || user.disabledAt) return null;

  if (user.sessionsValidAfter) {
    const validAfterSec = Math.floor(user.sessionsValidAfter.getTime() / 1000);
    if (issuedAtSec === null || issuedAtSec < validAfterSec) return null;
  }

  const isOwner = !!user.organizationId && user.ownedOrganization?.id === user.organizationId;

  return {
    userId: user.id,
    email: user.email.toLowerCase(),
    organizationId: user.organizationId,
    canManageBilling: !!user.organizationId && can({ role: user.role, isOwner }, 'billing:write'),
  };
}

/** Última ligação gravada na sessão (a mais recente vale). */
export async function latestAccountLink(sessionId: string): Promise<AccountLink | null> {
  const event = await prisma.checkoutEvent.findFirst({
    where: { sessionId, type: ACCOUNT_LINK_EVENT_TYPE },
    orderBy: { createdAt: 'desc' },
    select: { metadata: true },
  });
  if (!event?.metadata) return null;

  try {
    const parsed = JSON.parse(event.metadata) as Partial<AccountLink>;
    if (
      typeof parsed.userId === 'string' &&
      typeof parsed.organizationId === 'string' &&
      typeof parsed.email === 'string'
    ) {
      return { userId: parsed.userId, organizationId: parsed.organizationId, email: parsed.email };
    }
  } catch {
    // Metadata corrompida não prova nada.
  }
  return null;
}

/**
 * Pode a confirmação de pagamento aplicar o plano na organização deste
 * usuário? Só se a sessão foi ligada a ESTE usuário e ESTA organização e se ele
 * ainda pode mexer na cobrança agora (papel ou titularidade podem ter mudado
 * entre a identificação e o pagamento).
 */
export async function isAuthorizedAccountLink(
  sessionId: string,
  existingUser: { id: string; organizationId: string | null }
): Promise<boolean> {
  if (!existingUser.organizationId) return false;

  const link = await latestAccountLink(sessionId);
  if (!link) return false;
  if (link.userId !== existingUser.id || link.organizationId !== existingUser.organizationId) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: existingUser.id },
    select: {
      role: true,
      organizationId: true,
      disabledAt: true,
      ownedOrganization: { select: { id: true } },
    },
  });
  if (!user || user.disabledAt || user.organizationId !== link.organizationId) return false;

  const isOwner = user.ownedOrganization?.id === user.organizationId;
  return can({ role: user.role, isOwner }, 'billing:write');
}
