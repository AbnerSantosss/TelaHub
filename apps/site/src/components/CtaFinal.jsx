import { Fragment } from 'react';
import './CtaFinal.css';

/**
 * CTA FINAL — o último bloco antes do rodapé.
 *
 * ── Por que ele fecha a página assim ────────────────────────────────────────
 * Quem chegou aqui já leu preço, garantia e as oito dúvidas. Não há argumento
 * novo a apresentar — há uma escolha a nomear. A frase põe as duas opções lado
 * a lado ("cinco minutos" contra "continuar procurando o pen-drive") porque o
 * concorrente real do produto não é outro serviço: é o jeito que a pessoa já
 * faz hoje. Por isso o bloco é um título, um botão e mais nada. Segundo botão,
 * formulário embutido ou lista de recursos aqui só dividem a atenção.
 *
 * ── Fundo escuro é decisão de sistema, não enfeite ──────────────────────────
 * A seção usa .secao--noite, e sobre ela o botão é .btn--luz. Essa dupla não é
 * intercambiável com o azul de papel: o azul da marca sobre fundo escuro não
 * atinge o contraste mínimo, e foi exatamente essa mistura que já produziu um
 * CTA ilegível nesta página. Se o fundo mudar, o botão muda junto.
 *
 * ── A linha de baixo é fato, não promessa ───────────────────────────────────
 * "Sem cartão · Sem técnico · Sem fidelidade" só repete o que o plano de
 * entrada realmente faz. Nada de prazo de teste, contador de vagas, nota,
 * número de clientes ou porcentagem: se não está no catálogo e no contrato,
 * não entra aqui.
 */

/* O rótulo é uma constante porque ele aparece em dois lugares — no botão e no
   evento de conversão. Digitar duas vezes é como o relatório do funil passa a
   contar clique de um botão que não existe mais com esse texto. */
const ROTULO_CTA = 'Colocar minha 1ª tela no ar — grátis';

const PROVAS = ['Sem cartão', 'Sem técnico', 'Sem fidelidade no mensal'];

export default function CtaFinal({ startConversion }) {
  return (
    <section
      id="comecar"
      className="secao secao--noite ctafinal"
      aria-labelledby="ctafinal-titulo"
    >
      <h2 id="ctafinal-titulo" className="h2 ctafinal__titulo reveal">
        Daqui a 5 minutos sua primeira tela pode estar no ar. Ou você pode
        continuar procurando o pen-drive.
      </h2>

      <button
        type="button"
        className="btn btn--luz btn--grande reveal"
        onClick={() => startConversion('gratis', 'cta_final', ROTULO_CTA)}
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
