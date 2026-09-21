// Passo do acordeão do checkout.
//
// Três estados, como nas referências:
//   • `active`  — card branco aberto, com borda e sombra que o destacam dos
//                 outros; badge quadrado escuro com o número;
//   • `done`    — colapsa em card VERDE com ✓, resumo dos dados e lápis para
//                 editar. É o detalhe que mantém o contexto sem ocupar a tela;
//   • `pending` — esmaecido, badge em cinza, cabeçalho não clicável.
//
// O indicador segue o "Stepper with Square Badges" do 21st.dev (badge quadrado,
// número que vira ✓ ao concluir), reescrito sem framer-motion: número e ✓ ficam
// sobrepostos e trocam por opacidade/escala em CSS.
//
// Abrir/fechar anima a ALTURA sem biblioteca, pelo truque do grid
// (`grid-template-rows: 0fr → 1fr`). O painel fechado fica `invisible`, o que o
// tira da ordem de tabulação e da árvore de acessibilidade como o antigo
// `hidden` fazia; a visibilidade só volta a `hidden` no FIM da transição, e vira
// `visible` no início — por isso o foco do passo que abre (CheckoutPage) funciona
// no mesmo render. Com `prefers-reduced-motion` a regra global zera a duração.
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

/** Badge quadrado: número → ✓. Os dois ficam montados para a troca ser suave. */
const StepBadge = ({ index, state }: { index: number; state: StepState }) => {
  const isDone = state === 'done';
  const isActive = state === 'active';

  return (
    <span
      aria-hidden="true"
      className={`money relative flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-[background-color,color,box-shadow] duration-300 ${
        isDone
          ? 'bg-cta text-white shadow-cta'
          : isActive
            ? 'bg-nav text-white shadow-[0_0_0_4px_rgb(23_24_27/0.08)]'
            : 'border border-line bg-app text-ink-subtle'
      }`}
    >
      <span
        className={`absolute transition-[opacity,transform] duration-200 ease-out ${
          isDone ? 'scale-75 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {index}
      </span>
      <Check
        size={16}
        strokeWidth={3}
        className={`absolute transition-[opacity,transform] duration-200 ease-out ${
          isDone ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      />
    </span>
  );
};

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
      className={`overflow-hidden rounded-xl border transition-[border-color,background-color,box-shadow] duration-300 ${
        isDone
          ? 'border-success/40 bg-success/8'
          : isActive
            ? 'border-ink/15 bg-surface shadow-raised'
            : 'border-line/70 bg-surface/60'
      }`}
    >
      <h2 id={headingId} className="m-0">
        <button
          type="button"
          onClick={canEdit ? onEdit : undefined}
          disabled={!canEdit}
          aria-expanded={isActive}
          aria-controls={panelId}
          className={`flex min-h-14 w-full items-center gap-3 px-4 py-3.5 text-left transition-colors sm:px-5 ${
            canEdit ? 'cursor-pointer hover-fine:bg-success/12' : 'cursor-default'
          }`}
        >
          <StepBadge index={index} state={state} />

          <span className="min-w-0 flex-1">
            <span
              className={`block text-[13px] font-extrabold uppercase tracking-[0.12em] ${
                isDone ? 'text-success-ink' : isActive ? 'text-ink' : 'text-ink-subtle'
              }`}
            >
              {title}
            </span>
            {isDone && summary ? (
              <span className="mt-1 block break-words text-xs leading-relaxed text-ink-muted">
                {summary}
              </span>
            ) : null}
            {isActive && caption ? (
              <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{caption}</span>
            ) : null}
          </span>

          {canEdit ? (
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-success-ink">
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
        tabIndex={-1}
        className={`grid outline-none transition-[grid-template-rows,visibility] duration-300 ease-out ${
          isActive ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`border-t border-line px-4 py-4 transition-opacity duration-300 sm:px-5 sm:py-5 ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
};
