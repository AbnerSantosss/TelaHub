import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Focus trap + fechar com Esc para modais que não usam o Dialog (Radix) do design
// system — este já tem esse comportamento embutido, então só é necessário para
// os modais "brutos" (divs fixas customizadas).
export function useModalA11y(active: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const getFocusable = (): HTMLElement[] => {
      const items: HTMLElement[] = [];
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR).forEach((el) => items.push(el));
      return items;
    };

    const previouslyFocused = document.activeElement as HTMLElement | null;
    getFocusable()[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [active, onClose]);

  return containerRef;
}
