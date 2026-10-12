/**
 * Cliente de `/api/admin/*` — o backoffice da plataforma.
 *
 * Separado de `admin/api.ts` (funil de checkout) porque são superfícies
 * distintas do servidor. O que as une é a sessão: mesmo JWT, mesma guarda de
 * `master` aplicada na raiz do router no backend.
 *
 * REGRA QUE ATRAVESSA O ARQUIVO: toda função que ESCREVE exige `reason`. Não é
 * validação de formulário — é o tipo. Ação administrativa sobre a conta de um
 * cliente é invisível para quem sofre o efeito, e sem o "por quê" gravado no
 * mesmo instante ninguém explica seis meses depois por que aquela conta está
 * num plano que nunca foi pago.
 */
import { ApiError, api } from '../lib/api';
import type {
  AdhocEmailBody,
  AdhocEmailResponse,
  AdminActionBody,
  AdSpendRow,
  AdSpendUpsertBody,
  AudiencePreviewResponse,
  AutomationKey,
  AutomationPreview,
  AutomationSaveBody,
  AutomationState,
  AutomationsResponse,
  Campaign,
  CampaignTestResponse,
  ChangePlanBody,
  ClienteDetail,
  ClienteFilters,
  ClientesResponse,
  CreateCampaignBody,
  EmailMessageDetail,
  EmailMessageFilters,
  EmailMessagesResponse,
  EmailQueueStatus,
  ExtendBody,
  LeadFilters,
  LeadsResponse,
  ManualPaymentBody,
  ManualPaymentResponse,
  OverrideBody,
  OverrideResponse,
  PaymentFilters,
  PaymentsResponse,
  PlatformOverview,
  RemoveOverrideResponse,
  RetryEventResponse,
  ScheduleCancelResponse,
  SendCampaignBody,
  SendCampaignResponse,
  SubscriptionActionResponse,
  UpdateCampaignBody,
  UpdateLeadBody,
  UpdateLeadResponse,
  WebhookFilters,
  WebhooksResponse,
} from './backoffice-types';

function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

const org = (id: string) => encodeURIComponent(id);

// ─── Clientes e assinaturas ──────────────────────────────────────────────────
//
// ⚠️ NENHUMA ação abaixo devolve o cliente inteiro. O contrato antigo dizia que
// todas devolviam `ClienteDetail`; o servidor devolve a ASSINATURA (e, no
// pagamento manual, o pagamento e a conferência com o catálogo). Quem adotasse
// essas respostas como "detalhe" apagaria da tela, no clique, o nome do
// cliente, os pagamentos, os usuários e a trilha. Depois de agir, a tela
// recarrega o detalhe — é o servidor que diz como a conta ficou.

export function fetchClientes(filters: ClienteFilters = {}): Promise<ClientesResponse> {
  return api.get<ClientesResponse>(`/admin/organizations${query({ ...filters })}`, true);
}

export function fetchClienteDetail(id: string): Promise<ClienteDetail> {
  return api.get<ClienteDetail>(`/admin/organizations/${org(id)}`, true);
}

/** Corta o acesso AGORA. A mais agressiva das ações — daí o motivo obrigatório. */
export function cancelSubscription(
  id: string,
  body: AdminActionBody
): Promise<SubscriptionActionResponse> {
  return api.post<SubscriptionActionResponse>(
    `/admin/organizations/${org(id)}/subscription/cancel`,
    body,
    true
  );
}

/**
 * Agenda o cancelamento para o fim do ciclo já pago.
 *
 * É esta, e não `cancelSubscription`, a ação correta em quase todo caso: cortar
 * na hora o acesso de quem já pagou o mês é cláusula abusiva (CDC art. 51, IV).
 *
 * A resposta traz `gatewayCanceled`: `false` significa que a assinatura foi
 * encerrada aqui e a recorrência do gateway CONTINUA cobrando. Ignorar esse
 * campo é como o cliente descobre o problema pela própria fatura.
 */
export function scheduleCancelSubscription(
  id: string,
  body: AdminActionBody
): Promise<ScheduleCancelResponse> {
  return api.post<ScheduleCancelResponse>(
    `/admin/organizations/${org(id)}/subscription/schedule-cancel`,
    body,
    true
  );
}

