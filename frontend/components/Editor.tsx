import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, MonitorPlay, X, CheckCircle2 } from 'lucide-react';
import { getDisplays, saveDisplay } from '../services/storage';
import { Display, Page, WidgetType, LayoutItem } from '../types';

import { WidgetLibrary } from './editor/WidgetLibrary';
import { PropertiesPanel } from './editor/PropertiesPanel';
import { Canvas } from './editor/Canvas';
import { Toolbar } from './editor/Toolbar';
import { SceneTabs } from './editor/SceneTabs';
import { LayersModal } from './editor/LayersModal';
import { MediaLibrary } from './MediaLibrary';

const GRID_COLS = 48;

const getBackgroundAnimationClass = (anim?: string) => {
  switch (anim) {
    case 'auto-weather': return 'bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-dashed border-cyan-500/30';
    case 'gradient-flow': return 'bg-anim-gradient-flow';
    case 'clouds': return 'bg-anim-clouds';
    case 'rain': return 'bg-anim-rain';
    case 'snow': return 'bg-anim-snow';
    case 'fire': return 'bg-anim-fire';
    case 'tech-grid': return 'bg-anim-tech-grid';
    case 'pulse-red': return 'bg-anim-pulse-red';
    case 'pulse-blue': return 'bg-anim-pulse-blue';
    case 'pulse-green': return 'bg-anim-pulse-green';
    case 'aurora': return 'bg-anim-aurora';
    default: return '';
  }
};

