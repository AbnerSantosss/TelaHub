import React, { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { ACCENT_PRESETS, applyAccent, getSavedAccentKey } from '../../libs/theme';

/**
 * Seletor da cor de destaque do painel. Só muda o chrome do admin — a cor de
 * conteúdo exibido nas TVs (widgets/Player) não segue este tema.
 */
export const AccentPicker: React.FC = () => {
  const [current, setCurrent] = useState(getSavedAccentKey());

  const handleSelect = (key: string) => {
    applyAccent(key);
    setCurrent(key);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="flex items-center justify-center size-11 lg:size-8 rounded-xl border-white/10 hover:bg-white/5 text-slate-400 hover:text-slate-200"
          title="Cor do painel"
        >
          <Palette size={13} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-500">
          Cor do painel
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ACCENT_PRESETS.map(preset => (
          <DropdownMenuItem
            key={preset.key}
            onClick={() => handleSelect(preset.key)}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <span
              className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0"
              style={{ background: preset.accent }}
            />
            <span className="flex-1 text-xs">{preset.label}</span>
            {current === preset.key && <Check size={12} className="text-slate-400" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
