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
 * DECISÃO 3 — "cancela no painel" e "cancelamento sem conversa" saíram. As duas
 * frases descreviam autoatendimento: um botão no painel que ainda está sendo
 * construído. Enquanto ele não existe, a página estaria prometendo um passo que o
 * cliente não consegue dar, e ele descobriria isso no pior momento possível — o de
 * cancelar. Oferta publicada vincula (CDC art. 30), então o texto passou a dizer o
 * que hoje é verdade: no mensal o cancelamento é PEDIDO e vale a partir do próximo
 * ciclo, sem multa. O canal do pedido é o formulário desta página, que existe e
 * responde. Quando o botão do painel subir, a frase antiga volta — e não antes.
 *
 * Os bilhetes laranja do mockup (.pend) eram recado interno de pendência. Não são
 * conteúdo e não existem aqui.
 */

import './Hospedagem.css';

const ITENS = [
  {
    titulo: 'Preço em real, fixo.',
    texto: 'Não muda com o dólar. Não há taxa extra por vídeo, por tela em pé ou por usuário.',
  },
  {
    titulo: 'Mensal sem fidelidade e sem multa.',
    texto:
      'É só pedir o cancelamento pelo formulário desta página: ele vale a partir do próximo ciclo, sem multa. Nunca cobramos tela que passou. O anual tem compromisso de 12 meses, e é isso que garante o desconto.',
  },
  {
    titulo: 'Vídeo e foto guardados com a gente.',
    texto: 'Até 50 MB por arquivo.',
  },
  {
    titulo: 'Cada negócio no seu espaço.',
    texto: 'Só a sua conta vê o seu conteúdo.',
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
          <span className="chip">Onde o sistema roda</span>
          <h2 id="hospedagem-titulo" className="h2">
            Temos servidor próprio. Por isso o preço é em real e o mensal cancela sem multa.
          </h2>
          <p className="lead">
            A maioria dos sistemas cobra em dólar e limita o espaço. O TelaHub roda em estrutura
            própria, e essa economia vai para o seu preço.
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
