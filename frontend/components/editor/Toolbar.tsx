import React from 'react';
import { Home, Layers, Settings, Maximize2, Save, Loader2 } from 'lucide-react';
import { LogoHub } from '../Login';
import { Display, Page } from '../../types';

interface ToolbarProps {
  display: Display;
  activePage: Page;
  isSaving: boolean;
  handleSave: () => void;
  showLeftSidebar: boolean;
  setShowLeftSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  showRightSidebar: boolean;
  setShowRightSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  setShowLayersModal: React.Dispatch<React.SetStateAction<boolean>>;
  onGoHome: () => void;
  children?: React.ReactNode; // For SceneTabs
}

export const Toolbar: React.FC<ToolbarProps> = ({
  display,
  activePage,
  isSaving,
  handleSave,
  showLeftSidebar,
  setShowLeftSidebar,
  showRightSidebar,
  setShowRightSidebar,
  setShowLayersModal,
  onGoHome,
  children
}) => {
  return (
    <header className="h-auto md:h-16 bg-[#1f2937] border-b border-[#9CA3AF]/10 px-4 md:px-6 py-3 md:py-0 flex flex-col md:flex-row items-center justify-between z-30 shadow-md gap-3 md:gap-0">
      <div className="flex items-center gap-4 w-full md:w-auto justify-start">
        <button onClick={onGoHome} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-[#0ea5e9] transition-colors">
          <Home size={20} />
        </button>
        <div className="w-px h-6 bg-slate-800"></div>
        <div className="flex items-center gap-2">
          <LogoHub size={28} className="drop-shadow-[0_0_8px_rgba(124,58,237,0.35)]" />
          <h1 className="font-bold text-slate-100 tracking-tight uppercase text-sm">
            Tela<span className="text-[#0ea5e9]">Hub</span> <span className="text-slate-600 mx-2">/</span> {display.name}
          </h1>
        </div>
      </div>

      {/* Scene Tabs injection */}
      {children}

      <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
        <div className="flex items-center gap-2 md:hidden">
          <button 
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
            className={`px-3 py-2 rounded-lg transition-all border ${showLeftSidebar ? 'bg-[#0ea5e9]/20 text-[#0ea5e9] border-[#0ea5e9]/50' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-[#0ea5e9]'}`}
            title="Widgets"
          >
            <Layers size={16} />
          </button>
          <button 
            onClick={() => setShowRightSidebar(!showRightSidebar)}
            className={`px-3 py-2 rounded-lg transition-all border ${showRightSidebar ? 'bg-[#0ea5e9]/20 text-[#0ea5e9] border-[#0ea5e9]/50' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-[#0ea5e9]'}`}
            title="Configurações"
          >
            <Settings size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowLayersModal(true)}
            className="bg-[#1f2937] hover:bg-[#111827] text-slate-300 hover:text-white border border-[#9CA3AF]/20 hover:border-sky-500/50 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-md"
            title="Visualizar Camadas"
          >
            <Layers size={16} className="text-sky-400" />
            <span className="hidden sm:inline">Camadas ({activePage.layout.length})</span>
          </button>

          <button 
            onClick={() => window.open(`/#/player/${display.slug || display.id}`, '_blank')}
            className="bg-[#1f2937] hover:bg-[#111827] text-[#F3F4F6] border border-[#9CA3AF] hover:border-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
            title="Abrir Player em nova aba"
          >
            <Maximize2 size={16} />
            <span className="hidden sm:inline">VISUALIZAR</span>
          </button>

          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)] border border-white/10 active:scale-95 whitespace-nowrap disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
            {isSaving ? 'SALVANDO...' : 'SALVAR'}
          </button>
        </div>
      </div>
    </header>
  );
};
