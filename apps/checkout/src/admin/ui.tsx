/**
 * Primitivos do painel. Ficam aqui dentro de propósito: `src/ui/` é território
 * compartilhado e este app não precisa de biblioteca comum para quatro telas.
 *
 * Sobre a cor dos status: o TOM é o token do DESIGN.md (o mesmo no chip de
 * filtro, no badge e no gráfico). O TEXTO do badge usa o mesmo tom escurecido,
 * porque `--warning`/`--success`/`--accent` sobre fundo claro ficam em ~3:1 e o
 * piso de qualidade exige 4.5:1 em texto. Mesma família de cor, contraste real.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

import type { CheckoutStatus } from './types';
import { STATUS_LABEL } from './format';

export const cx = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ');

interface StatusStyle {
  /** Badge da linha e do detalhe. */
  badge: string;
  /** Chip de filtro quando ativo. */
  chipActive: string;
  /** Ponto/tag e barra de gráfico — uso gráfico, cor cheia do token. */
  dot: string;
  bar: string;
}

export const STATUS_STYLE: Record<CheckoutStatus, StatusStyle> = {
  started: {
    badge: 'border-accent/25 bg-accent/10 text-[#0369A1]',
    chipActive: 'border-accent bg-accent/10 text-[#0369A1]',
    dot: 'bg-accent',
    bar: 'bg-accent',
  },
  identified: {
    badge: 'border-info/25 bg-info/10 text-[#6D28D9]',
    chipActive: 'border-info bg-info/10 text-[#6D28D9]',
    dot: 'bg-info',
    bar: 'bg-info',
  },
  payment_pending: {
    badge: 'border-warning/25 bg-warning/10 text-[#92400E]',
    chipActive: 'border-warning bg-warning/10 text-[#92400E]',
    dot: 'bg-warning',
    bar: 'bg-warning',
  },
  paid: {
    badge: 'border-success/25 bg-success/10 text-[#166534]',
    chipActive: 'border-success bg-success/10 text-[#166534]',
    dot: 'bg-success',
    bar: 'bg-success',
  },
  abandoned: {
    badge: 'border-danger/25 bg-danger/10 text-[#B91C1C]',
    chipActive: 'border-danger bg-danger/10 text-[#B91C1C]',
    dot: 'bg-danger',
    bar: 'bg-danger',
  },
  expired: {
    // Cinza de propósito: `--danger` já é o abandono, que é o estado acionável.
    // Expirado é beco sem saída — não deve competir por atenção.
    badge: 'border-line bg-app text-ink-muted',
    chipActive: 'border-ink-subtle bg-app text-ink',
    dot: 'bg-ink-subtle',
    bar: 'bg-ink-subtle',
  },
};

export const StatusBadge = ({ status, title }: { status: CheckoutStatus; title?: string }) => (
  <span
    title={title}
    className={cx(
      'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap',
      STATUS_STYLE[status].badge
    )}
  >
    <span aria-hidden="true" className={cx('h-1.5 w-1.5 rounded-full', STATUS_STYLE[status].dot)} />
    {STATUS_LABEL[status]}
  </span>
);

// ─── Botões ──────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-[#0284C7] border border-transparent',
  secondary: 'bg-surface text-ink border border-line hover:bg-app',
  ghost: 'bg-transparent text-ink-muted border border-transparent hover:bg-app hover:text-ink',
  danger: 'bg-surface text-[#B91C1C] border border-danger/30 hover:bg-danger/10',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

