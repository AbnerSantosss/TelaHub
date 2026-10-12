/**
 * Um dos 5 indicadores da estratégia de tráfego (Estrategia-Lucro-Trafego §5),
 * já classificado pelo servidor.
 *
 * Quatro decisões que este cartão carrega, e a armadilha de cada uma:
 *
 * 1. É SEMPRE de uma COORTE SEMANAL, nunca de média acumulada. A média esconde
 *    a piora recente atrás do bom começo: quatro semanas boas e uma péssima dão
 *    um número aceitável, e o orçamento sobe justamente na semana em que
 *    deveria cair. Quem monta a tela escolhe a semana; o cartão nunca agrega.
 *
 * 2. `value: null` NÃO vira zero nem barra vazia. Semana sem gasto de mídia
 *    informado não é "CAC zero" — campanha aparentemente de graça é exatamente
 *    a leitura que faz alguém aumentar orçamento no pior momento possível. O
 *    estado nulo mostra o `reason` do servidor e o caminho de conserto (o
 *    AdSpendModal), porque um "—" mudo faz o operador achar que o painel quebrou.
 *
 * 3. Cor NUNCA é o único sinal. Quem não distingue verde de vermelho ficaria
 *    sem o indicador inteiro. Por isso todo estado tem rótulo textual
 *    (Verde / Atenção / Crítico) e posição na trilha de três segmentos; a cor
 *    só reforça. Os tons de texto são os escurecidos do `ui.tsx` — os tokens
 *    `--success`/`--warning`/`--danger` puros ficam em ~3:1 sobre fundo claro e
 *    o piso do projeto é 4.5:1 em texto.
 *
 * 4. ⚠️ A UNIDADE VEM DO SERVIDOR (`unit`), e não de uma tabela local por nome
 *    de indicador. Era esse o defeito mais grave do contrato antigo: o painel
 *    supunha que a taxa chegava em PONTOS PERCENTUAIS e imprimia o número cru
 *    com "%" ao lado. Como a API manda RAZÃO (`0.09` = 9%, `0.7` = 70%), uma
 *    conversa→venda saudável de 9% aparecia como "0,09%" e um mix anual de 70%
 *    como "0,7%": dois indicadores permanentemente no vermelho, sem nada na
 *    tela denunciando o engano — e a decisão que isso induz é cortar a mídia
 *    que está funcionando. Se alguém voltar a formatar por nome de indicador,
 *    é esse o defeito que retorna, e ele volta calado.
 */
import { CircleHelp, Plus } from 'lucide-react';

import type { IndicatorReading, IndicatorUnit, Semaforo } from '../backoffice-types';
import { formatMoney, formatPercent } from '../format';
import { Button, cx } from '../ui';

interface ToneStyle {
  /** Rótulo textual — o sinal que sobrevive sem a cor. */
  label: string;
  /** Faixa lateral do cartão. */
  edge: string;
  /** Texto do selo, em contraste AA sobre fundo claro. */
  chip: string;
  /** Preenchimento do segmento ativo na trilha. */
  fill: string;
  dot: string;
}

/**
 * Os três semáforos que o servidor manda — EM PORTUGUÊS. O contrato antigo
 * traduzia para `green`/`yellow`/`red` no caminho, e a tradução era feita em
 * lugar nenhum: o valor chegava `'verde'`, o índice não existia, e o cartão
 * quebrava no acesso. Mapear a partir da grafia do servidor é o que fecha isso.
 */
export const INDICATOR_TONE: Record<Semaforo, ToneStyle> = {
  verde: {
    label: 'Verde',
    edge: 'border-l-success',
    chip: 'border-success/25 bg-success/10 text-success-ink',
    fill: 'bg-success',
    dot: 'bg-success',
  },
  amarelo: {
    label: 'Atenção',
    edge: 'border-l-warning',
    chip: 'border-warning/25 bg-warning/10 text-warning-ink',
    fill: 'bg-warning',
    dot: 'bg-warning',
  },
  vermelho: {
    label: 'Crítico',
    edge: 'border-l-danger',
    chip: 'border-danger/25 bg-danger/10 text-danger-ink',
    fill: 'bg-danger',
    dot: 'bg-danger',
  },
};

/**
 * `status: null` é o "sem dado" do servidor — e ele NÃO é um quarto semáforo.
 *
 * Cinza de propósito: falta de informação não é um estado ruim, é um estado
 * vazio. Pintá-lo de vermelho faria o operador tratar cadastro em falta como
 * alarme — e ignorar o alarme de verdade na semana seguinte. Pintá-lo de verde
 * seria pior ainda: é a forma mais barata de um painel mentir para melhor.
 */
const SEM_DADO: ToneStyle = {
  label: 'Sem dado',
  edge: 'border-l-line',
  chip: 'border-line bg-app text-ink-muted',
  fill: 'bg-ink-subtle',
  dot: 'bg-ink-subtle',
};

