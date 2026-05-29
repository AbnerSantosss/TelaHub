
import React, { useState, useEffect, useRef } from 'react';
import RGL, { WidthProvider } from 'react-grid-layout';
import {
  Plus, Trash2, X,
  Image as ImageIcon, Type, CloudSun, Clock, Calendar, CalendarDays,
  Settings, Layers, Move, Upload, Link as LinkIcon, CheckCircle2,
  Maximize2, Minimize2, Film, Info, Loader2, MonitorPlay, Rss, Globe, Gift, Search, Palette, Map, Layout, MoveHorizontal,
  FileText, ListTodo, Timer, ClipboardList, Utensils, TrendingUp, Code2, Database, StickyNote, Camera, BookOpen
} from 'lucide-react';
import { uploadMedia } from '../services/storage';
import { Page, WidgetType, LayoutItem, WidgetData } from '../types';
import { 
  LiveClock, WeatherWidget, RssFeed, FullInfoWidget,
  NotesWidget, TodoWidget, CountdownWidget, ChoresWidget, MealPlanWidget,
  MarketWatchWidget, BrowserSnapshotWidget, GoogleDocsWidget, OfficeDocsWidget,
  PowerBIWidget, EmbedHtmlWidget, AirtableWidget, PdfDocumentWidget,
  getAlignmentClasses
} from './Player';
import { SizeInput } from './SizeInput';
import { MediaLibrary } from './MediaLibrary';

const GridLayout = WidthProvider(RGL);

const isYouTubeUrl = (url: string) => {
  if (!url) return false;
  const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
  return regExp.test(url);
};

