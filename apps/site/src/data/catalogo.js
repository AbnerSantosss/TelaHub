/**
 * Acesso ao catálogo de preços do site.
 *
 * `planos.json` é um snapshot do que a API devolve em `GET /api/plans`,
 * atualizado no build por `scripts/fetch-plans.mjs`. **Nenhum preço deve ser
 * escrito à mão em componente** — foi a duplicação entre a grade de preços, o
 * simulador e o seed do backend que já produziu divergência entre o valor
 * anunciado e o cobrado, que é exposição a CDC arts. 30 e 37, não só desleixo.
 *
 * Se você precisa do preço em algum lugar novo, importe daqui.
 */
import catalogo from './planos.json';

const porCodigo = new Map(catalogo.planos.map((p) => [p.code, p]));

/**
 * Plano pelo código. Lança quando não existe.
 *
 * Falhar alto é proposital: um código errado renderizaria "R$ undefined" ou,
 * pior, sumiria silenciosamente com o card — e o build ainda passaria. O erro
 * aparece no `npm run build`, antes de ir ao ar.
 */
export function plano(code) {
  const encontrado = porCodigo.get(code);
  if (!encontrado) {
    throw new Error(
      `Plano "${code}" não existe no catálogo (src/data/planos.json). ` +
      `Códigos disponíveis: ${[...porCodigo.keys()].join(', ')}. ` +
      `Se o plano é novo, rode "npm run sync:plans" com a API no ar.`,
    );
  }
  return encontrado;
}

/** Reais por tela/mês. `null` quando é sob consulta. */
export const precoPorTela = (code) => plano(code).precoPorTela;

/** Piso de telas que entram na fatura. */
export const pisoTelas = (code) => plano(code).minScreens;

/** Telas que o plano de entrada dá de graça (não faturadas). */
export const TELAS_GRATIS = catalogo.freeScreens;

export default catalogo;
