import Segmento from './Segmento';

/**
 * `/loja` — destino do anúncio para comércio de rua e vitrine.
 *
 * ── Por que a manchete fala do cartaz, e não da tela ────────────────────────
 * O concorrente real não é outro sistema: é a folha A4 impressa no fundo da
 * loja, que amarela na vitrine e continua anunciando a promoção do mês passado.
 * A manchete nomeia esse objeto porque o dono da loja o reconhece na hora — e
 * porque ela é literalmente verdadeira, o que "modernize sua loja" não é.
 *
 * ── Comida aparece, mas no meio da lista ────────────────────────────────────
 * "loja de rua, mercadinho, farmácia, pet, ótica, lanchonete" — lanchonete é o
 * SEXTO item, de propósito. O termo de comida é dominado por QR/delivery e
 * abrir por ele faz o dono da farmácia e da ótica concluírem "não é pra mim" em
 * dois segundos. Comida é um caso entre vários e nunca abre nada.
 *
 * ── A imagem aqui é captura REAL, não ilustração ────────────────────────────
 * As duas outras páginas de segmento usam renderização (declarada como tal).
 * Nesta, o editor no formato em pé é a captura real que já existe em
 * `public/capturas/` e mostra exatamente a tela da vitrine. Não invente arquivo
 * de imagem: se não existe em `public/`, o build não avisa — a página vai ao ar
 * com um quadro quebrado no anúncio pago.
 *
 * ── O que NÃO pode entrar ───────────────────────────────────────────────────
 * Nada de "aumenta X% a venda" (não há fonte), preço riscado, contador de vagas
 * ou "mais vendido". E "sem fidelidade" nunca aparece sozinho: o anual é um
 * compromisso de 12 meses, e o selo absoluto ao lado dele é a frase que o
 * cliente cita ao pedir o dinheiro de volta (CDC arts. 30 e 37).
 */
const DADOS = {
  slug: 'loja',
  chip: 'Comércio · balcão, vitrine e totem',

  h1: 'O cartaz da promoção amarelou.',
  grito: 'Na TV, a oferta de hoje é a de hoje.',

  sub:
    'Loja de rua, mercadinho, farmácia, pet, ótica, lanchonete: a TV do balcão ou o totem da vitrine mostram a oferta com foto e preço. Você troca pelo celular em 30 segundos, sem imprimir de novo.',

  imagem: {
    src: '/capturas/real-editor-9-16.jpg',
    alt: 'Editor do TelaHub montando uma tela no formato em pé, 9:16, para vitrine.',
    legenda: 'Captura real do editor no formato em pé (9:16), o mesmo da vitrine e do totem.',
  },

  cena: {
    titulo: 'A oferta do dia na tela do balcão',
    lead:
      'Cartaz impresso é uma decisão tomada na segunda que ainda está na parede na sexta. Na tela, a oferta muda conforme o estoque, o feriado e o movimento. Quem passa na calçada vê o preço de agora.',
  },

  bullets: [
    {
      rotulo: 'Foto e preço',
      texto:
        'Oferta com foto e preço trocada do celular; horário de funcionamento e feriado junto.',
    },
    {
      rotulo: 'Vitrine e balcão',
      texto: 'Vitrine em pé (9:16) e TV do balcão (16:9) no mesmo painel.',
    },
    {
      rotulo: 'Preço em real',
      texto:
        'Cobrado em real, por tela; a primeira é grátis para sempre e o mensal não tem fidelidade.',
    },
  ],

  faq: {
    titulo: 'O que o dono da loja pergunta antes de mexer nisso',
    itens: [
      {
        pergunta: 'Posso agendar a oferta do fim de semana?',
        resposta:
          'Sim: o aviso agendado por data e hora está no plano Loja para cima. Você marca quando entra e quando sai.',
      },
      {
        pergunta: 'Funciona na TV velha do balcão?',
        resposta:
          'Se ela tem navegador de internet, sim. Se não tem, um aparelho de HDMI comum (Chromecast, Fire Stick, Mi Box) resolve.',
      },
      {
        pergunta: 'Quantas ofertas cabem?',
        resposta:
          'Várias cenas por tela, com o tempo de cada uma. Elas se revezam sozinhas, sem ninguém apertar nada.',
      },
    ],
  },
};

export default function SegmentoLoja(props) {
  return <Segmento dados={DADOS} {...props} />;
}