const getEmbedUrl = (url: string, config?: { autoplay?: boolean, mute?: boolean, loop?: boolean, controls?: boolean, youtubeQuality?: string }) => {
  if (!url) return '';
  const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[1].length === 11) {
    const videoId = match[1];
    const autoplay = config?.autoplay !== false ? 1 : 0;
    const mute = config?.mute !== false ? 1 : 0;
    const loop = config?.loop !== false ? 1 : 0;
    const controls = config?.controls === true ? 1 : 0;
    const quality = config?.youtubeQuality || 'highres';
    
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoplay}&mute=${mute}&loop=${loop}&playlist=${videoId}&controls=${controls}&disablekb=1&fs=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&showinfo=0&iv_load_policy=3&vq=${quality}`;
  }
  return url;
};

interface SceneEditorProps {
  page: Page;
  onChange: (page: Page) => void;
  orientation?: 'horizontal' | 'vertical';
}

const SceneEditor: React.FC<SceneEditorProps> = ({ page, onChange, orientation = 'horizontal' }) => {
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [showBgAnimModal, setShowBgAnimModal] = useState(false);
  const [mediaLibraryConfig, setMediaLibraryConfig] = useState<{ isOpen: boolean, onSelect: (url: string) => void, allowedTypes: 'image' | 'video' | 'all' } | null>(null);
  // Guarda as dimensões originais dos widgets antes de fullscreen
  const [originalSizes, setOriginalSizes] = useState<Record<string, { x: number; y: number; w: number; h: number }>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const GRID_COLS = 48;
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
  }, []);

  const handleLayoutChange = (layout: any[]) => {
    const updatedLayout = page.layout.map(w => {
      const item = layout.find(l => l.i === w.i);
      if (item) {
        return { ...w, x: item.x, y: item.y, w: item.w, h: item.h };
      }
      return w;
    });
    onChange({ ...page, layout: updatedLayout });
  };

  const addWidget = (type: WidgetType) => {
    let defaultWidth = 8;
    let defaultHeight = 6;

    if (type === WidgetType.VIDEO || type === WidgetType.IFRAME || type === WidgetType.CALENDAR || type === WidgetType.GIF || type === WidgetType.FULL_INFO) {
      defaultWidth = 12;
      defaultHeight = 8;
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

    const newWidget: LayoutItem = {
      i: Math.random().toString(36).substr(2, 9),
      x: 18,
      y: 10,
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
            { id: '2', chore: 'Organizar sala de reuniões', assignee: 'Mariana', day: 'Terça', done: true },
            { id: '3', chore: 'Repor suprimentos da copa', assignee: 'Roberto', day: 'Quarta', done: false }
          ]
        } : undefined,
        mealPlanConfig: type === WidgetType.MEAL_PLAN ? {
          title: '🍽️ Cardápio Semanal',
          days: {
            'Segunda': { breakfast: 'Ovos e Frutas', lunch: 'Frango Grelhado', dinner: 'Sopa de Legumes', snacks: 'Mix de Nozes' },
            'Terça': { breakfast: 'Tapioca e Café', lunch: 'Salmão Grelhado', dinner: 'Salada Completa', snacks: 'Iogurte Natural' },
            'Quarta': { breakfast: 'Panqueca de Aveia', lunch: 'Carne Grelhada', dinner: 'Omelete Recheado', snacks: 'Fruta Picada' }
          }
        } : undefined,
        marketWatchConfig: type === WidgetType.MARKET_WATCH ? {
          title: '📈 Mercado Financeiro',
          symbols: ['AAPL', 'MSFT', 'BTC-USD', 'ETH-USD', 'IBOV'],
          layout: 'grid'
        } : undefined,
        browserSnapshotConfig: type === WidgetType.BROWSER_SNAPSHOT ? {
          url: 'https://news.ycombinator.com',
          updateIntervalMinutes: 10
        } : undefined,
        googleDocsConfig: type === WidgetType.GOOGLE_DOCS ? {
          url: 'https://docs.google.com/document/d/1t1Vp0-7XnJ83l446N-K9V_Y3bU6E0lG4sKzF5Ea82s0/edit',
          docType: 'document'
        } : undefined,
        officeDocsConfig: type === WidgetType.OFFICE_DOCS ? {
          url: 'https://onedrive.live.com/embed?resid=E44A1234567890!102&authkey=!AJxK89abcdefg',
          docType: 'word'
        } : undefined,
        powerBiConfig: type === WidgetType.POWER_BI ? {
          embedUrl: 'https://app.powerbi.com/view?r=eyJrIjoi...'
        } : undefined,
        embedWebsiteConfig: type === WidgetType.IFRAME ? {
          url: 'https://www.wikipedia.org',
          interactive: true
        } : undefined,
        embedHtmlConfig: type === WidgetType.EMBED_HTML ? {
          html: '<div style="padding: 20px; text-align: center; background: linear-gradient(135deg, #1e1b4b, #311042); color: #fff; border-radius: 12px; font-family: sans-serif; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center;">\n  <h2 style="margin-top:0; color: #22d3ee; margin-bottom: 8px;">HTML Customizado 🚀</h2>\n  <p style="margin-bottom: 12px;">Edite este bloco digitando qualquer código HTML ou JS no painel lateral!</p>\n  <span style="font-size: 32px;">💻</span>\n</div>'
        } : undefined,
        airtableConfig: type === WidgetType.AIRTABLE ? {
          shareUrl: 'https://airtable.com/embed/shr...'
        } : undefined,
        pdfDocumentConfig: type === WidgetType.PDF_DOCUMENT ? {
          pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
        } : undefined
      }
    };

    onChange({ ...page, layout: [...page.layout, newWidget] });
    setSelectedWidget(newWidget.i);
  };

  const removeWidget = (wId: string) => {
    onChange({ ...page, layout: page.layout.filter(w => w.i !== wId) });
    setSelectedWidget(null);
  };

  const updateWidgetData = (wId: string, dataUpdates: Partial<WidgetData>) => {
    const updatedLayout = page.layout.map(w => {
      if (w.i === wId) {
        return { ...w, data: { ...w.data, ...dataUpdates } };
      }
      return w;
    });
    onChange({ ...page, layout: updatedLayout });
  };

  const setFullScreen = (wId: string) => {
    const widget = page.layout.find(w => w.i === wId);
    if (!widget) return;

    // Salva as dimensões originais antes de expandir
    setOriginalSizes(prev => ({
      ...prev,
      [wId]: { x: widget.x, y: widget.y, w: widget.w, h: widget.h }
    }));

    // Calculate required height in grid units to fill the container
    const containerHeight = containerRef.current?.clientHeight || 0;
    const requiredRows = containerHeight > 0 && rowHeight > 0 ? Math.ceil(containerHeight / rowHeight) : 27;

    const fullScreenWidget = {
      ...widget,
      x: 0,
      y: 0,
      w: GRID_COLS,
      h: requiredRows
    };

    // Mantém os outros widgets e apenas atualiza este
    const updatedLayout = page.layout.map(w => w.i === wId ? fullScreenWidget : w);
    onChange({ ...page, layout: updatedLayout });
  };

  const restoreSize = (wId: string) => {
    const saved = originalSizes[wId];
    if (!saved) return;

    const updatedLayout = page.layout.map(w =>
      w.i === wId ? { ...w, ...saved } : w
    );
    onChange({ ...page, layout: updatedLayout });

    // Remove do mapa de dimensões salvas
    setOriginalSizes(prev => {
      const next = { ...prev };
      delete next[wId];
      return next;
    });
  };

  const currentWidget = page.layout.find(w => w.i === selectedWidget);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl">

      {/* TOOLBAR */}
      <div className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-3 flex items-center justify-between z-30">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {/* Básicos */}
          <WidgetTool icon={<ImageIcon size={18} />} label="Imagem" onClick={() => addWidget(WidgetType.IMAGE)} />
          <WidgetTool icon={<Film size={18} />} label="Vídeo" onClick={() => addWidget(WidgetType.VIDEO)} />
          <WidgetTool icon={<Type size={18} />} label="Texto" onClick={() => addWidget(WidgetType.TEXT)} />
          <WidgetTool icon={<Gift size={18} />} label="GIF" onClick={() => addWidget(WidgetType.GIF)} />
          <WidgetTool icon={<Globe size={18} />} label="Web" onClick={() => addWidget(WidgetType.IFRAME)} />

          <div className="w-px h-6 bg-slate-800 mx-1 flex-shrink-0"></div>

          {/* Utilitários */}
          <WidgetTool icon={<Clock size={18} />} label="Relógio" onClick={() => addWidget(WidgetType.CLOCK)} />
          <WidgetTool icon={<CloudSun size={18} />} label="Clima" onClick={() => addWidget(WidgetType.WEATHER)} />
          <WidgetTool icon={<Layout size={18} />} label="Completo" onClick={() => addWidget(WidgetType.FULL_INFO)} />
          <WidgetTool icon={<Rss size={18} />} label="RSS" onClick={() => addWidget(WidgetType.RSS)} />
          <WidgetTool icon={<Calendar size={18} />} label="Agenda" onClick={() => addWidget(WidgetType.CALENDAR)} />

          <div className="w-px h-6 bg-slate-800 mx-1 flex-shrink-0"></div>

          {/* Interativos */}
          <WidgetTool icon={<StickyNote size={18} className="text-yellow-400" />} label="Notas" onClick={() => addWidget(WidgetType.NOTES)} />
          <WidgetTool icon={<ListTodo size={18} className="text-emerald-400" />} label="Tarefas" onClick={() => addWidget(WidgetType.TODO)} />
          <WidgetTool icon={<Timer size={18} className="text-rose-400" />} label="Contador" onClick={() => addWidget(WidgetType.COUNTDOWN)} />
          <WidgetTool icon={<ClipboardList size={18} className="text-[#7C3AED]" />} label="Deveres" onClick={() => addWidget(WidgetType.CHORES)} />
          <WidgetTool icon={<Utensils size={18} className="text-amber-400" />} label="Meal Plan" onClick={() => addWidget(WidgetType.MEAL_PLAN)} />

          <div className="w-px h-6 bg-slate-800 mx-1 flex-shrink-0"></div>

          {/* Integrações */}
          <WidgetTool icon={<TrendingUp size={18} className="text-green-400" />} label="Bolsa" onClick={() => addWidget(WidgetType.MARKET_WATCH)} />
          <WidgetTool icon={<Camera size={18} className="text-blue-400" />} label="Snapshot" onClick={() => addWidget(WidgetType.BROWSER_SNAPSHOT)} />
          <WidgetTool icon={<FileText size={18} className="text-[#7C3AED]" />} label="G Docs" onClick={() => addWidget(WidgetType.GOOGLE_DOCS)} />
          <WidgetTool icon={<BookOpen size={18} className="text-blue-500" />} label="Office Docs" onClick={() => addWidget(WidgetType.OFFICE_DOCS)} />
          <WidgetTool icon={<Layout size={18} className="text-amber-500" />} label="Power BI" onClick={() => addWidget(WidgetType.POWER_BI)} />
          <WidgetTool icon={<Database size={18} className="text-rose-500" />} label="Airtable" onClick={() => addWidget(WidgetType.AIRTABLE)} />
          <WidgetTool icon={<FileText size={18} className="text-red-500" />} label="PDF" onClick={() => addWidget(WidgetType.PDF_DOCUMENT)} />
          <WidgetTool icon={<Code2 size={18} className="text-indigo-400" />} label="HTML" onClick={() => addWidget(WidgetType.EMBED_HTML)} />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setMediaLibraryConfig({
                isOpen: true,
                allowedTypes: 'image',
                onSelect: (url) => {
                  onChange({ ...page, backgroundImage: url, backgroundVideoUrl: '' });
                }
              });
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all flex items-center gap-2 text-xs font-bold border border-slate-700"
            title="Mudar Fundo"
          >
            <Layers size={14} /> <span className="hidden sm:inline">Fundo</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">

        {/* CANVAS AREA */}
        <div className="flex-1 overflow-auto bg-slate-950 p-8 flex items-center justify-center custom-scrollbar relative">
          {/* Grid Background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
            backgroundImage: `radial-gradient(#fff 1px, transparent 1px)`,
            backgroundSize: `${rowHeight}px ${rowHeight}px`
          }}></div>

          <div
            ref={containerRef}
            data-canvas-ref
            className={`relative bg-black shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-slate-800 overflow-hidden shrink-0 ${
              orientation === 'vertical' ? 'h-full w-auto' : 'w-full'
            }`}
            style={{
              ...(orientation === 'vertical'
                ? { maxHeight: '100%', aspectRatio: '9/16' }
                : { maxWidth: '1200px', aspectRatio: '16/9' }
              ),
              backgroundImage: page.backgroundImage ? `url(${page.backgroundImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <GridLayout
              className="layout"
              layout={page.layout.map(w => ({ i: w.i, x: w.x, y: w.y, w: w.w, h: w.h }))}
              cols={GRID_COLS}
              rowHeight={rowHeight}
              margin={[0, 0]}
              onLayoutChange={handleLayoutChange}
              draggableHandle=".drag-handle"
              resizeHandle={<div className="absolute bottom-0 right-0 p-1 cursor-se-resize text-[#7C3AED] opacity-0 group-hover:opacity-100 transition-opacity"><MoveHorizontal size={12} /></div>}
            >
              {page.layout.map(w => (
                <div
                  key={w.i}
                  className={`group relative border transition-all ${selectedWidget === w.i ? 'border-[#7C3AED] ring-2 ring-cyan-500/20 z-20' : 'border-transparent hover:border-slate-700'}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedWidget(w.i); }}
                >
                  <div className="drag-handle absolute top-0 left-0 w-full h-4 bg-slate-900/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 cursor-move flex items-center justify-center z-10 transition-opacity">
                    <div className="w-8 h-1 bg-slate-700 rounded-full"></div>
                  </div>

                  {w.data.fullScreenMode && (
                    <div className="absolute top-5 right-2 z-30 bg-cyan-950/80 border border-[#7C3AED]/50 backdrop-blur-sm text-[#7C3AED] text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.3)] pointer-events-none animate-pulse flex items-center gap-1">
                      <span>📺 Tela Cheia</span>
                    </div>
                  )}

                  {/* Background Image Layer for fullscreen widgets */}
                  {w.data.fullScreenMode && w.data.backgroundImage && (
                    <div 
                      className="absolute inset-0 z-0 bg-center bg-no-repeat pointer-events-none"
                      style={{
                        backgroundImage: `url(${w.data.backgroundImage})`,
                        backgroundSize: 'cover',
                      }}
                    />
                  )}

                  <div 
                    className={`w-full h-full overflow-hidden pointer-events-none select-none flex relative z-[1] ${getAlignmentClasses(w.data.fillContainer ? 'stretch' : w.data.contentAlignment)}`}
                    style={{ padding: w.data.padding || undefined, margin: w.data.margin || undefined }}
                  >
                    {renderWidgetPreview(w)}
                  </div>

                  {selectedWidget === w.i && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeWidget(w.i); }}
                      className="absolute -top-2 -right-2 p-1.5 bg-rose-600 text-white rounded-full shadow-lg hover:bg-rose-500 transition-all z-30"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </GridLayout>
          </div>
        </div>

        {/* PROPERTIES PANEL */}
        {selectedWidget && currentWidget && (
          <>
            {/* Backdrop overlay for mobile properties panel */}
            <div 
              className="fixed inset-0 bg-black/60 z-30 md:hidden animate-in fade-in duration-200" 
              onClick={() => setSelectedWidget(null)}
            />
            <div className="absolute md:relative right-0 top-0 h-full w-80 bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto custom-scrollbar z-40 shadow-2xl transition-all duration-300 animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Settings size={14} className="text-[#7C3AED]" /> Propriedades
                </h3>
                <button onClick={() => setSelectedWidget(null)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Common Properties */}
                {renderWidgetControls(currentWidget, updateWidgetData, setMediaLibraryConfig, setFullScreen, restoreSize, originalSizes, page, onChange)}
              </div>
            </div>
          </>
        )}
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

// Helper Components
const WidgetTool: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void }> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-1 p-2 min-w-[60px] bg-slate-800/50 hover:bg-indigo-600 hover:text-white text-slate-400 rounded-xl transition-all border border-slate-800 hover:border-indigo-500 group"
  >
    <div className="group-hover:scale-110 transition-transform">{icon}</div>
    <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

