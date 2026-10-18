import { EVENT, track } from '../lib/tracking';
import HeroFundo from './HeroFundo';
import './Hero.css';

/**
 * Herói da landing v2.
 *
 * ── A headline é uma dor invisível, não um recurso ──────────────────────────
 * "A TV da sua loja está passando novela. Podia estar mostrando a sua oferta."
 * Ela funciona porque a pessoa não sabe que tem o problema: a TV está lá,
 * ligada na novela, e ninguém a contabiliza como custo. Headline de recurso
 * ("gerencie suas telas") só converte quem já procura a categoria — e quem já
 * procura é minoria neste mercado.
 *
 * ── Para quem a dobra fala: o dono de comércio (decisão de 18/10) ───────────
 * Em 18/10 o dono definiu que a dobra vende para o dono de comércio: padaria,
 * loja e shopping são os três exemplos das TVs, e a padaria é só um deles. Rede
 * e shopping chegam ao plano Enterprise pelo link discreto abaixo da confiança
 * (cta_location 'hero_enterprise'). A apresentação por porte (condomínio,
 * escritório, clínica) e a regra "comida nunca abre" saíram desta dobra.
 *
 * ── As três TVs são ilustração declarada, não captura ───────────────────────
 * Elas são desenhadas em HTML com os mesmos blocos que existem hoje no editor
 * (texto, foto, relógio, clima, contador), e a legenda diz isso na cara:
 * "Montadas só com os blocos que existem hoje no editor". Mockup que se
 * apresenta como foto de produto é a mentira mais fácil de cometer numa landing
 * — as capturas REAIS aparecem logo abaixo, em "Como funciona" e "Dois
 * formatos". A terceira TV (totem de shopping) só aparece a partir de 981px (duas colunas).
 *
 * ── UM prazo só na página inteira: 30 segundos ──────────────────────────────
 * A página dizia "5 minutos" no CTA final, "2 minutos" no FAQ e "30 segundos"
 * aqui e na comparação. Três prazos diferentes para a mesma promessa é oferta
 * contraditória — e o art. 30 do CDC faz valer a que favorece o consumidor —,
 * além de nenhum dos dois maiores ter sido medido. Sobrou o único verificável:
 * trocar um texto e salvar leva 30 segundos. É o único prazo que pode aparecer
 * em qualquer lugar desta página.
 *
 * ── O ícone de play saiu do botão secundário ────────────────────────────────
 * Ele era um círculo com o triângulo de reprodução, e não existe vídeo nenhum
 * para reproduzir: o botão apenas rola a página até os três passos. Ícone que
 * promete um artefato inexistente é a mesma família do "(60 s)" que já saiu
 * daqui e do "14 dias grátis" que voltou quatro vezes a esta página. Virou uma
 * seta para baixo, que é o que o botão de fato faz.
 *
 * ── "Sem fidelidade" ganhou "Mensal", e não é preciosismo ───────────────────
 * O selo dizia "Sem fidelidade" seco, herdado de quando só existia plano
 * mensal. Em 31/08 o ANUAL virou a oferta principal e vem marcado por padrão na
 * grade — e ele é, por definição, um compromisso de 12 meses. Um selo absoluto
 * ao lado de um contrato anual é a frase que o cliente cita ao pedir o dinheiro
 * de volta (CDC arts. 30 e 37), e o checkout já corrigia isso sozinho trocando
 * a garantia por "Contratação de 12 meses" — ou seja, as duas superfícies
 * diziam coisas diferentes sobre o mesmo contrato. A regra vale para todas as
 * ocorrências da página (aqui, CtaFinal, RiscoZero, Precos, Hospedagem e o
 * FAQ): o mensal continua sem fidelidade, e o anual é apresentado como o que é.
 *
 * ── Medição: o track daqui é o CTA_CLICK do herói ───────────────────────────
 * cta_location vale 'hero' e não se repete em nenhuma outra seção — é o que
 * permite responder "qual botão trouxe o cadastro". ARMADILHA: startConversion
 * (em App.jsx) ainda empurra um cta_click próprio; enquanto os dois existirem,
 * o GA4 conta o clique do herói duas vezes. A correção é do lado do App.jsx —
 * quem manda no nome e no local do evento é o botão que foi clicado.
 */
