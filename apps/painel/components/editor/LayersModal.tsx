import React, { useState } from 'react';
import { 
  Layers, X, ImageIcon, Film, Type, Clock, CalendarDays, CloudSun, 
  LayoutDashboard, Rss, Globe, Sparkles, StickyNote, ListTodo, Timer, 
  ClipboardList, Utensils, TrendingUp, Aperture, FileText, BookOpen, 
  BarChart3, Code2, Database, Trash2, GripVertical 
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
    
    // Sort layout by zIndex descending (top element first)
    const sortedLayout = [...layout].sort((a, b) => (b.data.zIndex ?? 10) - (a.data.zIndex ?? 10));
    
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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div ref={modalRef} role="dialog" aria-modal="true" className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
            <Layers className="text-sky-500" size={16} /> Camadas da Cena ({activePage.layout.length})
          </h3>
          <button onClick={() => setShowLayersModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar min-h-0">
          {[...activePage.layout]
            .sort((a, b) => (b.data.zIndex ?? 10) - (a.data.zIndex ?? 10))
            .map((layer) => {
              const isSelected = selectedWidget === layer.i;
              const isDragging = draggedLayerId === layer.i;
              const isDragOver = dragOverLayerId === layer.i;

              return (
                <div
                  key={layer.i}
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
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected 
                      ? 'bg-sky-500/10 border-sky-500/50 text-sky-400 shadow-md shadow-sky-500/5' 
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-900'
                  } ${isDragging ? 'opacity-50' : 'opacity-100'} ${
                    isDragOver ? 'border-t-2 border-t-sky-500' : ''
                  }`}
                >
                  <div className="cursor-move text-slate-500 hover:text-slate-300 p-1">
                    <GripVertical size={14} />
                  </div>
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400">
                    {getIcon(layer.type)}
                  </div>
                  <span className="text-xs font-bold truncate flex-1">{getName(layer.type)}</span>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        removeWidget(layer.i); 
                      }}
                      className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 rounded-lg transition-colors"
                      title="Excluir Camada"
                    >
                      <Trash2 size={14} />
                    </button>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></div>}
                  </div>
                </div>
              );
            })}
          {activePage.layout.length === 0 && (
            <div className="text-center p-6 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
              Nenhuma camada nesta cena.
            </div>
          )}
        </div>
        
        {activePage.layout.length > 0 && (
          <p className="text-[10px] text-slate-500 mt-4 text-center border-t border-slate-800 pt-3">
            💡 Arraste as camadas usando o indicador de arrastar para alterar a ordem de sobreposição (z-index).
          </p>
        )}
      </div>
    </div>
  );
};
