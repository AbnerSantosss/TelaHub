/**
 * Regra de senha única do painel (PAI-21).
 *
 * Antes cada tela tinha a sua: 8 no cadastro, 6 na troca obrigatória e em
 * "Minha conta". A API valida o mesmo mínimo — mudar aqui sem mudar lá deixa a
 * tela aceitar o que o servidor recusa.
 *
 * Arquivo-contrato da execução de 2026-09-18: usado pelo A3 (Dashboard, Minha
 * conta) e pelo A3b (cadastro, troca obrigatória, redefinição).
 */
export const SENHA_MINIMA = 8;

export function mensagemSenhaCurta(): string {
  return `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`;
}
