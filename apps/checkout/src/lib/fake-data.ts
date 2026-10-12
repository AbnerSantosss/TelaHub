/**
 * Gerador de dados fictícios **válidos** para o botão de pré-preenchimento do
 * checkout (demonstração e teste manual).
 *
 * A regra que guia este arquivo: dado de teste que não passa na validação real
 * não testa nada — só ensina a ignorar o erro. Por isso nada aqui é "quase
 * certo": CPF e CNPJ saem com dígito verificador calculado e conferido pelas
 * próprias funções de `checkout/validation`, e o cartão fecha o algoritmo de
 * Luhn de verdade. Se a régua de validação mudar amanhã, este gerador quebra
 * junto — que é exatamente o comportamento desejado.
 */
import { maskCnpj, maskCpf, maskPhone } from '../checkout/format';
import { isValidCnpj, isValidCpf, type IdentityDraft } from '../checkout/validation';

/** Inteiro aleatório em [0, max). */
const randInt = (max: number): number => Math.floor(Math.random() * max);

const pick = <T,>(items: readonly T[]): T => items[randInt(items.length)] as T;

const randomDigits = (count: number): number[] =>
  Array.from({ length: count }, () => randInt(10));

// ---------------------------------------------------------------------------
// Nomes e e-mails
// ---------------------------------------------------------------------------

// Nomes plausíveis, mas obviamente de demonstração para quem lê o painel
// depois — nenhum é de pessoa real. Todos têm nome + sobrenome porque
// `validateIdentityField('name')` exige duas partes de 2+ letras cada.
const FIRST_NAMES = [
  'Alice',
  'Bruno',
  'Carla',
  'Diego',
  'Elisa',
  'Fabio',
  'Gabriela',
  'Heitor',
  'Isabel',
  'Joana',
  'Lucas',
  'Mariana',
] as const;

const LAST_NAMES = [
  'Teste',
  'Demonstracao',
  'Exemplo',
  'Amostra',
  'Simulado',
  'Fictício',
] as const;

const COMPANY_PREFIXES = ['Loja', 'Comércio', 'Distribuidora', 'Mercado', 'Rede'] as const;
const COMPANY_SUFFIXES = ['Exemplo', 'Demonstração', 'Teste', 'Modelo'] as const;

/**
 * Domínio de e-mail: sempre `example.com`.
 *
 * A RFC 2606 reserva `example.com`/`.org`/`.net` justamente para documentação e
 * teste — ninguém pode registrar caixa postal ali. Gerar e-mail em domínio real
 * (gmail, ou o domínio do cliente) arrisca disparar mensagem de verdade para
 * alguém que nunca pediu nada, na primeira vez que alguém rodar o fluxo com o
 * envio de e-mail ligado. Por isso o domínio é constante e não sorteado.
 */
const EMAIL_DOMAIN = 'example.com';

const slug = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

// ---------------------------------------------------------------------------
// Documentos com dígito verificador calculado
// ---------------------------------------------------------------------------

/**
 * Dígito verificador de CPF: soma ponderada decrescente dos dígitos já
 * conhecidos, `(soma * 10) % 11`, com 10 virando 0. É a mesma conta de
 * `isValidCpf` — replicada aqui porque precisamos *produzir* o dígito, não só
 * conferir. Gerar a base aleatória e calcular o verificador é o único jeito de
 * ter variedade infinita sem cair em lista fixa de CPFs "conhecidos" (que, além
 * de repetitiva, tende a virar dado real por acidente).
 */
