import { Request } from 'express';
import prisma from '../lib/prisma';

export interface AuditEntry {
  organizationId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export class AuditService {
  /**
   * Grava uma entrada de auditoria.
   *
   * À prova de falha: NUNCA lança. Um erro ao auditar (banco fora, FK inválida,
   * organização inexistente) apenas é logado — a requisição do usuário segue.
   */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: entry.organizationId ?? null,
          userId: entry.userId ?? null,
          userEmail: entry.userEmail ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          metadata: entry.metadata ? safeStringify(entry.metadata) : null,
        },
      });
    } catch (err) {
      console.error(`[audit] falha ao registrar "${entry.action}":`, err);
    }
  }

  /**
   * Açúcar sintático para rotas: preenche organização/usuário a partir da
   * requisição autenticada.
   */
  async logFromRequest(
    req: Request,
    entry: Omit<AuditEntry, 'organizationId' | 'userId' | 'userEmail'> & { organizationId?: string | null }
  ): Promise<void> {
    return this.log({
      ...entry,
      organizationId: entry.organizationId !== undefined ? entry.organizationId : req.tenantId ?? null,
      userId: req.user?.id ?? null,
      userEmail: req.user?.email ?? null,
    });
  }

  /**
   * Lista a trilha de auditoria de UMA organização, da mais recente para a mais
   * antiga.
   *
   * `organizationId` é obrigatório e sempre vem do tenant da requisição, nunca
   * da query: trilha de auditoria é o tipo de dado em que um vazamento entre
   * clientes é mais grave que a média — ela contém e-mail de usuário e nome de
   * entidade de quem operou.
   */
  async listByOrganization(
    organizationId: string,
    options: { limit?: number; before?: Date } = {}
  ): Promise<AuditLogEntry[]> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);

    const rows = await prisma.auditLog.findMany({
      where: {
        organizationId,
        ...(options.before ? { createdAt: { lt: options.before } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      userEmail: row.userEmail,
      metadata: parseMetadata(row.metadata),
      createdAt: row.createdAt.toISOString(),
    }));
  }
}

/** Uma entrada da trilha, no formato que a API devolve. */
export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userEmail: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/** `metadata` é JSON livre gravado como texto — parse defensivo na leitura. */
function parseMetadata(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function safeStringify(value: Record<string, unknown>): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export const auditService = new AuditService();
