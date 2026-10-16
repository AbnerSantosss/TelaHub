import React from 'react';
import { Display, Device } from '../../types';
import { DisplayCard } from './DisplayCard';
import { motion } from 'motion/react';
import { staggerGrid, cardItem } from '../../libs/motion';
import { Monitor, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { EmptyState } from './EmptyState';

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

type FilterType = 'all' | 'online' | 'offline';
type SortType = 'name' | 'date' | 'orientation';
type ViewType = 'grid' | 'list';

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
  const [filter, setFilter] = React.useState<FilterType>('all');
  const [sort, setSort] = React.useState<SortType>('date');
  const [view, setView] = React.useState<ViewType>('grid');
  const [showSortMenu, setShowSortMenu] = React.useState(false);

  const isDisplayOnline = (display: Display) =>
    devices
      .filter(d => d.display_id === display.id)
      .some(d => d.online);

  // --- Filter ---
  const filtered = displays.filter(d => {
    if (filter === 'online') return isDisplayOnline(d);
    if (filter === 'offline') return !isDisplayOnline(d);
    return true;
  });

  // --- Sort ---
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'orientation') return (a.orientation || '').localeCompare(b.orientation || '');
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  const sortLabel = { name: 'Nome', date: 'Data', orientation: 'Orientação' }[sort];

  if (loading && displays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 relative z-10 text-tinta-3" role="status">
        <div className="flex items-center gap-1.5 mb-4" aria-hidden="true">
          <div className="w-2.5 h-2.5 rounded-full bg-marca dot-pulse"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-marca dot-pulse delay-100"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-marca dot-pulse delay-200"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-marca dot-pulse delay-300"></div>
        </div>
        <p className="text-sm font-medium text-tinta-2">Sincronizando Dados...</p>
      </div>
    );
  }

  return (
    <div className="relative z-10 mb-12">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-tinta tracking-[-0.02em]">Suas Telas</h2>
          <div className="flex items-center gap-1.5 bg-marca-fundo rounded-full px-2.5 py-1">
            <span className="text-[13px] font-semibold text-marca">
              {sorted.length} {sorted.length === 1 ? 'tela' : 'telas'}
              {filter !== 'all' && ` · ${filter === 'online' ? 'online' : 'offline'}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-papel border border-borda-2 rounded-lg overflow-hidden p-0.5" role="group" aria-label="Modo de visualização">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('grid')}
              className={`size-10 md:size-8 rounded-md transition-colors ${view === 'grid' ? 'bg-marca-fundo text-marca' : 'text-tinta-3 hover:text-tinta'}`}
              title="Visualização em grade"
              aria-pressed={view === 'grid'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('list')}
              className={`size-10 md:size-8 rounded-md transition-colors ${view === 'list' ? 'bg-marca-fundo text-marca' : 'text-tinta-3 hover:text-tinta'}`}
              title="Visualização em lista"
              aria-pressed={view === 'list'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </Button>
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowSortMenu(v => !v)}
              className="h-11 md:h-9 rounded-lg flex items-center gap-2 px-3 text-sm font-semibold"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="12" y2="18"/></svg>
              {sortLabel}
            </Button>
            {showSortMenu && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[180px] rounded-lg bg-papel border border-borda shadow-flutuante overflow-hidden p-1">
                {(['name', 'date', 'orientation'] as SortType[]).map(s => (
                  <button
                    key={s}
                    onClick={() => { setSort(s); setShowSortMenu(false); }}
                    className={`w-full min-h-11 md:min-h-9 rounded-md text-left px-3 py-2 text-sm font-medium transition-colors hover:bg-marca-fundo hover:text-marca ${sort === s ? 'text-marca' : 'text-tinta-2'}`}
                  >
                    {{ name: 'Nome (A a Z)', date: 'Data de edição', orientation: 'Orientação' }[s]}
                    {sort === s && <span className="ml-2 text-xs" aria-hidden="true">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="filter-chips mb-2">
        {(['all', 'online', 'offline'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`filter-chip ${filter === f ? 'active' : ''}`}
          >
            {f === 'all' ? 'Todas' : f === 'online' ? '● Online' : '○ Offline'}
          </button>
        ))}
      </div>

      {/* Click outside to close sort menu */}
      {showSortMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
      )}

      {/* Grid / List */}
      <motion.div
        ref={displaysParentRef}
        variants={staggerGrid}
        initial="hidden"
        animate="show"
        className={view === 'grid' ? 'displays-grid' : 'displays-list'}
      >
        {sorted.map(display => (
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

        {/* Card "Nova Tela" */}
        {filter === 'all' && (
          <motion.div
            variants={cardItem}
            onClick={onCreateFirstDisplay}
            style={{ height: '100%' }}
          >
            {/* Era um div clicável, fora do Tab. Como botão, o teclado chega. */}
            <button type="button" className="new-display-card w-full">
              <span className="icon-circle">
                <Plus size={20} aria-hidden="true" />
              </span>
              <span className="label">Nova Tela</span>
            </button>
          </motion.div>
        )}

        {/* Empty state */}
        {sorted.length === 0 && !loading && (
          displays.length === 0 ? (
            <EmptyState
              className="col-span-full"
              icon={Monitor}
              message="Você ainda não tem telas configuradas. Crie sua primeira tela para começar a exibir conteúdo."
              actionLabel="Criar primeira tela"
              onAction={onCreateFirstDisplay}
            />
          ) : (
            <EmptyState
              className="col-span-full"
              icon={Monitor}
              message="Nenhuma tela corresponde ao filtro selecionado."
            />
          )
        )}
      </motion.div>
    </div>
  );
};
