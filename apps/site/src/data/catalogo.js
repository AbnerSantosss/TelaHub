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
 *
 * ── Intervalo (2026-08-31) ─────────────────────────────────────────────────
 * O empacotamento v2 promoveu o ANUAL a oferta principal: mesmo plano, preço
 * por tela/mês menor em troca de compromisso de 12 meses. Isso significa que
 * "o preço do plano Loja" deixou de ser um número e passou a ser uma função de
 * (plano, intervalo) — e que qualquer frase comparando planos ("a partir de N
 * telas o Rede sai mais barato") **muda conforme o intervalo**. Por isso as
 * comparações abaixo são calculadas, nunca escritas por extenso: no mensal o
 * Rede passa o Loja em 4 telas, no anual só em 5. Uma frase fixa estaria errada
 * metade do tempo, e ninguém perceberia.
 */
import catalogo from './planos.json';

const porCodigo = new Map(catalogo.planos.map((p) => [p.code, p]));

/** Os dois intervalos de cobrança. Espelham `BillingInterval` da API. */
export const MENSAL = 'mensal';
export const ANUAL = 'anual';

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

/** Reais por tela/mês no plano mensal. `null` quando é sob consulta. */
export const precoPorTela = (code) => plano(code).precoPorTela;

/**
 * Reais por tela/mês quando a assinatura é anual. `null` quando o plano não
 * tem oferta anual (grátis e Enterprise) — quem chama precisa tratar a
 * ausência, não imprimir zero.
 */
export const precoAnualPorTela = (code) => plano(code).precoAnualPorTela ?? null;

/**
 * Preço unitário no intervalo pedido, com queda para o mensal quando o plano
 * não tem oferta anual. É a mesma regra do `unitPriceCents()` do backend — se
 * as duas divergirem, a página anuncia um preço que a fatura não cumpre.
 */
export function precoUnitario(code, intervalo = MENSAL) {
  if (intervalo === ANUAL) {
    const anual = precoAnualPorTela(code);
    if (anual !== null) return anual;
  }
  return precoPorTela(code);
}

/** Piso de telas que entram na fatura. */
export const pisoTelas = (code) => plano(code).minScreens;

/** Telas que o plano de entrada dá de graça (não faturadas). */
export const TELAS_GRATIS = catalogo.freeScreens;

/**
 * Fatura mensal estimada: `max(telas, piso) × preço unitário`.
 *
 * Réplica deliberada de `estimateMonthlyCents()` do backend. O servidor
 * continua sendo quem decide o valor cobrado; isto aqui é previsão para o
 * visitante, e por isso precisa usar exatamente a mesma conta — inclusive o
 * piso, que é o que faz o Rede cobrar 5 telas de quem ligou 3.
 */
export function faturaMensal(code, telas, intervalo = MENSAL) {
  const unitario = precoUnitario(code, intervalo);
  if (unitario === null) return null;
  const cobradas = Math.max(Number(telas) || 0, pisoTelas(code));
  return cobradas * unitario;
}

/** Quantas telas entram na fatura (o piso do plano vale mesmo com menos telas). */
export function telasCobradas(code, telas) {
  return Math.max(Number(telas) || 0, pisoTelas(code));
}

/** Códigos dos planos pagos com preço público, na ordem da vitrine. */
export const PLANOS_PAGOS = ['loja', 'rede'];

/**
 * Plano pago mais barato para operar `telas` telas no intervalo dado.
 * Mesma política do `suggestUpgradeFor()` do backend: compara a FATURA, não o
 * preço unitário — o Rede custa menos por tela e mesmo assim sai mais caro para
 * quem tem 2 telas, por causa do piso de 5.
 */
export function melhorPlanoPago(telas, intervalo = MENSAL) {
  return PLANOS_PAGOS.map((code) => ({ code, total: faturaMensal(code, telas, intervalo) }))
    .filter((c) => c.total !== null)
    .sort((a, b) => a.total - b.total)[0];
}

/**
 * A partir de quantas telas o Rede fica mais barato que o Loja, no intervalo
 * dado. Calculado varrendo o piso do Rede para cima porque abaixo dele a
 * resposta é sempre "nunca" — e é justamente esse degrau que a grade precisa
 * comunicar sem mentir em nenhum dos dois intervalos.
 */
export function telasEmQueRedeCompensa(intervalo = MENSAL) {
  for (let telas = 1; telas <= pisoTelas('rede') + 5; telas += 1) {
    if (faturaMensal('rede', telas, intervalo) <= faturaMensal('loja', telas, intervalo)) {
      return telas;
    }
  }
  return pisoTelas('rede');
}

/** Formata reais sem centavos quando o valor é inteiro (o caso da grade). */
export function reais(valor) {
  if (valor === null || valor === undefined) return null;
  return Number.isInteger(valor)
    ? `R$ ${valor}`
    : `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

export default catalogo;
