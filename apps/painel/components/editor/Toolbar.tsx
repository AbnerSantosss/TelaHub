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
    <header className="h-auto md:h-16 bg-papel border-b border-borda px-4 md:px-6 py-3 md:py-0 flex flex-col md:flex-row items-center justify-between z-30 shadow-card gap-3 md:gap-0">
      <div className="flex items-center gap-4 w-full md:w-auto justify-start">
        <button onClick={onGoHome} className="p-2 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 flex items-center justify-center hover:bg-papel-3 rounded-lg text-tinta-3 hover:text-marca transition-colors">
          <Home size={20} />
        </button>
        <div className="w-px h-6 bg-papel-3"></div>
        <div className="flex items-center gap-2">
          <LogoHub size={28} className="" />
          <h1 className="font-bold text-tinta tracking-tight uppercase text-sm">
            Tela<span className="text-marca">Hub</span> <span className="text-tinta-3 mx-2">/</span> {display.name}
          </h1>
        </div>
      </div>

      {/* Scene Tabs injection */}
      {children}

      <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
        <div className="flex items-center gap-2 md:hidden">
          <button 
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
            className={`px-3 py-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-all border ${showLeftSidebar ? 'bg-marca-fundo text-marca border-marca/50' : 'bg-papel border-borda text-tinta-3 hover:text-marca'}`}
            title="Widgets"
          >
            <Layers size={16} />
          </button>
          <button 
            onClick={() => setShowRightSidebar(!showRightSidebar)}
            className={`px-3 py-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-all border ${showRightSidebar ? 'bg-marca-fundo text-marca border-marca/50' : 'bg-papel border-borda text-tinta-3 hover:text-marca'}`}
            title="Configurações"
          >
            <Settings size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowLayersModal(true)}
            className="bg-papel hover:bg-papel-3 text-tinta-2 hover:text-tinta border border-borda-3 hover:border-marca px-4 py-2 min-h-[44px] md:min-h-0 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-card"
            title="Visualizar Camadas"
          >
            <Layers size={16} className="text-marca" />
            <span className="hidden sm:inline">Camadas ({activePage.layout.length})</span>
          </button>

          <button 
            onClick={() => window.open(`${import.meta.env.BASE_URL}#/player/${display.slug || display.id}`, '_blank')}
            className="bg-papel hover:bg-papel-3 text-tinta border border-borda-3 hover:border-marca px-4 py-2 min-h-[44px] md:min-h-0 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
            title="Abrir Player em nova aba"
          >
            <Maximize2 size={16} />
            <span className="hidden sm:inline">VISUALIZAR</span>
          </button>

          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="bg-marca hover:bg-marca-hover text-white px-6 py-2 min-h-[44px] md:min-h-0 rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
            {isSaving ? 'SALVANDO...' : 'SALVAR'}
          </button>
        </div>
      </div>
    </header>
  );
};
