import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogClose 
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Pencil, X, Check } from 'lucide-react';
import { Display } from '../../../types';

interface RenameDisplayModalProps {
  open: boolean;
  onClose: () => void;
  displayToRename: Display | null;
  renameValue: string;
  setRenameValue: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const RenameDisplayModal: React.FC<RenameDisplayModalProps> = ({
  open,
  onClose,
  displayToRename,
  renameValue,
  setRenameValue,
  onSubmit,
}) => {
  if (!displayToRename) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <DialogTitle className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Pencil className="text-[#38bdf8]" size={18} /> Renomear Tela
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
              <X size={18} />
            </Button>
          </DialogClose>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">Novo Nome da Tela</label>
            <Input
              autoFocus
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Digite o novo nome..."
              className="w-full bg-gray-950/40 border border-border text-text placeholder:text-text-muted/40 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 h-11 rounded-xl"
              required
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-text-muted font-bold hover:bg-gray-950/40 hover:text-text"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={!renameValue.trim() || renameValue.trim() === displayToRename.name}
              className="px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Check size={16} /> Salvar Nome
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
