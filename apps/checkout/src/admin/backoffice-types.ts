/**
 * Tipos do backoffice — o que `/api/admin/*` devolve.
 *
 * Separado de `types.ts` (que é do funil de checkout) de propósito: são duas
 * superfícies com ciclos de vida diferentes, e misturá-las faria qualquer tela
 * do funil recompilar por causa de um campo novo de assinatura.
 */

// ─── Clientes e assinaturas ──────────────────────────────────────────────────
//
// ⚠️ ESTA SEÇÃO ESPELHA `apps/api/src/services/admin-organization.service.ts` e
// `apps/api/src/routes/admin/organizations.routes.ts`, campo a campo e nome a
// nome. O que existia aqui antes era um contrato provisório, escrito ANTES do
// serviço, e ele divergia em três eixos:
//
//   1. FORMATO — a lista era uma `ClienteRow` PLANA (`organizationName`,
//      `planCode`, `cycleAmountCents`, `usedScreens`). O servidor devolve a
//      linha ANINHADA (`organization`, `subscription`, `screens`, `billing`,
//      `lastPayment`, `hasActiveOverride`), e `subscription` é `null` para
//      organização sem assinatura — a visão "Todos" tem dessas. Com o contrato
//      plano, cada célula da tabela leria um campo inexistente: nome vazio,
//      data "—" e, pior, `formatMoney(undefined)` imprimindo "R$ 0,00", que se
//      lê como "este cliente não paga nada" em vez de "a tela não sabe".
//   2. ENVELOPE — `{ rows, total, page, pageSize, counts }` contra
//      `{ view, organizations, pagination }`. E `counts` por visão NUNCA
//      existiu no servidor: há o total da visão CONSULTADA
//      (`pagination.total`), e só. Sete contadores exigiriam sete consultas
//      que ninguém escreveu.
//   3. DERIVADOS — `graceDaysLeft` e `lastPaymentAt` não são campos do
//      servidor. Ele manda `subscription.graceEndsAt` (o INSTANTE em que a
//      carência acaba) e `lastPayment` (o pagamento inteiro). Transformar isso
//      em "faltam N dias" é trabalho da tela, e é onde ele passou a morar.
//
// REGRA DE DINHEIRO (US-A-05): `monthlyEquivalentCents` é MRR (mensal
// equivalente) e `cycleCents` é CAIXA do ciclo — no anual, os 12 meses de uma
// vez. São recortes do MESMO dinheiro: nunca se somam e nunca se trocam.
// Nenhum dos dois passa por `formatCycleMoney`: aquela função multiplica o
// anual por 12 e existe para o funil, onde o campo guardado é o mensal. Com
// `cycleCents` ela mostraria R$ 16.848 onde entraram R$ 1.404 — a US-A-05 ao
// contrário, e igualmente invisível.

/**
 * As sete visões da lista de clientes. São recortes com REGRA, não filtros
 * livres — e a regra mora no servidor (`ORGANIZATION_VIEWS`) para as duas
 * pontas nunca discordarem sobre o que é "inadimplente".
 *
 * `not_renewed` é o único que depende de `cancelReason='grace_expired'`: sem
 * ele, quem parou de pagar ficaria misturado com quem pediu para sair, e os
 * dois são problemas opostos (cobrança falhando × produto).
 */
export type ClienteView =
  | 'all'
  | 'paying'
  | 'expiring'
  | 'past_due'
  | 'not_renewed'
  | 'scheduled_cancel'
  | 'free';

/**
 * O vocabulário de `Subscription.status`, como o schema Prisma o documenta.
 *
 * Existe para os rótulos da tela, NÃO para tipar o campo que chega: no banco a
 * coluna é texto livre e o serviço a devolve como `string`. Tipá-la com esta
 * união faria o TypeScript prometer uma garantia que o dado não tem, e um
 * status novo (ou legado) sairia sem rótulo nenhum na tela em vez de aparecer
 * com o código cru — que é o único jeito de alguém investigar.
 */
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export type BillingInterval = 'monthly' | 'yearly';

/** Envelope de paginação. É o MESMO objeto em organizações, pagamentos e leads. */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Plano como a LISTA o traz (o detalhe traz mais: limites e features). */
export interface AdminRowPlan {
  code: string;
  name: string;
  pricePerScreenCents: number;
  priceAnnualPerScreenCents: number;
  minScreens: number;
  free: boolean;
}

export interface AdminRowSubscription {
  id: string;
  /** Texto do banco. Ver `SubscriptionStatus` para o vocabulário esperado. */
  status: string;
  billingInterval: BillingInterval;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  cancelReason: string | null;
  pastDueSince: string | null;
  /**
   * INSTANTE em que a carência de inadimplência termina — não uma contagem de
   * dias. `null` fora de `past_due`.
   */
  graceEndsAt: string | null;
  gateway: string | null;
  plan: AdminRowPlan;
}

/** Último pagamento CONFIRMADO da organização. `null` = nunca entrou dinheiro. */
export interface AdminRowPayment {
  id: string;
  /** CAIXA do ciclo, em centavos. Ver a regra de dinheiro no topo da seção. */
  amountCents: number;
  billingInterval: string;
  screens: number;
  method: string | null;
  provider: string;
  paidAt: string | null;
  createdAt: string;
  invoiceUrl: string | null;
  nfseStatus: string | null;
}

export interface AdminOrganizationRow {
  organization: {
    id: string;
    name: string;
    createdAt: string;
    /** Atribuição congelada no cadastro — é a coluna "origem" da lista. */
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
  };
  /** `null` quando a organização não tem assinatura nenhuma. */
  subscription: AdminRowSubscription | null;
  screens: {
    /** Telas efetivamente vinculadas. */
    inUse: number;
    /** Telas que ENTRAM NA FATURA — respeita o piso `minScreens` do plano. */
    billed: number;
  };
  billing: {
    interval: BillingInterval;
    /** MRR: mensal equivalente. */
    monthlyEquivalentCents: number;
    /** CAIXA do ciclo. */
    cycleCents: number;
    free: boolean;
  };
  lastPayment: AdminRowPayment | null;
  /** `true` só quando existe concessão manual VÁLIDA agora (não vencida). */
  hasActiveOverride: boolean;
}

