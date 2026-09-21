import { z } from 'zod';

/** Política mínima de senha do auto-cadastro. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Versão vigente dos Termos de Uso e da Política de Privacidade.
 *
 * É uma DATA, não um número de release, porque é assim que se prova o que a
 * pessoa leu: "aceitou o texto de 2026-09-05". Quando o texto mudar, mude aqui
 * — e todo mundo que aceitou a versão anterior volta a aparecer como pendente
 * (ver `isTermsAcceptancePending` em `auth.service.ts`), que é exatamente o
 * comportamento exigido pela LGPD art. 8º §2º: consentimento é sobre um texto
 * específico, não um "aceito" genérico e eterno.
 *
 * ARMADILHA: não basta trocar a constante e achar que acabou. O texto exibido
 * no site/painel tem que mudar junto, senão a base inteira é obrigada a aceitar
 * de novo exatamente o mesmo conteúdo — irritação sem ganho jurídico nenhum.
 */
export const TERMS_VERSION = '2026-09-05';
export const PRIVACY_VERSION = '2026-09-05';

/** Mensagem única do bloqueio por falta de aceite (rota e testes leem daqui). */
export const TERMS_REQUIRED_MESSAGE =
  'É preciso aceitar os Termos de Uso e a Política de Privacidade para criar a conta.';

/**
 * Teto de cada campo de atribuição.
 *
 * UTM não tem limite definido em lugar nenhum: quem monta a URL do anúncio põe
 * o que quiser, e já se viu `utm_content` com um JSON inteiro dentro. 255 cobre
 * qualquer campanha real e impede que um parâmetro absurdo derrube o insert.
 */
const ATTRIBUTION_MAX_LENGTH = 255;

/** Campos de origem que o site repassa (`apps/site/src/lib/funnel.js`). */
const ATTRIBUTION_FIELDS = [
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utmContent',
  'utmTerm',
  'gclid',
  'fbclid',
  'referrer',
  'landingPath',
] as const;

export type SignupAttribution = Partial<Record<(typeof ATTRIBUTION_FIELDS)[number], string>>;

/**
 * Atribuição de campanha: TUDO opcional e nada rejeita o cadastro.
 *
 * A regra de ouro aqui é assimétrica de propósito. Perder uma UTM custa uma
 * linha de relatório; perder um cadastro por causa de uma UTM custa um cliente.
 * Por isso valor que não é string vira `undefined`, string comprida é truncada
 * e um `attribution` malformado inteiro (o site mandou uma string, um array, um
 * `null`) cai no `.catch()` e vira objeto vazio — nunca um 400.
 */
export const attributionSchema = z
  .record(z.string(), z.unknown())
  .transform((raw): SignupAttribution => {
    const attribution: SignupAttribution = {};

    for (const field of ATTRIBUTION_FIELDS) {
      const value = raw[field];
      if (typeof value !== 'string') continue;

      const trimmed = value.trim();
      if (!trimmed) continue;

      attribution[field] = trimmed.slice(0, ATTRIBUTION_MAX_LENGTH);
    }

    return attribution;
  })
  .catch((): SignupAttribution => ({}));

export const signupSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, 'Informe o nome da empresa (mínimo 2 caracteres).')
    .max(120, 'Nome da empresa muito longo.'),
  name: z
    .string()
    .trim()
    .min(2, 'Informe seu nome (mínimo 2 caracteres).')
    .max(120, 'Nome muito longo.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Informe um e-mail válido.')
    .max(180, 'E-mail muito longo.'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
    .max(128, 'Senha muito longa.'),

  /**
   * Aceite explícito, obrigatório e que precisa ser `true`.
   *
   * `z.literal(true)` e não `z.boolean()`: mandar `false` tem que falhar igual a
   * não mandar nada. Caixa desmarcada não é consentimento (LGPD art. 8º: livre,
   * informado e INEQUÍVOCO) — e o CDC art. 46 diz que cláusula que o consumidor
   * não teve chance de conhecer simplesmente não o obriga. Aceitar por omissão
   * seria manter um contrato que não vale nada no dia em que for cobrado.
   */
  acceptedTerms: z.literal(true, { message: TERMS_REQUIRED_MESSAGE }),

  /**
   * Versão que a TELA exibiu. Guardamos o que o cliente informou (padrão: a
   * vigente) em vez de carimbar sempre a atual, porque o registro precisa dizer
   * a que texto o "aceito" se referia. Se um painel antigo em cache mandar uma
   * versão velha, o aceite fica gravado como velho e a pessoa volta a ser
   * cobrada pelo aceite no próximo acesso — que é o resultado correto.
   */
  termsVersion: z.string().trim().max(40).optional(),
  privacyVersion: z.string().trim().max(40).optional(),

  /**
   * Consentimento para receber NOVIDADES. Separado do aceite dos Termos.
   *
   * `optional()` e `boolean`, nunca `literal(true)`: ao contrário do aceite dos
   * Termos, este campo pode legitimamente vir `false` ou não vir — e as três
   * situações significam a mesma coisa, "não consentiu". A caixa NUNCA vem
   * marcada por padrão: consentimento pré-marcado não é livre nem inequívoco
   * (LGPD art. 8º), e transformar uma condição do serviço em captura de base de
   * marketing é exatamente o que o art. 7º separa.
   *
   * Aviso de vencimento, inadimplência e cancelamento NÃO dependem disto — são
   * execução de contrato e vão para todo mundo.
   */
  marketingOptIn: z.boolean().optional(),

  /** Origem da conta, congelada no cadastro. Ver `attributionSchema`. */
  attribution: attributionSchema.optional(),

  /**
   * Deduplicação do Pixel: o MESMO uuid que o navegador usou no
   * `fbq('track', 'CompleteRegistration', {}, { eventID })`.
   *
   * ARMADILHA: id diferente (ou ausente) faz a Meta contar a conversão DUAS
   * vezes — uma pelo navegador, outra pelo servidor. Não dá erro, não aparece
   * em log nenhum: só o custo por cadastro do painel fica pela metade e a
   * decisão de mídia é tomada em cima de um número inventado.
   */
  metaEventId: z.string().trim().max(64).optional(),
  /** Cookie `_fbp` do navegador. */
  fbp: z.string().trim().max(255).optional(),
  /** Cookie `_fbc` do navegador (quando ausente, reconstruído do `fbclid`). */
  fbc: z.string().trim().max(255).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const checkEmailQuerySchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
});

/**
 * Corpo de `POST /api/auth/accept-terms` (aceite pendente da base existente).
 *
 * Tolerante de propósito, com `.catch()`: quem está aceitando é o dono do
 * token, e o corpo só diz QUAL versão a tela exibiu. Corpo ausente ou
 * malformado vira `{}` e o servidor assume a versão vigente — recusar o aceite
 * por causa do formato do corpo deixaria a pessoa presa na tela de aceite, sem
 * jeito de sair.
 */
export const acceptTermsSchema = z
  .object({
    termsVersion: z.string().trim().max(40).optional(),
    privacyVersion: z.string().trim().max(40).optional(),
  })
  .catch(() => ({}));

export type AcceptTermsInput = z.infer<typeof acceptTermsSchema>;
