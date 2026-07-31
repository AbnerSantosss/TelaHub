import prisma from '../../lib/prisma';
import { auditService } from '../audit.service';

/**
 * `entityType` usado por todo `AuditLog` gravado a partir de um evento do
 * checkout. Fixo de propósito: é ele, junto com `entityId = event.id`, que
 * forma a chave de idempotência da auditoria.
 */
export const CHECKOUT_EVENT_ENTITY_TYPE = 'checkout_event';

/**
 * `event.metadata` parseado. Nunca lança: metadado corrompido não pode derrubar
 * a entrega de um evento — o que importa está no evento e na sessão.
 */
export function parseMetadata(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Auditoria idempotente: grava o `AuditLog` apenas se ainda não existir um com
 * a mesma `action` para o mesmo `eventId`.
 *
 * É esta função que permite reprocessar um evento sem duplicar rastro. O
 * `AuditLog` não tem índice único (o schema é de outra frente e não pode ser
 * alterado aqui), então a garantia é por consulta prévia — suficiente para um
 * despachante de instância única, que é o desenho adotado.
 *
 * Devolve `true` quando gravou agora, `false` quando já existia.
 */
export async function auditOnce(params: {
  eventId: string;
  action: string;
  organizationId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<boolean> {
  const existing = await prisma.auditLog.findFirst({
    where: {
      action: params.action,
      entityType: CHECKOUT_EVENT_ENTITY_TYPE,
      entityId: params.eventId,
    },
    select: { id: true },
  });

  if (existing) return false;

  await auditService.log({
    organizationId: params.organizationId ?? null,
    action: params.action,
    entityType: CHECKOUT_EVENT_ENTITY_TYPE,
    entityId: params.eventId,
    metadata: params.metadata ?? null,
  });

  return true;
}
