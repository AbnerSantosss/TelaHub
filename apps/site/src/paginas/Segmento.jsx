import { Fragment } from 'react';
import Passos from '../components/Passos';
import Formatos from '../components/Formatos';
import Precos from '../components/Precos';
import RiscoZero from '../components/RiscoZero';
import CtaFinal from '../components/CtaFinal';
import { track, EVENT } from '../lib/tracking';
import { conversionDestination } from '../lib/funnel';
import { SEGMENTOS } from './rotas';
import './Segmento.css';

/**
 * Página de segmento — o destino dos anúncios.
 *
 * ── Por que uma página por segmento, e não só a home ────────────────────────
 * A home é horizontal de propósito (condomínio, escritório, clínica, loja,
 * academia), e é isso que a faz servir para quem chega sem saber que tem o
 * problema. Mas anúncio não chega assim: o síndico clica em "aviso de
 * assembleia na TV da portaria" e cai numa página que fala de seis públicos —
 * ele gasta os três segundos que tinha procurando o dele. A página de segmento
 * devolve, no herói, a MESMA frase que estava no anúncio. O resto da página
 * continua sendo o da home (como funciona, formatos, preço, risco zero),
 * porque a objeção que vem depois do "é pra mim" é igual para todo mundo.
 *
 * ⚠️ Comida continua não abrindo nada. `/loja` cita lanchonete no meio de uma
 * lista de seis tipos de comércio — é um caso entre vários, nunca o título.
 *
 * ── O que estas páginas NÃO podem fazer ─────────────────────────────────────
 * Nenhum fato novo. Elas recortam o que a home já diz para um público; se uma
 * frase daqui não puder ser dita na home, ela é promessa inventada. Sem prazo
 * de teste, sem depoimento, sem nota, sem "+N clientes", sem porcentagem de
 * aumento de venda, sem disponibilidade em número.
 *
 * ── Medição: um `cta_click` por página, com `cta_location` próprio ──────────
 * O botão do herói dispara o evento DAQUI (e não pelo `startConversion` do
 * `App`) para carregar `cta_location: 'hero_condominio' | 'hero_clinica' |
 * 'hero_loja'`. É esse campo que responde à única pergunta que decide orçamento
 * de mídia: qual segmento converte. Os demais botões da página (grade de
 * preços, CTA final) passam pelo `App`, mas com o slug do segmento colado no
 * `cta_location` — ver `converterNoSegmento` abaixo.
 *
 * ⚠️ ARMADILHA: o clique NÃO pode ser contado duas vezes. Se este componente
 * disparasse `track()` e ainda chamasse `startConversion` (que dispara o seu
 * próprio `cta_click`), o mesmo clique apareceria duplicado — e duplicata de
 * conversão não dá erro em lugar nenhum: só divide por dois todo custo por
 * resultado do painel, exatamente o defeito descrito em `lib/tracking.js`.
 * Por isso o herói navega por conta própria, com `conversionDestination`.
 */

const ROTULO_CTA = 'Colocar minha 1ª tela no ar grátis';

const PROVAS = ['Sem cartão', 'Sem técnico', 'Sem fidelidade no mensal', 'Deitada ou em pé'];

