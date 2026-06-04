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
    <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 overflow-x-auto w-full md:max-w-[40%] scrollbar-hide flex-nowrap">
      {display.pages.map((p, idx) => (
        <div 
          key={p.id} 
          className={`flex items-center rounded-lg border transition-all flex-shrink-0 min-w-max ${
            activePageIdx === idx 
            ? 'bg-[#0ea5e9] border-[#0ea5e9] shadow-[0_0_10px_rgba(124,58,237,0.4)]' 
            : 'border-slate-800 hover:border-slate-700 bg-slate-900'
          }`}
        >
          <button
            onClick={() => { setActivePageIdx(idx); setSelectedWidget(null); }}
            className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activePageIdx === idx ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {p.broadcast_id && <CalendarDays size={12} className="text-[#0ea5e9]" />}
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
                ? 'border-[#0284c7] text-purple-200 hover:bg-[#0284c7] hover:text-white' 
                : 'border-slate-800 text-slate-600 hover:bg-rose-500/10 hover:text-rose-500'
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
      }} className="p-1.5 text-[#0ea5e9] hover:bg-[#0ea5e9]/10 rounded-lg transition-colors mx-1">
        <Plus size={16} />
      </button>
    </div>
  );
};
