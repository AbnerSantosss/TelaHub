import React, { useState } from 'react';
import { 
  Layers, X, ImageIcon, Film, Type, Clock, CalendarDays, CloudSun, 
  LayoutDashboard, Rss, Globe, Sparkles, StickyNote, ListTodo, Timer, 
  ClipboardList, Utensils, TrendingUp, Aperture, FileText, BookOpen, 
  BarChart3, Code2, Database, Trash2, GripVertical, ArrowUp, ArrowDown,
  ChevronDown, Eye
} from 'lucide-react';
import { Display, Page, WidgetType } from '../../types';
import { useModalA11y } from '../../hooks/useModalA11y';

interface LayersModalProps {
  showLayersModal: boolean;
  setShowLayersModal: React.Dispatch<React.SetStateAction<boolean>>;
  display: Display;
  setDisplay: React.Dispatch<React.SetStateAction<Display | null>>;
  activePageIdx: number;
  activePage: Page;
  selectedWidget: string | null;
  setSelectedWidget: React.Dispatch<React.SetStateAction<string | null>>;
  removeWidget: (wId: string) => void;
}

export const LayersModal: React.FC<LayersModalProps> = ({
  showLayersModal,
  setShowLayersModal,
  display,
  setDisplay,
  activePageIdx,
  activePage,
  selectedWidget,
  setSelectedWidget,
  removeWidget
}) => {
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const modalRef = useModalA11y(showLayersModal, () => setShowLayersModal(false));

  if (!showLayersModal) return null;

  const handleLayerDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedLayerId(id);
  };

  const handleLayerDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverLayerId !== id) {
      setDragOverLayerId(id);
    }
  };

  const handleLayerDragLeave = () => {
    setDragOverLayerId(null);
  };

  const handleLayerDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    setDragOverLayerId(null);
    
    if (!draggedLayerId || draggedLayerId === targetId) return;

    const updatedPages = [...display.pages];
    const layout = [...updatedPages[activePageIdx].layout];
    
    // Sort layout by zIndex descending (top element first), with array position tiebreaker
    const sortedLayout = [...layout]
      .map((w, idx) => ({ ...w, _arrayIdx: idx }))
      .sort((a, b) => {
        const zDiff = (b.data.zIndex ?? 10) - (a.data.zIndex ?? 10);
        return zDiff !== 0 ? zDiff : b._arrayIdx - a._arrayIdx;
      });
    
    const draggedIdx = sortedLayout.findIndex(w => w.i === draggedLayerId);
    const targetIdx = sortedLayout.findIndex(w => w.i === targetId);
    
    if (draggedIdx === -1 || targetIdx === -1) return;
    
    // Remove the dragged item
    const [draggedItem] = sortedLayout.splice(draggedIdx, 1);
    
    // Insert at new position
    sortedLayout.splice(targetIdx, 0, draggedItem);
    
    // Recalculate zIndex for all items
    const newBaseZIndex = 10;
    sortedLayout.forEach((item, index) => {
      const layoutItem = layout.find(w => w.i === item.i);
      if (layoutItem) {
        layoutItem.data.zIndex = newBaseZIndex + (sortedLayout.length - 1 - index);
      }
    });

    updatedPages[activePageIdx].layout = layout;
    setDisplay({ ...display, pages: updatedPages });
    setDraggedLayerId(null);
  };

  const handleLayerDragEnd = () => {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  const getIcon = (type: WidgetType) => {
    switch (type) {
      case WidgetType.IMAGE: return <ImageIcon size={14} />;
      case WidgetType.VIDEO: return <Film size={14} />;
      case WidgetType.TEXT: return <Type size={14} />;
      case WidgetType.CLOCK: return <Clock size={14} />;
      case WidgetType.CALENDAR: return <CalendarDays size={14} />;
      case WidgetType.WEATHER: return <CloudSun size={14} />;
      case WidgetType.FULL_INFO: return <LayoutDashboard size={14} />;
      case WidgetType.RSS: return <Rss size={14} />;
      case WidgetType.IFRAME: return <Globe size={14} />;
      case WidgetType.GIF: return <Sparkles size={14} />;
      case WidgetType.NOTES: return <StickyNote size={14} className="text-yellow-400" />;
      case WidgetType.TODO: return <ListTodo size={14} className="text-emerald-400" />;
      case WidgetType.COUNTDOWN: return <Timer size={14} className="text-rose-400" />;
      case WidgetType.CHORES: return <ClipboardList size={14} className="text-cyan-400" />;
      case WidgetType.MEAL_PLAN: return <Utensils size={14} className="text-amber-400" />;
      case WidgetType.MARKET_WATCH: return <TrendingUp size={14} className="text-green-400" />;
      case WidgetType.BROWSER_SNAPSHOT: return <Aperture size={14} className="text-blue-400" />;
      case WidgetType.GOOGLE_DOCS: return <FileText size={14} className="text-cyan-500" />;
      case WidgetType.OFFICE_DOCS: return <BookOpen size={14} className="text-blue-500" />;
      case WidgetType.POWER_BI: return <BarChart3 size={14} className="text-amber-500" />;
      case WidgetType.EMBED_HTML: return <Code2 size={14} className="text-indigo-400" />;
      case WidgetType.AIRTABLE: return <Database size={14} className="text-rose-500" />;
      case WidgetType.PDF_DOCUMENT: return <FileText size={14} className="text-red-500" />;
      default: return <Layers size={14} />;
    }
  };

  const getName = (type: WidgetType) => {
    switch (type) {
      case WidgetType.IMAGE: return 'Imagem';
      case WidgetType.VIDEO: return 'Vídeo';
      case WidgetType.TEXT: return 'Texto';
      case WidgetType.CLOCK: return 'Relógio';
      case WidgetType.CALENDAR: return 'Agenda';
      case WidgetType.WEATHER: return 'Clima';
      case WidgetType.FULL_INFO: return 'Completo';
      case WidgetType.RSS: return 'Notícias';
      case WidgetType.IFRAME: return 'Website';
      case WidgetType.GIF: return 'GIF';
      case WidgetType.NOTES: return 'Notas';
      case WidgetType.TODO: return 'Tarefas';
      case WidgetType.COUNTDOWN: return 'Contador';
      case WidgetType.CHORES: return 'Deveres';
      case WidgetType.MEAL_PLAN: return 'Meal Plan';
      case WidgetType.MARKET_WATCH: return 'Bolsa';
      case WidgetType.BROWSER_SNAPSHOT: return 'Snapshot';
      case WidgetType.GOOGLE_DOCS: return 'G Docs';
      case WidgetType.OFFICE_DOCS: return 'Office Docs';
      case WidgetType.POWER_BI: return 'Power BI';
      case WidgetType.EMBED_HTML: return 'HTML';
      case WidgetType.AIRTABLE: return 'Airtable';
      case WidgetType.PDF_DOCUMENT: return 'PDF';
      default: return 'Widget';
    }
  };

  // Sorted layers: top (highest z) first
  const sortedLayers = [...activePage.layout]
    .map((w, idx) => ({ ...w, _arrayIdx: idx }))
    .sort((a, b) => {
      const zDiff = (b.data.zIndex ?? 10) - (a.data.zIndex ?? 10);
      return zDiff !== 0 ? zDiff : b._arrayIdx - a._arrayIdx;
    });

  const totalLayers = sortedLayers.length;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div ref={modalRef} role="dialog" aria-modal="true" className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
            <Layers className="text-sky-500" size={16} /> Camadas da Cena ({totalLayers})
          </h3>
          <button onClick={() => setShowLayersModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Legenda de sobreposição */}
        {totalLayers > 1 && (
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-sky-400">
              <ArrowUp size={10} /> Frente <span className="text-slate-600">(sobrepõe)</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-600">
              <Eye size={9} /> Ordem de visibilidade
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
              <ArrowDown size={10} /> Fundo
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
          {/* Tree container */}
          <div className="relative">
            {sortedLayers.map((layer, index) => {
              const isSelected = selectedWidget === layer.i;
              const isDragging = draggedLayerId === layer.i;
              const isDragOver = dragOverLayerId === layer.i;
              const isFirst = index === 0;
              const isLast = index === totalLayers - 1;
              const depthLevel = totalLayers - index; // highest = front

              // Determine which layers this one covers
              const coversCount = totalLayers - 1 - index;
              const coveredByCount = index;

              return (
                <div key={layer.i} className="relative">
                  {/* Branch connector line */}
                  <div className="flex">
                    {/* Left: vertical tree line + branch node */}
                    <div className="relative flex flex-col items-center w-7 shrink-0">
                      {/* Vertical line segment (goes full height except at very top) */}
                      {!isFirst && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-1/2 bg-gradient-to-b from-sky-500/40 to-sky-500/20" />
                      )}
                      {!isLast && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-1/2 bg-gradient-to-b from-sky-500/20 to-slate-700/30" />
                      )}
                      {/* Node dot */}
                      <div className={`relative z-10 my-auto w-3 h-3 rounded-full border-2 transition-all ${
                        isSelected 
                          ? 'bg-sky-500 border-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]' 
                          : isFirst 
                            ? 'bg-sky-500/60 border-sky-500/40' 
                            : isLast
                              ? 'bg-slate-700 border-slate-600'
                              : 'bg-slate-800 border-slate-600'
                      }`} />
                      {/* Horizontal branch line to card */}
                      <div className={`absolute top-1/2 left-1/2 w-3 h-px ${isSelected ? 'bg-sky-500/60' : 'bg-slate-700/60'}`} />
                    </div>

                    {/* Right: the layer card */}
                    <div
                      draggable
                      onDragStart={(e) => handleLayerDragStart(e, layer.i)}
                      onDragOver={(e) => handleLayerDragOver(e, layer.i)}
                      onDragLeave={handleLayerDragLeave}
                      onDrop={(e) => handleLayerDrop(e, layer.i)}
                      onDragEnd={handleLayerDragEnd}
                      onClick={() => {
                        setSelectedWidget(layer.i);
                        setShowLayersModal(false);
                      }}
                      className={`flex-1 flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all border mb-1.5 ${
                        isSelected 
                          ? 'bg-sky-500/10 border-sky-500/50 text-sky-400 shadow-md shadow-sky-500/5' 
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/60'
                      } ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'} ${
                        isDragOver ? 'border-t-2 border-t-sky-500 mt-0.5' : ''
                      }`}
                    >
                      {/* Drag handle */}
                      <div className="cursor-move text-slate-600 hover:text-slate-300 p-0.5 shrink-0">
                        <GripVertical size={12} />
                      </div>

                      {/* Z-index depth badge */}
                      <div className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${
                        isFirst 
                          ? 'bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30' 
                          : isLast 
                            ? 'bg-slate-800 text-slate-500 ring-1 ring-slate-700' 
                            : 'bg-slate-800/80 text-slate-400 ring-1 ring-slate-700/50'
                      }`}>
                        {depthLevel}
                      </div>

                      {/* Widget icon */}
                      <div className={`flex items-center justify-center w-7 h-7 rounded-lg border shrink-0 ${
                        isSelected 
                          ? 'bg-sky-950/80 border-sky-500/30 text-sky-400' 
                          : 'bg-slate-950/80 border-slate-800 text-slate-400'
                      }`}>
                        {getIcon(layer.type)}
                      </div>

                      {/* Name + overlap info */}
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold truncate block">{getName(layer.type)}</span>
                        <span className="text-[9px] text-slate-500 truncate block">
                          {isFirst && totalLayers > 1 && `Sobrepõe ${coversCount === 1 ? '1 camada' : `${coversCount} camadas`}`}
                          {isLast && totalLayers > 1 && `Coberto por ${coveredByCount === 1 ? '1 camada' : `${coveredByCount} camadas`}`}
                          {!isFirst && !isLast && `Sobrepõe ${coversCount} · coberto por ${coveredByCount}`}
                          {totalLayers === 1 && 'Camada única'}
                        </span>
                      </div>

                      {/* Position tag */}
                      {isFirst && totalLayers > 1 && (
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-400 px-1.5 py-0.5 rounded-md border border-sky-500/20">
                          Topo
                        </span>
                      )}
                      {isLast && totalLayers > 1 && (
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-wider bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-md border border-slate-700">
                          Fundo
                        </span>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            removeWidget(layer.i); 
                          }}
                          className="p-1 hover:bg-rose-500/10 text-slate-600 hover:text-rose-500 rounded-lg transition-colors"
                          title="Excluir Camada"
                        >
                          <Trash2 size={12} />
                        </button>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse ml-0.5"></div>}
                      </div>
                    </div>
                  </div>

                  {/* "sobrepõe" arrow indicator between cards */}
                  {!isLast && (
                    <div className="flex items-center ml-7 pl-2 -my-0.5">
                      <ChevronDown size={10} className="text-slate-700" />
                      <span className="text-[8px] text-slate-600 ml-1 font-medium">sobrepõe ↓</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {activePage.layout.length === 0 && (
            <div className="text-center p-6 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
              Nenhuma camada nesta cena.
            </div>
          )}
        </div>
        
        {totalLayers > 0 && (
          <p className="text-[10px] text-slate-500 mt-4 text-center border-t border-slate-800 pt-3">
            Arraste as camadas para alterar a ordem. Camadas no topo sobrepõem as de baixo.
          </p>
        )}
      </div>
    </div>
  );
};
