/**
 * Cor de destaque (accent) configurável do painel.
 *
 * O chrome do admin usa as variáveis `--th-accent*` (ver index.css). Trocar de
 * preset é só reescrever essas variáveis no <html> — nenhum componente precisa
 * re-renderizar. A escolha persiste em localStorage e é reaplicada no boot
 * (index.tsx), antes do primeiro paint do React.
 *
 * Cada preset carrega três tons (base/soft/strong = 500/400/600 do Tailwind) e
 * o triplet HSL usado pelos tokens do shadcn (--primary, --ring, --accent),
 * para que foco, botões e anéis sigam a mesma cor.
 */

export interface AccentPreset {
  key: string;
  label: string;
  accent: string;
  soft: string;
  strong: string;
  /** triplet HSL "h s% l%" do tom base, para os tokens shadcn */
  hsl: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { key: 'sky',     label: 'Céu (padrão)', accent: '#0ea5e9', soft: '#38bdf8', strong: '#0284c7', hsl: '198.6 92.8% 48.4%' },
  { key: 'blue',    label: 'Azul',         accent: '#3b82f6', soft: '#60a5fa', strong: '#2563eb', hsl: '217.2 91.2% 59.8%' },
  { key: 'violet',  label: 'Violeta',      accent: '#8b5cf6', soft: '#a78bfa', strong: '#7c3aed', hsl: '258.3 89.5% 66.3%' },
  { key: 'emerald', label: 'Esmeralda',    accent: '#10b981', soft: '#34d399', strong: '#059669', hsl: '160.1 84.1% 39.4%' },
  { key: 'amber',   label: 'Âmbar',        accent: '#f59e0b', soft: '#fbbf24', strong: '#d97706', hsl: '37.7 92.1% 50.2%' },
  { key: 'rose',    label: 'Rosa',         accent: '#f43f5e', soft: '#fb7185', strong: '#e11d48', hsl: '349.7 89.2% 60.2%' },
];

const STORAGE_KEY = 'telahub-accent';
const DEFAULT_KEY = 'sky';

const hexToRgbTriplet = (hex: string): string => {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};

export const getSavedAccentKey = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_KEY;
  } catch {
    return DEFAULT_KEY;
  }
};

export const applyAccent = (key: string): void => {
  const preset = ACCENT_PRESETS.find(p => p.key === key) || ACCENT_PRESETS[0];
  const style = document.documentElement.style;

  style.setProperty('--th-accent', preset.accent);
  style.setProperty('--th-accent-soft', preset.soft);
  style.setProperty('--th-accent-strong', preset.strong);
  style.setProperty('--th-accent-rgb', hexToRgbTriplet(preset.accent));
  style.setProperty('--th-accent-soft-rgb', hexToRgbTriplet(preset.soft));
  style.setProperty('--th-accent-strong-rgb', hexToRgbTriplet(preset.strong));

  style.setProperty('--primary', preset.hsl);
  style.setProperty('--ring', preset.hsl);
  style.setProperty('--accent', preset.hsl);
  style.setProperty('--brand-accent', preset.accent);

  try {
    localStorage.setItem(STORAGE_KEY, preset.key);
  } catch {
    /* modo privado/sem storage: o tema vale só para a sessão */
  }
};

/** Reaplica no boot o preset salvo. Chamar antes do render (index.tsx). */
export const initAccent = (): void => {
  const key = getSavedAccentKey();
  if (key !== DEFAULT_KEY) applyAccent(key);
};