/**
 * Desfaz um cancelamento AGENDADO — e só isso.
 *
 * Não ressuscita assinatura já `canceled` (o servidor responde 409: para voltar
 * é preciso contratar de novo, com cobrança) nem tira ninguém de `past_due`
 * (quem reativa um inadimplente é pagamento confirmado). Prometer as duas
 * coisas na tela era o que fazia o operador clicar aqui e achar que resolveu.
 */
export function reactivateSubscription(
  id: string,
  body: AdminActionBody
): Promise<SubscriptionActionResponse> {
  return api.post<SubscriptionActionResponse>(
    `/admin/organizations/${org(id)}/subscription/reactivate`,
    body,
    true
  );
}

/**
 * Troca o plano SEM exigir pagamento confirmado.
 *
 * É o caminho do piloto com Pix manual: o dinheiro entrou por fora do gateway,
 * e alguém precisa refletir isso no sistema. Justamente por furar a guarda que
 * impede upgrade de graça, marca `gateway: 'manual'` e exige motivo.
 *
 * O corpo aceita SÓ `planCode` e `reason` — periodicidade aqui era descartada
 * em silêncio pelo Zod.
 */
export function changePlan(id: string, body: ChangePlanBody): Promise<SubscriptionActionResponse> {
  return api.post<SubscriptionActionResponse>(
    `/admin/organizations/${org(id)}/subscription/change-plan`,
    body,
    true
  );
}

export function extendPeriod(id: string, body: ExtendBody): Promise<SubscriptionActionResponse> {
  return api.post<SubscriptionActionResponse>(
    `/admin/organizations/${org(id)}/subscription/extend`,
    body,
    true
  );
}

/**
 * Registra um Pix recebido por fora do gateway e reativa a assinatura.
 *
 * Responde 201 com `expectedCycleCents` e `divergesFromCatalog`: é a única
 * defesa possível contra lançar o valor MENSAL num contrato anual, porque
 * nenhuma validação distingue R$ 468 de R$ 39 — os dois são inteiros positivos.
 * O operador confere um número, não uma regra; a tela precisa mostrá-lo.
 */
export function registerManualPayment(
  id: string,
  body: ManualPaymentBody
): Promise<ManualPaymentResponse> {
  return api.post<ManualPaymentResponse>(
    `/admin/organizations/${org(id)}/subscription/manual-payment`,
    body,
    true
  );
}

/** `PUT`: o corpo é o estado COMPLETO da concessão, não um remendo nela. */
export function saveOverride(id: string, body: OverrideBody): Promise<OverrideResponse> {
  return api.put<OverrideResponse>(`/admin/organizations/${org(id)}/override`, body, true);
}

/**
 * Remove a concessão. O motivo vai em `?reason=`, não no corpo.
 *
 * O servidor aceita os dois, e a escolha aqui não é gosto: `api.delete` não
 * manda corpo nenhum (ver `lib/api.ts`), então mandar o motivo "no body" era
 * mandar `undefined` — e a remoção voltava 400 "motivo obrigatório" sem o
 * operador ter como enviá-lo. Isso termina com alguém apagando a linha no
 * banco, sem trilha nenhuma.
 */
export function removeOverride(id: string, reason: string): Promise<RemoveOverrideResponse> {
  return api.delete<RemoveOverrideResponse>(
    `/admin/organizations/${org(id)}/override${query({ reason })}`,
    true
  );
}

/**
 * E-mail avulso para o contato da organização. Entra na FILA e fica no
 * histórico — não sai na hora, e a resposta diz exatamente isso (`status`
 * costuma ser `queued`).
 *
 * ⚠️ A rota que o contrato antigo chamava — `POST
 * /admin/organizations/:id/email` — NÃO EXISTE. O router de organizações não
 * tem nada de e-mail, então todo envio avulso batia num 404 do Express e o
 * operador via "não foi possível concluir a operação" sem pista nenhuma de que
 * o problema era o endereço, não o e-mail. A rota real é `POST
 * /admin/email/send`, e a organização vai NO CORPO, não no caminho.
 *
 * O destinatário padrão é o admin mais antigo da organização (quem criou a
 * conta); `toEmail` sobrescreve. O corpo escrito pelo operador entra no layout
 * do sistema — e-mail da plataforma sem a identidade da plataforma parece
 * phishing, e quem paga esse mal-entendido é o cliente.
 */
