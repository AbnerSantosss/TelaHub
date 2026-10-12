import './RiscoZero.css';

/**
 * RISCO ZERO — "Se não ficar no ar, você não paga."
 *
 * ── Por que a seção existe ──────────────────────────────────────────────────
 * Ela vem logo depois da tabela de preços porque é ali que o visitante para de
 * ler e começa a procurar a pegadinha: a fidelidade escondida, a cobrança
 * retroativa, o "grátis" que vira boleto no mês seguinte. A seção não vende
 * nada novo — ela derruba, uma por uma, as objeções que já estão na cabeça de
 * quem chegou até aqui. Por isso é uma lista curta de frases fechadas, e não
 * um texto corrido: cada linha responde a um medo específico.
 *
 * ── A armadilha do último item (leia antes de mexer) ────────────────────────
 * O último item oferece o setup assistido — nós montamos a primeira tela junto
 * com o cliente. Essa oferta é REAL e é a maior alavanca de ativação do plano
 * de entrada, então ela fica. O que NÃO fica é o canal: o rascunho aprovado
 * dizia "pelo WhatsApp [número real]", e número de WhatsApp publicável não
 * existe. Publicar um placeholder ("(11) 99999-9999", "em breve") seria pior
 * que omitir: é oferta de canal de atendimento que não atende, o que a página
 * não pode fazer nem por um dia. Então o item mantém a promessa e troca o
 * canal por um botão que abre o mesmo formulário de contato do resto da
 * página — um caminho que existe e responde. Quando houver número comercial de
 * verdade, ele entra aqui; até lá, nada de canal fictício.
 *
 * ── O que a lista não pode dizer ────────────────────────────────────────────
 * Nada de "14 dias", nada de prazo de teste inventado, nada de porcentagem sem
 * fonte. Os "7 dias para desistir" ficam porque não são promessa de produto: é
 * o direito de arrependimento do art. 49 do CDC, que vale com ou sem esta
 * página. Já "grátis para sempre" é compromisso comercial assumido pela casa e
 * está espelhado no catálogo de planos — se um dia o plano de entrada passar a
 * cobrar, esta linha cai junto.
 *
 * ── "Cancela no painel" saiu, e a razão é a mesma do WhatsApp acima ─────────
 * A lista dizia "cancela no painel". A rota e o botão de cancelamento ainda
 * estão sendo construídos — ou seja, a seção que existe para derrubar a
 * desconfiança descrevia um passo que o cliente não consegue dar, e ele só
 * descobriria isso no dia em que quisesse sair. É oferta vinculante (CDC art.
 * 30) sobre funcionalidade inexistente, exatamente o defeito do "cache offline
 * failsafe" que a wiki registra como 1ª reincidência. A frase foi trocada pelo
 * que é verdade hoje: no mensal o cancelamento é PEDIDO, por um canal que
 * existe e responde (o mesmo formulário desta página), e vale a partir do
 * próximo ciclo, sem multa. Quando o botão existir no painel, a frase volta —
 * e não antes.
 */

/* Ícone único da lista. Traço 2px, herda a cor por currentColor — o mesmo
   desenho serve sobre papel e sobre painel escuro sem precisar de variante. */
function IconeCheck() {
  return (
    <svg
      className="risco__icone"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
    </svg>
  );
}

const GARANTIAS = [
  'A primeira tela é grátis para sempre e não pede cartão. Ela não vira cobrança depois de um prazo.',
  'O mensal não tem fidelidade, multa nem carência. Você pede o cancelamento pelo formulário "Falar com a gente" desta página e ele vale a partir do próximo ciclo. O anual é de 12 meses, e é isso que baixa o preço por tela.',
  'Nunca cobramos tela que passou. Se ligou hoje, paga de hoje em diante.',
  '7 dias para desistir de plano pago e receber tudo de volta (art. 49 do CDC).',
];

export default function RiscoZero({ abrirContato }) {
  return (
    <section
      id="risco-zero"
      className="secao risco"
      aria-labelledby="risco-titulo"
    >
      <div className="risco__grade split">
        <h2 id="risco-titulo" className="h2 reveal">
          Se não ficar no ar, você não paga.
        </h2>

        <ul className="risco__lista reveal">
          {GARANTIAS.map((garantia) => (
            <li key={garantia} className="risco__item">
              <IconeCheck />
              <span>{garantia}</span>
            </li>
          ))}

          {/* Setup assistido: promessa mantida, canal trocado por um botão que
              abre o formulário de contato da página. Ver o cabeçalho do
              arquivo antes de reintroduzir qualquer número de telefone. */}
          <li className="risco__item">
            <IconeCheck />
            <span>
              Se quiser, montamos sua primeira tela junto com você.{' '}
              <button
                type="button"
                className="btn btn--texto btn--sublinhado risco__pedir"
                onClick={abrirContato}
              >
                <span className="btn__rotulo">Quero ajuda para montar a primeira tela</span>
              </button>
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
