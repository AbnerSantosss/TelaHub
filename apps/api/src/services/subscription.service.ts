import prisma from '../lib/prisma';
import type { Plan, Prisma, Subscription, SubscriptionOverride } from '@prisma/client';
import { cancelSubscription as cancelAsaasSubscription } from './asaas.provider';
import { FEATURE_QUOTE_ONLY, parseFeatures, planService } from './plan.service';

/**
 * Duração de um período de avaliação, em dias.
 *
 * A entrada padrão do produto NÃO é mais trial (é freemium — ver
 * `FREE_PLAN_CODE`), mas o suporte a `trialing`/`trialEndsAt` continua vivo no
 * schema e neste serviço para um trial promocional futuro (ex.: 14 dias de
 * `rede` liberados numa campanha).
 */
export const TRIAL_DAYS = 14;

/**
 * Código do plano criado no auto-cadastro: freemium, 1 tela grátis para sempre,
 * sem prazo e sem cartão. Precisa existir no banco (`npm run db:seed-plans`).
 */
export const FREE_PLAN_CODE = 'gratis';

/**
 * @deprecated O plano `trial` de 14 dias foi descontinuado em 2026-07-25 e o
 * seed o marca `active: false`, remanejando as assinaturas para `gratis`.
 * Mantido apenas para código legado/migração se referir ao code antigo.
 */
export const LEGACY_TRIAL_PLAN_CODE = 'trial';

/**
 * Planos pagos oferecidos como upgrade a quem estourou o plano grátis, na ordem
 * do catálogo. Usado por `suggestUpgradeFor()`.
 */
export const UPGRADE_PLAN_CODES = ['loja', 'rede'] as const;

/**
 * Erro de quem tenta subir de plano sem passar pelo pagamento.
 *
 * Existia um buraco aqui: `POST /api/billing/plan` gravava o novo `planId`
 * direto no banco, então qualquer admin de tenant se colocava no plano Rede de
 * graça — entregando exatamente o que deveria ser cobrado. Descer de plano e
 * cancelar seguem livres (o cliente não fica refém), mas subir passa pelo
 * checkout.
 */
export class PlanUpgradeRequiresPaymentError extends Error {
  readonly code = 'payment_required';
  constructor(planName: string) {
    super(
      `Mudar para o plano ${planName} exige pagamento confirmado. ` +
        'Finalize a contratação pelo checkout.'
    );
    this.name = 'PlanUpgradeRequiresPaymentError';
  }
}

/** Tentativa de reativar uma assinatura que já terminou — a rota traduz para 409. */
export class SubscriptionReactivationError extends Error {
  readonly code = 'subscription_ended';
  constructor(message: string) {
    super(message);
    this.name = 'SubscriptionReactivationError';
  }
}

/**
 * Cancela a recorrência no gateway, quando existe uma.
 *
 * Devolve `null` quando não havia nada a cancelar lá fora (conta simulada,
 * plano grátis, assinatura criada antes do gateway existir), `true`/`false`
 * quando houve tentativa. Nunca lança: ver `scheduleCancel`.
 */
async function cancelAtGateway(subscription: {
  gateway: string | null;
  gatewaySubscriptionId: string | null;
}): Promise<boolean | null> {
  if (subscription.gateway !== 'asaas' || !subscription.gatewaySubscriptionId) return null;
  return cancelAsaasSubscription(subscription.gatewaySubscriptionId);
}

export interface ChangePlanOptions {
  /**
   * Só o fluxo de pagamento confirmado (webhook/provisionamento) passa `true`.
   * Nenhuma rota exposta ao cliente deve setar isto.
   */
  paymentConfirmed?: boolean;
}

/**
 * `true` quando o plano de destino entrega mais que o atual — e portanto é uma
 * compra, não um ajuste.
 *
 * Comparar só o preço por tela não serve: o Rede custa R$ 39/tela contra
 * R$ 49 do Loja, mas tem piso de 5 telas e limites maiores, então "mais barato
 * por tela" seria lido como downgrade e liberaria o Rede de graça. Por isso a
 * checagem olha três coisas: a fatura estimada para o uso atual, os limites e
 * as features.
 */
