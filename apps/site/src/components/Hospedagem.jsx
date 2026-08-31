/*
 * Hospedagem.jsx — "Nossa estrutura, sua vantagem".
 *
 * DECISÃO 1 — o "no Brasil" saiu do título. O mockup abria com "Servidor próprio,
 * no Brasil." Onde a mídia vai morar (R2 ou VPS) é decisão de infraestrutura que
 * ainda está em aberto. Afirmar jurisdição de dado antes de decidir é o tipo de
 * frase que volta como cláusula de contrato: quem lê "no Brasil" numa página de
 * vendas guarda isso, e a empresa passa a dever uma promessa que ninguém assinou.
 * Ficou "Servidor próprio." — o que a estrutura própria de fato entrega para o
 * cliente é preço em real e cancelamento sem conversa, e é só isso que a seção diz.
 * A regra vale para a seção inteira, não só para o título: nenhuma linha aqui pode
 * insinuar onde os arquivos ficam. O item "Só você vê o seu" fala de isolamento por
 * negócio (isso existe no código, é verdade verificável) e para por aí.
 *
 * DECISÃO 2 — os 50 MB ficaram; o "sem cota escondida" saiu. O limite por arquivo é
 * real e está no backend (apps/api/src/routes/media.routes.ts, fileSize 50 MB), então
 * pode ir ao ar. Já a cota total por conta ainda não foi definida — e "sem cota
 * escondida" não é um número, é a negação de todos eles. Prometer a ausência de um
 * limite que ainda vai existir é a promessa mais cara da página, porque só é
 * descoberta quando o cliente já subiu conteúdo e depende dele. Quando a cota for
 * decidida, o caminho é publicar o número, não ressuscitar a frase.
 *
 * Os bilhetes laranja do mockup (.pend) eram recado interno de pendência. Não são
 * conteúdo e não existem aqui.
 */

import './Hospedagem.css';

const ITENS = [
  {
    titulo: 'Preço em real, fixo.',
    texto: 'Não muda com o dólar. Sem taxa por vídeo, por tela em pé, por usuário.',
  },
  {
    titulo: 'Mensal sem fidelidade, sem multa.',
    texto:
      'Cancela no painel. Nunca cobramos tela que passou. O anual é um compromisso de 12 meses — é o que compra o desconto.',
  },
  {
    titulo: 'Vídeo e foto guardados com a gente.',
    texto: 'Até 50 MB por arquivo.',
  },
  {
    titulo: 'Só você vê o seu.',
    texto: 'Cada negócio tem seu espaço separado.',
  },
];

export default function Hospedagem() {
  return (
    <section
      id="hospedagem"
      className="secao secao--papel hospedagem-secao"
      aria-labelledby="hospedagem-titulo"
    >
      <div className="split">
        <div className="secao__cabeca reveal">
          <span className="chip">Nossa estrutura, sua vantagem</span>
          <h2 id="hospedagem-titulo" className="h2">
            Servidor próprio. Isso vira preço em real e cancelamento sem conversa.
          </h2>
          <p className="lead">
            A maioria dos sistemas cobra em dólar e limita o espaço. O nosso roda em estrutura
            própria — e passa a diferença para você.
          </p>
        </div>

        <ul className="hospedagem__lista reveal">
          {ITENS.map((item) => (
            <li className="card hospedagem__item" key={item.titulo}>
              <strong>{item.titulo}</strong> <span>{item.texto}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
