
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Calendar as CalendarIcon, Clock, Monitor, Trash2, Edit3, Check, X, 
  ChevronLeft, Loader2, Save, Zap, AlertCircle, Layout as LayoutIcon,
  CalendarDays, Filter, Search, MoreVertical, Play, Pause, Settings,
  Image as ImageIcon, Type, CloudSun, Film, Rss, Globe, Gift, Layers, Maximize2,
  Tv, Megaphone, Smartphone
} from 'lucide-react';
import { getBroadcasts, saveBroadcast, deleteBroadcast, getDisplays, getCurrentUser, saveDisplay } from '../services/storage';
import { Broadcast, Display, Page, User, WidgetType, LayoutItem } from '../types';
import SceneEditor from './SceneEditor';

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
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [broadcastsData, displaysData, user] = await Promise.all([
          getBroadcasts(),
          getDisplays(),
          getCurrentUser()
        ]);
        setBroadcasts(broadcastsData);
        setDisplays(displaysData);
        setCurrentUser(user);
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

  if (loading && broadcasts.length === 0 && !isEditing) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-[#7C3AED]" size={32} />
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
                <span>Central de <span className="text-[#7C3AED]">Programação</span></span>
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
                className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-[#7C3AED] hover:from-indigo-500 hover:to-[#6D28D9] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)]"
              >
                <Plus size={20} strokeWidth={3} /> Nova Programação
              </button>
            </div>
          )}
        </header>

        {isEditing ? (
          <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in fade-in duration-300">
            {/* HEADER BAR */}
            <header className="h-auto md:h-16 bg-slate-900 border-b border-slate-800 px-4 md:px-6 py-3 md:py-0 flex flex-col md:flex-row items-center justify-between z-30 shadow-md gap-3 md:gap-0">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-[#7C3AED] transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <div className="w-px h-6 bg-slate-800"></div>
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
                  <h1 className="font-bold text-slate-100 tracking-tight uppercase text-sm">
                    Tela<span className="text-[#7C3AED]">Hub</span> <span className="text-slate-600 mx-1">/</span> 
                    <span className="text-purple-400">Programação</span>
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <span className="text-[10px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded-full uppercase tracking-wider hidden sm:inline-flex items-center gap-1.5">
                  <CalendarDays size={12} /> Modo Agendamento
                </span>
                
                {/* Mobile Sidebar Toggle Button */}
                <button 
                  onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                  className={`md:hidden px-3 py-2 rounded-lg transition-all border ${showLeftSidebar ? 'bg-[#F97316]/20 text-[#F97316] border-[#F97316]/50' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-[#F97316]'}`}
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
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-white/10 active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {loading ? 'SALVANDO...' : 'SALVAR'}
                </button>
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
              <aside className={`absolute md:relative left-0 top-0 h-full w-72 bg-slate-900 border-r border-slate-800 overflow-y-auto z-[60] shadow-xl transition-transform duration-300 ease-in-out ${showLeftSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                {/* Widgets Section */}
                <div className="p-5 border-b border-slate-800">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest flex items-center gap-2">
                      <Layers size={12} /> Widgets
                    </h3>
                    <button onClick={() => setShowLeftSidebar(false)} className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: <ImageIcon size={20} />, label: 'Imagem', type: 'IMAGE' },
                      { icon: <Film size={20} />, label: 'Vídeo', type: 'VIDEO' },
                      { icon: <Type size={20} />, label: 'Texto', type: 'TEXT' },
                      { icon: <Clock size={20} />, label: 'Relógio', type: 'CLOCK' },
                      { icon: <CloudSun size={20} />, label: 'Clima', type: 'WEATHER' },
                      { icon: <LayoutIcon size={20} />, label: 'Completo', type: 'FULL_INFO' },
                      { icon: <Rss size={20} />, label: 'Notícias', type: 'RSS' },
                      { icon: <Globe size={20} />, label: 'Website', type: 'IFRAME' },
                      { icon: <CalendarIcon size={20} />, label: 'Agenda', type: 'CALENDAR' },
                      { icon: <Gift size={20} />, label: 'GIF', type: 'GIF' },
                    ].map(w => (
                      <button
                        key={w.type}
                        onClick={() => {
                          const type = w.type as keyof typeof WidgetType;
                          const newWidget: LayoutItem = {
                            i: Math.random().toString(36).substr(2, 9),
                            x: 18, y: 10,
                            w: ['VIDEO','IFRAME','CALENDAR','GIF','FULL_INFO'].includes(w.type) ? 12 : (w.type === 'RSS' ? 12 : 8),
                            h: ['VIDEO','IFRAME','CALENDAR','GIF','FULL_INFO'].includes(w.type) ? 8 : (w.type === 'RSS' ? 6 : 6),
                            type: WidgetType[type],
                            data: {
                              content: w.type === 'TEXT' ? 'NOVO TEXTO' : '',
                              url: w.type === 'IMAGE' ? 'https://picsum.photos/400/300' : (w.type === 'IFRAME' ? 'https://www.wikipedia.org' : (w.type === 'GIF' ? 'https://media.giphy.com/media/3o7TKSjRrfIPjei72E/giphy.gif' : '')),
                              videoUrl: w.type === 'VIDEO' ? 'https://www.youtube.com/watch?v=YhYaHfpz6lo' : '',
                              rssUrl: w.type === 'RSS' ? 'https://g1.globo.com/rss/g1/tecnologia/' : '',
                              calendarId: w.type === 'CALENDAR' ? 'pt.brazilian#holiday@group.v.calendar.google.com' : '',
                              city: ['WEATHER','CLOCK','FULL_INFO'].includes(w.type) ? 'Campina Grande' : '',
                              model: w.type === 'WEATHER' ? 'simple' : (w.type === 'CLOCK' ? 'standard' : undefined),
                              color: '#ffffff',
                              fontSize: '2vw'
                            }
                          };
                          const page = currentBroadcast?.page || { id: 'temp', order: 1, duration: 15, layout: [] };
                          setCurrentBroadcast({...currentBroadcast!, page: { ...page, layout: [...page.layout, newWidget] }});
                        }}
                        className="flex flex-col items-center justify-center gap-1 p-2.5 min-w-[60px] bg-slate-800/50 hover:bg-indigo-600 hover:text-white text-slate-400 rounded-xl transition-all border border-slate-800 hover:border-indigo-500 group"
                      >
                        <div className="group-hover:scale-110 transition-transform">{w.icon}</div>
                        <span className="text-[8px] font-black uppercase tracking-tighter">{w.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scheduling Config Section */}
                <div className="p-5 border-b border-slate-800">
                  <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <CalendarDays size={12} /> Agendamento
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Nome da Programação</label>
                      <input 
                        type="text" 
                        value={currentBroadcast?.name || ''}
                        onChange={e => setCurrentBroadcast({...currentBroadcast!, name: e.target.value})}
                        placeholder="Ex: Aniversariantes..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder:text-slate-700 focus:border-[#7C3AED] outline-none transition-all"
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
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pl-9 text-xs text-slate-100 focus:border-[#7C3AED] outline-none transition-all"
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
                          className={`w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pl-9 text-xs text-slate-100 focus:border-[#7C3AED] outline-none transition-all ${currentBroadcast?.is_permanent ? 'opacity-30 cursor-not-allowed' : ''}`}
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
                            const page = currentBroadcast?.page || { id: 'temp', order: 1, duration: 15, layout: [] };
                            setCurrentBroadcast({...currentBroadcast!, page: { ...page, duration: parseInt(e.target.value) || 5 }});
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
                            const page = currentBroadcast?.page || { id: 'temp', order: 1, duration: 15, layout: [] };
                            setCurrentBroadcast({...currentBroadcast!, page: { ...page, order: parseInt(e.target.value) || 1 }});
                          }}
                          className="w-full bg-transparent border-none p-1.5 text-sm font-bold text-slate-200 focus:ring-0 outline-none"
                        />
                      </div>
                      <p className="text-[8px] text-slate-500 mt-1.5">Define em qual posição a cena aparecerá na rotação das telas</p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group pt-2">
                      <div className={`w-9 h-5 rounded-full relative transition-all ${currentBroadcast?.is_permanent ? 'bg-[#7C3AED]' : 'bg-slate-700'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${currentBroadcast?.is_permanent ? 'left-[18px]' : 'left-0.5'}`}></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors uppercase">Permanente</span>
                      <input type="checkbox" className="hidden" checked={currentBroadcast?.is_permanent || false} onChange={e => setCurrentBroadcast({...currentBroadcast!, is_permanent: e.target.checked})} />
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-9 h-5 rounded-full relative transition-all ${currentBroadcast?.active ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${currentBroadcast?.active ? 'left-[18px]' : 'left-0.5'}`}></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors uppercase">Ativa</span>
                      <input type="checkbox" className="hidden" checked={currentBroadcast?.active || false} onChange={e => setCurrentBroadcast({...currentBroadcast!, active: e.target.checked})} />
                    </label>
                  </div>
                </div>

                {/* Display Selection Section */}
                <div className="p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest flex items-center gap-2">
                      <Monitor size={12} /> Selecionar Telas
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={selectAllDisplays} className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase">Todas</button>
                      <button onClick={clearDisplaySelection} className="text-[9px] font-black text-rose-400 hover:text-rose-300 uppercase">Limpar</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {displays.map(display => (
                      <div 
                        key={display.id}
                        onClick={() => toggleDisplaySelection(display.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                          currentBroadcast?.display_ids?.includes(display.id)
                          ? 'bg-[#7C3AED]/10 border-[#7C3AED]/50 text-purple-100'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Monitor size={14} className={currentBroadcast?.display_ids?.includes(display.id) ? 'text-[#7C3AED]' : 'text-slate-600'} />
                          <span className="text-xs font-medium">{display.name}</span>
                        </div>
                        {currentBroadcast?.display_ids?.includes(display.id) && <Check size={14} className="text-[#7C3AED]" />}
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
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg"
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
                    <div key={broadcast.id} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all group">
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        
                        <div className="flex gap-6 items-start">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                            isLive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 
                            isScheduled ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 
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
                              {isScheduled && <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[9px] font-black px-2 py-0.5 rounded-full">AGENDADO</span>}
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
                    <><Tv className="text-[#7C3AED]" size={20} /> Modelo de Tela</>
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
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-white/10 bg-slate-950 hover:border-[#7C3AED] hover:bg-[#7C3AED]/10 hover:shadow-[0_0_25px_rgba(124,58,237,0.2)] transition-all group"
                >
                  <div className="w-20 h-[45px] rounded-lg border-2 border-white/10 group-hover:border-[#7C3AED]/60 bg-slate-800 group-hover:bg-[#7C3AED]/10 flex items-center justify-center transition-all">
                    <Monitor size={20} className="text-slate-500 group-hover:text-[#7C3AED] transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-300 group-hover:text-[#7C3AED] transition-colors">Horizontal</p>
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
    </div>
  );
};

export default Scheduler;
