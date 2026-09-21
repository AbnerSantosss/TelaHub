import { CNPJ, VERSAO_LEGAL } from './rotas';
import './Legal.css';

/**
 * POLÍTICA DE PRIVACIDADE (LGPD) — `/privacidade`.
 *
 * ── Por que esta página é condição para anunciar ────────────────────────────
 * Este site carrega, na primeira visita, o Google Tag Manager (que distribui
 * para o Google Analytics 4 e o Google Ads) e o Pixel do Meta — os dois estão
 * no `index.html`, dá para conferir no código-fonte da página. Um site que
 * carrega essas tags e captura lead sem publicar uma política é reprovado na
 * revisão de anúncio do Meta e do Google, e está em desacordo com o art. 9º da
 * LGPD, que exige informar o titular de forma clara.
 *
 * ── A regra deste texto: só o que o site realmente faz ─────────────────────
 * Cada item aqui foi escrito olhando para o código, não para um modelo pronto
 * de política. Os campos do formulário são os de `LeadModal`; os parâmetros de
 * campanha são os de `lib/funnel.js` (`ATTRIBUTION_KEYS`); o comportamento da
 * faixa de cookies é o de `ConsentBanner` + Consent Mode v2. Copiar uma
 * política genérica que prometa "não usamos cookies de terceiros" seria mentir
 * sobre algo que qualquer pessoa confere apertando F12.
 *
 * ⚠️ ARMADILHA: se um dia entrar uma tag nova (TikTok, LinkedIn, Clarity,
 * Hotjar), ela precisa aparecer no item 4 ANTES de subir para produção.
 * Compartilhar dado com um terceiro não listado é o tipo de falha que só
 * aparece numa reclamação na ANPD, e aí já é tarde.
 *
 * ── `[E-MAIL DO ENCARREGADO]` fica visível de propósito ─────────────────────
 * A LGPD (art. 41, §1º) exige divulgar o canal do encarregado. Não existe hoje
 * um e-mail publicável, e inventar um endereço que ninguém lê é pior do que não
 * ter: o titular escreve, ninguém responde, e o prazo do art. 18 corre contra a
 * empresa mesmo assim. O marcador fica em destaque (borda tracejada) para não
 * passar batido na revisão.
 */

const SECOES = [
  { id: 'controlador', titulo: '1. Quem trata os seus dados' },
  { id: 'dados', titulo: '2. Quais dados são coletados' },
  { id: 'finalidades', titulo: '3. Para que usamos, e com que base legal' },
  { id: 'compartilhamento', titulo: '4. Com quem compartilhamos' },
  { id: 'cookies', titulo: '5. Cookies e a faixa de consentimento' },
  { id: 'prazos', titulo: '6. Por quanto tempo guardamos' },
  { id: 'direitos', titulo: '7. Seus direitos, e como exercê-los' },
  { id: 'seguranca', titulo: '8. Segurança e incidentes' },
  { id: 'nao-fazemos', titulo: '9. O que NÃO fazemos com os seus dados' },
  { id: 'limites', titulo: '10. Limites declarados do serviço' },
  { id: 'mudancas', titulo: '11. Mudanças nesta política' },
];

/**
 * Marcador de campo que só o dono preenche. Nunca substitua por um chute.
 *
 * ⚠️ O texto é montado como UMA string (`'[' + children + ']'`) em vez de
 * `[{children}]`. Escrito da segunda forma, o React trata colchete e conteúdo
 * como nós de texto separados e grava `[<!-- -->E-MAIL DO ENCARREGADO<!-- -->]`
 * no HTML pré-renderizado — o que a pessoa lê continua certo, mas o crawler e
 * as ferramentas de IA leem o marcador picado no meio.
 */
const Pendente = ({ children }) => (
  <span className="legal__pendente">{'[' + children + ']'}</span>
);

/**
 * Finalidade → base legal. Em tabela porque é a pergunta que o titular faz de
 * verdade ("por que vocês podem fazer isso com o meu dado?") e a resposta em
 * prosa vira um parágrafo que ninguém termina de ler.
 */
const BASES = [
  {
    finalidade: 'Criar e manter a sua conta e fazer as telas funcionarem',
    dados: 'Cadastro e conteúdo publicado',
    base: 'Execução de contrato (LGPD art. 7º, V)',
  },
  {
    finalidade: 'Responder ao formulário “Falar com a gente” e enviar proposta',
    dados: 'Nome, e-mail, empresa, telefone',
    base: 'Procedimentos preliminares de contrato (art. 7º, V)',
  },
  {
    finalidade: 'Avisar por e-mail quando uma tela para de responder',
    dados: 'E-mail e sinal de vida das telas',
    base: 'Execução de contrato (art. 7º, V)',
  },
  {
    finalidade: 'Medir o site e os anúncios (Google Analytics, Google Ads, Meta)',
    dados: 'Uso do site, origem da visita, cookies de medição',
    base: 'Consentimento, dado na faixa de cookies (art. 7º, I)',
  },
  {
    finalidade: 'Segurança, prevenção a abuso e registro de acesso',
    dados: 'IP, data e hora, navegador',
    base: 'Obrigação legal (Marco Civil, art. 15) e legítimo interesse (art. 7º, II e IX)',
  },
  {
    finalidade: 'Cobrança e obrigações fiscais e contábeis',
    dados: 'Cadastro e histórico de contratação',
    base: 'Obrigação legal (art. 7º, II)',
  },
];