export const Button = ({
  variant = 'secondary',
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) => (
  <button
    {...rest}
    disabled={disabled || loading}
    className={cx(
      'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
      'disabled:cursor-not-allowed disabled:opacity-50',
      BUTTON_VARIANT[variant],
      className
    )}
  >
    {loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
    {children}
  </button>
);

// ─── Superfícies ─────────────────────────────────────────────────────────────

export const Card = ({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) => (
  <section className={cx('rounded-xl border border-line bg-surface', className)}>
    {(title || actions) && (
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          {title && <h2 className="text-[15px] font-bold text-ink">{title}</h2>}
          {description && <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
    )}
    <div className={cx('px-4 py-4 sm:px-5', bodyClassName)}>{children}</div>
  </section>
);

export const PageHeader = ({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) => (
  <header className="flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[26px]">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

/** Dinheiro. Sempre em `.money` (mono tabular) — ver DESIGN.md. */
export const Money = ({ cents, className }: { cents: number; className?: string }) => {
  const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    (cents ?? 0) / 100
  );
  return <span className={cx('money', className)}>{formatted}</span>;
};

// ─── Estados de carga, erro e vazio ──────────────────────────────────────────

export const Loading = ({ label = 'Carregando…' }: { label?: string }) => (
  <div role="status" className="flex items-center justify-center gap-2.5 px-4 py-14 text-sm text-ink-muted">
    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-accent" />
    {label}
  </div>
);

/** Placeholder de linha da tabela enquanto carrega — evita o salto de layout. */
export const SkeletonRows = ({ rows = 5 }: { rows?: number }) => (
  <div aria-hidden="true" className="space-y-2 p-4">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="h-11 animate-pulse rounded-lg bg-app" />
    ))}
  </div>
);

export const ErrorState = ({
  title = 'Não foi possível carregar',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) => (
  <div className="flex flex-col items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 sm:p-5">
    <div className="flex items-start gap-3">
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
      <div>
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{message}</p>
      </div>
    </div>
    {onRetry && (
      <Button type="button" onClick={onRetry} variant="secondary" className="ml-8">
        Tentar de novo
      </Button>
    )}
  </div>
);

export const EmptyState = ({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  /** O PRÓXIMO PASSO, não um zero solto — zero solto parece defeito. */
  message: ReactNode;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
    {icon && (
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-app text-ink-subtle">
        {icon}
      </span>
    )}
    <p className="text-[15px] font-bold text-ink">{title}</p>
    <p className="max-w-md text-[13px] leading-relaxed text-ink-muted">{message}</p>
    {action}
  </div>
);

/**
 * 403 dentro do painel. Acontece quando a conta autenticou mas não é `master`
 * (por exemplo, o papel mudou depois do login). Não é falha técnica: é regra de
 * permissão, e a tela precisa dizer isso em vez de mostrar zero em tudo.
 */
export const ForbiddenState = ({ message }: { message?: string | null }) => (
  <div className="rounded-xl border border-danger/30 bg-danger/5 p-5">
    <div className="flex items-start gap-3">
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
      <div>
        <p className="text-sm font-bold text-ink">Esta conta não pode ver o funil</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
          {message ?? 'Acesso restrito ao proprietário do sistema.'} O funil reúne leads de toda a
          plataforma, então só o papel <strong>master</strong> pode abri-lo. Entre com uma conta master
          ou peça a elevação do seu acesso.
        </p>
        <a
          href="/admin/login"
          className="mt-3 inline-block text-[13px] font-bold text-accent hover:underline"
        >
          Entrar com outra conta
        </a>
      </div>
    </div>
  </div>
);

// ─── Formulário ──────────────────────────────────────────────────────────────

export const Field = ({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  children: ReactNode;
}) => (
  <div>
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-ink">
      {label}
      {optional && <span className="ml-1.5 font-normal text-ink-subtle">(opcional)</span>}
    </label>
    {children}
    {hint && !error && <p className="mt-1.5 text-xs leading-snug text-ink-muted">{hint}</p>}
    {error && (
      <p id={`${htmlFor}-error`} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-[#B91C1C]">
        <AlertTriangle aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
        {error}
      </p>
    )}
  </div>
);

export const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle ' +
  'focus:border-accent focus:outline-none';

// ─── Modal ───────────────────────────────────────────────────────────────────

export const Modal = ({
  title,
  description,
  onClose,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    // Foco entra no diálogo: sem isso o teclado continua na tabela atrás.
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, button, [href]'
    );
    focusable?.focus();

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-nav/50 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Fechar"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-3.5 sm:px-5">
          <div>
            <h2 id={titleId} className="text-[15px] font-bold text-ink">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-1 rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-app hover:text-ink"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>
        <div className="px-4 py-4 sm:px-5">{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-app/60 px-4 py-3 sm:px-5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

/** Aviso de que nada é enviado. Repetido onde a ação de recuperação aparece. */
export const NoSendingNotice = ({ className }: { className?: string }) => (
  <p
    className={cx(
      'flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-[13px] leading-relaxed text-[#92400E]',
      className
    )}
  >
    <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
    <span>
      Isto só <strong>registra</strong> que você entrou em contato. O sistema não envia mensagem
      nenhuma — não existe integração de WhatsApp nem e-mail automático aqui.
    </span>
  </p>
);