export function isPlanUpgrade(current: Plan, target: Plan, activeDevices: number): boolean {
  // ⚠️ A comparação é SEMPRE na base MENSAL — nada de `interval` aqui, e isso
  // não é esquecimento. Intervalo de cobrança é FORMA DE PAGAMENTO, não degrau
  // de plano: quem sai do mensal para o anual no mesmo plano não ganha nenhum
  // recurso novo, ele só paga mais barato adiantado. Se o intervalo entrasse
  // nesta conta, migrar para o anual (mais barato por mês) seria lido como
  // downgrade e migrar de volta para o mensal viraria "upgrade" bloqueado por
  // `PlanUpgradeRequiresPaymentError` — exatamente o oposto do que se quer.
  if (estimateMonthlyCents(target, activeDevices) > estimateMonthlyCents(current, activeDevices)) {
    return true;
  }

  // `null` = ilimitado, então vence qualquer número.
  const limitRelaxed = (currentLimit: number | null, targetLimit: number | null): boolean => {
    if (targetLimit === null) return currentLimit !== null;
    if (currentLimit === null) return false;
    return targetLimit > currentLimit;
  };

  if (
    limitRelaxed(current.maxDevices, target.maxDevices) ||
    limitRelaxed(current.maxUsers, target.maxUsers) ||
    limitRelaxed(current.maxOrganizations, target.maxOrganizations)
  ) {
    return true;
  }

  const currentFeatures = new Set(parseFeatures(current.features));
  return parseFeatures(target.features).some(
    (feature) => feature !== FEATURE_QUOTE_ONLY && !currentFeatures.has(feature)
  );
}

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

/**
 * A assinatura com o plano E a concessão manual, quando existir.
 *
 * O `override` entra AQUI, no tipo que todo mundo já usa, em vez de virar uma
 * busca extra em cada rota que checa recurso. O motivo é uma falha real: com
 * `getByOrganization` trazendo só o plano, `hasFeature` e
 * `resolveVideoEntitlement` — que já sabem ler concessão — recebiam um objeto
 * onde ela nunca estava, e liberar Power BI para um cliente pelo backoffice não
 * desbloqueava a publicação do widget. O gate dizia "não" para uma permissão
 * que o banco dizia "sim".
 *
 * Falha silenciosa, e da pior espécie: quem concede vê a tela confirmar, o
 * cliente continua barrado, e não há erro em lugar nenhum para investigar.
 */
export type SubscriptionWithPlan = Subscription & {
  plan: Plan;
  override?: SubscriptionOverride | null;
};

/** Recursos sujeitos a quota. */
export type QuotaResource = 'device' | 'user' | 'organization';

export interface UsageEntry {
  used: number;
  /** `null` = ilimitado. */
  limit: number | null;
  /** `true` quando `limit` não é nulo e `used >= limit`. */
  atLimit: boolean;
}

export interface Usage {
  organizationId: string;
  planCode: string;
  planName: string;
  /** Preço por tela/mês do plano contratado, em centavos (0 = grátis/consulta). */
  pricePerScreenCents: number;
  /** Piso de telas cobradas no plano contratado. */
  minScreens: number;
  /** `true` quando o plano não gera fatura (plano `gratis`). */
  freePlan: boolean;
  devices: UsageEntry;
  users: UsageEntry;
  organizations: UsageEntry;
}

function entry(used: number, limit: number | null): UsageEntry {
  return { used, limit, atLimit: limit !== null && used >= limit };
}

/**
 * Data em que um trial promocional expira, contada a partir de `from`.
 * Não é usada no fluxo padrão de cadastro (que é freemium, sem prazo).
 */
export function trialEndDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

/** `true` quando o plano não gera fatura (plano grátis). */
export function isFreePlan(
  plan: { pricePerScreenCents: number; features?: string | null } | null | undefined
): boolean {
  if (!plan) return false;
  return plan.pricePerScreenCents === 0 && !parseFeatures(plan.features ?? null).includes(FEATURE_QUOTE_ONLY);
}

/** Como a assinatura é paga. Não confundir com o PLANO contratado. */
export type BillingInterval = 'monthly' | 'yearly';

/** Plano no mínimo necessário para calcular fatura. */
export interface PricedPlan {
  pricePerScreenCents: number;
  /**
   * Opcional de propósito: dezenas de chamadores montam objetos de plano
   * parciais (rotas, testes, fixtures). Ausente = plano sem oferta anual.
   */
  priceAnnualPerScreenCents?: number | null;
  minScreens: number;
  features?: string | null;
}

