
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Calendar as CalendarIcon, Clock, Monitor, Trash2, Edit3, Check, X, 
  ChevronLeft, Loader2, Save, Zap, AlertCircle, Layout as LayoutIcon,
  CalendarDays, Filter, Search, MoreVertical, Play, Pause, Settings,
  Image as ImageIcon, Type, CloudSun, Film, Rss, Globe, Gift, Layers, Maximize2,
  Tv, Megaphone, Smartphone, GripVertical, StickyNote, ListTodo, Timer,
  ClipboardList, Utensils, TrendingUp, Camera, FileText, BookOpen, Code2,
  Database, Upload, Info, CheckCircle2, MonitorPlay, Move
} from 'lucide-react';
import { getBroadcasts, saveBroadcast, deleteBroadcast, getDisplays, getCurrentUser, saveDisplay, getDevices } from '../services/storage';
import { Broadcast, Display, Page, User, WidgetType, LayoutItem, Device } from '../types';
import SceneEditor from './SceneEditor';
import { MediaLibrary } from './MediaLibrary';

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
  iframe.contentWindow?.postMessage(JSON.stringify({
    event: 'command',
    func: 'setPlaybackQuality',
    args: [quality]
  }), '*');
  
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

const Scheduler: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [displays, setDisplays] = useState<Display[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBroadcast, setCurrentBroadcast] = useState<Partial<Broadcast> | null>(null);
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showOrientationModal, setShowOrientationModal] = useState(false);
  const [pendingAllScreens, setPendingAllScreens] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [showLayersModal, setShowLayersModal] = useState(false);
  const [showAllScreensModal, setShowAllScreensModal] = useState(false);
  const [hoveredDescription, setHoveredDescription] = useState('');
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [showBgAnimModal, setShowBgAnimModal] = useState(false);
  const [mediaLibraryConfig, setMediaLibraryConfig] = useState<{ isOpen: boolean, onSelect: (url: string) => void, allowedTypes: 'image' | 'video' | 'all' } | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isClearingScene, setIsClearingScene] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [broadcastsData, displaysData, user, devicesData] = await Promise.all([
          getBroadcasts(),
          getDisplays(),
          getCurrentUser(),
          getDevices()
        ]);
        setBroadcasts(broadcastsData);
        setDisplays(displaysData);
        setCurrentUser(user);
        setDevices(devicesData);
      } catch (error) {
        console.error("Erro ao carregar dados do agendador:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCreateNew = () => {
    setPendingAllScreens(false);
    setShowOrientationModal(true);
  };

  const handleCreateAllScreens = () => {
    setPendingAllScreens(true);
    setShowOrientationModal(true);
  };

  const confirmOrientation = (orientation: 'horizontal' | 'vertical') => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
    
    const newBroadcast: Partial<Broadcast> = {
      id: crypto.randomUUID(),
      name: pendingAllScreens ? '' : '',
      active: true,
      display_ids: pendingAllScreens ? displays.map(d => d.id) : [],
      start_time: localISOTime,
      end_time: new Date(Date.now() + 3600000 * 24 - offset).toISOString().slice(0, 16),
      is_permanent: false,
      orientation,
      page: {
        id: 'p' + Date.now(),
        order: 1,
        duration: 15,
        layout: []
      },
      created_at: Date.now(),
      created_by: currentUser?.id
    };
    setCurrentBroadcast(newBroadcast);
    setShowOrientationModal(false);
    setPendingAllScreens(false);
    setIsEditing(true);
  };

  const handleEdit = (broadcast: Broadcast) => {
    setCurrentBroadcast({ ...broadcast });
    setIsEditing(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [broadcastToDelete, setBroadcastToDelete] = useState<string | null>(null);

  const confirmDelete = (id: string) => {
    setBroadcastToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!broadcastToDelete) return;
    setLoading(true);
    try {
      // 1. Remove from all displays
      for (const display of displays) {
        if (display.pages.some(p => p.broadcast_id === broadcastToDelete)) {
          const updatedPages = display.pages.filter(p => p.broadcast_id !== broadcastToDelete);
          await saveDisplay({ ...display, pages: updatedPages });
        }
      }
      
      // 2. Delete broadcast
      await deleteBroadcast(broadcastToDelete);
      
      setBroadcasts(prev => prev.filter(b => b.id !== broadcastToDelete));
      
      // Update local displays state
      const updatedDisplays = await getDisplays();
      setDisplays(updatedDisplays);
      
      setShowDeleteModal(false);
      setBroadcastToDelete(null);
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir programação.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentBroadcast?.name || !currentBroadcast?.start_time) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (!currentBroadcast.is_permanent && !currentBroadcast.end_time) {
      alert('Por favor, defina um horário de término ou marque como permanente.');
      return;
    }

    if (currentBroadcast.display_ids?.length === 0) {
      alert('Selecione pelo menos uma tela para exibição.');
      return;
    }

    setLoading(true);
    try {
      const broadcastToSave = currentBroadcast as Broadcast;
      
      // 1. Save the broadcast record
      await saveBroadcast(broadcastToSave);
      
      // 2. Inject/Update the page in selected displays, remove from unselected
      for (const display of displays) {
        const isSelected = broadcastToSave.display_ids.includes(display.id) && broadcastToSave.active;
        const hasPage = display.pages.some(p => p.broadcast_id === broadcastToSave.id);
        
        let shouldSaveDisplay = false;
        let newPages = [...display.pages];
        
        if (isSelected) {
          const pageToInject: Page = {
            ...broadcastToSave.page,
            broadcast_id: broadcastToSave.id,
            start_time: broadcastToSave.start_time,
            end_time: broadcastToSave.end_time,
            is_permanent: broadcastToSave.is_permanent
          };
          
          if (hasPage) {
            // Update existing injected page
            newPages = newPages.map(p => p.broadcast_id === broadcastToSave.id ? pageToInject : p);
            shouldSaveDisplay = true;
          } else {
            // Inject new page
            newPages.push(pageToInject);
            shouldSaveDisplay = true;
          }
        } else if (hasPage) {
          // Remove page from unselected display
          newPages = newPages.filter(p => p.broadcast_id !== broadcastToSave.id);
          shouldSaveDisplay = true;
        }
        
        if (shouldSaveDisplay) {
          await saveDisplay({ ...display, pages: newPages });
        }
      }

      const updated = await getBroadcasts();
      setBroadcasts(updated);
      
      // Update local displays state
      const updatedDisplays = await getDisplays();
      setDisplays(updatedDisplays);
      
      setIsEditing(false);
      setCurrentBroadcast(null);
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar programação.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDisplaySelection = (displayId: string) => {
    if (!currentBroadcast) return;
    const currentIds = currentBroadcast.display_ids || [];
    if (currentIds.includes(displayId)) {
      setCurrentBroadcast({
        ...currentBroadcast,
        display_ids: currentIds.filter(id => id !== displayId)
      });
    } else {
      setCurrentBroadcast({
        ...currentBroadcast,
        display_ids: [...currentIds, displayId]
      });
    }
  };

  const selectAllDisplays = () => {
    if (!currentBroadcast) return;
    setCurrentBroadcast({
      ...currentBroadcast,
      display_ids: displays.map(d => d.id)
    });
  };

  const clearDisplaySelection = () => {
    if (!currentBroadcast) return;
    setCurrentBroadcast({
      ...currentBroadcast,
      display_ids: []
    });
  };

  const clearAllWidgets = () => {
    if (!currentBroadcast?.page) return;
    setCurrentBroadcast({
      ...currentBroadcast,
      page: {
        ...currentBroadcast.page,
        layout: []
      }
    });
    setSelectedWidget(null);
    setIsClearingScene(false);
  };

  const removeWidget = (wId: string) => {
    if (!currentBroadcast?.page) return;
    const page = currentBroadcast.page;
    const updatedPage = {
      ...page,
      layout: page.layout.filter(w => w.i !== wId)
    };
    setCurrentBroadcast({ ...currentBroadcast, page: updatedPage });
    if (selectedWidget === wId) {
      setSelectedWidget(null);
    }
  };

  const updateActivePage = (updates: Partial<Page>) => {
    if (!currentBroadcast?.page) return;
    setCurrentBroadcast({
      ...currentBroadcast,
      page: {
        ...currentBroadcast.page,
        ...updates
      }
    });
  };

  const addWidget = (type: WidgetType) => {
    if (!currentBroadcast?.page) return;
    const page = currentBroadcast.page;

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

    const updatedLayout = [...page.layout, newWidget];
    setCurrentBroadcast({ ...currentBroadcast, page: { ...page, layout: updatedLayout } });
    setSelectedWidget(newWidget.i);
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
    
    if (!draggedLayerId || draggedLayerId === targetId || !currentBroadcast?.page) return;

    const page = currentBroadcast.page;
    const layout = [...page.layout];
    
    const sortedLayout = [...layout].sort((a, b) => (b.data.zIndex ?? 10) - (a.data.zIndex ?? 10));
    
    const draggedIdx = sortedLayout.findIndex(w => w.i === draggedLayerId);
    const targetIdx = sortedLayout.findIndex(w => w.i === targetId);
    
    if (draggedIdx === -1 || targetIdx === -1) return;
    
    const [draggedItem] = sortedLayout.splice(draggedIdx, 1);
    sortedLayout.splice(targetIdx, 0, draggedItem);
    
    const newBaseZIndex = 10;
    sortedLayout.forEach((item, index) => {
      const layoutItem = layout.find(w => w.i === item.i);
      if (layoutItem) {
        layoutItem.data.zIndex = newBaseZIndex + (sortedLayout.length - 1 - index);
      }
    });

    const updatedPage = { ...page, layout };
    setCurrentBroadcast({ ...currentBroadcast, page: updatedPage });
    setDraggedLayerId(null);
  };

  const handleLayerDragEnd = () => {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  if (loading && broadcasts.length === 0 && !isEditing) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-[#0ea5e9]" size={32} />
        <p className="text-xs uppercase tracking-widest font-bold text-slate-500">Carregando Central...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-4 md:gap-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => isEditing ? setIsEditing(false) : navigate('/')}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2 md:gap-3">
                <CalendarIcon className="text-indigo-500 shrink-0 w-6 h-6 md:w-8 md:h-8" />
                <span>Central de <span className="text-[#0ea5e9]">Programação</span></span>
              </h1>
              <p className="text-slate-500 text-xs md:text-sm font-medium">Agendamento mestre e distribuição de conteúdo</p>
            </div>
          </div>
          
          {!isEditing && (
            <div className="flex gap-3 w-full md:w-auto">
              <button 
                onClick={handleCreateAllScreens}
                className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] border border-white/10"
                title="Exibir em todas as telas conectadas (avisos urgentes)"
              >
                <Megaphone size={18} strokeWidth={2.5} /> <span className="hidden sm:inline">Todas as Telas</span>
              </button>
              <button 
                onClick={handleCreateNew}
                className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-[#0ea5e9] hover:from-indigo-500 hover:to-[#0284c7] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)]"
              >
                <Plus size={20} strokeWidth={3} /> Nova Programação
              </button>
            </div>
          )}
        </header>

        {isEditing ? (
          <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in fade-in duration-300">
            {/* HEADER BAR */}
            <header className="h-auto md:h-16 bg-[#1f2937] border-b border-[#9CA3AF]/10 px-4 md:px-6 py-3 md:py-0 flex flex-col md:flex-row items-center justify-between z-30 shadow-md gap-3 md:gap-0">
              <div className="flex items-center gap-4 w-full md:w-auto justify-start">
                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-[#0ea5e9] transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <div className="w-px h-6 bg-slate-800"></div>
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
                  <h1 className="font-bold text-slate-100 tracking-tight uppercase text-sm">
                    Tela<span className="text-[#0ea5e9]">Hub</span> <span className="text-slate-600 mx-2">/</span> 
                    <span className="text-purple-400">Programação</span>
                    <span className="text-slate-600 mx-2">/</span> 
                    <span className="text-slate-300 normal-case font-medium">{currentBroadcast?.name || 'Nova Programação'}</span>
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                <span className="text-[10px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded-full uppercase tracking-wider hidden sm:inline-flex items-center gap-1.5">
                  <CalendarDays size={12} /> Modo Agendamento
                </span>

                <div className="flex items-center gap-2">
                  {/* Layers Modal Toggle Button */}
                  <button 
                    onClick={() => setShowLayersModal(true)}
                    className="bg-[#1f2937] hover:bg-[#111827] text-slate-300 hover:text-white border border-[#9CA3AF]/20 hover:border-sky-500/50 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-md"
                    title="Visualizar Camadas"
                  >
                    <Layers size={16} className="text-sky-400" />
                    <span>Camadas ({currentBroadcast?.page?.layout?.length || 0})</span>
                  </button>

                  {/* All Screens Modal Toggle Button */}
                  <button 
                    onClick={() => setShowAllScreensModal(true)}
                    className="bg-[#1f2937] hover:bg-[#111827] text-slate-300 hover:text-white border border-[#9CA3AF]/20 hover:border-sky-500/50 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-md"
                    title="Visualizar Todas as Telas"
                  >
                    <Monitor size={16} className="text-sky-400" />
                    <span>Todas as Telas</span>
                  </button>

                  {/* Mobile Sidebar Toggle Button */}
                  <button 
                    onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                    className="md:hidden px-3 py-2 rounded-lg transition-all border bg-slate-900 border-slate-800 text-slate-500 hover:text-[#0ea5e9]"
                    title="Configurações e Widgets"
                  >
                    <Settings size={16} />
                  </button>

                  <button 
                    onClick={() => setIsEditing(false)}
                    className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)] border border-white/10 active:scale-95 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {loading ? 'SALVANDO...' : 'SALVAR'}
                  </button>
                </div>
              </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
              {/* Backdrop overlay for mobile sidebar */}
              {showLeftSidebar && (
                <div 
                  className="fixed inset-0 bg-black/60 z-50 md:hidden animate-in fade-in duration-200" 
                  onClick={() => setShowLeftSidebar(false)}
                />
              )}

              {/* LEFT SIDEBAR: Widgets + Scheduling Config */}
              <aside className={`absolute md:relative left-0 top-0 h-full w-64 bg-[#1f2937] border-r border-slate-800 overflow-y-auto z-[60] shadow-xl transition-transform duration-300 ease-in-out ${showLeftSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                
                {/* Section 1: Biblioteca de Widgets */}
                <div className="p-3.5 border-b border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[10px] font-black text-[#0ea5e9] uppercase tracking-widest flex items-center gap-1.5">
                      <Layers size={11} /> Biblioteca de Widgets
                    </h3>
                    <button onClick={() => setShowLeftSidebar(false)} className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                  
                  {/* Básicos */}
                  <div className="mb-2.5">
                    <h4 className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-emerald-400 inline-block"></span>Básicos</h4>
                    <div className="grid grid-cols-3 gap-1.5">
                      <WidgetTool icon="/icons3d/image.png" label="Imagem" description="Exibe imagens de alta qualidade (PNG, JPG, SVG) com ajuste automático ao contêiner." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.IMAGE)} />
                      <WidgetTool icon="/icons3d/video.png" label="Vídeo" description="Reproduz vídeos locais em looping ou links diretos do YouTube." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.VIDEO)} />
                      <WidgetTool icon="/icons3d/text.png" label="Texto" description="Adiciona caixas de texto com fontes, cores e tamanhos personalizáveis." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.TEXT)} />
                      <WidgetTool icon="/icons3d/gif.png" label="GIF" description="Exibe animações divertidas em formato GIF para atrair a atenção do público." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.GIF)} />
                      <WidgetTool icon="/icons3d/web.png" label="Web" description="Incorpora qualquer site ou página web externa de forma interativa." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.IFRAME)} />
                    </div>
                  </div>

                  {/* Utilitários */}
                  <div className="mb-2.5">
                    <h4 className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-cyan-400 inline-block"></span>Utilitários</h4>
                    <div className="grid grid-cols-3 gap-1.5">
                      <WidgetTool icon="/icons3d/clock.png" label="Relógio" description="Mostra um relógio digital sincronizado em tempo real com a cidade escolhida." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.CLOCK)} />
                      <WidgetTool icon="/icons3d/weather.png" label="Clima" description="Exibe a previsão do tempo e temperatura em tempo real para qualquer cidade." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.WEATHER)} />
                      <WidgetTool icon="/icons3d/full-info.png" label="Completo" description="Painel integrado de relógio, clima e fundos de alta definição." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.FULL_INFO)} />
                      <WidgetTool icon="/icons3d/rss.png" label="RSS" description="Exibe feeds de notícias em tempo real de portais de notícias como G1 e CNN." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.RSS)} />
                      <WidgetTool icon="/icons3d/calendar.png" label="Agenda" description="Integração direta com Google Agenda para exibir eventos e programações." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.CALENDAR)} />
                    </div>
                  </div>

                  {/* Interativos */}
                  <div className="mb-2.5">
                    <h4 className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-amber-400 inline-block"></span>Interativos</h4>
                    <div className="grid grid-cols-3 gap-1.5">
                      <WidgetTool icon="/icons3d/notes.png" label="Notas" description="Mural de notas adesivas com temas neon, glassmorphism e cores vibrantes." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.NOTES)} />
                      <WidgetTool icon="/icons3d/todo.png" label="Tarefas" description="Lista de tarefas interativa com checkboxes e progresso de conclusão." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.TODO)} />
                      <WidgetTool icon="/icons3d/countdown.png" label="Contador" description="Cronômetro regressivo para grandes eventos, metas ou datas especiais." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.COUNTDOWN)} />
                      <WidgetTool icon="/icons3d/chores.png" label="Deveres" description="Quadro semanal de deveres domésticos ou corporativos com responsáveis." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.CHORES)} />
                      <WidgetTool icon="/icons3d/meal-plan.png" label="Meal Plan" description="Planejador ou cardápio de refeições semanais com slide para os dias." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.MEAL_PLAN)} />
                    </div>
                  </div>

                  {/* Integrações */}
                  <div className="mb-2.5">
                    <h4 className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-rose-400 inline-block"></span>Integrações</h4>
                    <div className="grid grid-cols-3 gap-1.5">
                      <WidgetTool icon="/icons3d/market.png" label="Bolsa" description="Painel de cotações financeiras de ações e criptomoedas em tempo real." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.MARKET_WATCH)} />
                      <WidgetTool icon="/icons3d/snapshot.png" label="Snapshot" description="Renderiza capturas estáticas e periódicas de páginas de forma segura." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.BROWSER_SNAPSHOT)} />
                      <WidgetTool icon="/icons3d/google-docs.png" label="G Docs" description="Incorpora documentos, planilhas ou slides do Google Workspace." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.GOOGLE_DOCS)} />
                      <WidgetTool icon="/icons3d/office-docs.png" label="Office Docs" description="Exibe planilhas Excel, documentos Word ou slides PowerPoint do Office 365." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.OFFICE_DOCS)} />
                      <WidgetTool icon="/icons3d/power-bi.png" label="Power BI" description="Exibe painéis interativos e relatórios dinâmicos do Microsoft Power BI." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.POWER_BI)} />
                      <WidgetTool icon="/icons3d/airtable.png" label="Airtable" description="Exibe visualizações, tabelas ou bases de dados completas do Airtable." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.AIRTABLE)} />
                      <WidgetTool icon="/icons3d/pdf.png" label="PDF" description="Exibe documentos PDFs e apostilas corporativas página a página." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.PDF_DOCUMENT)} />
                      <WidgetTool icon="/icons3d/html.png" label="HTML" description="Insira código HTML, CSS ou JS personalizado livremente." onHover={setHoveredDescription} onClick={() => addWidget(WidgetType.EMBED_HTML)} />
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <button 
                      onClick={() => setIsClearingScene(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg text-[9px] font-bold transition-colors border border-rose-500/20 uppercase tracking-wider"
                    >
                      <Trash2 size={11} /> Limpar Todos os Widgets
                    </button>
                  </div>

                  {/* Dynamic Tooltip Explanation Box */}
                  <div className="mt-3 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 min-h-[48px] flex items-center gap-2">
                    <Info size={12} className="text-[#0ea5e9] shrink-0" />
                    <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                      {hoveredDescription || "Passe o mouse sobre um widget para ver a descrição detalhada."}
                    </p>
                  </div>
                </div>

                {/* Section 2: Fundo da Cena */}
                <div className="p-3.5 border-b border-slate-800">
                  <div className="flex items-center gap-2 mb-4">
                    <Tv size={12} className="text-indigo-500" />
                    <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                      Fundo da Cena
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="group">
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Vídeo de Fundo (YouTube ou MP4)</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="https://youtube.com... ou https://.../video.mp4"
                          value={currentBroadcast?.page?.backgroundVideoUrl || ''}
                          onChange={(e) => {
                            updateActivePage({
                              backgroundVideoUrl: e.target.value,
                              backgroundImage: ''
                            });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 pl-7 text-[10px] text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                        />
                        <Film size={11} className="absolute left-2.5 top-2.5 text-slate-600" />
                      </div>
                      
                      <div className="relative mt-2.5 mb-2.5">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-800"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-[#1f2937] px-2 text-slate-500 font-bold uppercase text-[8px]">ou</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          setMediaLibraryConfig({
                            isOpen: true,
                            allowedTypes: 'video',
                            onSelect: (url) => {
                              updateActivePage({
                                backgroundVideoUrl: url,
                                backgroundImage: ''
                              });
                            }
                          });
                        }}
                        className="flex items-center justify-center gap-1.5 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-all border border-slate-700 hover:border-slate-500 shadow-md"
                      >
                        <Upload size={12} />
                        Selecionar Vídeo
                      </button>
                      
                      {currentBroadcast?.page?.backgroundVideoUrl && (
                        <div className="flex flex-col gap-1.5 mt-2 ml-1">
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="checkbox" 
                              id="bg-video-mute"
                              checked={currentBroadcast?.page?.backgroundVideoMuted !== false}
                              onChange={(e) => {
                                updateActivePage({
                                  backgroundVideoMuted: e.target.checked
                                });
                              }}
                              className="w-3 h-3 rounded border-slate-700 bg-slate-900 text-[#0ea5e9] focus:ring-offset-0 focus:ring-1 focus:ring-[#0ea5e9] cursor-pointer"
                            />
                            <label htmlFor="bg-video-mute" className="text-[9px] font-bold text-slate-400 uppercase cursor-pointer select-none hover:text-[#0ea5e9] transition-colors">
                              Vídeo Mudo (Sem Áudio)
                            </label>
                          </div>
                          
                          {isYouTubeUrl(currentBroadcast?.page?.backgroundVideoUrl) && (
                            <div className="flex items-center justify-between bg-slate-950/50 p-1.5 rounded-lg border border-slate-800/50 mt-0.5">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Qualidade YouTube</label>
                              <select 
                                value={currentBroadcast?.page?.backgroundVideoQuality || 'highres'}
                                onChange={(e) => {
                                  updateActivePage({
                                    backgroundVideoQuality: e.target.value
                                  });
                                }}
                                className="bg-slate-900 border border-slate-700 text-slate-300 text-[9px] rounded px-1.5 py-0.5 outline-none focus:border-[#0ea5e9] cursor-pointer"
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
                        <span className="bg-[#1f2937] px-2 text-[8px] text-slate-600 font-bold">OU</span>
                      </div>
                      <div className="border-t border-slate-800 w-full"></div>
                    </div>

                    <div className="group">
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Imagem de Fundo</label>
                      <div className="relative mb-2">
                        <input 
                          type="text" 
                          placeholder="https://exemplo.com/imagem.jpg"
                          value={currentBroadcast?.page?.backgroundImage || ''}
                          onChange={(e) => {
                            updateActivePage({
                              backgroundImage: e.target.value,
                              backgroundVideoUrl: ''
                            });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 pl-7 text-[10px] text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                        />
                        <ImageIcon size={11} className="absolute left-2.5 top-2.5 text-slate-600" />
                      </div>
                      
                      <button 
                        onClick={() => {
                          setMediaLibraryConfig({
                            isOpen: true,
                            allowedTypes: 'image',
                            onSelect: (url) => {
                              updateActivePage({
                                backgroundImage: url,
                                backgroundVideoUrl: ''
                              });
                            }
                          });
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-905 border border-slate-800 hover:bg-slate-800 rounded-lg text-[9px] font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
                      >
                        <Upload size={11} /> 
                        SELECIONAR IMAGEM
                      </button>

                      <div className="relative mt-3.5 mb-3.5">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="bg-[#1f2937] px-2 text-[8px] text-slate-600 font-bold">OU</span>
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
                          className="w-full flex items-center justify-between gap-1.5 py-2 px-2.5 bg-slate-950 border border-slate-700 hover:border-cyan-500 rounded-lg text-[10px] text-slate-300 hover:text-white transition-all cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <MonitorPlay size={13} className="text-cyan-500 shrink-0" />
                            {currentBroadcast?.page?.backgroundAnimation && currentBroadcast.page.backgroundAnimation !== 'none' ? 
                              ['Automático (Clima)', 'Fluxo Gradiente', 'Céu e Nuvens', 'Chuva Digital', 'Neve Caindo', 'Chamas', 'Grid Tech', 'Alerta Vermelho', 'Pulso Azul', 'Pulso Verde', 'Aurora Boreal']
                              [['auto-weather', 'gradient-flow', 'clouds', 'rain', 'snow', 'fire', 'tech-grid', 'pulse-red', 'pulse-blue', 'pulse-green', 'aurora'].indexOf(currentBroadcast.page.backgroundAnimation)]
                              : 'Escolher Animação'}
                          </span>
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentBroadcast?.page?.backgroundAnimation && currentBroadcast.page.backgroundAnimation !== 'none' ? 'bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.8)]' : 'bg-slate-700'}`}></div>
                        </button>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-800">
                        <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <Move size={11} /> Transições
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Tipo de Transição</label>
                            <select 
                              value={currentBroadcast?.page?.transitionType || 'none'}
                              onChange={(e) => {
                                updateActivePage({
                                  transitionType: e.target.value as any
                                });
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all cursor-pointer"
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
                            <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Duração (ms)</label>
                            <input 
                              type="number"
                              value={currentBroadcast?.page?.transitionDuration || 500}
                              onChange={(e) => {
                                updateActivePage({
                                  transitionDuration: parseInt(e.target.value) || 500
                                });
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Ajuste da Imagem</label>
                        <select 
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
                          value={currentBroadcast?.page?.backgroundFit || 'cover'}
                          onChange={(e) => {
                            updateActivePage({
                              backgroundFit: e.target.value as any
                            });
                          }}
                        >
                          <option value="cover">Preencher (Corta)</option>
                          <option value="fill">Esticar</option>
                          <option value="contain">Ajustar (Bordas)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Configurações de Agendamento */}
                <div className="p-3.5 border-b border-slate-800">
                  <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <CalendarDays size={12} /> Configurações de Agendamento
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Nome da Programação</label>
                      <input 
                        type="text" 
                        value={currentBroadcast?.name || ''}
                        onChange={e => setCurrentBroadcast({...currentBroadcast!, name: e.target.value})}
                        placeholder="Ex: Avisos Importantes..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder:text-slate-700 focus:border-[#0ea5e9] outline-none transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Início da Exibição</label>
                      <div className="relative">
                        <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                        <input 
                          type="datetime-local" 
                          value={currentBroadcast?.start_time || ''}
                          onChange={e => setCurrentBroadcast({...currentBroadcast!, start_time: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pl-9 text-xs text-slate-100 focus:border-[#0ea5e9] outline-none transition-all cursor-pointer"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Fim da Exibição</label>
                      <div className="relative">
                        <CalendarDays className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${currentBroadcast?.is_permanent ? 'text-slate-800' : 'text-slate-600'}`} size={14} />
                        <input 
                          type="datetime-local" 
                          disabled={currentBroadcast?.is_permanent}
                          value={currentBroadcast?.is_permanent ? '' : (currentBroadcast?.end_time || '')}
                          onChange={e => setCurrentBroadcast({...currentBroadcast!, end_time: e.target.value})}
                          className={`w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pl-9 text-xs text-slate-100 focus:border-[#0ea5e9] outline-none transition-all ${currentBroadcast?.is_permanent ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Duração da Exibição (Segundos)</label>
                      <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg p-1">
                        <Clock size={14} className="ml-2 text-slate-600" />
                        <input 
                          type="number"
                          min={5}
                          value={currentBroadcast?.page?.duration || 15}
                          onChange={e => {
                            updateActivePage({
                              duration: parseInt(e.target.value) || 5
                            });
                          }}
                          className="w-full bg-transparent border-none p-1.5 text-sm font-bold text-slate-200 focus:ring-0 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Posição na Sequência</label>
                      <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg p-1">
                        <Layers size={14} className="ml-2 text-slate-600" />
                        <input 
                          type="number"
                          min={1}
                          value={currentBroadcast?.page?.order || 1}
                          onChange={e => {
                            updateActivePage({
                              order: parseInt(e.target.value) || 1
                            });
                          }}
                          className="w-full bg-transparent border-none p-1.5 text-sm font-bold text-slate-200 focus:ring-0 outline-none"
                        />
                      </div>
                      <p className="text-[8px] text-slate-500 mt-1.5">Define em qual posição a cena aparecerá na rotação das telas</p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group pt-2 select-none">
                      <div className={`w-9 h-5 rounded-full relative transition-all ${currentBroadcast?.is_permanent ? 'bg-[#0ea5e9]' : 'bg-slate-700'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${currentBroadcast?.is_permanent ? 'left-[18px]' : 'left-0.5'}`}></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors uppercase">Permanente</span>
                      <input type="checkbox" className="hidden" checked={currentBroadcast?.is_permanent || false} onChange={e => setCurrentBroadcast({...currentBroadcast!, is_permanent: e.target.checked})} />
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group select-none">
                      <div className={`w-9 h-5 rounded-full relative transition-all ${currentBroadcast?.active ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${currentBroadcast?.active ? 'left-[18px]' : 'left-0.5'}`}></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors uppercase">Ativa</span>
                      <input type="checkbox" className="hidden" checked={currentBroadcast?.active || false} onChange={e => setCurrentBroadcast({...currentBroadcast!, active: e.target.checked})} />
                    </label>
                  </div>
                </div>

                {/* Section 4: Selecionar Telas */}
                <div className="p-3.5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-black text-[#0ea5e9] uppercase tracking-widest flex items-center gap-2">
                      <Monitor size={12} /> Selecionar Telas
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={selectAllDisplays} className="text-[9px] font-black text-[#0ea5e9] hover:text-sky-300 uppercase cursor-pointer">Todas</button>
                      <button onClick={clearDisplaySelection} className="text-[9px] font-black text-rose-400 hover:text-rose-300 uppercase cursor-pointer">Limpar</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {displays.map(display => (
                      <div 
                        key={display.id}
                        onClick={() => toggleDisplaySelection(display.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                          currentBroadcast?.display_ids?.includes(display.id)
                          ? 'bg-[#0ea5e9]/10 border-[#0ea5e9]/50 text-sky-400'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Monitor size={14} className={currentBroadcast?.display_ids?.includes(display.id) ? 'text-[#0ea5e9]' : 'text-slate-600'} />
                          <span className="text-xs font-medium">{display.name}</span>
                        </div>
                        {currentBroadcast?.display_ids?.includes(display.id) && <Check size={14} className="text-[#0ea5e9]" />}
                      </div>
                    ))}
                  </div>
                </div>
              </aside>

              {/* CANVAS AREA */}
              <main className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center p-4 md:p-8">
                <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                <div className={`absolute top-4 left-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-slate-900/80 px-3 py-1.5 rounded-full border backdrop-blur-sm z-20 ${
                  currentBroadcast?.orientation === 'vertical'
                    ? 'text-purple-400 border-purple-800'
                    : 'text-slate-600 border-slate-800'
                }`}>
                  <Maximize2 size={12} className={currentBroadcast?.orientation === 'vertical' ? 'text-purple-500' : 'text-[#F97316]'} />
                  {currentBroadcast?.orientation === 'vertical' ? 'Canvas Programação 9:16 — Vertical' : 'Canvas Programação 16:9 — Horizontal'}
                </div>
                {pendingAllScreens || (currentBroadcast?.display_ids?.length === displays.length && displays.length > 0) ? (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full border border-amber-500/30 backdrop-blur-sm z-20">
                    <Megaphone size={12} /> Todas as Telas
                  </div>
                ) : null}
                
                <SceneEditor 
                  page={currentBroadcast?.page || { id: 'temp', order: 1, duration: 15, layout: [] }} 
                  onChange={(newPage) => setCurrentBroadcast({...currentBroadcast!, page: newPage})}
                  orientation={currentBroadcast?.orientation || 'horizontal'}
                  hideToolbar={true}
                  selectedWidget={selectedWidget}
                  onSelectWidget={setSelectedWidget}
                />
              </main>
            </div>
          </div>
        ) : (
          /* LISTA DE PROGRAMAÇÕES */
          <div className="space-y-6 animate-in fade-in duration-500">
            
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end mb-8">
               <div className="flex gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input type="text" placeholder="Buscar programações..." className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-indigo-500 outline-none transition-all w-64" />
                  </div>
                  <button className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2 rounded-xl text-sm font-bold hover:text-white transition-all">
                    <Filter size={16} /> Filtros
                  </button>
               </div>
               <div className="text-xs text-slate-500 font-medium">
                 Total: <span className="text-slate-300 font-bold">{broadcasts.length}</span> programações agendadas
               </div>
            </div>

            {broadcasts.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
                <CalendarDays size={64} className="mx-auto text-slate-800 mb-6" />
                <h3 className="text-xl font-bold text-slate-300 mb-2">Nenhuma programação encontrada</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">Comece criando sua primeira programação mestre para distribuir conteúdo em suas telas.</p>
                <button 
                  onClick={handleCreateNew}
                  className="px-8 py-3 bg-indigo-600 hover:bg-sky-500 text-white rounded-xl font-bold transition-all shadow-lg"
                >
                  Criar Agora
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {broadcasts.map(broadcast => {
                  const now = new Date();
                  const start = new Date(broadcast.start_time);
                  const end = new Date(broadcast.end_time);
                  const isLive = broadcast.active && now >= start && now <= end;
                  const isExpired = now > end;
                  const isScheduled = now < start;

                  return (
                    <div key={broadcast.id} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 hover:border-sky-500/50 transition-all group">
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        
                        <div className="flex gap-6 items-start">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                            isLive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 
                            isScheduled ? 'bg-sky-500/10 border-indigo-500/30 text-indigo-400' : 
                            'bg-slate-800/50 border-slate-700 text-slate-500'
                          }`}>
                            {isLive ? <Play size={28} fill="currentColor" /> : 
                             isScheduled ? <Clock size={28} /> : 
                             <Pause size={28} />}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="text-xl font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">{broadcast.name}</h3>
                              {isLive && <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">AO VIVO</span>}
                              {isScheduled && <span className="bg-sky-500/20 text-indigo-400 border border-indigo-500/30 text-[9px] font-black px-2 py-0.5 rounded-full">AGENDADO</span>}
                              {isExpired && <span className="bg-slate-800 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-full">EXPIRADO</span>}
                              {broadcast.orientation === 'vertical' ? (
                                <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Smartphone size={10} /> 9:16
                                </span>
                              ) : (
                                <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Monitor size={10} /> 16:9
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                              <div className="flex items-center gap-2">
                                <CalendarIcon size={14} className="text-slate-600" />
                                <span>{new Date(broadcast.start_time).toLocaleDateString()} - {new Date(broadcast.end_time).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-slate-600" />
                                <span>{new Date(broadcast.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} até {new Date(broadcast.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Monitor size={14} className="text-slate-600" />
                                <span>{broadcast.display_ids.length} {broadcast.display_ids.length === 1 ? 'tela' : 'telas'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end md:self-center">
                          <button 
                            onClick={() => handleEdit(broadcast)}
                            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700"
                            title="Editar"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button 
                            onClick={() => confirmDelete(broadcast.id)}
                            className="p-3 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-500 rounded-xl transition-all border border-slate-700 hover:border-rose-500/30"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ORIENTATION SELECTION MODAL */}
      {showOrientationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {pendingAllScreens ? (
                    <><Megaphone className="text-amber-400" size={20} /> Aviso em Todas as Telas</>
                  ) : (
                    <><Tv className="text-[#0ea5e9]" size={20} /> Modelo de Tela</>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {pendingAllScreens 
                    ? 'Escolha a orientação do conteúdo que será exibido em todas as telas.' 
                    : 'Escolha a orientação da tela para esta programação.'}
                </p>
              </div>
              <button 
                onClick={() => { setShowOrientationModal(false); setPendingAllScreens(false); }}
                className="text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => confirmOrientation('horizontal')}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-white/10 bg-slate-950 hover:border-[#0ea5e9] hover:bg-[#0ea5e9]/10 hover:shadow-[0_0_25px_rgba(124,58,237,0.2)] transition-all group"
                >
                  <div className="w-20 h-[45px] rounded-lg border-2 border-white/10 group-hover:border-[#0ea5e9]/60 bg-slate-800 group-hover:bg-[#0ea5e9]/10 flex items-center justify-center transition-all">
                    <Monitor size={20} className="text-slate-500 group-hover:text-[#0ea5e9] transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-300 group-hover:text-[#0ea5e9] transition-colors">Horizontal</p>
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5">16:9 — TV / Monitor</p>
                  </div>
                </button>

                <button
                  onClick={() => confirmOrientation('vertical')}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-white/10 bg-slate-950 hover:border-purple-500 hover:bg-purple-500/10 hover:shadow-[0_0_25px_rgba(168,85,247,0.2)] transition-all group"
                >
                  <div className="w-[45px] h-20 rounded-lg border-2 border-white/10 group-hover:border-purple-500/60 bg-slate-800 group-hover:bg-purple-500/10 flex items-center justify-center transition-all">
                    <Smartphone size={20} className="text-slate-500 group-hover:text-purple-400 transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-300 group-hover:text-purple-400 transition-colors">Vertical</p>
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5">9:16 — Totem / Kiosk</p>
                  </div>
                </button>
              </div>

              {pendingAllScreens && (
                <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-400/80 leading-relaxed">
                    O conteúdo será exibido em <strong>todas as {displays.length} telas</strong> conectadas. Ideal para avisos urgentes.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="text-rose-500" />
              Excluir Programação
            </h3>
            <p className="text-slate-400 mb-6">
              Tem certeza que deseja excluir esta programação? Ela será removida de todas as telas selecionadas. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setBroadcastToDelete(null);
                }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALL SCREENS STATUS MODAL */}
      {showAllScreensModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Monitor className="text-sky-500" size={20} />
                  <span>Status e Monitoramento de Telas ({displays.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Visualize o status de conexão em tempo real e as programações ativas de cada monitor corporativo.
                </p>
              </div>
              <button 
                onClick={() => setShowAllScreensModal(false)}
                className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-950/40 grid grid-cols-1 md:grid-cols-2 gap-4">
              {displays.map(display => {
                const isOnline = devices.filter(d => d.display_id === display.id).some(d => (Date.now() - d.last_seen) < 60000);
                
                return (
                  <div key={display.id} className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 p-5 rounded-2xl transition-all flex flex-col justify-between gap-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border bg-slate-950 ${
                          isOnline ? 'border-emerald-500/20 text-emerald-400' : 'border-rose-500/20 text-rose-500'
                        }`}>
                          <Monitor size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-100">{display.name}</h4>
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">ID: {display.slug || display.id}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                        <span className={`text-[10px] font-black uppercase ${isOnline ? 'text-emerald-400' : 'text-rose-500'}`}>
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 border-t border-slate-800/60 pt-3 text-[11px] text-slate-400">
                      <div>
                        <span className="text-slate-600 block uppercase text-[8px] font-black tracking-wider">Orientação</span>
                        <span className="font-bold text-slate-300 flex items-center gap-1 mt-0.5">
                          {display.orientation === 'vertical' ? (
                            <><Smartphone size={12} className="text-purple-400" /> Vertical (9:16)</>
                          ) : (
                            <><Monitor size={12} className="text-sky-400" /> Horizontal (16:9)</>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 block uppercase text-[8px] font-black tracking-wider">Programações Injetadas</span>
                        <span className="font-bold text-slate-300 mt-0.5 block">{display.pages.filter(p => p.broadcast_id).length} cenas</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-3">
                      <span className="text-[10px] text-slate-500 font-medium">Atualizado {new Date(display.updatedAt).toLocaleDateString()}</span>
                      <a 
                        href={`/#/player/${display.slug || display.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs font-bold text-[#0ea5e9] hover:text-sky-300 flex items-center gap-1.5 transition-colors uppercase tracking-wider"
                      >
                        Abrir Player <Maximize2 size={12} />
                      </a>
                    </div>
                  </div>
                );
              })}
              
              {displays.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 text-xs">
                  Nenhuma tela registrada para monitoramento.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Camadas */}
      {showLayersModal && currentBroadcast?.page && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                <Layers className="text-sky-500" size={16} /> Camadas da Cena ({currentBroadcast.page.layout.length})
              </h3>
              <button onClick={() => setShowLayersModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar min-h-0">
              {[...currentBroadcast.page.layout]
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
                      case WidgetType.CALENDAR: return <CalendarIcon size={14} />;
                      case WidgetType.WEATHER: return <CloudSun size={14} />;
                      case WidgetType.FULL_INFO: return <LayoutIcon size={14} />;
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
                      case WidgetType.POWER_BI: return <LayoutIcon size={14} className="text-amber-500" />;
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
              {currentBroadcast.page.layout.length === 0 && (
                <div className="text-center p-6 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                  Nenhuma camada nesta cena.
                </div>
              )}
            </div>
            
            {currentBroadcast.page.layout.length > 0 && (
              <p className="text-[10px] text-slate-500 mt-4 text-center border-t border-slate-800 pt-3">
                💡 Arraste as camadas usando o indicador de arrastar para alterar a ordem de sobreposição (z-index).
              </p>
            )}
          </div>
        </div>
      )}

      {/* Background Animation Selection Modal */}
      {showBgAnimModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-2xl w-full mx-4 animate-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MonitorPlay className="text-sky-500" size={20} /> Escolher Fundo Animado
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
                    updateActivePage({
                      backgroundAnimation: option.id as any,
                      backgroundImage: '',
                      backgroundVideoUrl: ''
                    });
                    setShowBgAnimModal(false);
                  }}
                  className={`group relative overflow-hidden rounded-xl border-2 transition-all h-32 flex flex-col items-center justify-center p-4 ${
                    (currentBroadcast?.page?.backgroundAnimation || '') === option.id 
                    ? 'border-sky-500 ring-2 ring-sky-500/20' 
                    : 'border-slate-800 hover:border-slate-600 hover:scale-[1.02]'
                  }`}
                >
                  <div className={`absolute inset-0 z-0 opacity-50 group-hover:opacity-80 transition-opacity ${getBackgroundAnimationClass(option.id)}`}></div>
                  
                  <div className="relative z-10 text-center">
                    <span className="block font-bold text-white text-sm drop-shadow-md mb-1">{option.label}</span>
                    <span className="block text-[10px] text-slate-300 drop-shadow-md">{option.desc}</span>
                  </div>
                  
                  {(currentBroadcast?.page?.backgroundAnimation || '') === option.id && (
                    <div className="absolute top-2 right-2 z-20 bg-sky-500 text-black rounded-full p-1 shadow-lg">
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

const WidgetTool = ({ icon, label, description, onClick, onHover }: any) => (
  <button 
    onClick={onClick}
    onMouseEnter={() => onHover && onHover(description)}
    onMouseLeave={() => onHover && onHover('')}
    className="relative flex flex-col items-center justify-center p-1 bg-[#111827] border border-slate-800/60 rounded-lg hover:bg-[#0ea5e9]/10 hover:border-[#0ea5e9] hover:shadow-[0_0_12px_rgba(14,165,233,0.15)] active:scale-95 transition-all group w-full cursor-pointer py-1.5"
  >
    {/* Tiny Info Icon in Corner */}
    <div className="absolute top-1 right-1 opacity-20 group-hover:opacity-100 transition-opacity text-slate-400 group-hover:text-[#0ea5e9]">
      <Info size={8} />
    </div>

    {/* Elegant Pure CSS Tooltip */}
    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-slate-950 border border-slate-800 text-slate-200 text-[9px] font-bold py-1.5 px-3 rounded-lg shadow-xl w-48 text-center leading-relaxed">
        {description}
      </div>
      <div className="w-2 h-2 bg-slate-950 border-r border-b border-slate-800 rotate-45 -mt-1"></div>
    </div>

    {/* Smaller Icon Container with LESS Spacing */}
    <div className="text-slate-300 group-hover:text-[#0ea5e9] mb-0.5 transition-colors drop-shadow-sm flex items-center justify-center h-8 w-8">
      {typeof icon === 'string' ? (
        <img 
          src={icon} 
          alt={label} 
          className="w-7 h-7 object-contain group-hover:scale-110 transition-transform duration-300 filter drop-shadow-[0_0_6px_rgba(14,165,233,0.15)]" 
        />
      ) : (
        icon
      )}
    </div>
    <span className="text-[8px] font-bold text-slate-400 group-hover:text-white uppercase tracking-wider transition-colors text-center truncate w-full px-0.5">
      {label}
    </span>
  </button>
);

export default Scheduler;
