/**
 * Funil ponta a ponta, de uma fonte só.
 *
 * O funil antigo do painel começava no checkout — e por isso não respondia a
 * pergunta que decide orçamento: de cada cem pessoas que chegaram no site,
 * quantas pagaram? Aqui entram as duas pontas que faltavam, visitas e leads,
 * todas vindas do MESMO banco (`SiteVisit`, `Lead`, `CheckoutSession`,
 * `Payment`). Numerador e denominador da mesma fonte é o ponto inteiro: misturar
 * visita do GA4 com pagamento do banco produz taxa que ninguém consegue auditar.
 *
 * Abandonados e expirados ficam AO LADO, nunca na coluna do funil: eles não são
 * um passo seguinte, são saídas. Empilhados na mesma sequência dariam a
 * impressão de que alguém "avança" para expirado, e os números deixariam de
 * fechar.
 *
 * ⚠️ O componente monta os passos A PARTIR do objeto do servidor
 * (`PlatformFunnel`), e não de uma lista `{key,label,count}` pré-digerida como
 * o contrato provisório supunha. A API nunca devolveu essa lista: devolve
 * `visits`, `leads` e `checkout` nomeados, mais as `rates` já calculadas. Montar
 * aqui é o que garante que a ORDEM do funil seja a de verdade — uma lista solta
 * chega na ordem que o servidor quiser, e um funil fora de ordem "cresce no
 * meio", que se lê como dado corrompido.
 */
import { Info } from 'lucide-react';

import type { PlatformFunnel } from '../backoffice-types';
import { formatNumber, formatPercent } from '../format';
import { EmptyState, cx } from '../ui';

interface Passo {
  key: string;
  label: string;
  count: number;
  /** Texto de apoio sob o rótulo. Usado onde o número sozinho engana. */
  hint?: string;
  pago?: boolean;
}

/**
 * As quatro taxas que o SERVIDOR calcula, em razão 0–1.
 *
 * Recalcular aqui seria a segunda conta do mesmo número — e a primeira vez que
 * a regra do denominador mudasse (hoje é a visita ÚNICA, não a página vista) a
 * tela e o servidor discordariam sem que nada apontasse qual dos dois está
 * certo. `null` NÃO vira "0%": a taxa não existe, e um zero faria uma etapa sem
 * denominador medido parecer um resultado ruim.
 */
const TAXAS: Array<{ key: keyof PlatformFunnel['rates']; label: string }> = [
  { key: 'visitToLead', label: 'Visita → lead' },
  { key: 'leadToCheckout', label: 'Lead → checkout' },
  { key: 'checkoutToPaid', label: 'Checkout → pagante' },
  { key: 'visitToPaid', label: 'Visita → pagante' },
];

