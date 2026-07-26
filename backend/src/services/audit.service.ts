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
}

function safeStringify(value: Record<string, unknown>): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export const auditService = new AuditService();
