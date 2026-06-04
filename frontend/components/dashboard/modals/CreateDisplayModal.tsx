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
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md border border-border bg-[#151926]/95 backdrop-blur-md p-0 overflow-hidden shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200">
        <DialogHeader className="p-6 border-b border-border bg-gray-950/20 flex flex-row items-center justify-between">
          <DialogTitle className="font-black text-lg text-text flex items-center gap-2">
            <Plus className="text-accent" size={20} /> Nova Tela
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-8 text-text-muted hover:text-danger rounded-lg">
              <X size={18} />
            </Button>
          </DialogClose>
        </DialogHeader>
        <form onSubmit={onSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">Nome do Dispositivo</label>
            <Input
              autoFocus
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Ex: Recepção, Vitrine..."
              className="w-full bg-gray-950/40 border border-border text-text placeholder:text-text-muted/40 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 h-11 rounded-xl"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">Orientação da Tela</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNewDisplayOrientation('horizontal')}
                className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  newDisplayOrientation === 'horizontal'
                    ? 'border-accent bg-accent/5 shadow-[0_0_16px_rgba(56,189,248,0.1)]'
                    : 'border-border/40 bg-gray-950/30 hover:border-text-muted/50'
                }`}
              >
                <div className={`w-16 h-9 rounded border flex items-center justify-center transition-colors ${
                  newDisplayOrientation === 'horizontal' ? 'border-accent/60 bg-accent/5' : 'border-border bg-gray-900/30'
                }`}>
                  <Monitor size={14} className={newDisplayOrientation === 'horizontal' ? 'text-accent' : 'text-text-muted'} />
                </div>
                <div className="text-center">
                  <p className={`text-xs font-black ${newDisplayOrientation === 'horizontal' ? 'text-accent' : 'text-text-muted'}`}>Horizontal</p>
                  <p className="text-[10px] text-text-muted/60 font-mono mt-0.5">16:9 — TV / Monitor</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNewDisplayOrientation('vertical')}
                className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  newDisplayOrientation === 'vertical'
                    ? 'border-accent bg-accent/5 shadow-[0_0_16px_rgba(56,189,248,0.1)]'
                    : 'border-border/40 bg-gray-950/30 hover:border-text-muted/50'
                }`}
              >
                <div className={`w-9 h-16 rounded border flex items-center justify-center transition-colors ${
                  newDisplayOrientation === 'vertical' ? 'border-accent/60 bg-accent/5' : 'border-border bg-gray-900/30'
                }`}>
                  <Tv size={14} className={newDisplayOrientation === 'vertical' ? 'text-accent' : 'text-text-muted'} />
                </div>
                <div className="text-center">
                  <p className={`text-xs font-black ${newDisplayOrientation === 'vertical' ? 'text-accent' : 'text-text-muted'}`}>Vertical</p>
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
