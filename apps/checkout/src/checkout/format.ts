/** Formatação de dinheiro e máscaras de campo do checkout. */

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Dinheiro sempre a partir de centavos inteiros — nunca de float acumulado. */
export const formatBRL = (cents: number): string =>
  BRL.format((Number.isFinite(cents) ? cents : 0) / 100);

export const pluralScreens = (count: number): string =>
  `${count} ${count === 1 ? 'tela' : 'telas'}`;

export const onlyDigits = (value: string): string => value.replace(/\D+/g, '');

/**
 * Telefone brasileiro sem o país (o prefixo `+55` é fixo e fica fora do campo).
 * Aceita 10 dígitos (fixo) e 11 (celular): a máscara se adapta em vez de travar
 * o número de quem tem telefone fixo.
 */
export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const split = rest.length > 8 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/** `000.000.000-00` */
export function maskCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  let out = d.slice(0, 3);
  if (d.length > 3) out += `.${d.slice(3, 6)}`;
  if (d.length > 6) out += `.${d.slice(6, 9)}`;
  if (d.length > 9) out += `-${d.slice(9, 11)}`;
  return out;
}

/** `00.000.000/0000-00` */
export function maskCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  let out = d.slice(0, 2);
  if (d.length > 2) out += `.${d.slice(2, 5)}`;
  if (d.length > 5) out += `.${d.slice(5, 8)}`;
  if (d.length > 8) out += `/${d.slice(8, 12)}`;
  if (d.length > 12) out += `-${d.slice(12, 14)}`;
  return out;
}

/** Telefone salvo (com ou sem o `55` na frente) de volta para a máscara local. */
export function localPhoneDigits(stored: string | null): string {
  const digits = onlyDigits(stored ?? '');
  if (digits.length > 11 && digits.startsWith('55')) return digits.slice(2);
  return digits.slice(0, 11);
}
