import { Fragment } from 'react';
import { EVENT, track } from '../lib/tracking';
import './CtaFinal.css';

/**
 * CTA FINAL — o último bloco antes do rodapé.
 *
 * ── Por que ele fecha a página assim ────────────────────────────────────────
 * Quem chegou aqui já leu preço, garantia e as oito dúvidas. Não há argumento
 * novo a apresentar — há uma escolha a nomear. O título aponta o que já vai
 * acontecer de qualquer jeito ("sua TV vai continuar ligada amanhã") e nomeia a
 * única variável que a pessoa controla: o que ela mostra. O concorrente real do
 * produto não é outro serviço, é o jeito que ela já faz hoje.
 *
 * ── O prazo saiu do título, e não foi por estilo ────────────────────────────
 * A versão anterior era "Daqui a 5 minutos sua primeira tela pode estar no ar".
 * A mesma página prometia "2 minutos" no FAQ e "30 segundos" no herói: três
 * prazos para a mesma coisa. Oferta contraditória se resolve a favor do
 * consumidor (CDC art. 30), e nenhum dos dois maiores tinha medição por trás.
 * Ficou só o verificável — trocar um texto e salvar leva 30 segundos —, e ele
 * mora no herói e na comparação. NÃO reintroduza prazo aqui.
 *
 * ── O subtítulo é a lista de portes, não um slogan ──────────────────────────
 * Assembleia, oferta, grade de aulas, serviços da clínica, comunicado da
 * empresa e combo da lanchonete aparecem na mesma frase e no mesmo peso porque
 * o produto é horizontal por PORTE. Comida entra por último, como um caso entre
 * seis: abrir por cardápio faz síndico, gerente e dono de clínica concluírem
 * "não é pra mim" — a decisão está registrada na wiki e já foi tomada duas
 * vezes.
 *
 * ── Fundo escuro é decisão de sistema, não enfeite ──────────────────────────
 * A seção usa .secao--noite, e sobre ela o botão é .btn--luz. Essa dupla não é
 * intercambiável com o azul de papel: o azul da marca sobre fundo escuro não
 * atinge o contraste mínimo, e foi exatamente essa mistura que já produziu um
 * CTA ilegível nesta página. Se o fundo mudar, o botão muda junto.
 *
 * ── A linha de baixo é fato, não promessa ───────────────────────────────────
 * "Sem cartão · Sem técnico · Sem fidelidade no mensal" só repete o que o plano
 * de entrada realmente faz — e o qualificador "no mensal" é obrigatório: o
 * anual é compromisso de 12 meses, e a frase absoluta ao lado dele é a que o
 * cliente cita ao pedir o dinheiro de volta. Nada de prazo de teste, contador
 * de vagas, nota, número de clientes ou porcentagem: se não está no catálogo e
 * no contrato, não entra aqui.
 *
 * ── Medição ────────────────────────────────────────────────────────────────
 * `cta_location: 'cta_final'`, distinto de 'hero' e de 'passos' — é o que mede
 * quanta gente precisa da página inteira antes de decidir. ARMADILHA:
 * `startConversion` (App.jsx) ainda empurra um `cta_click` próprio; enquanto os
 * dois existirem, o GA4 conta este clique duas vezes. A correção é lá.
 */

/* O rótulo é uma constante porque ele aparece em dois lugares — no botão e no
   evento de conversão. Digitar duas vezes é como o relatório do funil passa a
   contar clique de um botão que não existe mais com esse texto. */
const ROTULO_CTA = 'Colocar minha 1ª tela no ar grátis';

const PROVAS = ['Sem cartão', 'Sem técnico', 'Sem fidelidade no mensal'];

export default function CtaFinal({ startConversion }) {
  return (
    <section
      id="comecar"
      className="secao secao--noite ctafinal"
      aria-labelledby="ctafinal-titulo"
    >
      <h2 id="ctafinal-titulo" className="h2 ctafinal__titulo reveal">
        Amanhã a TV vai estar ligada de novo. Ela pode mostrar o recado que você precisa dar.
      </h2>

      <p className="lead ctafinal__sub reveal">
        Pode ser o aviso da assembleia, a oferta do dia, a grade das aulas, os serviços da clínica,
        o comunicado da empresa ou o combo da lanchonete. Você escolhe e troca pelo celular.
      </p>

      <button
        type="button"
        className="btn btn--luz btn--grande reveal"
        onClick={() => {
          track({ event: EVENT.CTA_CLICK, params: { cta_location: 'cta_final', plan: 'gratis' } });
          startConversion('gratis', 'cta_final', ROTULO_CTA);
        }}
      >
        {ROTULO_CTA}
      </button>

      {/* .trust é flex com gap; os itens ficam irmãos diretos, como no mockup.
          O separador é decorativo — sem aria-hidden, o leitor de tela anuncia
          "ponto" entre cada item. */}
      <p className="trust ctafinal__provas">
        {PROVAS.map((prova, i) => (
          <Fragment key={prova}>
            {i > 0 && <span aria-hidden="true">·</span>}
            <span>{prova}</span>
          </Fragment>
        ))}
      </p>
    </section>
  );
}
