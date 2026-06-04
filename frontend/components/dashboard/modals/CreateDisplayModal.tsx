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
import { Plus, Monitor, Tv, X, Zap } from 'lucide-react';

interface CreateDisplayModalProps {
  open: boolean;
  onClose: () => void;
  newDisplayName: string;
  setNewDisplayName: (value: string) => void;
  newDisplayOrientation: 'horizontal' | 'vertical';
  setNewDisplayOrientation: (value: 'horizontal' | 'vertical') => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const CreateDisplayModal: React.FC<CreateDisplayModalProps> = ({
  open,
  onClose,
  newDisplayName,
  setNewDisplayName,
  newDisplayOrientation,
  setNewDisplayOrientation,
  onSubmit,
}) => {
  const [showError, setShowError] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisplayName.trim()) {
      setShowError(true);
      return;
    }
    setShowError(false);
    onSubmit(e);
  };

  React.useEffect(() => {
    if (newDisplayName.trim()) {
      setShowError(false);
    }
  }, [newDisplayName]);

  React.useEffect(() => {
    if (!open) {
      setShowError(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Plus className="text-[#38bdf8]" size={20} /> Nova Tela
          </h2>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
              <X size={18} />
            </Button>
          </DialogClose>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2 relative">
            <label className="block text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">Nome do Dispositivo</label>
            <Input
              autoFocus
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Ex: Recepção, Vitrine..."
              className={`w-full bg-gray-950/40 border text-text placeholder:text-text-muted/40 focus-visible:ring-2 h-11 rounded-xl transition-all ${
                showError 
                  ? 'border-danger/80 focus-visible:ring-danger/40' 
                  : 'border-border focus-visible:border-accent focus-visible:ring-accent/40'
              }`}
            />
            {showError && (
              <div className="absolute -top-1.5 right-0 bg-danger text-white text-[11px] font-bold px-3 py-1 rounded-md shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                <span>Por favor, insira o nome da tela</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">Orientação da Tela</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNewDisplayOrientation('horizontal')}
                className={`orientation-btn ${newDisplayOrientation === 'horizontal' ? 'active' : ''}`}
              >
                <div className="w-16 h-9 rounded orientation-preview-box">
                  <Monitor size={14} className={newDisplayOrientation === 'horizontal' ? 'text-accent' : 'text-text-muted'} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-wider">Horizontal</p>
                  <p className="text-[10px] text-text-muted/60 font-mono mt-0.5">16:9 — TV / Monitor</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNewDisplayOrientation('vertical')}
                className={`orientation-btn ${newDisplayOrientation === 'vertical' ? 'active' : ''}`}
              >
                <div className="w-9 h-16 rounded orientation-preview-box">
                  <Tv size={14} className={newDisplayOrientation === 'vertical' ? 'text-accent' : 'text-text-muted'} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-wider">Vertical</p>
                  <p className="text-[10px] text-text-muted/60 font-mono mt-0.5">9:16 — Totem / Kiosk</p>
                </div>
              </button>
            </div>
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
              className="px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2"
            >
              <Zap size={16} className="fill-white text-white" /> Criar Tela
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