export default function Privacidade() {
  return (
    <article className="legal">
      <div className="legal__medida legal__cabeca">
        <span className="legal__vigencia">Em vigor desde {VERSAO_LEGAL}</span>
        <h1 className="h1">Política de Privacidade</h1>
        <p className="legal__resumo">
          Em português claro: quais dados o TelaHub coleta, por que coleta, com quem compartilha, por
          quanto tempo guarda e como você pede acesso, correção ou exclusão. Se alguma coisa aqui
          estiver confusa, escreva para o encarregado. O endereço está no item 7.
        </p>
      </div>

      <nav className="legal__medida legal__sumario" aria-label="Índice da política">
        <h2>Nesta política</h2>
        <ol>
          {SECOES.map((secao) => (
            <li key={secao.id}>
              <a href={`#${secao.id}`}>{secao.titulo.replace(/^\d+\.\s*/, '')}</a>
            </li>
          ))}
        </ol>
      </nav>

      <section className="legal__medida legal__secao" id="controlador">
        <h2>1. Quem trata os seus dados</h2>
        <p>
          O controlador dos dados é <Pendente>RAZÃO SOCIAL</Pendente>, inscrita no CNPJ sob o nº{' '}
          <strong>{CNPJ}</strong>, com endereço em <Pendente>ENDEREÇO</Pendente>, que presta o
          serviço sob o nome comercial <strong>TelaHub</strong>.
        </p>
        <p>
          Encarregado pelo tratamento de dados pessoais (art. 41 da LGPD):{' '}
          <Pendente>E-MAIL DO ENCARREGADO</Pendente>.
        </p>
      </section>

      <section className="legal__medida legal__secao" id="dados">
        <h2>2. Quais dados são coletados</h2>

        <h3>Dados que você nos dá</h3>
        <ul>
          <li>
            <strong>Formulário de contato:</strong> nome, e-mail e, se você quiser preencher,
            empresa/condomínio e telefone.
          </li>
          <li>
            <strong>Criação de conta no painel:</strong> nome, e-mail e senha (a senha é guardada
            cifrada; nem nós conseguimos lê-la).
          </li>
          <li>
            <strong>Conteúdo que você publica nas telas:</strong> textos, fotos, vídeos, PDFs e
            demais arquivos que você enviar.
          </li>
        </ul>

        <h3>Dados coletados automaticamente</h3>
        <ul>
          <li>
            <strong>Uso do site:</strong> páginas visitadas, cliques nos botões de conversão, data e
            hora, navegador e sistema, endereço IP.
          </li>
          <li>
            <strong>Origem da visita:</strong> os parâmetros de campanha que vêm colados no link do
            anúncio (<code>utm_source</code>, <code>utm_medium</code>, <code>utm_campaign</code>,{' '}
            <code>utm_content</code>, <code>utm_term</code>) e os identificadores de clique{' '}
            <code>gclid</code> (Google), <code>fbclid</code> (Meta), <code>ttclid</code> e{' '}
            <code>msclkid</code>. Eles seguem com você do anúncio até o cadastro e servem para saber
            qual canal trouxe cada cliente.
          </li>
          <li>
            <strong>Cookies de medição</strong> do Google e do Meta, descritos no item 5, só depois
            do seu aceite.
          </li>
          <li>
            <strong>Sinal de vida das telas:</strong> quando uma tela conectada reporta que está no
            ar. É o que permite avisar por e-mail quando ela para de responder.
          </li>
        </ul>

        <p>
          <strong>O que este site não coleta:</strong> dados de cartão de crédito não passam por
          aqui. O site não tem gateway de pagamento; a contratação passa pelo canal comercial.
        </p>
      </section>

      <section className="legal__medida legal__secao" id="finalidades">
        <h2>3. Para que usamos, e com que base legal</h2>
        <div className="legal__tabela">
          <table>
            <thead>
              <tr>
                <th scope="col">Para quê</th>
                <th scope="col">Quais dados</th>
                <th scope="col">Base legal (LGPD)</th>
              </tr>
            </thead>
            <tbody>
              {BASES.map((linha) => (
                <tr key={linha.finalidade}>
                  <td>{linha.finalidade}</td>
                  <td>{linha.dados}</td>
                  <td>{linha.base}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Não usamos os seus dados para nenhuma finalidade fora desta tabela. Se um uso novo
          aparecer, ele entra aqui antes de começar.
        </p>
      </section>

      <section className="legal__medida legal__secao" id="compartilhamento">
        <h2>4. Com quem compartilhamos</h2>
        <p>
          Compartilhamos o mínimo necessário, e sempre com quem executa uma das finalidades do item
          3. Hoje, nominalmente:
        </p>
        <ul>
          <li>
            <strong>Google</strong>: Google Tag Manager, <strong>Google Analytics 4</strong> e{' '}
            <strong>Google Ads</strong>. Recebem dados de navegação e de conversão para medir o site
            e as campanhas. São carregados neste site e só passam a gravar cookie depois do seu
            aceite na faixa.
          </li>
          <li>
            <strong>Meta Platforms (Facebook e Instagram)</strong>: Pixel do Meta e API de
            Conversões. Recebem eventos de visita e de conversão para medir e otimizar os anúncios.
            O Pixel também fica bloqueado até o seu aceite.
          </li>
          <li>
            <strong>Provedor de infraestrutura</strong> onde o serviço está hospedado, e o serviço de
            envio de e-mails transacionais (confirmação de conta, aviso de tela fora do ar).
          </li>
          <li>
            <strong>Autoridades públicas</strong>, quando houver ordem judicial ou obrigação legal.
          </li>
        </ul>
        <p>
          <strong>Transferência internacional:</strong> Google e Meta são empresas com sede fora do
          Brasil, então parte desses dados é tratada no exterior (art. 33 da LGPD). Isso acontece com
          base no seu consentimento para medição e nas cláusulas contratuais dessas empresas.
        </p>
        <p>Não vendemos os seus dados e não os cedemos para lista de terceiros.</p>
      </section>

      <section className="legal__medida legal__secao" id="cookies">
        <h2>5. Cookies e a faixa de consentimento</h2>
        <p>Há dois tipos de cookie aqui, e eles não são tratados do mesmo jeito.</p>
        <ul>
          <li>
            <strong>Necessários.</strong> Guardam a sua sessão no painel e a própria escolha que você
            fez na faixa de cookies. Sem eles o site não funciona, e por isso não dependem de aceite.
          </li>
          <li>
            <strong>De medição.</strong> São os do Google Analytics, do Google Ads e do Meta. Servem
            para saber quantas pessoas chegaram, de onde vieram e quais clicaram em “Colocar minha 1ª
            tela no ar”.
          </li>
        </ul>
        <p>
          <strong>A medição fica desligada até você aceitar.</strong> Na primeira visita, as tags de
          Google e Meta carregam com o consentimento <em>negado</em>: armazenamento de anúncio,
          armazenamento de análise, dados de usuário e personalização, todos negados; o Pixel do Meta
          entra com <code>consent revoke</code>. Nada é gravado nem enviado antes de você clicar em
          aceitar na faixa que aparece no rodapé da tela. Se você recusar, o site continua funcionando
          igual, só não conta a sua visita.
        </p>
        <p>
          <strong>Como mudar de ideia:</strong> a sua escolha fica guardada no seu próprio navegador.
          Para rever a decisão, limpe os dados deste site nas configurações do navegador, e a faixa
          aparece de novo na próxima visita. Você também pode bloquear cookies diretamente no
          navegador, a qualquer momento.
        </p>
      </section>

      <section className="legal__medida legal__secao" id="prazos">
        <h2>6. Por quanto tempo guardamos</h2>
        <ul>
          <li>
            <strong>Conta e conteúdo das telas:</strong> enquanto a conta existir. Depois do
            encerramento, guardamos por até 90 dias para o caso de você querer os arquivos de volta,
            e então apagamos.
          </li>
          <li>
            <strong>Contato que não virou cliente:</strong> até 24 meses, para retomar a conversa
            comercial. Você pode pedir a exclusão antes disso, a qualquer momento.
          </li>
          <li>
            <strong>Dados de contratação, cobrança e nota:</strong> pelo prazo exigido pela
            legislação fiscal e contábil, hoje de 5 anos.
          </li>
          <li>
            <strong>Registros de acesso à aplicação:</strong> 6 meses, como determina o art. 15 do
            Marco Civil da Internet.
          </li>
          <li>
            <strong>Cookies de medição:</strong> o prazo é definido pelo Google e pela Meta e pode
            chegar a cerca de 2 anos. Limpar os dados do site no navegador remove todos eles.
          </li>
        </ul>
        <p>
          Passados os prazos, os dados são apagados ou anonimizados. Anonimizado quer dizer que o
          registro deixa de permitir identificar você, e aí ele não é mais dado pessoal.
        </p>
      </section>

      <section className="legal__medida legal__secao" id="direitos">
        <h2>7. Seus direitos, e como exercê-los</h2>
        <p>O art. 18 da LGPD garante que você pode pedir, a qualquer momento:</p>
        <ul>
          <li>confirmação de que tratamos dados seus, e acesso a eles;</li>
          <li>correção de dado incompleto, inexato ou desatualizado;</li>
          <li>
            anonimização, bloqueio ou eliminação de dado desnecessário, excessivo ou tratado fora da
            lei;
          </li>
          <li>portabilidade dos seus dados para outro fornecedor;</li>
          <li>
            eliminação dos dados tratados com o seu consentimento (a medição, por exemplo), sem que
            isso afete o que a lei nos obriga a guardar;
          </li>
          <li>informação sobre com quem compartilhamos os seus dados (a lista está no item 4);</li>
          <li>
            informação sobre a possibilidade de não consentir, e o que acontece se você não consentir
            (resposta curta: o site funciona igual);
          </li>
          <li>revogação do consentimento.</li>
        </ul>
        <p>
          <strong>Como pedir:</strong> escreva para o encarregado, em{' '}
          <Pendente>E-MAIL DO ENCARREGADO</Pendente>, dizendo o que você quer. Respondemos em até{' '}
          <strong>15 dias</strong>. Podemos pedir alguma informação para confirmar que é você mesmo:
          entregar dado pessoal para a pessoa errada seria o problema que essa política existe para
          evitar.
        </p>
        <p>
          Se a resposta não resolver, você pode registrar reclamação na{' '}
          <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong>.
        </p>
      </section>

      <section className="legal__medida legal__secao" id="seguranca">
        <h2>8. Segurança e incidentes</h2>
        <p>
          Usamos conexão cifrada (HTTPS) no site e no painel, senhas guardadas de forma cifrada,
          acesso restrito a quem precisa e separação entre as contas de clientes diferentes.
        </p>
        <p>
          Nenhum sistema é totalmente seguro, e prometer o contrário seria a única frase desta página
          que ninguém consegue cumprir. Se acontecer um incidente com risco relevante para você,
          comunicamos você e a ANPD, dizendo o que houve, quais dados foram atingidos e o que fizemos
          a respeito.
        </p>
      </section>

      <section className="legal__medida legal__secao" id="nao-fazemos">
        <h2>9. O que NÃO fazemos com os seus dados</h2>
        <ul>
          <li>Não vendemos, alugamos nem cedemos seus dados para listas de terceiros.</li>
          <li>
            Não tomamos decisão automatizada sobre você: nada de perfil que aprove, recuse ou
            precifique de forma diferente.
          </li>
          <li>
            Não usamos o conteúdo que você publica nas suas telas para outra coisa senão exibi-lo nas
            suas telas.
          </li>
          <li>Não coletamos dados de cartão neste site.</li>
          <li>
            O serviço não é dirigido a menores de 18 anos e não coletamos dados de crianças e
            adolescentes de forma intencional.
          </li>
        </ul>
      </section>

      <section className="legal__medida legal__secao" id="limites">
        <h2>10. Limites declarados do serviço</h2>
        <p>
          Estes limites estão repetidos aqui, e não só nos{' '}
          <a href="/termos#nao-fazemos">Termos de uso</a>, porque eles mudam o que você deve esperar
          do produto:
        </p>

        <div className="legal__limites">
          <h3>O que o TelaHub ainda NÃO faz</h3>
          <ul>
            <li>
              <strong>Não funciona sem internet.</strong> A tela reiniciada sem conexão não carrega a
              programação.
            </li>
            <li>
              <strong>Não há aplicativo para instalar</strong>, nem na TV nem no celular: tudo roda
              no navegador.
            </li>
            <li>
              <strong>Não há marca própria, SSO/SAML nem SLA contratado</strong>, e não prometemos
              disponibilidade em porcentagem.
            </li>
            <li>
              <strong>Não há autenticação de dois fatores</strong> no painel, e por isso vale a pena
              usar uma senha que você não use em outro lugar.
            </li>
          </ul>
        </div>
      </section>

      <section className="legal__medida legal__secao" id="mudancas">
        <h2>11. Mudanças nesta política</h2>
        <p>
          Esta política está na versão <strong>{VERSAO_LEGAL}</strong>. Quando ela mudar, a nova data
          aparece no topo desta página, e a mudança é comunicada aos clientes ativos pelo e-mail
          cadastrado. Se a alteração envolver um uso novo que dependa de consentimento, a faixa
          aparece de novo para você decidir.
        </p>
      </section>

      <p className="legal__medida legal__rodape">
        <span>
          Versão {VERSAO_LEGAL} · TelaHub · CNPJ {CNPJ}
        </span>
        <a href="/termos">Termos de uso</a>
        <a href="/">Voltar para a página inicial</a>
      </p>
    </article>
  );
}
