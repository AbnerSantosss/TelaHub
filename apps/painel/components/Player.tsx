
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { 
  LiveClock, RssFeed, WeatherWidget, FullInfoWidget, NotesWidget, 
  TodoWidget, CountdownWidget, ChoresWidget, MealPlanWidget, 
  MarketWatchWidget, BrowserSnapshotWidget, EmbedHtmlWidget, 
  GoogleDocsWidget, OfficeDocsWidget, PowerBIWidget, AirtableWidget, 
  PdfDocumentWidget 
} from './widgets';
import { 
  CloudSun, Rss, Monitor, Loader2, Home, ChevronRight, MoreHorizontal, ChevronLeft, 
  Cloud, CloudRain, CloudLightning, Snowflake, Sun, Search, Map,
  StickyNote, ListTodo, Hourglass, ClipboardList, Utensils, TrendingUp, TrendingDown, 
  ArrowUpRight, ArrowDownRight, Globe, FileText, Code2, Database, Layers, CheckSquare
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, ComposedChart, Line } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { getDisplayBySlug, checkDeviceStatus, registerDevice, getDisplayByIdPublic, getBroadcasts, heartbeatDevice, getDisplayVersion } from '../services/storage';
import { Display, Page, WidgetType, Device, Broadcast } from '../types';

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
  
  // Forçar Play com a API do YouTube caso o Autoplay não seja automático
  iframe.contentWindow?.postMessage(JSON.stringify({
    event: 'command',
    func: 'playVideo',
    args: []
  }), '*');
};

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const generatePairingCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getWeatherAnimationClass = (code: number, isDay: number = 1) => {
  const isNight = isDay === 0;

  if (code <= 1) return isNight ? 'bg-anim-clear-night' : 'bg-anim-clear-day'; // Sunny/Clear
  if (code <= 48) return isNight ? 'bg-anim-clouds-night' : 'bg-anim-clouds'; // Cloudy/Fog
  if (code >= 51 && code <= 67) return isNight ? 'bg-anim-rain-night' : 'bg-anim-rain-day'; // Rain
  if (code >= 71 && code <= 77) return isNight ? 'bg-anim-snow-night' : 'bg-anim-snow-day'; // Snow
  if (code >= 80 && code <= 82) return isNight ? 'bg-anim-rain-night' : 'bg-anim-rain-day'; // Showers
  if (code >= 85 && code <= 86) return isNight ? 'bg-anim-snow-night' : 'bg-anim-snow-day'; // Snow showers
  if (code >= 95) return 'bg-anim-storm'; // Thunderstorm
  
  return isNight ? 'bg-anim-clear-night' : 'bg-anim-gradient-flow'; // Default
};

export const getAlignmentClasses = (alignment?: 'start' | 'center' | 'end' | 'stretch') => {
  switch (alignment) {
    case 'start':
      return 'items-start justify-start';
    case 'center':
      return 'items-center justify-center';
    case 'end':
      return 'items-end justify-end';
    case 'stretch':
      return 'items-stretch justify-stretch';
    default:
      return 'items-center justify-center';
  }
};

