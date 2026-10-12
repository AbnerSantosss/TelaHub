/*
 * Blocos.jsx — "O que vai na tela".
 *
 * DECISÃO: a lista é um inventário, não uma vitrine de promessas. São exatamente
 * os nove blocos que existem hoje no editor, na ordem do mockup aprovado, com a
 * copy palavra por palavra. Por isso a própria linha de apoio já diz "Nada de
 * 'em breve'" — ela é uma promessa de método, e quebrá-la custaria a página toda.
 *
 * ARMADILHA: é aqui que dá vontade de "completar" a grade. Nove cartões em três
 * colunas fecham redondo, e qualquer recurso planejado parece caber. Não cabe.
 * Acrescentar item que ainda não está no editor transforma a seção em roadmap
 * disfarçado, e o visitante só descobre depois de criar a conta. Se um bloco novo
 * entrar no produto, ele entra aqui — nunca antes.
 *
 * A menção "Plano Rede" no painel de resultados é intencional e está correta: esse
 * bloco é cobrado como Rede no backend. Manter a menção evita a pior das surpresas,
 * a de descobrir o plano só na hora de usar.
 *
 * Ícones vêm do mockup, traço 2px, decorativos (aria-hidden) — quem lê por leitor
 * de tela recebe o nome e o texto do bloco, que é a informação real.
 */

import './Blocos.css';

const BLOCOS = [
  {
    nome: 'Texto e aviso',
    texto: 'Assembleia, promoção, horário, boas-vindas. Tamanho e cor à sua escolha.',
    icone: <path d="M4 6h16M12 6v14" />,
  },
  {
    nome: 'Foto e GIF',
    texto: 'Cartaz, produto, planta do imóvel, arte da campanha.',
    icone: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 16l5-5 4 4 3-3 6 6" />
      </>
    ),
  },
  {
    nome: 'Vídeo',
    texto: 'Arquivo seu ou link do YouTube, em loop, com ou sem som.',
    icone: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M10 9l5 3-5 3z" />
      </>
    ),
  },
  {
    nome: 'Relógio e clima',
    texto: 'Hora certa e previsão da sua cidade, sempre no canto.',
    icone: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
  {
    nome: 'Notícias',
    texto: 'Manchetes do portal que você escolher, rodando sozinhas.',
    icone: (
      <>
        <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" />
        <circle cx="5" cy="19" r="1" />
      </>
    ),
  },
  {
    nome: 'Agenda e contador',
    texto: 'Reuniões da sala, aulas da semana, "faltam 3 dias para a festa junina".',
    icone: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </>
    ),
  },
  {
    nome: 'PDF, Docs e planilhas',
    texto:
      'O comunicado que já está no Word, a tabela que já está no Google Sheets, o cardápio em PDF.',
    icone: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </>
    ),
  },
  {
    nome: 'Painel de resultados',
    texto: 'Power BI, cotações e páginas da web para a equipe acompanhar. Plano Rede.',
    icone: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 4 5-6" />
      </>
    ),
  },
  {
    nome: 'Notas, tarefas e listas',
    texto: 'Escalas, checklists e avisos internos para a equipe.',
    icone: (
      <>
        <path d="M12 3l9 4-9 4-9-4z" />
        <path d="M3 12l9 4 9-4M3 17l9 4 9-4" />
      </>
    ),
  },
];

export default function Blocos() {
  return (
    <section id="na-tela" className="secao blocos-secao" aria-labelledby="na-tela-titulo">
      <div className="secao__cabeca reveal">
        <span className="chip">O que vai na tela</span>
        <h2 id="na-tela-titulo" className="h2">
          A foto, o texto, o vídeo, a agenda e a planilha que você já tem viram conteúdo de TV.
        </h2>
        <p className="lead">Todos os blocos abaixo já existem no editor hoje.</p>
      </div>

      <ul className="grid-3 blocos__grid reveal">
        {BLOCOS.map((bloco) => (
          <li className="bloco" key={bloco.nome}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {bloco.icone}
            </svg>
            <span>
              <strong className="bloco__nome">{bloco.nome}</strong>
              <span className="bloco__texto">{bloco.texto}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="lead blocos__fecho reveal">
        O editor também tem aviso de emergência em todas as telas de uma vez, várias cenas por tela
        com o tempo de cada uma e agendamento por dia e hora.
      </p>
    </section>
  );
}