/** `GET /admin/organizations`. O `view` volta ecoado: é o recorte que valeu. */
export interface ClientesResponse {
  view: ClienteView;
  organizations: AdminOrganizationRow[];
  pagination: Pagination;
}

/** Espelha `listOrganizationsQuerySchema`. Nome por nome — é query string. */
export interface ClienteFilters {
  view?: ClienteView;
  search?: string;
  /** Janela da visão `expiring`, em dias (1–365). Ignorado nas outras. */
  days?: number;
  page?: number;
  pageSize?: number;
  sort?: 'createdAt' | 'name' | 'currentPeriodEnd' | 'status';
  sortDir?: 'asc' | 'desc';
}

/**
 * Um `Payment` como o servidor o devolve: a linha crua do banco, tanto no
 * detalhe do cliente quanto no extrato da plataforma.
 *
 * `amountCents` É O CAIXA DO CICLO — no anual, os 12 meses. Somar esta coluna
 * dá RECEITA RECEBIDA, nunca MRR.
 */
export interface PaymentRow {
  id: string;
  organizationId: string;
  provider: string;
  providerPaymentId: string | null;
  status: string;
  method: string | null;
  amountCents: number;
  billingInterval: string;
  screens: number;
  dueDate: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  invoiceUrl: string | null;
  nfseStatus: string | null;
  nfseUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * A linha do extrato da plataforma traz a organização ANINHADA (`include`), e
 * não um `organizationName` plano: sem o objeto, a coluna "Cliente" mostraria
 * uma lista de uuids.
 */
export interface PaymentListRow extends PaymentRow {
  organization: { id: string; name: string };
}

/** `GET /admin/payments`. */
export interface PaymentsResponse {
  payments: PaymentListRow[];
  pagination: Pagination;
}

/** Espelha `listPaymentsQuerySchema`. `status` é enum fechado no servidor. */
export interface PaymentFilters {
  status?: 'pending' | 'confirmed' | 'refunded' | 'failed' | 'canceled';
  organizationId?: string;
  /** Período sobre `createdAt` — a data em que a cobrança foi EMITIDA. */
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

/**
 * O aviso CRU do gateway (`WebhookEvent`).
 *
 * `payload` vem junto de propósito: quando um pagamento não provisionou, o que
 * resolve é ver o corpo que o provedor mandou, não a interpretação que o código
 * fez dele.
 */
export interface WebhookEventRow {
  id: string;
  provider: string;
  eventId: string;
  eventType: string;
  /** `received | processed | ignored | failed`. */
  status: string;
  payload: string;
  error: string | null;
  receivedAt: string;
  processedAt: string | null;
}

/** `GET /admin/payments/webhooks` — a chave é `events`, não `rows`. */
export interface WebhooksResponse {
  events: WebhookEventRow[];
  pagination: Pagination;
}

/** Espelha `listWebhooksQuerySchema`. `pending` NÃO é status de webhook. */
export interface WebhookFilters {
  status?: 'received' | 'processed' | 'ignored' | 'failed';
  provider?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

/** Direitos EFETIVOS: plano ∪ concessão VÁLIDA. É o que o gate enxerga. */
export interface Entitlements {
  features: string[];
  /** `null` = ilimitado. Não é "desconhecido". */
  maxDevices: number | null;
  maxUsers: number | null;
}

/**
 * A concessão manual como o DETALHE a devolve.
 *
 * ⚠️ `active: false` chega e é dado de primeira classe: a concessão VENCIDA
 * continua sendo devolvida porque é o histórico ("este cliente teve Power BI
 * até 31/08"). A tela tem de mostrá-la como passado — exibi-la como permissão
 * vigente faria o operador acreditar que o cliente ainda tem o que já perdeu.
 */
export interface OverrideInfo {
  extraFeatures: string[];
  maxDevices: number | null;
  maxUsers: number | null;
  note: string;
  expiresAt: string | null;
  setByUserId: string;
  createdAt: string;
  updatedAt: string;
  /** `false` = venceu. Histórico, nunca direito em vigor. */
  active: boolean;
}

/**
 * A concessão como o `PUT` a devolve: a LINHA CRUA gravada.
 *
 * Sem `active` de propósito — a rota de escrita não classifica validade, e
 * declarar o campo aqui faria a tela ler `undefined` como "vencida" logo depois
 * de salvar uma concessão que acabou de entrar em vigor.
 */
export interface SavedOverride {
  subscriptionId: string;
  extraFeatures: string[];
  maxDevices: number | null;
  maxUsers: number | null;
  note: string;
  expiresAt: string | null;
  setByUserId: string;
  createdAt: string;
  updatedAt: string;
}

/** Plano no DETALHE: traz limites e features, que a linha de lista não traz. */
export interface ClienteDetailPlan extends AdminRowPlan {
  /** `null` = ilimitado. */
  maxDevices: number | null;
  maxUsers: number | null;
  features: string[];
}

export interface ClienteDetailSubscription {
  id: string;
  status: string;
  billingInterval: BillingInterval;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  cancelReason: string | null;
  pastDueSince: string | null;
  graceEndsAt: string | null;
  gateway: string | null;
  createdAt: string;
  plan: ClienteDetailPlan;
}

export interface ClienteDetailUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  lastLogin: string | null;
  mustChangePassword: boolean;
  termsAcceptedAt: string | null;
  marketingOptInAt: string | null;
}

/**
 * Uma entrada da trilha de auditoria, como o banco a guarda.
 *
 * ⚠️ `metadata` é JSON EM TEXTO, não um objeto: o servidor devolve a linha crua
 * do Prisma. O contrato antigo prometia `Record<string, unknown>`, e
 * `Object.entries` sobre uma string desmonta a string em caracteres — a tela
 * imprimiria `0: {`, `1: "`, `2: r`… em vez do motivo da ação. Use
 * `parseMetadata` de `format.ts`.
 */
export interface AuditLogRow {
  id: string;
  organizationId: string | null;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: string | null;
  createdAt: string;
}

/** Atribuição completa — bloco PRÓPRIO, não campos soltos na organização. */
export interface Attribution {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  gclid: string | null;
  fbclid: string | null;
  referrer: string | null;
  landingPath: string | null;
}

/**
 * `GET /admin/organizations/:id` — tudo do cliente numa chamada só.
 *
 * Diferenças que o contrato antigo errava e custariam caro:
 *   • `organization` traz APENAS id/nome/criação — a atribuição vive em
 *     `attribution`, com nove campos, não três;
 *   • dinheiro e telas faturadas vivem em `billing`, não dentro de
 *     `subscription`;
 *   • a trilha é `auditLogs` (plural com "s"), não `auditLog`;
 *   • NÃO existe `emails` aqui. O histórico de e-mail de uma organização sai de
 *     `GET /admin/email/messages?organizationId=`, que é outra rota e outra
 *     tela.
 */
export interface ClienteDetail {
  organization: { id: string; name: string; createdAt: string };
  /** `null` quando a organização nunca teve assinatura. */
  subscription: ClienteDetailSubscription | null;
  billing: {
    interval: BillingInterval;
    /** MRR. */
    monthlyEquivalentCents: number;
    /** CAIXA do ciclo. */
    cycleCents: number;
    billedScreens: number;
    free: boolean;
  };
  usage: { devices: number; users: number; organizations: number };
  entitlements: Entitlements;
  override: OverrideInfo | null;
  attribution: Attribution;
  payments: PaymentRow[];
  users: ClienteDetailUser[];
  auditLogs: AuditLogRow[];
}

/** Corpo comum a TODA ação administrativa. O motivo não é opcional em lugar nenhum. */
export interface AdminActionBody {
  reason: string;
}

/**
 * `changePlanSchema` aceita SÓ `planCode` e `reason`.
 *
 * Não existe `billingInterval` aqui: o contrato antigo mandava um, o Zod o
 * descartava em silêncio (schema não-estrito) e o operador escolhia uma
 * periodicidade que nunca chegava a lugar nenhum. Quem muda o intervalo é o
 * pagamento (`ManualPaymentBody.interval`).
 */
export interface ChangePlanBody extends AdminActionBody {
  planCode: string;
}

export interface ExtendBody extends AdminActionBody {
  /** 1 a 365. O teto existe para o dedo que escorrega e dá um ano de graça. */
  days: number;
}

/**
 * `manualPaymentSchema`. O campo é `interval` — NÃO `billingInterval`: com o
 * nome errado o Zod recusa o corpo inteiro com 400 e nenhum Pix é registrado.
 *
 * `method` não existe: o servidor grava `provider: 'manual'` e `method: 'pix'`
 * por conta própria.
 */
export interface ManualPaymentBody extends AdminActionBody {
  /** CAIXA do ciclo, em centavos — no anual, os 12 meses. Ver US-A-05. */
  amountCents: number;
  screens: number;
  interval: BillingInterval;
  /** Quando o dinheiro entrou. Ausente = agora. É a data que ancora o ciclo. */
  paidAt?: string;
  /** Id do Pix/comprovante. Vira `providerPaymentId` e é o que torna o
   *  lançamento idempotente: o mesmo comprovante duas vezes volta 409 em vez de
   *  dobrar o caixa do mês. */
  reference?: string;
}

export interface OverrideBody extends AdminActionBody {
  extraFeatures: string[];
  /** `null` = "usa o limite do plano". */
  maxDevices: number | null;
  maxUsers: number | null;
  expiresAt: string | null;
}

/**
 * A assinatura crua que as ações devolvem.
 *
 * NENHUMA ação devolve o `ClienteDetail` inteiro — era o que o contrato antigo
 * prometia, e por isso a tela adotava como "detalhe" um objeto que só tem a
 * assinatura: nome do cliente, pagamentos, usuários e trilha sumiriam da tela
 * no instante seguinte a qualquer ação. Depois de agir, a tela RECARREGA.
 */
export interface ActionSubscription {
  id: string;
  status: string;
  billingInterval: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelReason: string | null;
}

export interface SubscriptionActionResponse {
  subscription: ActionSubscription;
}

/**
 * `gatewayCanceled` não é enfeite: uma falha ao cancelar a recorrência no Asaas
 * NÃO desfaz o cancelamento local. `false` significa que a assinatura terminou
 * aqui e o gateway CONTINUA cobrando — quem não vê isso descobre pela fatura do
 * cliente. `null` = não havia recorrência a cancelar.
 */
export interface ScheduleCancelResponse extends SubscriptionActionResponse {
  gatewayCanceled: boolean | null;
}

/**
 * Resposta do pagamento manual (201).
 *
 * `expectedCycleCents` é o que o catálogo cobraria por essas telas nesse
 * intervalo, e `divergesFromCatalog` diz se o valor lançado bate. Divergir não
 * é erro (desconto negociado existe) — é o único sinal que separa "R$ 468
 * combinados" de "digitei o mensal num contrato anual", que é a US-A-05 pelo
 * lado do lançamento, onde o número errado vira o dado gravado.
 */
export interface ManualPaymentResponse {
  payment: PaymentRow;
  subscription: ActionSubscription | null;
  expectedCycleCents: number;
  divergesFromCatalog: boolean;
}

export interface OverrideResponse {
  override: SavedOverride;
  entitlements: Entitlements;
}

/** `false` = não havia concessão. A rota é idempotente, e isso não é erro. */
export interface RemoveOverrideResponse {
  removed: boolean;
}

/** `POST /admin/payments/events/:id/retry` — evento do OUTBOX de checkout. */
export interface RetryEventResponse {
  requeued: boolean;
}

// ─── Leads ───────────────────────────────────────────────────────────────────

/**
 * Espelha `LEAD_STATUSES` do servidor. Aqui a união é honesta: a coluna só é
 * escrita por `POST /api/leads` (que grava `new`) e pelo `PATCH` do backoffice,
 * que valida contra este mesmo enum.
 */
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'discarded';

export interface LeadRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  planCode: string | null;
  status: LeadStatus;
  /** Quando o e-mail de aviso saiu. `null` = ninguém foi avisado do lead. */
  notifiedAt: string | null;
  createdAt: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrer: string | null;
}

/** `GET /admin/leads` — a chave é `leads`, não `rows`. */
export interface LeadsResponse {
  leads: LeadRow[];
  pagination: Pagination;
}

export interface LeadFilters {
  status?: LeadStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

/**
 * O que o `PATCH` devolve: um `select` REDUZIDO, sem atribuição nenhuma.
 *
 * Por isso é um tipo próprio. Substituir a linha da tabela por este objeto
 * apagaria a coluna "Origem" do lead que o operador acabou de triar — a tela
 * mescla só o `status`.
 */
export interface LeadStatusUpdate {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  planCode: string | null;
  status: LeadStatus;
  notifiedAt: string | null;
  createdAt: string;
}

export interface UpdateLeadResponse {
  lead: LeadStatusUpdate;
}

/**
 * `updateLeadSchema`. `note` é opcional AQUI, e só aqui: mover um lead de
 * "novo" para "contatado" não tira nada de ninguém, e exigir justificativa em
 * triagem comercial ensinaria o operador a digitar "x" — o que estraga o hábito
 * nas ações em que o motivo importa de verdade.
 */
export interface UpdateLeadBody {
  status: LeadStatus;
  note?: string;
}

// ─── E-mail ──────────────────────────────────────────────────────────────────
//
// ⚠️ ESTA SEÇÃO ESPELHA `apps/api/src/routes/admin/email.routes.ts`,
// `email.schema.ts` e os serviços `email-campaign`, `email-automation` e
// `email-queue` — campo a campo, nome a nome e ENVELOPE a envelope. O que
// existia aqui era um contrato provisório escrito antes das rotas, e divergia
// em cinco eixos, do mais barulhento ao mais silencioso:
//
//   1. ENVELOPE — toda rota embrulha a resposta (`{ automations, variables }`,
//      `{ campaign }`, `{ total, messages }`) e o contrato antigo esperava o
//      array/objeto cru. `data.length` de um objeto é `undefined`: a aba de
//      automações cairia direto no estado "nenhum gatilho configurado" e a de
//      campanhas em "nenhuma campanha ainda" — as duas mentindo com a cara de
//      tela vazia legítima, que ninguém investiga.
//   2. TIPO DO PÚBLICO — `EmailCampaign.audience` é uma STRING JSON no banco
//      (`String @default("{}")`), não um objeto. `campaign.audience.plans` era
//      `undefined`, e a assinatura do público (que decide se a contagem ainda
//      vale) comparava o `JSON.stringify` de uma string com o de um objeto:
//      nunca casariam. A contagem nasceria eternamente "vencida" e o disparo
//      ficaria travado para sempre, sem mensagem de erro nenhuma.
//   3. `reason` OBRIGATÓRIO NA ESCRITA — criar campanha, salvar campanha,
//      disparar, salvar automação e reenfileirar mensagem exigem motivo
//      (`reasonSchema`, mínimo 3 caracteres). O contrato antigo não pedia
//      motivo em `createCampaign` nem em `retryEmailMessage`: as duas voltavam
//      400 SEMPRE — ou seja, criar campanha simplesmente não funcionava.
//   4. FAIXA DE `offsetDays` — o servidor aceita −60 a +60, e NEGATIVO
//      significa ANTES do evento (D-7 é `-7`). A tela validava 0 a 365, então
//      os gatilhos de renovação chegavam do servidor já marcados como
//      inválidos e não havia como salvá-los.
//   5. CAMPOS QUE FALTAVAM — `label`/`trigger`/`default*` da automação,
//      `campaignId`/`nextAttemptAt` da mensagem, `createdByUserId` da campanha
//      e a lista de variáveis do template. Sem eles a tela reimplementava,
//      pior, o que o servidor já dizia.
//
// REGRA DE DINHEIRO (US-A-05): nenhum valor de e-mail é montado aqui. O
// `{{valor}}` das automações é o CICLO — no anual, os 12 meses de uma vez —,
// calculado por `estimateCycleCents` no servidor. A tela NUNCA recalcula nem
// converte para mensal equivalente: era assim que "R$ 117" acabava num aviso de
// cobrança de R$ 1.404.

/** Catálogo FECHADO de gatilhos. Chave é o gatilho, não um id gerado. */
export type AutomationKey =
  | 'renewal_d7'
  | 'renewal_d3'
  | 'renewal_d0'
  | 'past_due_d1'
  | 'past_due_d5'
  | 'past_due_d9'
  | 'not_renewed_d3'
  | 'welcome_d1'
  | 'inactive_d14';

/**
 * A que data o gatilho se ancora, como o servidor define em
 * `AutomationTrigger`. Vem junto na listagem e é o que diz se o `offsetDays`
 * conta para trás (renovação) ou para a frente (inadimplência).
 */
export type AutomationTrigger =
  | 'renewal'
  | 'past_due'
  | 'not_renewed'
  | 'welcome'
  | 'inactive';

/**
 * Uma automação como `GET /automations` devolve: o CATÁLOGO do servidor
 * (fechado, imutável) fundido com o estado gravado.
 *
 * `label`, `trigger` e os `default*` são só leitura — o `master` edita texto,
 * dias e liga/desliga, nunca a regra. Eles vêm de graça na listagem, e é por
 * isso que a tela não precisa (nem deve) manter uma cópia do catálogo: no dia
 * em que um gatilho mudar de nome no servidor, a cópia local continuaria
 * exibindo o nome antigo sem nada quebrar.
 */
export interface Automation {
  key: AutomationKey;
  trigger: AutomationTrigger;
  label: string;
  defaultOffsetDays: number;
  defaultSubject: string;
  defaultHtmlBody: string;
  /**
   * Só assinatura anual. Vem AUSENTE (e não `false`) nos gatilhos que valem
   * para todo mundo — o catálogo do servidor só marca onde é verdade.
   */
  yearlyOnly?: boolean;
  enabled: boolean;
  subject: string;
  htmlBody: string;
  offsetDays: number;
  /** `null` enquanto ninguém salvou: o gatilho nasce semeado, não editado. */
  updatedAt: string | null;
}

/**
 * O que a linha `EmailAutomation` tem SOZINHA — é isto que `PUT
 * /automations/:key` devolve, e NÃO o objeto fundido com o catálogo.
 *
 * A distinção importa: trocar o item da lista por esta resposta apagaria
 * `label`, `trigger` e os `default*` do gatilho recém-salvo, e o cartão
 * passaria a exibir título vazio até alguém recarregar a página. A tela funde
 * o estado novo sobre o item antigo em vez de substituí-lo.
 */
export interface AutomationState {
  key: AutomationKey;
  enabled: boolean;
  subject: string;
  htmlBody: string;
  offsetDays: number;
  updatedAt: string;
}

/** `GET /admin/email/automations`. */
export interface AutomationsResponse {
  automations: Automation[];
  /**
   * Tokens aceitos no assunto e no corpo (`AUTOMATION_VARIABLES`), na ordem do
   * servidor e já com as chaves: `{{nome}}`, `{{empresa}}`, …
   *
   * Chega na listagem de propósito. A tela mantinha uma lista fixa no código,
   * com quatro dos seis tokens — `{{empresa}}` e `{{link}}` ficavam de fora, e
   * `{{link}}` é justamente o botão de pagar. Lista local diverge no primeiro
   * campo novo e ninguém percebe, porque variável desconhecida não vira erro:
   * sai literal no e-mail do cliente.
   */
  variables: string[];
}

/**
 * `updateAutomationSchema`. `reason` é obrigatório e o servidor exige que ao
 * menos um dos outros campos venha — a tela manda os quatro sempre, que é o
 * estado inteiro do formulário.
 *
 * `offsetDays` vai de −60 a +60, NEGATIVO = antes do evento. Fora da faixa o
 * servidor responde 400.
 */
export interface AutomationSaveBody {
  enabled: boolean;
  subject: string;
  htmlBody: string;
  offsetDays: number;
  reason: string;
}

/**
 * `POST /automations/:key/preview` — prévia renderizada PELO SERVIDOR, com os
 * dados reais de uma organização.
 *
 * ⚠️ Renderiza o template GRAVADO, não o que está na caixa de texto. É a
 * armadilha desta rota: depois de editar o corpo sem salvar, a prévia mostra o
 * texto antigo. A tela avisa isso explicitamente, em vez de deixar o operador
 * concluir que a edição não pegou.
 */
export interface AutomationPreview {
  subject: string;
  /** HTML COMPLETO, já dentro do layout do sistema. Vai num iframe `sandbox=""`. */
  html: string;
  /**
   * Valores reais usados, por nome de variável (sem as chaves).
   * `Record<string, string>` e não uma interface fechada: `AUTOMATION_VARIABLES`
   * pode ganhar um campo, e uma interface fechada obrigaria a mexer no contrato
   * só para a tela EXIBIR o que já chegou.
   */
  variables: Record<string, string>;
}

/** Vocabulário de `EmailCampaign.status` — para os rótulos. Ver `Campaign`. */
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'canceled';

export interface CampaignAudience {
  /** Códigos de plano. Lista vazia (ou ausente) = TODOS os planos. */
  plans?: string[];
  /** Situações da assinatura. Lista vazia (ou ausente) = TODAS. */
  statuses?: SubscriptionStatus[];
  /**
   * Sempre `true` para campanha. Está no tipo — em vez de implícito no servidor —
   * para a tela poder MOSTRAR ao operador que novidade só vai para quem
   * consentiu; deixar isso invisível é como as bases de marketing são
   * construídas por acidente.
   */
  optInOnly?: boolean;
}

/**
 * A linha `EmailCampaign` como o servidor a devolve — crua, direto do Prisma.
 *
 * `audience` é STRING (JSON), não objeto: a coluna é `String @default("{}")`.
 * Quem quiser os filtros usa um parser tolerante, pelo mesmo motivo do
 * `parseAudience` do servidor — JSON quebrado por edição manual não pode
 * derrubar a listagem inteira de campanhas.
 *
 * `status` é `string`, e não a união `CampaignStatus`, pelo mesmo motivo de
 * `SubscriptionStatus`: no banco é texto livre. Tipar com a união faria o
 * TypeScript prometer uma garantia que o dado não tem, e um status novo sairia
 * SEM RÓTULO na tela em vez de aparecer com o código cru — que é a única forma
 * de alguém investigar.
 */
export interface Campaign {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  previewText: string | null;
  /** JSON do público. Ver `CampaignAudience` e a nota acima. */
  audience: string;
  /** Texto do banco. Ver `CampaignStatus` para o vocabulário esperado. */
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  createdByUserId: string;
  queuedCount: number;
  sentCount: number;
  failedCount: number;
  suppressedCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * `createCampaignSchema`. `reason` é OBRIGATÓRIO: sem ele o servidor devolve
 * 400 e a campanha nunca chega a existir — foi assim que "criar campanha"
 * ficou quebrado desde sempre no contrato antigo.
 *
 * `scheduledAt` já pode vir na criação: com data a campanha nasce `scheduled`,
 * sem ela nasce `draft`. Quem decide o status é o servidor.
 */
export interface CreateCampaignBody {
  name: string;
  subject: string;
  htmlBody: string;
  previewText?: string;
  audience?: CampaignAudience;
  scheduledAt?: string | null;
  reason: string;
}

/**
 * `updateCampaignSchema`. `reason` obrigatório, e o schema NÃO aceita `status`.
 *
 * Mandar `status` não dá erro — é pior: o `validateBody` troca o corpo pelo
 * resultado do Zod, então a chave desconhecida é descartada em SILÊNCIO. Quem
 * escrevesse `{ status: 'scheduled' }` acharia que agendou. Quem agenda de
 * verdade é `scheduledAt`: com data o serviço grava `scheduled`, com `null`
 * devolve a campanha para `draft`.
 *
 * `previewText` aceita `null` para APAGAR o texto de prévia; `undefined` (campo
 * omitido) significa "não mexa nele". São coisas diferentes.
 */
export interface UpdateCampaignBody {
  name?: string;
  subject?: string;
  htmlBody?: string;
  previewText?: string | null;
  audience?: CampaignAudience;
  scheduledAt?: string | null;
  reason: string;
}

/**
 * `POST /campaigns/:id/preview-audience` — a CONTAGEM obrigatória antes de
 * enviar.
 *
 * Três números, e cada um responde uma pergunta diferente:
 *   `total`        — quantas pessoas casam com o filtro de plano/situação;
 *   `optedIn`      — dessas, quantas consentiram: as que de fato RECEBEM;
 *   `withoutOptIn` — a diferença: ficam de fora por não terem consentido.
 *
 * Os nomes antigos (`recipients`/`suppressed`) não existem em lugar nenhum do
 * servidor: os dois campos chegavam `undefined` e `formatNumber(undefined)`
 * imprime "0". A tela mostraria "0 vão receber · 0 suprimidos" para QUALQUER
 * público — e "0 destinatários" é um resultado plausível aqui (hoje ninguém na
 * base marcou opt-in), então o defeito passaria por resultado correto.
 *
 * `audience` volta ecoado: é o recorte que a contagem realmente usou.
 */
export interface AudiencePreviewResponse {
  audience: CampaignAudience;
  total: number;
  optedIn: number;
  withoutOptIn: number;
}

/**
 * `sendCampaignSchema`. `sendNow` é o "dispare agora mesmo estando agendada".
 *
 * Sem ele, uma campanha com `scheduledAt` no futuro é RECUSADA com 400 e sai
 * sozinha na data marcada, pelo job. Com ele o disparo acontece na hora e o
 * agendamento é limpo, para os dois estados não conviverem.
 */
export interface SendCampaignBody {
  reason: string;
  sendNow?: boolean;
}

/** `POST /campaigns/:id/send` — quantas mensagens entraram na fila. */
export interface SendCampaignResponse {
  queued: number;
}

/** `POST /campaigns/:id/test`. Não audita: é o operador mandando para si mesmo. */
export interface CampaignTestResponse {
  ok: boolean;
  queued: boolean;
}

/**
 * Uma linha do histórico. `GET /messages` monta este objeto à mão e OMITE
 * `htmlBody` de propósito (200 mensagens × 50 KB de HTML por página); quem
 * quiser o corpo abre a mensagem em `GET /messages/:id`.
 *
 * `status` e `kind` são `string` pela mesma razão de `Campaign.status`: são
 * colunas de texto livre. O filtro que a tela ENVIA é enum fechado
 * (`EmailMessageFilters`) — mandar valor fora dele derruba a listagem.
 */
export interface EmailMessageRow {
  id: string;
  toEmail: string;
  organizationId: string | null;
  kind: string;
  templateKey: string | null;
  campaignId: string | null;
  subject: string;
  status: string;
  attempts: number;
  /** Quando a fila tentará de novo. `null` = já venceu ou não haverá retentativa. */
  nextAttemptAt: string | null;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
}

/** `GET /messages/:id` — a linha INTEIRA, com o corpo que saiu. */
export interface EmailMessageDetail extends EmailMessageRow {
  toUserId: string | null;
  htmlBody: string;
  providerMessageId: string | null;
  dedupeKey: string | null;
}

/** `GET /admin/email/messages`. Envelope `{ total, messages }`. */
export interface EmailMessagesResponse {
  total: number;
  messages: EmailMessageRow[];
}

/**
 * `messagesQuerySchema`. A paginação é `limit`/`offset`, NÃO `page`: o
 * parâmetro `page` que a tela mandava não existe no schema e era descartado em
 * silêncio (o schema termina em `.catch(() => ({}))`, que engole filtro
 * inválido em vez de dar 400), então trocar de página trazia sempre as mesmas
 * primeiras mensagens.
 *
 * `limit` vai até 200. `status` e `kind` são enums fechados AQUI — este é o
 * lado que a tela ENVIA.
 */
export interface EmailMessageFilters {
  status?: 'queued' | 'sent' | 'failed' | 'bounced' | 'suppressed';
  kind?: 'transactional' | 'automation' | 'campaign';
  organizationId?: string;
  campaignId?: string;
  limit?: number;
  offset?: number;
}

/**
 * `GET /admin/email/queue` — retrato da fila.
 *
 * `due` é o número que importa quando alguém diz "não recebi": são mensagens
 * enfileiradas cuja hora JÁ passou. `due` alto e parado significa fila travada
 * (SMTP não configurado, job fora do ar), não e-mail perdido — a distinção que
 * decide se alguém vai procurar o problema no provedor ou no cliente.
 */
export interface EmailQueueStatus {
  queued: number;
  due: number;
  sent: number;
  failed: number;
  suppressed: number;
  oldestQueuedAt: string | null;
  oldestQueuedAgeMs: number | null;
}

/**
 * `adhocEmailSchema` — e-mail individual do backoffice para uma organização.
 *
 * `kind` NÃO é campo do corpo: a rota fixa `transactional`. É de propósito —
 * deixar o operador escolher abriria o caminho de mandar "novidades" como
 * transacional e escapar da supressão por opt-in, exatamente o que a fila
 * existe para impedir.
 */
export interface AdhocEmailBody {
  organizationId: string;
  /** Sobrescreve o destinatário padrão (o admin mais antigo da organização). */
  toEmail?: string;
  subject: string;
  htmlBody: string;
  reason: string;
}

/** `POST /admin/email/send` responde 201 com a mensagem ENFILEIRADA, não enviada. */
export interface AdhocEmailResponse {
  message: { id: string; status: string };
}

// ─── Métricas ────────────────────────────────────────────────────────────────
//
// ⚠️ ESTA SEÇÃO ESPELHA `apps/api/src/services/admin-metrics.service.ts`, campo
// a campo e nome a nome. O que existia aqui antes era um contrato provisório
// escrito antes do serviço, e ele divergia em três eixos, do menos para o mais
// grave:
//
//   1. NOMES — `annual_mix`/`screens_per_account` em snake_case contra
//      `yearlyMix`/`screensPerPaidAccount`. Divergência barulhenta: `undefined`
//      na tela, alguém percebe no primeiro teste.
//   2. SEMÁFORO — `'green' | 'yellow' | 'red' | 'unknown'` contra o que o
//      servidor manda de fato: `'verde' | 'amarelo' | 'vermelho'`, e `null`
//      (não `'unknown'`) quando não há como classificar.
//   3. UNIDADE — e este é o defeito silencioso. O contrato antigo dizia que a
//      taxa vinha em PONTOS PERCENTUAIS (9 = 9%). A API manda RAZÃO: `0.09` é
//      9% e `0.7` é 70%. Com o tipo mentindo, a tela imprimia "0,09%" para uma
//      conversão de 9% e "0,7%" para um mix anual de 70% — números plausíveis,
//      catastroficamente errados e sem nenhum sinal de defeito: o painel
//      passaria a gritar "corte a mídia" exatamente na semana em que o negócio
//      está no verde. Por isso cada leitura carrega o campo `unit`, e a tela
//      formata POR `unit`, nunca adivinhando pelo nome do indicador.
//
// REGRA DE DINHEIRO (US-A-05), herdada do serviço: `*CashCents` é CAIXA (o
// ciclo inteiro; no anual, os 12 meses de uma vez) e `*MrrCents` é MENSAL
// EQUIVALENTE. São recortes diferentes do MESMO dinheiro e nunca se somam —
// somar conta a mesma venda duas vezes, e trocar um pelo outro foi o que fez o
// painel exibir R$ 117 onde tinham entrado R$ 1.404.

/**
 * O relatório do funil de checkout vem ANINHADO dentro do funil da plataforma
 * (`PlatformFunnel.checkoutDetail`) — é literalmente o mesmo objeto que a rota
 * do funil já servia. Por isso o tipo é importado de `types.ts` em vez de
 * redeclarado: uma segunda cópia da mesma forma diverge no primeiro campo novo,
 * e a divergência apareceria como "as duas telas do funil não batem" sem que
 * ninguém soubesse qual das duas está certa.
 */
import type { CheckoutMetrics } from './types';

/** Semáforo COMO O SERVIDOR MANDA: em português. `null` = não classificável. */
export type Semaforo = 'verde' | 'amarelo' | 'vermelho';

/** As cinco chaves da estratégia, em camelCase, iguais às do serviço. */
export type IndicatorKey =
  | 'costPerConversation'
  | 'conversationToSale'
  | 'cacCash'
  | 'yearlyMix'
  | 'screensPerPaidAccount';

/**
 * `cents` = dinheiro em centavos; `ratio` = fração 0–1 (0.09 é 9%);
 * `screens` = quantidade média de telas.
 *
 * É este campo — e não o nome do indicador — que decide a formatação na tela.
 * Decidir por nome funciona até alguém acrescentar o sexto indicador, e aí o
 * número novo sai numa unidade errada sem quebrar nada.
 */
export type IndicatorUnit = 'cents' | 'ratio' | 'screens';

/** `lower`: menor é melhor (custo). `higher`: maior é melhor (taxa, mix). */
export type IndicatorDirection = 'lower' | 'higher';

/**
 * A régua do indicador. Vem do servidor de propósito: os limites moram no
 * documento de estratégia e já mudaram uma vez (teto de CAC de R$ 560 para
 * R$ 374). Uma segunda cópia aqui envelheceria em silêncio, e o painel
 * continuaria pintando de verde um CAC que a estratégia já reprova.
 */
export interface IndicatorBand {
  label: string;
  unit: IndicatorUnit;
  direction: IndicatorDirection;
  /** Na unidade do indicador: centavos, razão 0–1 ou telas. */
  green: number;
  yellow: number;
}

/**
 * Uma leitura semanal já classificada pelo servidor.
 *
 * `value: null` com `reason` preenchido é estado de primeira classe, não erro:
 * semana sem gasto de mídia informado não é "CAC zero". Zero se lê como
 * campanha de graça — a leitura que faz alguém aumentar orçamento na pior hora.
 */
export interface IndicatorReading {
  key: IndicatorKey;
  label: string;
  unit: IndicatorUnit;
  /** `null` quando não há como calcular — NUNCA zero. Ver `reason`. */
  value: number | null;
  /** `null` acompanha `value: null`. Sem dado não é verde por omissão. */
  status: Semaforo | null;
  reason: string | null;
  band: { direction: IndicatorDirection; green: number; yellow: number };
}

/** Funil ponta a ponta, tudo do mesmo banco. */
export interface PlatformFunnel {
  period: { startDate: string; endDate: string };
  /** Contagem PRÓPRIA (`SiteVisit`), sem cookie. Não bate com o GA4, e não deve. */
  visits: { views: number; uniques: number };
  leads: number;
  checkout: {
    started: number;
    identified: number;
    paymentPending: number;
    paid: number;
    abandoned: number;
    expired: number;
  };
  /**
   * Frações entre etapas, em RAZÃO 0–1. `null` quando o denominador é zero — e
   * `null` não é "0%": a taxa não existe, e imprimir zero faria uma etapa sem
   * denominador medido parecer um resultado ruim.
   */
  rates: {
    visitToLead: number | null;
    leadToCheckout: number | null;
    checkoutToPaid: number | null;
    visitToPaid: number | null;
  };
  checkoutDetail: CheckoutMetrics;
}

export interface RevenueOverview {
  period: { startDate: string; endDate: string };
  currency: 'BRL';
  /** MENSAL EQUIVALENTE das assinaturas ativas de plano pago. */
  mrrCents: number;
  /** CAIXA confirmado no período. Ciclo inteiro — no anual, os 12 meses. */
  cashInPeriodCents: number;
  cashInPeriodByInterval: Record<BillingInterval, { payments: number; cashCents: number }>;
  payingAccounts: number;
  payingByPlan: Array<{
    planCode: string;
    planName: string;
    accounts: number;
    mrrCents: number;
    yearlyAccounts: number;
  }>;
  /** RAZÃO 0–1 das contas pagas no anual. `null` sem conta paga — não zero. */
  yearlyMixRate: number | null;
  screensPerPayingAccount: {
    /** Telas efetivamente vinculadas. */
    linked: number | null;
    /** Telas FATURADAS — respeita o piso `minScreens` do plano. */
    billed: number | null;
  };
  churn: {
    canceledInPeriod: number;
    /** ESTIMATIVA (`ativas hoje + canceladas`): não há histórico de status. */
    activeAtPeriodStart: number;
    /** RAZÃO 0–1. `null` sem base para comparar. */
    rate: number | null;
  };
  upcomingRenewals: {
    horizonDays: number;
    count: number;
    /** O que será COBRADO (ciclo inteiro). */
    cashCents: number;
    /** O MESMO dinheiro em mensal equivalente. Nunca some com o de cima. */
    mrrCents: number;
    byInterval: Record<BillingInterval, { count: number; cashCents: number }>;
  };
}

/** Uma semana da coorte. Segunda a domingo, e toda semana do período aparece. */
export interface WeeklyCohort {
  /** Segunda-feira, `YYYY-MM-DD`. */
  weekStart: string;
  /** Domingo, `YYYY-MM-DD`. */
  weekEnd: string;
  /**
   * `null` = NENHUMA linha de gasto lançada na semana. Distinto de `0`, que
   * seria "rodou campanha sem custo". A tela tem de mostrar o texto e o caminho
   * de conserto — nunca zero, nunca barra vazia.
   */
  adSpendCents: number | null;
  adSpendByChannel: Array<{ channel: string; amountCents: number }>;
  /** PROXY declarado: `Lead` criado na semana. Não há integração de WhatsApp. */
  conversations: number;
  sales: number;
  /** CAIXA das vendas da semana (ciclo inteiro). */
  salesCashCents: number;
  yearlySales: number;
  indicators: IndicatorReading[];
}

export interface IndicatorsReport {
  period: { startDate: string; endDate: string };
  /** A régua de cada indicador, para a tela desenhar a meta ao lado do número. */
  bands: Record<IndicatorKey, IndicatorBand>;
  weeks: WeeklyCohort[];
}

/**
 * Uma linha da tabela de origem.
 *
 * `paidCashCents` e `paidMrrCents` são as MESMAS vendas em duas leituras. Somar
 * as duas colunas conta cada venda duas vezes; trocar uma pela outra subestima
 * o caixa em 12× no anual. Exiba as duas, cada uma com o seu rótulo.
 */
export interface SourceRow {
  utmSource: string;
  utmCampaign: string;
  visits: number;
  uniqueVisits: number;
  leads: number;
  paid: number;
  paidCashCents: number;
  paidMrrCents: number;
}

export interface SourcesReport {
  period: { startDate: string; endDate: string };
  /** Agregado por `utmSource` — a campanha vem colapsada como `(todas)`. */
  bySource: SourceRow[];
  /** Quebra fina `utmSource × utmCampaign`. */
  bySourceCampaign: SourceRow[];
}

/** `GET /admin/metrics/overview`. */
export interface PlatformOverview {
  period: { startDate: string; endDate: string };
  funnel: PlatformFunnel;
  revenue: RevenueOverview;
  indicators: IndicatorsReport;
  sources: SourcesReport;
}

// ─── Gasto de mídia (entrada manual) ─────────────────────────────────────────

/**
 * Lista FECHADA no servidor (`AD_SPEND_CHANNELS`), porque a chave única de
 * `AdSpend` é `(weekStart, channel)`: "Meta", "meta " e "facebook" criariam três
 * linhas para o mesmo dinheiro e o CAC da semana sairia dividido por três.
 */
export type AdSpendChannel = 'meta' | 'google' | 'outros';

/**
 * O que a LEITURA devolve. `channel` é `string`, não a união: a coluna é texto
 * no banco e uma linha antiga pode trazer um canal que já saiu do catálogo —
 * tipá-la como união faria o TypeScript prometer uma garantia que o dado não
 * tem, e a tela mostraria em branco em vez do valor que está lá.
 */
export interface AdSpendRow {
  id: string;
  /** Segunda-feira da semana, `YYYY-MM-DD` — já normalizada pelo servidor. */
  weekStart: string;
  channel: string;
  amountCents: number;
  note: string | null;
}

/**
 * O que a ESCRITA (`PUT`) aceita.
 *
 * `note` é `string | undefined`, e a ausência do `null` é deliberada: o schema
 * do servidor trata string vazia como ausente, mas `null` explícito NÃO passa
 * pela validação (`z.string().optional()` recusa `null`) e volta 400. O contrato
 * antigo mandava `null` quando o campo ficava em branco — ou seja, o caso mais
 * comum do formulário era justamente o que o servidor rejeitava.
 */
export interface AdSpendUpsertBody {
  /** Qualquer dia da semana medida: o servidor normaliza para a segunda-feira. */
  weekStart: string;
  channel: AdSpendChannel;
  /** Em CENTAVOS, inteiro. O servidor recusa acima de R$ 1.000.000 na semana. */
  amountCents: number;
  note?: string;
}
