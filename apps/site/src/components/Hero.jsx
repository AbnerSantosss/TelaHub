import './Hero.css';

/**
 * Herói da landing v2.
 *
 * ── A headline é uma dor invisível, não um recurso ──────────────────────────
 * "Sua TV está ligada. E não está dizendo nada." é a headline A recomendada no
 * plano comercial v2 (§4). Ela funciona porque a pessoa não sabe que tem o
 * problema: a TV da recepção está lá, ligada na novela, e ninguém a contabiliza
 * como custo. Headline de recurso ("gerencie suas telas") só converte quem já
 * procura a categoria — e quem já procura é minoria neste mercado.
 *
 * ── Por que o produto é apresentado por PORTE, não por ramo ─────────────────
 * O primeiro parágrafo cita portaria, recepção, sala de espera e balcão nessa
 * ordem, de propósito. A pesquisa de palavra-chave apontava para comida
 * ("cardápio digital", 10–20 mil buscas/mês), e o dono decidiu o contrário: o
 * termo de comida é dominado por QR/delivery, e abrir a página com cardápio faz
 * síndico, gerente de escritório e dono de clínica concluírem "não é pra mim"
 * em dois segundos. Comida é um caso entre vários e nunca abre nada.
 *
 * ── As duas TVs são ilustração declarada, não captura ───────────────────────
 * Elas são desenhadas em HTML com os mesmos blocos que existem hoje no editor
 * (texto, relógio, clima), e a legenda diz isso na cara: "Montadas só com os
 * blocos que existem hoje no editor". Mockup que se apresenta como foto de
 * produto é a mentira mais fácil de cometer numa landing — as capturas REAIS
 * aparecem logo abaixo, em "Como funciona" e "Dois formatos".
 *
 * ── O que foi retirado do mockup ────────────────────────────────────────────
 * O artboard trazia um link secundário "Ver como funciona (60 s)". O vídeo de
 * 60 s ainda não existe (é a US-V-01, em Remotion, não iniciada). Prometer
 * duração de um vídeo que não foi gravado é o mesmo defeito de "14 dias
 * grátis", que já voltou quatro vezes a esta página. O link ficou, sem o "(60
 * s)", levando à seção que mostra os três passos com a TV real.
 *
 * ── "Sem fidelidade" ganhou "no mensal", e não é preciosismo ────────────────
 * O selo dizia "Sem fidelidade" seco, herdado de quando só existia plano
 * mensal. Em 31/08 o ANUAL virou a oferta principal e vem marcado por padrão na
 * grade — e ele é, por definição, um compromisso de 12 meses. Um selo absoluto
 * ao lado de um contrato anual é a frase que o cliente cita ao pedir o dinheiro
 * de volta (CDC arts. 30 e 37), e o checkout já corrigia isso sozinho trocando
 * a garantia por "Contratação de 12 meses" — ou seja, as duas superfícies
 * diziam coisas diferentes sobre o mesmo contrato. A regra vale para as cinco
 * ocorrências da página (aqui, `CtaFinal`, `RiscoZero`, `Hospedagem` e o FAQ):
 * o mensal continua sem fidelidade, e o anual é apresentado como o que é.
 */
const Hero = ({ startConversion, scrollToSection }) => (
  <header className="hero" id="topo">
    <div className="hero__texto">
      <span className="chip">Avisos, ofertas, agenda e informação — na TV que você já tem</span>

      <h1 className="h1">
        Sua TV está ligada. <span className="hero__grito">E não está dizendo nada.</span>
      </h1>

      <p className="lead hero__lead">
        Na portaria do condomínio, na recepção da empresa, na sala de espera, no balcão da loja: a
        tela mostra novela ou o menu da fábrica enquanto quem passa decide o que fazer. Coloque nela
        o seu aviso, sua oferta, sua agenda — e troque do celular quando quiser.
      </p>

      <div className="hero__acoes">
        <button
          type="button"
          className="btn btn--grande"
          onClick={() =>
            startConversion('gratis', 'hero', 'Colocar minha 1ª tela no ar — grátis')
          }
        >
          Colocar minha 1ª tela no ar — grátis
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
          className="hero__secundario"
          onClick={() => scrollToSection('#como-funciona', 'como-funciona')}
        >
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
            <circle cx="12" cy="12" r="9" />
            <path d="M10 8l6 4-6 4z" />
          </svg>
          Ver como funciona
        </button>
      </div>

      <p className="trust">
        <span>Sem cartão</span>
        <span aria-hidden="true">·</span>
        <span>Sem técnico</span>
        <span aria-hidden="true">·</span>
        <span>Sem fidelidade no mensal</span>
        <span aria-hidden="true">·</span>
        <span>Deitada ou em pé</span>
      </p>
    </div>

    <div className="hero__vitrine">
      <div className="hero__telas">
        {/* Deitada 16:9 — recepção de empresa */}
        <figure className="hero__figura">
          <div className="tv">
            <div className="tv__quadro tv__quadro--deitada">
              <div className="tv__coluna">
                <span className="tv__titulo">Bem-vindo à Contábil Prisma</span>
                <span className="tv__linha">
                  Reunião com clientes: sala 2, 10h.
                  <br />
                  Entrega do IRPJ: até dia 31.
                </span>
                <span className="tv__destaque">Aniversariantes: Ana (seg) · Carlos (qui)</span>
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
          <figcaption className="cap">Deitada 16:9 — recepção da empresa</figcaption>
        </figure>

        {/* Em pé 9:16 — portaria de condomínio */}
        <figure className="hero__figura hero__figura--pe">
          <div className="tv tv--pe">
            <div className="tv__quadro tv__quadro--pe">
              <span className="tv__titulo">Condomínio Jardins</span>
              <span className="tv__linha">Assembleia: quinta, 19h30, salão de festas.</span>
              <span className="tv__destaque">Elevador: sexta, 8h–12h.</span>
              <span className="tv__ok">Coleta seletiva: ter e sex.</span>
              <span className="tv__rodape">09:41 · 26°</span>
            </div>
          </div>
          <figcaption className="cap">Em pé 9:16 — portaria</figcaption>
        </figure>
      </div>

      <ul className="hero__blocos" role="list">
        {['Texto', 'Foto', 'Vídeo', 'Relógio', 'Clima', 'Notícias', 'Agenda', 'PDF'].map((bloco) => (
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