export const toneOf = (status: Semaforo | null): ToneStyle =>
  status === null ? SEM_DADO : INDICATOR_TONE[status];

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/**
 * Formata na unidade que o SERVIDOR declarou.
 *
 * `ratio` passa por `formatPercent` do `format.ts` — que multiplica por 100
 * justamente porque recebe razão de 0 a 1. É o casamento correto: `0.09` sai
 * "9%". O que não pode voltar é a versão antiga, que imprimia `0.09` com um "%"
 * colado e produzia "0,09%".
 *
 * `cents` é dinheiro, e todo dinheiro deste contrato vem em centavos. `screens`
 * é contagem média — número puro, sem sufixo, porque "1,8 telas" já se lê como
 * telas no rótulo do cartão.
 */
export function formatByUnit(value: number, unit: IndicatorUnit): string {
  switch (unit) {
    case 'cents':
      return formatMoney(value);
    case 'ratio':
      return formatPercent(value);
    case 'screens':
      return decimal.format(value);
  }
}

/** `null` não vira zero em lugar nenhum desta tela — vira "—" com o motivo ao lado. */
export function formatIndicatorValue(indicator: IndicatorReading): string {
  if (indicator.value === null) return '-';
  return formatByUnit(indicator.value, indicator.unit);
}

/**
 * A régua em texto, montada com a MESMA função de formatação do valor.
 *
 * Vem do servidor (`band`) e não de uma constante local porque os limites moram
 * no documento de estratégia e já mudaram uma vez — o teto de CAC caiu de
 * R$ 560 para R$ 374. Uma cópia aqui continuaria aprovando um CAC que a
 * estratégia já reprova, e ninguém veria a diferença.
 */
export function metaDoIndicador(indicator: IndicatorReading): string {
  const verde = formatByUnit(indicator.band.green, indicator.unit);
  const amarelo = formatByUnit(indicator.band.yellow, indicator.unit);

  return indicator.band.direction === 'lower'
    ? `verde até ${verde} · atenção até ${amarelo} · acima disso, crítico`
    : `verde a partir de ${verde} · atenção a partir de ${amarelo} · abaixo disso, crítico`;
}

/**
 * Trilha de três segmentos: posição + rótulo, para a cor não ser o único sinal.
 *
 * O nome não é `Semaforo` porque esse identificador é o TIPO importado do
 * contrato — um `const` com o mesmo nome colide com o import e o arquivo nem
 * compila.
 */
const TrilhaSemaforo = ({ status }: { status: Semaforo | null }) => {
  // A ordem é a da leitura (bom → ruim), não a do servidor: é o que faz a
  // posição do segmento aceso significar alguma coisa para quem não vê cor.
  const ordem: Semaforo[] = ['verde', 'amarelo', 'vermelho'];

  return (
    <div aria-hidden="true" className="mt-3 flex gap-1">
      {ordem.map((tone) => (
        <span
          key={tone}
          className={cx(
            'h-1.5 flex-1 rounded-full',
            status === tone ? INDICATOR_TONE[tone].fill : 'bg-app'
          )}
        />
      ))}
    </div>
  );
};

const IndicadorCard = ({
  indicator,
  weekLabel,
  onInformarGasto,
}: {
  indicator: IndicatorReading;
  /** A semana da coorte, escrita no cartão — nenhum número aqui é acumulado. */
  weekLabel: string;
  /** Abre o AdSpendModal. Só faz sentido nos indicadores que dependem de gasto. */
  onInformarGasto?: () => void;
}) => {
  const tone = toneOf(indicator.status);
  const missing = indicator.value === null;

  return (
    <div className={cx('rounded-xl border border-l-4 border-line bg-surface p-4', tone.edge)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* O rótulo vem do servidor: é o mesmo texto da régua da estratégia. */}
          <p className="text-[13px] font-semibold text-ink">{indicator.label}</p>
          <p className="mt-0.5 text-[11px] text-ink-subtle">Semana de {weekLabel}</p>
        </div>
        <span
          className={cx(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap',
            tone.chip
          )}
        >
          <span aria-hidden="true" className={cx('h-1.5 w-1.5 rounded-full', tone.dot)} />
          {tone.label}
        </span>
      </div>

      {missing ? (
        /*
          Sem valor: nada de número grande, nada de trilha preenchida. O que
          aparece é o motivo e o botão que resolve — a tela diz o que fazer em
          vez de deixar um zero que mente.
        */
        <div className="mt-3">
          <p className="flex items-start gap-2 text-[13px] leading-snug text-ink-muted">
            <CircleHelp aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" />
            <span>{indicator.reason ?? 'Sem dado suficiente nesta semana.'}</span>
          </p>
          {onInformarGasto && (
            <Button type="button" variant="secondary" className="mt-3" onClick={onInformarGasto}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Informar gasto da semana
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="money mt-3 text-[26px] leading-none font-extrabold text-ink">
            {formatIndicatorValue(indicator)}
          </p>
          <TrilhaSemaforo status={indicator.status} />
        </>
      )}

      {/* A meta fica NO cartão: número sem meta ao lado não decide nada. */}
      <p className="mt-2.5 text-[11px] leading-snug text-ink-subtle">
        Meta: {metaDoIndicador(indicator)}
      </p>
    </div>
  );
};

export default IndicadorCard;
