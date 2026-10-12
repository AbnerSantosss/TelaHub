import { CNPJ, VERSAO_LEGAL } from './rotas';
import './Legal.css';

/**
 * TERMOS DE USO — `/termos`.
 *
 * ── Por que esta página existe agora ────────────────────────────────────────
 * O site coleta lead (`POST /api/leads`), grava cookie de campanha e o painel
 * cria conta. Anunciar um site assim sem identificar quem está por trás é
 * reprovação certa na revisão do Meta e do Google Ads — e, antes disso, é
 * infração ao art. 6º, III do CDC, que dá ao consumidor o direito de saber com
 * quem ele está contratando. Enquanto o rodapé dizia "em preparação", nenhuma
 * campanha podia rodar.
 *
 * ── A regra de ouro deste texto: nada aqui pode ser fato inventado ──────────
 * Termo de uso é o documento que o cliente cita quando pede o dinheiro de
 * volta. Prometer aqui o que o produto não faz é pior do que não ter o
 * documento: vira prova escrita contra a empresa (CDC arts. 30 e 37). Por isso
 * NÃO aparecem: percentual de disponibilidade, SLA, funcionamento sem
 * internet, aplicativo próprio, Pix, boleto e emissão automática de nota
 * fiscal. Nenhum desses existe hoje. O item 10 diz isso com todas as letras.
 *
 * ── Os marcadores entre colchetes são deliberados ───────────────────────────
 * `[RAZÃO SOCIAL]` e `[ENDEREÇO]` são os dois campos que só o dono pode
 * preencher. Inventar razão social ou endereço seria falsidade em documento de
 * identificação empresarial — e o cliente confere. Eles ficam visíveis
 * (`.legal__pendente`, borda tracejada laranja) para não passarem despercebidos
 * numa revisão rápida. O CNPJ é público e já está aqui.
 *
 * ── A carência de 10 dias é COMPROMISSO, não descrição ──────────────────────
 * Diferente do resto do texto, o prazo de suspensão por atraso não descreve um
 * comportamento existente do sistema: ele o cria. Foi escrito para o lado do
 * consumidor (aviso antes, prazo folgado, tela do Grátis nunca suspensa)
 * porque errar para esse lado é barato. Se o dono mudar o prazo, a string
 * `VERSAO_LEGAL` muda junto — versão de termo que muda sem trocar a data é
 * como um cliente é cobrado por uma regra que ele nunca leu.
 */

const SECOES = [
  { id: 'quem-somos', titulo: '1. Quem presta o serviço' },
  { id: 'o-que-e', titulo: '2. O que o TelaHub faz' },
  { id: 'conta-gratis', titulo: '3. A conta grátis' },
  { id: 'planos', titulo: '4. Planos pagos e cobrança' },
  { id: 'arrependimento', titulo: '5. Arrependimento em 7 dias' },
  { id: 'cancelamento', titulo: '6. Cancelamento e fim do contrato' },
  { id: 'conteudo', titulo: '7. O conteúdo das telas é seu' },
  { id: 'internet', titulo: '8. O serviço depende de internet no local' },
  { id: 'suspensao', titulo: '9. Atraso de pagamento e suspensão' },
  { id: 'nao-fazemos', titulo: '10. O que o TelaHub ainda NÃO faz' },
  { id: 'mudancas', titulo: '11. Mudanças nestes termos' },
  { id: 'lei', titulo: '12. Lei aplicável e foro' },
];

/**
 * Marcador de campo que só o dono preenche. Nunca substitua por um chute.
 *
 * ⚠️ O texto é montado como UMA string (`'[' + children + ']'`) em vez de
 * `[{children}]`. Escrito da segunda forma, o React trata colchete e conteúdo
 * como nós de texto separados e grava `[<!-- -->RAZÃO SOCIAL<!-- -->]` no HTML
 * pré-renderizado — o que a pessoa lê continua certo, mas o crawler e as
 * ferramentas de IA leem o marcador picado no meio.
 */
const Pendente = ({ children }) => (
  <span className="legal__pendente">{'[' + children + ']'}</span>
);

