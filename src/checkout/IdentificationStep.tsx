// Passo 1 — IDENTIFICAÇÃO.
//
// CPF **ou** CNPJ com alternância explícita: a contratação é B2B e a NFS-e é
// emitida contra o CNPJ. Quando é CNPJ, a razão social passa a ser obrigatória,
// porque é o nome que sai na nota.
import { useEffect, useRef } from 'react';
import { Building2, Lock, User, Wand2 } from 'lucide-react';

import { randomIdentity } from '../lib/fake-data';
import { PrimaryButton, TextField } from './primitives';
import type { CheckoutController } from './useCheckout';
import type { IdentityField } from './validation';

const KIND_OPTIONS = [
  { kind: 'cpf' as const, label: 'CPF', icon: User, help: 'Pessoa física' },
  { kind: 'cnpj' as const, label: 'CNPJ', icon: Building2, help: 'Empresa (nota contra o CNPJ)' },
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

export const IdentificationStep = ({ checkout }: { checkout: CheckoutController }) => {
  const {
    identity,
    identityErrors,
    focusRequest,
    setIdentityField,
    setDocumentKind,
    blurIdentityField,
    submitIdentify,
    savingIdentity,
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
          hint="É por aqui que enviamos o acesso ao painel."
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
        <legend className="eyebrow mb-1.5">Documento</legend>
        <div className="flex gap-2" role="group" aria-label="Tipo de documento">
          {KIND_OPTIONS.map(({ kind, label, icon: Icon, help }) => {
            const active = identity.documentKind === kind;
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={active}
                onClick={() => setDocumentKind(kind)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-bold transition-colors ${
                  active
                    ? 'border-accent bg-accent/10 text-ink'
                    : 'border-line bg-surface text-ink-muted hover:border-ink-subtle'
                }`}
              >
                <Icon aria-hidden="true" size={15} />
                {label}
                <span className="sr-only"> — {help}</span>
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
              ? 'A nota fiscal do serviço é emitida contra este CNPJ.'
              : 'Usado no contrato e na nota fiscal.'
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
            placeholder="Nome da empresa na nota"
          />
        ) : null}
      </div>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-subtle">
        <Lock aria-hidden="true" size={14} className="mt-px shrink-0" />
        <span>
          Seus dados ficam com a gente só para concluir esta contratação e emitir a nota. Nada é
          compartilhado com terceiros.
        </span>
      </p>

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
          className="flex items-center justify-center gap-2 self-center rounded-lg border border-dashed border-line px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-ink-subtle hover:text-ink"
        >
          <Wand2 aria-hidden="true" size={14} />
          Preencher com dados de teste
        </button>
      ) : null}
    </form>
  );
};
