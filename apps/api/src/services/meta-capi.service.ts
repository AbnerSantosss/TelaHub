import crypto from 'crypto';

/**
 * Conversions API do Meta — os mesmos eventos do Pixel, enviados pelo servidor.
 *
 * POR QUE EXISTE, se o Pixel do navegador já dispara tudo:
 *
 * 1. O Pixel perde eventos. Bloqueador de anúncio, ITP do Safari, aba fechada
 *    antes do disparo, celular ruim: a perda medida no mercado fica entre 10% e
 *    30%. Cada evento perdido é um sinal a menos para o algoritmo otimizar — e a
 *    campanha aprende com o que ela vê, não com o que aconteceu.
 * 2. O evento que mais importa aqui, `Purchase`, NÃO acontece no navegador. Quem
 *    confirma pagamento é o webhook do gateway, minutos depois, com a pessoa
 *    longe da tela. Sem servidor, a Meta nunca saberia quem pagou — que é
 *    exatamente o público de lookalike que faz a mídia fechar a conta.
 *
 * DEDUPLICAÇÃO: navegador e servidor mandam o MESMO evento. A Meta descarta a
 * cópia quando `event_name` e `event_id` coincidem. Por isso todo evento que
 * nasce no navegador carrega um `eventId` (uuid) que é repassado para cá. Se o
 * id não bater, a conversão conta DUAS vezes e todo o custo por resultado do
 * painel fica pela metade — o erro não avisa, só mente no relatório.
 *
 * PRIVACIDADE: o Meta exige identificador de pessoa, mas só aceita hash. Nada de
 * e-mail ou telefone em texto claro sai daqui: `sha256` sobre o valor
 * normalizado, como manda a documentação. IP e user-agent vão crus porque a
 * própria API os exige assim para casar a sessão — são os mesmos dados que o
 * navegador já entregaria ao carregar o Pixel.
 *
 * FALHA É SILENCIOSA DE PROPÓSITO: medir não pode derrubar vender. Se o Meta
 * estiver fora do ar, ou o token expirado, o cadastro e o pagamento seguem
 * normalmente e fica um aviso no log. Nunca lance a partir daqui.
 */

const GRAPH_VERSION = 'v21.0';

/** Eventos padrão do Meta que este produto usa, mais um próprio. */
export type MetaEventName =
  | 'PageView'
  | 'Lead'
  | 'CompleteRegistration'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'
  | 'Subscribe'
  /** Próprio: a TV foi conectada. É a ativação real do produto, não há padrão para ela. */
  | 'TelaPareada';

export interface MetaUserData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  /** CPF/CNPJ — vai como `external_id`, hasheado. */
  document?: string | null;
  /** Id interno da organização. Também vira `external_id`: casa conta com pessoa. */
  externalId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  /** Cookie `_fbc` do navegador, ou reconstruído a partir do `fbclid`. */
  fbc?: string | null;
  /** Cookie `_fbp` do navegador. */
  fbp?: string | null;
}

export interface MetaEventInput {
  eventName: MetaEventName;
  /** O MESMO id usado no `fbq(..., { eventID })` do navegador. Sem ele não há deduplicação. */
  eventId: string;
  /** Segundos desde a época. Padrão: agora. O Meta recusa evento com mais de 7 dias. */
  eventTime?: number;
  /** URL onde aconteceu. Obrigatório quando `action_source` é `website`. */
  sourceUrl?: string | null;
  /** `website` quando nasceu no navegador; `system_generated` quando é do webhook. */
  actionSource?: 'website' | 'system_generated';
  userData?: MetaUserData;
  /** Valor em REAIS (não centavos). No anual, o total dos 12 meses. */
  value?: number;
  currency?: string;
  contentIds?: string[];
  /** Qualquer campo extra de `custom_data` (plano, intervalo, telas). */
  custom?: Record<string, unknown>;
}

/** `true` quando há pixel e token configurados. Fora disso o serviço vira no-op. */
export function isMetaCapiEnabled(): boolean {
  return Boolean(process.env.META_PIXEL_ID && process.env.META_CAPI_ACCESS_TOKEN);
}

/**
 * sha256 do valor normalizado, como o Meta exige.
 *
 * Normalizar não é capricho: `Joao@Empresa.com ` e `joao@empresa.com` geram
 * hashes diferentes e viram duas pessoas distintas no público. Minúscula e
 * `trim` são o mínimo que a documentação pede.
 */
