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
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-bold text-lg flex items-center gap-2 text-[#f87171]">
            <AlertTriangle className="text-[#f87171]" size={20} /> {title}
          </h2>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
              <X size={18} />
            </Button>
          </DialogClose>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-text leading-relaxed">
            {description}{' '}
            <span className="font-black text-text border-b border-danger/30 pb-0.5">{itemName}</span>?
          </p>
          <p className="text-xs text-text-muted">
            Esta ação é irreversível e removerá todos os dados vinculados de forma definitiva.
          </p>

          <div className="flex gap-3 justify-end pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-text-muted font-bold hover:bg-gray-950/40 hover:text-text disabled:opacity-50"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50 bg-danger/10 text-danger hover:bg-danger/25 border border-danger/20"
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
