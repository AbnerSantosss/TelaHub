import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { 
  MoreVertical, 
  Pencil, 
  Image as ImageIcon, 
  X, 
  Trash2, 
  Settings, 
  Monitor, 
  Tv, 
  Edit3, 
  Check, 
  Copy, 
  ExternalLink 
} from 'lucide-react';
import { Display, Device } from '../../types';
import { motion } from 'motion/react';
import { cardItem } from '../../libs/motion';

interface DisplayCardProps {
  display: Display;
  devices: Device[];
  copiedId: string | null;
  onNavigateToEdit: (id: string) => void;
  onCopyPlayerLink: (slug: string, id: string) => void;
  onOpenPlayer: (slug: string) => void;
  onOpenRenameModal: (display: Display) => void;
  onOpenCoverModal: (display: Display) => void;
  onRemoveCover: (display: Display) => void;
  onDeleteDisplay: (id: string, e: React.MouseEvent) => void;
  onOpenDisplaySettings: (display: Display) => void;
}

export const DisplayCard: React.FC<DisplayCardProps> = ({
  display,
  devices,
  copiedId,
  onNavigateToEdit,
  onCopyPlayerLink,
  onOpenPlayer,
  onOpenRenameModal,
  onOpenCoverModal,
  onRemoveCover,
  onDeleteDisplay,
  onOpenDisplaySettings,
}) => {
  const isDisplayOnline = devices
    .filter(d => d.display_id === display.id)
    .some(d => (Date.now() - d.last_seen) < 60000);

  return (
    <motion.div
      variants={cardItem}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <Card className={`overflow-hidden border bg-surface/30 backdrop-blur-md shadow-soft hover:shadow-lift transition-all duration-300 group relative ${
        isDisplayOnline ? 'border-success/20 hover:border-success/40' : 'border-border hover:border-border-hover'
      }`}>
        <div className="absolute inset-0 bg-accent/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Action Button Trigger Menu (top-right) */}
        <div className="absolute top-3 right-3 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-8 bg-gray-950/80 rounded-full text-text-muted hover:text-text border border-border hover:border-white/20 shadow-md backdrop-blur-sm transition-all"
              >
                <MoreVertical size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 border-border bg-[#151926]/95 backdrop-blur-md">
              <DropdownMenuItem 
                onClick={() => onOpenRenameModal(display)} 
                className="flex items-center gap-2 cursor-pointer focus:bg-accent/15 focus:text-accent"
              >
                <Pencil size={13} />
                <span>Renomear</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onOpenCoverModal(display)} 
                className="flex items-center gap-2 cursor-pointer focus:bg-fuchsia-500/15 focus:text-fuchsia-400"
              >
                <ImageIcon size={13} />
                <span>Alterar Capa</span>
              </DropdownMenuItem>
              {display.coverImage && (
                <DropdownMenuItem 
                  onClick={() => onRemoveCover(display)} 
                  className="flex items-center gap-2 cursor-pointer text-warning focus:bg-warning/15 focus:text-warning"
                >
                  <X size={13} />
                  <span>Remover Capa</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem 
                onClick={(e) => onDeleteDisplay(display.id, e)} 
                className="flex items-center gap-2 cursor-pointer text-danger focus:bg-danger/15 focus:text-danger"
              >
                <Trash2 size={13} />
                <span>Excluir Tela</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Cover / Thumbnail area */}
        <div className="h-40 bg-gray-950/60 flex items-center justify-center border-b border-border relative overflow-hidden">
          {display.coverImage ? (
            <img 
              src={display.coverImage} 
              alt={display.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              {display.orientation === 'vertical' ? (
                <div className="w-[80px] h-[124px] rounded-xl border-2 border-border/40 bg-gray-950/80 group-hover:border-accent/40 group-hover:shadow-[0_0_12px_rgba(56,189,248,0.1)] transition-all flex flex-col items-center justify-between p-2">
                  <div className="w-8 h-1 bg-border rounded-full group-hover:bg-accent/20 transition-all"></div>
                  <div className="flex-1 w-full my-1.5 rounded-lg bg-surface border border-border/20 flex items-center justify-center group-hover:bg-accent/5 transition-all">
                    <Tv size={26} className="text-text-muted group-hover:text-accent transition-all" />
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-border group-hover:bg-accent/30 transition-all"></div>
                </div>
              ) : (
                <div className="w-[124px] h-[80px] rounded-xl border-2 border-border/40 bg-gray-950/80 group-hover:border-accent/40 group-hover:shadow-[0_0_12px_rgba(56,189,248,0.1)] transition-all flex flex-col items-center justify-between p-2">
                  <div className="flex-1 w-full mb-1.5 rounded-lg bg-surface border border-border/20 flex items-center justify-center group-hover:bg-accent/5 transition-all">
                    <Monitor size={30} className="text-text-muted group-hover:text-accent transition-all" />
                  </div>
                  <div className="w-10 h-1 bg-border rounded-full group-hover:bg-accent/30 transition-all"></div>
                </div>
              )}
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-4 left-4 flex gap-2">
            {isDisplayOnline ? (
              <div className="border border-success/20 text-success text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-success/5 backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-success dot-pulse"></div> ONLINE
              </div>
            ) : (
              <div className="border border-danger/20 text-danger text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-danger/5 backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-danger dot-pulse"></div> OFFLINE
              </div>
            )}
          </div>

          {/* Gear settings icon (bottom-left, visible on hover) */}
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onOpenDisplaySettings(display); }}
            className="absolute bottom-3 left-3 z-20 size-8 bg-gray-950/80 rounded-full text-text-muted hover:text-accent border border-border hover:border-accent/40 shadow-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
            title="Configurações do Display"
          >
            <Settings size={14} />
          </Button>
        </div>

        {/* Description & actions */}
        <CardContent className="p-6 relative">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-lg font-black text-text tracking-tight group-hover:text-accent transition-colors truncate">
              {display.name}
            </h3>
            {display.orientation === 'vertical' ? (
              <span className="flex items-center gap-1 bg-accent/10 border border-accent/20 text-accent text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5">
                <Tv size={10} /> 9:16
              </span>
            ) : (
              <span className="flex items-center gap-1 bg-accent/10 border border-accent/20 text-accent text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5">
                <Monitor size={10} /> 16:9
              </span>
            )}
          </div>
          <p className="text-[9px] text-text-muted mb-5 font-mono truncate uppercase tracking-wider">
            ID: {display.slug}
          </p>

          <div className="flex flex-col gap-2.5">
            <Button
              variant="brand"
              onClick={() => onNavigateToEdit(display.id)}
              className="w-full flex items-center justify-center gap-2 py-5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              <Edit3 size={14} /> Abrir Designer
            </Button>
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                onClick={() => onCopyPlayerLink(display.slug, display.id)}
                className={`flex items-center justify-center gap-1.5 py-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                  copiedId === display.id
                    ? 'bg-success/10 text-success border-success/30 hover:bg-success/20'
                    : 'bg-gray-950/40 text-text-muted border-border hover:border-white/20 hover:text-text'
                }`}
              >
                {copiedId === display.id ? <Check size={12} /> : <Copy size={12} />}
                {copiedId === display.id ? 'Copiado!' : 'Copiar URL'}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenPlayer(display.slug)}
                className="flex items-center justify-center gap-1.5 py-4 bg-gray-950/40 text-text-muted border-border hover:border-white/20 hover:text-text rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              >
                <ExternalLink size={12} /> Visualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