export default function Termos() {
  return (
    <article className="legal">
      <div className="legal__medida legal__cabeca">
        <span className="legal__vigencia">Em vigor desde {VERSAO_LEGAL}</span>
        <h1 className="h1">Termos de uso</h1>
        <p className="legal__resumo">
          Este documento explica, em português claro, o que o TelaHub faz, o que ele ainda não faz,
          como se contrata, como se cancela e quem responde pelo quê. Ele vale para quem usa o site,
          a conta grátis e os planos pagos.
        </p>
      </div>

      <nav className="legal__medida legal__sumario" aria-label="Índice dos termos">
        <h2>Neste documento</h2>
        <ol>
          {SECOES.map((secao) => (
            <li key={secao.id}>
              <a href={`#${secao.id}`}>{secao.titulo.replace(/^\d+\.\s*/, '')}</a>
            </li>
          ))}
        </ol>
      </nav>

      <section className="legal__medida legal__secao" id="quem-somos">
        <h2>1. Quem presta o serviço</h2>
        <p>
          O TelaHub é o nome comercial do serviço prestado por <Pendente>RAZÃO SOCIAL</Pendente>,
          inscrita no CNPJ sob o nº <strong>{CNPJ}</strong>, com endereço em{' '}
          <Pendente>ENDEREÇO</Pendente>.
        </p>
        <p>
          O canal de atendimento é o formulário <em>&ldquo;Falar com a gente&rdquo;</em>, na{' '}
          <a href="/#precos">página inicial</a>, e o mesmo canal por onde a contratação foi feita.
          Pedidos sobre dados pessoais têm canal próprio, descrito na{' '}
          <a href="/privacidade">Política de Privacidade</a>.
        </p>
      </section>

      <section className="legal__medida legal__secao" id="o-que-e">
        <h2>2. O que o TelaHub faz</h2>
        <p>
          O TelaHub coloca avisos, ofertas, agenda e informação nas telas de um lugar (a portaria de
          um condomínio, a recepção de uma empresa, a sala de espera de uma clínica, o balcão de uma
          loja, a academia) usando a TV que já existe ali.
        </p>
        <p>Na prática:</p>
        <ul>
          <li>
            você monta o que vai aparecer no navegador, em blocos (texto, foto, vídeo, relógio,
            clima, agenda, PDF e outros, conforme o plano);
          </li>
          <li>
            a TV é ligada abrindo o endereço no navegador dela (ou num aparelho de HDMI comum) e
            digitando um código de 6 dígitos que aparece na própria tela;
          </li>
          <li>
            a troca de conteúdo é feita de qualquer navegador, inclusive o do celular, e a tela se
            atualiza sozinha.
          </li>
        </ul>
        <p>
          Cada tela tem um formato: deitada (16:9) ou em pé (9:16). Os dois convivem no mesmo painel.
        </p>
      </section>

      <section className="legal__medida legal__secao" id="conta-gratis">
        <h2>3. A conta grátis</h2>
        <p>
          A conta grátis permite <strong>1 tela conectada</strong>, sem prazo para acabar e sem
          cadastrar cartão de crédito. Ela não é um período de avaliação: não vira paga sozinha, não
          expira e não gera cobrança.
        </p>
        <p>
          Se você usar o plano grátis por meses e depois contratar um plano pago,{' '}
          <strong>não há cobrança retroativa</strong> pelo tempo em que você esteve no grátis. O que
          passou, passou de graça.
        </p>
      </section>

      <section className="legal__medida legal__secao" id="planos">
        <h2>4. Planos pagos e cobrança</h2>
        <ul>
          <li>
            A cobrança é <strong>por tela ativa</strong>, em real, e os valores vigentes são os
            exibidos na grade de planos da <a href="/#precos">página inicial</a> no momento da
            contratação.
          </li>
          <li>
            Existem dois intervalos: <strong>mensal</strong>, sem fidelidade, e{' '}
            <strong>anual</strong>, que sai mais barato por tela justamente por ser um{' '}
            <strong>compromisso de 12 meses</strong>.
          </li>
          <li>
            O plano Rede tem um piso de 5 telas na fatura: abaixo disso a fatura é calculada como se
            fossem 5 telas.
          </li>
          <li>
            O plano Enterprise não tem preço público; escopo, prazo e valores são definidos em
            proposta e contrato específicos.
          </li>
          <li>
            Os meios de pagamento disponíveis são informados no momento da contratação. Não há
            cobrança automática por um meio que você não tenha autorizado.
          </li>
        </ul>
        <p>
          Mudança de preço não se aplica a contrato já em curso: quem está no anual mantém o valor
          contratado até o fim dos 12 meses, e quem está no mensal é avisado antes do ciclo em que o
          novo valor passa a valer.
        </p>
      </section>

      <section className="legal__medida legal__secao" id="arrependimento">
        <h2>5. Arrependimento em 7 dias</h2>
        <p>
          Como a contratação acontece pela internet, fora de um estabelecimento comercial, vale o{' '}
          <strong>art. 49 do Código de Defesa do Consumidor</strong>: você pode desistir da
          contratação em até <strong>7 (sete) dias corridos</strong>, contados da data em que
          contratou.
        </p>
        <p>
          Nesse prazo, os valores eventualmente pagos são devolvidos integralmente, corrigidos, sem
          multa e sem necessidade de justificar o motivo. Basta pedir pelo canal de atendimento do
          item 1.
        </p>
        <p>
          Isso vale também para o plano anual, e é a razão pela qual assinar o anual não é uma
          decisão sem volta.
        </p>
      </section>

      <section className="legal__medida legal__secao" id="cancelamento">
        <h2>6. Cancelamento e fim do contrato</h2>
        <ul>
          <li>
            <strong>Plano mensal:</strong> pode ser encerrado a qualquer momento, sem multa. O
            serviço continua funcionando até o fim do período já pago, e não há nova cobrança depois
            disso.
          </li>
          <li>
            <strong>Plano anual:</strong> é um contrato de 12 meses. Passados os 7 dias de
            arrependimento, o encerramento antecipado é tratado caso a caso pelo canal de
            atendimento; o valor já pago corresponde ao período contratado.
          </li>
          <li>
            <strong>Conta grátis:</strong> não há o que cancelar, porque não há cobrança. Se você
            parar de usar, a tela simplesmente deixa de exibir.
          </li>
        </ul>
        <p>
          O pedido de cancelamento é feito pelo canal de atendimento do item 1 ou pelo mesmo caminho
          por onde a contratação foi feita. Depois do encerramento, você pode pedir uma cópia do
          conteúdo que publicou; guardamos esse material por tempo limitado, conforme descrito na{' '}
          <a href="/privacidade#prazos">Política de Privacidade</a>.
        </p>
      </section>

      <section className="legal__medida legal__secao" id="conteudo">
        <h2>7. O conteúdo das telas é seu</h2>
        <p>
          Tudo que você publica nas suas telas (texto, foto, vídeo, PDF, preço, aviso) continua
          sendo seu, e a responsabilidade por ele é sua. Ao publicar, você declara que:
        </p>
        <ul>
          <li>tem o direito de usar as imagens, vídeos, músicas e marcas que colocou na tela;</li>
          <li>
            a informação exibida é verdadeira: preço anunciado na tela obriga quem anuncia (CDC
            arts. 30 e 35);
          </li>
          <li>
            não vai publicar conteúdo ilegal, que ofenda alguém, ou que exponha dado pessoal de
            terceiros sem base legal para isso.
          </li>
        </ul>
        <p>
          Não revisamos previamente o que você publica. Se formos comunicados de conteúdo ilegal ou
          que viole direito de outra pessoa, podemos removê-lo ou suspender a tela, avisando você.
        </p>
        <p>
          Do nosso lado: não usamos o seu conteúdo para outra finalidade que não seja exibi-lo nas
          suas telas e manter o serviço funcionando.
        </p>
      </section>

      <section className="legal__medida legal__secao" id="internet">
        <h2>8. O serviço depende de internet no local</h2>
        <p>
          A tela precisa de conexão para receber e atualizar o conteúdo. Se a internet do lugar cair,
          a tela mantém o que já estava exibindo; mas se o aparelho for reiniciado sem conexão, a
          programação não carrega, porque o conteúdo ainda não fica guardado na memória do aparelho.
        </p>
        <p>
          Também dependemos de coisas fora do nosso alcance: a energia elétrica do local, o provedor
          de internet, o navegador da TV e os serviços de terceiros que você escolher exibir (um
          vídeo do YouTube, uma página da web, um documento hospedado em outro serviço). Interrupção
          causada por esses fatores não é falha do serviço.
        </p>
        <p>
          Podemos interromper o serviço para manutenção. Quando a parada for programada, avisamos
          antes.
        </p>
      </section>

      <section className="legal__medida legal__secao" id="suspensao">
        <h2>9. Atraso de pagamento e suspensão</h2>
        <ul>
          <li>
            A suspensão por atraso só acontece depois de <strong>10 (dez) dias corridos</strong>{' '}
            contados do vencimento, e sempre precedida de aviso por e-mail no endereço cadastrado.
          </li>
          <li>
            Durante a carência o serviço continua no ar: a ideia é dar tempo para resolver, não
            desligar a portaria do condomínio no dia seguinte ao vencimento.
          </li>
          <li>
            Regularizado o pagamento, as telas voltam ao ar com o mesmo conteúdo, sem taxa de
            religação.
          </li>
          <li>Telas do plano grátis não são suspensas por atraso, porque nele não há cobrança.</li>
        </ul>
      </section>

      <section className="legal__medida legal__secao" id="nao-fazemos">
        <h2>10. O que o TelaHub ainda NÃO faz</h2>
        <p>
          Esta lista está aqui de propósito. Descrever o produto além do que ele faz seria
          publicidade enganosa (CDC arts. 30 e 37), e é melhor você saber disso antes de contratar do
          que na primeira queda de energia.
        </p>

        <div className="legal__limites">
          <h3>Limites declarados, hoje</h3>
          <ul>
            <li>
              <strong>Não funciona sem internet.</strong> A tela reiniciada sem conexão não carrega a
              programação.
            </li>
            <li>
              <strong>Não há aplicativo para instalar.</strong> Nada de app para Android TV ou para
              celular: o conteúdo roda no navegador da TV ou de um aparelho de HDMI comum, e o painel
              roda no navegador.
            </li>
            <li>
              <strong>Não há marca própria (white label), SSO/SAML nem SLA contratado.</strong> No
              plano Enterprise esses itens são escopo de projeto definido em contrato, não são
              recurso pronto de prateleira.
            </li>
            <li>
              <strong>Não prometemos disponibilidade em porcentagem.</strong> Não há número de uptime
              contratado, e por isso também não há crédito automático por indisponibilidade.
            </li>
            <li>
              <strong>Não há API para integrar sistemas de terceiros</strong> nem hierarquia de
              matriz e filiais como contas separadas.
            </li>
            <li>
              <strong>Não há agendamento recorrente</strong> (repetir por dia da semana) nem
              autenticação de dois fatores.
            </li>
            <li>
              <strong>Não há pagamento automatizado ainda.</strong> Não há gateway integrado e,
              portanto, não há Pix, boleto nem emissão automática de nota fiscal pelo site. A
              contratação passa pelo canal comercial.
            </li>
          </ul>
        </div>
      </section>

      <section className="legal__medida legal__secao" id="mudancas">
        <h2>11. Mudanças nestes termos</h2>
        <p>
          Estes termos estão na versão <strong>{VERSAO_LEGAL}</strong>. Se eles mudarem, a nova data
          aparece no topo desta página e a alteração é comunicada com antecedência aos clientes
          ativos, pelo e-mail cadastrado.
        </p>
        <p>
          Mudança que reduza direito seu ou aumente preço não vale para contrato em curso sem o seu
          aceite: nesse caso, você pode encerrar o contrato sem multa.
        </p>
      </section>

      <section className="legal__medida legal__secao" id="lei">
        <h2>12. Lei aplicável e foro</h2>
        <p>
          Aplica-se a lei brasileira, especialmente o Código de Defesa do Consumidor (Lei
          8.078/1990), o Marco Civil da Internet (Lei 12.965/2014) e a Lei Geral de Proteção de Dados
          (Lei 13.709/2018).
        </p>
        <p>
          Para resolver qualquer questão sobre estes termos, o consumidor pode escolher o foro do seu
          próprio domicílio, como assegura o art. 101, I, do Código de Defesa do Consumidor. Antes
          disso, fale com a gente: quase tudo se resolve por e-mail.
        </p>
      </section>

      <p className="legal__medida legal__rodape">
        <span>
          Versão {VERSAO_LEGAL} · TelaHub · CNPJ {CNPJ}
        </span>
        <a href="/privacidade">Política de Privacidade</a>
        <a href="/">Voltar para a página inicial</a>
      </p>
    </article>
  );
}
