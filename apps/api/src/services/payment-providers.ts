import crypto from 'crypto';

import { asaasProvider, isAsaasConfigured } from './asaas.provider';

// ─────────────────────────────────────────────────────────────────────────────
// PROVEDORES DE PAGAMENTO
//
// Mesma estratégia já usada em `email-providers.ts`: um registro de provedores
// atrás de UMA interface, para que trocar de gateway seja acrescentar um
// arquivo — não reescrever o fluxo de checkout.
//
// Isso é o princípio Aberto/Fechado aplicado onde ele realmente paga: o dia em
// que o Asaas entrar, `checkout.service` e as rotas não mudam. Quem muda é a
// variável `PAYMENT_PROVIDER`. Se o fluxo tivesse `if (pix) ... else if (card)`
// espalhado, cada gateway novo mexeria no caminho do dinheiro — que é
// exatamente o código onde uma regressão custa mais caro.
//
// ⚠️ IMPLEMENTADOS: `simulado` e `asaas` (2026-09-05). Os demais continuam só
// declarados em `PLANNED_PROVIDERS`, de propósito: o catálogo serve para a
// escolha ser explícita e para ninguém achar que "está integrado" porque o
// nome aparece numa lista. Ver `payment.service.ts` para o ponto de encaixe.
//
// A seta de import é de MÃO ÚNICA: este arquivo importa `asaas.provider`, e o
// provedor só importa TIPOS daqui de volta. Um import de valor na volta
// fecharia um ciclo de CommonJS e deixaria metade dos símbolos `undefined`
// conforme a ordem de carga — falha que só aparece em produção.
// ─────────────────────────────────────────────────────────────────────────────

/** Métodos que o produto oferece. `boleto`/`transfer` existem no schema mas não são oferecidos. */
export type PaymentMethod = 'pix' | 'credit_card';

export const OFFERED_METHODS: PaymentMethod[] = ['pix', 'credit_card'];

/** Dados de cartão que o front envia. NUNCA são persistidos (ver `payment.service`). */
export interface CardInput {
  /** Só dígitos. */
  number: string;
  holder: string;
  /** MM/AA ou MM/AAAA. */
  expiry: string;
  cvv: string;
}

export interface CreateChargeInput {
  method: PaymentMethod;
  amountCents: number;
  /** Descrição que aparece na fatura/extrato. */
  description: string;
  payer: { name: string; email: string; document: string | null };
  card?: CardInput;
}

/**
 * Cobrança criada no provedor.
 *
 * `status` é o do PROVEDOR, não o da sessão. `pending` é o normal no Pix (a
 * pessoa ainda vai pagar); `approved` é o normal no cartão (autoriza na hora).
 * Quem traduz isso para o estado da sessão é o `payment.service`.
 */
export interface ProviderCharge {
  providerKey: string;
  chargeId: string;
  status: 'pending' | 'approved' | 'declined';
  /** Preenchido no Pix: é o que a tela precisa desenhar. */
  pix?: {
    /** Payload "copia e cola" (BR Code). */
    copyPaste: string;
    /** Imagem do QR em data URI, para o front não precisar de biblioteca. */
    qrCodeDataUri: string;
    expiresAt: string;
  };
  /** Preenchido no cartão. */
  card?: {
    brand: string;
    last4: string;
  };
  /** Motivo, quando `declined`. */
  declineReason?: string;
  /**
   * Ids da recorrência criada no gateway, quando houve uma. Sobem até
   * `Subscription.gateway*` pelo metadado do evento `paid` — sem eles, a conta
   * não sabe qual assinatura do gateway é dela e ninguém consegue cancelar.
   */
  gatewayCustomerId?: string;
  gatewaySubscriptionId?: string;
}

/** Cobrança RECORRENTE: a mesma coisa, mais o intervalo do ciclo. */
export interface CreateSubscriptionChargeInput extends CreateChargeInput {
  /** `amountCents` acima é o CAIXA DO CICLO — no anual, os 12 meses. */
  interval: 'monthly' | 'yearly';
  /** Nosso id (sessão de checkout), para conciliar dos dois lados. */
  externalReference?: string | null;
}