export function sendOrganizationEmail(
  organizationId: string,
  body: Omit<AdhocEmailBody, 'organizationId'>
): Promise<AdhocEmailResponse> {
  return api.post<AdhocEmailResponse>('/admin/email/send', { organizationId, ...body }, true);
}

// ─── Pagamentos e webhooks ───────────────────────────────────────────────────

/**
 * `GET /admin/payments` — o caixa da plataforma inteira.
 *
 * A resposta é `{ payments, pagination }` (não `{ rows, total }`), cada linha
 * traz a organização ANINHADA, e `status` é enum fechado: mandar um valor fora
 * de `pending|confirmed|refunded|failed|canceled` volta 400 com o detalhe.
 * "overdue", que a tela oferecia, não é status de pagamento nenhum aqui.
 */
export function fetchPayments(filters: PaymentFilters = {}): Promise<PaymentsResponse> {
  return api.get<PaymentsResponse>(`/admin/payments${query({ ...filters })}`, true);
}

/**
 * `GET /admin/payments/webhooks` — os avisos crus dos gateways.
 *
 * O caminho tem `/payments` no meio porque este router é montado ali; o plano
 * escrevia `/admin/webhooks`, que não existe. Resposta em `{ events, pagination }`,
 * e o status válido é `received|processed|ignored|failed` — "pending" é status
 * de PAGAMENTO e aqui derruba a listagem com 400.
 */
export function fetchWebhookEvents(filters: WebhookFilters = {}): Promise<WebhooksResponse> {
  return api.get<WebhooksResponse>(`/admin/payments/webhooks${query({ ...filters })}`, true);
}

/**
 * `POST /admin/payments/events/:id/retry` — recoloca na fila um evento do
 * OUTBOX DE CHECKOUT (`CheckoutEvent`) que morreu depois de 5 tentativas.
 *
 * ⚠️ Não é o mesmo `id` de um `WebhookEvent`: são tabelas diferentes, e o `id`
 * de um aviso do gateway aqui volta 404 "evento não encontrado". Os eventos que
 * esta rota reprocessa aparecem no detalhe da sessão de checkout, não na lista
 * de webhooks.
 *
 * O motivo é OBRIGATÓRIO no corpo (`retryEventSchema`): recolocar evento na
 * fila também é ação administrativa. O corpo vazio que a tela mandava voltava
 * 400.
 */
export function retryEvent(eventId: string, body: AdminActionBody): Promise<RetryEventResponse> {
  return api.post<RetryEventResponse>(
    `/admin/payments/events/${encodeURIComponent(eventId)}/retry`,
    body,
    true
  );
}

// ─── Leads ───────────────────────────────────────────────────────────────────

/** `GET /admin/leads` — resposta em `{ leads, pagination }`. */
export function fetchLeads(filters: LeadFilters = {}): Promise<LeadsResponse> {
  return api.get<LeadsResponse>(`/admin/leads${query({ ...filters })}`, true);
}

/**
 * `PATCH /admin/leads/:id` — move o lead na triagem.
 *
 * Devolve `{ lead }` com um `select` REDUZIDO: sem `utmSource`, `utmCampaign`
 * nem `referrer`. Trocar a linha da tabela por este objeto apagaria a coluna
 * "Origem" do lead recém-triado, e o operador acharia que perdeu a atribuição.
 *
 * `note` é aceito e vai para a trilha de auditoria — é opcional só aqui.
 */
export function updateLeadStatus(id: string, body: UpdateLeadBody): Promise<UpdateLeadResponse> {
  return api.patch<UpdateLeadResponse>(`/admin/leads/${encodeURIComponent(id)}`, body, true);
}

// ─── E-mail ──────────────────────────────────────────────────────────────────
//
// ⚠️ TODA rota de e-mail EMBRULHA a resposta. É aqui, e só aqui, que o envelope
// é desfeito — a tela recebe o dado. O contrato antigo tratava o embrulho como
// se fosse o dado: `{ campaigns: [...] }` chegava onde a tela esperava um
// array, `data.length` virava `undefined`, e a lista caía no estado vazio sem
// erro nenhum. Tela vazia com dado no banco é o pior defeito desta camada,
// porque parece funcionamento normal.