const FunilCompleto = ({ funnel }: { funnel: PlatformFunnel }) => {
  const { visits, leads, checkout, rates } = funnel;

  const chain: Passo[] = [
    {
      key: 'visits',
      label: 'Visitou o site',
      count: visits.uniques,
      // A base é a visita ÚNICA, não a página vista: quem abre quatro páginas
      // não é quatro oportunidades de virar lead, e usar `views` faria a taxa
      // cair toda vez que o site melhorasse a navegação.
      hint: `${formatNumber(visits.views)} páginas vistas no total`,
    },
    { key: 'leads', label: 'Deixou contato (lead)', count: leads },
    { key: 'started', label: 'Abriu o checkout', count: checkout.started },
    { key: 'identified', label: 'Se identificou no checkout', count: checkout.identified },
    { key: 'paymentPending', label: 'Finalizou o checkout', count: checkout.paymentPending },
    { key: 'paid', label: 'Contratou', count: checkout.paid, pago: true },
  ];

  const saidas: Passo[] = [
    { key: 'abandoned', label: 'Abandonados', count: checkout.abandoned },
    { key: 'expired', label: 'Expirados', count: checkout.expired },
  ];

  if (chain.every((passo) => passo.count === 0)) {
    return (
      <EmptyState
        title="Sem movimento no período"
        message="Nenhuma visita, lead ou checkout neste intervalo. Amplie o período acima ou verifique se a contagem de visitas já está ligada no site."
      />
    );
  }

  // Base = primeiro passo da cadeia (visitas únicas). Se ele vier zerado, usar 1
  // evita divisão por zero; o que NÃO se faz é usar o maior valor como base,
  // porque isso mascararia um funil que cresce no meio (sinal de dado
  // inconsistente, ou de uma venda que entrou por fora do site).
  const base = Math.max(1, chain[0]?.count ?? 0);

  return (
    <div className="space-y-5">
      <ul className="space-y-3.5">
        {chain.map((step, index) => {
          const previous = index === 0 ? null : chain[index - 1]!.count;
          const dropped = previous === null ? 0 : previous - step.count;
          const pct = Math.round((step.count / base) * 100);

          return (
            <li key={step.key}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-semibold text-ink">{step.label}</span>
                <span className="shrink-0 text-[13px] text-ink-muted">
                  <span className="money font-bold text-ink">{formatNumber(step.count)}</span>
                  <span className="money ml-1.5 text-ink-subtle">{pct}%</span>
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-app">
                <div
                  className={cx('h-full rounded-full', step.pago ? 'bg-success' : 'bg-accent')}
                  style={{ width: `${Math.max(step.count === 0 ? 0 : 1.5, pct)}%` }}
                />
              </div>
              {step.hint && <p className="mt-1 text-[11px] text-ink-subtle">{step.hint}</p>}
              {previous !== null && dropped > 0 && (
                <p className="mt-1 text-[11px] font-medium text-ink-subtle">
                  {formatNumber(dropped)} não chegaram até aqui
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* As taxas do servidor, lado a lado. É o que transforma a coluna de
          números na pergunta que decide orçamento. */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TAXAS.map((taxa) => {
          const valor = rates[taxa.key];
          return (
            <div key={taxa.key} className="rounded-xl border border-line bg-app/60 p-3.5">
              <dt className="text-[12px] font-semibold text-ink-muted">{taxa.label}</dt>
              <dd className="money mt-1 text-xl leading-none font-extrabold text-ink">
                {/* `formatPercent` recebe RAZÃO e multiplica por 100: `0.09`
                    sai "9%". Nunca imprima `valor` cru com um "%" ao lado — era
                    assim que 9% virava "0,09%" no painel antigo. */}
                {valor === null ? '-' : formatPercent(valor)}
              </dd>
              {valor === null && (
                <p className="mt-1 text-[11px] leading-snug text-ink-subtle">
                  Sem denominador no período. Não é 0%.
                </p>
              )}
            </div>
          );
        })}
      </dl>

      <div className="rounded-xl border border-line bg-app/60 p-3.5">
        <p className="eyebrow mb-2.5">Saíram pelo caminho</p>
        <dl className="grid grid-cols-2 gap-3">
          {saidas.map((step) => (
            <div key={step.key}>
              <dt className="text-[13px] font-semibold text-ink-muted">{step.label}</dt>
              <dd className="money text-xl font-extrabold text-ink">{formatNumber(step.count)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/*
        Nota obrigatória, e não rodapé decorativo: a primeira vez que alguém
        comparar esta tela com o GA4 os números NÃO vão bater, e sem esta
        explicação isso vira caça a um bug que não existe.
      */}
      <p className="flex items-start gap-2 rounded-lg border border-line bg-app px-3 py-2.5 text-[12px] leading-relaxed text-ink-muted">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" />
        <span>
          <strong className="text-ink">As visitas são contagem própria, sem cookie</strong>, gravadas
          pelo próprio site no mesmo banco dos leads e das contratações. Por isso{' '}
          <strong className="text-ink">não batem com o GA4</strong>: lá o Consent Mode subconta quem
          recusou cookie. Divergência entre as duas fontes é esperada, não é defeito. O GA4 continua
          sendo a ferramenta de mídia; este funil é o que fecha a conta ponta a ponta.
        </span>
      </p>
    </div>
  );
};

export default FunilCompleto;
