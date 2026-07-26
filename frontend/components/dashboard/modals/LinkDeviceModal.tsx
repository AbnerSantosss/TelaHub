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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../ui/select';
import { Tv, X, Link as LinkIcon, Loader2, Copy, ExternalLink } from 'lucide-react';
import { Display } from '../../../types';

interface LinkDeviceModalProps {
  open: boolean;
  onClose: () => void;
  displays: Display[];
  linkCode: string;
  setLinkCode: (value: string) => void;
  linkName: string;
  setLinkName: (value: string) => void;
  selectedDisplayId: string;
  setSelectedDisplayId: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}

export const LinkDeviceModal: React.FC<LinkDeviceModalProps> = ({
  open,
  onClose,
  displays,
  linkCode,
  setLinkCode,
  linkName,
  setLinkName,
  selectedDisplayId,
  setSelectedDisplayId,
  onSubmit,
  loading,
}) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <DialogTitle className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Tv className="text-[#38bdf8]" size={20} /> Vincular Nova TV / Player
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
              <X size={18} />
            </Button>
          </DialogClose>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">
              Código de Pareamento (6 dígitos)
            </label>
            <Input
              type="text"
              maxLength={6}
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
              placeholder="Ex: AB12CD"
              className="w-full text-center text-xl font-bold tracking-widest bg-gray-950/40 border border-border text-accent focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 h-12 rounded-xl placeholder:text-text-muted/30"
              required
            />
            <p className="text-[10px] text-text-muted pl-0.5">
              Insira o código exibido na tela da TV ao abrir o Player.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">
              Nome do Dispositivo
            </label>
            <Input
              type="text"
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
              placeholder="Ex: TV Copa, Totem Entrada..."
              className="w-full bg-gray-950/40 border border-border text-text placeholder:text-text-muted/40 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 h-11 rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">
              Tela Associada (Conteúdo Inicial)
            </label>
            <Select value={selectedDisplayId} onValueChange={setSelectedDisplayId}>
              <SelectTrigger className="w-full bg-gray-950/40 border border-border text-text h-11 rounded-xl focus:ring-accent/40">
                <SelectValue placeholder="Selecione uma Tela..." />
              </SelectTrigger>
              <SelectContent className="bg-[#151926] border-border text-text">
                {displays.map(display => (
                  <SelectItem key={display.id} value={display.id} className="focus:bg-accent/15 focus:text-accent">
                    {display.name} ({display.orientation === 'vertical' ? 'Vertical 9:16' : 'Horizontal 16:9'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-2 p-3 rounded-xl bg-accent/5 border border-accent/10 space-y-2">
            <label className="block text-xs font-black text-accent uppercase tracking-wider">
              Link do Player
            </label>
            <p className="text-[10px] text-text-muted">
              Acesse este link no navegador da TV ou dispositivo para abrir o player e gerar o código de pareamento:
            </p>
            <div className="flex gap-2 items-center">
              <Input
                readOnly
                value={`${window.location.origin}${window.location.pathname}#/player`}
                className="w-full text-xs bg-gray-950/60 border border-border text-text h-9 rounded-lg"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/player`);
                }}
                className="h-9 px-3 border border-border rounded-lg text-text-muted hover:text-text shrink-0 flex items-center gap-1"
                title="Copiar link"
              >
                <Copy size={14} />
                <span className="hidden sm:inline">Copiar</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open('#/player', '_blank')}
                className="h-9 px-3 border border-accent/20 bg-accent/10 rounded-lg text-accent hover:bg-accent/20 shrink-0 flex items-center gap-1"
                title="Abrir em nova aba"
              >
                <ExternalLink size={14} />
                <span className="hidden sm:inline">Abrir</span>
              </Button>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-3">
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
              disabled={loading || !linkCode || !linkName || !selectedDisplayId}
              className="px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LinkIcon size={16} />
              )}
              <span>Vincular Dispositivo</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
