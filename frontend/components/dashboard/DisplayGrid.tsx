import React from 'react';
import { Display, Device } from '../../types';
import { DisplayCard } from './DisplayCard';
import { motion } from 'motion/react';
import { staggerGrid, cardItem } from '../../libs/motion';
import { Monitor, Plus } from 'lucide-react';
import { Button } from '../ui/button';

interface DisplayGridProps {
  displays: Display[];
  devices: Device[];
  loading: boolean;
  copiedId: string | null;
  onNavigateToEdit: (id: string) => void;
  onCopyPlayerLink: (slug: string, id: string) => void;
  onOpenPlayer: (slug: string) => void;
  onOpenRenameModal: (display: Display) => void;
  onOpenCoverModal: (display: Display) => void;
  onRemoveCover: (display: Display) => void;
  onDeleteDisplay: (id: string, e: React.MouseEvent) => void;
  onOpenDisplaySettings: (display: Display) => void;
  onCreateFirstDisplay: () => void;
  displaysParentRef?: React.RefObject<HTMLDivElement>;
}

export const DisplayGrid: React.FC<DisplayGridProps> = ({
  displays,
  devices,
  loading,
  copiedId,
  onNavigateToEdit,
  onCopyPlayerLink,
  onOpenPlayer,
  onOpenRenameModal,
  onOpenCoverModal,
  onRemoveCover,
  onDeleteDisplay,
  onOpenDisplaySettings,
  onCreateFirstDisplay,
  displaysParentRef,
}) => {
  if (loading && displays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 relative z-10" style={{ color: 'var(--color-text-muted)' }}>
        <div className="flex items-center gap-1.5 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-accent dot-pulse"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-accent dot-pulse delay-100"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-accent dot-pulse delay-200"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-accent dot-pulse delay-300"></div>
        </div>
        <p className="tracking-widest uppercase text-xs font-black text-accent">Sincronizando Dados...</p>
      </div>
    );
  }

  return (
    <div className="relative z-10 mb-12">
      {/* Section Header */}
      <div className="section-header">
        <div className="section-title">
          <div className="icon-box">
            <Monitor size={15} className="text-[#38bdf8]" />
          </div>
          Suas Telas
        </div>
      </div>

      {/* Grid */}
      <motion.div
        ref={displaysParentRef}
        variants={staggerGrid}
        initial="hidden"
        animate="show"
        className="displays-grid"
      >
        {displays.map(display => (
          <DisplayCard
            key={display.id}
            display={display}
            devices={devices}
            copiedId={copiedId}
            onNavigateToEdit={onNavigateToEdit}
            onCopyPlayerLink={onCopyPlayerLink}
            onOpenPlayer={onOpenPlayer}
            onOpenRenameModal={onOpenRenameModal}
            onOpenCoverModal={onOpenCoverModal}
            onRemoveCover={onRemoveCover}
            onDeleteDisplay={onDeleteDisplay}
            onOpenDisplaySettings={onOpenDisplaySettings}
          />
        ))}

        {/* Card "Nova Tela" — mesma altura que os demais */}
        {displays.length > 0 && (
          <motion.div
            variants={cardItem}
            whileHover={{ y: -5 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={onCreateFirstDisplay}
            style={{ height: '100%' }}
          >
            <div className="new-display-card">
              <div className="icon-circle">
                <Plus size={20} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <span className="label">Nova Tela</span>
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {displays.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center border border-dashed rounded-2xl" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            <Monitor size={48} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>Você ainda não tem telas configuradas.</p>
            <Button onClick={onCreateFirstDisplay} variant="brand">
              Criar primeira tela
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