export interface PaymentProvider {
  key: string;
  label: string;
  /** `false` = declarado no catálogo, sem implementação. Tentar usar é erro explícito. */
  implemented: boolean;
  methods: PaymentMethod[];
  /**
   * `true` quando o provedor NÃO cobra de verdade. É o que impede uma
   * simulação de rodar em produção por descuido (ver `resolveProvider`).
   */
  simulated: boolean;
  createCharge(input: CreateChargeInput): Promise<ProviderCharge>;
  /**
   * OPCIONAL. Quando o provedor implementa, o checkout cria RECORRÊNCIA em vez
   * de cobrança avulsa — e é isso que faz o segundo mês ser cobrado.
   *
   * É opcional de propósito: o provedor simulado não tem recorrência, e obrigar
   * todo provedor a ter uma quebraria o simulado sem ganho nenhum. Quem não
   * implementa cai em `createCharge` e cobra UMA VEZ SÓ — honesto numa
   * simulação, desastroso num gateway real. Todo provedor que cobre de verdade
   * precisa implementar isto antes de entrar em `IMPLEMENTED`.
   */
  createSubscriptionCharge?(input: CreateSubscriptionChargeInput): Promise<ProviderCharge>;
}

// ─── Provedor simulado ───────────────────────────────────────────────────────

/** Bandeira a partir do primeiro dígito — suficiente para exibir na tela. */
function brandOf(number: string): string {
  if (/^4/.test(number)) return 'Visa';
  if (/^5[1-5]/.test(number)) return 'Mastercard';
  if (/^3[47]/.test(number)) return 'American Express';
  if (/^6/.test(number)) return 'Elo';
  return 'Cartão';
}

/**
 * Luhn — o mesmo algoritmo que qualquer gateway roda antes de mandar para a
 * bandeira. Implementado aqui para que a SIMULAÇÃO recuse número inválido: um
 * simulador que aprova qualquer coisa treina a equipe a confiar num caminho
 * feliz que não existe, e a primeira recusa real vira surpresa em produção.
 */
export function isValidCardNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * QR Code como SVG em data URI.
 *
 * Não é um QR Code legível de verdade — é um desenho determinístico a partir do
 * payload, só para a tela ter o que mostrar. Gerar QR real exigiria uma
 * dependência nova que o gateway de verdade vai substituir de qualquer forma
 * (todos devolvem o QR pronto). O texto embutido diz que é simulação, para
 * ninguém tentar pagar apontando o celular.
 */