function cpfCheckDigit(digits: number[]): number {
  const length = digits.length;
  let sum = 0;
  for (let i = 0; i < length; i += 1) {
    sum += (digits[i] as number) * (length + 1 - i);
  }
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

/** Peso cíclico 9..2 do CNPJ, idêntico ao usado em `isValidCnpj`. */
function cnpjCheckDigit(digits: number[]): number {
  const length = digits.length;
  let weight = length - 7;
  let sum = 0;
  for (let i = 0; i < length; i += 1) {
    sum += (digits[i] as number) * weight;
    weight -= 1;
    if (weight < 2) weight = 9;
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

/**
 * CPF com 11 dígitos válidos.
 *
 * O `while` existe por um caso só: bases todas iguais (111.111.111-11 e
 * companhia) fecham a conta do dígito mas são rejeitadas de propósito pela
 * validação. Em vez de tratar o caso, sorteamos de novo — a chance é
 * desprezível e o código fica com uma regra a menos para errar. A conferência
 * final usa `isValidCpf` para garantir que gerador e validador nunca divirjam.
 */
export function randomCpfDigits(): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const base = randomDigits(9);
    const d1 = cpfCheckDigit(base);
    const d2 = cpfCheckDigit([...base, d1]);
    const cpf = [...base, d1, d2].join('');
    if (isValidCpf(cpf)) return cpf;
  }
  // Fallback determinístico e válido — inalcançável na prática, mas evita
  // devolver string vazia caso o improvável aconteça.
  return '52998224725';
}

/** CNPJ com 14 dígitos válidos (12 de base + 2 verificadores). */
export function randomCnpjDigits(): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    // Os 4 dígitos de filial: usamos 0001 (matriz), que é o caso realista.
    const base = [...randomDigits(8), 0, 0, 0, 1];
    const d1 = cnpjCheckDigit(base);
    const d2 = cnpjCheckDigit([...base, d1]);
    const cnpj = [...base, d1, d2].join('');
    if (isValidCnpj(cnpj)) return cnpj;
  }
  return '11222333000181';
}

// ---------------------------------------------------------------------------
// Telefone
// ---------------------------------------------------------------------------

/** DDDs reais e comuns — número inventado, mas com prefixo que existe. */
const DDDS = ['11', '21', '31', '41', '47', '51', '61', '62', '71', '81', '85'] as const;

/**
 * Celular: DDD + 9 dígitos começando obrigatoriamente por 9.
 * `validateIdentityField('phone')` rejeita 11 dígitos cujo terceiro não seja 9,
 * então o `9` é fixo e só os 8 seguintes são sorteados.
 */
function randomPhoneDigits(): string {
  return `${pick(DDDS)}9${randomDigits(8).join('')}`;
}

// ---------------------------------------------------------------------------
// Identidade completa
// ---------------------------------------------------------------------------

/**
 * Identidade completa e válida, pronta para preencher o passo 1.
 *
 * Documento e telefone saem **mascarados** porque é isso que os campos do
 * formulário guardam (o `maxLength` do campo é o da máscara). A validação roda
 * `onlyDigits` antes de conferir, então a máscara não atrapalha.
 */
export function randomIdentity(kind?: 'cpf' | 'cnpj'): IdentityDraft {
  const documentKind = kind ?? (Math.random() < 0.5 ? 'cpf' : 'cnpj');
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const isCnpj = documentKind === 'cnpj';

  return {
    name: `${first} ${last}`,
    // Sufixo numérico para não repetir e-mail entre dois pré-preenchimentos
    // seguidos (o backend pode tratar e-mail como chave do lead).
    email: `${slug(first)}.${slug(last)}${randInt(1000)}@${EMAIL_DOMAIN}`,
    phone: maskPhone(randomPhoneDigits()),
    documentKind,
    document: isCnpj ? maskCnpj(randomCnpjDigits()) : maskCpf(randomCpfDigits()),
    // Razão social só é exigida no fluxo CNPJ; no CPF fica vazia de propósito,
    // igual ao `emptyIdentity()`.
    companyName: isCnpj ? `${pick(COMPANY_PREFIXES)} ${pick(COMPANY_SUFFIXES)} ME` : '',
    // Sempre `false`, mesmo em dado de teste. O preenchimento rápido existe
    // para poupar digitação, não para simular consentimento — e uma sessão de
    // teste que nasce com opt-in ligado acabaria criando registro de
    // consentimento que ninguém deu.
    marketingOptIn: false,
  };
}

