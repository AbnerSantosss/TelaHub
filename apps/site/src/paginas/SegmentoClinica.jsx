import Segmento from './Segmento';

/**
 * `/clinica` — destino do anúncio para clínica, consultório e laboratório.
 *
 * ── Por que a manchete é uma pergunta ───────────────────────────────────────
 * "Sala de espera no canal de notícias?" nomeia um custo que ninguém
 * contabiliza: vinte minutos de atenção do paciente, entregues de graça para a
 * programação da TV aberta. O dono da clínica não procura tela — ele nem sabe
 * que está perdendo alguma coisa. A pergunta cria o problema antes de oferecer
 * a saída, que é o único jeito de converter quem não busca a categoria.
 *
 * ── Limite deliberado: nada que pareça informação de saúde ─────────────────
 * A página fala de SERVIÇOS, convênios, horários e orientação de preparo —
 * conteúdo institucional, que a própria clínica já publica. Nada aqui sugere
 * exibir dado de paciente, nome em fila ou resultado: isso é dado pessoal
 * sensível (LGPD art. 5º, II) e o produto não tem controle para tratá-lo. Se
 * uma versão futura desta página prometer "chamada de senha com o nome do
 * paciente", ela precisa passar antes pela política de privacidade.
 *
 * ── O que NÃO pode entrar ───────────────────────────────────────────────────
 * Nenhuma promessa de resultado clínico ou comercial ("aumenta X% o retorno"),
 * nenhum depoimento de médico, nenhuma nota. E nada de prometer aplicativo
 * próprio: o conteúdo roda no navegador da TV.
 */
const DADOS = {
  slug: 'clinica',
  chip: 'Clínica e consultório · sala de espera e recepção',

  h1: 'Sala de espera no canal de notícias?',
  grito: 'Coloque os seus serviços, convênios e horários na TV.',

  sub:
    'O paciente espera 20 minutos olhando para a TV, que hoje mostra novela. Ela pode mostrar que você parcela, atende aos sábados e aceita o convênio novo, além das orientações pré-consulta. O conteúdo passa em sequência, sem ninguém apertar play.',

  imagem: {
    src: '/assets/images/recepcao_boas_vindas.png',
    alt:
      'Tela de recepção mostrando boas-vindas, serviços e horários de atendimento em cartões grandes.',
    legenda:
      'Ilustração montada com os blocos que existem hoje no editor. Não é foto de cliente.',
  },

  cena: {
    titulo: 'O que a TV pode mostrar enquanto o paciente espera',
    lead:
      'Enquanto o paciente aguarda, a tela pode responder o que ele ia perguntar na recepção: se atende no sábado, se aceita o convênio novo, como se prepara para o exame. A recepção deixa de repetir a mesma informação dez vezes por dia.',
  },

  bullets: [
    {
      rotulo: 'Serviços e convênios',
      texto:
        'Serviços, horários e convênios em cartões grandes, trocados do celular quando algo muda.',
    },
    {
      rotulo: 'Vídeo, foto e PDF',
      texto: 'Vídeo, foto e PDF de orientação na mesma tela.',
    },
    {
      rotulo: 'Sem técnico',
      texto: 'A recepção troca o texto e salva; não precisa de técnico nem de TI.',
    },
  ],

  faq: {
    titulo: 'O que a clínica pergunta antes de mexer nisso',
    itens: [
      {
        pergunta: 'Posso mostrar orientação de preparo de exame?',
        resposta:
          'Sim. Entra como PDF ou como texto na tela, junto com o resto do que já está no ar.',
      },
      {
        pergunta: 'Fica bem em consultório pequeno?',
        resposta:
          'Sim. A tela em pé (9:16) ocupa pouca parede e cabe em recepção estreita e corredor.',
      },
      {
        pergunta: 'Quem cuida do conteúdo?',
        resposta: 'A recepção, pelo celular. É trocar o texto ou a foto e salvar.',
      },
    ],
  },
};

export default function SegmentoClinica(props) {
  return <Segmento dados={DADOS} {...props} />;
}