/**
 * Preço por tela/mês a aplicar, dado o intervalo escolhido. Função pura.
 *
 * O anual só vale quando o plano TEM oferta anual (`> 0`). Um plano sem oferta
 * (grátis, Enterprise, ou qualquer linha antiga do banco anterior à migração)
 * cai no mensal em vez de virar R$ 0,00 — cobrar zero por engano é pior que
 * cobrar o preço de tabela, e é o erro que um `?? 0` silencioso produziria.
 */
export function unitPriceCents(plan: PricedPlan, interval: BillingInterval): number {
  const annual = plan.priceAnnualPerScreenCents ?? 0;
  if (interval === 'yearly' && annual > 0) return annual;
  return plan.pricePerScreenCents;
}

/**
 * Valor mensal previsto da assinatura, em centavos. Função pura.
 *
 *   max(telas ativas, plan.minScreens) × preço unitário do intervalo
 *
 * O piso `minScreens` existe porque o plano `rede` troca preço por tela mais
 * baixo por um compromisso mínimo de 5 telas — com 3 telas ativas, a fatura
 * ainda é de 5. Devolve `0` para plano grátis e para plano sob consulta
 * (Enterprise), onde `pricePerScreenCents = 0` não significa gratuito.
 *
 * `interval` é OPCIONAL com default `'monthly'`: a função já era chamada de
 * meia dúzia de lugares (billing, checkout, sugestão de upgrade, gate de
 * troca de plano) e o mensal continua sendo a resposta certa para todos eles.
 * Torná-lo obrigatório trocaria uma adição de recurso por uma refatoração de
 * risco em cima do cálculo de fatura.
 *
 * No anual o retorno continua sendo o valor MENSAL EQUIVALENTE (o que o cliente
 * compara com o mensal), não o boleto do ano — esse é `estimateAnnualTotalCents`.
 */
export function estimateMonthlyCents(
  plan: PricedPlan,
  activeDevices: number,
  interval: BillingInterval = 'monthly'
): number {
  const features = parseFeatures(plan.features ?? null);
  if (features.includes(FEATURE_QUOTE_ONLY)) return 0;

  const unit = unitPriceCents(plan, interval);
  if (unit <= 0) return 0;

  const billedScreens = Math.max(activeDevices, plan.minScreens, 0);
  return billedScreens * unit;
}

/**
 * Total do ANO no pagamento anual, em centavos: o mensal-equivalente × 12.
 *
 * É este número que vai no contrato ("R$ 468/ano por tela"), enquanto a vitrine
 * mostra o mensal-equivalente. Manter a derivação num lugar só evita a
 * divergência clássica de arredondar o mensal e multiplicar por 12 em outra
 * superfície.
 */
export function estimateAnnualTotalCents(plan: PricedPlan, activeDevices: number): number {
  return estimateMonthlyCents(plan, activeDevices, 'yearly') * MONTHS_PER_YEAR;
}

/** Meses cobertos por um ciclo de cobrança. */
export const MONTHS_PER_YEAR = 12;

export function cycleMonths(interval: BillingInterval): number {
  return interval === 'yearly' ? MONTHS_PER_YEAR : 1;
}

/**
 * O CAIXA de um ciclo, em centavos: o que o gateway efetivamente cobra de uma
 * vez. Função pura.
 *
 * ⚠️ ESTE É O DEFEITO US-A-05, e o motivo de existirem dois nomes parecidos:
 *
 *   `estimateMonthlyCents`  → mensal EQUIVALENTE (o número da vitrine, o que se
 *                             compara entre planos e intervalos);
 *   `estimateCycleCents`    → o que entra na conta bancária no ciclo (no anual,
 *                             os 12 meses juntos).
 *
 * `CheckoutSession.amountCents` guarda o PRIMEIRO; `Payment.amountCents` guarda
 * o SEGUNDO. Copiar um no outro é o defeito: numa sessão anual isso cobraria
 * 1/12 do combinado (ou, na direção contrária, mostraria na vitrine um preço 12
 * vezes maior). Toda conversão entre os dois passa por aqui.
 */
export function estimateCycleCents(
  plan: PricedPlan,
  activeDevices: number,
  interval: BillingInterval
): number {
  return estimateMonthlyCents(plan, activeDevices, interval) * cycleMonths(interval);
}

