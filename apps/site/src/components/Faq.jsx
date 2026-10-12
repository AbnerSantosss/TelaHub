import './Faq.css';
import { precoPorTela } from '../data/catalogo';

/**
 * FAQ — "Perguntas que todo síndico, gerente e dono fazem antes de assinar."
 *
 * ── Por que as respostas são estas ──────────────────────────────────────────
 * A lista não é uma coleção de dúvidas simpáticas: é a transcrição das oito
 * objeções que aparecem em toda conversa de venda, na ordem em que aparecem.
 * O público é o síndico, o gerente e o dono — três pessoas que não são de
 * tecnologia e que já foram queimadas por contrato de fidelidade. Por isso a
 * resposta vem antes do argumento, sempre em uma ou duas frases.
 *
 * ── A pergunta da internet é deliberada, não um descuido ────────────────────
 * "E se a internet cair?" admite, com todas as letras, que a tela reiniciada
 * sem internet não carrega, porque ainda não guardamos o conteúdo na memória
 * do aparelho. Essa frase é decisão do dono e não deve ser suavizada, nem
 * trocada por "funciona mesmo offline", nem escondida no fim da lista. O
 * cliente descobre essa limitação na primeira queda de energia; descobrir
 * depois de assinar é que gera cancelamento e reclamação. Dizer antes é a
 * única versão que sobrevive ao contato com a realidade.
 *
 * ── Preço não se escreve à mão ──────────────────────────────────────────────
 * A resposta "Quanto custa de verdade por mês?" cita valores, e eles vêm de
 * `precoPorTela()` — nunca digitados aqui. Já aconteceu neste projeto de a
 * grade de preços, o simulador e o backend divergirem, e preço anunciado
 * diferente do cobrado é exposição aos arts. 30 e 37 do CDC, não erro de
 * digitação. Se o preço mudar no catálogo, esta resposta muda junto, sozinha.
 *
 * ── Dois claims saíram daqui, e os dois voltam se ninguém ler isto ─────────
 * 1) "Em 2 minutos" (pergunta do técnico). A página tinha TRÊS prazos para a
 *    mesma promessa — 5 minutos no CTA final, 2 minutos aqui, 30 segundos no
 *    herói e na comparação. Oferta contraditória se resolve a favor do
 *    consumidor (CDC art. 30), e nenhum dos dois maiores foi medido. Ficou só
 *    "30 segundos", que é o que se verifica: trocar um texto e salvar. Não
 *    reintroduza prazo de instalação aqui.
 * 2) "Cancela no painel" (pergunta da fidelidade). O botão de cancelamento no
 *    painel ainda está sendo construído; descrever o passo antes de ele
 *    existir é prometer o que o cliente não consegue fazer, e ele descobre no
 *    dia de sair. O texto agora diz o caminho real — pedido pelo formulário
 *    desta página, valendo do próximo ciclo, sem multa.
 *
 * ── Acessibilidade e indexação ──────────────────────────────────────────────
 * O acordeão é <details>/<summary> nativo: estado, teclado e leitor de tela
 * vêm de graça e corretos, sem estado em React. Como a página é pré-renderizada
 * no build, a resposta está no HTML mesmo com o item fechado — é isso que
 * permite ao Google indexar as perguntas. Nenhum item nasce aberto de
 * propósito: a lista precisa caber na tela para o visitante escolher.
 */

const PERGUNTAS = [
  {
    pergunta: 'Funciona na minha TV?',
    resposta:
      'Se ela tem navegador de internet, sim. Se é antiga, um aparelho de HDMI (Chromecast, Fire Stick, Mi Box) resolve. Não precisa de TV nova.',
  },
  {
    pergunta: 'Preciso de técnico?',
    resposta:
      'Não. Você abre o navegador da TV, digita o endereço e o código de 6 dígitos que aparece na tela.',
  },
  {
    pergunta: 'Serve para tela em pé (totem, vitrine)?',
    resposta:
      'Sim. Cada tela tem seu formato: deitada 16:9 ou em pé 9:16. Você monta os dois no mesmo painel.',
  },
  {
    pergunta: 'E se a internet cair?',
    resposta:
      'Se a tela já estava mostrando, continua. Se o aparelho for reiniciado sem internet, o conteúdo não carrega, porque ainda não guardamos tudo na memória da TV.',
  },
  {
    pergunta: 'Quanto custa de verdade por mês?',
    // Os três números saem do catálogo. Não escreva "49" nem "39" aqui.
    resposta: `1 tela: R$ ${precoPorTela('gratis')}. 3 telas: 3 × R$ ${precoPorTela('loja')}. 5 ou mais: R$ ${precoPorTela('rede')} cada. Use o simulador.`,
  },
  {
    pergunta: 'Tem fidelidade? Como cancelo?',
    resposta:
      'No mensal não tem: você pede o cancelamento pelo formulário "Falar com a gente" desta página, usa até o fim do ciclo já pago e não é cobrado no seguinte, sem multa. O anual sai mais barato por tela porque é um compromisso de 12 meses. Nele valem os 7 dias de arrependimento do art. 49 do CDC.',
  },
  {
    pergunta: 'Meu funcionário ou o porteiro consegue mexer?',
    resposta:
      'Sim. É trocar o texto ou a foto e salvar. Você escolhe quem tem acesso.',
  },
  {
    pergunta: 'Posso mostrar um PDF ou uma planilha que já tenho?',
    resposta:
      'Sim. PDF, Google Docs, Office e páginas da web entram como bloco na tela.',
  },
];

export default function Faq() {
  return (
    <section id="duvidas" className="secao faq" aria-labelledby="faq-titulo">
      <div className="faq__grade">
        <h2 id="faq-titulo" className="h2 reveal">
          Perguntas que todo síndico, gerente e dono fazem antes de assinar.
        </h2>

        <div className="faq__lista reveal">
          {PERGUNTAS.map(({ pergunta, resposta }) => (
            <details key={pergunta} className="faq__item">
              <summary className="faq__gatilho">
                {/* O <h3> dentro do <summary> mantém o sumário do documento
                    para o Google sem tirar do elemento o papel de botão. */}
                <h3 className="faq__pergunta">{pergunta}</h3>
                <svg
                  className="faq__seta"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <p className="faq__resposta">{resposta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
