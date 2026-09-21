import { signupUrl } from '../lib/funnel';
import { EVENT, track } from '../lib/tracking';
import './Passos.css';

/**
 * PASSOS — "Leva menos tempo que fazer um cartaz."
 *
 * ── Por que a seção existe ──────────────────────────────────────────────────
 * A objeção que mata a venda não é preço, é medo de instalação: quem nunca
 * ligou nada numa TV imagina técnico, cabo, caixinha, mensalidade de aparelho.
 * A seção existe para matar esse medo em três linhas — criar, arrastar,
 * digitar seis dígitos — e para provar a terceira com a foto da tela de
 * verdade, não com um desenho.
 *
 * ── Por que a captura é real ────────────────────────────────────────────────
 * A imagem à direita é o que a TV mostra ANTES de o cliente digitar o código.
 * É a primeira coisa que ele vai ver na parede dele, e é justamente a etapa de
 * que ele desconfia. Uma ilustração bonita aqui valeria menos que a foto feia
 * do produto rodando; a legenda diz "tela real" porque isso é o argumento.
 *
 * ── O que ela não pode dizer ────────────────────────────────────────────────
 * Nem "app", nem "aparelho", nem "instalação": o caminho é o navegador que já
 * existe na TV. Nada de tempo prometido em minutos ("em 5 minutos", "3
 * cliques"), nada de "sem técnico" travestido de garantia, nada de prazo de
 * teste. O aviso de queda diz o que o sistema faz — manda um e-mail — e não
 * promete monitoramento, uptime nem funcionamento sem internet.
 *
 * ── Por que existe um botão aqui, e por que ele tem plano B ─────────────────
 * Quem termina de ler os três passos acabou de perder o medo da instalação: é
 * o segundo melhor momento da página para converter, depois do herói, e até
 * agora a seção terminava sem saída. `cta_location: 'passos'` separa esse
 * clique do clique do topo — sem isso, os dois somem dentro do mesmo número e
 * não dá para saber se a objeção que a seção resolve é a que trava a venda.
 *
 * A `prop` é OPCIONAL de propósito: hoje `App.jsx` renderiza `<Passos />` sem
 * nenhuma, e um botão que depende de prop inexistente seria um clique morto no
 * ar. Sem a prop, a seção usa `signupUrl()` — o MESMO destino que
 * `conversionDestination('gratis')` escolhe, inclusive com a atribuição de
 * campanha na URL. Quando a prop chegar, ela ganha, porque o caminho único de
 * conversão do `App.jsx` também dispara o `begin_checkout`.
 */

const PASSOS = [
  {
    titulo: 'Crie a tela e escolha o formato',
    texto: 'Deitada (16:9) para a TV da parede, em pé (9:16) para totem ou vitrine.',
  },
  {
    titulo: 'Arraste o que quer mostrar',
    texto: 'Texto, foto, vídeo, relógio, clima, notícias, agenda, PDF. Aperte Salvar.',
  },
  {
    titulo: 'Digite o código na TV',
    texto: 'Abra o navegador da TV, entre no endereço e digite os 6 dígitos que aparecem. A TV passa a mostrar a sua tela.',
  },
];

const ROTULO_CTA = 'Colocar minha 1ª tela no ar grátis';

export default function Passos({ startConversion }) {
  const converter = () => {
    track({ event: EVENT.CTA_CLICK, params: { cta_location: 'passos', plan: 'gratis' } });

    if (typeof startConversion === 'function') {
      startConversion('gratis', 'passos', ROTULO_CTA, 1);
      return;
    }

    // Plano B: o mesmo destino do funil, com a atribuição de campanha junto.
    window.location.href = signupUrl();
  };

  return (
    <section
      id="como-funciona"
      className="secao passos"
      aria-labelledby="passos-titulo"
    >
      <div className="split split--midia">
        <div className="passos__texto reveal">
          <p className="chip passos__chip">Como funciona</p>

          <h2 id="passos-titulo" className="h2">
            Leva menos tempo que fazer um cartaz.
          </h2>

          <ol className="passos__lista">
            {PASSOS.map((passo, i) => (
              <li key={passo.titulo} className="passo">
                <span className="passo__num" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="passo__corpo">
                  <h3 className="passo__titulo">{passo.titulo}</h3>
                  <p className="lead passo__texto">{passo.texto}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="lead passos__aviso">
            Se a tela cair, você recebe um e-mail antes de alguém reparar.
          </p>

          <button type="button" className="btn passos__cta" onClick={converter}>
            {ROTULO_CTA}
          </button>
        </div>

        <figure className="passos__midia reveal">
          <div className="shot">
            <img
              src="/capturas/real-tv-codigo.jpg"
              width="1100"
              height="551"
              loading="lazy"
              decoding="async"
              alt="Tela da TV mostrando o código de pareamento de 6 dígitos, em letras grandes sobre fundo escuro, com o endereço a digitar no navegador."
            />
          </div>
          <figcaption className="cap passos__legenda">
            Tela real: é o que a TV mostra até você digitar o código.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
