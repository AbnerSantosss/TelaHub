import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertTriangle, X, Loader2, MonitorPlay } from 'lucide-react';

interface PublishConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  displayName: string;
  screenCount: number;
  loading: boolean;
}

export const PublishConfirmModal: React.FC<PublishConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  displayName,
  screenCount,
  loading,
}) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <DialogTitle className="font-bold text-lg flex items-center gap-2 text-[#f59e0b]">
            <AlertTriangle className="text-[#f59e0b]" size={20} /> Publicar alterações?
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
              <X size={18} />
            </Button>
          </DialogClose>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-text leading-relaxed">
            <span className="font-black text-text">{displayName}</span> já está ao vivo em{' '}
            <span className="font-black text-text">{screenCount} {screenCount === 1 ? 'tela' : 'telas'}</span>.
            Salvar agora vai sobrescrever o conteúdo exibido imediatamente.
          </p>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium">
            <MonitorPlay size={14} className="flex-shrink-0" />
            <span>As telas vinculadas vão atualizar em tempo real assim que você confirmar.</span>
          </div>

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
              onClick={onConfirm}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <MonitorPlay size={16} />}
              <span>Publicar mesmo assim</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
