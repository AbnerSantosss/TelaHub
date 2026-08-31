import { useId, useState } from 'react';
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
 *
 * ── A frase "a partir de N telas o Rede compensa" é CALCULADA ───────────────
 * Ela muda com o intervalo: no mensal o Rede passa o Loja em 4 telas, no anual
 * só em 5, por causa do piso de 5 telas. Escrita à mão, estaria errada em um
 * dos dois modos — e ninguém perceberia, porque quem escreve a copy olha um
 * modo só. Ver `telasEmQueRedeCompensa()`.
 *
 * ── O que NÃO aparece aqui ──────────────────────────────────────────────────
 * "API externa" e "múltiplas unidades" saíram da grade: eram vendidos e não
 * existem no código (a mesma classe de defeito que a wiki já registrou em
 * julho — recurso na grade não é evidência de recurso no produto). Também não
 * há Pix, boleto nem NFS-e: não há gateway. E não há contador de vagas,
 * depoimento, nota nem preço riscado — nenhum desses fatos existe.
 */

/** Bullets de cada plano. Texto editorial; número nenhum mora aqui. */
const INCLUI = {
  gratis: [
    'Texto, foto, GIF, relógio, clima',
    'Vídeo liberado nos 7 primeiros dias',
    'Aviso imediato em todas as telas',
    'E-mail se a tela cair',
  ],
  loja: [
    'Tudo do Grátis, telas ilimitadas',
    'Vídeo sem prazo, notícias, agenda, contador',
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

  const anual = intervalo === ANUAL;
  const degrauRede = telasEmQueRedeCompensa(intervalo);

  const sugestao = melhorPlanoPago(telas, intervalo);
  const planoSugerido = sugestao ? plano(sugestao.code) : null;

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
          Você já pagou pela TV. Já paga a internet. O que falta custa menos que a tinta da
          impressora.
        </h2>

        <div className="precos__intervalo" role="group" aria-label="Forma de cobrança">
          <button
            type="button"
            className={`precos__aba${anual ? '' : ' precos__aba--ativa'}`}
            aria-pressed={!anual}
            onClick={() => setIntervalo(MENSAL)}
          >
            Mensal
          </button>
          <button
            type="button"
            className={`precos__aba${anual ? ' precos__aba--ativa' : ''}`}
            aria-pressed={anual}
            onClick={() => setIntervalo(ANUAL)}
          >
            Anual — paga menos
          </button>
        </div>
      </div>

      <div className="grid-3 precos__grade">
        {/* ── Grátis ─────────────────────────────────────────────────────── */}
        <article className="card precos__card">
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
            className="btn btn--fantasma btn--largo"
            onClick={() => startConversion('gratis', 'precos', 'Começar grátis', 1, intervalo)}
          >
            Começar grátis
          </button>
          <p className="micro">Não é teste. Não expira. Sem cartão.</p>
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
            onClick={() => startConversion('loja', 'precos', 'Assinar o Loja', telas, intervalo)}
          >
            Assinar o Loja
          </button>
          <p className="micro">
            Paga só pelas telas ligadas. Desligou, para de pagar no mês seguinte.
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
              startConversion(
                'rede',
                'precos',
                'Assinar o Rede',
                Math.max(telas, plano('rede').minScreens),
                intervalo,
              )
            }
          >
            Assinar o Rede
          </button>
          <p className="micro">
            {/* Calculado: o degrau muda entre mensal e anual (ver cabeçalho). */}
            A partir de {degrauRede} telas já sai mais barato que o Loja —{' '}
            {reais(faturaMensal('rede', plano('rede').minScreens, intervalo))}/mês por{' '}
            {plano('rede').minScreens} lojas.
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
                  : ' · sem fidelidade, cancela no painel'}
                .
              </p>
            </>
          ) : null}
        </div>

        <button
          type="button"
          className="btn"
          onClick={() =>
            startConversion(
              sugestao.code,
              'simulador',
              `Assinar o ${planoSugerido.name}`,
              telasCobradas(sugestao.code, telas),
              intervalo,
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
            <h3 className="precos__secundario-nome">Enterprise — sob proposta</h3>
            <p className="lead precos__secundario-texto">
              Shopping, rede grande, administradora de condomínios. Contrato formal; marca própria e
              SLA só sob escopo.
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
        Sair do Grátis nunca cobra o que passou. Você começa a pagar do dia em que liga a segunda
        tela.
      </p>
    </section>
  );
};

export default Precos;
