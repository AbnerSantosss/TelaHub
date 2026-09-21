import './Rodape.css';

/**
 * RODAPÉ — identificação do fornecedor, canal do titular e quatro atalhos.
 *
 * ── O CNPJ voltou, e por que ele é obrigatório aqui ─────────────────────────
 * O rodapé anterior omitia o CNPJ porque o número não estava confirmado, e
 * omitir era melhor do que inventar. O número agora existe e é público
 * (74.191.667/0001-55), então volta ao lugar de onde nunca deveria ter saído: o
 * art. 6º do CDC dá ao consumidor o direito de saber QUEM é o fornecedor antes
 * de contratar, e uma página que cobra sem se identificar falha nisso mesmo
 * quando todo o resto é verdade.
 *
 * ── Os dois marcadores entre colchetes são propositais ──────────────────────
 * [RAZÃO SOCIAL] e [ENDEREÇO] ficam à vista até o dono preencher. A alternativa
 * seria inventar (falsidade em identificação empresarial — e o cliente confere
 * no CNPJ público) ou omitir (volta o defeito do art. 6º). Marcador visível é
 * a única saída que não mente e que ninguém esquece: ele incomoda a cada
 * abertura da página, que é exatamente o efeito desejado. NÃO preencha por
 * conta própria e NÃO apague o marcador — quem completa é o dono, com o dado
 * do contrato social.
 *
 * ── O canal do titular (LGPD art. 18) não é enfeite ─────────────────────────
 * Esta página coleta nome, e-mail, empresa e telefone no formulário e usa
 * cookie de campanha. O art. 18 dá ao titular o direito de confirmar,
 * acessar, corrigir e eliminar esse dado — e o direito só é exercível se
 * houver um endereço para pedir. Sem canal publicado, a coleta continua
 * acontecendo e o titular não tem a quem recorrer. O marcador
 * [E-MAIL DO ENCARREGADO] segue a mesma regra dos outros dois: entra caixa que
 * alguém de fato lê, nunca um endereço criado só para não deixar o campo
 * vazio — foi assim que o `comercial@` inventado sobreviveu meses no projeto.
 *
 * ── Privacidade e Termos viraram link de verdade ────────────────────────────
 * Eram TEXTO, marcados "em preparação", porque as páginas não existiam — e
 * link morto num rodapé é pior que a ausência do documento, porque simula
 * conformidade. As páginas agora existem em /privacidade e /termos (são rotas
 * pré-renderizadas do próprio site), então os dois voltam a ser <a href>. Se
 * um dia essas rotas saírem, o certo é voltar ao rótulo honesto — nunca deixar
 * href="#".
 *
 * ── Os dois atalhos de âncora ───────────────────────────────────────────────
 * "O que ainda não fazemos" leva à FAQ (#duvidas), onde estão as limitações
 * assumidas — inclusive a da tela reiniciada sem internet. "Para o seu
 * negócio" leva às cenas por porte (#segmentos). Ambas as âncoras existem
 * nesta página; nenhum item do rodapé pode apontar para âncora que não existe.
 */

export default function Rodape({ scrollToSection }) {
  return (
    <footer className="secao secao--compacta rodape">
      <div className="rodape__identidade">
        <p className="rodape__linha">
          <strong>TelaHub</strong> · CNPJ 74.191.667/0001-55 · Feito no Brasil e cobrado em
          real.
        </p>

        {/* Marcadores para o dono preencher. Ver o cabeçalho antes de mexer. */}
        <p className="rodape__linha rodape__marcador">
          Razão social: [RAZÃO SOCIAL] · Endereço: [ENDEREÇO]
        </p>

        <p className="rodape__linha rodape__marcador">
          Pedidos sobre dados pessoais, como confirmação, acesso, correção ou exclusão (LGPD, art.
          18):{' '}
          [E-MAIL DO ENCARREGADO]
        </p>
      </div>

      <nav className="rodape__nav" aria-label="Rodapé">
        <ul className="rodape__links">
          <li>
            <a className="btn btn--texto rodape__link" href="/privacidade">
              Privacidade
            </a>
          </li>
          <li>
            <a className="btn btn--texto rodape__link" href="/termos">
              Termos de uso
            </a>
          </li>
          <li>
            <button
              type="button"
              className="btn btn--texto rodape__link"
              onClick={() => scrollToSection('#duvidas', 'duvidas')}
            >
              O que ainda não fazemos
            </button>
          </li>
          <li>
            <button
              type="button"
              className="btn btn--texto rodape__link"
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