/**
 * Catálogo de gatilhos + estado + a LISTA DE VARIÁVEIS do template.
 *
 * É a única função de e-mail que devolve o envelope inteiro, de propósito: os
 * dois lados são usados. `variables` é a lista oficial de tokens
 * (`AUTOMATION_VARIABLES`), e usá-la em vez de uma cópia no código é o que
 * impede a tela de esconder um token novo — variável desconhecida não vira
 * erro, sai literal no e-mail do cliente.
 */
export function fetchAutomations(): Promise<AutomationsResponse> {
  return api.get<AutomationsResponse>('/admin/email/automations', true);
}

/**
 * Salva um gatilho. Motivo obrigatório: desligar o aviso de vencimento é uma
 * decisão que alguém vai precisar explicar seis meses depois.
 *
 * ⚠️ A resposta é a linha CRUA de `EmailAutomation` (`AutomationState`), sem
 * `label`, `trigger` nem os `default*` do catálogo. Substituir o item da lista
 * por ela apagaria o título do cartão recém-salvo; quem chama funde o estado
 * novo sobre o item antigo.
 */
export async function saveAutomation(
  key: AutomationKey,
  body: AutomationSaveBody
): Promise<AutomationState> {
  const { automation } = await api.put<{ automation: AutomationState }>(
    `/admin/email/automations/${encodeURIComponent(key)}`,
    body,
    true
  );
  return automation;
}

/**
 * Prévia do gatilho com os dados REAIS de uma organização.
 *
 * Substitui a prévia de exemplo que a tela montava sozinha, e não é preciosismo:
 * a tela só conhecia quatro dos seis tokens e não tinha como saber que
 * `{{valor}}` é o valor do CICLO (no anual, os 12 meses). O exemplo fixo
 * mostrava um número plausível e errado justamente no campo em que errar custa
 * caro — repetindo o defeito US-A-05 dentro do editor.
 *
 * Renderiza o template GRAVADO. Depois de editar sem salvar, a prévia mostra o
 * texto antigo — a tela avisa isso na cara do operador.
 */
export function previewAutomation(
  key: AutomationKey,
  organizationId: string
): Promise<AutomationPreview> {
  return api.post<AutomationPreview>(
    `/admin/email/automations/${encodeURIComponent(key)}/preview`,
    { organizationId },
    true
  );
}

/** `GET /campaigns` — envelope `{ campaigns }`. `status` filtra (texto livre). */
export async function fetchCampaigns(status?: string): Promise<Campaign[]> {
  const { campaigns } = await api.get<{ campaigns: Campaign[] }>(
    `/admin/email/campaigns${query({ status })}`,
    true
  );
  return campaigns;
}

/**
 * Uma campanha pelo id.
 *
 * ⚠️ NÃO EXISTE `GET /campaigns/:id` no servidor. O contrato antigo chamava
 * essa rota, e o Express casava o pedido com… nada: 404 em toda abertura do
 * editor. Como não posso criar rota, leio a listagem e escolho a linha — a
 * lista já vem inteira (`findMany` sem paginação) e é o mesmo objeto que a
 * rota devolveria.
 *
 * 404 explícito quando não acha: devolver `null` faria o editor abrir em branco
 * como se fosse uma campanha nova e o primeiro "salvar" criaria uma SEGUNDA
 * campanha, com o operador achando que editou a primeira.
 */
export async function fetchCampaign(id: string): Promise<Campaign> {
  const campaigns = await fetchCampaigns();
  const campaign = campaigns.find((item) => item.id === id);
  if (!campaign) throw new ApiError('Campanha não encontrada.', 404);
  return campaign;
}

/** `POST /campaigns` → 201 `{ campaign }`. `reason` obrigatório (400 sem ele). */
export async function createCampaign(body: CreateCampaignBody): Promise<Campaign> {
  const { campaign } = await api.post<{ campaign: Campaign }>(
    '/admin/email/campaigns',
    body,
    true
  );
  return campaign;
}