const renderWidgetPreview = (w: LayoutItem) => {
  switch (w.type) {
    case WidgetType.TEXT:
      return (
        <div 
          className="w-full h-full flex"
          style={{ 
            alignItems: (w.data.fillContainer || w.data.contentAlignment === 'stretch') ? 'stretch' : w.data.contentAlignment === 'start' ? 'flex-start' : w.data.contentAlignment === 'end' ? 'flex-end' : 'center',
            justifyContent: (w.data.fillContainer || w.data.contentAlignment === 'stretch') ? 'stretch' : w.data.contentAlignment === 'start' ? 'flex-start' : w.data.contentAlignment === 'end' ? 'flex-end' : w.data.textConfig?.textAlign === 'left' ? 'flex-start' : w.data.textConfig?.textAlign === 'right' ? 'flex-end' : 'center',
            padding: w.data.padding !== undefined ? w.data.padding : '0.5rem',
          }}
        >
          <p 
            className="font-bold pointer-events-none select-none break-words overflow-hidden leading-tight drop-shadow-lg" 
            style={{ 
              color: w.data.color, 
              fontSize: w.data.textConfig?.fontSize || w.data.fontSize || 'inherit',
              textAlign: w.data.textConfig?.textAlign || 'center',
              width: '100%'
            }}
          >
            {w.data.content}
          </p>
        </div>
      );
    case WidgetType.IMAGE:
      return w.data.url ? (
        <div className={`w-full h-full flex ${getAlignmentClasses(w.data.fillContainer ? 'stretch' : w.data.contentAlignment)} overflow-hidden`}>
          <img 
            src={w.data.url} 
            className="pointer-events-none select-none w-full h-full" 
            style={{ 
              width: '100%', 
              height: '100%',
              objectFit: (w.data.fillContainer || w.data.fitContainerMode === 'stretch') ? 'fill' : (w.data.fitContainerMode || w.data.imageConfig?.objectFit || 'cover'),
              transform: `scale(${w.data.imageConfig?.scale || 1})`,
              transformOrigin: 'center'
            }} 
            alt="Preview" 
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full">
          <ImageIcon className="text-slate-700 mb-2" size={32} />
          <span className="text-[10px] text-slate-600 font-bold uppercase">Imagem</span>
        </div>
      );
    case WidgetType.GIF:
      return w.data.url ? (
        <div className={`w-full h-full relative bg-black/20 flex ${getAlignmentClasses(w.data.fillContainer ? 'stretch' : w.data.contentAlignment)}`}>
           <img 
             src={w.data.url} 
             className="pointer-events-none select-none w-full h-full"
             style={{
               width: '100%',
               height: '100%',
               objectFit: (w.data.fillContainer || w.data.fitContainerMode === 'stretch') ? 'fill' : (w.data.fitContainerMode || 'contain')
             }}
             alt="GIF Preview"
           />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full">
          <Gift className="text-slate-700 mb-2" size={32} />
          <span className="text-[10px] text-slate-600 font-bold uppercase">GIF</span>
        </div>
      );
    case WidgetType.CLOCK:
      return <div className="w-full h-full overflow-hidden"><LiveClock city={w.data.city || ''} model={w.data.model || 'standard'} fontSize={w.data.fontSize?.replace('vw', '')} /></div>;
    case WidgetType.WEATHER:
      return <div className="w-full h-full overflow-hidden"><WeatherWidget city={w.data.city || ''} model={w.data.model || 'simple'} /></div>;
    case WidgetType.FULL_INFO:
      return <div className="w-full h-full overflow-hidden"><FullInfoWidget city={w.data.city || ''} backgroundImage={w.data.backgroundImage} backgroundAnimation={w.data.backgroundAnimation} model={w.data.model} textSize={w.data.textSize} numberSize={w.data.numberSize} transparentBackground={w.data.transparentBackground} backgroundColor={w.data.backgroundColor} /></div>;
    case WidgetType.VIDEO:
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 pointer-events-none relative overflow-hidden">
            {w.data.videoUrl ? (
              isYouTubeUrl(w.data.videoUrl) ? (
                <iframe
                  src={getEmbedUrl(w.data.videoUrl, w.data.videoConfig)}
                  className="w-full h-full pointer-events-none"
                  style={{
                    border: 'none',
                    transform: `scale(${w.data.scale || 1.05})`,
                    transformOrigin: 'center'
                  }}
                  allow="autoplay; encrypted-media"
                  title="YouTube Video Preview"
                />
              ) : (
                <video 
                  src={w.data.videoUrl} 
                  className="w-full h-full opacity-80" 
                  style={{
                    objectFit: (w.data.fillContainer || w.data.fitContainerMode === 'stretch') ? 'fill' : (w.data.fitContainerMode || 'cover')
                  }}
                  autoPlay={w.data.videoConfig?.autoplay !== false}
                  muted={w.data.videoConfig?.mute !== false}
                  loop={w.data.videoConfig?.loop !== false}
                  controls={w.data.videoConfig?.controls === true}
                />
              )
            ) : (
              <>
                <Film className="text-slate-700 mb-2" size={32} />
                <span className="text-[10px] uppercase text-slate-600 font-bold">Vídeo Player</span>
              </>
            )}
            <div className="absolute inset-0 z-10 bg-transparent"></div>
         </div>
      );
    case WidgetType.RSS:
      return <div className="w-full h-full bg-slate-900/50 p-2 overflow-hidden text-[8px] text-slate-500">RSS Feed: {w.data.rssUrl}</div>;
    case WidgetType.NOTES:
      return <div className="w-full h-full overflow-hidden"><NotesWidget data={w.data} /></div>;
    case WidgetType.TODO:
      return <div className="w-full h-full overflow-hidden"><TodoWidget data={w.data} /></div>;
    case WidgetType.COUNTDOWN:
      return <div className="w-full h-full overflow-hidden"><CountdownWidget data={w.data} /></div>;
    case WidgetType.CHORES:
      return <div className="w-full h-full overflow-hidden"><ChoresWidget data={w.data} /></div>;
    case WidgetType.MEAL_PLAN:
      return <div className="w-full h-full overflow-hidden"><MealPlanWidget data={w.data} /></div>;
    case WidgetType.MARKET_WATCH:
      return <div className="w-full h-full overflow-hidden"><MarketWatchWidget data={w.data} /></div>;
    case WidgetType.BROWSER_SNAPSHOT:
      return <div className="w-full h-full overflow-hidden"><BrowserSnapshotWidget data={w.data} /></div>;
    case WidgetType.GOOGLE_DOCS:
      return <div className="w-full h-full overflow-hidden"><GoogleDocsWidget data={w.data} /></div>;
    case WidgetType.OFFICE_DOCS:
      return <div className="w-full h-full overflow-hidden"><OfficeDocsWidget data={w.data} /></div>;
    case WidgetType.POWER_BI:
      return <div className="w-full h-full overflow-hidden"><PowerBIWidget data={w.data} /></div>;
    case WidgetType.EMBED_HTML:
      return <div className="w-full h-full overflow-hidden"><EmbedHtmlWidget data={w.data} /></div>;
    case WidgetType.AIRTABLE:
      return <div className="w-full h-full overflow-hidden"><AirtableWidget data={w.data} /></div>;
    case WidgetType.PDF_DOCUMENT:
      return <div className="w-full h-full overflow-hidden"><PdfDocumentWidget data={w.data} /></div>;
    default:
      return <div className="w-full h-full bg-slate-900 flex items-center justify-center text-[10px] text-slate-600 uppercase font-bold">{w.type}</div>;
  }
};

