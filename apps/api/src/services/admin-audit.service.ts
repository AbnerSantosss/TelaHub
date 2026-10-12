import { Request } from 'express';

import { auditService } from './audit.service';

/**
 * Auditoria das ações do backoffice.
 *
 * POR QUE É UM SERVIÇO SEPARADO, e não uma chamada direta a `auditService`:
 *
 * 1. **O motivo é obrigatório.** Toda ação do `master` sobre a conta de um
 *    cliente — cancelar, trocar plano, estender ciclo, liberar recurso — é
 *    invisível para quem sofre o efeito e irreversível na percepção dele. Sem
 *    o "por quê" gravado no mesmo instante, seis meses depois ninguém explica
 *    por que aquele cliente está no Rede sem ter pago. O tipo abaixo torna
 *    impossível chamar sem motivo: não é convenção, é o compilador.
 *
 * 2. **A organização auditada é a do ALVO, não a do requisitante.** O `master`
 *    não tem `organizationId` (opera acima dos tenants), então
 *    `auditService.logFromRequest` — que preenche a partir de `req.tenantId` —
 *    gravaria `null` e a trilha do cliente ficaria vazia justamente nas ações
 *    mais graves que ele sofre.
 *
 * 3. **O prefixo `admin.` é a única forma de separar** o que a plataforma fez
 *    do que o próprio cliente fez, quando os dois aparecem na mesma trilha.
 */
export interface AdminActionEntry {
  /** Ação, SEM o prefixo: `subscription.cancel` vira `admin.subscription.cancel`. */
  action: string;
  /** Organização que SOFRE a ação. */
  organizationId: string;
  entityType: string;
  entityId?: string | null;
  /** Motivo escrito pelo operador. Obrigatório — ver o item 1 acima. */
  reason: string;
  /** Estado antes e depois, para a trilha responder "o que mudou" sem diff manual. */
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  /** Qualquer contexto extra da ação. */
  extra?: Record<string, unknown> | null;
}

export class AdminAuditService {
  /**
   * Registra uma ação administrativa.
   *
   * Herda de `auditService.log` a propriedade mais importante: **nunca lança**.
   * Uma falha ao auditar não pode desfazer uma operação já aplicada — o pior
   * resultado possível seria cancelar a assinatura e devolver erro 500, com o
   * operador repetindo a ação sobre um estado que já mudou.
   *
   * A consequência é aceita conscientemente: a auditoria é *best effort*. O que
   * a torna confiável na prática é o teste que percorre as rotas de escrita de
   * `/api/admin` e falha se alguma não chamar este método.
   */
  async log(req: Request, entry: AdminActionEntry): Promise<void> {
    await auditService.log({
      organizationId: entry.organizationId,
      userId: req.user?.id ?? null,
      userEmail: req.user?.email ?? null,
      action: `admin.${entry.action}`,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: {
        reason: entry.reason,
        ...(entry.before !== undefined ? { before: entry.before } : {}),
        ...(entry.after !== undefined ? { after: entry.after } : {}),
        ...(entry.extra ?? {}),
        // Quem operou fica no `userEmail` acima; repetido aqui porque a leitura
        // da trilha pelo cliente (feature `auditoria`) mostra o metadata e é
        // dele o direito de saber que a ação veio da plataforma, não de alguém
        // da própria equipe.
        performedBy: 'backoffice',
      },
    });
  }
}

export const adminAuditService = new AdminAuditService();
