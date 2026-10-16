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
        <div className="flex items-center justify-between p-5 border-b border-borda">
          <DialogTitle className="font-bold text-lg flex items-center gap-2 text-tinta">
            <Plus className="text-marca" size={20} /> Nova Tela
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-11 md:size-8 rounded-lg text-tinta-3 hover:text-tinta" aria-label="Fechar">
              <X size={18} />
            </Button>
          </DialogClose>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2 relative">
            <label className="block text-sm font-semibold text-tinta-2 pl-0.5">Nome do Dispositivo</label>
            <Input
              autoFocus
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Ex: Recepção, Vitrine..."
              className={`w-full bg-papel border text-tinta text-base md:text-sm placeholder:text-tinta-3 focus-visible:ring-3 h-11 rounded-xl transition-colors ${
                showError 
                  ? 'border-danger focus-visible:ring-danger/30' 
                  : 'border-borda-3 focus-visible:border-marca focus-visible:ring-ring/30'
              }`}
            />
            {showError && (
              <div className="absolute -top-1.5 right-0 bg-danger text-papel text-[13px] font-semibold px-3 py-1 rounded-md shadow-flutuante flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <span className="w-1.5 h-1.5 rounded-full bg-papel" aria-hidden="true"></span>
                <span>Por favor, insira o nome da tela</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-tinta-2 pl-0.5">Orientação da Tela</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNewDisplayOrientation('horizontal')}
                className={`orientation-btn ${newDisplayOrientation === 'horizontal' ? 'active' : ''}`}
              >
                <div className="w-16 h-9 rounded orientation-preview-box">
                  <Monitor size={14} className={newDisplayOrientation === 'horizontal' ? 'text-marca' : 'text-tinta-3'} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">Horizontal</p>
                  <p className="text-[13px] text-tinta-3 mt-0.5">16:9 (TV ou monitor)</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNewDisplayOrientation('vertical')}
                className={`orientation-btn ${newDisplayOrientation === 'vertical' ? 'active' : ''}`}
              >
                <div className="w-9 h-16 rounded orientation-preview-box">
                  <Tv size={14} className={newDisplayOrientation === 'vertical' ? 'text-marca' : 'text-tinta-3'} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">Vertical</p>
                  <p className="text-[13px] text-tinta-3 mt-0.5">9:16 (totem)</p>
                </div>
              </button>
            </div>
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
              className="h-11 md:h-10 px-6 rounded-lg font-semibold transition-all flex items-center gap-2"
            >
              <Zap size={16} className="fill-current" aria-hidden="true" /> Criar Tela
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
