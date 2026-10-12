import './Cenas.css';

/**
 * CENAS — "Você conhece essa cena. Quem entra no seu espaço também."
 *
 * ── Por que a seção existe ──────────────────────────────────────────────────
 * Quem chega na página não está procurando um produto de tela; está com um
 * problema doméstico e sem nome: o aviso que ninguém leu, o cartaz amarelado,
 * a grade de aulas numa folha A4 desatualizada. A seção não explica o que o
 * TelaHub faz — ela devolve ao visitante a cena que ele vive, com as palavras
 * dele, e só depois mostra o que muda quando a parede trabalha.
 *
 * Cada cartão tem duas falas e nunca uma só: a de HOJE (entre aspas, na voz do
 * cliente) e a do DEPOIS (o "Com a TV...", em texto claro, separado por uma
 * linha). Tirar a primeira transformaria a seção num folheto de recursos.
 *
 * ── A armadilha que ela evita ───────────────────────────────────────────────
 * O produto é horizontal por PORTE, não por ramo, e a ordem dos seis cartões é
 * decisão comercial: condomínio, escritório, clínica, loja, academia, rede.
 * Abrir por restaurante/cardápio — a tentação óbvia de quem escreve sobre TV
 * em parede — encolhe o produto para "cardápio digital" e queima os outros
 * cinco públicos. Comida não aparece aqui, e não deve ser acrescentada.
 *
 * ── O que ela não pode dizer ────────────────────────────────────────────────
 * Nada aqui é depoimento. São cenas escritas pela casa, no genérico, sem nome
 * de cliente, sem número, sem "+N condomínios já usam". Se um dia virar aspas
 * atribuídas a alguém real, precisa de autorização — e aí deixa de ser esta
 * seção.
 */

const CENAS = [
  {
    setor: 'Condomínio',
    hoje: '"O aviso da assembleia está no quadro de cortiça do elevador, embaixo do papel da dedetização do mês passado. Metade dos moradores não viu."',
    vira: 'Com a TV na portaria: assembleia, manutenção do elevador e coleta seletiva em letras grandes, atualizados pelo síndico do celular.',
  },
  {
    setor: 'Escritório · empresa',
    hoje: '"Mandei o comunicado por e-mail. Ninguém leu. A meta do mês e os aniversariantes ficam num mural que ninguém olha."',
    vira: 'Com a TV na recepção: aviso, agenda da sala de reunião, aniversariantes e o painel de resultados, sem imprimir papel.',
  },
  {
    setor: 'Clínica · consultório',
    hoje: '"Sala de espera no canal de notícias. O paciente sai sem saber que parcelo, que atendo aos sábados, que aceito o convênio novo."',
    vira: 'Com a TV na sala de espera: seus serviços, horários e orientações passando em sequência, sem ninguém precisar apertar play.',
  },
  {
    setor: 'Loja · comércio de rua',
    hoje: '"O cartaz da promoção amarelou na vitrine e o preço está riscado à caneta. Trocar é ir na gráfica."',
    vira: 'Com a TV no balcão ou na vitrine: a oferta de hoje com foto e preço de hoje, trocada em 30 segundos.',
  },
  {
    setor: 'Academia · serviços',
    hoje: '"A grade das aulas está numa folha A4 na recepção, desatualizada desde que a professora trocou de horário."',
    vira: 'Com a TV na recepção: grade da semana, feriado e promoção de matrícula, atualizados pelo celular.',
  },
  {
    // "várias unidades" saiu do rótulo e "em cada unidade" saiu do texto: essa
    // é a palavra da FEATURE de multi-unidade (hierarquia de contas por
    // filial), que não existe no código e já foi retirada da grade de planos
    // por isso. O que existe é o que a cena descreve agora — várias telas na
    // mesma conta, publicando de uma vez. A cena continua verdadeira; o rótulo
    // é que prometia um recurso.
    setor: 'Rede · várias telas',
    hoje: '"Mandei a campanha por WhatsApp pras sete lojas. Três imprimiram, duas imprimiram a versão antiga, duas não viram."',
    vira: 'Com uma tela em cada loja: você publica uma vez e as sete trocam juntas. Se uma cair, chega um e-mail antes de o gerente perceber.',
  },
];

export default function Cenas() {
  return (
    <section
      id="segmentos"
      className="secao secao--noite cenas"
      aria-labelledby="cenas-titulo"
    >
      <div className="secao__cabeca reveal">
        <h2 id="cenas-titulo" className="h2">
          Você conhece essa cena. Quem entra no seu espaço também.
        </h2>
        <p className="lead">
          Acontece no condomínio, no shopping, no escritório e na loja da esquina.
          A TV da parede pode dar esse recado sem virar mais uma tarefa no seu dia.
        </p>
      </div>

      <ul className="cenas__lista grid-3">
        {CENAS.map((cena) => (
          <li key={cena.setor} className="cena reveal">
            <h3 className="cena__setor">{cena.setor}</h3>
            <p className="cena__hoje">{cena.hoje}</p>
            <p className="cena__vira">{cena.vira}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
