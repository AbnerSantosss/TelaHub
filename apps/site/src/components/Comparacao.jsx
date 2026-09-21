/*
 * Comparacao.jsx — "O que mais você poderia fazer — e o que custa."
 *
 * DECISÃO — os R$ 3.500 saíram. O mockup trazia "Kit a partir de R$ 3.500" na
 * coluna "Agência / técnico". Esse número não existe em lugar nenhum: não está na
 * pesquisa de mercado de ago/2026 nem em qualquer orçamento levantado. Era um valor
 * plausível, e é exatamente por isso que era perigoso — número redondo e alto que
 * ninguém questiona na leitura, mas que o primeiro concorrente com uma proposta de
 * R$ 900 na mão desmonta, e junto com ele desmonta a credibilidade das outras vinte
 * células da tabela, que são verdadeiras. Numa tabela comparativa a confiança é
 * indivisível: uma linha inventada contamina todas.
 *
 * No lugar entrou o que a pesquisa de fato verificou, com o nome de quem cobra —
 * o setup de R$ 350 do Sistema TVi e a exigência da Screencorp de um PC com Windows
 * por TV, a R$ 109 a 169 por licença. Citar os nomes não é detalhe de estilo: é o
 * que permite a qualquer leitor conferir, e é o que impede a célula de virar uma
 * generalização sobre "agências" que nunca medimos. Os US$ 8 a 30 por tela dos
 * sistemas em dólar continuam, confirmados na mesma pesquisa; a nota de rodapé
 * "Preços de terceiros verificados em ago/2026" é o que sustenta a linha inteira e
 * precisa ser atualizada junto com os preços — nota velha é pior que nota nenhuma.
 *
 * ARMADILHA de layout: seis colunas de texto. A tabela precisa ficar dentro do
 * wrapper `.tabela`, senão a página inteira rola de lado no celular. E, mesmo
 * rolando, seis colunas não se comparam num telefone — por isso o modo cartão em
 * Comparacao.css, com os papéis ARIA declarados abaixo para que a semântica de
 * tabela sobreviva ao `display: block`.
 *
 * ARMADILHA 2 (medida na auditoria de celular): o `min-width: 720px` de
 * `.tabela table` continuava valendo DEPOIS de a tabela virar cartão. O modo
 * cartão zera o motivo do min-width — não há mais colunas a preservar —, mas a
 * regra do index.css tem seletor mais fraco e mesmo assim sobrevive, porque as
 * regras daqui só trocavam `display` e `width`. Resultado: cada cartão nascia
 * com 720px e a comparação inteira rolava de lado dentro do wrapper, num
 * telefone de 390px. `min-width: 0` no modo cartão é o conserto, e ele mora em
 * Comparacao.css junto do resto do modo cartão.
 */

import './Comparacao.css';

const COLUNAS = [
  'Cartaz / gráfica',
  'Pen-drive na TV',
  'Agência / técnico',
  'Sistema de fora (dólar)',
  'TelaHub',
];

const LINHAS = [
  {
    criterio: 'Trocar o aviso',
    valores: [
      'Imprimir de novo',
      'Atravessar o prédio, achar o computador',
      'Pedir e esperar',
      'Do celular',
      'Do celular, em 30 s',
    ],
  },
  {
    criterio: 'Custo para começar',
    valores: [
      'R$ por cartaz, toda vez',
      'R$ 0 (e tela preta quando corrompe)',
      'Setup à parte: R$ 350 no Sistema TVi. A Screencorp pede um PC com Windows para cada TV, a R$ 109 a 169 por licença.',
      'US$ 8 a 30 por tela',
      'R$ 0 (1ª tela grátis)',
    ],
  },
  {
    criterio: 'Se a tela cair',
    valores: [
      'Você não sabe',
      'Você não sabe',
      'Chamado técnico',
      'Depende do sistema',
      'E-mail na hora',
    ],
  },
  {
    criterio: 'Cancelar',
    // "Pelo painel" saiu: o botão de cancelamento no painel ainda está sendo
    // construído, e numa tabela comparativa a confiança é indivisível — uma
    // célula que promete um passo inexistente contamina as outras dezenove.
    valores: [
      'Não se aplica',
      'Não se aplica',
      'Contrato',
      'E-mail para suporte, em inglês',
      'É só pedir: vale no próximo ciclo, sem multa',
    ],
  },
];

const ULTIMA = COLUNAS.length - 1;

export default function Comparacao() {
  return (
    <section id="comparar" className="secao comparacao-secao" aria-labelledby="comparar-titulo">
      <h2 id="comparar-titulo" className="h2 reveal">
        O que mais você poderia fazer, e quanto custa cada opção.
      </h2>

      <div className="tabela card comparacao__quadro reveal">
        <table className="comparacao__tabela" role="table">
          <caption className="comparacao__legenda">
            Comparação entre cartaz impresso, pen-drive na TV, agência ou técnico, sistemas
            cobrados em dólar e o TelaHub.
          </caption>
          <thead role="rowgroup">
            <tr role="row">
              <td />
              {COLUNAS.map((coluna, i) => (
                <th
                  key={coluna}
                  scope="col"
                  role="columnheader"
                  className={i === ULTIMA ? 'comparacao__nos' : undefined}
                >
                  {coluna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody role="rowgroup">
            {LINHAS.map((linha) => (
              <tr key={linha.criterio} role="row">
                <th scope="row" role="rowheader">
                  {linha.criterio}
                </th>
                {linha.valores.map((valor, i) => (
                  <td
                    key={COLUNAS[i]}
                    role="cell"
                    data-coluna={COLUNAS[i]}
                    className={i === ULTIMA ? 'comparacao__nos' : undefined}
                  >
                    {valor}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="micro reveal">Preços de terceiros verificados em ago/2026.</p>
    </section>
  );
}