/**
 * `PUT /campaigns/:id` → `{ campaign }`. `reason` obrigatório.
 *
 * O corpo é `UpdateCampaignBody`, e não `Partial<Campaign>`: a linha lida traz
 * `id`, `status` e os contadores, e o Zod descarta chave desconhecida em
 * SILÊNCIO. Mandar a linha de volta parecia funcionar e não gravava nada além
 * dos campos previstos — em particular, `status: 'scheduled'` era ignorado e o
 * agendamento nunca acontecia. Quem agenda é `scheduledAt`.
 *
 * Recusado com 400 depois de `sending`/`sent`: o corpo gravado é a prova do que
 * a base recebeu.
 */
export async function updateCampaign(id: string, body: UpdateCampaignBody): Promise<Campaign> {
  const { campaign } = await api.put<{ campaign: Campaign }>(
    `/admin/email/campaigns/${encodeURIComponent(id)}`,
    body,
    true
  );
  return campaign;
}

/**
 * Conta o público ANTES de enviar. Resposta `{ audience, total, optedIn,
 * withoutOptIn }` — nunca `{ recipients, suppressed }`, que não existem.
 *
 * O corpo vai VAZIO de propósito, embora a rota aceite um público avulso para
 * simular filtros sem salvar. A razão é que quem envia é `send()`, e `send()`
 * lê o público GRAVADO na campanha: contar um recorte que não está salvo daria
 * um número que autoriza um disparo para outra lista. A contagem tem que
 * descrever exatamente o que vai sair — por isso a tela obriga a salvar antes
 * de contar, e invalida a contagem quando o filtro muda.
 */
export function previewAudience(id: string): Promise<AudiencePreviewResponse> {
  return api.post<AudiencePreviewResponse>(
    `/admin/email/campaigns/${encodeURIComponent(id)}/preview-audience`,
    {},
    true
  );
}

/** Teste para um endereço do operador. Vai como transacional e não conta nos contadores. */
export function sendCampaignTest(id: string, email: string): Promise<CampaignTestResponse> {
  return api.post<CampaignTestResponse>(
    `/admin/email/campaigns/${encodeURIComponent(id)}/test`,
    { email },
    true
  );
}

/**
 * Dispara a campanha. Devolve `{ queued }` — quantas mensagens entraram na
 * fila —, NUNCA a campanha (o contrato antigo prometia `Campaign`, e adotar a
 * resposta como campanha apagaria nome, assunto e contadores da tela).
 *
 * ⚠️ Campanha com `scheduledAt` no futuro é RECUSADA com 400 a menos que venha
 * `sendNow: true`. Isso NÃO é falha de envio: é o servidor dizendo que ela sai
 * sozinha na data marcada. Quem chama precisa tratar esse 400 como informação,
 * e o caminho de agendar não passa por aqui — agendar é `updateCampaign` com
 * `scheduledAt`, e só. Antes desta guarda, "agendar para sexta" e "mandar
 * agora" eram a mesma chamada e a campanha agendada saía no ato para a base
 * inteira, com a tela confirmando "agendada".
 */
export function sendCampaign(id: string, body: SendCampaignBody): Promise<SendCampaignResponse> {
  return api.post<SendCampaignResponse>(
    `/admin/email/campaigns/${encodeURIComponent(id)}/send`,
    body,
    true
  );
}

/**
 * Histórico. Envelope `{ total, messages }`, e a paginação é `limit`/`offset`.
 *
 * O `page` do contrato antigo não existe no `messagesQuerySchema`, que termina
 * em `.catch(() => ({}))`: parâmetro desconhecido é descartado sem 400. Trocar
 * de página devolvia exatamente a mesma primeira página, silenciosamente.
 */
export function fetchEmailMessages(
  filters: EmailMessageFilters = {}
): Promise<EmailMessagesResponse> {
  return api.get<EmailMessagesResponse>(`/admin/email/messages${query({ ...filters })}`, true);
}

/**
 * Uma mensagem inteira, COM o corpo. A listagem omite `htmlBody` (200 linhas ×
 * 50 KB de HTML por página), então é por aqui que se lê o que de fato saiu —
 * a única resposta possível para "o e-mail chegou torto".
 */