const Hero = ({ startConversion, scrollToSection }) => (
  <header className="hero" id="topo">
    {/* Grade com luz em --marca. Decorativa (aria-hidden) e atrás de tudo. */}
    <HeroFundo />

    <div className="hero__texto">
      <p className="hero__pre">Para padaria, loja, mercado, farmácia e shopping</p>

      <h1 className="h1">
        A TV da sua loja está passando novela.{' '}
        <span className="hero__grito">Podia estar mostrando a sua oferta.</span>
      </h1>

      <p className="lead hero__lead">
        O pão que acabou de sair, o combo do café, a promoção da semana. Você monta pelo celular e
        troca em 30 segundos, na TV que já está na parede. Serve para uma loja ou para uma rede
        inteira.
      </p>

      <div className="hero__acoes">
        <button
          type="button"
          className="btn btn--grande"
          onClick={() => {
            track({ event: EVENT.CTA_CLICK, params: { cta_location: 'hero', plan: 'gratis' } });
            startConversion('gratis', 'hero', 'Colocar minha 1ª tela no ar grátis');
          }}
        >
          Colocar minha 1ª tela no ar grátis
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>

        <button
          type="button"
          className="btn btn--texto hero__secundario"
          onClick={() => scrollToSection('#como-funciona', 'como-funciona')}
        >
          {/* Seta para baixo: o botão ROLA a página até os passos. O ícone
              anterior era um play dentro de um círculo, e não há vídeo nenhum
              nesta página para ele reproduzir. */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M6 13l6 6 6-6" />
          </svg>
          <span className="btn__rotulo">Ver os 3 passos</span>
        </button>
      </div>

      {/* Quatro fatos, dois por linha no celular (ver Hero.css): em linha
          corrida a quebra deixava um item órfão embaixo e o separador abria a
          linha seguinte. Duas linhas aqui são decisão de layout, não acaso. */}
      <p className="trust hero__trust">
        <span>Sem cartão</span>
        <span aria-hidden="true">·</span>
        <span>Sem técnico</span>
        <span aria-hidden="true">·</span>
        <span>Mensal sem fidelidade</span>
        <span aria-hidden="true">·</span>
        <span>Smart TV já serve</span>
      </p>

      {/* Porta B2B: rede e shopping não cabem no CTA do plano grátis. Link de
          texto, quieto de propósito, para não competir com o botão principal. */}
      <button
        type="button"
        className="btn btn--texto hero__enterprise"
        onClick={() => {
          track({
            event: EVENT.CTA_CLICK,
            params: { cta_location: 'hero_enterprise', plan: 'enterprise' },
          });
          startConversion('enterprise', 'hero_enterprise', 'Falar com a gente');
        }}
      >
        <span className="btn__rotulo">Tem rede ou shopping? Falar com a gente</span>
      </button>
    </div>

    <div className="hero__vitrine">
      <div className="hero__telas">
        {/* Deitada 16:9 — balcão da padaria */}
        <figure className="hero__figura">
          <div className="tv" aria-hidden="true">
            <div className="tv__quadro tv__quadro--deitada">
              <div className="tv__coluna">
                <span className="tv__titulo">Padaria Bela Vista</span>
                <span className="tv__linha">Saindo agora: pão francês</span>
                <span className="tv__destaque">Café + pão na chapa: R$ 9,90 até as 10h</span>
              </div>
              <div className="tv__lado">
                <div className="tv__bloco">
                  <strong>09:41</strong>
                  <span>sáb, 30 ago</span>
                </div>
                <div className="tv__bloco">
                  <strong>26°</strong>
                  <span>São Paulo</span>
                </div>
              </div>
            </div>
          </div>
          <figcaption className="cap">TV deitada (16:9) no balcão da padaria</figcaption>
        </figure>

        {/* Em pé 9:16 — vitrine de loja */}
        <figure className="hero__figura hero__figura--pe">
          <div className="tv tv--pe" aria-hidden="true">
            <div className="tv__quadro tv__quadro--pe">
              <span className="tv__titulo">Liquida de inverno</span>
              <span className="tv__linha">Jaquetas a partir de R$ 89</span>
              <span className="tv__destaque">Faltam 3 dias</span>
              <span className="tv__rodape">09:41 · 26°</span>
            </div>
          </div>
          <figcaption className="cap">TV em pé (9:16) na vitrine da loja</figcaption>
        </figure>

        {/* Em pé 9:16 — totem de shopping. Só desktop (Hero.css). */}
        <figure className="hero__figura hero__figura--pe hero__figura--totem">
          <div className="tv tv--pe" aria-hidden="true">
            <div className="tv__quadro tv__quadro--pe">
              <span className="tv__titulo">Neste sábado</span>
              <span className="tv__linha">Oficina infantil, 15h, piso 2</span>
              <span className="tv__ok">Loja nova no piso 1</span>
              <span className="tv__rodape">09:41</span>
            </div>
          </div>
          <figcaption className="cap">Totem (9:16) no corredor do shopping</figcaption>
        </figure>
      </div>

      <ul className="hero__blocos" role="list">
        {['Foto', 'Vídeo', 'Texto', 'Relógio', 'Clima', 'Notícias', 'Agenda', 'PDF'].map((bloco) => (
          <li key={bloco} className="chip">
            {bloco}
          </li>
        ))}
      </ul>

      <p className="cap">
        Montadas só com os blocos que existem hoje no editor. Troque o texto e vira o seu negócio.
      </p>
    </div>
  </header>
);

export default Hero;
