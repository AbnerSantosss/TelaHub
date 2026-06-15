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
      .some(d => (Date.now() - d.last_seen) < 60000);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-[#eaf2ff] tracking-tight">Suas Telas</h2>
          <div className="flex items-center gap-1.5 bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 rounded-full px-2.5 py-0.5">
            <span className="text-[11px] font-bold text-[#0ea5e9] tracking-wide">
              {sorted.length} {sorted.length === 1 ? 'tela' : 'telas'}
              {filter !== 'all' && ` · ${filter === 'online' ? 'online' : 'offline'}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('grid')}
              className={`w-8 h-8 rounded-lg transition-all ${view === 'grid' ? 'bg-white/10 text-[#0ea5e9]' : 'text-slate-500 hover:text-slate-300'}`}
              title="Visualização em grade"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('list')}
              className={`w-8 h-8 rounded-lg transition-all ${view === 'list' ? 'bg-white/10 text-[#0ea5e9]' : 'text-slate-500 hover:text-slate-300'}`}
              title="Visualização em lista"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </Button>
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowSortMenu(v => !v)}
              className="h-[36px] bg-slate-900/40 border border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-xl flex items-center gap-2 px-3 text-[11px] font-bold tracking-wider uppercase"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="12" y2="18"/></svg>
              {sortLabel}
            </Button>
            {showSortMenu && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[150px] rounded-xl bg-[#0e121c]/95 border border-white/10 shadow-2xl backdrop-blur-md overflow-hidden">
                {(['name', 'date', 'orientation'] as SortType[]).map(s => (
                  <button
                    key={s}
                    onClick={() => { setSort(s); setShowSortMenu(false); }}
                    className={`w-full text-left px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wider transition-all hover:bg-white/5 ${sort === s ? 'text-[#0ea5e9]' : 'text-slate-400'}`}
                  >
                    {{ name: 'Nome (A–Z)', date: 'Data de edição', orientation: 'Orientação' }[s]}
                    {sort === s && <span className="ml-2 text-[10px]">✓</span>}
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
        {sorted.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center border border-dashed rounded-2xl" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            <Monitor size={48} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
            {displays.length === 0 ? (
              <>
                <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>Você ainda não tem telas configuradas.</p>
                <Button onClick={onCreateFirstDisplay} variant="brand">
                  Criar primeira tela
                </Button>
              </>
            ) : (
              <p style={{ color: 'var(--color-text-muted)' }}>Nenhuma tela corresponde ao filtro selecionado.</p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
