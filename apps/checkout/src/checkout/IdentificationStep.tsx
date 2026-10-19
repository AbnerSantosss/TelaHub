// Passo 1 — IDENTIFICAÇÃO.
//
// CPF **ou** CNPJ com alternância explícita: a maior parte das contratações é de
// empresa, e o documento é o que identifica quem contratou. Quando é CNPJ, a
// razão social passa a ser obrigatória, porque é o nome do contratante.
//
// ⚠️ NÃO PROMETA NOTA FISCAL AQUI. Os textos deste passo diziam que "a nota
// fiscal do serviço é emitida contra este CNPJ" — hoje isso não acontece: a
// emissão de NFS-e depende do provedor real com `ASAAS_NFSE_ENABLED` ligado, e
// o provedor ativo é simulado (nenhum valor é cobrado, nenhuma nota é emitida).
// Anunciar documento fiscal que não sai é promessa que o produto não cumpre
// (CDC, art. 30) e a primeira reclamação previsível de quem contrata por CNPJ.
import { useEffect, useRef } from 'react';
import { Building2, LogIn, Lock, User, UserCheck, Wand2 } from 'lucide-react';

import { randomIdentity } from '../lib/fake-data';
import { Notice, PrimaryButton, TextField } from './primitives';
import type { CheckoutController } from './useCheckout';
import type { IdentityField } from './validation';

const KIND_OPTIONS = [
  { kind: 'cpf' as const, label: 'CPF', icon: User, help: 'Pessoa física' },
  { kind: 'cnpj' as const, label: 'CNPJ', icon: Building2, help: 'Empresa' },
];

/**
 * Leitura defensiva da config de pagamento.
 *
 * O `paymentConfig.simulated` é a fonte de verdade de "isto é demonstração" para
 * o resto do app, mas o campo está sendo introduzido no controller em paralelo.
 * Ler por uma interseção local mantém este arquivo compilando antes e depois
 * disso, sem precisar alterar `useCheckout.ts` — e o dia em que o campo existir
 * de verdade, o tipo aqui continua correto (é o mesmo formato).
 */
type DemoAwareController = CheckoutController & {
  paymentConfig?: { simulated?: boolean };
};

/**
 * Painel (`/app`), com o mesmo override `VITE_APP_URL` da tela de obrigado.
 * Copiado e não importado para não amarrar as duas telas.
 */
const APP_URL = (
  (import.meta as ImportMeta & { env?: { VITE_APP_URL?: string } }).env?.VITE_APP_URL ?? ''
)
  .trim()
  .replace(/\/+$/, '') || '/app';

/**
 * Login do painel que devolve ao checkout com o mesmo plano. O `Login.tsx` do
 * painel lê `plano`, `telas` e `intervalo` antes do `#` e, depois de entrar,
 * abre um checkout novo com essa escolha. Sem plano escolhido, o login só
 * leva ao painel.
 */
function loginToBuyUrl(planCode: string | null, screens: number, interval: string): string {
  if (!planCode) return `${APP_URL}/#/login`;
  const params = new URLSearchParams({ plano: planCode, telas: String(screens) });
  if (interval === 'yearly') params.set('intervalo', 'anual');
  return `${APP_URL}/?${params.toString()}#/login`;
}