export async function fetchEmailMessage(id: string): Promise<EmailMessageDetail> {
  const { message } = await api.get<{ message: EmailMessageDetail }>(
    `/admin/email/messages/${encodeURIComponent(id)}`,
    true
  );
  return message;
}

/**
 * Devolve uma falha para a fila. `reason` é OBRIGATÓRIO (`retryMessageSchema`):
 * o corpo vazio que a tela mandava voltava 400 em todo clique, e o botão
 * "Reenviar" nunca reenviou nada.
 *
 * Só `failed` e `bounced` voltam para a fila; `suppressed` responde 409 de
 * propósito — aquilo não é falha, é alguém que não consentiu, e reenfileirar
 * seria burlar a supressão pelo botão de reenviar.
 */
export async function retryEmailMessage(
  id: string,
  body: AdminActionBody
): Promise<EmailMessageDetail> {
  const { message } = await api.post<{ message: EmailMessageDetail }>(
    `/admin/email/messages/${encodeURIComponent(id)}/retry`,
    body,
    true
  );
  return message;
}

/**
 * Retrato da fila. Resposta CRUA, sem envelope.
 *
 * Responde a pergunta que o histórico sozinho não responde: a mensagem está
 * parada porque o envio falhou, ou porque a fila inteira não anda? Sem SMTP
 * configurado a varredura nem começa e tudo fica `queued` para sempre — sem
 * erro em lugar nenhum, que é exatamente o desenho da fila.
 */
export function fetchEmailQueueStatus(): Promise<EmailQueueStatus> {
  return api.get<EmailQueueStatus>('/admin/email/queue', true);
}

// ─── Métricas ────────────────────────────────────────────────────────────────

/**
 * `GET /admin/metrics/overview` — funil, receita, indicadores e origem de uma vez.
 *
 * Os nomes dos parâmetros são `startDate`/`endDate` (`metricsPeriodQuerySchema`),
 * e o período é OPCIONAL: sem nada, o serviço usa os últimos 30 dias. O padrão
 * mora lá de propósito — se a tela mandasse o dela, o mesmo relatório teria
 * intervalos diferentes conforme quem perguntou.
 *
 * Datas em ISO. Parâmetro que o servidor não entende volta 400 com o detalhe,
 * e não um relatório de um intervalo qualquer: número errado sem aviso é pior
 * que tela de erro.
 */
export function fetchOverview(range: { startDate?: string; endDate?: string } = {}): Promise<PlatformOverview> {
  return api.get<PlatformOverview>(`/admin/metrics/overview${query({ ...range })}`, true);
}

/**
 * `GET /admin/metrics/ad-spend` — o que já foi lançado no período.
 *
 * O servidor filtra pela SEMANA que contém as bordas do intervalo, não pelo dia:
 * pedir "10 a 20 de setembro" traz também a linha da semana que começa no dia 8.
 * Sem isso, uma semana com gasto lançado apareceria como "sem gasto informado"
 * só porque a segunda-feira dela caiu fora do recorte.
 */
export function fetchAdSpend(range: { startDate?: string; endDate?: string } = {}): Promise<AdSpendRow[]> {
  return api.get<AdSpendRow[]>(`/admin/metrics/ad-spend${query({ ...range })}`, true);
}

/**
 * `PUT /admin/metrics/ad-spend` — lança ou SUBSTITUI o gasto de uma semana e canal.
 *
 * `PUT`, e a idempotência é a razão: a chave é `(weekStart, channel)`, então
 * gravar duas vezes corrige o valor em vez de somar duas linhas. Com `POST`
 * criando, dois cliques dobrariam o gasto da semana — e um CAC dobrado passa por
 * resultado ruim, não por erro de digitação.
 *
 * O corpo é `AdSpendUpsertBody`, e não a linha lida: a resposta traz `id`, que a
 * escrita não manda, e `note` aqui não aceita `null` (o servidor rejeita `null`
 * com 400 — omitir é a forma de dizer "sem observação").
 */
export function saveAdSpend(body: AdSpendUpsertBody): Promise<AdSpendRow> {
  return api.put<AdSpendRow>('/admin/metrics/ad-spend', body, true);
}