const renderWidgetControls = (
  w: LayoutItem,
  updateData: (id: string, updates: any) => void,
  setMediaLibraryConfig: (config: any) => void,
  setFullScreen: (id: string) => void,
  restoreSize: (id: string) => void,
  originalSizes: Record<string, { x: number; y: number; w: number; h: number }>,
  page: Page,
  onChange: (page: Page) => void
) => {
  const isFullscreen = !!originalSizes[w.i];
  // Simplified controls for the prototype
  return (
    <div className="space-y-4">
      {w.type === WidgetType.TEXT && (
        <>
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Conteúdo</label>
            <textarea
              value={w.data.content}
              onChange={e => updateData(w.i, { content: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED] h-24"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-2">
            <SizeInput 
              label="Tamanho da Fonte"
              value={w.data.textConfig?.fontSize || w.data.fontSize}
              onChange={(val) => updateData(w.i, { 
                textConfig: { ...(w.data.textConfig || {}), fontSize: val },
                fontSize: val 
              })}
              placeholder="4cqw"
              step={0.5}
              isFont={true}
            />
            
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Cor do Texto</label>
              <div className="flex gap-2 h-[38px]">
                <input
                  type="color"
                  value={w.data.color || '#ffffff'}
                  onChange={e => updateData(w.i, { color: e.target.value })}
                  className="h-full w-10 bg-transparent border-0 cursor-pointer rounded overflow-hidden p-0"
                />
                <input 
                  type="text" 
                  value={w.data.color || '#ffffff'} 
                  onChange={e => updateData(w.i, { color: e.target.value })} 
                  className="w-full bg-slate-950 border border-slate-700 rounded text-[10px] text-slate-300 px-2 uppercase font-mono outline-none focus:border-[#7C3AED]" 
                />
              </div>
            </div>
          </div>
        </>
      )}
      {w.type === WidgetType.IMAGE && (
        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">URL da Imagem</label>
          <input
            type="text"
            value={w.data.url}
            onChange={e => updateData(w.i, { url: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED] mb-2"
          />
          <button
            onClick={() => {
              setMediaLibraryConfig({
                isOpen: true,
                allowedTypes: 'image',
                onSelect: (url: string) => {
                  updateData(w.i, { url: url });
                }
              });
            }}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-2"
          >
            <Upload size={12} />
            Selecionar Imagem
          </button>
        </div>
      )}
      {w.type === WidgetType.VIDEO && (
        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">URL do Vídeo</label>
          <input
            type="text"
            value={w.data.videoUrl}
            onChange={e => updateData(w.i, { videoUrl: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED] mb-2"
          />
          <button
            onClick={() => {
              setMediaLibraryConfig({
                isOpen: true,
                allowedTypes: 'video',
                onSelect: (url: string) => {
                  updateData(w.i, { videoUrl: url });
                }
              });
            }}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-2"
          >
            <Upload size={12} />
            Selecionar Vídeo
          </button>
        </div>
      )}
      {(w.type === WidgetType.WEATHER || w.type === WidgetType.CLOCK || w.type === WidgetType.FULL_INFO) && (
        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Cidade</label>
          <input
            type="text"
            value={w.data.city}
            onChange={e => updateData(w.i, { city: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED] mb-2"
          />
          {w.type === WidgetType.FULL_INFO && (
            <>
              <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Modelo Visual</label>
              <select
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED] mb-2"
                value={w.data.model || 'standard'}
                onChange={(e) => updateData(w.i, { model: e.target.value })}
              >
                <option value="standard">Padrão</option>
                <option value="minimal">Minimalista</option>
                <option value="glass">Glassmorphism</option>
                <option value="modern">Moderno (Dividido)</option>
              </select>

              <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Imagem de Fundo (Opcional)</label>
              <input
                type="text"
                value={w.data.backgroundImage || ''}
                onChange={e => updateData(w.i, { backgroundImage: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
                placeholder="URL da imagem (ex: https://...)"
              />

              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                {!isFullscreen ? (
                  <button
                    onClick={() => setFullScreen(w.i)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                  >
                    <Maximize2 size={14} />
                    Preencher Tela Inteira
                  </button>
                ) : (
                  <button
                    onClick={() => restoreSize(w.i)}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2"
                  >
                    <Minimize2 size={14} />
                    Restaurar Tamanho
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {w.type === WidgetType.VIDEO && (
        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Link YouTube</label>
          <input
            type="text"
            value={w.data.videoUrl}
            onChange={e => updateData(w.i, { videoUrl: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
          />

          <div className="mt-3">
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Qualidade YouTube</label>
            <select
              value={w.data.videoConfig?.youtubeQuality || 'highres'}
              onChange={(e) => updateData(w.i, { videoConfig: { ...w.data.videoConfig, youtubeQuality: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
            >
              <option value="highres">Máxima (Auto)</option>
              <option value="hd1080">1080p</option>
              <option value="hd720">720p</option>
              <option value="large">480p</option>
              <option value="medium">360p</option>
              <option value="small">240p</option>
            </select>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
            {!isFullscreen ? (
              <button
                onClick={() => setFullScreen(w.i)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
              >
                <Maximize2 size={14} />
                Preencher Tela Inteira
              </button>
            ) : (
              <button
                onClick={() => restoreSize(w.i)}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2"
              >
                <Minimize2 size={14} />
                Restaurar Tamanho
              </button>
            )}
          </div>
        </div>
      )}
      {w.type === WidgetType.RSS && (
        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">URL do Feed RSS</label>
          <input
            type="text"
            value={w.data.rssUrl}
            onChange={e => updateData(w.i, { rssUrl: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
          />
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
            {!isFullscreen ? (
              <button
                onClick={() => setFullScreen(w.i)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
              >
                <Maximize2 size={14} />
                Preencher Tela Inteira
              </button>
            ) : (
              <button
                onClick={() => restoreSize(w.i)}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2"
              >
                <Minimize2 size={14} />
                Restaurar Tamanho
              </button>
            )}
          </div>
        </div>
      )}

      {w.type === WidgetType.NOTES && (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Recado / Conteúdo</label>
            <textarea
              value={w.data.content || ''}
              onChange={e => updateData(w.i, { content: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED] h-28"
              placeholder="Digite o recado aqui..."
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Tema do Bloco</label>
            <select
              value={w.data.notesConfig?.paperTheme || 'glass'}
              onChange={e => updateData(w.i, { notesConfig: { ...w.data.notesConfig, paperTheme: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
            >
              <option value="glass">Glassmorphism (Translúcido)</option>
              <option value="yellow-sticky">Post-it Amarelo</option>
              <option value="purple-haze">Purple Haze (Neon Roxo)</option>
              <option value="neon-glow">Cyberpunk Neon</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Fonte</label>
            <select
              value={w.data.notesConfig?.fontFamily || 'sans'}
              onChange={e => updateData(w.i, { notesConfig: { ...w.data.notesConfig, fontFamily: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
            >
              <option value="sans">Sans-serif (Moderna)</option>
              <option value="serif">Serif (Clássica)</option>
              <option value="mono">Monospace (Código)</option>
              <option value="display">Display (Negrito)</option>
            </select>
          </div>
          <SizeInput 
            label="Tamanho da Fonte"
            value={w.data.notesConfig?.fontSize}
            onChange={(val) => updateData(w.i, { notesConfig: { ...w.data.notesConfig, fontSize: val } })}
            placeholder="16px"
            isFont={true}
          />
        </div>
      )}

      {w.type === WidgetType.TODO && (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Título da Lista</label>
            <input
              type="text"
              value={w.data.todoConfig?.title || 'Lista de Tarefas'}
              onChange={e => updateData(w.i, { todoConfig: { ...w.data.todoConfig, title: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Adicionar Tarefa</label>
            <div className="flex gap-2">
              <input
                type="text"
                id={`new-todo-${w.i}`}
                placeholder="Nova tarefa..."
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const input = e.currentTarget;
                    if (input.value.trim()) {
                      const items = w.data.todoConfig?.items || [];
                      const newItem = { id: Math.random().toString(36).substr(2, 9), text: input.value.trim(), done: false };
                      updateData(w.i, { todoConfig: { ...w.data.todoConfig, items: [...items, newItem] } });
                      input.value = '';
                    }
                  }
                }}
                className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
              />
              <button
                onClick={() => {
                  const input = document.getElementById(`new-todo-${w.i}`) as HTMLInputElement;
                  if (input && input.value.trim()) {
                    const items = w.data.todoConfig?.items || [];
                    const newItem = { id: Math.random().toString(36).substr(2, 9), text: input.value.trim(), done: false };
                    updateData(w.i, { todoConfig: { ...w.data.todoConfig, items: [...items, newItem] } });
                    input.value = '';
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-500 px-3 rounded text-white text-xs font-bold"
              >
                +
              </button>
            </div>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            <label className="text-[9px] font-black text-slate-500 uppercase block">Tarefas ({w.data.todoConfig?.items?.length || 0})</label>
            {(w.data.todoConfig?.items || []).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between bg-slate-900/60 p-2 rounded border border-slate-800 gap-2">
                <div className="flex items-center gap-2 truncate">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={e => {
                      const items = w.data.todoConfig.items.map((i: any) => i.id === item.id ? { ...i, done: e.target.checked } : i);
                      updateData(w.i, { todoConfig: { ...w.data.todoConfig, items } });
                    }}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className={`text-xs truncate ${item.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>{item.text}</span>
                </div>
                <button
                  onClick={() => {
                    const items = w.data.todoConfig.items.filter((i: any) => i.id !== item.id);
                    updateData(w.i, { todoConfig: { ...w.data.todoConfig, items } });
                  }}
                  className="text-rose-400 hover:text-rose-300 transition-colors shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {w.type === WidgetType.COUNTDOWN && (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Título</label>
            <input
              type="text"
              value={w.data.countdownConfig?.title || ''}
              onChange={e => updateData(w.i, { countdownConfig: { ...w.data.countdownConfig, title: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
              placeholder="Ex: Lançamento"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Data Alvo</label>
            <input
              type="datetime-local"
              value={w.data.countdownConfig?.targetDate || ''}
              onChange={e => updateData(w.i, { countdownConfig: { ...w.data.countdownConfig, targetDate: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Mensagem ao Terminar</label>
            <input
              type="text"
              value={w.data.countdownConfig?.expiredMessage || ''}
              onChange={e => updateData(w.i, { countdownConfig: { ...w.data.countdownConfig, expiredMessage: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
              placeholder="Ex: Chegou o momento!"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Tema</label>
            <select
              value={w.data.countdownConfig?.theme || 'glass'}
              onChange={e => updateData(w.i, { countdownConfig: { ...w.data.countdownConfig, theme: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
            >
              <option value="glass">Glassmorphism</option>
              <option value="neon">Neon Vermelho</option>
              <option value="bold-gradient">Gradiente Forte</option>
              <option value="minimal">Minimalista</option>
            </select>
          </div>
        </div>
      )}

      {w.type === WidgetType.CHORES && (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Título</label>
            <input
              type="text"
              value={w.data.choresConfig?.title || ''}
              onChange={e => updateData(w.i, { choresConfig: { ...w.data.choresConfig, title: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
            />
          </div>
          
          <div className="bg-slate-900/40 p-2 rounded border border-slate-800 space-y-2">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Adicionar Dever</span>
            <input
              type="text"
              id={`new-chore-text-${w.i}`}
              placeholder="Nome da atividade..."
              className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white outline-none focus:border-[#7C3AED]"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                id={`new-chore-assignee-${w.i}`}
                placeholder="Responsável..."
                className="bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white outline-none focus:border-[#7C3AED]"
              />
              <select
                id={`new-chore-day-${w.i}`}
                className="bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white outline-none focus:border-[#7C3AED]"
              >
                <option value="Segunda">Segunda</option>
                <option value="Terça">Terça</option>
                <option value="Quarta">Quarta</option>
                <option value="Quinta">Quinta</option>
                <option value="Sexta">Sexta</option>
                <option value="Sábado">Sábado</option>
                <option value="Domingo">Domingo</option>
              </select>
            </div>
            <button
              onClick={() => {
                const textInput = document.getElementById(`new-chore-text-${w.i}`) as HTMLInputElement;
                const assInput = document.getElementById(`new-chore-assignee-${w.i}`) as HTMLInputElement;
                const daySelect = document.getElementById(`new-chore-day-${w.i}`) as HTMLSelectElement;
                if (textInput?.value.trim() && assInput?.value.trim()) {
                  const items = w.data.choresConfig?.items || [];
                  const newItem = {
                    id: Math.random().toString(36).substr(2, 9),
                    chore: textInput.value.trim(),
                    assignee: assInput.value.trim(),
                    day: daySelect.value,
                    done: false
                  };
                  updateData(w.i, { choresConfig: { ...w.data.choresConfig, items: [...items, newItem] } });
                  textInput.value = '';
                  assInput.value = '';
                }
              }}
              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-white text-xs font-bold transition-colors"
            >
              Adicionar
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            <label className="text-[9px] font-black text-slate-500 uppercase block">Lista de Deveres</label>
            {(w.data.choresConfig?.items || []).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between bg-slate-900/60 p-2 rounded border border-slate-800 gap-2 text-xs">
                <div className="truncate flex-1">
                  <div className="font-semibold text-slate-200 truncate">{item.chore}</div>
                  <div className="text-[9px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="bg-slate-850 px-1 py-0.5 rounded text-indigo-400 font-bold">{item.assignee}</span>
                    <span>•</span>
                    <span>{item.day}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={e => {
                      const items = w.data.choresConfig.items.map((i: any) => i.id === item.id ? { ...i, done: e.target.checked } : i);
                      updateData(w.i, { choresConfig: { ...w.data.choresConfig, items } });
                    }}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => {
                      const items = w.data.choresConfig.items.filter((i: any) => i.id !== item.id);
                      updateData(w.i, { choresConfig: { ...w.data.choresConfig, items } });
                    }}
                    className="text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {w.type === WidgetType.MEAL_PLAN && (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Título</label>
            <input
              type="text"
              value={w.data.mealPlanConfig?.title || ''}
              onChange={e => updateData(w.i, { mealPlanConfig: { ...w.data.mealPlanConfig, title: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
            />
          </div>
          
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Dia para Editar</label>
            <select
              id={`meal-day-selector-${w.i}`}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
              defaultValue="Segunda"
              onChange={() => {
                updateData(w.i, {}); 
              }}
            >
              <option value="Segunda">Segunda-feira</option>
              <option value="Terça">Terça-feira</option>
              <option value="Quarta">Quarta-feira</option>
              <option value="Quinta">Quinta-feira</option>
              <option value="Sexta">Sexta-feira</option>
              <option value="Sábado">Sábado</option>
              <option value="Domingo">Domingo</option>
            </select>
          </div>

          {(() => {
            const select = document.getElementById(`meal-day-selector-${w.i}`) as HTMLSelectElement;
            const currentDay = select?.value || 'Segunda';
            const daysData = w.data.mealPlanConfig?.days || {};
            const dayMeal = daysData[currentDay] || {};

            const updateMeal = (mealKey: string, val: string) => {
              const updatedDays = {
                ...daysData,
                [currentDay]: {
                  ...dayMeal,
                  [mealKey]: val
                }
              };
              updateData(w.i, { mealPlanConfig: { ...w.data.mealPlanConfig, days: updatedDays } });
            };

            return (
              <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800 space-y-2">
                <span className="text-[9px] font-black text-[#7C3AED] uppercase block">Refeições de {currentDay}</span>
                <div>
                  <label className="text-[8px] text-slate-400 block mb-0.5">Café da Manhã</label>
                  <input
                    type="text"
                    value={dayMeal.breakfast || ''}
                    onChange={e => updateMeal('breakfast', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white outline-none focus:border-[#7C3AED]"
                    placeholder="Ex: Ovos, Pão e Café"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-slate-400 block mb-0.5">Almoço</label>
                  <input
                    type="text"
                    value={dayMeal.lunch || ''}
                    onChange={e => updateMeal('lunch', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white outline-none focus:border-[#7C3AED]"
                    placeholder="Ex: Frango com Salada e Arroz"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-slate-400 block mb-0.5">Jantar</label>
                  <input
                    type="text"
                    value={dayMeal.dinner || ''}
                    onChange={e => updateMeal('dinner', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white outline-none focus:border-[#7C3AED]"
                    placeholder="Ex: Sopa leve"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-slate-400 block mb-0.5">Lanches</label>
                  <input
                    type="text"
                    value={dayMeal.snacks || ''}
                    onChange={e => updateMeal('snacks', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white outline-none focus:border-[#7C3AED]"
                    placeholder="Ex: Frutas ou Mix de Castanhas"
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {w.type === WidgetType.MARKET_WATCH && (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Título</label>
            <input
              type="text"
              value={w.data.marketWatchConfig?.title || ''}
              onChange={e => updateData(w.i, { marketWatchConfig: { ...w.data.marketWatchConfig, title: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Layout</label>
            <select
              value={w.data.marketWatchConfig?.layout || 'grid'}
              onChange={e => updateData(w.i, { marketWatchConfig: { ...w.data.marketWatchConfig, layout: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
            >
              <option value="grid">Grade (Cards)</option>
              <option value="list">Lista Vertical</option>
              <option value="ticker">Fita Corrediça (Ticker)</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Adicionar Símbolo</label>
            <div className="flex gap-2">
              <input
                type="text"
                id={`new-symbol-${w.i}`}
                placeholder="Ex: AAPL, BTC-USD, EURUSD=X"
                className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED] uppercase"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const input = e.currentTarget;
                    if (input.value.trim()) {
                      const symbols = w.data.marketWatchConfig?.symbols || [];
                      const sym = input.value.trim().toUpperCase();
                      if (!symbols.includes(sym)) {
                        updateData(w.i, { marketWatchConfig: { ...w.data.marketWatchConfig, symbols: [...symbols, sym] } });
                      }
                      input.value = '';
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.getElementById(`new-symbol-${w.i}`) as HTMLInputElement;
                  if (input && input.value.trim()) {
                    const symbols = w.data.marketWatchConfig?.symbols || [];
                    const sym = input.value.trim().toUpperCase();
                    if (!symbols.includes(sym)) {
                      updateData(w.i, { marketWatchConfig: { ...w.data.marketWatchConfig, symbols: [...symbols, sym] } });
                    }
                    input.value = '';
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-500 px-3 rounded text-white text-xs font-bold"
              >
                +
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(w.data.marketWatchConfig?.symbols || []).map((sym: string) => (
              <span key={sym} className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-white font-mono font-bold">
                {sym}
                <button
                  onClick={() => {
                    const symbols = w.data.marketWatchConfig.symbols.filter((s: string) => s !== sym);
                    updateData(w.i, { marketWatchConfig: { ...w.data.marketWatchConfig, symbols } });
                  }}
                  className="text-rose-400 hover:text-rose-300 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {w.type === WidgetType.BROWSER_SNAPSHOT && (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">URL do Site</label>
            <input
              type="text"
              value={w.data.browserSnapshotConfig?.url || ''}
              onChange={e => updateData(w.i, { browserSnapshotConfig: { ...w.data.browserSnapshotConfig, url: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
              placeholder="Ex: https://g1.globo.com"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Intervalo de Atualização (minutos)</label>
            <input
              type="number"
              value={w.data.browserSnapshotConfig?.updateIntervalMinutes || 10}
              onChange={e => updateData(w.i, { browserSnapshotConfig: { ...w.data.browserSnapshotConfig, updateIntervalMinutes: parseInt(e.target.value) || 10 } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
            />
          </div>
        </div>
      )}

      {w.type === WidgetType.GOOGLE_DOCS && (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Tipo de Documento</label>
            <select
              value={w.data.googleDocsConfig?.docType || 'document'}
              onChange={e => updateData(w.i, { googleDocsConfig: { ...w.data.googleDocsConfig, docType: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
            >
              <option value="document">Google Documentos (Doc)</option>
              <option value="spreadsheet">Google Planilhas (Sheets)</option>
              <option value="presentation">Google Apresentações (Slides)</option>
              <option value="form">Google Formulários (Forms)</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Link de Compartilhamento</label>
            <input
              type="text"
              value={w.data.googleDocsConfig?.url || ''}
              onChange={e => updateData(w.i, { googleDocsConfig: { ...w.data.googleDocsConfig, url: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
              placeholder="Cole o link completo do Google Docs..."
            />
          </div>
          <p className="text-[9px] text-slate-400 leading-normal italic">
            Certifique-se de que o documento esteja visível para "Qualquer pessoa com o link" para que seja exibido sem login.
          </p>
        </div>
      )}

      {w.type === WidgetType.OFFICE_DOCS && (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Tipo do Arquivo</label>
            <select
              value={w.data.officeDocsConfig?.docType || 'word'}
              onChange={e => updateData(w.i, { officeDocsConfig: { ...w.data.officeDocsConfig, docType: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
            >
              <option value="word">Microsoft Word</option>
              <option value="excel">Microsoft Excel</option>
              <option value="powerpoint">Microsoft PowerPoint</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Link de Incorporação (Embed Link)</label>
            <input
              type="text"
              value={w.data.officeDocsConfig?.url || ''}
              onChange={e => updateData(w.i, { officeDocsConfig: { ...w.data.officeDocsConfig, url: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
              placeholder="Cole o link gerado pelo OneDrive embed..."
            />
          </div>
        </div>
      )}

      {w.type === WidgetType.POWER_BI && (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">URL de Incorporação (Embed URL)</label>
            <input
              type="text"
              value={w.data.powerBiConfig?.embedUrl || ''}
              onChange={e => updateData(w.i, { powerBiConfig: { ...w.data.powerBiConfig, embedUrl: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
              placeholder="Cole o link https://app.powerbi.com/reportEmbed..."
            />
          </div>
        </div>
      )}

      {w.type === WidgetType.EMBED_HTML && (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Código HTML / Widget Customizado</label>
            <textarea
              value={w.data.embedHtmlConfig?.html || ''}
              onChange={e => updateData(w.i, { embedHtmlConfig: { html: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white font-mono outline-none focus:border-[#7C3AED] h-44"
              placeholder="<!-- Insira seu HTML, CSS ou Script aqui -->"
            />
          </div>
        </div>
      )}

      {w.type === WidgetType.AIRTABLE && (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">URL de Compartilhamento do Airtable</label>
            <input
              type="text"
              value={w.data.airtableConfig?.shareUrl || ''}
              onChange={e => updateData(w.i, { airtableConfig: { shareUrl: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
              placeholder="https://airtable.com/embed/shr..."
            />
          </div>
        </div>
      )}

      {w.type === WidgetType.PDF_DOCUMENT && (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">URL do Arquivo PDF</label>
            <input
              type="text"
              value={w.data.pdfDocumentConfig?.pdfUrl || ''}
              onChange={e => updateData(w.i, { pdfDocumentConfig: { pdfUrl: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
              placeholder="https://exemplo.com/documento.pdf"
            />
          </div>
        </div>
      )}

      {/* Ajustes de Layout */}
      <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Ajustes de Layout</span>
        
        {/* Grid de Switches */}
        <div className="grid grid-cols-1 gap-2">
          <label className={`flex items-center gap-3 text-[11px] text-slate-300 cursor-pointer p-2.5 rounded-lg border transition-all w-full select-none ${w.data.fillContainer ? 'bg-[#7C3AED]/10 border-[#7C3AED]/50 ring-1 ring-[#7C3AED]/20' : 'bg-slate-950/60 border-slate-800/80 hover:border-[#7C3AED]/30 hover:bg-slate-950'}`}>
            <input 
              type="checkbox" 
              checked={w.data.fillContainer || false} 
              onChange={(e) => {
                const checked = e.target.checked;
                updateData(w.i, { 
                  fillContainer: checked,
                  fullScreenMode: checked,
                  contentAlignment: checked ? 'stretch' : 'center',
                  fitContainerMode: checked ? 'stretch' : '',
                  padding: checked ? '0px' : w.data.padding,
                  margin: checked ? '0px' : w.data.margin,
                });
                if (checked) {
                  setFullScreen(w.i);
                }
              }}
              className="rounded border-slate-700 bg-slate-900 text-[#7C3AED] focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="font-bold text-slate-200">Preencher Container</span>
              <span className="text-[9px] text-slate-500 leading-tight">Widget de complemento em tela cheia — ocupa 100% da tela, de canto a canto</span>
            </div>
          </label>

          <label className={`flex items-center gap-3 text-[11px] text-slate-300 cursor-pointer p-2.5 rounded-lg border transition-all w-full select-none ${w.data.fullScreenMode ? 'bg-indigo-950/40 border-indigo-500/50 ring-1 ring-indigo-500/20' : 'bg-slate-950/60 border-slate-800/80 hover:border-[#7C3AED]/30 hover:bg-slate-950'}`}>
            <input 
              type="checkbox" 
              checked={w.data.fullScreenMode || false} 
              onChange={(e) => {
                const checked = e.target.checked;
                updateData(w.i, { 
                  fullScreenMode: checked,
                  ...(checked ? {
                    fillContainer: true,
                    contentAlignment: 'stretch',
                    fitContainerMode: 'stretch',
                    padding: '0px',
                    margin: '0px',
                  } : {})
                });
                if (checked) {
                  setFullScreen(w.i);
                }
              }}
              className="rounded border-slate-700 bg-slate-900 text-[#7C3AED] focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="font-bold text-slate-200">Tela Cheia (100% da TV)</span>
              <span className="text-[9px] text-slate-500 leading-tight">Força o widget a preencher toda a tela da TV</span>
            </div>
          </label>
        </div>

        {/* Painel de Tela Cheia — aparece quando fillContainer está ativo */}
        {w.data.fillContainer && (
          <div className="bg-gradient-to-b from-[#7C3AED]/10 to-slate-950/80 p-3 rounded-xl border border-[#7C3AED]/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-1">
              <Maximize2 size={12} className="text-[#7C3AED]" />
              <span className="text-[9px] font-black text-[#7C3AED] uppercase tracking-wider">Modo Tela Cheia Ativo</span>
            </div>
            
            {/* Imagem de Fundo do Widget */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Imagem de Fundo (Opcional)</label>
              <input
                type="text"
                value={w.data.backgroundImage || ''}
                onChange={e => updateData(w.i, { backgroundImage: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-[#7C3AED]"
                placeholder="URL da imagem de fundo..."
              />
              <button
                onClick={() => {
                  setMediaLibraryConfig({
                    isOpen: true,
                    allowedTypes: 'image' as const,
                    onSelect: (url: string) => {
                      updateData(w.i, { backgroundImage: url });
                    }
                  });
                }}
                className="w-full mt-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-2"
              >
                <Upload size={12} />
                Selecionar Imagem de Fundo
              </button>
            </div>

            {/* Botão de Preenchimento Automático */}
            <button
              onClick={() => {
                // Remove ALL other widgets — this one becomes the sole fullscreen background widget
                const cleanedLayout = page.layout.filter(item => item.i === w.i);
                const updatedWidget = cleanedLayout.find(item => item.i === w.i);
                if (updatedWidget) {
                  updatedWidget.data = {
                    ...updatedWidget.data,
                    fillContainer: true,
                    fullScreenMode: true,
                    contentAlignment: 'stretch',
                    fitContainerMode: 'stretch',
                    padding: '0px',
                    margin: '0px',
                  };
                  updatedWidget.x = 0;
                  updatedWidget.y = 0;
                  updatedWidget.w = 48; // GRID_COLS
                  const containerHeight = document.querySelector('[data-canvas-ref]')?.clientHeight || 0;
                  const cWidth = document.querySelector('[data-canvas-ref]')?.clientWidth || 1200;
                  const rh = cWidth / 48;
                  updatedWidget.h = containerHeight > 0 && rh > 0 ? Math.ceil(containerHeight / rh) : 27;
                }
                onChange({ ...page, layout: cleanedLayout });
              }}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:via-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <Maximize2 size={14} className="relative z-10" />
              <span className="relative z-10">Preencher Tela Inteira</span>
            </button>
            <p className="text-[8px] text-amber-400/80 text-center leading-tight">
              ⚠️ Atenção: Isso removerá todos os outros widgets desta cena e deixará o widget ocupando 100% da tela como fundo.
            </p>
          </div>
        )}

        {/* Alinhamento Interno */}
        {!w.data.fillContainer && (
          <div className="flex flex-col gap-1 bg-slate-900 p-2 rounded border border-slate-800 animate-in fade-in duration-200">
            <span className="text-[10px] text-slate-400 block mb-1">Alinhamento do Conteúdo</span>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'start', label: 'Início' },
                { id: 'center', label: 'Centro' },
                { id: 'end', label: 'Fim' },
                { id: 'stretch', label: 'Esticar' }
              ].map((align) => (
                <button
                  key={align.id}
                  type="button"
                  onClick={() => updateData(w.i, { contentAlignment: align.id as any })}
                  className={`py-1 text-[9px] rounded font-medium border transition-all ${
                    (w.data.contentAlignment || 'center') === align.id
                      ? 'bg-[#7C3AED]/20 text-[#7C3AED] border-[#7C3AED]'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {align.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Padding e Margin — oculto se fillContainer ativo */}
        {!w.data.fillContainer && (
          <div className="grid grid-cols-2 gap-2">
            <SizeInput 
              label="Espaçamento (Padding)" 
              value={w.data.padding} 
              onChange={(val) => updateData(w.i, { padding: val })}
              placeholder="0px"
            />
            <SizeInput 
              label="Margem (Margin)" 
              value={w.data.margin} 
              onChange={(val) => updateData(w.i, { margin: val })}
              placeholder="0px"
            />
          </div>
        )}

        {/* Fit Mode para Mídias (IMAGE, GIF, VIDEO) */}
        {!w.data.fillContainer && (w.type === WidgetType.IMAGE || w.type === WidgetType.GIF || w.type === WidgetType.VIDEO) && (
          <div className="flex flex-col gap-1 bg-slate-900 p-2 rounded border border-slate-800 animate-in fade-in duration-200">
            <span className="text-[10px] text-slate-400">Ajuste de Preenchimento (Fit)</span>
            <select
              value={w.data.fitContainerMode || ''}
              onChange={(e) => updateData(w.i, { fitContainerMode: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white outline-none focus:border-[#7C3AED]"
            >
              <option value="">Padrão do Sistema</option>
              <option value="cover">Cortar e Preencher (Cover)</option>
              <option value="contain">Conter Inteiro (Contain)</option>
              <option value="stretch">Esticar Tudo (Stretch/Fill)</option>
              <option value="none">Tamanho Real (None)</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default SceneEditor;