function fakeQrSvg(payload: string): string {
  const hash = crypto.createHash('sha256').update(payload).digest();
  const cells = 21;
  const rects: string[] = [];

  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const bit = hash[(y * cells + x) % hash.length] >> (x % 8);
      // Cantos: os três marcadores de posição de um QR real.
      const inFinder =
        (x < 7 && y < 7) || (x >= cells - 7 && y < 7) || (x < 7 && y >= cells - 7);
      const on = inFinder
        ? x === 0 || y === 0 || x === 6 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4)
          ? true
          : false
        : (bit & 1) === 1;
      if (on) rects.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cells} ${cells}" shape-rendering="crispEdges">` +
    `<rect width="${cells}" height="${cells}" fill="#fff"/><g fill="#000">${rects.join('')}</g></svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/** Minutos de validade do Pix simulado. */
const PIX_EXPIRY_MINUTES = 30;

export const simulatedProvider: PaymentProvider = {
  key: 'simulado',
  label: 'Simulado (sem cobrança real)',
  implemented: true,
  simulated: true,
  methods: OFFERED_METHODS,

  async createCharge(input: CreateChargeInput): Promise<ProviderCharge> {
    const chargeId = `sim_${crypto.randomBytes(12).toString('hex')}`;

    if (input.method === 'pix') {
      const payload = `00020126SIMULADO-${chargeId}-${input.amountCents}`;
      return {
        providerKey: this.key,
        chargeId,
        // Pix nasce pendente: a confirmação é um passo separado, igual ao real.
        status: 'pending',
        pix: {
          copyPaste: payload,
          qrCodeDataUri: fakeQrSvg(payload),
          expiresAt: new Date(Date.now() + PIX_EXPIRY_MINUTES * 60_000).toISOString(),
        },
      };
    }

    const number = (input.card?.number ?? '').replace(/\D/g, '');

    if (!isValidCardNumber(number)) {
      return {
        providerKey: this.key,
        chargeId,
        status: 'declined',
        declineReason: 'Número de cartão inválido.',
      };
    }

    // Regra de teste combinada: cartão terminado em 0000 é RECUSADO. Existe
    // para o caminho de falha ser demonstrável sem depender de sandbox de
    // gateway — sem isso, ninguém exercita a tela de recusa até produção.
    if (number.endsWith('0000')) {
      return {
        providerKey: this.key,
        chargeId,
        status: 'declined',
        declineReason: 'Cartão recusado pelo emissor (cartão de teste de recusa).',
      };
    }

    return {
      providerKey: this.key,
      chargeId,
      // Cartão autoriza na hora — é o que justifica o selo de acesso imediato.
      status: 'approved',
      card: { brand: brandOf(number), last4: number.slice(-4) },
    };
  },
};

// ─── Provedores reais (declarados, NÃO implementados) ────────────────────────

/**
 * Catálogo dos gateways avaliados para o mercado brasileiro, com o que a
 * pesquisa de mercado apurou. Não implementados — a entrada aqui existe para
 * que a escolha seja consciente e para guardar o porquê de cada um.
 */
export interface PlannedProvider {
  key: string;
  label: string;
  methods: PaymentMethod[];
  /** O que pesa a favor/contra, da pesquisa de gateways. */
  note: string;
}

export const PLANNED_PROVIDERS: PlannedProvider[] = [
  {
    key: 'mercadopago',
    label: 'Mercado Pago',
    methods: ['pix', 'credit_card'],
    note: 'Aceita CPF e tem a maior familiaridade do público. Taxas maiores no cartão.',
  },
  {
    key: 'pagarme',
    label: 'Pagar.me',
    methods: ['pix', 'credit_card'],
    note: 'Boa API de assinatura. Exige CNPJ.',
  },
  {
    key: 'stripe',
    label: 'Stripe Brasil',
    methods: ['credit_card'],
    note: 'Melhor DX, mas Pix limitado no Brasil e exige CNPJ.',
  },
];

const IMPLEMENTED: Record<string, PaymentProvider> = {
  [simulatedProvider.key]: simulatedProvider,
  [asaasProvider.key]: asaasProvider,
};

/** Erro de configuração de pagamento — a rota traduz para 5xx/4xx. */
export class PaymentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentConfigError';
  }
}

/**
 * Provedor ativo, a partir de `PAYMENT_PROVIDER` (padrão: `simulado`).
 *
 * ── A trava que importa ─────────────────────────────────────────────────────
 * Um provedor SIMULADO recusa-se a rodar quando `NODE_ENV=production`, a menos
 * que `ALLOW_SIMULATED_PAYMENTS=true` seja dito explicitamente.
 *
 * Isto não é zelo excessivo. O caminho de pagamento deste produto TERMINA
 * criando conta com assinatura ativa (`checkout-handlers/paid.handler.ts`) —
 * ou seja, uma simulação que vaze para produção não gera só um registro
 * errado: ela libera acesso pago de graça, para qualquer um que descubra a
 * URL. É a mesma razão pela qual `POST /api/billing/checkout` responde 501 com
 * um teste fixando o comportamento: impedir que alguém "destrave" o fluxo
 * simulando aprovação.
 */
export function resolveProvider(): PaymentProvider {
  const key = (process.env.PAYMENT_PROVIDER || simulatedProvider.key).trim().toLowerCase();
  const provider = IMPLEMENTED[key];

  if (!provider) {
    const planned = PLANNED_PROVIDERS.find((p) => p.key === key);
    throw new PaymentConfigError(
      planned
        ? `Provedor de pagamento "${key}" está previsto mas ainda não foi implementado. ` +
          `Use PAYMENT_PROVIDER=simulado enquanto a integração não existir.`
        : `Provedor de pagamento "${key}" é desconhecido. Provedores implementados: ${Object.keys(IMPLEMENTED).join(', ')}.`
    );
  }

  // Provedor real declarado mas SEM chave é pior que provedor inexistente: ele
  // passaria por todas as guardas e só falharia na hora de criar a cobrança,
  // com a pessoa já na tela de pagamento. Falha aqui, na resolução, para o
  // checkout cair no caminho de contato comercial como qualquer outro erro de
  // configuração.
  if (provider.key === asaasProvider.key && !isAsaasConfigured()) {
    throw new PaymentConfigError(
      'PAYMENT_PROVIDER=asaas está selecionado, mas ASAAS_API_KEY não foi configurada. ' +
        'Defina a chave (sandbox ou produção) ou volte para PAYMENT_PROVIDER=simulado.'
    );
  }

  if (provider.simulated && process.env.NODE_ENV === 'production') {
    const allowed = process.env.ALLOW_SIMULATED_PAYMENTS === 'true';
    if (!allowed) {
      throw new PaymentConfigError(
        'Pagamento SIMULADO está bloqueado em produção: ele libera acesso pago sem cobrança real. ' +
          'Configure um provedor real em PAYMENT_PROVIDER ou, se esta instância é uma demonstração ' +
          'consciente, defina ALLOW_SIMULATED_PAYMENTS=true.'
      );
    }
  }

  return provider;
}

/** `true` quando o provedor ativo não cobra de verdade — o front avisa o usuário. */
export function isSimulatedActive(): boolean {
  try {
    return resolveProvider().simulated;
  } catch {
    return false;
  }
}

/**
 * Avisa no boot quando a configuração de pagamento não permite cobrar.
 *
 * ── Correção de rumo (2026-07-31), registrada porque a primeira versão estava
 *    errada e o motivo importa ────────────────────────────────────────────────
 *
 * A primeira implementação desta função MATAVA o processo (`process.exit(1)`)
 * em produção com provedor simulado, seguindo o padrão de
 * `auth.service.ts::assertJwtSecretIsSafe`. O raciocínio era "melhor não subir
 * do que subir vendendo de graça".
 *
 * O raciocínio estava incompleto: **este backend também serve o Player**. Um
 * erro de configuração de PAGAMENTO derrubaria as TVs de todos os clientes —
 * exatamente o problema que o produto existe para resolver, e que a página de
 * vendas promete evitar. A cura era pior que a doença, e desproporcional: o
 * risco a conter é "conta paga liberada de graça", não "checkout indisponível".
 *
 * O desenho atual contém o risco sem colateral: `resolveProvider()` continua
 * recusando o provedor simulado em produção, então TODAS as rotas de cobrança
 * respondem 503 e `/simulate-payment` fica inalcançável — nenhuma conta é
 * liberada. O checkout já trata isso caindo no caminho de contato comercial, e
 * o restante do sistema (painel, player, telas no ar) segue funcionando.
 *
 * Regra derivada: **guarda de segurança de um subsistema não pode ter como
 * efeito colateral a queda de outro.** Degrade o subsistema afetado; não mate
 * o processo que atende os demais.
 */
export function warnIfPaymentsDisabled(): void {
  // Em teste a configuração é sempre a simulada, e isso é o esperado.
  if (process.env.NODE_ENV === 'test') return;

  try {
    const provider = resolveProvider();
    if (provider.simulated) {
      console.warn(
        `⚠️  Pagamento em modo ${provider.label}: nenhuma cobrança real é feita ` +
          'e a confirmação libera conta com assinatura ativa.'
      );
    }
  } catch (error) {
    if (error instanceof PaymentConfigError) {
      console.warn(
        `⚠️  Cobrança online DESATIVADA: ${error.message}\n` +
          '   O checkout continua funcionando e cai no contato comercial. ' +
          'O restante do sistema não é afetado.'
      );
    }
  }
}

warnIfPaymentsDisabled();
