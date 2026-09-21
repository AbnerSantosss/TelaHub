import Segmento from './Segmento';

/**
 * `/condominio` — destino do anúncio para síndico e administradora.
 *
 * ── Por que a manchete é o aviso da assembleia ──────────────────────────────
 * Não é o problema mais grave do condomínio; é o mais RECONHECÍVEL. O síndico
 * não procura "painel de avisos": ele lembra do papel A4 que ele mesmo colou no
 * quadro de cortiça na sexta e que sumiu no sábado. A frase devolve essa cena.
 * Manchete de recurso ("gerencie as telas do seu condomínio") só converte quem
 * já conhece a categoria — e no condomínio ninguém conhece.
 *
 * ── O que NÃO pode entrar aqui ──────────────────────────────────────────────
 * Nada de "aprovado por N condomínios", nota, depoimento de síndico ou
 * porcentagem de redução de reclamação: não existe base publicada. E nada de
 * prometer que a tela funciona na queda de internet — a limitação está assumida
 * no FAQ da home e repeti-la ao contrário aqui seria o mesmo defeito que o
 * projeto já corrigiu uma vez.
 *
 * ── A pergunta da assembleia é a objeção nº 1, e por isso abre o FAQ ────────
 * O síndico não decide sozinho gastar dinheiro do condomínio. A resposta não
 * inventa um argumento: ela lembra que a primeira tela é grátis, então não há o
 * que aprovar para começar. É o único caminho honesto — e é o mais forte.
 */
const DADOS = {
  slug: 'condominio',
  chip: 'Condomínio · portaria, hall e elevador',

  h1: 'O aviso da assembleia na TV da portaria,',
  grito: 'em letras grandes, atualizado pelo síndico do celular.',

  sub:
    'Assembleia, manutenção do elevador, coleta seletiva, recado da administradora: o que hoje vai para o quadro de cortiça passa para a TV que já existe na portaria ou no hall. A primeira tela é grátis para sempre e não pede cartão.',

  imagem: {
    src: '/assets/images/aviso_condominio.png',
    alt:
      'Tela de condomínio mostrando aviso de assembleia, manutenção do elevador e coleta seletiva em letras grandes.',
    legenda:
      'Ilustração montada com os blocos que existem hoje no editor. Não é foto de cliente.',
  },

  cena: {
    titulo: 'Do quadro de cortiça para a tela que já está ligada',
    lead:
      'O papel colado na sexta some no sábado, e quem não passou na portaria naquele dia não viu. Na TV, o mesmo aviso fica grande, fica lá e muda quando o síndico quiser. Não precisa imprimir nem pedir favor ao porteiro.',
  },

  bullets: [
    {
      rotulo: 'Do celular',
      texto:
        'Troque o aviso pelo celular, de onde estiver. Não precisa de pen-drive nem de descer até a portaria.',
    },
    {
      rotulo: 'Deitada ou em pé',
      texto:
        'Serve na TV deitada do hall e na tela em pé do elevador ou da entrada, no mesmo painel.',
    },
    {
      rotulo: 'Aviso por e-mail',
      texto: 'Se a TV cair, o síndico recebe um e-mail antes de o morador reclamar.',
    },
  ],

  faq: {
    titulo: 'O que o síndico pergunta antes de mexer nisso',
    itens: [
      {
        pergunta: 'Preciso aprovar em assembleia?',
        resposta:
          'Para começar, não há o que aprovar: a primeira tela é grátis, sem prazo e sem cartão. Se o condomínio depois quiser mais telas, o plano pago é uma despesa mensal em real, por tela ativa. No mensal, não há fidelidade.',
      },
      {
        pergunta: 'O porteiro consegue trocar?',
        resposta:
          'Sim. É trocar o texto e salvar, no celular ou no computador da portaria. Você escolhe quem tem acesso.',
      },
      {
        pergunta: 'E o síndico seguinte?',
        resposta:
          'A conta é do condomínio, não da pessoa. Na troca de síndico você troca quem tem acesso; as telas e o conteúdo continuam onde estão.',
      },
    ],
  },
};

export default function SegmentoCondominio(props) {
  return <Segmento dados={DADOS} {...props} />;
}
