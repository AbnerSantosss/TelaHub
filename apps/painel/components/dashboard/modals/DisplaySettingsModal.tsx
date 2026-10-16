import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle
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
        <div className="flex items-center justify-between p-5 border-b border-borda">
          <DialogTitle className="font-bold text-lg flex items-center gap-2 text-tinta">
            <Settings className="text-marca" size={20} /> Configurações de {display.name}
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-11 md:size-8 rounded-lg text-tinta-3 hover:text-tinta" aria-label="Fechar">
              <X size={18} />
            </Button>
          </DialogClose>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6 flex-1 min-h-0 overflow-y-auto">
          {/* Cover Image Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-tinta flex items-center gap-2 pl-0.5">
              <ImageIcon size={14} className="text-tinta-3" aria-hidden="true" /> Imagem de Capa
            </h4>
            <div className="rounded-xl overflow-hidden relative bg-papel-2 border border-borda">
              {display.coverImage ? (
                <div className="relative group">
                  <img src={display.coverImage} alt="Capa" className="w-full h-36 object-cover" />
                  <div className="absolute inset-0 bg-[var(--veu)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity motion-reduce:transition-none flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => { onClose(); onOpenCoverModal(display); }}
                      className="h-11 md:h-10 px-4 rounded-lg text-sm font-semibold flex items-center gap-2"
                    >
                      <ImageIcon size={13} /> Trocar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onRemoveCover(display)}
                      className="h-11 md:h-10 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 bg-papel text-danger border-borda-2 hover:bg-danger-fundo hover:text-danger hover:border-danger"
                    >
                      <X size={13} /> Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-36 flex flex-col items-center justify-center gap-3 text-tinta-3">
                  <Monitor size={28} className="text-tinta-3" aria-hidden="true" />
                  <Button
                    variant="outline"
                    onClick={() => { onClose(); onOpenCoverModal(display); }}
                    className="h-11 md:h-10 px-4 rounded-lg text-sm font-semibold flex items-center gap-2"
                  >
                    <ImageIcon size={13} /> Adicionar Capa
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Linked TVs Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-tinta flex items-center gap-2 pl-0.5">
              <Tv size={14} className="text-tinta-3" aria-hidden="true" /> TVs Vinculadas a este Display
            </h4>
            {linkedDevices.length === 0 ? (
              <div className="text-center py-6 px-4 border border-dashed border-borda-2 rounded-xl bg-papel-2 text-tinta-2">
                <Tv size={22} className="mx-auto mb-2 text-tinta-3" aria-hidden="true" />
                <p className="text-sm font-medium">Nenhuma TV vinculada a este display.</p>
                <p className="text-[13px] mt-1 text-tinta-3">Use o botão "Vincular TV" no painel principal.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {linkedDevices.map(device => {
                  const isOnline = (Date.now() - device.last_seen) < 60000;
                  return (
                    <div key={device.id} className="p-4 rounded-xl space-y-3 bg-papel-2 border border-borda">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className={`size-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-ok' : 'border-2 border-borda-3'}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate text-tinta">{device.name || 'Sem nome'}</p>
                          <p className={`text-[13px] mt-0.5 font-medium ${isOnline ? 'text-ok' : 'text-tinta-3'}`}>{isOnline ? 'Online agora' : 'Offline'}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold pl-0.5 text-tinta-2">
                          Exibindo Conteúdo de:
                        </label>
                        <Select
                          value={settingsDeviceDisplayMap[device.id] || device.display_id || ''}
                          onValueChange={(val) => onDeviceDisplayChange(device.id, val)}
                        >
                          <SelectTrigger className="w-full h-11 md:h-10 rounded-xl text-base md:text-sm">
                            <SelectValue placeholder="Selecione um Display..." />
                          </SelectTrigger>
                          <SelectContent>
                            {displays.map(d => (
                              <SelectItem key={d.id} value={d.id}>
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
            <h4 className="text-sm font-semibold text-tinta flex items-center gap-2 pl-0.5">
              <Pencil size={14} className="text-tinta-3" aria-hidden="true" /> Renomear Display
            </h4>
            <Button
              variant="outline"
              onClick={() => { onClose(); onOpenRenameModal(display); }}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold"
            >
              <Pencil size={14} /> Renomear Display
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