export const IdentificationStep = ({ checkout }: { checkout: CheckoutController }) => {
  const {
    identity,
    identityErrors,
    focusRequest,
    setIdentityField,
    setMarketingOptIn,
    setDocumentKind,
    blurIdentityField,
    submitIdentify,
    savingIdentity,
    loggedUser,
    signOutLoggedUser,
    accountConflict,
    planCode,
    screens,
    billingInterval,
  } = checkout;

  const isCnpj = identity.documentKind === 'cnpj';

  // O atalho de pré-preenchimento só existe fora de produção real: em `vite dev`
  // ou quando o backend declara que o pagamento é simulado. Nunca deve aparecer
  // para um comprador de verdade.
  const { paymentConfig } = checkout as DemoAwareController;
  // `import.meta.env` só é tipado com `vite/client` nos `types` do tsconfig, e
  // este projeto declara apenas `node` — daí a leitura por interseção local, que
  // evita mexer na config do build só por causa deste botão.
  const viteEnv = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env;
  const showFakeFill = viteEnv?.DEV === true || paymentConfig?.simulated === true;

  /**
   * Preenche o passo com uma identidade fictícia porém válida.
   *
   * Usa **o tipo de documento já selecionado** e deliberadamente não chama
   * `setDocumentKind`: essa função limpa `document` e `companyName`, e como o
   * estado do React só é aplicado no próximo render, trocar o tipo e escrever o
   * documento no mesmo handler mascararia o valor com o tipo antigo (CPF com
   * máscara de CNPJ e vice-versa) — um bug intermitente, que aparece só às vezes.
   * Respeitando o tipo escolhido pela pessoa, o preenchimento é determinístico.
   */
  const fillWithFakeData = (): void => {
    const fake = randomIdentity(identity.documentKind);
    setIdentityField('name', fake.name);
    setIdentityField('email', fake.email);
    setIdentityField('phone', fake.phone);
    setIdentityField('document', fake.document);
    // No fluxo CPF o campo de razão social nem é renderizado — escrever nele
    // deixaria lixo invisível no rascunho.
    if (fake.documentKind === 'cnpj') setIdentityField('companyName', fake.companyName);
  };

  const fieldRefs = useRef<Partial<Record<IdentityField, HTMLInputElement | null>>>({});
  const bindRef =
    (field: IdentityField) =>
    (element: HTMLInputElement | null): void => {
      fieldRefs.current[field] = element;
    };

  // O primeiro campo inválido recebe o foco quando a pessoa tenta avançar — ler
  // a mensagem não basta se ela tiver de caçar o campo. O `nonce` garante que
  // errar o mesmo campo duas vezes foque de novo.
  useEffect(() => {
    if (!focusRequest) return;
    fieldRefs.current[focusRequest.field]?.focus();
  }, [focusRequest]);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submitIdentify();
      }}
      className="flex flex-col gap-4"
    >
      {/*
        Conta do painel aberta neste navegador. O e-mail fica travado porque é
        ele que liga a compra à organização da pessoa (ver `useLoggedUser.ts`);
        "Sair" é a saída para quem está no computador de outra pessoa ou quer
        comprar para outra conta.
      */}
      {loggedUser ? (
        <Notice tone="info" icon={<UserCheck size={15} />}>
          Você está comprando como{' '}
          <strong className="font-bold break-all">{loggedUser.email}</strong>. O plano vai ser
          ativado nessa conta.
          {/* Linha própria e 44px de altura no toque: é o único jeito de trocar de conta. */}
          <button
            type="button"
            onClick={signOutLoggedUser}
            className="mt-1 flex min-h-11 items-center font-bold text-accent-ink underline underline-offset-2 sm:min-h-6"
          >
            Não é você? Sair
          </button>
        </Notice>
      ) : null}

      {/*
        O servidor recusou o e-mail: ele já tem conta e quem compra não entrou
        nela. Só a própria conta logada pode contratar para si, senão qualquer
        pessoa trocaria o plano de outra digitando o e-mail dela.
      */}
      {accountConflict?.code === 'email_has_account' ? (
        <Notice tone="warning" role="alert" icon={<LogIn size={15} />}>
          <span className="block">{accountConflict.message}</span>
          <a
            href={loginToBuyUrl(planCode, screens, billingInterval)}
            className="mt-1 flex min-h-11 items-center font-bold text-accent-ink underline underline-offset-2 sm:min-h-6"
          >
            Entrar na minha conta
          </a>
          <span className="block">Ou use outro e-mail para criar uma conta nova.</span>
        </Notice>
      ) : null}
      {accountConflict?.code === 'billing_permission_denied' ? (
        <Notice tone="warning" role="alert" icon={<Lock size={15} />}>
          {accountConflict.message}
        </Notice>
      ) : null}

      <TextField
        ref={bindRef('name')}
        id="checkout-name"
        label="Nome completo"
        value={identity.name}
        onValueChange={(value) => setIdentityField('name', value)}
        onBlur={() => blurIdentityField('name')}
        error={identityErrors.name}
        autoComplete="name"
        autoCapitalize="words"
        placeholder="Como está no seu documento"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          ref={bindRef('email')}
          id="checkout-email"
          label="E-mail"
          value={identity.email}
          onValueChange={(value) => setIdentityField('email', value)}
          onBlur={() => blurIdentityField('email')}
          error={identityErrors.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="voce@empresa.com.br"
          readOnly={!!loggedUser}
          aria-readonly={loggedUser ? true : undefined}
          hint={
            loggedUser
              ? 'É o e-mail da sua conta. Para usar outro, saia primeiro.'
              : 'É por aqui que enviamos o acesso ao painel.'
          }
        />

        <TextField
          ref={bindRef('phone')}
          id="checkout-phone"
          label="WhatsApp"
          value={identity.phone}
          onValueChange={(value) => setIdentityField('phone', value)}
          onBlur={() => blurIdentityField('phone')}
          error={identityErrors.phone}
          prefix="+55"
          inputMode="tel"
          autoComplete="tel-national"
          maxLength={16}
          placeholder="(11) 98888-7777"
          hint="Só usamos para falar sobre esta contratação."
        />
      </div>

      <fieldset className="min-w-0">
        <legend className="rotulo mb-1.5">Documento</legend>
        <div className="flex gap-2" role="group" aria-label="Tipo de documento">
          {KIND_OPTIONS.map(({ kind, label, icon: Icon, help }) => {
            const active = identity.documentKind === kind;
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={active}
                onClick={() => setDocumentKind(kind)}
                className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-bold transition-colors ${
                  active
                    ? 'border-accent bg-accent/10 text-ink'
                    : 'border-line bg-surface text-ink-muted hover-fine:border-ink-subtle'
                }`}
              >
                <Icon aria-hidden="true" size={15} />
                {label}
                <span className="sr-only">. {help}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          ref={bindRef('document')}
          id="checkout-document"
          label={isCnpj ? 'CNPJ' : 'CPF'}
          value={identity.document}
          onValueChange={(value) => setIdentityField('document', value)}
          onBlur={() => blurIdentityField('document')}
          error={identityErrors.document}
          inputMode="numeric"
          autoComplete="off"
          maxLength={isCnpj ? 18 : 14}
          placeholder={isCnpj ? '00.000.000/0000-00' : '000.000.000-00'}
          hint={
            isCnpj
              ? 'É o documento da empresa que fica registrado como contratante.'
              : 'Identifica quem está contratando. Não fica visível na tela de ninguém.'
          }
        />

        {isCnpj ? (
          <TextField
            ref={bindRef('companyName')}
            id="checkout-company"
            label="Razão social"
            value={identity.companyName}
            onValueChange={(value) => setIdentityField('companyName', value)}
            onBlur={() => blurIdentityField('companyName')}
            error={identityErrors.companyName}
            autoComplete="organization"
            placeholder="Razão social da empresa"
          />
        ) : null}
      </div>

      <p className="flex max-w-[56ch] items-start gap-2 text-base sm:text-xs leading-relaxed text-ink-subtle">
        <Lock aria-hidden="true" size={14} className="mt-px shrink-0" />
        <span>
          Seus dados ficam com a gente só para concluir esta contratação e liberar o seu acesso.
          Nada é compartilhado com terceiros.
        </span>
      </p>

      {/*
        Consentimento de novidades. Três regras que não podem ser afrouxadas:

        1. Nasce DESMARCADO e continua opcional — não entra na validação, não
           trava o botão "Continuar". Consentimento obtido como condição da
           compra não é consentimento.
        2. Fica separado da frase de privacidade acima, que fala de outra coisa
           (uso dos dados para executar a contratação). Juntar as duas faria uma
           parecer consequência da outra.
        3. A promessa de saída precisa ser verdadeira: o link de descadastro vai
           no rodapé de toda campanha, e a rota que o atende é pública. Se algum
           dia o descadastro passar a exigir login, este texto vira promessa
           falsa e sai daqui junto.
      */}
      <label
        htmlFor="checkout-novidades"
        className="flex max-w-[56ch] cursor-pointer items-start gap-2.5 text-base sm:text-xs leading-relaxed text-ink-muted"
      >
        <input
          id="checkout-novidades"
          type="checkbox"
          checked={identity.marketingOptIn}
          onChange={(event) => setMarketingOptIn(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-accent"
        />
        <span>
          Quero receber novidades e dicas de uso por e-mail. Dá para sair quando quiser, pelo link
          no rodapé de cada mensagem.
        </span>
      </label>

      <PrimaryButton type="submit" busy={savingIdentity} busyLabel="Salvando…">
        Continuar
      </PrimaryButton>

      {showFakeFill ? (
        // `type="button"`: dentro de um `<form>`, um botão sem tipo explícito é
        // submit — clicar aqui enviaria o passo em vez de preencher.
        // Fica abaixo do CTA, em borda tracejada e texto secundário, para ler
        // como ferramenta de bastidor e não competir com "Continuar".
        <button
          type="button"
          onClick={fillWithFakeData}
          className="flex min-h-11 items-center justify-center gap-2 self-center rounded-lg border border-dashed border-line px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover-fine:border-ink-subtle hover-fine:text-ink"
        >
          <Wand2 aria-hidden="true" size={14} />
          Preencher com dados de teste
        </button>
      ) : null}
    </form>
  );
};
