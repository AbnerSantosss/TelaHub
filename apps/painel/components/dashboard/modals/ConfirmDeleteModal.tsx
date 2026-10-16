import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogClose 
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  itemName: string;
  onConfirm: () => void;
  loading: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  open,
  onClose,
  title,
  description,
  itemName,
  onConfirm,
  loading,
}) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-borda">
          <DialogTitle className="font-bold text-lg flex items-center gap-2 text-danger">
            <AlertTriangle className="text-danger" size={20} /> {title}
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-11 md:size-8 rounded-lg text-tinta-3 hover:text-tinta" aria-label="Fechar">
              <X size={18} />
            </Button>
          </DialogClose>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-base md:text-[15px] text-tinta leading-relaxed">
            {description}{' '}
            <span className="font-bold text-tinta">{itemName}</span>?
          </p>
          <p className="text-sm text-tinta-2">
            Não dá para desfazer. Os dados ligados a ela também serão apagados.
          </p>

          <div className="flex gap-3 justify-end pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="h-11 md:h-10 px-5 rounded-lg text-tinta-2 font-semibold hover:bg-papel-3 hover:text-tinta disabled:opacity-50"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
              disabled={loading}
              className="h-11 md:h-10 px-6 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <AlertTriangle size={16} />
              )}
              <span>Confirmar Exclusão</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
