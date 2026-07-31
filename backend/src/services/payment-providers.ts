import crypto from 'crypto';

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
// ⚠️ HOJE SÓ O PROVEDOR `simulado` ESTÁ IMPLEMENTADO. Os demais estão
// declarados com `implemented: false` de propósito: o catálogo serve para a
// escolha ser explícita e para ninguém achar que "está integrado" porque o
// nome aparece numa lista. Ver `payment.service.ts` para o ponto de encaixe.
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
    key: 'asaas',
    label: 'Asaas',
    methods: ['pix', 'credit_card'],
    note: 'Pix e boleto recorrentes nativos, foco em PME brasileira. Exige CNPJ.',
  },
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
 * Falha no CARREGAMENTO DO MÓDULO se a configuração de pagamento for insegura.
 *
 * Mesma estratégia de `auth.service.ts::assertJwtSecretIsSafe`, e pela mesma
 * razão: rodando aqui, a checagem cobre TODA porta de entrada — API, jobs,
 * seeds e scripts — e não só o servidor HTTP. Uma trava que só existe dentro
 * da rota é uma trava que um script de manutenção contorna sem querer.
 *
 * Por que morrer no boot em vez de recusar por requisição: uma instância de
 * produção configurada para pagamento simulado está errada desde o primeiro
 * segundo, e "errado" aqui significa liberar plano pago de graça para quem
 * descobrir a URL. É melhor não subir do que subir vendendo de graça — e um
 * container que não sobe é visível no Portainer, enquanto um 503 intermitente
 * numa rota de checkout passa despercebido por dias.
 */
export function assertPaymentConfigIsSafe(): void {
  // Em teste a configuração é sempre a simulada e isso é o esperado.
  if (process.env.NODE_ENV === 'test') return;

  try {
    resolveProvider();
  } catch (error) {
    if (error instanceof PaymentConfigError && process.env.NODE_ENV === 'production') {
      console.error(`\n❌ ${error.message}\n`);
      process.exit(1);
    }
    // Fora de produção o erro sobe na requisição (503), sem derrubar o dev.
  }
}

assertPaymentConfigIsSafe();
