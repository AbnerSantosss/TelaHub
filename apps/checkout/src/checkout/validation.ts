// Validação do passo de identificação.
//
// Validar CPF e CNPJ no cliente não substitui o servidor — serve para a pessoa
// descobrir o erro de digitação no próprio campo, e não depois de enviar. O
// dígito verificador é o que separa "errei um número" de "inventei um documento".
import { onlyDigits } from './format';

export type DocumentKind = 'cpf' | 'cnpj';

export interface IdentityDraft {
  name: string;
  email: string;
  /** Só o número local, sem o `+55` (que é prefixo fixo do campo). */
  phone: string;
  documentKind: DocumentKind;
  document: string;
  companyName: string;
}

export type IdentityField = 'name' | 'email' | 'phone' | 'document' | 'companyName';

export type IdentityErrors = Partial<Record<IdentityField, string>>;

/** Ordem visual dos campos — define qual erro recebe o foco primeiro. */
export const IDENTITY_FIELD_ORDER: IdentityField[] = [
  'name',
  'email',
  'phone',
  'document',
  'companyName',
];

export const emptyIdentity = (): IdentityDraft => ({
  name: '',
  email: '',
  phone: '',
  documentKind: 'cpf',
  document: '',
  companyName: '',
});

export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return false;
  // Sequências repetidas passam na conta do dígito, mas não são CPF válido.
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const checkDigit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      sum += Number(digits[i]) * (length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return checkDigit(9) === Number(digits[9]) && checkDigit(10) === Number(digits[10]);
}

export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const checkDigit = (length: number): number => {
    let weight = length - 7;
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      sum += Number(digits[i]) * weight;
      weight -= 1;
      if (weight < 2) weight = 9;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return checkDigit(12) === Number(digits[12]) && checkDigit(13) === Number(digits[13]);
}

// Deliberadamente permissivo: e-mail válido de verdade só se prova entregando.
// A regra aqui pega o erro de digitação óbvio sem rejeitar domínio legítimo.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export const isValidEmail = (value: string): boolean => EMAIL_RE.test(value.trim());

export function validateIdentityField(
  field: IdentityField,
  identity: IdentityDraft
): string | undefined {
  const isCnpj = identity.documentKind === 'cnpj';

  switch (field) {
    case 'name': {
      const name = identity.name.trim();
      if (!name) return 'Informe seu nome completo.';
      if (name.length < 3) return 'O nome está curto demais.';
      // Nome e sobrenome: é o que vai no contrato e na nota.
      if (!/\s/.test(name) || name.split(/\s+/).some((part) => part.length < 2)) {
        return 'Informe nome e sobrenome.';
      }
      return undefined;
    }
    case 'email': {
      const email = identity.email.trim();
      if (!email) return 'Informe seu e-mail.';
      if (!isValidEmail(email)) return 'Esse e-mail parece incompleto. Confira o endereço.';
      return undefined;
    }
    case 'phone': {
      const digits = onlyDigits(identity.phone);
      if (!digits) return 'Informe seu WhatsApp com DDD.';
      if (digits.length < 10) return 'Faltam dígitos: informe DDD + número.';
      if (digits.length === 11 && digits[2] !== '9') {
        return 'Número de celular com 9 dígitos começa com 9 depois do DDD.';
      }
      return undefined;
    }
    case 'document': {
      const digits = onlyDigits(identity.document);
      if (!digits) return isCnpj ? 'Informe o CNPJ da empresa.' : 'Informe seu CPF.';
      if (isCnpj) {
        if (digits.length < 14) return 'O CNPJ tem 14 dígitos.';
        if (!isValidCnpj(digits)) return 'Esse CNPJ não é válido. Confira os números.';
        return undefined;
      }
      if (digits.length < 11) return 'O CPF tem 11 dígitos.';
      if (!isValidCpf(digits)) return 'Esse CPF não é válido. Confira os números.';
      return undefined;
    }
    case 'companyName': {
      if (!isCnpj) return undefined;
      const company = identity.companyName.trim();
      if (!company) return 'Informe a razão social — é o nome que sai na nota.';
      if (company.length < 2) return 'O nome da empresa está curto demais.';
      return undefined;
    }
    default:
      return undefined;
  }
}

export function validateIdentity(identity: IdentityDraft): IdentityErrors {
  const errors: IdentityErrors = {};
  for (const field of IDENTITY_FIELD_ORDER) {
    const error = validateIdentityField(field, identity);
    if (error) errors[field] = error;
  }
  return errors;
}
