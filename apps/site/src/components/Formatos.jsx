import './Formatos.css';

/**
 * FORMATOS — "A TV da parede e o totem da entrada, no mesmo painel."
 *
 * ── Por que a seção existe ──────────────────────────────────────────────────
 * Quem já pesquisou tela na parede aprendeu a esperar que 16:9 e 9:16 sejam
 * dois produtos, dois preços ou dois cadastros. A pergunta que trava a compra
 * é sempre a mesma: "e o totem da entrada, entra aqui também?". A seção
 * responde antes de a pergunta ser feita — e responde com prova, não com
 * adjetivo: à esquerda o editor montando uma tela deitada, à direita o painel
 * com as quatro telas de portes diferentes convivendo.
 *
 * ── O que ela não pode dizer ────────────────────────────────────────────────
 * "Mesmo painel" é sobre FORMATO, nunca sobre rede: nada de "várias unidades",
 * "multi-loja" ou hierarquia de contas — isso não está pronto e não se
 * promete. As duas capturas são do produto rodando; se um dia a interface
 * mudar, troca-se a imagem, não a legenda. As legendas nomeiam o que aparece
 * na foto ("Recepção do escritório", portaria, balcão, totem) e não devem
 * ganhar nome de cliente real sem autorização.
 */

const FORMATOS = [
  {
    src: '/capturas/real-editor-16-9.jpg',
    alt: 'Editor do TelaHub com uma tela deitada 16:9 aberta na área de montagem, com os blocos de conteúdo à volta.',
    legenda: 'Tela deitada 16:9 chamada "Recepção do escritório"',
  },
  {
    src: '/capturas/real-painel.jpg',
    alt: 'Painel do TelaHub listando quatro telas lado a lado: duas deitadas 16:9 e duas em pé 9:16.',
    legenda: 'Painel real: portaria (9:16), recepção (16:9), balcão (16:9), totem (9:16)',
  },
];

export default function Formatos() {
  return (
    <section
      id="formatos"
      className="secao secao--papel secao--compacta formatos"
      aria-labelledby="formatos-titulo"
    >
      <div className="secao__cabeca reveal">
        <p className="chip formatos__chip">Deitada ou em pé</p>

        <h2 id="formatos-titulo" className="h2">
          A TV da parede e o totem da entrada, no mesmo painel.
        </h2>

        <p className="lead">
          Cada tela tem seu formato. A recepção usa 16:9; a vitrine, o corredor
          do shopping e o totem usam 9:16. Você monta os dois no mesmo lugar e
          vê tudo junto.
        </p>
      </div>

      <div className="formatos__grade grid-2">
        {FORMATOS.map((formato) => (
          <figure key={formato.src} className="formato reveal">
            <div className="shot">
              <img
                src={formato.src}
                width="1100"
                height="551"
                loading="lazy"
                decoding="async"
                alt={formato.alt}
              />
            </div>
            <figcaption className="cap formato__legenda">
              {formato.legenda}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
