import type { CheckoutEvent, CheckoutSession } from '@prisma/client';

import { submitHandler } from './submit.handler';
import { paidHandler } from './paid.handler';
import { abandonedHandler } from './abandoned.handler';

/**
 * ─── Tratadores de evento do checkout (lado consumidor do outbox) ────────────
 *
 * O checkout GRAVA `CheckoutEvent` na mesma transação da mudança de estado; ele
 * não chama ninguém. Quem reage são os tratadores registrados aqui, chamados
 * pelo `event-dispatcher.service`. Somar um consumidor novo é acrescentar uma
 * linha neste registro — não mexe em quem produz.
 *
 * ⚠️ IDEMPOTÊNCIA É OBRIGATÓRIA — NÃO NEGOCIÁVEL.
 *
 * O despachante entrega *pelo menos uma vez*, nunca *exatamente uma vez*. Entre
 * "executei o tratador" e "marquei o evento como entregue" existe uma janela
 * real (o processo pode morrer, o banco pode cair, o lote pode ser reprocessado
 * depois de uma falha parcial de OUTRO tratador do mesmo evento). Portanto:
 *
 *   - todo tratador precisa poder rodar 2, 3, N vezes sobre o mesmo
 *     `CheckoutEvent` sem duplicar efeito;
 *   - o padrão adotado aqui é *verificar antes de criar*: `auditOnce()` procura
 *     o `AuditLog` daquele `eventId` antes de gravar; o tratador de `paid`
 *     verifica se a organização/usuário/assinatura já existem antes de criar;
 *   - efeito colateral irreversível e não verificável (ex.: disparar cobrança)
 *     NÃO pode entrar num tratador sem uma chave de idempotência própria;
 *   - envio de e-mail é feito de forma NÃO BLOQUEANTE e explicitamente aceito
 *     como "pode duplicar em caso de retentativa" — e-mail repetido é ruído,
 *     assinatura repetida é prejuízo.
 *
 * Um tratador que lança é isolado: o despachante registra o erro, segue para os
 * demais tratadores do mesmo evento e agenda a retentativa do evento inteiro
 * (por isso a exigência acima vale mesmo para o tratador que já tinha
 * funcionado).
 */

/** Tudo que um tratador recebe. `session` vem carregada junto com o evento. */
export interface CheckoutEventContext {
  event: CheckoutEvent;
  session: CheckoutSession;
  /** `event.metadata` já parseado. `{}` quando nulo ou inválido. */
  metadata: Record<string, unknown>;
  /** Instante lógico do despacho — injetável para teste. */
  now: Date;
}

export interface CheckoutEventHandler {
  /** Nome curto, usado no log estruturado e no relatório de erro. */
  name: string;
  handle(context: CheckoutEventContext): Promise<void>;
}

/**
 * Registro tipo → tratadores. Um tipo pode ter vários; a ordem do array é a
 * ordem de execução, mas nenhum tratador pode DEPENDER de outro ter rodado —
 * eles são independentes por contrato (um pode falhar isoladamente).
 *
 * Tipo sem entrada aqui não é erro: o evento vira `skipped`. Os tipos de
 * telemetria pura (`view`, `plan_selected`, `screens_changed`, `identify`,
 * `payment_selected`, `recovered`, `recovery_notified`) existem para o
 * relatório do funil e hoje ninguém escuta.
 */
export const checkoutEventHandlers: Readonly<Record<string, CheckoutEventHandler[]>> = {
  submit: [submitHandler],
  paid: [paidHandler],
  abandoned: [abandonedHandler],
};

/** Tratadores de um tipo. Array vazio quando ninguém escuta (→ `skipped`). */
export function getHandlersFor(type: string): CheckoutEventHandler[] {
  return checkoutEventHandlers[type] ?? [];
}

export { auditOnce, parseMetadata } from './shared';
