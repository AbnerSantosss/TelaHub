import React from 'react';
import { CalendarDays, X, Plus } from 'lucide-react';
import { Display, Page } from '../../types';

interface SceneTabsProps {
  display: Display;
  setDisplay: React.Dispatch<React.SetStateAction<Display | null>>;
  activePageIdx: number;
  setActivePageIdx: React.Dispatch<React.SetStateAction<number>>;
  setSelectedWidget: React.Dispatch<React.SetStateAction<string | null>>;
  removePage: (idx: number) => void;
}

export const SceneTabs: React.FC<SceneTabsProps> = ({
  display,
  setDisplay,
  activePageIdx,
  setActivePageIdx,
  setSelectedWidget,
  removePage
}) => {
  return (
    <div className="flex items-center gap-2 bg-papel-2 p-1.5 rounded-xl border border-borda overflow-x-auto w-full md:max-w-[40%] scrollbar-hide flex-nowrap">
      {display.pages.map((p, idx) => (
        <div 
          key={p.id} 
          className={`flex items-center rounded-lg border transition-all flex-shrink-0 min-w-max ${
            activePageIdx === idx 
            ? 'bg-marca border-marca' 
            : 'border-borda hover:border-borda-3 bg-papel'
          }`}
        >
          <button
            onClick={() => { setActivePageIdx(idx); setSelectedWidget(null); }}
            className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activePageIdx === idx ? 'text-tinta' : 'text-tinta-3 hover:text-tinta'
            }`}
          >
            {p.broadcast_id && <CalendarDays size={12} className="text-marca" />}
            CENA {idx + 1}
          </button>
          
          {display.pages.length > 1 && (
            <button 
              onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                removePage(idx); 
              }}
              className={`flex-shrink-0 w-8 h-8 flex items-center justify-center transition-colors border-l ${
                activePageIdx === idx 
                ? 'border-marca-hover text-marca hover:bg-marca-hover hover:text-tinta' 
                : 'border-borda text-tinta-3 hover:bg-danger-fundo hover:text-danger'
              }`}
              title="Excluir Cena"
            >
              <X size={14} strokeWidth={3} />
            </button>
          )}
        </div>
      ))}
      <button onClick={() => {
        const newP: Page = { id: 'p'+Date.now(), order: display.pages.length+1, duration: 15, layout: [] };
        setDisplay({...display, pages: [...display.pages, newP]});
        setActivePageIdx(display.pages.length);
      }} className="p-1.5 text-marca hover:bg-marca-fundo rounded-lg transition-colors mx-1">
        <Plus size={16} />
      </button>
    </div>
  );
};
