import React from 'react';
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
  Smartphone, 
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

  const isVertical = display.orientation === 'vertical';

  return (
    <motion.div
      variants={cardItem}
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      style={{ height: '100%' }}
    >
      <div className="display-card">
        {/* PREVIEW — altura fixa 190px */}
        <div className="display-preview">
          {/* Status Badge */}
          <div className={`status-badge ${isDisplayOnline ? 'online' : 'offline'}`}>
            <span className={`status-dot ${isDisplayOnline ? 'animate-pulse-dot' : ''}`} />
            {isDisplayOnline ? 'ONLINE' : 'OFFLINE'}
          </div>

          {/* Menu Button (⋮) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="menu-button" type="button">
                <MoreVertical size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 border-border bg-[#0e121c]/95 backdrop-blur-md">
              <DropdownMenuItem 
                onClick={() => onOpenRenameModal(display)} 
                className="flex items-center gap-2 cursor-pointer focus:bg-accent/15 focus:text-accent"
              >
                <Pencil size={12} />
                <span>Renomear</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onOpenCoverModal(display)} 
                className="flex items-center gap-2 cursor-pointer focus:bg-accent/15 focus:text-accent"
              >
                <ImageIcon size={12} />
                <span>Alterar Capa</span>
              </DropdownMenuItem>
              {display.coverImage && (
                <DropdownMenuItem 
                  onClick={() => onRemoveCover(display)} 
                  className="flex items-center gap-2 cursor-pointer text-warning focus:bg-warning/15 focus:text-warning"
                >
                  <X size={12} />
                  <span>Remover Capa</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem 
                onClick={(e) => onDeleteDisplay(display.id, e)} 
                className="flex items-center gap-2 cursor-pointer text-danger focus:bg-danger/15 focus:text-danger"
              >
                <Trash2 size={12} />
                <span>Excluir Tela</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Gear settings button */}
          <button
            className="gear-button"
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenDisplaySettings(display); }}
            title="Configurações do Display"
          >
            <Settings size={13} />
          </button>

          {/* TV Frame — moldura de TV centralizada */}
          <div className={`tv-frame ${isVertical ? 'vertical' : ''}`}>
            {display.coverImage ? (
              <img src={display.coverImage} alt={display.name} />
            ) : (
              isVertical 
                ? <Smartphone size={28} /> 
                : <Monitor size={36} />
            )}
          </div>
        </div>

        {/* BODY — flex:1 alinha todos os cards na mesma altura */}
        <div className="display-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <h3 className="display-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {display.name}
            </h3>
            <span className="orientation-badge">
              {isVertical ? '9:16' : '16:9'}
            </span>
          </div>

          <span className="display-code">ID: {display.slug}</span>

          <button className="btn-open" onClick={() => onNavigateToEdit(display.id)}>
            <Pencil size={15} /> Abrir Designer
          </button>

          <div className="display-actions">
            <button 
              className={`btn-sub ${copiedId === display.id ? 'copied' : ''}`}
              onClick={() => onCopyPlayerLink(display.slug, display.id)}
            >
              {copiedId === display.id ? <Check size={13} /> : <Copy size={13} />}
              {copiedId === display.id ? 'Copiado!' : 'Copiar URL'}
            </button>

            <button 
              className="btn-sub"
              onClick={() => onOpenPlayer(display.slug)}
            >
              <ExternalLink size={13} /> Visualizar
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
