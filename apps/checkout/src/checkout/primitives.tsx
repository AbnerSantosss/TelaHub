// Primitivos visuais do checkout do comprador.
//
// Ficam aqui (e não em `src/ui/`) porque são o vocabulário desta tela: campo com
// rótulo acima, erro anunciado junto ao campo com ícone + texto (nunca só cor) e
// CTA de largura total em maiúsculas, como nas referências.
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  // `prefix` é atributo global (RDFa) nos tipos do React; aqui o nome é nosso,
  // para o conteúdo fixo colado no início do campo (o `+55` do WhatsApp).
  'id' | 'value' | 'onChange' | 'className' | 'aria-invalid' | 'aria-describedby' | 'prefix'
>;

export interface TextFieldProps extends NativeInputProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Texto de ajuda permanente. Ajuda contextual visível, não em tooltip. */
  hint?: string;
  error?: string;
  /** Conteúdo fixo colado no início do campo (ex.: `+55`). */
  prefix?: ReactNode;
  optionalLabel?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { id, label, value, onValueChange, hint, error, prefix, optionalLabel, ...rest },
  ref
) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="eyebrow mb-1.5 block">
        {label}
        {optionalLabel ? <span className="ml-1 lowercase tracking-normal">(opcional)</span> : null}
      </label>

      <div
        className={`flex items-center gap-0 rounded-lg border bg-surface transition-colors focus-within:border-accent ${
          error ? 'border-danger' : 'border-line'
        }`}
      >
        {prefix ? (
          <span
            aria-hidden="true"
            className="money shrink-0 border-r border-line px-3 py-2.5 text-sm text-ink-muted"
          >
            {prefix}
          </span>
        ) : null}
        <input
          {...rest}
          ref={ref}
          id={id}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className="w-full min-w-0 rounded-lg bg-transparent px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-subtle"
        />
      </div>

      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs leading-snug text-ink-subtle">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold leading-snug text-danger"
        >
          <AlertCircle aria-hidden="true" size={14} className="mt-px shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
});

export interface PrimaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  busy?: boolean;
  disabled?: boolean;
  /** Rótulo lido enquanto `busy` — o texto visível não muda de tamanho. */
  busyLabel?: string;
  className?: string;
}

/** CTA verde, largura total, maiúsculas — o botão de avançar de cada passo. */
export const PrimaryButton = ({
  children,
  onClick,
  type = 'button',
  busy = false,
  disabled = false,
  busyLabel = 'Enviando…',
  className = '',
}: PrimaryButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || busy}
    aria-busy={busy || undefined}
    className={`flex w-full items-center justify-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:bg-success/45 ${className}`}
  >
    {busy ? (
      <>
        <Loader2 aria-hidden="true" size={16} className="animate-spin" />
        <span>{busyLabel}</span>
      </>
    ) : (
      children
    )}
  </button>
);

export const SecondaryButton = ({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink-subtle disabled:cursor-not-allowed disabled:opacity-50"
  >
    {children}
  </button>
);

/** Caixa de aviso factual (piso de telas, ausência de cobrança, falha de rede). */
export const Notice = ({
  tone = 'info',
  icon,
  children,
  role,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  icon?: ReactNode;
  children: ReactNode;
  role?: 'status' | 'alert';
}) => {
  const tones: Record<string, string> = {
    info: 'border-accent/35 bg-accent/8 text-ink',
    warning: 'border-warning/40 bg-warning/10 text-ink',
    danger: 'border-danger/40 bg-danger/8 text-ink',
    success: 'border-success/40 bg-success/8 text-ink',
  };
  const iconTones: Record<string, string> = {
    info: 'text-accent',
    warning: 'text-warning',
    danger: 'text-danger',
    success: 'text-success',
  };

  return (
    <div
      role={role}
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-xs leading-relaxed ${tones[tone]}`}
    >
      {icon ? (
        <span aria-hidden="true" className={`mt-px shrink-0 ${iconTones[tone]}`}>
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
};
