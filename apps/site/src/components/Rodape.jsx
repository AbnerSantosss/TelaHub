import './Rodape.css';

/**
 * RODAPÉ — uma linha de identificação e quatro atalhos. Nada mais.
 *
 * ── Duas omissões deliberadas. Nenhuma delas é esquecimento ─────────────────
 *
 * 1) CNPJ. O rascunho aprovado trazia "TelaHub · CNPJ [pendente] · Feito no
 *    Brasil...". O trecho inteiro do CNPJ saiu. As três saídas possíveis eram:
 *    inventar um número (falsidade em documento de identificação empresarial,
 *    e o cliente confere), escrever "CNPJ pendente" (anuncia ao visitante que
 *    quem vai cobrar dele não tem inscrição publicada — o oposto do que o
 *    rodapé serve para fazer) ou omitir até existir. Omitir é a única que não
 *    mente nem assusta. Quando houver número, ele volta exatamente aqui, entre
 *    "TelaHub" e "Feito no Brasil".
 *
 * 2) Privacidade e Termos de uso. Essas páginas AINDA NÃO EXISTEM. No rodapé
 *    antigo elas eram <a href="#"> com preventDefault: link que parece link,
 *    tem cursor de link, e não leva a lugar nenhum. Um link morto num rodapé
 *    é pior que a ausência do documento, porque simula conformidade — o
 *    visitante clica, nada acontece, e a impressão que fica é de descuido
 *    exatamente onde a página promete não ter letra miúda. Aqui os dois viram
 *    TEXTO, não link, marcados como "em preparação". Fica honesto e fica
 *    visível: como o site captura lead e usa cookie de campanha, a política de
 *    privacidade é exigência de LGPD, e um aviso à vista é lembrete
 *    permanente da pendência. No dia em que as páginas subirem, este bloco
 *    vira dois <a href> de verdade e a observação some.
 *
 * ── Os dois atalhos que ficam são links reais ───────────────────────────────
 * "O que ainda não fazemos" leva à FAQ (#duvidas), onde estão as limitações
 * assumidas — inclusive a da tela reiniciada sem internet. "Para o seu
 * negócio" leva às cenas por porte (#segmentos). Ambas as âncoras existem
 * nesta página; nenhum item do rodapé pode apontar para âncora que não existe.
 */

export default function Rodape({ scrollToSection }) {
  return (
    <footer className="secao secao--compacta rodape">
      <p className="rodape__linha">
        TelaHub · Feito no Brasil, cobrado em real, sem letra miúda.
      </p>

      <nav className="rodape__nav" aria-label="Rodapé">
        <ul className="rodape__links">
          {/* Texto, não link — as páginas não existem. Ver o cabeçalho. */}
          <li className="rodape__pendente">
            Privacidade e Termos de uso: em preparação
          </li>
          <li>
            <button
              type="button"
              className="rodape__link"
              onClick={() => scrollToSection('#duvidas', 'duvidas')}
            >
              O que ainda não fazemos
            </button>
          </li>
          <li>
            <button
              type="button"
              className="rodape__link"
              onClick={() => scrollToSection('#segmentos', 'segmentos')}
            >
              Para o seu negócio
            </button>
          </li>
        </ul>
      </nav>
    </footer>
  );
}
