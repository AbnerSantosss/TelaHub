// Primitivos visuais do checkout do comprador.
//
// Ficam aqui (e não em `src/ui/`) porque são o vocabulário desta tela: campo com
// rótulo acima, erro anunciado junto ao campo com ícone + texto (nunca só cor) e
// CTA de largura total na cor da marca.
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

/**
 * Logo do TelaHub: a grade de quatro telas ligadas a um centro, o mesmo desenho
 * de packages/marca/logo.svg. Em SVG inline com `currentColor`, para pegar a cor
 * do texto (use `text-marca`) e não depender de caminho de arquivo.
 */
export const LogoHub = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <rect x="15" y="15" width="30" height="24" rx="2" strokeWidth="3.5" />
    <rect x="55" y="15" width="30" height="24" rx="2" strokeWidth="3.5" />
    <rect x="15" y="53" width="30" height="24" rx="2" strokeWidth="3.5" />
    <rect x="55" y="53" width="30" height="32" rx="2" strokeWidth="3.5" />
    <path
      d="M45 27H55M45 65H55M30 39V53M70 39V53"
      strokeWidth="2.5"
      strokeDasharray="3 3"
      opacity="0.75"
    />
    <circle cx="50" cy="46" r="5" fill="currentColor" stroke="none" />
  </svg>
);

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
      <label htmlFor={id} className="rotulo mb-1.5 block">
        {label}
        {optionalLabel ? <span className="ml-1 font-normal">(opcional)</span> : null}
      </label>

      {/* A borda e o fundo moram no próprio <input> (e no prefixo, quando há),
          não numa caixa em volta: assim o campo não vira um "cartão dentro do
          cartão" do passo. */}
      <div className="flex items-stretch">
        {prefix ? (
          <span
            aria-hidden="true"
            className={`money flex shrink-0 items-center rounded-l-lg border border-r-0 bg-app px-3 text-sm text-ink-muted ${
              error ? 'border-danger' : 'border-borda-3'
            }`}
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
          className={`min-h-11 w-full min-w-0 border bg-surface px-3 py-2.5 text-base text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-subtle focus:border-marca focus:shadow-[var(--anel-marca)] sm:text-sm ${
            prefix ? 'rounded-r-lg' : 'rounded-lg'
          } ${error ? 'border-danger' : 'border-borda-3'}`}
        />
      </div>

      {hint ? (
        <p id={hintId} className="mt-1.5 text-base sm:text-xs leading-snug text-ink-subtle">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-start gap-1.5 text-base sm:text-xs font-semibold leading-snug text-danger"
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

/**
 * CTA na cor da marca, largura total — o botão de avançar de cada passo.
 *
 * Marca (`--marca`, 5,4:1 com o branco); verde fica só para estado de sucesso.
 * Efeitos, todos sóbrios:
 *   • hover (só mouse): escurece um tom;
 *   • press: `scale(0.98)` — o toque "afunda", confirma que foi recebido;
 *   • `prefers-reduced-motion`: sem escala (regras em index.css).
 * Desabilitado e ocupado usam a marca lavada, sem sombra e sem efeito.
 */
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
    className={`${ctaClass} w-full min-h-12 px-4 py-3 text-base sm:text-sm ${className}`}
  >
    <span className="relative flex items-center justify-center gap-2">
      {busy ? (
        <>
          <Loader2 aria-hidden="true" size={16} className="animate-spin" />
          <span>{busyLabel}</span>
        </>
      ) : (
        children
      )}
    </span>
  </button>
);

/**
 * Classes do CTA, exportadas para a barra fixa do rodapé usar o MESMO botão
 * visual (ela tem layout próprio, mas não pode ter outra cor nem outro efeito).
 */
export const ctaClass =
  'motion-press relative isolate inline-flex items-center justify-center overflow-hidden ' +
  'rounded-lg bg-cta font-semibold text-white shadow-cta ' +
  'transition-[background-color,box-shadow,transform] duration-150 ease-out ' +
  'hover-fine:bg-cta-hover active:scale-[0.98] active:bg-cta-hover ' +
  'disabled:cursor-not-allowed disabled:bg-cta/45 disabled:shadow-none disabled:active:scale-100';

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
    className="motion-press inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink shadow-card transition-[border-color,background-color,transform] duration-150 ease-out hover-fine:border-borda-3 hover-fine:bg-app active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100"
  >
    {children}
  </button>
);

/**
 * Aviso factual (piso de telas, ausência de cobrança, falha de rede).
 *
 * Vive dentro de cartões de passo, então é uma faixa tingida sem borda nem raio:
 * assim não vira um cartão dentro do cartão. O ícone e o texto carregam o tom.
 */
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
    info: 'bg-marca-fundo text-ink',
    warning: 'bg-warning/10 text-ink',
    danger: 'bg-danger/8 text-ink',
    success: 'bg-success/8 text-ink',
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
      className={`flex items-start gap-2.5 px-3.5 py-3 text-base sm:text-xs leading-relaxed ${tones[tone]}`}
    >
      {icon ? (
        <span aria-hidden="true" className={`mt-px shrink-0 ${iconTones[tone]}`}>
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 max-w-[56ch]">{children}</div>
    </div>
  );
};
