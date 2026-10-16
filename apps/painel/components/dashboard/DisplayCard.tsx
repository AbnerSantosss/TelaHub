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
import { Button } from '../ui/button';
import { moverSpotlight } from '../../lib/spotlight';

interface DisplayCardProps {
  display: Display;
  devices: Device[];
  copiedId: string | null;
  onNavigateToEdit: (id: string) => void;
  /** Recebe o token público (ou o slug, como reserva) — nunca só o slug. */
  onCopyPlayerLink: (ref: string, id: string) => void;
  onOpenPlayer: (ref: string) => void;
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
      // O levantar no hover é do CSS (.display-card:hover), que respeita
      // prefers-reduced-motion. Aqui ficava um segundo, somado ao primeiro.
      style={{ height: '100%' }}
    >
      {/* fx-spotlight: luz + borda que acendem seguindo o mouse (index.css) */}
      <div className="display-card fx-spotlight" onPointerMove={moverSpotlight}>
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
              <button className="menu-button" type="button" aria-label={`Ações da tela ${display.name}`}>
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={() => onOpenRenameModal(display)} 
                className="flex items-center gap-2 cursor-pointer"
              >
                <Pencil size={14} />
                <span>Renomear</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onOpenCoverModal(display)} 
                className="flex items-center gap-2 cursor-pointer"
              >
                <ImageIcon size={14} />
                <span>Alterar Capa</span>
              </DropdownMenuItem>
              {display.coverImage && (
                <DropdownMenuItem 
                  onClick={() => onRemoveCover(display)} 
                  className="flex items-center gap-2 cursor-pointer text-warn focus:bg-warn-fundo focus:text-warn"
                >
                  <X size={14} />
                  <span>Remover Capa</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-borda" />
              <DropdownMenuItem 
                onClick={(e) => onDeleteDisplay(display.id, e)} 
                className="flex items-center gap-2 cursor-pointer text-danger focus:bg-danger-fundo focus:text-danger"
              >
                <Trash2 size={14} />
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
            aria-label={`Configurações da tela ${display.name}`}
          >
            <Settings size={15} />
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

          {/* h-11 no celular = alvo de toque ≥ 44px; volta a 36px no desktop */}
          <Button
            variant="glow"
            className="display-open mt-auto h-11 w-full gap-2 rounded-md text-sm font-semibold md:h-9"
            onClick={() => onNavigateToEdit(display.id)}
          >
            <Pencil size={15} /> Abrir Designer
          </Button>

          <div className="display-actions">
            <Button
              variant="shimmer"
              data-copied={copiedId === display.id ? 'true' : undefined}
              className="h-11 gap-1.5 rounded-md text-[13px] font-semibold md:h-9"
              onClick={() => onCopyPlayerLink(display.publicToken || display.slug, display.id)}
            >
              {copiedId === display.id ? <Check size={13} /> : <Copy size={13} />}
              {copiedId === display.id ? 'Copiado!' : 'Copiar URL'}
            </Button>

            <Button
              variant="shimmer"
              className="h-11 gap-1.5 rounded-md text-[13px] font-semibold md:h-9"
              onClick={() => onOpenPlayer(display.publicToken || display.slug)}
            >
              <ExternalLink size={13} /> Visualizar
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