const Player: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [display, setDisplay] = useState<Display | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const lastUpdateRef = useRef<number>(0);
  const [bgWeatherCode, setBgWeatherCode] = useState<number | null>(null);
  const [bgIsDay, setBgIsDay] = useState<number>(1);
  
  // Pairing States
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<'pending' | 'linked' | 'initializing'>('initializing');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000); // Update time every 10s
    return () => clearInterval(timer);
  }, []);

  const allPages = useMemo(() => {
    if (!display) return [];
    
    return display.pages.filter(page => {
      // If it's not a broadcast page, always show
      if (!page.broadcast_id) return true;
      
      // If it's a broadcast page, check time constraints
      if (page.start_time && currentTime < new Date(page.start_time)) return false;
      if (!page.is_permanent && page.end_time && currentTime > new Date(page.end_time)) return false;
      
      return true;
    });
  }, [display, currentTime]);

  const pageToRender = useMemo(() => {
    return allPages[activeIdx] || allPages[0];
  }, [allPages, activeIdx]);

  const GRID_COLS = 48; 

  const getBackgroundAnimationClass = (anim?: string) => {
    if (anim === 'auto-weather' && bgWeatherCode !== null) {
      return getWeatherAnimationClass(bgWeatherCode, bgIsDay);
    }
    switch (anim) {
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
      case 'auto-weather': return 'bg-anim-gradient-flow'; // Fallback while loading
      default: return '';
    }
  };

  const getTransitionVariants = (type?: string) => {
    switch (type) {
      case 'fade':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
        };
      case 'slide-left':
        return {
          initial: { x: '100%' },
          animate: { x: 0 },
          exit: { x: '-100%' }
        };
      case 'slide-right':
        return {
          initial: { x: '-100%' },
          animate: { x: 0 },
          exit: { x: '100%' }
        };
      case 'slide-up':
        return {
          initial: { y: '100%' },
          animate: { y: 0 },
          exit: { y: '-100%' }
        };
      case 'slide-down':
        return {
          initial: { y: '-100%' },
          animate: { y: 0 },
          exit: { y: '100%' }
        };
      default:
        return {
          initial: { opacity: 1 },
          animate: { opacity: 1 },
          exit: { opacity: 1 }
        };
    }
  };

  // --- Renderização ---

  // Background Weather Fetch Logic
  useEffect(() => {
    if (!display || !pageToRender) return;
    const page = pageToRender;
    
    if (page.backgroundAnimation === 'auto-weather') {
      const fetchBgWeather = async () => {
        try {
          // Find a city from widgets or default to São Paulo
          const weatherWidget = page.layout.find(w => w.type === WidgetType.WEATHER);
          const city = weatherWidget?.data.city || 'São Paulo';
          
          const cleanCity = city.split(',')[0].split('-')[0].split('/')[0].trim();
          if (!cleanCity) return;
          
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&language=pt&format=json`);
          if (!geoRes.ok) return;
          const geoData = await geoRes.json();
          
          if (geoData.results && geoData.results.length > 0) {
            const { latitude, longitude } = geoData.results[0];
            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`);
            if (!weatherRes.ok) return;
            const weatherData = await weatherRes.json();
            
            if (weatherData.current_weather) {
              setBgWeatherCode(weatherData.current_weather.weathercode);
              setBgIsDay(weatherData.current_weather.is_day);
            }
          }
        } catch (e) {
          console.error("Erro ao buscar clima de fundo", e);
        }
      };
      
      fetchBgWeather();
      // Poll every 15 mins
      const interval = setInterval(fetchBgWeather, 900000);
      return () => clearInterval(interval);
    } else {
      setBgWeatherCode(null);
    }
  }, [display, activeIdx]);

  // Init Logic
  useEffect(() => {
    const initPlayer = async () => {
      // 1. Se tiver slug na URL, modo legado/direto
      if (slug) {
        setDeviceStatus('linked');
        await loadDisplayBySlug(slug);
        return;
      }

      // 2. Modo Pareamento
      let storedDeviceId = localStorage.getItem('officecom_device_id');
      
      if (!storedDeviceId) {
        storedDeviceId = generateUUID();
        localStorage.setItem('officecom_device_id', storedDeviceId);
      }
      setDeviceId(storedDeviceId);

      // Verifica status no banco
      const device = await checkDeviceStatus(storedDeviceId);

      if (device && device.status === 'linked' && device.display_id) {
        setDeviceStatus('linked');
        await loadDisplayById(device.display_id);
      } else {
        // Se não existe ou está pendente
        setDeviceStatus('pending');
        
        let code = device?.pairing_code;
        if (!code) {
          code = generatePairingCode();
          // Tenta registrar com retry para garantir que chega ao banco
          let registered = false;
          for (let attempt = 0; attempt < 3 && !registered; attempt++) {
            try {
              await registerDevice(storedDeviceId, code);
              registered = true;
            } catch (err) {
              console.error(`Tentativa ${attempt + 1} de registro falhou:`, err);
              if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
            }
          }
          if (!registered) {
            console.error('Falha ao registrar dispositivo após 3 tentativas');
          }
        }
        setPairingCode(code);
      }
    };

    initPlayer();
  }, [slug]);

  // Heartbeat para manter dispositivo online
  useEffect(() => {
    if (!deviceId) return;

    // Faz o primeiro heartbeat imediatamente
    heartbeatDevice(deviceId);

    const interval = setInterval(() => {
      heartbeatDevice(deviceId);
    }, 120000); // A cada 2 minutos (reduzido de 30s para economizar egress)

    return () => clearInterval(interval);
  }, [deviceId]);

  // Polling para verificar pareamento (apenas se estiver pendente e sem slug)
  useEffect(() => {
    if (slug || deviceStatus !== 'pending' || !deviceId) return;

    const interval = setInterval(async () => {
      const device = await checkDeviceStatus(deviceId);
      if (device && device.status === 'linked' && device.display_id) {
        setDeviceStatus('linked');
        await loadDisplayById(device.display_id);
      }
    }, 10000); // A cada 10 segundos (reduzido de 5s)

    return () => clearInterval(interval);
  }, [slug, deviceStatus, deviceId]);

  // Polling para atualização de conteúdo (apenas se já estiver linkado)
  useEffect(() => {
    if (deviceStatus !== 'linked' || !display) return;

    const interval = setInterval(async () => {
      if (slug) {
        // Primeiro checa a versão (ultra-leve ~20 bytes) antes de buscar o display completo
        const version = await getDisplayVersion(slug, lastUpdateRef.current);
        // null = 304 Not Modified OU erro — não precisa atualizar
        if (version !== null && version !== lastUpdateRef.current) {
          await loadDisplayBySlug(slug);
        }
      } else if (deviceId) {
        const device = await checkDeviceStatus(deviceId);
        if (device && device.display_id) {
           await loadDisplayById(device.display_id);
        }
      }
    }, 60000); // A cada 60 segundos (reduzido de 15s — economia de ~96% de egress)

    return () => clearInterval(interval);
  }, [deviceStatus, display, slug, deviceId]);

  // Conexão Server-Sent Events (SSE) para atualizações instantâneas em tempo real (com Polling leve como fallback)
  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      if (slug) {
        console.log(`🔌 [SSE] Conectando via slug: ${slug}`);
        eventSource = new EventSource(`${API_BASE}/displays/slug/${slug}/live`);
      } else if (deviceId) {
        console.log(`🔌 [SSE] Conectando via deviceId: ${deviceId}`);
        eventSource = new EventSource(`${API_BASE}/devices/player/${deviceId}/live`);
      } else {
        return;
      }

      eventSource.onopen = () => {
        console.log("🟢 [SSE] Conexão em tempo real estabelecida com sucesso.");
      };

      eventSource.onerror = (err) => {
        console.warn("⚠️ [SSE] Conexão perdida ou falha. Tentando reconectar em 5 segundos...", err);
        eventSource?.close();
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectSSE, 5000);
      };

      eventSource.addEventListener('message', async (e) => {
        try {
          const data = JSON.parse(e.data);
          
          if (data.status === 'connected') {
            console.log("📡 [SSE] Canal de comunicação ativo.");
            return;
          }
          if (data.type === 'ping') {
            return; // keep-alive
          }

          console.log("⚡ [SSE] Sinal de atualização recebido:", data);

          if (slug) {
            // Em modo slug direto, apenas recarrega o display
            await loadDisplayBySlug(slug);
          } else if (deviceId) {
            // Em modo pareamento, verifica o status atualizado do dispositivo no banco
            const device = await checkDeviceStatus(deviceId);
            if (device) {
              if (device.status === 'linked' && device.display_id) {
                setDeviceStatus('linked');
                await loadDisplayById(device.display_id);
              } else if (device.status === 'pending') {
                setDeviceStatus('pending');
                setDisplay(null);
                if (device.pairing_code) {
                  setPairingCode(device.pairing_code);
                }
              }
            } else {
              // Dispositivo removido no painel
              setDeviceStatus('pending');
              setDisplay(null);
            }
          }
        } catch (err) {
          console.error("❌ [SSE] Erro ao tratar evento do SSE:", err);
        }
      });
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [slug, deviceId, deviceStatus]);

  const loadDisplayBySlug = async (slugToLoad: string) => {
    try {
      const data = await getDisplayBySlug(slugToLoad, lastUpdateRef.current);
      if (data) {
        const versionTime = typeof data.updatedAt === 'string' 
          ? new Date(data.updatedAt).getTime() 
          : Number(data.updatedAt);

        if (versionTime !== lastUpdateRef.current) {
          setDisplay(data);
          lastUpdateRef.current = versionTime;
        }
        setLoading(false);
      }
    } catch (error) {
      console.error("Erro ao buscar dados do player", error);
    }
  };

  const loadDisplayById = async (displayId: string) => {
    try {
      const data = await getDisplayByIdPublic(displayId, lastUpdateRef.current);
      
      if (data) {
        const versionTime = typeof data.updatedAt === 'string' 
          ? new Date(data.updatedAt).getTime() 
          : Number(data.updatedAt);

        if (versionTime !== lastUpdateRef.current) {
          setDisplay(data);
          lastUpdateRef.current = versionTime;
        }
        setLoading(false);
      }
    } catch (error) {
      console.error("Erro ao buscar dados do player por ID", error);
    }
  };

  useEffect(() => {
    // Fallback para garantir que o loading não fique preso caso a API demore
    const timeout = setTimeout(() => {
        if (loading && deviceStatus === 'linked') setLoading(false);
    }, 8000);
    return () => clearTimeout(timeout);
  }, [loading, deviceStatus]);

  const allPagesCount = allPages.length;
  const currentPage = allPages[activeIdx];
  const currentPageId = currentPage?.id;
  const currentPageDuration = currentPage?.duration;

  useEffect(() => {
    if (!display || allPagesCount <= 1) return;
    
    // If activeIdx is out of bounds, reset it immediately
    if (activeIdx >= allPagesCount) {
      setActiveIdx(0);
      return;
    }

    if (!currentPageId) return;
    
    const timer = setTimeout(() => {
      setActiveIdx((prev) => (prev + 1) % allPagesCount);
    }, (currentPageDuration || 10) * 1000);
    
    return () => clearTimeout(timer);
  }, [display, allPagesCount, activeIdx, currentPageId, currentPageDuration]);

  // --- Renderização ---

  // 1. Tela de Carregamento Inicial
  if (deviceStatus === 'initializing') {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="animate-spin text-cyan-500" size={48} />
      </div>
    );
  }

  // 2. Tela de Pareamento
  if (deviceStatus === 'pending') {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-5"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-slate-900/80"></div>
        
        <div className="z-10 flex flex-col items-center gap-10 animate-in fade-in zoom-in duration-700">
          
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl flex items-center justify-center border border-slate-800 shadow-[0_0_40px_rgba(34,211,238,0.15)] relative group p-4">
               <div className="absolute inset-0 bg-cyan-500/10 rounded-2xl blur-xl animate-pulse"></div>
               <img 
                 src="/logo.png" 
                 alt="Logo" 
                 className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]"
               />
            </div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight">
              Tela<span className="text-[#00D8F6]">Hub</span>
            </h1>
          </div>
          
          <div className="text-center space-y-2 max-w-md">
            <h2 className="text-xl font-bold text-slate-200 uppercase tracking-widest">Parear Dispositivo</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Acesse o painel administrativo e clique em <span className="text-cyan-400 font-bold">"Vincular TV"</span>.
              <br/>Digite o código abaixo quando solicitado:
            </p>
          </div>

          {/* Código de Pareamento */}
          <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800/50 backdrop-blur-xl shadow-2xl flex gap-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-indigo-500/5 to-cyan-500/5 animate-gradient-x"></div>
            
            {pairingCode?.split('').map((digit, i) => (
              <div key={i} className="w-14 h-20 md:w-16 md:h-24 flex items-center justify-center bg-slate-950 rounded-xl border border-slate-800 text-4xl md:text-6xl font-mono font-black text-cyan-400 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
                {digit}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 text-slate-500 text-xs font-mono bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800">
            <Loader2 size={12} className="animate-spin text-cyan-500" />
            <span className="tracking-widest">AGUARDANDO VINCULAÇÃO...</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Tela de Carregamento do Conteúdo (Linked mas carregando)
  if (loading || !display) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-white font-bold uppercase tracking-widest text-sm text-center px-6">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="animate-pulse">Sincronizando Player via Nuvem...</p>
        </div>
      </div>
    );
  }

  const page = pageToRender;
  if (!page) return null;
  const hasFullScreenRss = page.layout.some(w => w.type === WidgetType.RSS && w.data.rssConfig?.layout === 'ticker');

  return (
    <div className="h-screen w-screen bg-black overflow-hidden flex items-center justify-center relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={page.id}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={getTransitionVariants(page.transitionType)}
          transition={{ duration: (page.transitionDuration || 500) / 1000, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {/* Backgrounds outside the 16:9 container to fill the entire screen */}
          {page.backgroundVideoUrl && (
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-black">
               {isYouTubeUrl(page.backgroundVideoUrl) ? (
                 /* Técnica para forçar Aspect Ratio Cover no Iframe do YouTube */
                 <iframe 
                   src={getEmbedUrl(page.backgroundVideoUrl, { autoplay: true, mute: page.backgroundVideoMuted !== false, loop: true, controls: false, youtubeQuality: page.backgroundVideoQuality })} 
                   className="absolute top-1/2 left-1/2 border-none pointer-events-none" 
                   style={{
                     width: '100vw',
                     height: '56.25vw', /* 16:9 aspect ratio */
                     minHeight: '100vh',
                     minWidth: '177.77vh', /* 16:9 aspect ratio */
                     transform: 'translate(-50%, -50%) scale(1.002)',
                   }}
                   allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                   tabIndex={-1}
                   onLoad={(e) => handleYouTubeIframeLoad(e, page.backgroundVideoQuality)}
                 />
               ) : (
                 <video 
                   src={page.backgroundVideoUrl} 
                   className="absolute inset-0 w-full h-full object-cover" 
                   autoPlay
                   preload="auto"
                   muted={page.backgroundVideoMuted !== false}
                   loop
                   playsInline
                   onCanPlay={(e) => {
                     const vid = e.currentTarget;
                     vid.play().catch(() => { vid.muted = true; vid.play(); });
                   }}
                 />
               )}
            </div>
          )}

          {page.backgroundImage && !page.backgroundVideoUrl && (
            <div className="absolute inset-0 z-0 bg-center bg-no-repeat transition-opacity duration-700" 
                 style={{ 
                   backgroundImage: `url(${page.backgroundImage})`,
                   backgroundSize: 'cover'
                 }} 
            />
          )}

          {/* Background Animation */}
          {page.backgroundAnimation && !page.backgroundImage && !page.backgroundVideoUrl && (
            <div className={`absolute inset-0 z-0 ${getBackgroundAnimationClass(page.backgroundAnimation)}`} />
          )}

          {/* Container for Widgets - adapts to display orientation */}
          <div 
            className={`relative z-10 w-full h-full overflow-hidden ${hasFullScreenRss ? '' : (
              display.orientation === 'vertical'
                ? 'max-w-[calc(100vh*9/16)] max-h-screen'
                : 'max-w-[calc(100vh*16/9)] max-h-[calc(100vw*9/16)]'
            )}`}
            style={{ containerType: 'size' }}
          >
            <div className={`absolute inset-0 w-full h-full grid gap-0 ${
              display.orientation === 'vertical' ? 'grid-cols-27-v grid-rows-48-v' : 'grid-cols-48 grid-rows-27'
            }`}>
            {page.layout.map(w => (
              <div 
                key={w.i}
                style={{
                  gridColumn: w.data.fullScreenMode ? (display.orientation === 'vertical' ? '1 / span 27' : '1 / span 48') : `${w.x + 1} / span ${w.w}`, 
                  gridRow: w.data.fullScreenMode ? (display.orientation === 'vertical' ? '1 / span 48' : '1 / span 27') : `${w.y + 1} / span ${w.h}`,
                  zIndex: w.data.fullScreenMode ? 99999 : (w.data.zIndex !== undefined ? w.data.zIndex : 10),
                  padding: w.data.padding || undefined,
                  margin: w.data.margin || undefined,
                }}
                className={`w-full h-full relative overflow-hidden flex ${getAlignmentClasses(w.data.fillContainer ? 'stretch' : w.data.contentAlignment)} ${w.data.backgroundAnimation ? getBackgroundAnimationClass(w.data.backgroundAnimation) : ''}`}
              >
                <Suspense fallback={
                  <div className="flex items-center justify-center w-full h-full bg-slate-950/20 backdrop-blur-sm">
                    <Loader2 className="animate-spin text-accent" size={24} />
                  </div>
                }>
                  {/* Background Image Layer for fullscreen widgets */}
                  {w.data.fullScreenMode && w.data.backgroundImage && (
                    <div 
                      className="absolute inset-0 z-0 bg-center bg-no-repeat"
                      style={{
                        backgroundImage: `url(${w.data.backgroundImage})`,
                        backgroundSize: 'cover',
                      }}
                    />
                  )}
                  {w.type === WidgetType.VIDEO && w.data.videoUrl && (
                     isYouTubeUrl(w.data.videoUrl) ? (
                       <iframe 
                         src={getEmbedUrl(w.data.videoUrl, w.data.videoConfig)} 
                         className={`w-full h-full border-none bg-black ${w.data.videoConfig?.controls ? 'pointer-events-auto' : 'pointer-events-none'}`}
                         allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                         onLoad={(e) => handleYouTubeIframeLoad(e, w.data.videoConfig?.youtubeQuality)}
                       />
                     ) : (
                       <video 
                         src={w.data.videoUrl} 
                         className={`bg-black ${w.data.videoConfig?.controls ? 'pointer-events-auto' : 'pointer-events-none'}`}
                         style={{
                           width: '100%',
                           height: '100%',
                           objectFit: (w.data.fillContainer || w.data.fitContainerMode === 'stretch') ? 'fill' : (w.data.fitContainerMode || 'cover')
                         }}
                         autoPlay={w.data.videoConfig?.autoplay !== false}
                         preload="auto"
                         muted={w.data.videoConfig?.mute !== false}
                         loop={w.data.videoConfig?.loop !== false}
                         controls={w.data.videoConfig?.controls === true}
                         playsInline
                         onCanPlay={(e) => {
                           const vid = e.currentTarget;
                           if (w.data.videoConfig?.autoplay !== false) {
                             vid.play().catch(() => { vid.muted = true; vid.play(); });
                           }
                         }}
                       />
                     )
                  )}
                  {w.type === WidgetType.IMAGE && w.data.url && (
                    <div className={`w-full h-full flex ${getAlignmentClasses(w.data.fillContainer ? 'stretch' : w.data.contentAlignment)} overflow-hidden`}>
                      <img 
                        src={w.data.url} 
                        className="w-full h-full" 
                        alt="" 
                        style={{ 
                          width: '100%',
                          height: '100%',
                          objectFit: (w.data.fillContainer || w.data.fitContainerMode === 'stretch') ? 'fill' : (w.data.fitContainerMode || 'cover'),
                        }} 
                      />
                    </div>
                  )}
                  {w.type === WidgetType.GIF && w.data.url && (
                    <div className={`w-full h-full bg-black/20 flex ${getAlignmentClasses(w.data.fillContainer ? 'stretch' : w.data.contentAlignment)}`}>
                      <img 
                        src={w.data.url} 
                        alt="" 
                        className="w-full h-full"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: (w.data.fillContainer || w.data.fitContainerMode === 'stretch') ? 'fill' : (w.data.fitContainerMode || 'cover')
                        }}
                      />
                    </div>
                  )}
                  {w.type === WidgetType.TEXT && (
                    <div 
                      className="w-full h-full flex"
                      style={{ 
                        alignItems: (w.data.fillContainer || w.data.contentAlignment === 'stretch') ? 'stretch' : w.data.contentAlignment === 'start' ? 'flex-start' : w.data.contentAlignment === 'end' ? 'flex-end' : 'center',
                        justifyContent: (w.data.fillContainer || w.data.contentAlignment === 'stretch') ? 'stretch' : w.data.contentAlignment === 'start' ? 'flex-start' : w.data.contentAlignment === 'end' ? 'flex-end' : w.data.textConfig?.textAlign === 'left' ? 'flex-start' : w.data.textConfig?.textAlign === 'right' ? 'flex-end' : 'center',
                        textAlign: w.data.textConfig?.textAlign || 'center',
                        color: w.data.color, 
                        fontSize: w.data.textConfig?.fontSize || w.data.fontSize?.replace('vw', 'cqw') || '4cqw',
                        fontFamily: w.data.textConfig?.fontFamily,
                        fontWeight: w.data.textConfig?.fontWeight || 'bold',
                        fontStyle: w.data.textConfig?.fontStyle || 'normal',
                        padding: w.data.padding !== undefined ? w.data.padding : '2rem',
                      }}
                    >
                      <p 
                        className="leading-tight drop-shadow-2xl"
                        style={{
                          animation: w.data.textConfig?.animation === 'fade' ? 'fade-in 1.5s ease-out' :
                                     w.data.textConfig?.animation === 'slide' ? 'slide-up 1s ease-out' :
                                     w.data.textConfig?.animation === 'pulse' ? 'pulse 3s infinite ease-in-out' :
                                     w.data.textConfig?.animation === 'bounce' ? 'bounce 2s infinite' :
                                     w.data.textConfig?.animation === 'typewriter' ? 'typewriter 2s steps(40, end)' : 'none',
                          whiteSpace: w.data.textConfig?.animation === 'typewriter' ? 'nowrap' : 'normal',
                          overflow: w.data.textConfig?.animation === 'typewriter' ? 'hidden' : 'visible',
                          borderRight: w.data.textConfig?.animation === 'typewriter' ? '2px solid rgba(255,255,255,0.75)' : 'none',
                          maxWidth: '100%'
                        }}
                      >
                        {w.data.content}
                      </p>
                    </div>
                  )}
                  {w.type === WidgetType.CLOCK && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white drop-shadow-xl">
                      <LiveClock city={w.data.city} model={w.data.model} fontSize={w.data.fontSize?.replace('vw', '')} />
                    </div>
                  )}
                  {w.type === WidgetType.WEATHER && (
                    <WeatherWidget 
                      city={w.data.city || 'São Paulo'} 
                      model={w.data.model} 
                      backgroundAnimation={w.data.backgroundAnimation}
                      windowsView={w.data.windowsView}
                    />
                  )}
                  {w.type === WidgetType.FULL_INFO && (
                    <FullInfoWidget 
                      city={w.data.city || 'São Paulo'} 
                      backgroundImage={w.data.backgroundImage}
                      backgroundAnimation={w.data.backgroundAnimation}
                      model={w.data.model}
                      textSize={w.data.textSize}
                      numberSize={w.data.numberSize}
                      transparentBackground={w.data.transparentBackground}
                      backgroundColor={w.data.backgroundColor}
                    />
                  )}
                  {w.type === WidgetType.RSS && (
                    <div className={`w-full h-full grid gap-2 ${
                      (w.data.rssFeeds || (w.data.rssUrl ? [{url: w.data.rssUrl}] : [])).length === 1 ? 'grid-cols-1' :
                      (w.data.rssFeeds || (w.data.rssUrl ? [{url: w.data.rssUrl}] : [])).length === 2 ? 'grid-cols-2' :
                      'grid-cols-2 grid-rows-2'
                    }`}>
                      {(w.data.rssFeeds || (w.data.rssUrl ? [{url: w.data.rssUrl}] : [])).map((feed, idx) => (
                        <div key={idx} className={`w-full h-full overflow-hidden relative ${w.data.transparentBackground ? '' : 'bg-slate-900/80 backdrop-blur-md'}`} style={{
                          border: `${feed.borderWidth || '1px'} solid ${feed.borderColor || 'transparent'}`,
                          borderRadius: feed.borderRadius || '8px',
                          ...(w.data.backgroundColor && !w.data.transparentBackground ? { backgroundColor: w.data.backgroundColor } : {})
                        }}>
                          <RssFeed url={feed.url} config={w.data.rssConfig} widgetData={w.data} />
                        </div>
                      ))}
                    </div>
                  )}
                  {w.type === WidgetType.IFRAME && w.data.url && (
                    <div className="w-full h-full relative bg-white overflow-hidden">
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
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-presentation"
                        referrerPolicy="no-referrer"
                        title="Web Widget"
                        onLoad={handleYouTubeIframeLoad}
                      />
                    </div>
                  )}
                  {w.type === WidgetType.CALENDAR && w.data.calendarId && (
                    <div 
                      className={`w-full h-full relative overflow-hidden p-3 rounded-xl flex flex-col ${w.data.calendarConfig?.theme === 'neon' ? 'font-mono' : ''}`}
                      style={{ 
                        backgroundColor: w.data.calendarConfig?.transparent ? 'transparent' : (w.data.calendarConfig?.backgroundColor || (w.data.calendarConfig?.theme === 'dark' || w.data.calendarConfig?.theme === 'neon' ? '#0f172a' : '#ffffff')),
                        backdropFilter: w.data.calendarConfig?.transparent ? 'none' : (w.data.calendarConfig?.theme === 'glass' ? 'blur(20px) saturate(180%)' : 'blur(12px)'),
                        border: w.data.calendarConfig?.transparent ? 'none' : (
                          w.data.calendarConfig?.theme === 'neon' ? '1px solid #06b6d4' : 
                          w.data.calendarConfig?.theme === 'glass' ? '1px solid rgba(255,255,255,0.2)' : 
                          w.data.calendarConfig?.theme === 'minimal' ? 'none' :
                          '1px solid rgba(255,255,255,0.1)'
                        ),
                        boxShadow: w.data.calendarConfig?.theme === 'neon' ? '0 0 20px rgba(6, 182, 212, 0.3), inset 0 0 20px rgba(6, 182, 212, 0.1)' : 
                                   w.data.calendarConfig?.theme === 'card' ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : 
                                   w.data.calendarConfig?.theme === 'glass' ? '0 8px 32px 0 rgba(31, 38, 135, 0.37)' : 'none'
                      }}
                    >
                      {(w.data.calendarConfig?.showTitle ?? !!w.data.calendarConfig?.customTitle) && w.data.calendarConfig?.customTitle && (
                        <div 
                          className="mb-2 font-bold text-center z-20 shrink-0 flex items-center justify-center w-full"
                          style={{
                            color: w.data.calendarConfig.titleColor || (
                              w.data.calendarConfig.theme === 'dark' || 
                              w.data.calendarConfig.theme === 'neon' || 
                              w.data.calendarConfig.theme === 'glass' ? '#ffffff' : '#1e293b'
                            ),
                            fontSize: w.data.calendarConfig.titleSize || '1.5rem',
                            textShadow: w.data.calendarConfig.theme === 'neon' ? '0 0 10px rgba(6, 182, 212, 0.8)' : 
                                        w.data.calendarConfig.theme === 'glass' ? '0 2px 4px rgba(0,0,0,0.5)' : 'none',
                            letterSpacing: w.data.calendarConfig.theme === 'neon' ? '0.1em' : 'normal',
                            textTransform: w.data.calendarConfig.theme === 'neon' ? 'uppercase' : 'none'
                          }}
                        >
                          {w.data.calendarConfig.customTitle}
                        </div>
                      )}
                      
                      <div className="flex-1 w-full h-full relative rounded-lg overflow-hidden z-10">
                        <iframe 
                          src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(w.data.calendarId)}&showTitle=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0&bgcolor=${encodeURIComponent(
                            w.data.calendarConfig?.transparent ? '#ffffff' : (w.data.calendarConfig?.backgroundColor || '#ffffff')
                          )}`} 
                          className="w-full h-full border-none absolute inset-0" 
                          style={{
                            filter: (w.data.calendarConfig?.theme === 'dark' || w.data.calendarConfig?.theme === 'neon') ? 'invert(1) hue-rotate(180deg) contrast(0.9) saturate(0.8)' : 'none',
                          }}
                          scrolling="no"
                          title="Google Calendar"
                        />
                       </div>
                     </div>
                  )}
                  {w.type === WidgetType.NOTES && (
                    <NotesWidget data={w.data} />
                  )}
                  {w.type === WidgetType.TODO && (
                    <TodoWidget data={w.data} />
                  )}
                  {w.type === WidgetType.COUNTDOWN && (
                    <CountdownWidget data={w.data} />
                  )}
                  {w.type === WidgetType.CHORES && (
                    <ChoresWidget data={w.data} />
                  )}
                  {w.type === WidgetType.MEAL_PLAN && (
                    <MealPlanWidget data={w.data} />
                  )}
                  {w.type === WidgetType.MARKET_WATCH && (
                    <MarketWatchWidget data={w.data} />
                  )}
                  {w.type === WidgetType.BROWSER_SNAPSHOT && (
                    <BrowserSnapshotWidget data={w.data} />
                  )}
                  {w.type === WidgetType.GOOGLE_DOCS && (
                    <GoogleDocsWidget data={w.data} />
                  )}
                  {w.type === WidgetType.OFFICE_DOCS && (
                    <OfficeDocsWidget data={w.data} />
                  )}
                  {w.type === WidgetType.POWER_BI && (
                    <PowerBIWidget data={w.data} />
                  )}
                  {w.type === WidgetType.EMBED_HTML && (
                    <EmbedHtmlWidget data={w.data} />
                  )}
                  {w.type === WidgetType.AIRTABLE && (
                    <AirtableWidget data={w.data} />
                  )}
                  {w.type === WidgetType.PDF_DOCUMENT && (
                    <PdfDocumentWidget data={w.data} />
                  )}
                </Suspense>
              </div>
            ))}
            </div>
          </div>


      <style>{`
        .grid-cols-48 { grid-template-columns: repeat(48, minmax(0, 1fr)); }
        .grid-rows-27 { grid-template-rows: repeat(27, minmax(0, 1fr)); }
        .grid-cols-27-v { grid-template-columns: repeat(27, minmax(0, 1fr)); }
        .grid-rows-48-v { grid-template-rows: repeat(48, minmax(0, 1fr)); }
        @keyframes progress-width { from { width: 0%; } to { width: 100%; } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-20px); } 60% { transform: translateY(-10px); } }
        @keyframes typewriter { from { width: 0; } to { width: 100%; } }
      `}</style>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Player;