/**
 * Mesma conversão, mas a partir de um valor MENSAL EQUIVALENTE já congelado.
 *
 * Existe separada de `estimateCycleCents` porque o checkout congela o preço no
 * momento do passo (`CheckoutSession.amountCents`): recalcular pelo catálogo na
 * hora de provisionar cobraria o preço de HOJE de quem viu o de ontem, que é
 * exatamente o que congelar o valor foi feito para evitar.
 */
export function cycleCentsFromMonthly(
  monthlyEquivalentCents: number,
  interval: BillingInterval
): number {
  return monthlyEquivalentCents * cycleMonths(interval);
}

/**
 * Fim do período a partir de `from`, respeitando o intervalo. Função pura.
 *
 * O ajuste final não é firula: `new Date(2026, 0, 31).setMonth(+1)` devolve 3 de
 * MARÇO, porque o JS transborda em vez de saturar. Sem o clamp, quem assina no
 * dia 31 pula fevereiro inteiro e ganha um mês de graça todo ano.
 */
export function addBillingInterval(from: Date, interval: BillingInterval): Date {
  const result = new Date(from.getTime());
  const day = result.getUTCDate();

  if (interval === 'yearly') {
    result.setUTCFullYear(result.getUTCFullYear() + 1);
  } else {
    result.setUTCMonth(result.getUTCMonth() + 1);
  }

  // Transbordou (31/01 → 03/03): volta para o último dia do mês pretendido.
  if (result.getUTCDate() < day) {
    result.setUTCDate(0);
  }

  return result;
}

/**
 * Dias de carência entre "a cobrança falhou" e "o acesso é suspenso".
 *
 * ⚠️ ESTE NÚMERO ESPELHA O ITEM 9 DOS TERMOS DE USO (`/termos`, vigência
 * 2026-09-05), que promete 10 dias. MUDAR AQUI EXIGE MUDAR O TEXTO PUBLICADO
 * JUNTO — e vice-versa. Um termo prometendo 10 com código cortando em 7
 * suspende o acesso de um cliente três dias antes do contratado; é promessa
 * pública sem lastro no código, a classe de defeito que este projeto já repetiu
 * várias vezes. Na dúvida, o lado seguro é a carência MAIOR: nunca cortar antes
 * do prometido.
 *
 * O prazo generoso também é decisão comercial: a causa mais comum de `past_due`
 * é boba e temporária (limite do cartão, Pix não pago na sexta, cartão vencido),
 * e derrubar a TV de uma loja no primeiro dia de atraso resolve a inadimplência
 * criando um cancelamento. A conta segue funcionando durante a carência;
 * `pastDueSince` é o relógio.
 */
export const PAST_DUE_GRACE_DAYS = 10;