function hash(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return undefined;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/** Telefone: só dígitos, com DDI. Sem isso o casamento cai muito. */
function hashPhone(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return undefined;
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return crypto.createHash('sha256').update(withCountry).digest('hex');
}

/** Documento: só dígitos. */
function hashDocument(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return undefined;
  return crypto.createHash('sha256').update(digits).digest('hex');
}

function buildUserData(input: MetaUserData | undefined): Record<string, unknown> {
  if (!input) return {};

  // `external_id` aceita lista: mandar id da organização E documento aumenta a
  // chance de casar a mesma empresa entre uma sessão e outra.
  const externalIds = [hash(input.externalId), hashDocument(input.document)].filter(Boolean);

  const data: Record<string, unknown> = {
    em: hash(input.email),
    ph: hashPhone(input.phone),
    fn: hash(input.firstName),
    ln: hash(input.lastName),
    external_id: externalIds.length ? externalIds : undefined,
    client_ip_address: input.ip || undefined,
    client_user_agent: input.userAgent || undefined,
    fbc: input.fbc || undefined,
    fbp: input.fbp || undefined,
  };

  for (const key of Object.keys(data)) {
    if (data[key] === undefined) delete data[key];
  }

  return data;
}

/**
 * Monta o `_fbc` a partir do `fbclid` da URL.
 *
 * Quando alguém chega pelo anúncio, o `fbclid` vem na URL mas o cookie `_fbc` só
 * existe se o Pixel do navegador tiver carregado — e ele pode estar bloqueado,
 * que é justamente o caso em que a Conversions API precisa salvar o evento. O
 * formato é fixo: `fb.1.<timestamp em ms>.<fbclid>`.
 */
export function buildFbc(fbclid: string | null | undefined, createdAt?: Date): string | undefined {
  if (!fbclid) return undefined;
  const ms = (createdAt ?? new Date()).getTime();
  return `fb.1.${ms}.${fbclid}`;
}

/**
 * Envia um evento. Nunca lança: devolve `true` se o Meta aceitou.
 *
 * Não há fila nem repetição: um evento perdido custa um sinal, e uma fila
 * custaria uma peça de infraestrutura para manter. Quando houver volume que
 * justifique, o lugar certo é um job, não um retry dentro do caminho da compra.
 */
export async function sendMetaEvent(input: MetaEventInput): Promise<boolean> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    // Em desenvolvimento isso é o normal, não um defeito — por isso `debug`.
    if (process.env.NODE_ENV === 'production') {
      console.warn('[meta-capi] META_PIXEL_ID ou META_CAPI_ACCESS_TOKEN ausente; evento descartado:', input.eventName);
    }
    return false;
  }

  const actionSource = input.actionSource ?? 'website';

  const customData: Record<string, unknown> = { ...(input.custom ?? {}) };
  if (typeof input.value === 'number') {
    customData.value = Number(input.value.toFixed(2));
    customData.currency = input.currency ?? 'BRL';
  }
  if (input.contentIds?.length) {
    customData.content_ids = input.contentIds;
    customData.content_type = customData.content_type ?? 'product';
  }

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: input.eventName,
        event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: actionSource,
        // O Meta exige `event_source_url` quando a origem é `website`.
        event_source_url: actionSource === 'website' ? input.sourceUrl || undefined : undefined,
        user_data: buildUserData(input.userData),
        custom_data: Object.keys(customData).length ? customData : undefined,
      },
    ],
    access_token: accessToken,
  };

  // Só em validação. Em produção precisa ficar VAZIO: com o código preenchido, o
  // evento entra como teste e não otimiza campanha nenhuma — falha que não
  // aparece em lugar nenhum além do custo por resultado que não melhora.
  if (process.env.META_CAPI_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_CAPI_TEST_EVENT_CODE;
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`;

  try {
    const controller = new AbortController();
    // 4 s: é medição, não pode segurar a resposta de quem está comprando.
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn(`[meta-capi] ${input.eventName} recusado (${response.status}): ${body.slice(0, 400)}`);
      return false;
    }

    return true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`[meta-capi] ${input.eventName} falhou: ${reason}`);
    return false;
  }
}

/**
 * Dispara sem esperar. Use no caminho de quem está cadastrando ou pagando.
 *
 * A promessa é deliberadamente descartada com `void` e `catch` vazio: qualquer
 * exceção aqui já foi tratada dentro de `sendMetaEvent`, e uma rejeição não
 * capturada derrubaria o processo do Node por causa de uma métrica.
 */
export function sendMetaEventAsync(input: MetaEventInput): void {
  void sendMetaEvent(input).catch(() => undefined);
}

/** Gera um `event_id` quando o evento nasce no servidor e não veio do navegador. */
export function newEventId(): string {
  return crypto.randomUUID();
}
