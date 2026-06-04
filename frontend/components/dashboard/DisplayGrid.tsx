import React from 'react';
import { Display, Device } from '../../types';
import { DisplayCard } from './DisplayCard';
import { motion } from 'motion/react';
import { staggerGrid } from '../../libs/motion';
import { Monitor } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center h-64 text-text-muted relative z-10">
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
      <h2 className="text-xl font-black text-text mb-6 flex items-center gap-2">
        <Monitor className="text-accent" size={20} /> Suas Telas
      </h2>
      <motion.div
        ref={displaysParentRef}
        variants={staggerGrid}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
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

        {displays.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center border border-dashed border-border rounded-2xl bg-surface/30 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <Monitor size={48} className="mx-auto text-text-muted/40 mb-4" />
            <p className="text-text-muted mb-6">Você ainda não tem telas configuradas.</p>
            <Button onClick={onCreateFirstDisplay} variant="brand">
              Criar primeira tela
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