/** Instante em que a carência termina. Função pura. */
export function graceEndsAt(pastDueSince: Date): Date {
  return new Date(pastDueSince.getTime() + PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * `true` quando a carência de inadimplência já venceu. Função pura.
 *
 * ⚠️ É DE PROPÓSITO uma função pura, e não um `setTimeout` agendado no momento
 * em que o webhook chega: um temporizador na memória morre no primeiro deploy
 * (que acontece toda semana) e a assinatura ficaria `past_due` para sempre,
 * dando acesso de graça a quem não pagou. Quem chama isto é um job periódico
 * (`runBillingMaintenance`), que sobrevive a reinício porque relê o banco.
 */
export function isPastDueGraceExpired(
  pastDueSince: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!pastDueSince) return false;
  return graceEndsAt(pastDueSince).getTime() <= now.getTime();
}

/**
 * `true` quando um cancelamento agendado já pode virar `canceled` de fato.
 *
 * Sem `currentPeriodEnd` a resposta é NÃO: na dúvida o cliente continua com o
 * acesso que pagou (CDC art. 51, IV). Cortar por falta de dado é o erro caro.
 */
export function isScheduledCancelDue(
  subscription: { cancelAtPeriodEnd: boolean; currentPeriodEnd: Date | null; status: string },
  now: Date = new Date()
): boolean {
  if (!subscription.cancelAtPeriodEnd) return false;
  if (subscription.status === 'canceled') return false;
  if (!subscription.currentPeriodEnd) return false;
  return subscription.currentPeriodEnd.getTime() <= now.getTime();
}

/** Quantas telas entram na fatura (piso de `minScreens`). Função pura. */
export function billedScreens(plan: { minScreens: number }, activeDevices: number): number {
  return Math.max(activeDevices, plan.minScreens, 0);
}

/**
 * Uma assinatura é válida quando está `active`, ou `trialing` dentro do prazo.
 * `past_due`, `canceled` e trial vencido são inválidos.
 *
 * No mundo freemium, a assinatura do plano `gratis` nasce `active` com
 * `trialEndsAt: null` e portanto NUNCA expira — não existe mais "trial vencido"
 * no caminho padrão. O ramo `trialing` sobrevive apenas para trials
 * promocionais (ver `TRIAL_DAYS`).
 */
export function isActive(
  subscription: { status: string; trialEndsAt?: Date | null } | null | undefined,
  now: Date = new Date()
): boolean {
  if (!subscription) return false;

  switch (subscription.status) {
    case 'active':
      return true;
    case 'trialing':
      // Sem data de término registrada, tratamos como trial ainda aberto —
      // é preferível a bloquear um tenant por dado faltante.
      if (!subscription.trialEndsAt) return true;
      return subscription.trialEndsAt.getTime() > now.getTime();
    default:
      return false;
  }
}

/**
 * Dias restantes de trial (0 quando não está em trial ou já venceu).
 * Continua funcionando para quem tiver `trialEndsAt` preenchido — no plano
 * grátis o campo é `null` e o resultado é sempre 0.
 */
export function trialDaysRemaining(
  subscription: { status: string; trialEndsAt?: Date | null } | null | undefined,
  now: Date = new Date()
): number {
  if (!subscription || subscription.status !== 'trialing' || !subscription.trialEndsAt) return 0;
  const ms = subscription.trialEndsAt.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/** Motivo legível (pt-BR) pelo qual a assinatura está inválida. */
export function inactiveReason(
  subscription: { status: string; trialEndsAt?: Date | null } | null | undefined,
  now: Date = new Date()
): string {
  if (!subscription) {
    return 'Nenhuma assinatura encontrada para esta conta. Escolha um plano para continuar.';
  }
  if (subscription.status === 'trialing') {
    // Só alcançável em assinaturas de trial promocional (o plano grátis é
    // `active` e sem prazo).
    return 'Seu período promocional terminou. Escolha um plano para continuar usando o TelaHub, ou volte para o plano Grátis, que mantém 1 tela para sempre.';
  }
  if (subscription.status === 'past_due') {
    return 'Há uma fatura em aberto na sua conta. Regularize o pagamento para reativar o acesso.';
  }
  if (subscription.status === 'canceled') {
    return 'Sua assinatura foi cancelada. Reative um plano para voltar a usar o TelaHub.';
  }
  return 'Sua assinatura não está ativa. Verifique a área de cobrança.';
}

export class SubscriptionService {
  /**
   * Cria a assinatura de entrada de uma organização: plano `gratis`, `active` e
   * SEM prazo (`trialEndsAt: null`) — 1 tela grátis para sempre, sem cartão.
   *
   * Aceita um `Prisma.TransactionClient` para ser chamada de dentro da
   * transação do signup.
   */
  async createFreeSubscription(
    organizationId: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<Subscription> {
    const plan = await tx.plan.findUnique({ where: { code: FREE_PLAN_CODE } });
    if (!plan) {
      throw new Error(
        `Plano "${FREE_PLAN_CODE}" não encontrado. Rode "npm run db:seed-plans" antes de liberar cadastros.`
      );
    }

    return tx.subscription.create({
      data: {
        organizationId,
        planId: plan.id,
        status: 'active',
        // Freemium não expira. Nunca preencher aqui — `trialEndsAt` é
        // exclusivo de trials promocionais.
        trialEndsAt: null,
      },
    });
  }

  async getByOrganization(organizationId: string): Promise<SubscriptionWithPlan | null> {
    return prisma.subscription.findUnique({
      where: { organizationId },
      // `override` junto do `plan`: é uma junção 1:1 por chave primária, custo
      // desprezível, e é o que faz a concessão manual valer em TODA rota que já
      // consulta a assinatura — inclusive as de publicação de widget, que é
      // onde ela mais importa. Ver a nota em `SubscriptionWithPlan`.
      include: { plan: true, override: true },
    });
  }

  /** Como `getByOrganization`, mas lança quando não existe. */
  async requireByOrganization(organizationId: string): Promise<SubscriptionWithPlan> {
    const subscription = await this.getByOrganization(organizationId);
    if (!subscription) {
      throw new Error('Nenhuma assinatura encontrada para esta organização.');
    }
    return subscription;
  }

  /**
   * Troca o plano da assinatura. Recusa downgrade quando o uso atual estoura
   * algum limite do plano de destino — o chamador deve mapear para 400.
   */
  async changePlan(
    organizationId: string,
    planCode: string,
    options: ChangePlanOptions = {}
  ): Promise<SubscriptionWithPlan> {
    const subscription = await this.requireByOrganization(organizationId);
    const plan = await planService.getByCode(planCode);

    if (!plan || !plan.active) {
      throw new Error(`Plano "${planCode}" não está disponível para contratação.`);
    }

    if (plan.id === subscription.planId) {
      return subscription;
    }

    // Subir de plano é uma compra. Só o fluxo de pagamento confirmado pode
    // chamar isto com `paymentConfirmed`. Ver `PlanUpgradeRequiresPaymentError`.
    if (!options.paymentConfirmed) {
      const counts = await this.countResources(organizationId);
      if (isPlanUpgrade(subscription.plan, plan, counts.devices)) {
        throw new PlanUpgradeRequiresPaymentError(plan.name);
      }
    }

    const blocker = await this.findDowngradeBlocker(organizationId, plan);
    if (blocker) {
      throw new Error(blocker);
    }

    return prisma.subscription.update({
      where: { organizationId },
      data: { planId: plan.id },
      include: { plan: true },
    });
  }

  /**
   * Retorna a mensagem do primeiro recurso que impede a migração para `plan`,
   * ou `null` quando a troca é permitida.
   */
  async findDowngradeBlocker(organizationId: string, plan: Plan): Promise<string | null> {
    const counts = await this.countResources(organizationId);

    const checks: Array<{ label: string; used: number; limit: number | null }> = [
      { label: 'telas ativas', used: counts.devices, limit: plan.maxDevices },
      { label: 'usuários', used: counts.users, limit: plan.maxUsers },
      { label: 'organizações', used: counts.organizations, limit: plan.maxOrganizations },
    ];

    for (const check of checks) {
      if (check.limit !== null && check.used > check.limit) {
        return (
          `Não é possível mudar para o plano ${plan.name}: você usa ${check.used} ${check.label} ` +
          `e o limite do plano é ${check.limit}. Reduza para ${check.limit} ${check.label} antes de trocar.`
        );
      }
    }

    return null;
  }

  /**
   * Cancelamento IMEDIATO. Continua existindo para uso administrativo
   * (fraude, chargeback, pedido do jurídico) e para o job que efetiva um
   * cancelamento agendado — NÃO é o que a rota do painel chama.
   *
   * Quem cancela pelo painel passa por `scheduleCancel`: cortar na hora o
   * acesso de quem já pagou o mês é cláusula abusiva (CDC art. 51, IV).
   */
  async cancel(organizationId: string, reason?: string | null): Promise<SubscriptionWithPlan> {
    await this.requireByOrganization(organizationId);
    return prisma.subscription.update({
      where: { organizationId },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
        // Opcional na assinatura do método para não quebrar quem já chamava,
        // mas o backoffice SEMPRE passa (`admin:<motivo>`): corte imediato de
        // acesso pago é a ação mais agressiva que existe aqui, e ela sem
        // registro de quem fez e por quê é o que ninguém consegue explicar
        // depois.
        ...(reason?.trim() ? { cancelReason: reason.trim().slice(0, 500) } : {}),
      },
      include: { plan: true },
    });
  }

  /**
   * Agenda o cancelamento para o fim do ciclo já pago.
   *
   * `status` continua `active` de propósito: quem pagou até o dia 30 usa até o
   * dia 30. O par (`cancelAtPeriodEnd`, `currentPeriodEnd`) é o que diz ao
   * painel que a assinatura está de saída sem tirar nada de quem pagou.
   *
   * `canceledAt` é o instante do PEDIDO, não o do fim do acesso — é essa data
   * que responde "quanto tempo o cliente ficou" no cálculo de churn.
   *
   * O cancelamento no gateway acontece junto, e uma falha ali NÃO desfaz o
   * cancelamento local: o cliente já pediu, e um erro do Asaas não pode virar
   * "continue pagando". A falha é registrada para reprocessamento humano.
   */
  async scheduleCancel(
    organizationId: string,
    reason?: string | null,
    now: Date = new Date()
  ): Promise<{ subscription: SubscriptionWithPlan; gatewayCanceled: boolean | null }> {
    const current = await this.requireByOrganization(organizationId);

    const subscription = await prisma.subscription.update({
      where: { organizationId },
      data: {
        cancelAtPeriodEnd: true,
        canceledAt: current.canceledAt ?? now,
        cancelReason: reason?.trim() ? reason.trim().slice(0, 500) : null,
      },
      include: { plan: true },
    });

    const gatewayCanceled = await cancelAtGateway(current);

    return { subscription, gatewayCanceled };
  }

  /**
   * Desfaz um cancelamento agendado, enquanto o ciclo não terminou.
   *
   * Depois que a assinatura virou `canceled` não há o que reativar aqui: uma
   * nova contratação passa pelo checkout, porque é preciso criar cobrança nova
   * no gateway. Devolver "reativado" sem cobrança seria dar plano pago de
   * graça — o mesmo buraco que `PlanUpgradeRequiresPaymentError` fecha.
   */
  async reactivate(organizationId: string): Promise<SubscriptionWithPlan> {
    const current = await this.requireByOrganization(organizationId);

    if (current.status === 'canceled') {
      throw new SubscriptionReactivationError(
        'Esta assinatura já foi encerrada. Contrate novamente pelo checkout para voltar a usar o plano.'
      );
    }

    if (!current.cancelAtPeriodEnd) {
      return current;
    }

    return prisma.subscription.update({
      where: { organizationId },
      data: { cancelAtPeriodEnd: false, canceledAt: null, cancelReason: null },
      include: { plan: true },
    });
  }

  /**
   * Marca inadimplência. `pastDueSince` só é gravado na PRIMEIRA falha: se cada
   * reenvio do webhook empurrasse a data, a carência nunca venceria e o
   * devedor usaria o produto para sempre.
   */
  async markPastDue(organizationId: string, since: Date = new Date()): Promise<void> {
    const current = await prisma.subscription.findUnique({
      where: { organizationId },
      select: { pastDueSince: true },
    });

    await prisma.subscription.update({
      where: { organizationId },
      data: { status: 'past_due', pastDueSince: current?.pastDueSince ?? since },
    });
  }

  /**
   * Reativa após pagamento confirmado: limpa a inadimplência e empurra o fim do
   * período. Também usado quando o webhook confirma a primeira cobrança.
   */
  async markActiveFromPayment(input: {
    organizationId: string;
    interval: BillingInterval;
    paidAt: Date;
    gateway?: string | null;
    gatewayCustomerId?: string | null;
    gatewaySubscriptionId?: string | null;
  }): Promise<void> {
    await prisma.subscription.update({
      where: { organizationId: input.organizationId },
      data: {
        status: 'active',
        pastDueSince: null,
        billingInterval: input.interval,
        currentPeriodEnd: addBillingInterval(input.paidAt, input.interval),
        ...(input.gateway ? { gateway: input.gateway } : {}),
        ...(input.gatewayCustomerId ? { gatewayCustomerId: input.gatewayCustomerId } : {}),
        ...(input.gatewaySubscriptionId
          ? { gatewaySubscriptionId: input.gatewaySubscriptionId }
          : {}),
      },
    });
  }

  /**
   * Manutenção periódica da cobrança. Chame de um job (ver a nota em
   * `isPastDueGraceExpired` sobre por que NÃO é um `setTimeout`).
   *
   * Faz duas coisas, ambas idempotentes:
   *   1. efetiva cancelamentos agendados cujo ciclo já terminou;
   *   2. cancela quem passou da carência de `PAST_DUE_GRACE_DAYS` em `past_due`.
   *
   * Rodar duas vezes no mesmo minuto não muda nada — os filtros já excluem
   * quem foi tratado.
   */
  async runBillingMaintenance(now: Date = new Date()): Promise<{
    scheduledCanceled: number;
    graceExpired: number;
  }> {
    const [scheduled, overdue] = await Promise.all([
      prisma.subscription.updateMany({
        where: {
          cancelAtPeriodEnd: true,
          status: { not: 'canceled' },
          currentPeriodEnd: { not: null, lte: now },
        },
        // `cancelReason` só é gravado quando ainda não há um: o motivo de quem
        // PEDIU o cancelamento (`customer_request`, `admin`) já foi registrado
        // no momento do pedido e é mais informativo que o do encerramento.
        data: { status: 'canceled' },
      }),
      prisma.subscription.updateMany({
        where: {
          status: 'past_due',
          pastDueSince: { not: null, lte: new Date(now.getTime() - PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000) },
        },
        // MOTIVO OBRIGATÓRIO AQUI. Sem ele, quem parou de pagar fica
        // indistinguível de quem pediu para sair — e as duas listas são
        // problemas opostos: a primeira é cobrança falhando (recuperável por
        // e-mail e novo meio de pagamento), a segunda é produto. Até 2026-09-09
        // este `updateMany` encerrava sem gravar motivo nenhum.
        data: { status: 'canceled', canceledAt: now, cancelReason: 'grace_expired' },
      }),
    ]);

    // O cancelamento agendado que venceu sem motivo registrado recebe
    // `period_end_unpaid`. Feito em passo separado porque o `updateMany` acima
    // não sabe distinguir linha a linha quem já tinha motivo.
    if (scheduled.count > 0) {
      await prisma.subscription.updateMany({
        where: { status: 'canceled', cancelAtPeriodEnd: true, cancelReason: null },
        data: { cancelReason: 'period_end_unpaid' },
      });
    }

    return { scheduledCanceled: scheduled.count, graceExpired: overdue.count };
  }

  /** Contagem crua dos recursos consumidos por um tenant. */
  async countResources(
    organizationId: string
  ): Promise<{ devices: number; users: number; organizations: number }> {
    const [devices, users, organizations] = await Promise.all([
      // "Tela ativa" para fins de cobrança = device efetivamente vinculado.
      prisma.device.count({ where: { organizationId, status: 'linked' } }),
      prisma.user.count({ where: { organizationId } }),
      // LIMITAÇÃO CONHECIDA: o schema não tem hierarquia entre organizações
      // (nenhum `parentOrganizationId`), então não há como saber quais orgs
      // pertencem à mesma conta. Contamos apenas a própria org do tenant (= 1).
      // Quando a hierarquia existir, trocar por um count dos filhos + a raiz.
      prisma.organization.count({ where: { id: organizationId } }),
    ]);

    return { devices, users, organizations };
  }

  /**
   * Plano pago mais barato para operar `screens` telas: compara o valor mensal
   * previsto de cada plano de `UPGRADE_PLAN_CODES` (já respeitando `minScreens`)
   * e devolve o de menor fatura. Com 2 telas ganha o `loja` (2 × R$ 49 = R$ 98)
   * porque o `rede` cobraria o piso de 5 telas; a partir de 10 telas o `rede`
   * passa à frente (10 × R$ 39 = R$ 390 contra R$ 490).
   *
   * Considera apenas os códigos do catálogo comercial de propósito: a sugestão é
   * política de vendas, não um otimizador sobre qualquer linha que exista na
   * tabela `Plan`. Planos sob consulta (Enterprise) ficam fora — não há preço
   * público para comparar.
   */
  async suggestUpgradeFor(screens: number): Promise<Plan | null> {
    const plans = await Promise.all(UPGRADE_PLAN_CODES.map((code) => planService.getByCode(code)));

    const candidates = plans
      .filter((plan): plan is Plan => !!plan && plan.active && plan.pricePerScreenCents > 0)
      .filter((plan) => !parseFeatures(plan.features).includes(FEATURE_QUOTE_ONLY))
      .map((plan) => ({ plan, cents: estimateMonthlyCents(plan, screens) }))
      .sort((a, b) => a.cents - b.cents || a.plan.pricePerScreenCents - b.plan.pricePerScreenCents);

    return candidates[0]?.plan ?? null;
  }

  /** Consumo atual do tenant contra os limites do plano contratado. */
  async getUsage(organizationId: string): Promise<Usage> {
    const subscription = await this.requireByOrganization(organizationId);
    const counts = await this.countResources(organizationId);

    return {
      organizationId,
      planCode: subscription.plan.code,
      planName: subscription.plan.name,
      pricePerScreenCents: subscription.plan.pricePerScreenCents,
      minScreens: subscription.plan.minScreens,
      freePlan: isFreePlan(subscription.plan),
      devices: entry(counts.devices, subscription.plan.maxDevices),
      users: entry(counts.users, subscription.plan.maxUsers),
      organizations: entry(counts.organizations, subscription.plan.maxOrganizations),
    };
  }
}

export const subscriptionService = new SubscriptionService();
