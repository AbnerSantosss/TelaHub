
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RGL, { WidthProvider } from 'react-grid-layout';
import { 
  Save, Plus, Trash2, X,
  Image as ImageIcon, Type, CloudSun, Clock, Calendar, CalendarDays,
  Settings, Layers, Home, Move, Upload, Link as LinkIcon, CheckCircle2,
  Maximize2, Film, Info, Loader2, MonitorPlay, Rss, Globe, Gift, Search, Palette, Map, Layout, MoveHorizontal, GripVertical,
  FileText, ListTodo, Timer, ClipboardList, Utensils, TrendingUp, Code2, Database, StickyNote, Camera, BookOpen
} from 'lucide-react';
import { getDisplays, saveDisplay, uploadMedia } from '../services/storage';
import { Display, Page, WidgetType, LayoutItem } from '../types';
import { LogoHub } from './Login';
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


const FEED_CATEGORIES = [
  {
    name: 'Notícias Gerais',
    feeds: [
      { name: 'G1 - Principais', url: 'https://g1.globo.com/rss/g1/' },
      { name: 'G1 - Mundo', url: 'https://g1.globo.com/rss/g1/mundo/' },
      { name: 'CNN Brasil', url: 'https://www.cnnbrasil.com.br/feed/' },
      { name: 'UOL Notícias', url: 'https://rss.uol.com.br/feed/noticias.xml' },
      { name: 'Jovem Pan', url: 'https://jovempan.com.br/feed' },
      { name: 'BBC News Brasil', url: 'https://feeds.bbci.co.uk/portuguese/rss.xml' },
    ]
  },
  {
    name: 'Futebol & Esportes',
    feeds: [
      { name: 'Globo Esporte', url: 'https://ge.globo.com/rss/ge/' },
      { name: 'ESPN Brasil', url: 'https://www.espn.com.br/rss' },
      { name: 'Lance!', url: 'https://www.lance.com.br/rss' },
    ]
  },
  {
    name: 'Tecnologia & Ciência',
    feeds: [
      { name: 'G1 - Tecnologia', url: 'https://g1.globo.com/rss/g1/tecnologia/' },
      { name: 'Olhar Digital', url: 'https://olhardigital.com.br/feed/' },
      { name: 'TechTudo', url: 'https://techtudo.globo.com/rss/techtudo/' },
      { name: 'Canaltech', url: 'https://canaltech.com.br/rss/' },
    ]
  },
  {
    name: 'Economia & Negócios',
    feeds: [
      { name: 'G1 - Economia', url: 'https://g1.globo.com/rss/g1/economia/' },
      { name: 'Valor Econômico', url: 'https://valor.globo.com/rss/valor' },
      { name: 'Exame', url: 'https://exame.com/feed/' },
      { name: 'Forbes Brasil', url: 'https://forbes.com.br/feed/' },
    ]
  },
  {
    name: 'Arte & Cultura',
    feeds: [
      { name: 'G1 - Pop & Arte', url: 'https://g1.globo.com/rss/g1/pop-arte/' },
      { name: 'Omelete', url: 'https://www.omelete.com.br/rss' },
      { name: 'Rolling Stone', url: 'https://rollingstone.uol.com.br/feed/' },
    ]
  }
];

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

const handleYouTubeIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>, quality: string = 'highres') => {
  const iframe = e.currentTarget;
  // Try to force requested quality
  iframe.contentWindow?.postMessage(JSON.stringify({
    event: 'command',
    func: 'setPlaybackQuality',
    args: [quality]
  }), '*');
  
  // If highres, also set the range
  if (quality === 'highres' || quality === 'hd1080') {
    iframe.contentWindow?.postMessage(JSON.stringify({
      event: 'command',
      func: 'setPlaybackQualityRange',
      args: ['hd1080', 'highres']
    }), '*');
  } else {
    iframe.contentWindow?.postMessage(JSON.stringify({
      event: 'command',
      func: 'setPlaybackQualityRange',
      args: [quality, quality]
    }), '*');
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
  const [isUploading, setIsUploading] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [pageToDelete, setPageToDelete] = useState<number | null>(null);
  const [isClearingScene, setIsClearingScene] = useState(false);
  const [activeMealDay, setActiveMealDay] = useState<string>('Segunda');

  const [showBgAnimModal, setShowBgAnimModal] = useState(false);
  const [mediaLibraryConfig, setMediaLibraryConfig] = useState<{ isOpen: boolean, onSelect: (url: string) => void, allowedTypes: 'image' | 'video' | 'all' } | null>(null);
  
  // Mobile sidebar states
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);

  // Drag and Drop States for Layers
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getBackgroundAnimationClass = (anim?: string) => {
    switch (anim) {
      case 'auto-weather': return 'bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-dashed border-cyan-500/30'; // Placeholder visual
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

  const GRID_COLS = 48;


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



  useEffect(() => {
    console.log('Display updated:', display);
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
    // Ensure newIdx is within bounds
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
    
    // Keep only the selected widget
    const currentWidget = currentPage.layout.find(w => w.i === selectedWidget);
    if (!currentWidget) return;
    
    // Calculate required height in grid units to fill the container
    const containerHeight = containerRef.current?.clientHeight || 0;
    const requiredRows = containerHeight > 0 && rowHeight > 0 ? Math.ceil(containerHeight / rowHeight) : 27;
    
    // Update widget to full screen with proper data flags
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

  const currentWidget = activePage.layout.find(w => w.i === selectedWidget);

  return (
    <div className="h-screen flex flex-col bg-[#1C1D22] overflow-hidden relative text-slate-200 font-sans">
      


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
                  {/* Preview Background */}
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

      {/* Header */}
      <header className="h-auto md:h-16 bg-[#2D3139] border-b border-[#9CA3AF]/10 px-4 md:px-6 py-3 md:py-0 flex flex-col md:flex-row items-center justify-between z-30 shadow-md gap-3 md:gap-0">
        <div className="flex items-center gap-4 w-full md:w-auto justify-start">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-[#7C3AED] transition-colors">
            <Home size={20} />
          </button>
          <div className="w-px h-6 bg-slate-800"></div>
          <div className="flex items-center gap-2">
            <LogoHub size={28} className="drop-shadow-[0_0_8px_rgba(124,58,237,0.35)]" />
            <h1 className="font-bold text-slate-100 tracking-tight uppercase text-sm">
              Tela<span className="text-[#7C3AED]">Hub</span> <span className="text-slate-600 mx-2">/</span> {display.name}
            </h1>
          </div>
        </div>

        {/* Scene Selector */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 overflow-x-auto w-full md:max-w-[40%] scrollbar-hide flex-nowrap">
          {display.pages.map((p, idx) => (
            <div 
              key={p.id} 
              className={`flex items-center rounded-lg border transition-all flex-shrink-0 min-w-max ${
                activePageIdx === idx 
                ? 'bg-[#7C3AED] border-[#7C3AED] shadow-[0_0_10px_rgba(124,58,237,0.4)]' 
                : 'border-slate-800 hover:border-slate-700 bg-slate-900'
              }`}
            >
              <button
                onClick={() => { setActivePageIdx(idx); setSelectedWidget(null); }}
                className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activePageIdx === idx ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {p.broadcast_id && <CalendarDays size={12} className="text-[#7C3AED]" />}
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
                    ? 'border-[#6D28D9] text-purple-200 hover:bg-[#6D28D9] hover:text-white' 
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
          }} className="p-1.5 text-[#7C3AED] hover:bg-[#7C3AED]/10 rounded-lg transition-colors mx-1">
            <Plus size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2 md:hidden">
            <button 
              onClick={() => setShowLeftSidebar(!showLeftSidebar)}
              className={`px-3 py-2 rounded-lg transition-all border ${showLeftSidebar ? 'bg-[#7C3AED]/20 text-[#7C3AED] border-[#7C3AED]/50' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-[#7C3AED]'}`}
              title="Widgets"
            >
              <Layers size={16} />
            </button>
            <button 
              onClick={() => setShowRightSidebar(!showRightSidebar)}
              className={`px-3 py-2 rounded-lg transition-all border ${showRightSidebar ? 'bg-[#7C3AED]/20 text-[#7C3AED] border-[#7C3AED]/50' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-[#7C3AED]'}`}
              title="Configurações"
            >
              <Settings size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">

            <button 
              onClick={() => window.open(`/#/player/${display.slug || display.id}`, '_blank')}
              className="bg-[#2D3139] hover:bg-[#1C1D22] text-[#F3F4F6] border border-[#9CA3AF] hover:border-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
              title="Abrir Player em nova aba"
            >
              <Maximize2 size={16} />
              <span className="hidden sm:inline">VISUALIZAR</span>
            </button>

            <button 
              onClick={handleSave} 
              disabled={isSaving} 
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)] border border-white/10 active:scale-95 whitespace-nowrap disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
              {isSaving ? 'SALVANDO...' : 'SALVAR'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Backdrop overlay for mobile sidebars */}
        {(showLeftSidebar || showRightSidebar) && (
          <div 
            className="fixed inset-0 bg-black/60 z-50 md:hidden animate-in fade-in duration-200" 
            onClick={() => { setShowLeftSidebar(false); setShowRightSidebar(false); }}
          />
        )}

        {/* Sidebar Left: Tools */}
        <aside className={`absolute md:relative left-0 top-0 h-full w-72 bg-[#2D3139] border-r border-slate-800 overflow-y-auto z-[60] shadow-xl transition-transform duration-300 ease-in-out ${showLeftSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="p-5 border-b border-slate-800">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest flex items-center gap-2">
                 <Layers size={12} /> Biblioteca de Widgets
               </h3>
               <button onClick={() => setShowLeftSidebar(false)} className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                 <X size={16} />
               </button>
             </div>
             
             {/* Básicos */}
             <div className="mb-4">
               <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Básicos</h4>
               <div className="grid grid-cols-2 gap-2">
                 <WidgetTool icon={<ImageIcon size={16} />} label="Imagem" onClick={() => addWidget(WidgetType.IMAGE)} />
                 <WidgetTool icon={<Film size={16} />} label="Vídeo" onClick={() => addWidget(WidgetType.VIDEO)} />
                 <WidgetTool icon={<Type size={16} />} label="Texto" onClick={() => addWidget(WidgetType.TEXT)} />
                 <WidgetTool icon={<Gift size={16} />} label="GIF" onClick={() => addWidget(WidgetType.GIF)} />
                 <WidgetTool icon={<Globe size={16} />} label="Web" onClick={() => addWidget(WidgetType.IFRAME)} />
               </div>
             </div>

             {/* Utilitários */}
             <div className="mb-4">
               <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Utilitários</h4>
               <div className="grid grid-cols-2 gap-2">
                 <WidgetTool icon={<Clock size={16} />} label="Relógio" onClick={() => addWidget(WidgetType.CLOCK)} />
                 <WidgetTool icon={<CloudSun size={16} />} label="Clima" onClick={() => addWidget(WidgetType.WEATHER)} />
                 <WidgetTool icon={<Layout size={16} />} label="Completo" onClick={() => addWidget(WidgetType.FULL_INFO)} />
                 <WidgetTool icon={<Rss size={16} />} label="RSS" onClick={() => addWidget(WidgetType.RSS)} />
                 <WidgetTool icon={<Calendar size={16} />} label="Agenda" onClick={() => addWidget(WidgetType.CALENDAR)} />
               </div>
             </div>

             {/* Interativos */}
             <div className="mb-4">
               <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Interativos</h4>
               <div className="grid grid-cols-2 gap-2">
                 <WidgetTool icon={<StickyNote size={16} className="text-yellow-400" />} label="Notas" onClick={() => addWidget(WidgetType.NOTES)} />
                 <WidgetTool icon={<ListTodo size={16} className="text-emerald-400" />} label="Tarefas" onClick={() => addWidget(WidgetType.TODO)} />
                 <WidgetTool icon={<Timer size={16} className="text-rose-400" />} label="Contador" onClick={() => addWidget(WidgetType.COUNTDOWN)} />
                 <WidgetTool icon={<ClipboardList size={16} className="text-cyan-400" />} label="Deveres" onClick={() => addWidget(WidgetType.CHORES)} />
                 <WidgetTool icon={<Utensils size={16} className="text-amber-400" />} label="Meal Plan" onClick={() => addWidget(WidgetType.MEAL_PLAN)} />
               </div>
             </div>

             {/* Integrações */}
             <div className="mb-4">
               <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Integrações</h4>
               <div className="grid grid-cols-2 gap-2">
                 <WidgetTool icon={<TrendingUp size={16} className="text-green-400" />} label="Bolsa" onClick={() => addWidget(WidgetType.MARKET_WATCH)} />
                 <WidgetTool icon={<Camera size={16} className="text-blue-400" />} label="Snapshot" onClick={() => addWidget(WidgetType.BROWSER_SNAPSHOT)} />
                 <WidgetTool icon={<FileText size={16} className="text-cyan-500" />} label="G Docs" onClick={() => addWidget(WidgetType.GOOGLE_DOCS)} />
                 <WidgetTool icon={<BookOpen size={16} className="text-blue-500" />} label="Office Docs" onClick={() => addWidget(WidgetType.OFFICE_DOCS)} />
                 <WidgetTool icon={<Layout size={16} className="text-amber-500" />} label="Power BI" onClick={() => addWidget(WidgetType.POWER_BI)} />
                 <WidgetTool icon={<Database size={16} className="text-rose-500" />} label="Airtable" onClick={() => addWidget(WidgetType.AIRTABLE)} />
                 <WidgetTool icon={<FileText size={16} className="text-red-500" />} label="PDF" onClick={() => addWidget(WidgetType.PDF_DOCUMENT)} />
                 <WidgetTool icon={<Code2 size={16} className="text-indigo-400" />} label="HTML" onClick={() => addWidget(WidgetType.EMBED_HTML)} />
               </div>
             </div>
             
             <div className="mt-4 pt-4 border-t border-slate-800">
                <button 
                  onClick={() => setIsClearingScene(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg text-[10px] font-bold transition-colors border border-rose-500/20 uppercase tracking-wider"
                >
                  <Trash2 size={12} /> Limpar Todos os Widgets
                </button>
             </div>
          </div>

          {/* Layers Sidebar Section */}
          <div className="p-5 border-b border-slate-800">
             <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <Layers size={12} /> Camadas
             </h3>
             <div className="space-y-1">
               {[...activePage.layout]
                 .sort((a, b) => (b.data.zIndex ?? 10) - (a.data.zIndex ?? 10))
                 .map((layer) => {
                   const isSelected = selectedWidget === layer.i;
                   const isDragging = draggedLayerId === layer.i;
                   const isDragOver = dragOverLayerId === layer.i;

                   const getIcon = (type: WidgetType) => {
                     switch (type) {
                       case WidgetType.IMAGE: return <ImageIcon size={14} />;
                       case WidgetType.VIDEO: return <Film size={14} />;
                       case WidgetType.TEXT: return <Type size={14} />;
                       case WidgetType.CLOCK: return <Clock size={14} />;
                       case WidgetType.CALENDAR: return <Calendar size={14} />;
                       case WidgetType.WEATHER: return <CloudSun size={14} />;
                       case WidgetType.FULL_INFO: return <Layout size={14} />;
                       case WidgetType.RSS: return <Rss size={14} />;
                       case WidgetType.IFRAME: return <Globe size={14} />;
                       case WidgetType.GIF: return <Gift size={14} />;
                       case WidgetType.NOTES: return <StickyNote size={14} className="text-yellow-400" />;
                       case WidgetType.TODO: return <ListTodo size={14} className="text-emerald-400" />;
                       case WidgetType.COUNTDOWN: return <Timer size={14} className="text-rose-400" />;
                       case WidgetType.CHORES: return <ClipboardList size={14} className="text-cyan-400" />;
                       case WidgetType.MEAL_PLAN: return <Utensils size={14} className="text-amber-400" />;
                       case WidgetType.MARKET_WATCH: return <TrendingUp size={14} className="text-green-400" />;
                       case WidgetType.BROWSER_SNAPSHOT: return <Camera size={14} className="text-blue-400" />;
                       case WidgetType.GOOGLE_DOCS: return <FileText size={14} className="text-cyan-500" />;
                       case WidgetType.OFFICE_DOCS: return <BookOpen size={14} className="text-blue-500" />;
                       case WidgetType.POWER_BI: return <Layout size={14} className="text-amber-500" />;
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
                     <div
                       key={layer.i}
                       draggable
                       onDragStart={(e) => handleLayerDragStart(e, layer.i)}
                       onDragOver={(e) => handleLayerDragOver(e, layer.i)}
                       onDragLeave={handleLayerDragLeave}
                       onDrop={(e) => handleLayerDrop(e, layer.i)}
                       onDragEnd={handleLayerDragEnd}
                       onClick={() => setSelectedWidget(layer.i)}
                       className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border ${
                         isSelected 
                           ? 'bg-[#7C3AED]/10 border-[#7C3AED]/50 text-[#7C3AED]' 
                           : 'bg-slate-900 border-transparent hover:bg-slate-800 text-slate-300'
                       } ${isDragging ? 'opacity-50' : 'opacity-100'} ${
                         isDragOver ? 'border-t-2 border-t-[#7C3AED]' : ''
                       }`}
                     >
                       <div className="cursor-move text-slate-500 hover:text-slate-300">
                         <GripVertical size={14} />
                       </div>
                       <div className="flex items-center justify-center w-6 h-6 rounded bg-slate-950/50 text-slate-400">
                         {getIcon(layer.type)}
                       </div>
                       <span className="text-xs font-medium truncate flex-1">{getName(layer.type)}</span>
                       {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]"></div>}
                     </div>
                   );
               })}
               {activePage.layout.length === 0 && (
                 <div className="text-center p-4 border border-dashed border-slate-800 rounded-lg text-slate-500 text-[10px]">
                   Nenhuma camada nesta cena.
                 </div>
               )}
             </div>
             <p className="text-[8px] text-slate-500 mt-3 text-center">Arraste para reordenar (z-index)</p>
          </div>

          <div className="p-5">
             <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <MonitorPlay size={12} /> Fundo da Cena
             </h3>
             
             <div className="space-y-4">
                <div className="group">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Vídeo de Fundo (YouTube ou MP4)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="https://youtube.com... ou https://.../video.mp4"
                      value={activePage.backgroundVideoUrl || ''}
                      onChange={(e) => {
                        const updated = [...display.pages];
                        updated[activePageIdx].backgroundVideoUrl = e.target.value;
                        updated[activePageIdx].backgroundImage = ''; 
                        setDisplay({...display, pages: updated});
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pl-8 text-xs text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <Film size={12} className="absolute left-2.5 top-3 text-slate-600" />
                  </div>
                  
                  <div className="relative mt-3 mb-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-800"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-slate-900 px-2 text-slate-500 font-bold uppercase text-[9px]">ou</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setMediaLibraryConfig({
                        isOpen: true,
                        allowedTypes: 'video',
                        onSelect: (url) => {
                          const updated = [...display.pages];
                          updated[activePageIdx].backgroundVideoUrl = url;
                          updated[activePageIdx].backgroundImage = ''; 
                          setDisplay({...display, pages: updated});
                        }
                      });
                    }}
                    className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider cursor-pointer transition-all border border-slate-700 hover:border-slate-500 shadow-lg"
                  >
                    <Upload size={14} />
                    Selecionar Vídeo
                  </button>
                  
                  {activePage.backgroundVideoUrl && (
                    <div className="flex flex-col gap-2 mt-2 ml-1">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="bg-video-mute"
                          checked={activePage.backgroundVideoMuted !== false} // Default true
                          onChange={(e) => {
                            const updated = [...display.pages];
                            updated[activePageIdx].backgroundVideoMuted = e.target.checked;
                            setDisplay({...display, pages: updated});
                          }}
                          className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-offset-0 focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                        />
                        <label htmlFor="bg-video-mute" className="text-[10px] font-bold text-slate-400 uppercase cursor-pointer select-none hover:text-cyan-400 transition-colors">
                          Vídeo Mudo (Sem Áudio)
                        </label>
                      </div>
                      
                      {isYouTubeUrl(activePage.backgroundVideoUrl) && (
                        <div className="flex items-center justify-between bg-slate-950/50 p-2 rounded-lg border border-slate-800/50 mt-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Qualidade YouTube</label>
                          <select 
                            value={activePage.backgroundVideoQuality || 'highres'}
                            onChange={(e) => {
                              const updated = [...display.pages];
                              updated[activePageIdx].backgroundVideoQuality = e.target.value;
                              setDisplay({...display, pages: updated});
                            }}
                            className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-2 py-1 outline-none focus:border-cyan-500"
                          >
                            <option value="highres">Máxima (Auto)</option>
                            <option value="hd1080">1080p</option>
                            <option value="hd720">720p</option>
                            <option value="large">480p</option>
                            <option value="medium">360p</option>
                            <option value="small">240p</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="bg-slate-900 px-2 text-[9px] text-slate-600 font-bold">OU</span>
                   </div>
                   <div className="border-t border-slate-800 w-full"></div>
                </div>

                <div className="group">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Imagem de Fundo</label>
                  <div className="relative mb-2">
                    <input 
                      type="text" 
                      placeholder="https://exemplo.com/imagem.jpg"
                      value={activePage.backgroundImage || ''}
                      onChange={(e) => {
                        const updated = [...display.pages];
                        updated[activePageIdx].backgroundImage = e.target.value;
                        updated[activePageIdx].backgroundVideoUrl = ''; 
                        setDisplay({...display, pages: updated});
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pl-8 text-xs text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <ImageIcon size={12} className="absolute left-2.5 top-3 text-slate-600" />
                  </div>
                  
                  <button 
                    onClick={() => {
                      setMediaLibraryConfig({
                        isOpen: true,
                        allowedTypes: 'image',
                        onSelect: (url) => {
                          const updated = [...display.pages];
                          updated[activePageIdx].backgroundImage = url;
                          updated[activePageIdx].backgroundVideoUrl = ''; 
                          setDisplay({...display, pages: updated});
                        }
                      });
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white transition-all"
                  >
                    <Upload size={12} /> 
                    SELECIONAR IMAGEM
                  </button>

                  <p className="text-[9px] text-slate-600 mt-3 leading-relaxed border-t border-slate-800/50 pt-2">
                    Sugestão: Encontre imagens 4K incríveis em <a href="https://unsplash.com/wallpapers/desktop/4k" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">Unsplash</a>, <a href="https://www.pexels.com/search/4k%20wallpaper/" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">Pexels</a> ou <a href="https://pixabay.com/images/search/4k%20wallpaper/" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">Pixabay</a>.
                  </p>

                  <div className="relative mt-4 mb-4">
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="bg-slate-900 px-2 text-[9px] text-slate-600 font-bold">OU</span>
                     </div>
                     <div className="border-t border-slate-800 w-full"></div>
                  </div>

                  <div className="group">
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Fundo Animado</label>
                    <button
                      onClick={() => {
                        setSelectedWidget(null);
                        setShowBgAnimModal(true);
                      }}
                      className="w-full flex items-center justify-between gap-2 py-2.5 px-3 bg-slate-950 border border-slate-700 hover:border-cyan-500 rounded-lg text-xs text-slate-300 hover:text-white transition-all group-hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    >
                      <span className="flex items-center gap-2">
                        <MonitorPlay size={14} className="text-cyan-500" />
                        {activePage.backgroundAnimation ? 
                          ['Automático (Clima)', 'Fluxo Gradiente', 'Céu e Nuvens', 'Chuva Digital', 'Neve Caindo', 'Chamas', 'Grid Tech', 'Alerta Vermelho', 'Pulso Azul', 'Pulso Verde', 'Aurora Boreal']
                          [['auto-weather', 'gradient-flow', 'clouds', 'rain', 'snow', 'fire', 'tech-grid', 'pulse-red', 'pulse-blue', 'pulse-green', 'aurora'].indexOf(activePage.backgroundAnimation)]
                          : 'Escolher Animação'}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${activePage.backgroundAnimation ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-slate-700'}`}></div>
                    </button>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-800">
                    <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Move size={12} /> Transições
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Tipo de Transição</label>
                        <select 
                          value={activePage.transitionType || 'none'}
                          onChange={(e) => {
                            const updated = [...display.pages];
                            updated[activePageIdx].transitionType = e.target.value as any;
                            setDisplay({...display, pages: updated});
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                        >
                          <option value="none">Nenhuma</option>
                          <option value="fade">Fade</option>
                          <option value="slide-left">Slide Esquerda</option>
                          <option value="slide-right">Slide Direita</option>
                          <option value="slide-up">Slide Cima</option>
                          <option value="slide-down">Slide Baixo</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Duração (ms)</label>
                        <input 
                          type="number"
                          value={activePage.transitionDuration || 500}
                          onChange={(e) => {
                            const updated = [...display.pages];
                            updated[activePageIdx].transitionDuration = parseInt(e.target.value);
                            setDisplay({...display, pages: updated});
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Ajuste da Imagem</label>
                    <select 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
                      value={activePage.backgroundFit || 'cover'}
                      onChange={(e) => {
                        const updated = [...display.pages];
                        updated[activePageIdx].backgroundFit = e.target.value as any;
                        setDisplay({...display, pages: updated});
                      }}
                    >
                      <option value="cover">Preencher (Corta bordas se necessário)</option>
                      <option value="fill">Esticar (Preenche 100% ignorando proporção)</option>
                      <option value="contain">Ajustar (Mostra imagem inteira com bordas)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Duração (Segundos)</label>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg p-1">
                    <Clock size={14} className="ml-2 text-slate-600" />
                    <input 
                      type="number" 
                      value={activePage.duration} 
                      onChange={(e) => {
                        const updated = [...display.pages];
                        updated[activePageIdx].duration = parseInt(e.target.value) || 5;
                        setDisplay({...display, pages: updated});
                      }}
                      className="w-full bg-transparent border-none p-1.5 text-sm font-bold text-slate-200 focus:ring-0 outline-none"
                    />
                  </div>
                </div>
             </div>
             
             {activePage.broadcast_id && (
               <div className="mt-4 p-3 bg-cyan-900/30 border border-cyan-800/50 rounded-xl flex items-start gap-3">
                 <CalendarDays className="text-cyan-400 shrink-0 mt-0.5" size={16} />
                 <div>
                   <p className="text-xs font-bold text-cyan-400 mb-1">Cena Programada</p>
                   <p className="text-[10px] text-cyan-200/70 leading-relaxed">
                     Esta cena foi injetada pela Central de Programação. Alterações feitas aqui afetarão apenas esta tela e poderão ser sobrescritas se a programação for atualizada.
                   </p>
                 </div>
               </div>
             )}
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 bg-[#1C1D22] relative overflow-hidden flex items-center justify-center p-8">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
               style={{ 
                 backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', 
                 backgroundSize: '20px 20px' 
               }}>
          </div>
          
          <div className={`absolute top-4 left-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-slate-900/80 px-3 py-1.5 rounded-full border backdrop-blur-sm z-20 ${
            display.orientation === 'vertical'
              ? 'text-purple-400 border-purple-800'
              : 'text-slate-600 border-slate-800'
          }`}>
            <Maximize2 size={12} className={display.orientation === 'vertical' ? 'text-purple-500' : 'text-[#F97316]'} />
            {display.orientation === 'vertical' ? 'Canvas Livre 9:16 — Vertical' : 'Canvas Livre 16:9 — Horizontal'}
          </div>
          
          <div 
            ref={containerRef}
            className={`h-full bg-black shadow-[0_0_40px_rgba(0,0,0,0.8)] relative border border-[#7C3AED] rounded-sm overflow-hidden shadow-[0_0_25px_rgba(124,58,237,0.15)] ${
              display.orientation === 'vertical'
                ? 'aspect-[9/16] max-h-full w-auto'
                : 'w-full max-w-[100%] aspect-video'
            }`}
            onClick={() => setSelectedWidget(null)}
          >
            {activePage.backgroundVideoUrl && (
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-black">
                 {isYouTubeUrl(activePage.backgroundVideoUrl) ? (
                   <iframe 
                      src={getEmbedUrl(activePage.backgroundVideoUrl, { autoplay: true, mute: activePage.backgroundVideoMuted !== false, loop: true, controls: false, youtubeQuality: activePage.backgroundVideoQuality })} 
                      className="w-full h-full border-none pointer-events-none" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                      onLoad={(e) => handleYouTubeIframeLoad(e, activePage.backgroundVideoQuality)}
                   />
                 ) : (
                   <video 
                     src={activePage.backgroundVideoUrl} 
                     className="w-full h-full object-cover pointer-events-none" 
                     autoPlay
                     muted={activePage.backgroundVideoMuted !== false}
                     loop
                     playsInline
                   />
                 )}
              </div>
            )}
            {activePage.backgroundImage && (
              <div className="absolute inset-0 z-0 bg-center pointer-events-none" 
                   style={{ 
                     backgroundImage: `url(${activePage.backgroundImage})`,
                     backgroundSize: 'cover',
                     backgroundRepeat: 'no-repeat'
                   }} 
              />
            )}
            
            {activePage.backgroundAnimation && !activePage.backgroundImage && !activePage.backgroundVideoUrl && (
               <div className={`absolute inset-0 z-0 ${getBackgroundAnimationClass(activePage.backgroundAnimation)}`} />
            )}
            
            <div className="absolute inset-0 z-10">
              <GridLayout
                className="layout"
                layout={activePage.layout.map(w => ({ i: w.i, x: w.x, y: w.y, w: w.w, h: w.h }))}
                cols={GRID_COLS}
                rowHeight={rowHeight}
                width={containerWidth}
                margin={[0, 0]}
                isResizable={true}
                isDraggable={true}
                compactType={null} 
                preventCollision={false} 
                allowOverlap={true}
                resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
                onLayoutChange={handleLayoutChange}
              >
                {activePage.layout.map(w => (
                  <div 
                    key={w.i} 
                    onClick={(e) => { e.stopPropagation(); setSelectedWidget(w.i); }}
                    className={`group transition-all ${selectedWidget === w.i ? 'border border-[#7C3AED] shadow-[0_0_15px_rgba(124,58,237,0.35)]' : 'border border-transparent hover:border-white/20 hover:bg-white/5'} ${w.data.backgroundAnimation ? getBackgroundAnimationClass(w.data.backgroundAnimation) : (selectedWidget === w.i ? 'bg-slate-900/50 backdrop-blur-sm' : '')}`}
                    style={{ zIndex: selectedWidget === w.i ? 999 : (w.data.zIndex !== undefined ? w.data.zIndex : 10) }}
                  >
                    <div 
                      className={`w-full h-full relative overflow-hidden flex ${getAlignmentClasses(w.data.fillContainer ? 'stretch' : w.data.contentAlignment)}`}
                      style={{
                        padding: w.data.padding || undefined,
                        margin: w.data.margin || undefined,
                      }}
                    >
                      {w.data.fullScreenMode && (
                        <div className="absolute top-2 right-2 z-30 bg-indigo-950/80 border border-[#7C3AED]/50 backdrop-blur-sm text-[#7C3AED] text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(124,58,237,0.3)] pointer-events-none animate-pulse flex items-center gap-1">
                          <span>📺 Tela Cheia (100% da TV)</span>
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

                      <div className={`drag-handle absolute cursor-move z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-cyan-500/10 to-transparent ${w.type === WidgetType.IFRAME && w.data.iframeConfig?.interactive ? 'top-0 left-0 right-0 h-8 bg-cyan-500/80 backdrop-blur-sm border-b border-cyan-400 flex items-center justify-center text-[10px] font-bold text-white shadow-lg' : 'inset-0'}`}>
                        {w.type === WidgetType.IFRAME && w.data.iframeConfig?.interactive && 'Arraste ou Clique aqui para selecionar'}
                      </div>
                      
                      {w.type === WidgetType.VIDEO && (
                        <div className="w-full h-full pointer-events-none bg-black flex flex-col items-center justify-center border border-slate-800">
                           {w.data.videoUrl ? (
                             isYouTubeUrl(w.data.videoUrl) ? (
                               <iframe 
                                  src={getEmbedUrl(w.data.videoUrl, w.data.videoConfig)} 
                                  className="w-full h-full border-none opacity-80" 
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                                  onLoad={(e) => handleYouTubeIframeLoad(e, w.data.videoConfig?.youtubeQuality)}
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
                      )}
                      {w.type === WidgetType.IMAGE && (
                        w.data.url ? (
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
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center"><ImageIcon className="text-slate-700 mb-2" size={32} /><span className="text-[10px] text-slate-600 font-bold uppercase">Imagem</span></div>
                        )
                      )}
                      {w.type === WidgetType.GIF && (
                        w.data.url ? (
                          <div className={`w-full h-full relative bg-black/20 flex ${getAlignmentClasses(w.data.fillContainer ? 'stretch' : w.data.contentAlignment)}`}>
                             <img 
                               src={w.data.url} 
                               className="pointer-events-none select-none w-full h-full"
                               style={{
                                 width: '100%',
                                 height: '100%',
                                 objectFit: (w.data.fillContainer || w.data.fitContainerMode === 'stretch') ? 'fill' : (w.data.fitContainerMode || 'cover')
                               }}
                             />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center"><Gift className="text-slate-700 mb-2" size={32} /><span className="text-[10px] text-slate-600 font-bold uppercase">GIF</span></div>
                        )
                      )}
                      {w.type === WidgetType.TEXT && (
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
                      )}
                      {w.type === WidgetType.CLOCK && (
                        <div className="w-full h-full flex flex-col items-center justify-center pointer-events-none">
                          <LiveClock city={w.data.city} model={w.data.model} fontSize={w.data.fontSize?.replace('vw', '')} />
                        </div>
                      )}
                      {w.type === WidgetType.WEATHER && (
                        <div className="w-full h-full pointer-events-none">
                          <WeatherWidget 
                            city={w.data.city || 'Campina Grande'} 
                            model={w.data.model} 
                            config={w.data.weatherConfig}
                            backgroundImage={w.data.backgroundImage}
                          />
                        </div>
                      )}
                      {w.type === WidgetType.FULL_INFO && (
                        <div className="w-full h-full pointer-events-none">
                          <FullInfoWidget 
                            city={w.data.city || 'Campina Grande'} 
                            backgroundImage={w.data.backgroundImage}
                            backgroundAnimation={w.data.backgroundAnimation}
                            model={w.data.model}
                            textSize={w.data.textSize}
                            numberSize={w.data.numberSize}
                            transparentBackground={w.data.transparentBackground}
                            backgroundColor={w.data.backgroundColor}
                          />
                        </div>
                      )}
                      {w.type === WidgetType.RSS && (
                        <div className="w-full h-full pointer-events-none">
                           <RssFeed url={w.data.rssUrl || ''} config={w.data.rssConfig} />
                        </div>
                      )}
                      {w.type === WidgetType.CALENDAR && (
                        <div 
                          className="w-full h-full relative overflow-hidden p-2 rounded-xl"
                          style={{ 
                            backgroundColor: w.data.calendarConfig?.transparent ? 'transparent' : (w.data.calendarConfig?.backgroundColor || 'rgba(15, 23, 42, 0.5)'),
                            backdropFilter: w.data.calendarConfig?.transparent ? 'none' : 'blur(12px)',
                            border: w.data.calendarConfig?.transparent ? 'none' : '1px solid rgba(255,255,255,0.1)'
                          }}
                        >
                           <div className="absolute inset-0 z-10 bg-transparent"></div>
                           {w.data.calendarId ? (
                             <iframe 
                               src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(w.data.calendarId)}&showTitle=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0&bgcolor=${encodeURIComponent(w.data.calendarConfig?.backgroundColor || '#ffffff')}`} 
                               className="w-full h-full border-none pointer-events-none" 
                               style={{
                                 filter: w.data.calendarConfig?.theme === 'dark' ? 'invert(1) hue-rotate(180deg) contrast(1.2)' : 'none',
                                 mixBlendMode: w.data.calendarConfig?.transparent ? (w.data.calendarConfig?.theme === 'dark' ? 'screen' : 'multiply') : 'normal'
                               }}
                             />
                           ) : (
                             <div className="flex flex-col items-center justify-center h-full text-slate-500"><CalendarDays size={32} className="mb-2" /><span className="text-[10px] font-bold">AGENDA</span></div>
                           )}
                        </div>
                      )}
                      {w.type === WidgetType.IFRAME && (
                        <div className="w-full h-full relative bg-white overflow-hidden">
                           {/* Overlay invisível no Editor para permitir arrastar o widget sem interagir com o iframe */}
                           {!w.data.iframeConfig?.interactive && <div className="absolute inset-0 z-10 bg-transparent"></div>}
                           <iframe 
                             src={w.data.url} 
                             className="border-none" 
                             style={{
                               position: 'absolute',
                               top: 0,
                               left: 0,
                               width: w.data.iframeConfig?.viewportWidth ? `${w.data.iframeConfig.viewportWidth}px` : '100%',
                               height: w.data.iframeConfig?.viewportHeight ? `${w.data.iframeConfig.viewportHeight}px` : '100%',
                               transform: `scale(${w.data.iframeConfig?.scale || 1}) translate(${w.data.iframeConfig?.offsetX || 0}px, ${w.data.iframeConfig?.offsetY || 0}px)`,
                               transformOrigin: 'top left',
                               pointerEvents: w.data.iframeConfig?.interactive ? 'auto' : 'none'
                             }}
                             sandbox="allow-scripts allow-same-origin allow-forms"
                             title="Web Widget"
                             onLoad={handleYouTubeIframeLoad}
                           />
                        </div>
                      )}
                      
                      {w.type === WidgetType.NOTES && (
                        <div className="w-full h-full overflow-hidden pointer-events-none">
                          <NotesWidget data={w.data} />
                        </div>
                      )}
                      {w.type === WidgetType.TODO && (
                        <div className="w-full h-full overflow-hidden pointer-events-none">
                          <TodoWidget data={w.data} />
                        </div>
                      )}
                      {w.type === WidgetType.COUNTDOWN && (
                        <div className="w-full h-full overflow-hidden pointer-events-none">
                          <CountdownWidget data={w.data} />
                        </div>
                      )}
                      {w.type === WidgetType.CHORES && (
                        <div className="w-full h-full overflow-hidden pointer-events-none">
                          <ChoresWidget data={w.data} />
                        </div>
                      )}
                      {w.type === WidgetType.MEAL_PLAN && (
                        <div className="w-full h-full overflow-hidden pointer-events-none">
                          <MealPlanWidget data={w.data} />
                        </div>
                      )}
                      {w.type === WidgetType.MARKET_WATCH && (
                        <div className="w-full h-full overflow-hidden pointer-events-none">
                          <MarketWatchWidget data={w.data} />
                        </div>
                      )}
                      {w.type === WidgetType.BROWSER_SNAPSHOT && (
                        <div className="w-full h-full overflow-hidden pointer-events-none">
                          <BrowserSnapshotWidget data={w.data} />
                        </div>
                      )}
                      {w.type === WidgetType.GOOGLE_DOCS && (
                        <div className="w-full h-full overflow-hidden pointer-events-none">
                          <GoogleDocsWidget data={w.data} />
                        </div>
                      )}
                      {w.type === WidgetType.OFFICE_DOCS && (
                        <div className="w-full h-full overflow-hidden pointer-events-none">
                          <OfficeDocsWidget data={w.data} />
                        </div>
                      )}
                      {w.type === WidgetType.POWER_BI && (
                        <div className="w-full h-full overflow-hidden pointer-events-none">
                          <PowerBIWidget data={w.data} />
                        </div>
                      )}
                      {w.type === WidgetType.EMBED_HTML && (
                        <div className="w-full h-full overflow-hidden pointer-events-none">
                          <EmbedHtmlWidget data={w.data} />
                        </div>
                      )}
                      {w.type === WidgetType.AIRTABLE && (
                        <div className="w-full h-full overflow-hidden pointer-events-none">
                          <AirtableWidget data={w.data} />
                        </div>
                      )}
                      {w.type === WidgetType.PDF_DOCUMENT && (
                        <div className="w-full h-full overflow-hidden pointer-events-none">
                          <PdfDocumentWidget data={w.data} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </GridLayout>
            </div>
          </div>
        </main>

        {/* Sidebar Right: Properties */}
        <aside className={`absolute md:relative right-0 top-0 h-full w-80 bg-[#2D3139] border-l border-slate-800 p-6 overflow-y-auto z-[60] shadow-xl transition-transform duration-300 ease-in-out ${showRightSidebar ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
          {currentWidget ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="font-bold text-slate-200 flex items-center gap-2 text-xs uppercase tracking-wider">
                   <Settings size={14} className="text-[#7C3AED]" /> Configuração
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => removeWidget(selectedWidget!)} className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-colors" title="Remover Widget">
                    <Trash2 size={16} />
                  </button>
                  <button onClick={() => setShowRightSidebar(false)} className="md:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors" title="Fechar">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                
                {/* Background Animation Button */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                    <MonitorPlay size={12} /> Fundo Animado
                  </h4>
                  <button 
                    onClick={() => setShowBgAnimModal(true)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                  >
                    <MonitorPlay size={14} />
                    {currentWidget.data.backgroundAnimation && currentWidget.data.backgroundAnimation !== 'none' 
                      ? 'Alterar Animação' 
                      : 'Escolher Fundo Animado'}
                  </button>
                  {currentWidget.data.backgroundAnimation && currentWidget.data.backgroundAnimation !== 'none' && (
                    <button 
                      onClick={() => updateWidgetData(selectedWidget!, { backgroundAnimation: 'none' })}
                      className="w-full mt-2 py-1.5 bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 border border-slate-800 hover:border-rose-500/30 rounded-lg text-[10px] font-bold transition-colors"
                    >
                      Remover Animação
                    </button>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                    <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer bg-slate-900 p-2 rounded border border-slate-800 hover:border-slate-600 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={currentWidget.data.transparentBackground || false} 
                        onChange={(e) => updateWidgetData(selectedWidget!, { transparentBackground: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                      />
                      Fundo Transparente
                    </label>
                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-400">Cor de Fundo</span>
                      <div className="flex items-center gap-2">
                        {currentWidget.data.backgroundColor && (
                          <button 
                            onClick={() => updateWidgetData(selectedWidget!, { backgroundColor: undefined })}
                            className="text-[9px] text-rose-500 hover:text-rose-400 mr-2"
                          >
                            Limpar Cor
                          </button>
                        )}
                        <input 
                          type="color" 
                          value={currentWidget.data.backgroundColor || '#000000'} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { backgroundColor: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border-none p-0 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {currentWidget.type === WidgetType.VIDEO && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase">Link do Vídeo (YouTube ou MP4)</label>
                    <input 
                      type="text" 
                      value={currentWidget.data.videoUrl} 
                      onChange={(e) => updateWidgetData(selectedWidget!, { videoUrl: e.target.value })} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono" 
                      placeholder="https://youtu.be/... ou https://.../video.mp4"
                    />
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-800"></div>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-slate-900 px-2 text-slate-500 font-bold uppercase text-[9px]">ou</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setMediaLibraryConfig({
                          isOpen: true,
                          allowedTypes: 'video',
                          onSelect: (url) => {
                            updateWidgetData(selectedWidget!, { videoUrl: url });
                          }
                        });
                      }}
                      className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer transition-all border border-slate-700 hover:border-slate-500 shadow-lg"
                    >
                      <Upload size={16} />
                      Selecionar Vídeo
                    </button>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer bg-slate-950 p-2 rounded border border-slate-800 hover:border-slate-600">
                        <input 
                          type="checkbox" 
                          checked={currentWidget.data.videoConfig?.autoplay !== false} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { videoConfig: { ...currentWidget.data.videoConfig, autoplay: e.target.checked } })}
                          className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                        />
                        Autoplay
                      </label>
                      <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer bg-slate-950 p-2 rounded border border-slate-800 hover:border-slate-600">
                        <input 
                          type="checkbox" 
                          checked={currentWidget.data.videoConfig?.mute !== false} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { videoConfig: { ...currentWidget.data.videoConfig, mute: e.target.checked } })}
                          className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                        />
                        Mudo
                      </label>
                      <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer bg-slate-950 p-2 rounded border border-slate-800 hover:border-slate-600">
                        <input 
                          type="checkbox" 
                          checked={currentWidget.data.videoConfig?.loop !== false} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { videoConfig: { ...currentWidget.data.videoConfig, loop: e.target.checked } })}
                          className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                        />
                        Loop
                      </label>
                      <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer bg-slate-950 p-2 rounded border border-slate-800 hover:border-slate-600">
                        <input 
                          type="checkbox" 
                          checked={currentWidget.data.videoConfig?.controls === true} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { videoConfig: { ...currentWidget.data.videoConfig, controls: e.target.checked } })}
                          className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                        />
                        Controles
                      </label>
                    </div>
                    
                    {isYouTubeUrl(currentWidget.data.videoUrl || '') && (
                      <div className="flex items-center justify-between bg-slate-950/50 p-2 rounded-lg border border-slate-800/50 mt-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Qualidade YouTube</label>
                        <select 
                          value={currentWidget.data.videoConfig?.youtubeQuality || 'highres'}
                          onChange={(e) => updateWidgetData(selectedWidget!, { videoConfig: { ...currentWidget.data.videoConfig, youtubeQuality: e.target.value } })}
                          className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-2 py-1 outline-none focus:border-cyan-500"
                        >
                          <option value="highres">Máxima (Auto)</option>
                          <option value="hd1080">1080p</option>
                          <option value="hd720">720p</option>
                          <option value="large">480p</option>
                          <option value="medium">360p</option>
                          <option value="small">240p</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
                {currentWidget.type === WidgetType.RSS && (
                  <div className="space-y-4">
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <label className="text-[9px] font-black text-cyan-500 uppercase flex items-center gap-1 mb-2"><Rss size={10} /> Configuração de Feeds</label>
                      
                      <div className="mb-4 space-y-3">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Fonte do Feed</label>
                          <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-400 mb-2 outline-none focus:border-cyan-500 cursor-pointer hover:border-slate-600 transition-colors"
                            onChange={(e) => {
                               if (e.target.value) {
                                 updateWidgetData(selectedWidget!, { rssUrl: e.target.value });
                               }
                            }}
                            value=""
                          >
                            <option value="" disabled>⚡ Escolher Fonte Recomendada...</option>
                            {FEED_CATEGORIES.map((category, idx) => (
                              <optgroup key={idx} label={category.name}>
                                {category.feeds.map(feed => (
                                  <option key={feed.url} value={feed.url}>{feed.name}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>

                          <input 
                            type="text"
                            placeholder="URL do Feed RSS (Ex: https://...)"
                            value={currentWidget.data.rssUrl || currentWidget.data.rssFeeds?.[0]?.url || ''}
                            onChange={(e) => updateWidgetData(selectedWidget!, { rssUrl: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-[10px] text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono break-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 mb-4">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Busca Automática (Google News)</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Ex: Inteligência Artificial..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500 placeholder:text-slate-600"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const target = e.target as HTMLInputElement;
                                if (target.value) {
                                  const newUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(target.value)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
                                  updateWidgetData(selectedWidget!, { rssUrl: newUrl });
                                }
                              }
                            }}
                            id="rss-search-input"
                          />
                          <button 
                            onClick={() => {
                              const input = document.getElementById('rss-search-input') as HTMLInputElement;
                              if (input && input.value) {
                                const newUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(input.value)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
                                updateWidgetData(selectedWidget!, { rssUrl: newUrl });
                              }
                            }}
                            className="bg-slate-800 hover:bg-cyan-600 text-slate-400 hover:text-white px-3 rounded-lg transition-colors border border-slate-700 hover:border-cyan-500"
                          >
                             <Search size={14} />
                          </button>
                        </div>
                        <p className="text-[8px] text-slate-600 mt-1.5">
                          Digite um tema e pressione Enter. O sistema buscará as últimas notícias sobre o assunto no Google News.
                        </p>
                      </div>

                    <div className="pt-4 border-t border-slate-800">
                       <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mb-2"><Settings size={10} /> Layout & Exibição</label>

                       <div className="mb-4">
                          <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Tipo de Notícia (Imagens)</label>
                          <select 
                            value={currentWidget.data.rssConfig?.feedMode || 'default'}
                            onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, feedMode: e.target.value } })}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-[10px] text-slate-300 outline-none focus:border-cyan-500"
                          >
                             <option value="default">Padrão (Misturado - com ou sem imagem)</option>
                             <option value="require-image">Obrigatório Ter Imagem (Pula se não tiver)</option>
                             <option value="text-only">Somente Texto (Oculta imagens, ideal para letreiro)</option>
                          </select>
                       </div>
                       
                       <div className="grid grid-cols-3 gap-2 mb-3">
                          <button 
                            onClick={() => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, layout: 'full-image' } })}
                            className={`p-2 rounded border text-[9px] font-bold uppercase transition-all flex flex-col items-center gap-1 ${currentWidget.data.rssConfig?.layout === 'full-image' || !currentWidget.data.rssConfig?.layout ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                          >
                            <div className="w-full h-4 bg-current opacity-50 rounded-sm"></div>
                            Full Imagem
                          </button>
                          <button 
                            onClick={() => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, layout: 'split' } })}
                            className={`p-2 rounded border text-[9px] font-bold uppercase transition-all flex flex-col items-center gap-1 ${currentWidget.data.rssConfig?.layout === 'split' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                          >
                            <div className="flex flex-col gap-0.5 w-full h-4">
                               <div className="h-2 bg-current opacity-50 rounded-sm w-full"></div>
                               <div className="h-1.5 bg-current opacity-30 rounded-sm w-full"></div>
                            </div>
                            Dividido
                          </button>
                          <button 
                            onClick={() => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, layout: 'ticker' } })}
                            className={`p-2 rounded border text-[9px] font-bold uppercase transition-all flex flex-col items-center gap-1 ${currentWidget.data.rssConfig?.layout === 'ticker' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                          >
                            <div className="w-full h-4 flex items-center justify-center border border-current opacity-50 rounded-sm">
                               <div className="w-full h-1 bg-current rounded-full"></div>
                            </div>
                            Faixa / Banner
                          </button>
                       </div>

                       {/* Typography & Colors - Visible for all RSS layouts */}
                       <div className="mt-3 mb-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4">
                          <label className="text-[9px] font-black text-indigo-400 uppercase flex items-center gap-1 mb-1"><Palette size={10} /> Estilo do Texto</label>
                          
                          <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="text-[8px] text-slate-500 uppercase block mb-1">Tamanho Título</label>
                                <select 
                                  value={currentWidget.data.rssConfig?.titleSize || 'normal'}
                                  onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, titleSize: e.target.value } })}
                                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-[10px] text-slate-300 outline-none focus:border-cyan-500"
                                >
                                   <option value="small">Pequeno</option>
                                   <option value="normal">Normal</option>
                                   <option value="large">Grande</option>
                                   <option value="xl">Extra Grande</option>
                                </select>
                             </div>
                             <div>
                                <label className="text-[8px] text-slate-500 uppercase block mb-1">Tamanho Descrição</label>
                                <select 
                                  value={currentWidget.data.rssConfig?.descriptionSize || 'normal'}
                                  onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, descriptionSize: e.target.value } })}
                                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-[10px] text-slate-300 outline-none focus:border-cyan-500"
                                >
                                   <option value="small">Pequeno</option>
                                   <option value="normal">Normal</option>
                                   <option value="large">Grande</option>
                                   <option value="xl">Extra Grande</option>
                                </select>
                             </div>
                          </div>
                          
                          <div>
                             <label className="text-[8px] text-slate-500 uppercase block mb-1">Fonte / Tipografia</label>
                             <select 
                               value={currentWidget.data.rssConfig?.fontFamily || 'sans'}
                               onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, fontFamily: e.target.value } })}
                               className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-[10px] text-slate-300 outline-none focus:border-cyan-500"
                             >
                                <option value="sans">Padrão (Sans)</option>
                                <option value="serif">Serif</option>
                                <option value="mono">Monospace</option>
                                <option value="display">Display (Impact)</option>
                             </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1">
                             <div>
                                <label className="text-[8px] text-slate-500 uppercase block mb-1">Cor Título</label>
                                <div className="flex items-center gap-2">
                                   <input 
                                     type="color" 
                                     value={currentWidget.data.rssConfig?.titleColor || '#ffffff'}
                                     onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, titleColor: e.target.value } })}
                                     className="w-8 h-8 rounded bg-transparent border-none cursor-pointer"
                                   />
                                   <span className="text-[9px] text-slate-400 font-mono">{currentWidget.data.rssConfig?.titleColor || '#ffffff'}</span>
                                </div>
                             </div>
                             <div>
                                <label className="text-[8px] text-slate-500 uppercase block mb-1">Cor Texto</label>
                                <div className="flex items-center gap-2">
                                   <input 
                                     type="color" 
                                     value={currentWidget.data.rssConfig?.textColor || '#94a3b8'}
                                     onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, textColor: e.target.value } })}
                                     className="w-8 h-8 rounded bg-transparent border-none cursor-pointer"
                                   />
                                   <span className="text-[9px] text-slate-400 font-mono">{currentWidget.data.rssConfig?.textColor || '#94a3b8'}</span>
                                </div>
                             </div>
                          </div>
                       </div>

                       {currentWidget.data.rssConfig?.layout === 'split' && (
                          <div className="mt-3 mb-3 p-2 bg-slate-900/50 rounded border border-slate-800 space-y-3">
                             <div className="flex items-center gap-2">
                               <input 
                                 type="checkbox" 
                                 id="rss-show-full"
                                 checked={currentWidget.data.rssConfig?.showFullContent || false} 
                                 onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, showFullContent: e.target.checked } })}
                                 className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 w-3 h-3"
                               />
                               <label htmlFor="rss-show-full" className="text-[9px] font-bold text-slate-400 uppercase cursor-pointer select-none">
                                 Exibir conteúdo completo
                                </label>
                             </div>
                             <p className="text-[8px] text-slate-600 pl-5 leading-tight">
                                Ajusta o card para exibir mais texto e evita cortes, preenchendo o espaço disponível.
                             </p>

                             {/* Marquee Settings */}
                             <div className="pt-2 border-t border-slate-800/50">
                                <div className="flex items-center gap-2 mb-2">
                                   <input 
                                     type="checkbox" 
                                     id="rss-marquee"
                                     checked={currentWidget.data.rssConfig?.enableMarquee || false} 
                                     onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, enableMarquee: e.target.checked } })}
                                     className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 w-3 h-3"
                                   />
                                   <label htmlFor="rss-marquee" className="text-[9px] font-bold text-slate-400 uppercase cursor-pointer select-none flex items-center gap-1">
                                     <MoveHorizontal size={10} /> Animação Lateral (Marquee)
                                   </label>
                                </div>
                                
                                {currentWidget.data.rssConfig?.enableMarquee && (
                                   <div className="pl-5 space-y-2">
                                      <div>
                                         <label className="text-[8px] text-slate-500 uppercase block mb-1">Velocidade: {currentWidget.data.rssConfig?.marqueeSpeed || 50}</label>
                                         <input 
                                           type="range" 
                                           min="10" 
                                           max="100" 
                                           step="5"
                                           value={currentWidget.data.rssConfig?.marqueeSpeed || 50}
                                           onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, marqueeSpeed: parseInt(e.target.value) } })}
                                           className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                         />
                                      </div>
                                   </div>
                                )}
                             </div>
                          </div>
                       )}

                       <p className="text-[8px] text-slate-600 mt-2 leading-relaxed">
                         O modo "Faixa / Banner" utiliza o visual Full Imagem otimizado para ocupar toda a largura da tela (redimensione o widget na grade).
                       </p>

                       <div className="mt-4 pt-4 border-t border-slate-800">
                          <button 
                            onClick={setFullScreen}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                          >
                            <Maximize2 size={14} />
                            Preencher Tela Inteira
                          </button>
                          <p className="text-[8px] text-slate-500 mt-2 text-center leading-relaxed">
                            Atenção: Isso removerá todos os outros widgets desta cena e deixará o widget ocupando 100% da tela como fundo.
                          </p>
                       </div>
                    </div>
                  </div>
                )}
                {currentWidget.type === WidgetType.WEATHER && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><CloudSun size={10} /> Cidade e Estado</label>
                    <input 
                      type="text" 
                      value={currentWidget.data.city || ''} 
                      onChange={(e) => {
                        const newCity = e.target.value;
                        const updates: any = { city: newCity };
                        if (currentWidget.data.model === 'glass' && newCity.length > 3) {
                           updates.backgroundImage = `https://image.pollinations.ai/prompt/view%20of%20${encodeURIComponent(newCity)}%20city%20skyline%20weather%20background`;
                        }
                        updateWidgetData(selectedWidget!, updates);
                      }} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono mb-2" 
                      placeholder="Ex: São Paulo, SP"
                    />
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-400 outline-none focus:border-cyan-500 cursor-pointer mb-2"
                      onChange={(e) => {
                        if (e.target.value) {
                          const newCity = e.target.value;
                          const updates: any = { city: newCity };
                          if (currentWidget.data.model === 'glass') {
                             updates.backgroundImage = `https://image.pollinations.ai/prompt/view%20of%20${encodeURIComponent(newCity)}%20city%20skyline%20weather%20background`;
                          }
                          updateWidgetData(selectedWidget!, updates);
                        }
                      }}
                      value=""
                    >
                      <option value="" disabled>📍 Selecionar cidade popular...</option>
                      <optgroup label="Paraíba">
                        <option value="Campina Grande, PB">Campina Grande, PB</option>
                        <option value="João Pessoa, PB">João Pessoa, PB</option>
                      </optgroup>
                      <optgroup label="Capitais Brasileiras">
                        <option value="São Paulo, SP">São Paulo, SP</option>
                        <option value="Rio de Janeiro, RJ">Rio de Janeiro, RJ</option>
                        <option value="Brasília, DF">Brasília, DF</option>
                        <option value="Salvador, BA">Salvador, BA</option>
                        <option value="Fortaleza, CE">Fortaleza, CE</option>
                        <option value="Belo Horizonte, MG">Belo Horizonte, MG</option>
                        <option value="Manaus, AM">Manaus, AM</option>
                        <option value="Curitiba, PR">Curitiba, PR</option>
                        <option value="Recife, PE">Recife, PE</option>
                        <option value="Porto Alegre, RS">Porto Alegre, RS</option>
                        <option value="Belém, PA">Belém, PA</option>
                        <option value="Goiânia, GO">Goiânia, GO</option>
                        <option value="Florianópolis, SC">Florianópolis, SC</option>
                        <option value="Vitória, ES">Vitória, ES</option>
                      </optgroup>
                      <optgroup label="Mundo">
                        <option value="New York">Nova York, EUA</option>
                        <option value="London">Londres, UK</option>
                        <option value="Paris">Paris, França</option>
                        <option value="Tokyo">Tóquio, Japão</option>
                        <option value="Lisbon">Lisboa, Portugal</option>
                      </optgroup>
                    </select>
                    
                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mt-4"><Settings size={10} /> Modelo Visual</label>
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
                      value={currentWidget.data.model || 'simple'}
                      onChange={(e) => {
                        const newModel = e.target.value;
                        const updates: any = { model: newModel };
                        if (newModel === 'glass') {
                           const city = currentWidget.data.city || 'Campina Grande';
                           updates.backgroundImage = `https://image.pollinations.ai/prompt/view%20of%20${encodeURIComponent(city)}%20city%20skyline%20weather%20background`;
                        }
                        updateWidgetData(selectedWidget!, updates);
                      }}
                    >
                      <option value="simple">Simples (Ícone + Temp)</option>
                      <option value="detailed">Detalhado (Completo)</option>
                      <option value="minimal">Minimalista (Texto)</option>
                      <option value="glass">Glassmorphism (Moderno)</option>
                      <option value="forecast">Previsão (3 Dias)</option>
                      <option value="windows">Windows (Gráfico)</option>
                      <option value="weekly">Semanal (7 Dias)</option>
                    </select>
                    
                    {currentWidget.data.model === 'windows' && (
                      <div className="mt-4 pt-4 border-t border-slate-800">
                        <label className="block text-xs font-medium text-slate-400 mb-2">Exibição do Gráfico</label>
                        <select
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                          value={currentWidget.data.windowsView || 'precipitation'}
                          onChange={(e) => updateWidgetData(selectedWidget!, { windowsView: e.target.value })}
                        >
                          <option value="precipitation">Precipitação</option>
                          <option value="hourly">De hora em hora (Temperatura)</option>
                          <option value="daily">Diariamente (Máx/Mín)</option>
                        </select>
                      </div>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-slate-800">
                       <SizeInput 
                         label="Escala Geral (Tamanho)"
                         value={currentWidget.data.weatherConfig?.baseFontSize}
                         onChange={(val) => updateWidgetData(selectedWidget!, { weatherConfig: { ...currentWidget.data.weatherConfig, baseFontSize: val } })}
                         placeholder="1cqw"
                         step={0.1}
                       />
                    </div>
                    
                    <p className="text-[9px] text-slate-600 leading-relaxed mt-2">
                      Ajuste o tamanho de todos os elementos do widget de uma só vez. Use 'cqw' para tamanho relativo ou 'px' para fixo.
                    </p>
                  </div>
                )}
                {currentWidget.type === WidgetType.FULL_INFO && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><CloudSun size={10} /> Cidade e Estado</label>
                    <input 
                      type="text" 
                      value={currentWidget.data.city || ''} 
                      onChange={(e) => updateWidgetData(selectedWidget!, { city: e.target.value })} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono mb-2" 
                      placeholder="Ex: São Paulo, SP"
                    />
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-400 outline-none focus:border-cyan-500 cursor-pointer mb-2"
                      onChange={(e) => {
                        if (e.target.value) {
                          updateWidgetData(selectedWidget!, { city: e.target.value });
                        }
                      }}
                      value=""
                    >
                      <option value="" disabled>📍 Selecionar cidade popular...</option>
                      <optgroup label="Paraíba">
                        <option value="Campina Grande, PB">Campina Grande, PB</option>
                        <option value="João Pessoa, PB">João Pessoa, PB</option>
                      </optgroup>
                      <optgroup label="Capitais Brasileiras">
                        <option value="São Paulo, SP">São Paulo, SP</option>
                        <option value="Rio de Janeiro, RJ">Rio de Janeiro, RJ</option>
                        <option value="Brasília, DF">Brasília, DF</option>
                        <option value="Salvador, BA">Salvador, BA</option>
                        <option value="Fortaleza, CE">Fortaleza, CE</option>
                        <option value="Belo Horizonte, MG">Belo Horizonte, MG</option>
                        <option value="Manaus, AM">Manaus, AM</option>
                        <option value="Curitiba, PR">Curitiba, PR</option>
                        <option value="Recife, PE">Recife, PE</option>
                        <option value="Porto Alegre, RS">Porto Alegre, RS</option>
                        <option value="Belém, PA">Belém, PA</option>
                        <option value="Goiânia, GO">Goiânia, GO</option>
                        <option value="Florianópolis, SC">Florianópolis, SC</option>
                        <option value="Vitória, ES">Vitória, ES</option>
                      </optgroup>
                    </select>

                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mt-4"><Settings size={10} /> Modelo Visual</label>
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
                      value={currentWidget.data.model || 'standard'}
                      onChange={(e) => updateWidgetData(selectedWidget!, { model: e.target.value })}
                    >
                      <option value="standard">Padrão</option>
                      <option value="minimal">Minimalista</option>
                      <option value="glass">Glassmorphism</option>
                      <option value="modern">Moderno (Dividido)</option>
                    </select>

                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mt-4"><ImageIcon size={10} /> Imagem de Fundo (Opcional)</label>
                    <input 
                      type="text" 
                      value={currentWidget.data.backgroundImage || ''} 
                      onChange={(e) => updateWidgetData(selectedWidget!, { backgroundImage: e.target.value })} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono" 
                      placeholder="URL da imagem (ex: https://...)"
                    />
                    <p className="text-[9px] text-slate-600 leading-relaxed mt-1">
                      Dica: Se deixar vazio, usará a animação de fundo selecionada na aba "Aparência".
                    </p>

                    <div className="space-y-4 mt-4 pt-4 border-t border-slate-800">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">Tamanho dos Textos</label>
                          <span className="text-[10px] font-mono text-cyan-500">{currentWidget.data.textSize || 100}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="50" 
                          max="200" 
                          step="5"
                          value={currentWidget.data.textSize || 100} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { textSize: parseInt(e.target.value) })}
                          className="w-full accent-cyan-500"
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">Tamanho dos Números</label>
                          <span className="text-[10px] font-mono text-cyan-500">{currentWidget.data.numberSize || 100}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="50" 
                          max="300" 
                          step="5"
                          value={currentWidget.data.numberSize || 100} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { numberSize: parseInt(e.target.value) })}
                          className="w-full accent-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <button 
                        onClick={setFullScreen}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                      >
                        <Maximize2 size={14} />
                        Preencher Tela Inteira
                      </button>
                      <p className="text-[8px] text-slate-500 mt-2 text-center leading-relaxed">
                        Atenção: Isso removerá todos os outros widgets desta cena e deixará o widget ocupando 100% da tela como fundo.
                      </p>
                    </div>
                  </div>
                )}
                {currentWidget.type === WidgetType.CLOCK && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><Clock size={10} /> Cidade (Opcional)</label>
                    <input 
                      type="text" 
                      value={currentWidget.data.city || ''} 
                      onChange={(e) => updateWidgetData(selectedWidget!, { city: e.target.value })} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono mb-2" 
                      placeholder="Ex: Londres, Tóquio..."
                    />
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-400 outline-none focus:border-cyan-500 cursor-pointer mb-2"
                      onChange={(e) => {
                        if (e.target.value) {
                          updateWidgetData(selectedWidget!, { city: e.target.value });
                        }
                      }}
                      value=""
                    >
                      <option value="" disabled>📍 Selecionar cidade popular...</option>
                      <optgroup label="Nordeste">
                        <option value="João Pessoa, PB">João Pessoa, PB</option>
                        <option value="Recife, PE">Recife, PE</option>
                        <option value="Salvador, BA">Salvador, BA</option>
                        <option value="Fortaleza, CE">Fortaleza, CE</option>
                        <option value="Natal, RN">Natal, RN</option>
                        <option value="Maceió, AL">Maceió, AL</option>
                        <option value="Aracaju, SE">Aracaju, SE</option>
                        <option value="São Luís, MA">São Luís, MA</option>
                        <option value="Teresina, PI">Teresina, PI</option>
                      </optgroup>
                      <optgroup label="Capitais Brasileiras">
                        <option value="São Paulo, SP">São Paulo, SP</option>
                        <option value="Rio de Janeiro, RJ">Rio de Janeiro, RJ</option>
                        <option value="Brasília, DF">Brasília, DF</option>
                        <option value="Belo Horizonte, MG">Belo Horizonte, MG</option>
                        <option value="Manaus, AM">Manaus, AM</option>
                        <option value="Curitiba, PR">Curitiba, PR</option>
                        <option value="Porto Alegre, RS">Porto Alegre, RS</option>
                        <option value="Belém, PA">Belém, PA</option>
                        <option value="Goiânia, GO">Goiânia, GO</option>
                        <option value="Florianópolis, SC">Florianópolis, SC</option>
                        <option value="Vitória, ES">Vitória, ES</option>
                      </optgroup>
                      <optgroup label="Mundo">
                        <option value="New York">Nova York, EUA</option>
                        <option value="London">Londres, UK</option>
                        <option value="Paris">Paris, França</option>
                        <option value="Tokyo">Tóquio, Japão</option>
                        <option value="Lisbon">Lisboa, Portugal</option>
                      </optgroup>
                    </select>
                    
                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mt-4"><Settings size={10} /> Estilo do Relógio</label>
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
                      value={currentWidget.data.model || 'standard'}
                      onChange={(e) => updateWidgetData(selectedWidget!, { model: e.target.value })}
                    >
                      <option value="standard">Padrão (HH:MM:SS)</option>
                      <option value="minimal">Minimalista (HH:MM)</option>
                      <option value="date-time">Data e Hora (Completo)</option>
                      <option value="analog">Analógico (Ponteiros)</option>
                      <option value="neon">Neon (Brilhante)</option>
                      <option value="vertical">Vertical (Empilhado)</option>
                    </select>

                    <SizeInput 
                      label="Tamanho da Fonte"
                      value={currentWidget.data.fontSize}
                      onChange={(val) => updateWidgetData(selectedWidget!, { fontSize: val })}
                      placeholder="8cqw"
                      isFont={true}
                    />

                    <p className="text-[9px] text-slate-600 leading-relaxed mt-2">
                      Se definido, o relógio mostrará o horário local dessa cidade. Caso contrário, mostrará o horário do sistema.
                    </p>
                  </div>
                )}
                {currentWidget.type === WidgetType.CALENDAR && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><Calendar size={10} /> ID do Google Calendar</label>
                    <input 
                      type="text" 
                      value={currentWidget.data.calendarId || ''} 
                      onChange={(e) => updateWidgetData(selectedWidget!, { calendarId: e.target.value })} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono" 
                      placeholder="Ex: pt.brazilian#holiday@group.v.calendar.google.com"
                    />
                    <p className="text-[9px] text-slate-600 leading-relaxed">
                      Para obter o ID: Abra o Google Calendar {'>'} Configurações {'>'} Selecione a agenda {'>'} Integrar agenda {'>'} Copie o "ID da agenda".
                      <br/><span className="text-yellow-600">Importante:</span> A agenda deve estar configurada como "Pública".
                    </p>

                    <div className="border-t border-slate-800 pt-4 mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="show-cal-title"
                          checked={currentWidget.data.calendarConfig?.showTitle ?? !!currentWidget.data.calendarConfig?.customTitle} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { calendarConfig: { ...currentWidget.data.calendarConfig, showTitle: e.target.checked } })}
                          className="accent-cyan-500 w-4 h-4 rounded border-slate-700 bg-slate-900 focus:ring-0"
                        />
                        <label htmlFor="show-cal-title" className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 cursor-pointer select-none">
                          <Type size={10} /> Exibir Título Personalizado
                        </label>
                      </div>

                      {(currentWidget.data.calendarConfig?.showTitle ?? !!currentWidget.data.calendarConfig?.customTitle) && (
                        <div className="space-y-3 pl-2 border-l-2 border-slate-800 ml-1">
                          <input 
                            type="text" 
                            value={currentWidget.data.calendarConfig?.customTitle || ''} 
                            onChange={(e) => updateWidgetData(selectedWidget!, { calendarConfig: { ...currentWidget.data.calendarConfig, customTitle: e.target.value } })} 
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono" 
                            placeholder="Ex: Reuniões da Diretoria"
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                               <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Cor do Título</label>
                               <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded p-1">
                                 <input 
                                   type="color" 
                                   value={currentWidget.data.calendarConfig?.titleColor || '#ffffff'}
                                   onChange={(e) => updateWidgetData(selectedWidget!, { calendarConfig: { ...currentWidget.data.calendarConfig, titleColor: e.target.value } })}
                                   className="w-6 h-6 bg-transparent border-none rounded cursor-pointer"
                                 />
                                 <span className="text-[10px] font-mono text-slate-400">{currentWidget.data.calendarConfig?.titleColor || '#ffffff'}</span>
                               </div>
                            </div>
                            <div>
                               <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Tamanho Título</label>
                               <select 
                                 className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px] text-slate-200 outline-none h-[34px]"
                                 value={currentWidget.data.calendarConfig?.titleSize || '1.5rem'}
                                 onChange={(e) => updateWidgetData(selectedWidget!, { calendarConfig: { ...currentWidget.data.calendarConfig, titleSize: e.target.value } })}
                               >
                                 <option value="1rem">Pequeno</option>
                                 <option value="1.5rem">Médio</option>
                                 <option value="2rem">Grande</option>
                                 <option value="3rem">Gigante</option>
                               </select>
                            </div>
                          </div>
                        </div>
                      )}

                      <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mt-2"><Palette size={10} /> Tema Visual</label>
                      <select 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
                        value={currentWidget.data.calendarConfig?.theme || 'light'}
                        onChange={(e) => updateWidgetData(selectedWidget!, { calendarConfig: { ...currentWidget.data.calendarConfig, theme: e.target.value as any } })}
                      >
                        <option value="light">Claro (Padrão)</option>
                        <option value="dark">Escuro (Invertido)</option>
                        <option value="glass">Glassmorphism (Transparente)</option>
                        <option value="minimal">Minimalista (Limpo)</option>
                        <option value="neon">Neon (Cyberpunk)</option>
                        <option value="card">Cartão (Sombreado)</option>
                      </select>

                      <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mt-2"><Settings size={10} /> Estilização Avançada</label>
                      
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer bg-slate-950 p-2 rounded border border-slate-800 hover:border-slate-600">
                        <input 
                          type="checkbox" 
                          checked={currentWidget.data.calendarConfig?.transparent || false} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { calendarConfig: { ...currentWidget.data.calendarConfig, transparent: e.target.checked } })}
                          className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                        />
                        Modo Transparente (Blend)
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <div>
                           <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Cor de Fundo (Se não transparente)</label>
                           <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded p-1">
                             <input 
                               type="color" 
                               value={currentWidget.data.calendarConfig?.backgroundColor || '#ffffff'}
                               onChange={(e) => updateWidgetData(selectedWidget!, { calendarConfig: { ...currentWidget.data.calendarConfig, backgroundColor: e.target.value } })}
                               className="w-6 h-6 bg-transparent border-none rounded cursor-pointer"
                             />
                             <span className="text-[10px] font-mono text-slate-400">{currentWidget.data.calendarConfig?.backgroundColor || '#ffffff'}</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {currentWidget.type === WidgetType.IFRAME && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><Globe size={10} /> URL do Website</label>
                    <input 
                      type="text" 
                      value={currentWidget.data.url} 
                      onChange={(e) => updateWidgetData(selectedWidget!, { url: e.target.value })} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono" 
                      placeholder="https://..."
                    />
                    <p className="text-[9px] text-slate-600 leading-relaxed border-l-2 border-yellow-600 pl-2">
                      Nota: Se aparecer um ícone de "erro" ou a tela ficar cinza, o site possui proteção (X-Frame-Options) e não permite ser exibido dentro do player. Isso é uma trava de segurança do próprio site.
                    </p>

                    <div className="border-t border-slate-800 pt-4 mt-4 space-y-4">
                      <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><Settings size={10} /> Enquadramento e Interação</label>
                      
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer bg-slate-950 p-2 rounded border border-slate-800 hover:border-slate-600 mb-3">
                        <input 
                          type="checkbox" 
                          checked={currentWidget.data.iframeConfig?.interactive || false} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { iframeConfig: { ...currentWidget.data.iframeConfig, interactive: e.target.checked } })}
                          className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-300">Permitir Interação / Login</span>
                          <span className="text-[8px] text-slate-500">Ative para fazer login ou navegar. O login será salvo no navegador do player.</span>
                        </div>
                      </div>
                      
                      <p className="text-[8px] text-slate-500 leading-relaxed mb-3 pl-1">
                        * Para manter o login salvo, certifique-se de que o navegador do player aceita cookies de terceiros.
                      </p>

                      <p className="text-[8px] text-yellow-500 leading-relaxed bg-yellow-500/10 p-2 rounded border border-yellow-500/20 mb-3">
                        Para enquadrar uma área específica que será salva e exibida na TV, use os controles de <b>Zoom</b> e <b>Posição X/Y</b> abaixo.
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                           <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Largura (px)</label>
                           <input 
                             type="number" 
                             className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px] text-slate-200 outline-none"
                             value={currentWidget.data.iframeConfig?.viewportWidth || 1920}
                             onChange={(e) => updateWidgetData(selectedWidget!, { iframeConfig: { ...currentWidget.data.iframeConfig, viewportWidth: parseInt(e.target.value) } })}
                           />
                        </div>
                        <div>
                           <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Altura (px)</label>
                           <input 
                             type="number" 
                             className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px] text-slate-200 outline-none"
                             value={currentWidget.data.iframeConfig?.viewportHeight || 1080}
                             onChange={(e) => updateWidgetData(selectedWidget!, { iframeConfig: { ...currentWidget.data.iframeConfig, viewportHeight: parseInt(e.target.value) } })}
                           />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Zoom (Escala)</label>
                        <input 
                          type="range" 
                          min="0.1" max="3" step="0.1"
                          className="w-full accent-cyan-500"
                          value={currentWidget.data.iframeConfig?.scale || 1}
                          onChange={(e) => updateWidgetData(selectedWidget!, { iframeConfig: { ...currentWidget.data.iframeConfig, scale: parseFloat(e.target.value) } })}
                        />
                        <div className="text-right text-[9px] font-mono text-cyan-400">{currentWidget.data.iframeConfig?.scale || 1}x</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                           <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Posição X</label>
                           <input 
                             type="number" 
                             className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px] text-slate-200 outline-none"
                             value={currentWidget.data.iframeConfig?.offsetX || 0}
                             onChange={(e) => updateWidgetData(selectedWidget!, { iframeConfig: { ...currentWidget.data.iframeConfig, offsetX: parseInt(e.target.value) } })}
                           />
                        </div>
                        <div>
                           <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Posição Y</label>
                           <input 
                             type="number" 
                             className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px] text-slate-200 outline-none"
                             value={currentWidget.data.iframeConfig?.offsetY || 0}
                             onChange={(e) => updateWidgetData(selectedWidget!, { iframeConfig: { ...currentWidget.data.iframeConfig, offsetY: parseInt(e.target.value) } })}
                           />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {currentWidget.type === WidgetType.IMAGE && (
                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        setMediaLibraryConfig({
                          isOpen: true,
                          allowedTypes: 'image',
                          onSelect: (url) => {
                            updateWidgetData(selectedWidget!, { url: url });
                          }
                        });
                      }}
                      className="w-full py-3 bg-slate-800 text-slate-300 rounded-lg font-bold text-xs hover:bg-slate-700 hover:text-white transition-all border border-slate-700 hover:border-cyan-500 flex items-center justify-center gap-2"
                    >
                      <Upload size={14} /> 
                      Selecionar Imagem
                    </button>
                    <div className="text-center text-[9px] text-slate-600 font-bold uppercase">- OU -</div>
                    <input type="text" placeholder="URL da imagem..." value={currentWidget.data.url} onChange={(e) => updateWidgetData(selectedWidget!, { url: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-[10px] text-slate-200 outline-none focus:border-cyan-500" />
                    <div className="border-t border-slate-800 pt-4 mt-2 space-y-4">
                      <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><Settings size={10} /> Enquadramento e Escala</label>
                      
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Ajuste da Imagem</label>
                        <select 
                          className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
                          value={currentWidget.data.imageConfig?.objectFit || 'cover'}
                          onChange={(e) => updateWidgetData(selectedWidget!, { imageConfig: { ...currentWidget.data.imageConfig, objectFit: e.target.value as any } })}
                        >
                          <option value="cover">Preencher (Corta bordas)</option>
                          <option value="contain">Conter (Mostra inteira)</option>
                          <option value="fill">Esticar (Ignora proporção)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Zoom (Escala)</label>
                        <input 
                          type="range" 
                          min="0.1" max="3" step="0.1"
                          className="w-full accent-cyan-500"
                          value={currentWidget.data.imageConfig?.scale || 1}
                          onChange={(e) => updateWidgetData(selectedWidget!, { imageConfig: { ...currentWidget.data.imageConfig, scale: parseFloat(e.target.value) } })}
                        />
                        <div className="text-right text-[9px] font-mono text-cyan-400">{currentWidget.data.imageConfig?.scale || 1}x</div>
                      </div>
                      <p className="text-[8px] text-slate-500 leading-relaxed mb-3">
                        Utilize as alças (bordas do widget) no canvas para redimensionar a área e os controles acima para ajustar a imagem dentro dessa área.
                      </p>
                    </div>
                  </div>
                )}
                {currentWidget.type === WidgetType.GIF && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><Gift size={10} /> URL do GIF</label>
                    <input 
                      type="text" 
                      value={currentWidget.data.url} 
                      onChange={(e) => updateWidgetData(selectedWidget!, { url: e.target.value })} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono" 
                      placeholder="https://media.giphy.com/..."
                    />
                    <div className="flex gap-2">
                      <a 
                        href="https://giphy.com/" 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg font-bold text-[10px] hover:bg-slate-700 hover:text-white transition-all border border-slate-700 hover:border-cyan-500 flex items-center justify-center gap-1 uppercase"
                      >
                        Buscar no Giphy <LinkIcon size={10} />
                      </a>
                    </div>
                    <p className="text-[9px] text-slate-600 leading-relaxed">
                      Copie o "GIF Link" do Giphy ou outra fonte e cole acima.
                    </p>
                  </div>
                )}
                {currentWidget.type === WidgetType.TEXT && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-2 block">Conteúdo</label>
                      <textarea 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 font-medium resize-none" 
                        rows={3} 
                        value={currentWidget.data.content} 
                        onChange={(e) => updateWidgetData(selectedWidget!, { content: e.target.value })} 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <SizeInput 
                        label="Tamanho da Fonte"
                        value={currentWidget.data.textConfig?.fontSize || currentWidget.data.fontSize} // Fallback to old fontSize
                        onChange={(val) => updateWidgetData(selectedWidget!, { 
                          textConfig: { ...(currentWidget.data.textConfig || {}), fontSize: val },
                          fontSize: val
                        })}
                        placeholder="4cqw"
                        step={0.5}
                        isFont={true}
                      />
                      
                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase mb-1.5 block">Cor</label>
                        <div className="flex gap-2 h-[34px]">
                           <input 
                             type="color" 
                             value={currentWidget.data.color || '#ffffff'} 
                             onChange={(e) => updateWidgetData(selectedWidget!, { color: e.target.value })} 
                             className="h-full w-10 bg-transparent border-0 cursor-pointer rounded overflow-hidden p-0" 
                           />
                           <input 
                             type="text" 
                             value={currentWidget.data.color || '#ffffff'} 
                             onChange={(e) => updateWidgetData(selectedWidget!, { color: e.target.value })} 
                             className="w-full bg-slate-950 border border-slate-700 rounded text-[10px] text-slate-300 px-2 uppercase font-mono outline-none focus:border-cyan-500" 
                           />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase mb-1.5 block">Fonte</label>
                        <select 
                          className="w-full bg-slate-950 border border-slate-700 rounded h-[34px] px-2 text-[10px] text-slate-300 outline-none focus:border-cyan-500"
                          value={currentWidget.data.textConfig?.fontFamily || 'Inter'}
                          onChange={(e) => updateWidgetData(selectedWidget!, { textConfig: { ...currentWidget.data.textConfig, fontFamily: e.target.value } })}
                        >
                          <optgroup label="Padrão">
                            <option value="Inter">Inter (Padrão)</option>
                            <option value="Roboto">Roboto</option>
                          </optgroup>
                          <optgroup label="Moderno / Minimalista">
                            <option value="Outfit">Outfit</option>
                            <option value="Manrope">Manrope</option>
                            <option value="Syncopate">Syncopate</option>
                          </optgroup>
                          <optgroup label="Tech / Futurista">
                            <option value="Space Grotesk">Space Grotesk</option>
                            <option value="Orbitron">Orbitron</option>
                            <option value="Rajdhani">Rajdhani</option>
                            <option value="Share Tech Mono">Share Tech Mono</option>
                            <option value="JetBrains Mono">JetBrains Mono</option>
                          </optgroup>
                          <optgroup label="Clássico / Serif">
                            <option value="Playfair Display">Playfair Display</option>
                            <option value="Montserrat">Montserrat</option>
                            <option value="Open Sans">Open Sans</option>
                            <option value="Courier New">Courier New</option>
                          </optgroup>
                        </select>
                      </div>

                      <div>
                         <label className="text-[9px] font-black text-slate-500 uppercase mb-1.5 block">Animação</label>
                         <select 
                           className="w-full bg-slate-950 border border-slate-700 rounded h-[34px] px-2 text-[10px] text-slate-300 outline-none focus:border-cyan-500"
                           value={currentWidget.data.textConfig?.animation || 'none'}
                           onChange={(e) => updateWidgetData(selectedWidget!, { textConfig: { ...currentWidget.data.textConfig, animation: e.target.value as any } })}
                         >
                           <option value="none">Nenhuma</option>
                           <option value="fade">Fade In</option>
                           <option value="slide">Slide Up</option>
                           <option value="typewriter">Datilografia</option>
                           <option value="pulse">Pulsar</option>
                           <option value="bounce">Saltar</option>
                         </select>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-800">
                      <button 
                        onClick={() => updateWidgetData(selectedWidget!, { textConfig: { ...currentWidget.data.textConfig, fontWeight: currentWidget.data.textConfig?.fontWeight === 'bold' ? 'normal' : 'bold' } })}
                        className={`flex-1 h-8 rounded text-[10px] font-bold uppercase transition-colors ${currentWidget.data.textConfig?.fontWeight === 'bold' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-slate-950 text-slate-500 border border-slate-800 hover:bg-slate-900'}`}
                      >
                        Negrito
                      </button>
                      <button 
                        onClick={() => updateWidgetData(selectedWidget!, { textConfig: { ...currentWidget.data.textConfig, fontStyle: currentWidget.data.textConfig?.fontStyle === 'italic' ? 'normal' : 'italic' } })}
                        className={`flex-1 h-8 rounded text-[10px] font-bold uppercase transition-colors ${currentWidget.data.textConfig?.fontStyle === 'italic' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-slate-950 text-slate-500 border border-slate-800 hover:bg-slate-900'}`}
                      >
                        Itálico
                      </button>
                    </div>
                    
                    <div className="flex bg-slate-950 rounded border border-slate-800 p-1">
                      {['left', 'center', 'right'].map((align) => (
                        <button
                          key={align}
                          onClick={() => updateWidgetData(selectedWidget!, { textConfig: { ...currentWidget.data.textConfig, textAlign: align as any } })}
                          className={`flex-1 py-1 rounded text-[10px] uppercase font-bold transition-colors ${currentWidget.data.textConfig?.textAlign === align || (!currentWidget.data.textConfig?.textAlign && align === 'center') ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          {align === 'left' ? 'Esq' : align === 'center' ? 'Centro' : 'Dir'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {currentWidget.type === WidgetType.NOTES && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Recado / Conteúdo</label>
                      <textarea
                        value={currentWidget.data.content || ''}
                        onChange={e => updateWidgetData(selectedWidget!, { content: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 h-28"
                        placeholder="Digite o recado aqui..."
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Tema do Bloco</label>
                      <select
                        value={currentWidget.data.notesConfig?.paperTheme || 'glass'}
                        onChange={e => updateWidgetData(selectedWidget!, { notesConfig: { ...currentWidget.data.notesConfig, paperTheme: e.target.value as any } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer"
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
                        value={currentWidget.data.notesConfig?.fontFamily || 'sans'}
                        onChange={e => updateWidgetData(selectedWidget!, { notesConfig: { ...currentWidget.data.notesConfig, fontFamily: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        <option value="sans">Sans-serif (Moderna)</option>
                        <option value="serif">Serif (Clássica)</option>
                        <option value="mono">Monospace (Código)</option>
                        <option value="display">Display (Negrito)</option>
                      </select>
                    </div>
                    <SizeInput 
                      label="Tamanho da Fonte"
                      value={currentWidget.data.notesConfig?.fontSize}
                      onChange={(val) => updateWidgetData(selectedWidget!, { notesConfig: { ...currentWidget.data.notesConfig, fontSize: val } })}
                      placeholder="16px"
                      isFont={true}
                    />
                  </div>
                )}
                {currentWidget.type === WidgetType.TODO && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Título da Lista</label>
                      <input
                        type="text"
                        value={currentWidget.data.todoConfig?.title || 'Lista de Tarefas'}
                        onChange={e => updateWidgetData(selectedWidget!, { todoConfig: { ...currentWidget.data.todoConfig, title: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Adicionar Tarefa</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id={`new-todo-${currentWidget.i}`}
                          placeholder="Nova tarefa..."
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget;
                              if (input.value.trim()) {
                                const items = currentWidget.data.todoConfig?.items || [];
                                const newItem = { id: Math.random().toString(36).substr(2, 9), text: input.value.trim(), done: false };
                                updateWidgetData(selectedWidget!, { todoConfig: { ...currentWidget.data.todoConfig, items: [...items, newItem] } });
                                input.value = '';
                              }
                            }
                          }}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById(`new-todo-${currentWidget.i}`) as HTMLInputElement;
                            if (input && input.value.trim()) {
                              const items = currentWidget.data.todoConfig?.items || [];
                              const newItem = { id: Math.random().toString(36).substr(2, 9), text: input.value.trim(), done: false };
                              updateWidgetData(selectedWidget!, { todoConfig: { ...currentWidget.data.todoConfig, items: [...items, newItem] } });
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
                      <label className="text-[9px] font-black text-slate-500 uppercase block">Tarefas ({currentWidget.data.todoConfig?.items?.length || 0})</label>
                      {(currentWidget.data.todoConfig?.items || []).map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between bg-slate-900/60 p-2 rounded border border-slate-800 gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={e => {
                                const items = currentWidget.data.todoConfig.items.map((i: any) => i.id === item.id ? { ...i, done: e.target.checked } : i);
                                updateWidgetData(selectedWidget!, { todoConfig: { ...currentWidget.data.todoConfig, items } });
                              }}
                              className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className={`text-xs truncate ${item.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>{item.text}</span>
                          </div>
                          <button
                            onClick={() => {
                              const items = currentWidget.data.todoConfig.items.filter((i: any) => i.id !== item.id);
                              updateWidgetData(selectedWidget!, { todoConfig: { ...currentWidget.data.todoConfig, items } });
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
                {currentWidget.type === WidgetType.COUNTDOWN && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Título</label>
                      <input
                        type="text"
                        value={currentWidget.data.countdownConfig?.title || ''}
                        onChange={e => updateWidgetData(selectedWidget!, { countdownConfig: { ...currentWidget.data.countdownConfig, title: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                        placeholder="Ex: Lançamento"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Data Alvo</label>
                      <input
                        type="datetime-local"
                        value={currentWidget.data.countdownConfig?.targetDate || ''}
                        onChange={e => updateWidgetData(selectedWidget!, { countdownConfig: { ...currentWidget.data.countdownConfig, targetDate: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Mensagem ao Terminar</label>
                      <input
                        type="text"
                        value={currentWidget.data.countdownConfig?.expiredMessage || ''}
                        onChange={e => updateWidgetData(selectedWidget!, { countdownConfig: { ...currentWidget.data.countdownConfig, expiredMessage: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                        placeholder="Ex: Chegou o momento!"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Tema</label>
                      <select
                        value={currentWidget.data.countdownConfig?.theme || 'glass'}
                        onChange={e => updateWidgetData(selectedWidget!, { countdownConfig: { ...currentWidget.data.countdownConfig, theme: e.target.value as any } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        <option value="glass">Glassmorphism</option>
                        <option value="neon">Neon Vermelho</option>
                        <option value="bold-gradient">Gradiente Forte</option>
                        <option value="minimal">Minimalista</option>
                      </select>
                    </div>
                  </div>
                )}
                {currentWidget.type === WidgetType.CHORES && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Título</label>
                      <input
                        type="text"
                        value={currentWidget.data.choresConfig?.title || ''}
                        onChange={e => updateWidgetData(selectedWidget!, { choresConfig: { ...currentWidget.data.choresConfig, title: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                    
                    <div className="bg-slate-900/40 p-2 rounded border border-slate-800 space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase block">Adicionar Dever</span>
                      <input
                        type="text"
                        id={`new-chore-text-${currentWidget.i}`}
                        placeholder="Nome da atividade..."
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white outline-none focus:border-cyan-500"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          id={`new-chore-assignee-${currentWidget.i}`}
                          placeholder="Responsável..."
                          className="bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white outline-none focus:border-cyan-500"
                        />
                        <select
                          id={`new-chore-day-${currentWidget.i}`}
                          className="bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer"
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
                          const textInput = document.getElementById(`new-chore-text-${currentWidget.i}`) as HTMLInputElement;
                          const assInput = document.getElementById(`new-chore-assignee-${currentWidget.i}`) as HTMLInputElement;
                          const daySelect = document.getElementById(`new-chore-day-${currentWidget.i}`) as HTMLSelectElement;
                          if (textInput?.value.trim() && assInput?.value.trim()) {
                            const items = currentWidget.data.choresConfig?.items || [];
                            const newItem = {
                              id: Math.random().toString(36).substr(2, 9),
                              chore: textInput.value.trim(),
                              assignee: assInput.value.trim(),
                              day: daySelect.value,
                              done: false
                            };
                            updateWidgetData(selectedWidget!, { choresConfig: { ...currentWidget.data.choresConfig, items: [...items, newItem] } });
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
                      {(currentWidget.data.choresConfig?.items || []).map((item: any) => (
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
                                const items = currentWidget.data.choresConfig.items.map((i: any) => i.id === item.id ? { ...i, done: e.target.checked } : i);
                                updateWidgetData(selectedWidget!, { choresConfig: { ...currentWidget.data.choresConfig, items } });
                              }}
                              className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                            />
                            <button
                              onClick={() => {
                                const items = currentWidget.data.choresConfig.items.filter((i: any) => i.id !== item.id);
                                updateWidgetData(selectedWidget!, { choresConfig: { ...currentWidget.data.choresConfig, items } });
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
                {currentWidget.type === WidgetType.MEAL_PLAN && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Título</label>
                      <input
                        type="text"
                        value={currentWidget.data.mealPlanConfig?.title || ''}
                        onChange={e => updateWidgetData(selectedWidget!, { mealPlanConfig: { ...currentWidget.data.mealPlanConfig, title: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                    
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Dia para Editar</label>
                      <select
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer"
                        value={activeMealDay}
                        onChange={(e) => setActiveMealDay(e.target.value)}
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
                      const daysData = currentWidget.data.mealPlanConfig?.days || {};
                      const dayMeal = daysData[activeMealDay] || {};

                      const updateMeal = (mealKey: string, val: string) => {
                        const updatedDays = {
                          ...daysData,
                          [activeMealDay]: {
                            ...dayMeal,
                            [mealKey]: val
                          }
                        };
                        updateWidgetData(selectedWidget!, { mealPlanConfig: { ...currentWidget.data.mealPlanConfig, days: updatedDays } });
                      };

                      return (
                        <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800 space-y-2">
                          <span className="text-[9px] font-black text-cyan-400 uppercase block">Refeições de {activeMealDay}</span>
                          <div>
                            <label className="text-[8px] text-slate-400 block mb-0.5">Café da Manhã</label>
                            <input
                              type="text"
                              value={dayMeal.breakfast || ''}
                              onChange={e => updateMeal('breakfast', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white outline-none focus:border-cyan-500"
                              placeholder="Ex: Ovos, Pão e Café"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-slate-400 block mb-0.5">Almoço</label>
                            <input
                              type="text"
                              value={dayMeal.lunch || ''}
                              onChange={e => updateMeal('lunch', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white outline-none focus:border-cyan-500"
                              placeholder="Ex: Frango com Salada e Arroz"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-slate-400 block mb-0.5">Jantar</label>
                            <input
                              type="text"
                              value={dayMeal.dinner || ''}
                              onChange={e => updateMeal('dinner', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white outline-none focus:border-cyan-500"
                              placeholder="Ex: Sopa leve"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-slate-400 block mb-0.5">Lanches</label>
                            <input
                              type="text"
                              value={dayMeal.snacks || ''}
                              onChange={e => updateMeal('snacks', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white outline-none focus:border-cyan-500"
                              placeholder="Ex: Frutas ou Mix de Castanhas"
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {currentWidget.type === WidgetType.MARKET_WATCH && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Título</label>
                      <input
                        type="text"
                        value={currentWidget.data.marketWatchConfig?.title || ''}
                        onChange={e => updateWidgetData(selectedWidget!, { marketWatchConfig: { ...currentWidget.data.marketWatchConfig, title: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Layout</label>
                      <select
                        value={currentWidget.data.marketWatchConfig?.layout || 'grid'}
                        onChange={e => updateWidgetData(selectedWidget!, { marketWatchConfig: { ...currentWidget.data.marketWatchConfig, layout: e.target.value as any } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer"
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
                          id={`new-symbol-${currentWidget.i}`}
                          placeholder="Ex: AAPL, BTC-USD, EURUSD=X"
                          className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 uppercase"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget;
                              if (input.value.trim()) {
                                const symbols = currentWidget.data.marketWatchConfig?.symbols || [];
                                const sym = input.value.trim().toUpperCase();
                                if (!symbols.includes(sym)) {
                                  updateWidgetData(selectedWidget!, { marketWatchConfig: { ...currentWidget.data.marketWatchConfig, symbols: [...symbols, sym] } });
                                }
                                input.value = '';
                              }
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById(`new-symbol-${currentWidget.i}`) as HTMLInputElement;
                            if (input && input.value.trim()) {
                              const symbols = currentWidget.data.marketWatchConfig?.symbols || [];
                              const sym = input.value.trim().toUpperCase();
                              if (!symbols.includes(sym)) {
                                updateWidgetData(selectedWidget!, { marketWatchConfig: { ...currentWidget.data.marketWatchConfig, symbols: [...symbols, sym] } });
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
                      {(currentWidget.data.marketWatchConfig?.symbols || []).map((sym: string) => (
                        <span key={sym} className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-white font-mono font-bold">
                          {sym}
                          <button
                            onClick={() => {
                              const symbols = currentWidget.data.marketWatchConfig.symbols.filter((s: string) => s !== sym);
                              updateWidgetData(selectedWidget!, { marketWatchConfig: { ...currentWidget.data.marketWatchConfig, symbols } });
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
                {currentWidget.type === WidgetType.BROWSER_SNAPSHOT && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">URL do Site</label>
                      <input
                        type="text"
                        value={currentWidget.data.browserSnapshotConfig?.url || ''}
                        onChange={e => updateWidgetData(selectedWidget!, { browserSnapshotConfig: { ...currentWidget.data.browserSnapshotConfig, url: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                        placeholder="Ex: https://g1.globo.com"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Intervalo de Atualização (minutos)</label>
                      <input
                        type="number"
                        value={currentWidget.data.browserSnapshotConfig?.updateIntervalMinutes || 10}
                        onChange={e => updateWidgetData(selectedWidget!, { browserSnapshotConfig: { ...currentWidget.data.browserSnapshotConfig, updateIntervalMinutes: parseInt(e.target.value) || 10 } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                )}
                {currentWidget.type === WidgetType.GOOGLE_DOCS && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Tipo de Documento</label>
                      <select
                        value={currentWidget.data.googleDocsConfig?.docType || 'document'}
                        onChange={e => updateWidgetData(selectedWidget!, { googleDocsConfig: { ...currentWidget.data.googleDocsConfig, docType: e.target.value as any } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer"
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
                        value={currentWidget.data.googleDocsConfig?.url || ''}
                        onChange={e => updateWidgetData(selectedWidget!, { googleDocsConfig: { ...currentWidget.data.googleDocsConfig, url: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                        placeholder="Cole o link completo do Google Docs..."
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 leading-normal italic">
                      Certifique-se de que o documento esteja visível para "Qualquer pessoa com o link" para que seja exibido sem login.
                    </p>
                  </div>
                )}
                {currentWidget.type === WidgetType.OFFICE_DOCS && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Tipo do Arquivo</label>
                      <select
                        value={currentWidget.data.officeDocsConfig?.docType || 'word'}
                        onChange={e => updateWidgetData(selectedWidget!, { officeDocsConfig: { ...currentWidget.data.officeDocsConfig, docType: e.target.value as any } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer"
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
                        value={currentWidget.data.officeDocsConfig?.url || ''}
                        onChange={e => updateWidgetData(selectedWidget!, { officeDocsConfig: { ...currentWidget.data.officeDocsConfig, url: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                        placeholder="Cole o link gerado pelo OneDrive embed..."
                      />
                    </div>
                  </div>
                )}
                {currentWidget.type === WidgetType.POWER_BI && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">URL de Incorporação (Embed URL)</label>
                      <input
                        type="text"
                        value={currentWidget.data.powerBiConfig?.embedUrl || ''}
                        onChange={e => updateWidgetData(selectedWidget!, { powerBiConfig: { ...currentWidget.data.powerBiConfig, embedUrl: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                        placeholder="Cole o link https://app.powerbi.com/reportEmbed..."
                      />
                    </div>
                  </div>
                )}
                {currentWidget.type === WidgetType.EMBED_HTML && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Código HTML / Widget Customizado</label>
                      <textarea
                        value={currentWidget.data.embedHtmlConfig?.html || ''}
                        onChange={e => updateWidgetData(selectedWidget!, { embedHtmlConfig: { html: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white font-mono outline-none focus:border-cyan-500 h-44"
                        placeholder="<!-- Insira seu HTML, CSS ou Script aqui -->"
                      />
                    </div>
                  </div>
                )}
                {currentWidget.type === WidgetType.AIRTABLE && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">URL de Compartilhamento do Airtable</label>
                      <input
                        type="text"
                        value={currentWidget.data.airtableConfig?.shareUrl || ''}
                        onChange={e => updateWidgetData(selectedWidget!, { airtableConfig: { shareUrl: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                        placeholder="https://airtable.com/embed/shr..."
                      />
                    </div>
                  </div>
                )}
                {currentWidget.type === WidgetType.PDF_DOCUMENT && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">URL do Arquivo PDF</label>
                      <input
                        type="text"
                        value={currentWidget.data.pdfDocumentConfig?.pdfUrl || ''}
                        onChange={e => updateWidgetData(selectedWidget!, { pdfDocumentConfig: { pdfUrl: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                        placeholder="https://exemplo.com/documento.pdf"
                      />
                    </div>
                  </div>
                )}
                
                {/* Ajustes de Layout */}
                <div className="pt-4 mt-4 border-t border-slate-800 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Layout size={12} className="text-cyan-400" /> Ajustes de Layout</h4>
                  
                  {/* Grid de Switches */}
                  <div className="grid grid-cols-1 gap-2">
                    <label className={`flex items-center gap-3 text-[11px] text-slate-300 cursor-pointer p-2.5 rounded-lg border transition-all w-full select-none ${currentWidget.data.fillContainer ? 'bg-cyan-950/40 border-cyan-500/50 ring-1 ring-cyan-500/20' : 'bg-slate-950/60 border-slate-800/80 hover:border-cyan-500/30 hover:bg-slate-950'}`}>
                      <input 
                        type="checkbox" 
                        checked={currentWidget.data.fillContainer || false} 
                        onChange={(e) => {
                          const checked = e.target.checked;
                          updateWidgetData(selectedWidget!, { 
                            fillContainer: checked,
                            fullScreenMode: checked,
                            contentAlignment: checked ? 'stretch' : 'center',
                            fitContainerMode: checked ? 'stretch' : '',
                            padding: checked ? '0px' : currentWidget.data.padding,
                            margin: checked ? '0px' : currentWidget.data.margin,
                          });
                          if (checked) {
                            setFullScreen();
                          }
                        }}
                        className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200">Preencher Container</span>
                        <span className="text-[9px] text-slate-500 leading-tight">Widget de complemento em tela cheia — ocupa 100% da tela, de canto a canto</span>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 text-[11px] text-slate-300 cursor-pointer p-2.5 rounded-lg border transition-all w-full select-none ${currentWidget.data.fullScreenMode ? 'bg-indigo-950/40 border-indigo-500/50 ring-1 ring-indigo-500/20' : 'bg-slate-950/60 border-slate-800/80 hover:border-cyan-500/30 hover:bg-slate-950'}`}>
                      <input 
                        type="checkbox" 
                        checked={currentWidget.data.fullScreenMode || false} 
                        onChange={(e) => {
                          const checked = e.target.checked;
                          updateWidgetData(selectedWidget!, { 
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
                            setFullScreen();
                          }
                        }}
                        className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200">Tela Cheia (100% da TV)</span>
                        <span className="text-[9px] text-slate-500 leading-tight">Força o widget a preencher toda a tela da TV</span>
                      </div>
                    </label>
                  </div>

                  {/* Painel de Tela Cheia — aparece quando fillContainer está ativo */}
                  {currentWidget.data.fillContainer && (
                    <div className="bg-gradient-to-b from-cyan-950/30 to-slate-950/80 p-3 rounded-xl border border-cyan-500/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2 mb-1">
                        <Maximize2 size={12} className="text-cyan-400" />
                        <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider">Modo Tela Cheia Ativo</span>
                      </div>
                      
                      {/* Imagem de Fundo do Widget */}
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Imagem de Fundo (Opcional)</label>
                        <input
                          type="text"
                          value={currentWidget.data.backgroundImage || ''}
                          onChange={e => updateWidgetData(selectedWidget!, { backgroundImage: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                          placeholder="URL da imagem de fundo..."
                        />
                        <button
                          onClick={() => {
                            setMediaLibraryConfig({
                              isOpen: true,
                              allowedTypes: 'image' as const,
                              onSelect: (url: string) => {
                                updateWidgetData(selectedWidget!, { backgroundImage: url });
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
                          setFullScreen();
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

                  {/* Fit Container Mode */}
                  {!currentWidget.data.fillContainer && (
                    <div className="animate-in fade-in duration-200">
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Ajuste de Preenchimento (Fit)</label>
                      <select 
                        value={currentWidget.data.fitContainerMode || ""}
                        onChange={(e) => updateWidgetData(selectedWidget!, { fitContainerMode: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer hover:border-slate-700 transition-colors"
                      >
                        <option value="">Padrão (Preenchimento inteligente)</option>
                        <option value="cover">Cortar e Preencher (Cover)</option>
                        <option value="contain">Conter Inteiro (Contain)</option>
                        <option value="stretch">Esticar Tudo (Stretch)</option>
                        <option value="none">Tamanho Real (None)</option>
                      </select>
                    </div>
                  )}

                  {/* Alinhamento Interno */}
                  {!currentWidget.data.fillContainer && (
                    <div className="animate-in fade-in duration-200">
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-1.5">Alinhamento Interno do Conteúdo</label>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { val: "start", label: "Esquerda" },
                          { val: "center", label: "Centro" },
                          { val: "end", label: "Direita" },
                          { val: "stretch", label: "Esticar" },
                        ].map((align) => (
                          <button
                            key={align.val}
                            type="button"
                            onClick={() => updateWidgetData(selectedWidget!, { contentAlignment: align.val as any })}
                            className={`py-1 rounded text-[9px] font-bold uppercase transition-all border ${
                              (currentWidget.data.contentAlignment === align.val || (!currentWidget.data.contentAlignment && align.val === "center"))
                                ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" 
                                : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                            }`}
                          >
                            {align.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Padding e Margin */}
                  <div className="grid grid-cols-2 gap-3">
                    <SizeInput 
                      label="Padding Interno"
                      value={currentWidget.data.padding}
                      onChange={(val) => updateWidgetData(selectedWidget!, { padding: val })}
                      placeholder="0px"
                    />
                    <SizeInput 
                      label="Margem Externa"
                      value={currentWidget.data.margin}
                      onChange={(val) => updateWidgetData(selectedWidget!, { margin: val })}
                      placeholder="0px"
                    />
                  </div>
                </div>
                
                <div className="pt-6 border-t border-slate-800 mt-auto">
                  <h4 className="text-[9px] font-black text-slate-600 uppercase mb-3">Geometria</h4>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                    <div className="bg-slate-950 p-2 rounded border border-slate-800 flex justify-between"><span>W:</span> <span className="text-cyan-500">{currentWidget.w}</span></div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800 flex justify-between"><span>H:</span> <span className="text-cyan-500">{currentWidget.h}</span></div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800 flex justify-between"><span>X:</span> <span className="text-cyan-500">{currentWidget.x}</span></div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800 flex justify-between"><span>Y:</span> <span className="text-cyan-500">{currentWidget.y}</span></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-700 py-10 opacity-50">
              <Move size={48} className="mb-4 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Selecione um elemento<br/>para editar</p>
            </div>
          )}
        </aside>
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

const WidgetTool = ({ icon, label, onClick }: any) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-[#7C3AED] hover:shadow-[0_0_15px_rgba(124,58,237,0.15)] transition-all group">
    <div className="text-slate-500 group-hover:text-[#7C3AED] mb-2 transition-colors">{icon}</div>
    <span className="text-[9px] font-bold text-slate-500 group-hover:text-slate-200 uppercase tracking-wider transition-colors">{label}</span>
  </button>
);

export default Editor;
