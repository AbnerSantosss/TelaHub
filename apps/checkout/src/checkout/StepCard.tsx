// Passo do acordeão do checkout.
//
// Três estados, como nas referências:
//   • `active`  — card branco aberto, número em círculo escuro;
//   • `done`    — colapsa em card VERDE com ✓, resumo dos dados e lápis para
//                 editar. É o detalhe que mantém o contexto sem ocupar a tela;
//   • `pending` — esmaecido, número em cinza, cabeçalho não clicável.
import type { ReactNode, RefObject } from 'react';
import { Check, Pencil } from 'lucide-react';

export type StepState = 'active' | 'done' | 'pending';

export interface StepCardProps {
  index: number;
  title: string;
  state: StepState;
  /** Resumo mostrado quando o passo está concluído. */
  summary?: ReactNode;
  /** Linha curta de apoio mostrada quando o passo está aberto. */
  caption?: ReactNode;
  onEdit?: () => void;
  panelId: string;
  panelRef?: RefObject<HTMLDivElement>;
  children: ReactNode;
}

export const StepCard = ({
  index,
  title,
  state,
  summary,
  caption,
  onEdit,
  panelId,
  panelRef,
  children,
}: StepCardProps) => {
  const isActive = state === 'active';
  const isDone = state === 'done';
  const canEdit = isDone && !!onEdit;
  const headingId = `${panelId}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      aria-current={isActive ? 'step' : undefined}
      className={`overflow-hidden rounded-xl border transition-colors ${
        isDone
          ? 'border-success/45 bg-success/8'
          : isActive
            ? 'border-line bg-surface shadow-[0_1px_2px_rgba(22,24,29,0.06)]'
            : 'border-line/70 bg-surface/50'
      }`}
    >
      <h2 id={headingId} className="m-0">
        <button
          type="button"
          onClick={canEdit ? onEdit : undefined}
          disabled={!canEdit}
          aria-expanded={isActive}
          aria-controls={panelId}
          className={`flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5 ${
            canEdit ? 'cursor-pointer hover:bg-success/12' : 'cursor-default'
          }`}
        >
          <span
            aria-hidden="true"
            className={`money flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              isDone
                ? 'bg-success text-white'
                : isActive
                  ? 'bg-nav text-white'
                  : 'bg-line text-ink-subtle'
            }`}
          >
            {isDone ? <Check size={15} strokeWidth={3} /> : index}
          </span>

          <span className="min-w-0 flex-1">
            <span
              className={`block text-[13px] font-extrabold uppercase tracking-[0.12em] ${
                isDone ? 'text-success' : isActive ? 'text-ink' : 'text-ink-subtle'
              }`}
            >
              {title}
            </span>
            {isDone && summary ? (
              <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{summary}</span>
            ) : null}
            {isActive && caption ? (
              <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{caption}</span>
            ) : null}
          </span>

          {canEdit ? (
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-success">
              <Pencil aria-hidden="true" size={14} />
              <span className="hidden sm:inline">Editar</span>
              <span className="sr-only">Editar {title}</span>
            </span>
          ) : null}
        </button>
      </h2>

      <div
        id={panelId}
        ref={panelRef}
        hidden={!isActive}
        tabIndex={-1}
        className="border-t border-line px-4 py-4 outline-none sm:px-5 sm:py-5"
      >
        {children}
      </div>
    </section>
  );
};
