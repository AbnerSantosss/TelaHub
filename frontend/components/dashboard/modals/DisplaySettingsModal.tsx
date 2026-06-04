import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogClose 
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../ui/select';
import { 
  Settings, 
  X, 
  Image as ImageIcon, 
  Monitor, 
  Tv, 
  Pencil 
} from 'lucide-react';
import { Display, Device } from '../../../types';

interface DisplaySettingsModalProps {
  open: boolean;
  onClose: () => void;
  display: Display | null;
  devices: Device[];
  displays: Display[];
  settingsDeviceDisplayMap: Record<string, string>;
  onDeviceDisplayChange: (deviceId: string, newDisplayId: string) => void;
  onRemoveCover: (display: Display) => void;
  onOpenCoverModal: (display: Display) => void;
  onOpenRenameModal: (display: Display) => void;
}

export const DisplaySettingsModal: React.FC<DisplaySettingsModalProps> = ({
  open,
  onClose,
  display,
  devices,
  displays,
  settingsDeviceDisplayMap,
  onDeviceDisplayChange,
  onRemoveCover,
  onOpenCoverModal,
  onOpenRenameModal,
}) => {
  if (!display) return null;

  const linkedDevices = devices.filter(
    d => d.status === 'linked' && d.display_id === display.id
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md border border-border bg-[#151926]/95 backdrop-blur-md p-0 overflow-hidden shadow-2xl rounded-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <DialogHeader className="p-6 border-b border-border bg-gray-950/20 flex flex-row items-center justify-between">
          <DialogTitle className="font-black text-lg text-text flex items-center gap-2">
            <Settings className="text-accent" size={20} /> Configurações — {display.name}
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-8 text-text-muted hover:text-danger rounded-lg">
              <X size={18} />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Cover Image Section */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-2 pl-0.5">
              <ImageIcon size={12} /> Imagem de Capa
            </h4>
            <div className="bg-gray-950/40 border border-border rounded-xl overflow-hidden relative">
              {display.coverImage ? (
                <div className="relative group">
                  <img src={display.coverImage} alt="Capa" className="w-full h-36 object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => { onClose(); onOpenCoverModal(display); }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-white/10"
                    >
                      <ImageIcon size={13} /> Trocar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onRemoveCover(display)}
                      className="px-4 py-2 bg-danger/10 hover:bg-danger/20 text-danger rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-danger/20"
                    >
                      <X size={13} /> Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-36 flex flex-col items-center justify-center gap-3 text-text-muted">
                  <Monitor size={28} className="text-text-muted/30" />
                  <Button
                    variant="outline"
                    onClick={() => { onClose(); onOpenCoverModal(display); }}
                    className="px-4 py-2 bg-accent/5 hover:bg-accent/10 text-accent rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-accent/20"
                  >
                    <ImageIcon size={13} /> Adicionar Capa
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Linked TVs Section */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-2 pl-0.5">
              <Tv size={12} /> TVs Vinculadas a este Display
            </h4>
            {linkedDevices.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-border rounded-xl text-text-muted bg-gray-950/20">
                <Tv size={22} className="mx-auto mb-2 text-text-muted/30" />
                <p className="text-xs font-medium">Nenhuma TV vinculada a este display.</p>
                <p className="text-[10px] text-text-muted/50 mt-1">Use o botão "Vincular TV" no painel principal.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {linkedDevices.map(device => {
                  const isOnline = (Date.now() - device.last_seen) < 60000;
                  return (
                    <div key={device.id} className="bg-gray-950/40 border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isOnline ? 'bg-success shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'bg-text-muted/50'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-text truncate">{device.name || 'Sem nome'}</p>
                          <p className="text-[9px] text-text-muted mt-0.5 font-medium">{isOnline ? 'Online agora' : 'Offline'}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black text-text-muted uppercase tracking-wider pl-0.5">
                          Exibindo Conteúdo de:
                        </label>
                        <Select
                          value={settingsDeviceDisplayMap[device.id] || device.display_id || ''}
                          onValueChange={(val) => onDeviceDisplayChange(device.id, val)}
                        >
                          <SelectTrigger className="w-full bg-gray-950/50 border border-border text-text h-10 rounded-xl text-xs">
                            <SelectValue placeholder="Selecione um Display..." />
                          </SelectTrigger>
                          <SelectContent className="bg-[#151926] border-border text-text">
                            {displays.map(d => (
                              <SelectItem key={d.id} value={d.id} className="focus:bg-accent/15 focus:text-accent">
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rename Section */}
          <div className="space-y-3 pt-2">
            <h4 className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-2 pl-0.5">
              <Pencil size={12} /> Renomear Display
            </h4>
            <Button
              variant="outline"
              onClick={() => { onClose(); onOpenRenameModal(display); }}
              className="w-full flex items-center justify-center gap-2 py-5 bg-gray-950/40 text-text border border-border hover:border-accent/40 rounded-xl text-xs font-bold transition-all"
            >
              <Pencil size={14} /> Renomear Display
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
