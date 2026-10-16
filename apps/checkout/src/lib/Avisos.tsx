// Mostra os avisos de erro do checkout (estado em `estado-avisos.ts`).
//
// Fica no topo e no centro, como o toast que ele substitui. Fundo sólido e sem
// animação de entrada: o aviso aparece já legível e não depende de
// `prefers-reduced-motion`. `role="alert"` faz o leitor de tela anunciar na hora.
import { AlertCircle, X } from 'lucide-react';

import { fecharAviso, useAvisos } from './estado-avisos';

export const Avisos = () => {
  const avisos = useAvisos();

  if (avisos.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
      {avisos.map((aviso) => (
        <div
          key={aviso.id}
          role="alert"
          className="pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-lg border border-danger bg-surface py-1 pl-3.5 pr-1 shadow-raised"
        >
          <AlertCircle aria-hidden="true" size={16} className="mt-3 shrink-0 text-danger" />
          <p className="min-w-0 flex-1 py-2.5 text-base leading-snug text-ink sm:text-sm">
            {aviso.mensagem}
          </p>
          <button
            type="button"
            onClick={() => fecharAviso(aviso.id)}
            aria-label="Fechar aviso"
            className="flex size-11 shrink-0 items-center justify-center text-ink-muted hover-fine:text-ink"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