// ---------------------------------------------------------------------------
// Cartão
// ---------------------------------------------------------------------------

export interface FakeCard {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
}

/** Soma de Luhn de uma sequência de dígitos (o cartão é válido quando % 10 === 0). */
function luhnSum(digits: number[]): number {
  let sum = 0;
  // O dobro alterna a partir da direita, então a paridade é contada de trás
  // para frente — daí o índice invertido.
  for (let i = 0; i < digits.length; i += 1) {
    const fromRight = digits.length - 1 - i;
    let value = digits[i] as number;
    if (fromRight % 2 === 1) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
  }
  return sum;
}

/** `true` quando o número fecha em Luhn. Exportado para uso em testes manuais. */
export function isLuhnValid(number: string): boolean {
  const digits = number.replace(/\D+/g, '').split('').map(Number);
  if (digits.length === 0) return false;
  return luhnSum(digits) % 10 === 0;
}

/**
 * Validade sempre futura, em `MM/AA`.
 *
 * Cartão vencido é recusado pela validação do formulário, então uma data fixa
 * no código viraria bug silencioso assim que passasse do prazo — o clássico
 * "funcionava até janeiro". Calculamos a partir de `hoje` + 1 a 4 anos.
 */
function futureExpiry(): string {
  const now = new Date();
  const month = randInt(12) + 1;
  const year = now.getFullYear() + 1 + randInt(4);
  return `${String(month).padStart(2, '0')}/${String(year % 100).padStart(2, '0')}`;
}

const cardHolder = (): string =>
  `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

const cvv = (): string => String(randInt(1000)).padStart(3, '0');

/**
 * Cartão de teste que passa em Luhn.
 *
 * Começa em `4` (BIN de Visa) porque a UI costuma inferir a bandeira pelo
 * primeiro dígito — um número que não bate com bandeira nenhuma esconderia esse
 * caminho do código. Os 14 dígitos do meio são sorteados e o último é
 * *calculado* para zerar a soma de Luhn: assim o gerador nunca produz um número
 * que o próprio front recusaria antes de chegar ao servidor.
 */
export function randomCard(): FakeCard {
  const body = [4, ...randomDigits(14)];
  const check = (10 - (luhnSum([...body, 0]) % 10)) % 10;
  return {
    number: [...body, check].join(''),
    holder: cardHolder(),
    expiry: futureExpiry(),
    cvv: cvv(),
  };
}

/**
 * Cartão de teste que o simulador **recusa** (termina em `0000`).
 *
 * O ponto é testar o caminho da recusa, e a recusa que interessa é a de regra de
 * negócio (emissor negou), não a de número malformado — número inválido morre
 * na validação do formulário e nunca chega ao backend. Por isso o número precisa
 * terminar em `0000` **e** fechar Luhn ao mesmo tempo.
 *
 * Com os 4 últimos dígitos travados em zero, o único grau de liberdade é o
 * miolo: ajustamos um dígito anterior até a soma fechar. Como esse dígito ocupa
 * posição ímpar a partir da direita (portanto entra dobrado no Luhn), somar 1
 * nem sempre muda a soma em 1 — mais simples e seguro é sortear de novo o miolo
 * até fechar, o que acontece em ~10 tentativas em média.
 */
export function declinedCard(): FakeCard {
  let number = '';
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const candidate = [4, ...randomDigits(11), 0, 0, 0, 0];
    if (luhnSum(candidate) % 10 === 0) {
      number = candidate.join('');
      break;
    }
  }
  // Rede de segurança: número fixo, conferido à mão, Luhn-válido e terminado em
  // 0000 (o óbvio `4000000000000000` NÃO fecha Luhn — daí o `2`).
  if (!number) number = '4000000000020000';

  return {
    number,
    holder: cardHolder(),
    expiry: futureExpiry(),
    cvv: cvv(),
  };
}