export default function Segmento({ dados, startConversion, abrirContato, irParaSecao }) {
  const { slug, chip, h1, grito, sub, cena, bullets, imagem, faq } = dados;

  /**
   * Conversão do herói. Um evento, com o `cta_location` do segmento, e só
   * então a navegação — o `track` vem ANTES do `window.location.href` porque
   * sair da página cancela requisição em voo, e clique não medido é venda que
   * some do funil.
   *
   * `plan` e `plan_selected` viajam juntos de propósito: `plan_selected` é o
   * nome que o GTM e o GA4 já leem em toda a jornada; `plan` é o campo curto
   * do recorte por segmento. Campo a mais é ignorado; campo a menos some do
   * relatório.
   */
  const converterNoHeroi = () => {
    track({
      event: EVENT.CTA_CLICK,
      params: {
        cta_location: `hero_${slug}`,
        cta_label: ROTULO_CTA,
        plan: 'gratis',
        plan_selected: 'Grátis',
      },
    });

    track({
      event: EVENT.BEGIN_CHECKOUT,
      params: {
        cta_location: `hero_${slug}`,
        plan_selected: 'Grátis',
        billing_interval: 'nao_escolhido',
        destination: 'signup',
      },
    });

    const destino = conversionDestination('gratis');
    if (destino) window.location.href = destino;
  };

  /**
   * Os componentes reaproveitados da home (grade de preços, CTA final) recebem
   * o `startConversion` do `App` com o slug do segmento colado no
   * `cta_location`. Sem isso, `precos` e `cta_final` de três páginas diferentes
   * cairiam na mesma linha do relatório e não daria para saber qual anúncio
   * pagou o clique.
   */
  const converterNoSegmento = (planCode, ctaLocation = 'desconhecido', ...resto) =>
    startConversion(planCode, `${ctaLocation}_${slug}`, ...resto);

  const abrirContatoNoSegmento = (planName, ctaLocation = 'desconhecido') =>
    abrirContato(planName, `${ctaLocation}_${slug}`);

  return (
    <>
      <header className="segmento-heroi" id="topo">
        <div className="segmento-heroi__texto">
          <span className="chip">{chip}</span>

          <h1 className="h1 segmento-heroi__h1">
            {h1} <span className="segmento-heroi__grito">{grito}</span>
          </h1>

          <p className="lead segmento-heroi__lead">{sub}</p>

          <div className="segmento-heroi__acoes">
            <button type="button" className="btn btn--grande" onClick={converterNoHeroi}>
              {ROTULO_CTA}
            </button>

            <button
              type="button"
              className="btn btn--texto btn--sublinhado segmento-heroi__secundario"
              onClick={() => irParaSecao('#como-funciona')}
            >
              <span className="btn__rotulo">Ver como funciona</span>
            </button>
          </div>

          {/* .trust é flex com gap; os itens precisam ficar como irmãos DIRETOS
              para o espaçamento sair igual ao do herói da home. O separador é
              decorativo — sem aria-hidden, o leitor de tela anuncia "ponto"
              entre cada item. */}
          <p className="trust">
            {PROVAS.map((prova, i) => (
              <Fragment key={prova}>
                {i > 0 && <span aria-hidden="true">·</span>}
                <span>{prova}</span>
              </Fragment>
            ))}
          </p>
        </div>

        {/* A legenda diz o que a imagem é. Renderização apresentada como foto
            de cliente é a mentira mais fácil de cometer numa landing — e a
            única que o visitante confere sozinho, comparando com o produto
            depois de assinar. */}
        <figure className="segmento-heroi__figura">
          <div className="shot">
            <img src={imagem.src} alt={imagem.alt} loading="eager" />
          </div>
          <figcaption className="cap">{imagem.legenda}</figcaption>
        </figure>
      </header>

      <section className="secao secao--papel segmento-cena" aria-labelledby="cena-titulo">
        <div className="secao__cabeca reveal">
          <h2 id="cena-titulo" className="h2">
            {cena.titulo}
          </h2>
          <p className="lead">{cena.lead}</p>
        </div>

        <ul className="segmento-cena__lista grid-3" role="list">
          {bullets.map((bullet) => (
            <li key={bullet.rotulo} className="card segmento-bullet reveal">
              <span className="segmento-bullet__rotulo">{bullet.rotulo}</span>
              <p className="segmento-bullet__texto">{bullet.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <Passos />
      <Formatos />
      <Precos startConversion={converterNoSegmento} abrirContato={abrirContatoNoSegmento} />
      <RiscoZero abrirContato={() => abrirContatoNoSegmento('Setup assistido', 'risco_zero')} />

      {/* id="duvidas" porque o rodapé aponta para essa âncora em toda página.
          Link de rodapé para âncora inexistente é clique que não anda — e o
          visitante conclui que o site está quebrado, não que ele errou. */}
      <section id="duvidas" className="secao segmento-faq" aria-labelledby="segmento-faq-titulo">
        <div className="secao__cabeca reveal">
          <h2 id="segmento-faq-titulo" className="h2">
            {faq.titulo}
          </h2>
        </div>

        {/* <details> nativo: estado, teclado e leitor de tela vêm corretos de
            graça, e como a página é pré-renderizada a resposta está no HTML
            mesmo com o item fechado — é isso que permite indexar as perguntas. */}
        <div className="segmento-faq__lista">
          {faq.itens.map((item) => (
            <details key={item.pergunta} className="segmento-faq__item reveal">
              <summary className="segmento-faq__pergunta">{item.pergunta}</summary>
              <p className="segmento-faq__resposta">{item.resposta}</p>
            </details>
          ))}
        </div>

        <p className="micro segmento-faq__mais">
          As dúvidas gerais (TV compatível, queda de internet, preço por tela) estão na{' '}
          <a href="/#duvidas">página inicial</a>.
        </p>

        {/* Cruzamento entre as páginas de segmento. Elas nascem para receber
            anúncio, então nada na home aponta para elas — e página órfã é
            página que o Google rastreia menos. Aqui o visitante que caiu na
            cena errada acha a dele em um clique, em vez de voltar. */}
        <nav className="segmento-faq__outras" aria-label="Outras cenas">
          <span className="micro">A mesma tela em outro lugar:</span>
          <ul role="list">
            {SEGMENTOS.filter((outro) => outro.pagina !== slug).map((outro) => (
              <li key={outro.caminho}>
                <a href={outro.caminho}>{outro.rotuloCurto}</a>
              </li>
            ))}
            <li>
              <a href="/">Ver todas as cenas</a>
            </li>
          </ul>
        </nav>
      </section>

      <CtaFinal startConversion={converterNoSegmento} />
    </>
  );
}
