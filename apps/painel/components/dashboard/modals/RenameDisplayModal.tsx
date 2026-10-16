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
        <div className="flex items-center justify-between p-5 border-b border-borda">
          <DialogTitle className="font-bold text-lg flex items-center gap-2 text-tinta">
            <Pencil className="text-marca" size={18} /> Renomear Tela
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-11 md:size-8 rounded-lg text-tinta-3 hover:text-tinta" aria-label="Fechar">
              <X size={18} />
            </Button>
          </DialogClose>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-tinta-2 pl-0.5">Novo Nome da Tela</label>
            <Input
              autoFocus
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Digite o novo nome..."
              className="w-full bg-papel border border-borda-3 text-tinta text-base md:text-sm placeholder:text-tinta-3 focus-visible:border-marca focus-visible:ring-3 focus-visible:ring-ring/30 h-11 rounded-xl"
              required
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-11 md:h-10 px-5 rounded-lg text-tinta-2 font-semibold hover:bg-papel-3 hover:text-tinta"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={!renameValue.trim() || renameValue.trim() === displayToRename.name}
              className="h-11 md:h-10 px-6 rounded-lg font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Check size={16} /> Salvar Nome
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
