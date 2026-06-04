import React from 'react';
import { 
  Dialog, 
  DialogContent, 
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
      <DialogContent 
        showCloseButton={false}
        className="sm:max-w-md max-w-md max-h-[90vh] overflow-y-auto flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Settings className="text-[#38bdf8]" size={20} /> Configurações — {display.name}
          </h2>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
              <X size={18} />
            </Button>
          </DialogClose>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6 flex-1 min-h-0 overflow-y-auto">
          {/* Cover Image Section */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest flex items-center gap-2 pl-0.5">
              <ImageIcon size={12} /> Imagem de Capa
            </h4>
            <div className="rounded-xl overflow-hidden relative" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--color-border)' }}>
              {display.coverImage ? (
                <div className="relative group">
                  <img src={display.coverImage} alt="Capa" className="w-full h-36 object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => { onClose(); onOpenCoverModal(display); }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-white/10"
                    >
                      <ImageIcon size={13} /> Trocar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onRemoveCover(display)}
                      className="px-4 py-2 bg-[#f87171]/10 hover:bg-[#f87171]/20 text-[#f87171] rounded-xl text-xs font-bold flex items-center gap-2 border border-[#f87171]/20"
                    >
                      <X size={13} /> Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-36 flex flex-col items-center justify-center gap-3" style={{ color: 'var(--color-text-muted)' }}>
                  <Monitor size={28} style={{ color: 'rgba(255,255,255,0.15)' }} />
                  <Button
                    variant="outline"
                    onClick={() => { onClose(); onOpenCoverModal(display); }}
                    className="px-4 py-2 bg-[#38bdf8]/5 hover:bg-[#38bdf8]/10 text-[#38bdf8] rounded-xl text-xs font-bold flex items-center gap-2 border border-[#38bdf8]/20"
                  >
                    <ImageIcon size={13} /> Adicionar Capa
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Linked TVs Section */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest flex items-center gap-2 pl-0.5">
              <Tv size={12} /> TVs Vinculadas a este Display
            </h4>
            {linkedDevices.length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-xl" style={{ borderColor: 'var(--color-border)', background: 'rgba(0,0,0,0.15)', color: 'var(--color-text-muted)' }}>
                <Tv size={22} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
                <p className="text-xs font-medium">Nenhuma TV vinculada a este display.</p>
                <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Use o botão "Vincular TV" no painel principal.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {linkedDevices.map(device => {
                  const isOnline = (Date.now() - device.last_seen) < 60000;
                  return (
                    <div key={device.id} className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0`} style={{
                          backgroundColor: isOnline ? '#34d399' : 'rgba(255,255,255,0.25)',
                          boxShadow: isOnline ? '0 0 8px rgba(52,211,153,0.4)' : 'none'
                        }}></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs truncate" style={{ color: 'var(--color-text)' }}>{device.name || 'Sem nome'}</p>
                          <p className="text-[9px] mt-0.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>{isOnline ? 'Online agora' : 'Offline'}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-bold uppercase tracking-wider pl-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          Exibindo Conteúdo de:
                        </label>
                        <Select
                          value={settingsDeviceDisplayMap[device.id] || device.display_id || ''}
                          onValueChange={(val) => onDeviceDisplayChange(device.id, val)}
                        >
                          <SelectTrigger className="w-full h-10 rounded-xl text-xs" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                            <SelectValue placeholder="Selecione um Display..." />
                          </SelectTrigger>
                          <SelectContent className="border-border" style={{ background: '#0e121c', color: 'var(--color-text)' }}>
                            {displays.map(d => (
                              <SelectItem key={d.id} value={d.id} className="focus:bg-[#38bdf8]/15 focus:text-[#38bdf8]">
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
            <h4 className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest flex items-center gap-2 pl-0.5">
              <Pencil size={12} /> Renomear Display
            </h4>
            <Button
              variant="outline"
              onClick={() => { onClose(); onOpenRenameModal(display); }}
              className="w-full flex items-center justify-center gap-2 py-5 rounded-xl text-xs font-bold"
              style={{ background: 'rgba(0,0,0,0.25)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
              <Pencil size={14} /> Renomear Display
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
