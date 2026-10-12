import { useEffect, useId, useRef, useState } from 'react';
import {
  ANUAL,
  MENSAL,
  faturaMensal,
  melhorPlanoPago,
  plano,
  precoUnitario,
  reais,
  telasCobradas,
  telasEmQueRedeCompensa,
} from '../data/catalogo';
import { EVENT, track } from '../lib/tracking';
import './Precos.css';

/**
 * Grade de preços da landing v2.
 *
 * ── Nenhum número é escrito aqui ────────────────────────────────────────────
 * Todo valor vem de `src/data/catalogo.js`, que lê o snapshot sincronizado do
 * `GET /api/plans` no build. A regra não é de estilo: preço anunciado em página
 * pública vincula o contrato (CDC art. 30) e anunciar um valor e cobrar outro é
 * publicidade enganosa (art. 37). A divergência não precisa de má fé — basta um
 * reajuste aplicado no seed do backend e esquecido no JSX, que foi exatamente o
 * que já aconteceu neste projeto.
 *
 * ── Por que o anual vem marcado ─────────────────────────────────────────────
 * §5.1 do plano comercial v2 promove o anual a oferta principal. O motivo é
 * churn: um plano mensal sem fidelidade — que continua existindo e continua
 * sem multa — perde cliente todo mês por inércia; o anual corta isso por
 * construção, e o desconto por tela é o que se paga por essa previsibilidade.
 * Por isso as abas NOMEIAM o compromisso: "Mensal — sem fidelidade" e "Anual —
 * 12 meses, menor preço por tela". Aba que só diz "Anual — paga menos" esconde
 * a contrapartida no exato lugar onde ela é escolhida.
 *
 * ── A frase "a partir de N telas o Rede compensa" é CALCULADA ───────────────
 * Ela muda com o intervalo: no mensal o Rede passa o Loja em 4 telas, no anual
 * só em 5, por causa do piso de 5 telas. Escrita à mão, estaria errada em um
 * dos dois modos — e ninguém perceberia, porque quem escreve a copy olha um
 * modo só. Ver `telasEmQueRedeCompensa()`.
 *
 * ── O piso do Rede é de TELAS, não de lojas ─────────────────────────────────
 * A letra miúda do card dizia "R$ X/mês por 5 lojas". O piso do plano é
 * `minScreens` — cinco TELAS, que podem estar todas no mesmo endereço. Escrito
 * como "lojas", o texto (a) vende para quem tem cinco pontos e some para o
 * condomínio com cinco telas na mesma torre, e (b) vira promessa de
 * multi-unidade, recurso que não existe no código e que já saiu da grade uma
 * vez por isso mesmo.
 *
 * ── "Cancela no painel" saiu enquanto o painel não tiver o botão ────────────
 * A frase estava aqui e no RiscoZero, e a rota de cancelamento no painel ainda
 * está sendo construída. Uma página de vendas que descreve um botão inexistente
 * é oferta vinculante (CDC art. 30) sobre um passo que o cliente não consegue
 * dar — e a descoberta acontece justamente no pior momento, o de cancelar. O
 * que a página afirma hoje é o que hoje é verdade: no mensal o cancelamento é
 * PEDIDO (pelo formulário "Falar com a gente" desta página) e vale a partir do
 * próximo ciclo, sem multa. Quando o botão existir, a frase volta.
 *
 * ── O que NÃO aparece aqui ──────────────────────────────────────────────────
 * "API externa" e "múltiplas unidades" saíram da grade: eram vendidos e não
 * existem no código (a mesma classe de defeito que a wiki já registrou em
 * julho — recurso na grade não é evidência de recurso no produto). Também não
 * há Pix, boleto nem NFS-e: não há gateway. E não há contador de vagas,
 * depoimento, nota nem preço riscado — nenhum desses fatos existe. Saiu também
 * "Vídeo liberado nos 7 primeiros dias": prazo de liberação não existe no
 * catálogo do backend (FEATURES_GRATIS é `widgets-basicos` + `alerta-offline`),
 * e prazo inventado é a família de claim que já voltou quatro vezes a esta
 * página com o nome de "14 dias grátis".
 */