const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [display, setDisplay] = useState<Display | null>(null);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [pageToDelete, setPageToDelete] = useState<number | null>(null);
  const [isClearingScene, setIsClearingScene] = useState(false);
  const [activeMealDay, setActiveMealDay] = useState<string>('Segunda');

  const [showBgAnimModal, setShowBgAnimModal] = useState(false);
  const [showLayersModal, setShowLayersModal] = useState(false);
  const [mediaLibraryConfig, setMediaLibraryConfig] = useState<{ isOpen: boolean, onSelect: (url: string) => void, allowedTypes: 'image' | 'video' | 'all' } | null>(null);
  
  // Mobile sidebar states
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const displays = await getDisplays();
      const found = displays.find(d => d.id === id);
      if (found) {
        setDisplay(found);
      } else {
        navigate('/');
      }
    };
    fetchData();
  }, [id, navigate]);

  const rowHeight = containerWidth / GRID_COLS;

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.contentRect.width > 0) {
            setContainerWidth(entry.contentRect.width);
          }
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [display]);

  if (!display) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-500 gap-4">
      <Loader2 className="animate-spin text-cyan-500" size={32} /> 
      <p className="text-xs uppercase tracking-widest font-bold">Carregando estúdio...</p>
    </div>
  );

  const activePage = display.pages[activePageIdx];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveDisplay(display);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e) {
      alert('Erro ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLayoutChange = (layout: any[]) => {
    const updatedPages = [...display.pages];
    updatedPages[activePageIdx].layout = updatedPages[activePageIdx].layout.map(w => {
      const item = layout.find(l => l.i === w.i);
      if (item) {
        return { ...w, x: item.x, y: item.y, w: item.w, h: item.h };
      }
      return w;
    });
    setDisplay({ ...display, pages: updatedPages });
  };

  const addWidget = (type: WidgetType) => {
    let defaultWidth = 8;
    let defaultHeight = 6;

    if (type === WidgetType.VIDEO || type === WidgetType.IFRAME || type === WidgetType.CALENDAR || type === WidgetType.GIF) {
      defaultWidth = 12;
      defaultHeight = 8;
    } else if (type === WidgetType.FULL_INFO) {
      defaultWidth = GRID_COLS;
      const ch = containerRef.current?.clientHeight || 0;
      defaultHeight = ch > 0 && rowHeight > 0 ? Math.ceil(ch / rowHeight) : 27;
    } else if (type === WidgetType.RSS) {
      defaultWidth = 12;
      defaultHeight = 6;
    } else if (type === WidgetType.NOTES) {
      defaultWidth = 12;
      defaultHeight = 8;
    } else if (type === WidgetType.TODO) {
      defaultWidth = 12;
      defaultHeight = 10;
    } else if (type === WidgetType.COUNTDOWN) {
      defaultWidth = 12;
      defaultHeight = 6;
    } else if (type === WidgetType.CHORES) {
      defaultWidth = 16;
      defaultHeight = 10;
    } else if (type === WidgetType.MEAL_PLAN) {
      defaultWidth = 18;
      defaultHeight = 12;
    } else if (type === WidgetType.MARKET_WATCH) {
      defaultWidth = 16;
      defaultHeight = 8;
    } else if (type === WidgetType.BROWSER_SNAPSHOT) {
      defaultWidth = 18;
      defaultHeight = 12;
    } else if (type === WidgetType.GOOGLE_DOCS || type === WidgetType.OFFICE_DOCS || type === WidgetType.EMBED_HTML || type === WidgetType.PDF_DOCUMENT) {
      defaultWidth = 16;
      defaultHeight = 12;
    } else if (type === WidgetType.POWER_BI || type === WidgetType.AIRTABLE) {
      defaultWidth = 18;
      defaultHeight = 12;
    }

    const isFullInfo = type === WidgetType.FULL_INFO;
    const newWidget: LayoutItem = {
      i: Math.random().toString(36).substr(2, 9),
      x: isFullInfo ? 0 : 18,
      y: isFullInfo ? 0 : 10,
      w: defaultWidth,
      h: defaultHeight,
      type,
      data: {
        content: type === WidgetType.TEXT ? 'NOVO TEXTO' : (type === WidgetType.NOTES ? '📝 Bloco de Notas\n\n• Use esta nota para deixar recados ou avisos importantes no display!\n• Suporta quebra de linhas e emojis.' : ''),
        url: type === WidgetType.IMAGE ? 'https://picsum.photos/400/300' : (type === WidgetType.IFRAME ? 'https://www.wikipedia.org' : (type === WidgetType.GIF ? 'https://media.giphy.com/media/3o7TKSjRrfIPjei72E/giphy.gif' : '')),
        videoUrl: type === WidgetType.VIDEO ? 'https://www.youtube.com/watch?v=YhYaHfpz6lo' : '',
        rssUrl: type === WidgetType.RSS ? 'https://g1.globo.com/rss/g1/tecnologia/' : '',
        calendarId: type === WidgetType.CALENDAR ? 'pt.brazilian#holiday@group.v.calendar.google.com' : '',
        city: (type === WidgetType.WEATHER || type === WidgetType.CLOCK || type === WidgetType.FULL_INFO) ? 'Campina Grande' : '',
        model: type === WidgetType.WEATHER ? 'simple' : (type === WidgetType.CLOCK ? 'standard' : undefined),
        color: '#ffffff',
        fontSize: '2vw',
        fillContainer: true,
        contentAlignment: 'stretch',
        fitContainerMode: 'stretch',
        notesConfig: type === WidgetType.NOTES ? {
          fontFamily: 'Inter',
          fontSize: '1.2rem',
          textColor: '#ffffff',
          backgroundColor: 'rgba(30, 41, 59, 0.7)',
          paperTheme: 'glass'
        } : undefined,
        todoConfig: type === WidgetType.TODO ? {
          title: '📋 Tarefas Diárias',
          items: [
            { id: '1', text: 'Reunião de Alinhamento (09:00)', done: false },
            { id: '2', text: 'Revisar metas da equipe', done: true },
            { id: '3', text: 'Organizar recepção', done: false }
          ]
        } : undefined,
        countdownConfig: type === WidgetType.COUNTDOWN ? {
          title: '⏰ Lançamento do Novo Site',
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
          expiredMessage: '🚀 O lançamento chegou!',
          theme: 'bold-gradient'
        } : undefined,
        choresConfig: type === WidgetType.CHORES ? {
          title: '🧹 Quadro de Deveres',
          items: [
            { id: '1', chore: 'Regar as plantas', assignee: 'Carlos', day: 'Segunda', done: false },
            { id: '2', chore: 'Organizar estoque', assignee: 'Mariana', day: 'Terça', done: true },
            { id: '3', chore: 'Trocar café da recepção', assignee: 'Vítor', day: 'Quarta', done: false }
          ]
        } : undefined,
        mealPlanConfig: type === WidgetType.MEAL_PLAN ? {
          title: '🍽️ Cardápio da Semana',
          days: {
            'Segunda': { breakfast: 'Tapioca + Café', lunch: 'Arroz, Feijão, Frango', dinner: 'Sopa de Legumes', snacks: 'Fruta' },
            'Terça': { breakfast: 'Pão Integral + Suco', lunch: 'Purê de Batata, Carne', dinner: 'Salada Completa', snacks: 'Iogurte' },
            'Quarta': { breakfast: 'Cuscuz com Ovo', lunch: 'Macarrão com Almôndegas', dinner: 'Sanduíche Natural', snacks: 'Castanhas' },
            'Quinta': { breakfast: 'Tapioca + Café', lunch: 'Arroz Integral, Peixe', dinner: 'Omelete com Queijo', snacks: 'Fruta' },
            'Sexta': { breakfast: 'Panqueca de Aveia', lunch: 'Feijoada Leve, Couve', dinner: 'Wrap Integral', snacks: 'Iogurte' }
          }
        } : undefined,
        marketWatchConfig: type === WidgetType.MARKET_WATCH ? {
          title: '📊 Mercado Financeiro',
          symbols: ['IBOV', 'PETR4.SA', 'VALE3.SA', 'BTC-USD'],
          layout: 'list'
        } : undefined,
        browserSnapshotConfig: type === WidgetType.BROWSER_SNAPSHOT ? {
          url: 'https://g1.globo.com',
          updateIntervalMinutes: 15
        } : undefined,
        googleDocsConfig: type === WidgetType.GOOGLE_DOCS ? {
          url: '',
          docType: 'document'
        } : undefined,
        officeDocsConfig: type === WidgetType.OFFICE_DOCS ? {
          url: '',
          docType: 'word'
        } : undefined,
        powerBiConfig: type === WidgetType.POWER_BI ? {
          embedUrl: ''
        } : undefined,
        embedWebsiteConfig: type === WidgetType.IFRAME ? {
          url: 'https://www.wikipedia.org',
          interactive: false
        } : undefined,
        embedHtmlConfig: type === WidgetType.EMBED_HTML ? {
          html: '<div style="padding: 20px; text-align: center; background: linear-gradient(135deg, #1e1b4b, #311042); color: #fff; border-radius: 12px; font-family: sans-serif; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center;">\n  <h2 style="margin-top:0; color: #22d3ee; margin-bottom: 8px;">HTML Customizado 🚀</h2>\n  <p style="margin-bottom: 12px;">Edite este bloco digitando qualquer código HTML ou JS no painel lateral!</p>\n  <span style="font-size: 32px;">💻</span>\n</div>'
        } : undefined,
        airtableConfig: type === WidgetType.AIRTABLE ? {
          shareUrl: ''
        } : undefined,
        pdfDocumentConfig: type === WidgetType.PDF_DOCUMENT ? {
          pdfUrl: ''
        } : undefined,
        fullScreenMode: type === WidgetType.FULL_INFO ? true : undefined,
        zIndex: type === WidgetType.FULL_INFO ? 0 : 10
      }
    };

    const updatedPages = [...display.pages];
    updatedPages[activePageIdx].layout.push(newWidget);
    setDisplay({ ...display, pages: updatedPages });
    setSelectedWidget(newWidget.i);
  };

  const removeWidget = (wId: string) => {
    const updatedPages = [...display.pages];
    updatedPages[activePageIdx].layout = updatedPages[activePageIdx].layout.filter(w => w.i !== wId);
    setDisplay({ ...display, pages: updatedPages });
    setSelectedWidget(null);
  };

  const confirmRemovePage = () => {
    if (pageToDelete === null) return;
    
    const updatedPages = display.pages.filter((_, i) => i !== pageToDelete);
    
    let newIdx = activePageIdx;
    if (pageToDelete < activePageIdx) {
        newIdx = activePageIdx - 1;
    } else if (pageToDelete === activePageIdx) {
        newIdx = Math.max(0, pageToDelete - 1);
    }
    newIdx = Math.min(newIdx, updatedPages.length - 1);
    
    setDisplay({ ...display, pages: updatedPages });
    setActivePageIdx(newIdx);
    setSelectedWidget(null);
    setPageToDelete(null);
  };

  const removePage = (idx: number) => {
    if (display.pages.length <= 1) {
      alert("É necessário ter pelo menos uma cena.");
      return;
    }
    setPageToDelete(idx);
  };

  const clearAllWidgets = () => {
    const updatedPages = [...display.pages];
    updatedPages[activePageIdx].layout = [];
    setDisplay({ ...display, pages: updatedPages });
    setSelectedWidget(null);
    setIsClearingScene(false);
  };

  const updateWidgetData = (wId: string, dataUpdates: any) => {
    const updatedPages = [...display.pages];
    const w = updatedPages[activePageIdx].layout.find(w => w.i === wId);
    if (w) {
      w.data = { ...w.data, ...dataUpdates };
      setDisplay({ ...display, pages: updatedPages });
    }
  };

  const setFullScreen = () => {
    if (!selectedWidget) return;
    
    const updatedPages = [...display.pages];
    const currentPage = updatedPages[activePageIdx];
    const currentWidget = currentPage.layout.find(w => w.i === selectedWidget);
    if (!currentWidget) return;
    
    const containerHeight = containerRef.current?.clientHeight || 0;
    const requiredRows = containerHeight > 0 && rowHeight > 0 ? Math.ceil(containerHeight / rowHeight) : 27;
    
    const fullScreenWidget = {
      ...currentWidget,
      x: 0,
      y: 0,
      w: GRID_COLS,
      h: requiredRows,
      data: {
        ...currentWidget.data,
        fillContainer: true,
        fullScreenMode: true,
        contentAlignment: 'stretch' as const,
        fitContainerMode: 'stretch' as const,
        padding: '0px',
        margin: '0px',
      }
    };
    
    currentPage.layout = [fullScreenWidget];
    setDisplay({ ...display, pages: updatedPages });
  };

  const currentWidget = activePage.layout.find(w => w.i === selectedWidget);

  return (
    <div className="h-screen flex flex-col bg-[#111827] overflow-hidden relative text-slate-200 font-sans">
      
      {/* Background Animation Selection Modal */}
      {showBgAnimModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-2xl w-full mx-4 animate-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MonitorPlay className="text-cyan-500" /> Escolher Fundo Animado
              </h3>
              <button onClick={() => setShowBgAnimModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { id: '', label: 'Nenhum', desc: 'Remover animação' },
                { id: 'auto-weather', label: 'Automático (Clima)', desc: 'Muda com o tempo' },
                { id: 'gradient-flow', label: 'Fluxo Gradiente', desc: 'Suave e colorido' },
                { id: 'clouds', label: 'Céu e Nuvens', desc: 'Calmo e relaxante' },
                { id: 'rain', label: 'Chuva Digital', desc: 'Dark mode com chuva' },
                { id: 'snow', label: 'Neve Caindo', desc: 'Inverno suave' },
                { id: 'fire', label: 'Chamas', desc: 'Intenso e quente' },
                { id: 'tech-grid', label: 'Grid Tech', desc: 'Futurista e técnico' },
                { id: 'pulse-red', label: 'Alerta Vermelho', desc: 'Para avisos urgentes' },
                { id: 'pulse-blue', label: 'Pulso Azul', desc: 'Tecnológico suave' },
                { id: 'pulse-green', label: 'Pulso Verde', desc: 'Status positivo' },
                { id: 'aurora', label: 'Aurora Boreal', desc: 'Místico e elegante' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    if (selectedWidget) {
                      updateWidgetData(selectedWidget, { backgroundAnimation: option.id });
                    } else {
                      const updated = [...display.pages];
                      updated[activePageIdx].backgroundAnimation = option.id as any;
                      updated[activePageIdx].backgroundImage = ''; 
                      updated[activePageIdx].backgroundVideoUrl = '';
                      setDisplay({...display, pages: updated});
                    }
                    setShowBgAnimModal(false);
                  }}
                  className={`group relative overflow-hidden rounded-xl border-2 transition-all h-32 flex flex-col items-center justify-center p-4 ${
                    ((selectedWidget ? currentWidget?.data.backgroundAnimation : activePage.backgroundAnimation) || '') === option.id 
                    ? 'border-cyan-500 ring-2 ring-cyan-500/20' 
                    : 'border-slate-800 hover:border-slate-600 hover:scale-[1.02]'
                  }`}
                >
                  <div className={`absolute inset-0 z-0 opacity-50 group-hover:opacity-80 transition-opacity ${getBackgroundAnimationClass(option.id)}`}></div>
                  
                  <div className="relative z-10 text-center">
                    <span className="block font-bold text-white text-sm drop-shadow-md mb-1">{option.label}</span>
                    <span className="block text-[10px] text-slate-300 drop-shadow-md">{option.desc}</span>
                  </div>
                  
                  {((selectedWidget ? currentWidget?.data.backgroundAnimation : activePage.backgroundAnimation) || '') === option.id && (
                    <div className="absolute top-2 right-2 z-20 bg-cyan-500 text-black rounded-full p-1 shadow-lg">
                      <CheckCircle2 size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isClearingScene && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2">Limpar Todos os Widgets?</h3>
            <p className="text-slate-400 text-sm mb-6">Todos os widgets desta cena serão removidos permanentemente. Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsClearingScene(false)}
                className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={clearAllWidgets}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors text-sm font-bold shadow-lg shadow-rose-900/20"
              >
                Sim, Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Layers Modal */}
      <LayersModal
        showLayersModal={showLayersModal}
        setShowLayersModal={setShowLayersModal}
        display={display}
        setDisplay={setDisplay}
        activePageIdx={activePageIdx}
        activePage={activePage}
        selectedWidget={selectedWidget}
        setSelectedWidget={setSelectedWidget}
        removeWidget={removeWidget}
      />

      {/* Scene Delete Modal */}
      {pageToDelete !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2">Excluir Cena {pageToDelete + 1}?</h3>
            <p className="text-slate-400 text-sm mb-6">Esta ação não pode ser desfeita. Todos os widgets desta cena serão perdidos.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setPageToDelete(null)}
                className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmRemovePage}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors text-sm font-bold shadow-lg shadow-rose-900/20"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-500/10 backdrop-blur-md text-emerald-400 px-6 py-3 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-3 border border-emerald-500/50">
            <CheckCircle2 size={18} className="fill-emerald-500/20" />
            <span className="font-bold text-sm tracking-wide">SALVO NA NUVEM</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <Toolbar
        display={display}
        activePage={activePage}
        isSaving={isSaving}
        handleSave={handleSave}
        showLeftSidebar={showLeftSidebar}
        setShowLeftSidebar={setShowLeftSidebar}
        showRightSidebar={showRightSidebar}
        setShowRightSidebar={setShowRightSidebar}
        setShowLayersModal={setShowLayersModal}
        onGoHome={() => navigate('/')}
      >
        <SceneTabs
          display={display}
          setDisplay={setDisplay}
          activePageIdx={activePageIdx}
          setActivePageIdx={setActivePageIdx}
          setSelectedWidget={setSelectedWidget}
          removePage={removePage}
        />
      </Toolbar>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Backdrop overlay for mobile sidebars */}
        {(showLeftSidebar || showRightSidebar) && (
          <div 
            className="fixed inset-0 bg-black/60 z-50 md:hidden animate-in fade-in duration-200" 
            onClick={() => { setShowLeftSidebar(false); setShowRightSidebar(false); }}
          />
        )}

        {/* Sidebar Left: Widget Library */}
        <WidgetLibrary
          display={display}
          activePage={activePage}
          activePageIdx={activePageIdx}
          setDisplay={setDisplay}
          selectedWidget={selectedWidget}
          setSelectedWidget={setSelectedWidget}
          addWidget={addWidget}
          setIsClearingScene={setIsClearingScene}
          setMediaLibraryConfig={setMediaLibraryConfig}
          setShowBgAnimModal={setShowBgAnimModal}
          showLeftSidebar={showLeftSidebar}
          setShowLeftSidebar={setShowLeftSidebar}
        />

        {/* Canvas Area */}
        <Canvas
          display={display}
          activePage={activePage}
          activePageIdx={activePageIdx}
          setDisplay={setDisplay}
          selectedWidget={selectedWidget}
          setSelectedWidget={setSelectedWidget}
          containerWidth={containerWidth}
          rowHeight={rowHeight}
          containerRef={containerRef}
          handleLayoutChange={handleLayoutChange}
          removeWidget={removeWidget}
        />

        {/* Sidebar Right: Properties Panel */}
        <PropertiesPanel
          selectedWidget={selectedWidget}
          currentWidget={currentWidget}
          updateWidgetData={updateWidgetData}
          removeWidget={removeWidget}
          showRightSidebar={showRightSidebar}
          setShowRightSidebar={setShowRightSidebar}
          setShowBgAnimModal={setShowBgAnimModal}
          setMediaLibraryConfig={setMediaLibraryConfig}
          setFullScreen={setFullScreen}
          activeMealDay={activeMealDay}
          setActiveMealDay={setActiveMealDay}
        />
      </div>

      {mediaLibraryConfig?.isOpen && (
        <MediaLibrary 
          onClose={() => setMediaLibraryConfig(null)} 
          onSelect={mediaLibraryConfig.onSelect}
          allowedTypes={mediaLibraryConfig.allowedTypes}
        />
      )}
    </div>
  );
};

export default Editor;