/** Bullets de cada plano. Texto editorial; número nenhum mora aqui. */
const INCLUI = {
  gratis: [
    'Texto, foto, GIF, relógio, clima',
    'Aviso imediato em todas as telas',
    'E-mail se a tela cair',
    'Deitada 16:9 ou em pé 9:16',
  ],
  loja: [
    'Tudo do Grátis, telas ilimitadas',
    'Vídeo, notícias, agenda, contador',
    'PDF, Google Docs, Office, páginas da web',
    '3 pessoas na equipe · relatório de exibição',
    'Aviso agendado por data e hora',
  ],
  rede: [
    'Tudo do Loja',
    'Power BI, cotações, Airtable, HTML próprio',
    '15 pessoas na equipe',
    'Auditoria de quem publicou',
  ],
};

const Marca = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="precos__marca"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const Precos = ({ startConversion, abrirContato }) => {
  const [intervalo, setIntervalo] = useState(ANUAL);
  const [telas, setTelas] = useState(3);
  const idSimulador = useId();
  const refIntervalo = useRef(null);
  const refIndicador = useRef(null);

  /**
   * Indicador deslizante das abas: uma pílula que ANDA até a aba ativa, em vez
   * de o fundo pular de uma aba para a outra. A posição é medida da própria aba
   * (offsetLeft/Top/Width/Height), porque as abas têm larguras diferentes e,
   * no celular, empilham — não dá para deduzir do índice.
   *
   * SSR: no HTML pré-renderizado não há medida; a aba ativa pinta o próprio
   * fundo (.precos__aba--ativa). Só depois de medir, o contêiner ganha
   * `--deslizante`, que passa o fundo para o indicador. Sem JavaScript, o
   * visual é o de antes.
   */
  useEffect(() => {
    const grupo = refIntervalo.current;
    const pilula = refIndicador.current;
    if (!grupo || !pilula) return undefined;

    const posicionar = () => {
      const ativa = grupo.querySelector('.precos__aba--ativa');
      if (!ativa) return;
      pilula.style.width = `${ativa.offsetWidth}px`;
      pilula.style.height = `${ativa.offsetHeight}px`;
      pilula.style.transform = `translate3d(${ativa.offsetLeft}px, ${ativa.offsetTop}px, 0)`;
      grupo.classList.add('precos__intervalo--deslizante');
    };

    posicionar();
    const ro = 'ResizeObserver' in window ? new ResizeObserver(posicionar) : null;
    ro?.observe(grupo);
    return () => ro?.disconnect();
  }, [intervalo]);

  const anual = intervalo === ANUAL;
  const degrauRede = telasEmQueRedeCompensa(intervalo);

  const sugestao = melhorPlanoPago(telas, intervalo);
  const planoSugerido = sugestao ? plano(sugestao.code) : null;

  /**
   * Um clique de conversão, medido e despachado.
   *
   * `cta_location` é DIFERENTE em cada card de propósito: 'precos_gratis',
   * 'precos_loja', 'precos_rede'. Um único 'precos' para os três responde
   * "quantos clicaram na seção de preços" e não responde a única pergunta que
   * decide preço de anúncio — qual card converte. ARMADILHA: `startConversion`
   * (App.jsx) ainda empurra um `cta_click` próprio; enquanto ele existir, o GA4
   * conta dois cliques por botão. A correção é lá, não aqui.
   */
  const converter = (code, local, rotulo, quantasTelas) => {
    track({ event: EVENT.CTA_CLICK, params: { cta_location: local, plan: code } });
    startConversion(code, local, rotulo, quantasTelas, intervalo);
  };

  /** Preço unitário e comparação, prontos para o card. */
  const linhaDePreco = (code) => {
    const doIntervalo = precoUnitario(code, intervalo);
    const outro = precoUnitario(code, anual ? MENSAL : ANUAL);
    return {
      valor: reais(doIntervalo),
      // O plano grátis e o Enterprise não têm dois preços para comparar.
      contraste:
        doIntervalo === outro
          ? null
          : anual
            ? `por tela/mês no anual · ${reais(outro)} no mensal`
            : `por tela/mês no mensal · ${reais(precoUnitario(code, ANUAL))} no anual`,
    };
  };

  const loja = linhaDePreco('loja');
  const rede = linhaDePreco('rede');

  return (
    <section id="precos" className="secao secao--papel precos" aria-labelledby="precos-titulo">
      <div className="secao__cabeca precos__cabeca">
        <span className="chip">Preços</span>
        <h2 className="h2" id="precos-titulo">
          A TV e a internet você já tem. A primeira tela é grátis, e cada tela a mais custa por mês
          menos que um cartaz de gráfica.
        </h2>

        <div
          ref={refIntervalo}
          className="precos__intervalo"
          role="group"
          aria-label="Forma de cobrança"
        >
          <span ref={refIndicador} className="precos__indicador" aria-hidden="true" />
          <button
            type="button"
            className={`precos__aba${anual ? '' : ' precos__aba--ativa'}`}
            aria-pressed={!anual}
            onClick={() => setIntervalo(MENSAL)}
          >
            Mensal, sem fidelidade
          </button>
          <button
            type="button"
            className={`precos__aba${anual ? ' precos__aba--ativa' : ''}`}
            aria-pressed={anual}
            onClick={() => setIntervalo(ANUAL)}
          >
            Anual (12 meses), menor preço por tela
          </button>
        </div>
      </div>

      <div className="grid-3 precos__grade">
        {/* ── Grátis ─────────────────────────────────────────────────────────
            Mesmo peso visual do Loja (--destaque) e botão sólido de propósito:
            a primeira tela grátis é a oferta de entrada da casa, e um card
            apagado com botão fantasma comunicava o contrário — "isto aqui é o
            plano de consolação". Não é: é por onde quase todo mundo entra. */}
        <article className="card precos__card precos__card--destaque">
          <h3 className="precos__nome">Grátis</h3>
          <p className="precos__valor">
            {reais(precoUnitario('gratis', intervalo))}{' '}
            <span className="precos__unidade">1 tela, para sempre</span>
          </p>
          <ul className="precos__inclui" role="list">
            {INCLUI.gratis.map((item) => (
              <li key={item}>
                <Marca />
                {item}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn--largo"
            onClick={() =>
              converter('gratis', 'precos_gratis', 'Colocar minha tela grátis no ar', 1)
            }
          >
            Colocar minha tela grátis no ar
          </button>
          <p className="micro">Plano permanente: não expira e não pede cartão.</p>
        </article>

        {/* ── Loja ───────────────────────────────────────────────────────── */}
        <article className="card precos__card precos__card--destaque">
          <div className="precos__topo">
            <h3 className="precos__nome">Loja</h3>
            <span className="chip">
              1 a {degrauRede - 1} tela{degrauRede - 1 > 1 ? 's' : ''}
            </span>
          </div>
          <p className="precos__valor">
            {loja.valor} <span className="precos__unidade">{loja.contraste}</span>
          </p>
          <ul className="precos__inclui" role="list">
            {INCLUI.loja.map((item) => (
              <li key={item}>
                <Marca />
                {item}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn--largo"
            onClick={() => converter('loja', 'precos_loja', 'Assinar o Loja', telas)}
          >
            Assinar o Loja
          </button>
          <p className="micro">
            Você paga só pelas telas ligadas. Se desligar uma, ela sai da cobrança no mês seguinte.
          </p>
        </article>

        {/* ── Rede ───────────────────────────────────────────────────────── */}
        <article className="card precos__card">
          <div className="precos__topo">
            <h3 className="precos__nome">Rede</h3>
            <span className="chip">Mínimo {plano('rede').minScreens} telas</span>
          </div>
          <p className="precos__valor">
            {rede.valor} <span className="precos__unidade">{rede.contraste}</span>
          </p>
          <ul className="precos__inclui" role="list">
            {INCLUI.rede.map((item) => (
              <li key={item}>
                <Marca />
                {item}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn--fantasma btn--largo"
            onClick={() =>
              converter(
                'rede',
                'precos_rede',
                'Assinar o Rede',
                Math.max(telas, plano('rede').minScreens),
              )
            }
          >
            Assinar o Rede
          </button>
          <p className="micro">
            {/* Calculado: o degrau muda entre mensal e anual (ver cabeçalho).
                E o piso é de TELAS — não escreva "lojas" aqui. */}
            A partir de {degrauRede} telas, sai mais barato que o Loja. Com{' '}
            {plano('rede').minScreens} telas, a fatura fica em{' '}
            {reais(faturaMensal('rede', plano('rede').minScreens, intervalo))}/mês.
          </p>
        </article>
      </div>

      {/* ── Simulador ────────────────────────────────────────────────────── */}
      <div className="card precos__simulador">
        <div className="precos__simulador-campo">
          <label htmlFor={idSimulador} className="precos__simulador-rotulo">
            Quantas telas você quer ligar?
          </label>
          <input
            id={idSimulador}
            className="form-input precos__simulador-input"
            type="number"
            inputMode="numeric"
            min="1"
            max="500"
            value={telas}
            onChange={(evento) => {
              const valor = Number(evento.target.value);
              setTelas(Number.isFinite(valor) ? Math.min(Math.max(valor, 1), 500) : 1);
            }}
          />
        </div>

        <div className="precos__simulador-conta" role="status" aria-live="polite">
          {planoSugerido ? (
            <>
              <p className="precos__simulador-total">
                {reais(sugestao.total)}
                <span>/mês no plano {planoSugerido.name}</span>
              </p>
              <p className="micro">
                {telasCobradas(sugestao.code, telas)} telas na fatura
                {telasCobradas(sugestao.code, telas) > telas
                  ? ` (o ${planoSugerido.name} tem piso de ${planoSugerido.minScreens})`
                  : ''}
                {anual
                  ? ` · ${reais(sugestao.total * 12)} no ano, cobrados de uma vez`
                  : ' · no mensal, sem fidelidade: o cancelamento é pedido e vale no próximo ciclo, sem multa'}
                .
              </p>
            </>
          ) : null}
        </div>

        <button
          type="button"
          className="btn"
          onClick={() =>
            converter(
              sugestao.code,
              'precos_simulador',
              `Assinar o ${planoSugerido.name}`,
              telasCobradas(sugestao.code, telas),
            )
          }
        >
          Assinar o {planoSugerido ? planoSugerido.name : 'plano'}
        </button>
      </div>

      {/* ── Canais que não têm preço público ─────────────────────────────── */}
      <div className="grid-2 precos__secundarios">
        <article className="card precos__secundario">
          <div>
            <h3 className="precos__secundario-nome">Parceiro</h3>
            <p className="lead precos__secundario-texto">
              Para instalador, síndico profissional, técnico de CFTV e agência que coloca TV no
              espaço dos outros.
            </p>
          </div>
          <button
            type="button"
            className="btn btn--fantasma"
            onClick={() => abrirContato('Parceiro', 'precos')}
          >
            Quero ser parceiro
          </button>
        </article>

        <article className="card precos__secundario">
          <div>
            <h3 className="precos__secundario-nome">Enterprise (sob proposta)</h3>
            {/* Nomear "marca própria" e "SLA", mesmo qualificados por "sob
                escopo", é anunciar duas coisas que NÃO existem no produto —
                quem lê guarda a palavra, não a ressalva, e chega à conversa
                comercial achando que já estão prontas. O que é verdade é que o
                escopo é definido caso a caso; então é isso que a página diz.
                A guarda de CI acusa os dois termos de propósito. */}
            <p className="lead precos__secundario-texto">
              Shopping, rede grande, administradora de condomínios. Contrato formal, com escopo e
              preço definidos numa conversa antes de qualquer proposta.
            </p>
          </div>
          <button
            type="button"
            className="btn btn--fantasma"
            onClick={() => startConversion('enterprise', 'precos', 'Falar com a gente')}
          >
            Falar com a gente
          </button>
        </article>
      </div>

      <p className="precos__promessa">
        Sair do Grátis nunca cobra o que passou. Você começa a pagar no dia em que liga a segunda
        tela. No mensal, cancela quando quiser.
      </p>
    </section>
  );
};

export default Precos;
