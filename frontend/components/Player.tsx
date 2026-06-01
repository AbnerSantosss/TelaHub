
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
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

const getWeatherAnimationClass = (code: number, isDay: number = 1) => {
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

export const LiveClock: React.FC<{city?: string, model?: string, fontSize?: string}> = ({ city, model = 'standard', fontSize }) => {
  const [time, setTime] = useState(new Date());
  const [timezone, setTimezone] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!city) {
      setTimezone(undefined);
      return;
    }
    const fetchTimezone = async () => {
      try {
        const cleanCity = city.split(',')[0].split('-')[0].split('/')[0].trim();
        if (!cleanCity) return;
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&language=pt&format=json`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setTimezone(data.results[0].timezone);
        }
      } catch (e) {
        console.error("Erro ao buscar fuso horário", e);
      }
    };
    fetchTimezone();
  }, [city]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Analog Clock Logic
  const getAnalogStyle = () => {
    const date = timezone ? new Date(new Date().toLocaleString("en-US", { timeZone: timezone })) : time;
    const seconds = date.getSeconds();
    const minutes = date.getMinutes();
    const hours = date.getHours();
    
    return {
      s: { transform: `rotate(${seconds * 6}deg)` },
      m: { transform: `rotate(${minutes * 6 + seconds * 0.1}deg)` },
      h: { transform: `rotate(${hours * 30 + minutes * 0.5}deg)` }
    };
  };

  // Helper para calcular tamanhos relativos baseados no fontSize principal
  const baseSize = fontSize ? parseFloat(fontSize) : 8; // default 8cqw
  const getRelativeSize = (multiplier: number) => `${baseSize * multiplier}cqw`;

  if (model === 'analog') {
    const { s, m, h } = getAnalogStyle();
    const clockSize = getRelativeSize(2.5); // 20vw default -> 8 * 2.5
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative rounded-full border-[6px] border-slate-200 bg-slate-900/80 shadow-2xl backdrop-blur-sm" style={{ width: clockSize, height: clockSize, maxWidth: '300px', maxHeight: '300px' }}>
           {/* Markers */}
           {[...Array(12)].map((_, i) => (
             <div key={i} className="absolute w-1 h-3 bg-slate-400 left-1/2 top-2 origin-[50%_calc(10cqw-8px)]" style={{ transform: `translateX(-50%) rotate(${i * 30}deg)` }}></div>
           ))}
           
           {/* Hands */}
           <div className="absolute top-1/2 left-1/2 w-1.5 h-[25%] bg-white origin-bottom -translate-x-1/2 -translate-y-full rounded-full z-10" style={h}></div>
           <div className="absolute top-1/2 left-1/2 w-1 h-[35%] bg-cyan-400 origin-bottom -translate-x-1/2 -translate-y-full rounded-full z-20" style={m}></div>
           <div className="absolute top-1/2 left-1/2 w-0.5 h-[40%] bg-rose-500 origin-bottom -translate-x-1/2 -translate-y-full z-30" style={s}></div>
           
           {/* Center Dot */}
           <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-rose-500 rounded-full -translate-x-1/2 -translate-y-1/2 z-40 border-2 border-slate-900"></div>
        </div>
        {city && <div className="font-bold text-slate-300 uppercase tracking-widest" style={{ fontSize: getRelativeSize(0.18) }}>{city}</div>}
      </div>
    );
  }

  if (model === 'minimal') {
    return (
      <div className="text-center flex flex-col items-center">
        <div className="font-black leading-none tracking-tighter tabular-nums text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400" style={{ fontSize: getRelativeSize(1.5) }}>
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone })}
        </div>
        {city && <div className="font-bold text-cyan-500 uppercase tracking-[0.2em] mt-[-1cqw]" style={{ fontSize: getRelativeSize(0.18) }}>{city}</div>}
      </div>
    );
  }

  if (model === 'neon') {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-black border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
         <div className="font-black leading-none tracking-tighter tabular-nums text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" style={{ fontSize: getRelativeSize(0.875), textShadow: '0 0 20px #06b6d4, 0 0 40px #06b6d4' }}>
           {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone })}
         </div>
         <div className="font-bold text-cyan-200 uppercase tracking-[0.5em] mt-2 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]" style={{ fontSize: getRelativeSize(0.15) }}>
           {city || 'SYSTEM TIME'}
         </div>
      </div>
    );
  }

  if (model === 'vertical') {
    const hours = time.toLocaleTimeString([], { hour: '2-digit', hour12: false, timeZone: timezone });
    const minutes = time.toLocaleTimeString([], { minute: '2-digit', timeZone: timezone });
    
    return (
      <div className="flex flex-col items-center justify-center leading-[0.8]">
        <div className="font-black tracking-tighter text-white" style={{ fontSize: getRelativeSize(1.25) }}>{hours}</div>
        <div className="font-black tracking-tighter text-slate-500" style={{ fontSize: getRelativeSize(1.25) }}>{minutes}</div>
        {city && <div className="font-bold text-cyan-500 uppercase tracking-widest mt-4" style={{ fontSize: getRelativeSize(0.125) }}>{city}</div>}
      </div>
    );
  }
  
  if (model === 'date-time') {
    return (
      <div className="text-center flex flex-col items-center bg-black/40 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="font-bold text-cyan-400 uppercase tracking-widest mb-2" style={{ fontSize: getRelativeSize(0.25) }}>
          {time.toLocaleDateString([], { weekday: 'long', timeZone: timezone })}
        </div>
        <div className="font-black leading-none tracking-tighter tabular-nums text-white mb-2" style={{ fontSize: getRelativeSize(0.75) }}>
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone })}
        </div>
        <div className="font-medium text-slate-300 uppercase tracking-widest font-mono border-t border-white/20 pt-2 w-full" style={{ fontSize: getRelativeSize(0.18) }}>
          {time.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric', timeZone: timezone })}
        </div>
        {city && <div className="text-slate-500 mt-2 font-bold uppercase" style={{ fontSize: getRelativeSize(0.125) }}>{city}</div>}
      </div>
    );
  }

  // Standard
  return (
    <div className="text-center flex flex-col items-center justify-center w-full h-full relative overflow-hidden">
      <div className="font-black leading-none tracking-tighter tabular-nums relative z-10" style={{ fontSize: getRelativeSize(1) }}>
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone })}
      </div>
      
      {city ? (
        <>
          <div className="font-bold text-cyan-400 uppercase tracking-widest mt-2 mb-1" style={{ fontSize: getRelativeSize(0.25) }}>
            {city}
          </div>
          <div className="font-medium text-white/50 uppercase tracking-widest font-mono" style={{ fontSize: getRelativeSize(0.15) }}>
            {time.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone })}
          </div>
        </>
      ) : (
        <div className="font-bold text-white/60 uppercase tracking-widest mt-2" style={{ fontSize: getRelativeSize(0.18) }}>
          {time.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      )}
    </div>
  );
};

export const RssFeed: React.FC<{url: string, config?: any, widgetData?: any}> = ({ url, config, widgetData }) => {
  const [items, setItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [invalidImages, setInvalidImages] = useState<Set<string>>(new Set());
  const layout = config?.layout || 'full-image';
  const feedMode = config?.feedMode || 'default';

  // Função para extrair imagem
  const getImageUrl = (item: any) => {
    if (!item) return null;
    if (item.thumbnail && item.thumbnail.length > 0) return item.thumbnail;
    if (item.enclosure?.link) return item.enclosure.link;
    if (item.enclosure?.url) return item.enclosure.url;
    const descImg = item.description?.match(/<img[^>]+src="([^">]+)"/)?.[1];
    if (descImg) return descImg;
    const contentImg = item.content?.match(/<img[^>]+src="([^">]+)"/)?.[1];
    if (contentImg) return contentImg;
    return null;
  };

  useEffect(() => {
    const fetchRss = async () => {
      if (!url) {
        setLoading(false);
        return;
      }
      try {
        let itemsData: any[] = [];
        
        // Tentativa 1: rss2json
        try {
          const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
          const data = await res.json();
          if (data.status === 'ok' && data.items && data.items.length > 0) {
            itemsData = data.items;
          }
        } catch (e) {
          console.warn("rss2json falhou, tentando fallback", e);
        }

        // Tentativa 2: Fallback usando corsproxy.io
        if (itemsData.length === 0) {
          try {
            const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
            if (!res.ok) throw new Error("corsproxy falhou");
            const text = await res.text();
            
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, "text/xml");
            const items = Array.from(xml.querySelectorAll("item"));
            
            itemsData = items.map(item => {
              const title = item.querySelector("title")?.textContent || "";
              const description = item.querySelector("description")?.textContent || "";
              const link = item.querySelector("link")?.textContent || "";
              const pubDate = item.querySelector("pubDate")?.textContent || "";
              
              let author = item.querySelector("author")?.textContent || "";
              if (!author) {
                const creator = item.getElementsByTagNameNS("*", "creator")[0];
                if (creator) author = creator.textContent || "";
              }

              let content = "";
              const encoded = item.getElementsByTagNameNS("*", "encoded")[0];
              if (encoded) content = encoded.textContent || "";

              const enclosure = item.querySelector("enclosure");
              const enclosureUrl = enclosure ? enclosure.getAttribute("url") : null;
              
              let mediaUrl = null;
              const mediaContent = item.getElementsByTagNameNS("*", "content")[0];
              if (mediaContent && mediaContent.getAttribute("url")) {
                 mediaUrl = mediaContent.getAttribute("url");
              }
              
              return {
                title,
                description,
                link,
                pubDate,
                author,
                content,
                enclosure: enclosureUrl ? { url: enclosureUrl } : (mediaUrl ? { url: mediaUrl } : null)
              };
            });
          } catch (e) {
            console.warn("Fallback corsproxy falhou, tentando allorigins alternativo", e);
            
            // Tentativa 3: Fallback usando allorigins (get)
            try {
              const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
              if (!res.ok) throw new Error("allorigins alternative falhou");
              const json = await res.json();
              const text = json.contents;
              
              const parser = new DOMParser();
              const xml = parser.parseFromString(text, "text/xml");
              const items = Array.from(xml.querySelectorAll("item"));
              
              itemsData = items.map(item => {
                const title = item.querySelector("title")?.textContent || "";
                const description = item.querySelector("description")?.textContent || "";
                const link = item.querySelector("link")?.textContent || "";
                const pubDate = item.querySelector("pubDate")?.textContent || "";
                
                let author = item.querySelector("author")?.textContent || "";
                if (!author) {
                  const creator = item.getElementsByTagNameNS("*", "creator")[0];
                  if (creator) author = creator.textContent || "";
                }

                let content = "";
                const encoded = item.getElementsByTagNameNS("*", "encoded")[0];
                if (encoded) content = encoded.textContent || "";

                const enclosure = item.querySelector("enclosure");
                const enclosureUrl = enclosure ? enclosure.getAttribute("url") : null;
                
                let mediaUrl = null;
                const mediaContent = item.getElementsByTagNameNS("*", "content")[0];
                if (mediaContent && mediaContent.getAttribute("url")) {
                   mediaUrl = mediaContent.getAttribute("url");
                }
                
                return {
                  title,
                  description,
                  link,
                  pubDate,
                  author,
                  content,
                  enclosure: enclosureUrl ? { url: enclosureUrl } : (mediaUrl ? { url: mediaUrl } : null)
                };
              });
            } catch (err) {
              console.error("Todos os fallbacks RSS falharam", err);
            }
          }
        }

        if (itemsData.length > 0) {
           const itemsWithImages = itemsData.filter((item: any) => getImageUrl(item) !== null);
           
           if (config?.feedMode === 'require-image') {
              setItems(itemsWithImages);
           } else if (config?.feedMode === 'text-only') {
              setItems(itemsData);
           } else {
              // Default behavior: tenta usar com imagens se houver, senão fallback para todos
              setItems(itemsWithImages.length > 0 ? itemsWithImages : itemsData);
           }
        }
      } catch (e) {
        console.error("Erro geral ao carregar RSS", e);
      } finally {
        setLoading(false);
      }
    };
    fetchRss();
    const interval = setInterval(fetchRss, 300000);
    return () => clearInterval(interval);
  }, [url]);

  // Filtra itens válidos (que não estão marcados como imagem inválida)
  const validItems = useMemo(() => {
    return items.filter(item => {
      const imgUrl = getImageUrl(item);
      if (imgUrl && invalidImages.has(imgUrl)) return false;
      return true;
    });
  }, [items, invalidImages]);

  useEffect(() => {
    if (validItems.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validItems.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [validItems.length]);

  const handleImageError = (imgUrl: string | null) => {
    if (!imgUrl) return;
    setInvalidImages(prev => {
      const newSet = new Set(prev);
      newSet.add(imgUrl);
      return newSet;
    });
    // Força a troca imediata para o próximo item se o atual quebrou
    setCurrentIndex((prev) => (prev + 1) % (validItems.length - 1 || 1));
  };

  if (loading) return <div className="text-white/50 text-xs animate-pulse font-mono flex items-center justify-center h-full">CARREGANDO FEED...</div>;
  
  if (validItems.length === 0) {
    return (
      <div className="text-white/50 text-xs font-mono flex flex-col items-center justify-center h-full p-4 text-center">
        <Rss size={24} className="mb-2 opacity-50" />
        <span>NENHUMA NOTÍCIA ENCONTRADA</span>
      </div>
    );
  }

  const currentItem = validItems[currentIndex % validItems.length];
  const imageUrl = getImageUrl(currentItem);

  // Layout: Split (Imagem Topo / Texto Baixo)
  if (layout === 'split') {
    const showFullContent = config?.showFullContent;
    const enableMarquee = config?.enableMarquee;
    const marqueeSpeed = config?.marqueeSpeed || 50;
    // Calculate duration: higher speed (100) = lower duration (e.g. 5s), lower speed (10) = higher duration (e.g. 40s)
    const animationDuration = Math.max(5, (110 - marqueeSpeed) * 0.8); 

    const getFontSize = (type: 'title' | 'desc') => {
       const size = (type === 'title' ? config?.titleSize : config?.descriptionSize) || config?.fontSize || 'normal';
       
       if (type === 'title') {
           switch(size) {
              case 'small': return '0.9rem';
              case 'normal': return '1.1rem';
              case 'large': return '1.5rem';
              case 'xl': return '2.2rem';
              default: return '1.1rem';
           }
       } else {
           switch(size) {
              case 'small': return '0.7rem';
              case 'normal': return '0.85rem';
              case 'large': return '1.1rem';
              case 'xl': return '1.4rem';
              default: return '0.85rem';
           }
       }
    };

    const getFontFamily = () => {
       switch(config?.fontFamily) {
          case 'serif': return 'font-serif';
          case 'mono': return 'font-mono';
          case 'display': return 'font-black tracking-tighter';
          default: return 'font-sans';
       }
    };

    const titleStyle = {
       fontSize: getFontSize('title'),
       color: config?.titleColor || '#ffffff',
    };
    
    const descStyle = {
       fontSize: getFontSize('desc'),
       color: config?.textColor || '#94a3b8',
    };

    // Adjust image height based on content mode
    // If marquee is enabled, we can give more space to the image as text is compact
    const isTextOnly = feedMode === 'text-only';
    const imageHeightClass = isTextOnly ? 'hidden' : (showFullContent ? 'h-[35%]' : (enableMarquee ? 'h-[65%]' : 'h-[55%]'));

    // Configuração de estilo do fundo repassado do widget pai
    const containerStyle = {
      containerType: 'size' as React.CSSProperties['containerType'],
      backgroundColor: widgetData?.transparentBackground 
        ? 'transparent' 
        : (widgetData?.backgroundColor || '#0f172a') // slate-900 equivalente se vazio
    };

    return (
      <div 
        className={`flex flex-col h-full animate-in fade-in duration-700 key={currentIndex} relative p-3 rounded-xl ${widgetData?.transparentBackground ? '' : 'border border-slate-800 shadow-xl'} overflow-hidden`}
        style={containerStyle}
      >
         <style>
            {`
              @keyframes marquee-scroll {
                0% { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
              }
            `}
         </style>

         <div className="absolute top-0 right-0 z-20 bg-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest py-1 px-2 w-fit rounded mb-3 flex items-center gap-2 backdrop-blur-md border border-orange-500/30 shadow-lg m-2">
           <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span> RSS
         </div>
  
         <div className="flex flex-col h-full">
             {!isTextOnly && (
               <div className={`w-full ${imageHeightClass} mb-1 rounded-lg overflow-hidden relative shrink-0 border border-slate-700/50 shadow-lg bg-black/20 flex items-center justify-center group transition-all duration-500`}>
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      className="w-full h-full object-contain transition-transform duration-1000 group-hover:scale-105" 
                      alt={currentItem.title}
                      referrerPolicy="no-referrer"
                      onError={() => handleImageError(imageUrl)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <Rss size={48} className="text-slate-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
               </div>
             )}
  
             <div className="flex flex-col flex-1 min-h-0 justify-between overflow-hidden relative">
                {enableMarquee ? (
                   <div className="flex flex-col h-full w-full overflow-hidden relative">
                      {/* Static Title - Highlighted */}
                      <h3 
                        className={`font-bold leading-tight shrink-0 mb-1 ${getFontFamily()}`}
                        style={titleStyle}
                      >
                        {currentItem.title}
                      </h3>
                      
                      {/* Marquee Description */}
                      <div className="flex-1 w-full overflow-hidden relative flex items-center">
                        <div 
                            className="whitespace-nowrap absolute flex items-center"
                            style={{ 
                            animation: `marquee-scroll ${animationDuration}s linear infinite`,
                            minWidth: '100%'
                            }}
                        >
                            <div 
                            className={`leading-snug opacity-90 font-light ${getFontFamily()}`} 
                            style={descStyle}
                            dangerouslySetInnerHTML={{__html: currentItem.description?.replace(/<img[^>]*>/g, '').replace(/<[^>]*>?/gm, '').substring(0, 300) || ''}} 
                            />
                        </div>
                      </div>
                   </div>
                ) : (
                   <div className="flex flex-col h-full overflow-hidden">
                     <h3 
                       className={`font-bold leading-tight mb-2 shrink-0 ${showFullContent ? 'line-clamp-3' : 'line-clamp-2'} ${getFontFamily()}`}
                       style={titleStyle}
                     >
                       {currentItem.title}
                     </h3>
                     
                     <div 
                       className={`leading-snug opacity-90 font-light ${showFullContent ? 'line-clamp-[15]' : 'line-clamp-3'} ${getFontFamily()}`} 
                       style={descStyle}
                       dangerouslySetInnerHTML={{__html: showFullContent 
                           ? currentItem.description?.replace(/<img[^>]*>/g, '').replace(/<[^>]*>?/gm, '') || '' 
                           : currentItem.description?.replace(/<img[^>]*>/g, '').replace(/<[^>]*>?/gm, '').substring(0, 150) + '...' || ''}} 
                     />
                   </div>
                )}
                
                <p className="mt-auto text-[10px] text-slate-500 pt-2 font-mono border-t border-slate-800/50 w-full truncate flex items-center gap-2 shrink-0 z-10 bg-slate-900">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c]"></span>
                  <span className="uppercase tracking-wider font-bold text-[#ea580c]">{currentItem.author || 'Fonte Externa'}</span> 
                  <span className="opacity-50">•</span> 
                  {new Date(currentItem.pubDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
             </div>
         </div>
      </div>
    );
  }

  // Layout: Full Image (Padrão e Ticker/Wide)
  // O layout 'ticker' agora usa o mesmo visual do full-image, mas adaptado para containers largos
  const getFullImageFontSize = (type: 'title' | 'desc') => {
    const size = (type === 'title' ? config?.titleSize : config?.descriptionSize) || config?.fontSize || 'normal';
    
    if (type === 'title') {
        switch(size) {
           case 'small': return 'clamp(1rem, 4cqw, 1.5rem)';
           case 'normal': return 'clamp(1.25rem, 6cqw, 3rem)';
           case 'large': return 'clamp(1.5rem, 8cqw, 4.5rem)';
           case 'xl': return 'clamp(2rem, 12cqw, 7rem)';
           default: return 'clamp(1.25rem, 6cqw, 3rem)';
        }
    } else {
        switch(size) {
           case 'small': return 'clamp(0.7rem, 2.5cqw, 1rem)';
           case 'normal': return 'clamp(0.85rem, 3.5cqw, 1.25rem)';
           case 'large': return 'clamp(1.1rem, 5cqw, 2rem)';
           case 'xl': return 'clamp(1.4rem, 7cqw, 3rem)';
           default: return 'clamp(0.85rem, 3.5cqw, 1.25rem)';
        }
    }
  };

  const getFullImageFontFamily = () => {
    switch(config?.fontFamily) {
       case 'serif': return 'font-serif';
       case 'mono': return 'font-mono';
       case 'display': return 'font-black tracking-tighter';
       default: return 'font-sans';
    }
  };

  const fullContainerStyle = {
    containerType: 'size' as React.CSSProperties['containerType'],
    backgroundColor: widgetData?.transparentBackground 
       ? 'transparent' 
       : (widgetData?.backgroundColor || 'transparent')
  };

  return (
    <div 
      className="w-full h-full animate-in fade-in duration-700 relative overflow-hidden group"
      style={fullContainerStyle}
    >
       {/* Fundo do texto apenas e gradiente, sem impor bg-slate-900 se tiver fundo transparente / customizado */}
       <div className={`absolute inset-0 z-0 ${widgetData?.transparentBackground ? '' : (widgetData?.backgroundColor ? '' : 'bg-slate-900')}`} style={widgetData?.transparentBackground ? {} : {backgroundColor: widgetData?.backgroundColor}}>
          {feedMode !== 'text-only' && imageUrl ? (
            <img 
              src={imageUrl} 
              className="w-full h-full object-contain transition-transform duration-1000 group-hover:scale-105 opacity-90" 
              alt={currentItem.title}
              referrerPolicy="no-referrer"
              onError={() => handleImageError(imageUrl)}
            />
          ) : (
            feedMode !== 'text-only' && (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <Rss size={120} className="text-slate-500" />
            </div>
            )
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent/20"></div>
          {/* Gradiente lateral extra para telas wide (ticker mode) para garantir leitura do texto à esquerda/direita se necessário */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/40 opacity-60"></div>
       </div>

       {/* Conteúdo sobreposto */}
       <div className="relative z-10 flex flex-col h-full justify-end p-4 sm:p-6">
          {/* Badge */}
          <div className="absolute top-4 right-4 bg-orange-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest py-1.5 px-3 rounded shadow-lg flex items-center gap-2 border border-orange-400/30">
             <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span> RSS
          </div>

          <div className="max-w-full">
            <h3 
              className={`font-black leading-tight mb-3 drop-shadow-lg line-clamp-2 ${getFullImageFontFamily()}`}
              style={{ 
                fontSize: getFullImageFontSize('title'), 
                color: config?.titleColor || '#ffffff',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)' 
              }}
            >
              {currentItem.title}
            </h3>
            
            <div 
              className={`leading-relaxed line-clamp-2 font-medium drop-shadow-md mb-4 max-w-[95%] hidden sm:block ${getFullImageFontFamily()}`} 
              style={{ 
                fontSize: getFullImageFontSize('desc'),
                color: config?.textColor || '#e2e8f0'
              }}
              dangerouslySetInnerHTML={{__html: currentItem.description?.replace(/<img[^>]*>/g, '').replace(/<[^>]*>?/gm, '').substring(0, 200) + '...' || ''}} 
            />
            
            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-2 border-t border-white/10 pt-3 w-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] shadow-[0_0_5px_rgba(124,58,237,0.8)]"></span>
              <span className="uppercase tracking-wider font-bold text-[#ea580c]">{currentItem.author || 'Fonte Externa'}</span> 
              <span className="opacity-50">•</span> 
              <span className="opacity-80">{new Date(currentItem.pubDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </p>
          </div>
       </div>
    </div>
  );
};

export const WeatherWidget: React.FC<{
  city: string; 
  model?: string;
  config?: { baseFontSize?: string; showCityImage?: boolean };
  backgroundImage?: string;
  backgroundAnimation?: string;
  windowsView?: string;
}> = ({ city, model = 'simple', config, backgroundImage, backgroundAnimation, windowsView }) => {
  const [weather, setWeather] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeWindowsView, setActiveWindowsView] = useState<string>(windowsView || 'hourly');

  useEffect(() => {
    if (model === 'windows') {
      const views = ['hourly', 'daily', 'precipitation'];
      const interval = setInterval(() => {
        setActiveWindowsView(prev => {
          const idx = views.indexOf(prev);
          return views[(idx + 1) % views.length];
        });
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [model]);

  useEffect(() => {
    if (windowsView) {
      setActiveWindowsView(windowsView);
    }
  }, [windowsView]);
  
  // Mapeamento de códigos WMO para descrições em PT-BR
  const getWeatherDescription = (code: number) => {
    const codes: {[key: number]: string} = {
      0: 'Céu Limpo',
      1: 'Ensolarado',
      2: 'Parc. Nublado',
      3: 'Nublado',
      45: 'Nevoeiro',
      48: 'Nevoeiro',
      51: 'Chuvisco',
      53: 'Chuvisco',
      55: 'Chuvisco',
      56: 'Chuvisco',
      57: 'Chuvisco',
      61: 'Chuva Fraca',
      63: 'Chuva',
      65: 'Chuva Forte',
      66: 'Chuva Cong.',
      67: 'Chuva Cong.',
      71: 'Neve',
      73: 'Neve',
      75: 'Neve',
      77: 'Granizo',
      80: 'Pancadas',
      81: 'Pancadas',
      82: 'Tempestade',
      85: 'Neve',
      86: 'Neve',
      95: 'Trovoada',
      96: 'Trovoada',
      99: 'Trovoada Forte'
    };
    return codes[code] || 'Indisponível';
  };

  const getWeatherIcon = (code: number, props: any = {}) => {
    if (code === 0 || code === 1) return <Sun {...props} />;
    if (code === 2) return <CloudSun {...props} />;
    if (code === 3 || code === 45 || code === 48) return <Cloud {...props} />;
    if (code >= 51 && code <= 67) return <CloudRain {...props} />;
    if (code >= 71 && code <= 86) return <Snowflake {...props} />;
    if (code >= 95 && code <= 99) return <CloudLightning {...props} />;
    return <CloudSun {...props} />;
  };

  useEffect(() => {
    if (!city) return;
    
    const fetchWeather = async () => {
      const cacheKey = `weather_v5_${city}`;
      
      // Safe localStorage read
      let cached = null;
      try {
        cached = localStorage.getItem(cacheKey);
      } catch (e) {
        console.warn("localStorage indisponível para leitura", e);
      }
      
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 3600000) { // 1 hour cache
            setWeather(data);
            return;
          }
        } catch (e) {
          try { localStorage.removeItem(cacheKey); } catch(err) {}
        }
      }

      setErrorMsg(null);

      // Função auxiliar para salvar no cache com segurança
      const saveToCache = (data: any) => {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
        } catch (e) {
          console.warn("localStorage indisponível para gravação", e);
        }
      };

      // TENTATIVA 1: Open-Meteo (Mais preciso, requer geocoding)
      try {
        // Limpar a string da cidade para melhorar a busca
        const cleanCity = city.split(',')[0].split('-')[0].split('/')[0].trim();
        if (!cleanCity) throw new Error('Cidade inválida');
        
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&language=pt&format=json`);
        if (!geoRes.ok) throw new Error('Geo API error');
        const geoData = await geoRes.json();
        
        if (!geoData.results || geoData.results.length === 0) {
           throw new Error(`Cidade "${cleanCity}" não encontrada no Open-Meteo`);
        }

        const { latitude, longitude, name } = geoData.results[0];

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=precipitation,temperature_2m,precipitation_probability&timezone=auto`);
        if (!weatherRes.ok) throw new Error('Weather API error');
        const weatherData = await weatherRes.json();
        console.log("Weather Data:", weatherData);

        const formattedData = {
           temp: Math.round(weatherData.current.temperature_2m),
           humidity: weatherData.current.relative_humidity_2m,
           wind: weatherData.current.wind_speed_10m,
           code: weatherData.current.weather_code,
           is_day: weatherData.current.is_day,
           desc: getWeatherDescription(weatherData.current.weather_code),
           cityName: name,
           forecast: weatherData.daily?.time?.map((t: string, i: number) => ({
              date: t,
              max: Math.round(weatherData.daily.temperature_2m_max[i]),
              min: Math.round(weatherData.daily.temperature_2m_min[i]),
              code: weatherData.daily.weather_code[i]
           })) || [],
           hourly: (() => {
              if (!weatherData.hourly?.time) return [];
              const now = new Date();
              const currentIndex = weatherData.hourly.time.findIndex((t: string) => new Date(t).getTime() >= now.getTime() - 3600000);
              const startIndex = currentIndex >= 0 ? currentIndex : 0;
              
              // Ensure we don't go out of bounds
              const endIndex = Math.min(startIndex + 24, weatherData.hourly.time.length);
              
              return weatherData.hourly.time.slice(startIndex, endIndex).map((t: string, i: number) => ({
                 time: t,
                 temp: weatherData.hourly.temperature_2m[startIndex + i],
                 precip: weatherData.hourly.precipitation[startIndex + i] || 0,
                 prob: weatherData.hourly.precipitation_probability?.[startIndex + i] || 0
              }));
           })()
        };

        setWeather(formattedData);
        saveToCache(formattedData);

      } catch (e1: any) {
        console.error("Open-Meteo falhou:", e1?.message);
        setErrorMsg(`Erro: ${e1?.message || 'Falha na conexão'}`);
      }
    };
    
    fetchWeather();
    const interval = setInterval(fetchWeather, 3600000); // 1 hour
    return () => clearInterval(interval);
  }, [city]);

  if (errorMsg) return <div className="text-white/50 text-[10px] font-mono bg-red-500/10 p-1 rounded">{errorMsg}</div>;
  if (!weather) return <div className="text-white/50 text-xs animate-pulse font-mono">CARREGANDO CLIMA...</div>;

  const { temp, desc, humidity, wind, cityName, forecast, code } = weather;
  
  const validDate = new Date();
  const dayOfWeek = validDate.toLocaleDateString('pt-BR', { weekday: 'long' });
  const capitalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);

  // Base style for scaling
  const containerStyle = { fontSize: config?.baseFontSize || '1cqw' };

  // Determine background animation class
  // If prop is 'auto-weather', use weather code. Otherwise, use prop or empty.
  // Note: If prop is a specific animation (e.g. 'rain'), parent container handles it?
  // Actually, parent container handles ALL animations EXCEPT 'auto-weather' (which returns placeholder in Editor, but here we need real logic).
  // Wait, if parent container has 'auto-weather' class from getBackgroundAnimationClass, it's just a placeholder or empty string in Player?
  // In Player.tsx, getBackgroundAnimationClass for 'auto-weather' returns '' (default).
  // So we need to render the background HERE if it's auto-weather.
  
  const autoBgClass = backgroundAnimation === 'auto-weather' && weather ? getWeatherAnimationClass(weather.code || 0, weather.is_day ?? 1) : '';

  const BackgroundLayer = () => {
    if (!autoBgClass) return null;
    return (
      <div className={`absolute inset-0 -z-10 ${autoBgClass}`} />
    );
  };

  // Modelos de Design
  if (model === 'minimal') {
    return (
      <div className="flex flex-col items-center justify-center text-white relative overflow-hidden w-full h-full" style={containerStyle}>
         <BackgroundLayer />
         <span className="font-black leading-none tracking-tighter relative z-10" style={{ fontSize: '6em' }}>{temp}°</span>
         <span className="font-bold uppercase tracking-widest opacity-70 relative z-10" style={{ fontSize: '1.5em' }}>{cityName}</span>
      </div>
    );
  }

  if (model === 'glass') {
    return (
      <div className="w-full h-full flex flex-col justify-between p-[1.5em] text-white bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl overflow-hidden relative" style={containerStyle}>
        <BackgroundLayer />
        {backgroundImage && (
           <div className="absolute inset-0 z-0">
              <img src={backgroundImage} className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40"></div>
           </div>
        )}

        {!backgroundImage && (
          <>
            <div className="absolute top-0 right-0 w-[8em] h-[8em] bg-orange-500/30 rounded-full blur-3xl -mr-[2em] -mt-[2em]"></div>
            <div className="absolute bottom-0 left-0 w-[8em] h-[8em] bg-cyan-500/30 rounded-full blur-3xl -ml-[2em] -mb-[2em]"></div>
          </>
        )}
        
        <div className="relative z-10 flex justify-between items-start">
           <div className="flex flex-col">
             <span className="font-medium opacity-80 uppercase tracking-wider" style={{ fontSize: '0.64em' }}>{capitalizedDay}</span>
             <span className="font-bold" style={{ fontSize: '1.5em' }}>{cityName}</span>
           </div>
           <CloudSun className="text-white drop-shadow-lg" style={{ width: '4.5em', height: '4.5em' }} />
        </div>
        
        <div className="relative z-10 flex flex-col items-start mt-auto">
           <span className="font-black tracking-tighter leading-none" style={{ fontSize: '4.5em' }}>{temp}°</span>
           <span className="font-medium opacity-90 mt-[0.5em] capitalize" style={{ fontSize: '0.8em' }}>{desc}</span>
           <div className="flex gap-[1em] mt-[0.8em] font-mono opacity-70" style={{ fontSize: '0.63em' }}>
              <span className="flex items-center gap-[0.2em]">💧 {humidity}%</span>
              <span className="flex items-center gap-[0.2em]">💨 {wind}km/h</span>
           </div>
        </div>
      </div>
    );
  }

  if (model === 'forecast') {
    return (
      <div className="w-full h-full flex flex-col bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700 p-[1em] text-white shadow-xl relative overflow-hidden" style={containerStyle}>
        <BackgroundLayer />
        {/* Header / Current */}
        <div className="flex items-center justify-between mb-[1em] pb-[1em] border-b border-slate-700/50">
          <div className="flex items-center gap-[0.8em]">
             <CloudSun className="text-yellow-400" style={{ width: '3em', height: '3em' }} />
             <div>
               <div className="font-bold leading-none" style={{ fontSize: '2.5em' }}>{temp}°</div>
               <div className="text-slate-400 uppercase tracking-wider font-bold mt-[0.2em]" style={{ fontSize: '0.7em' }}>{cityName}</div>
             </div>
          </div>
          <div className="text-right">
             <div className="text-slate-400 uppercase" style={{ fontSize: '0.7em' }}>{capitalizedDay}</div>
             <div className="font-medium capitalize text-cyan-400" style={{ fontSize: '0.88em' }}>{desc}</div>
          </div>
        </div>
        
        {/* Forecast List */}
        <div className="flex-1 grid grid-cols-3 gap-[0.5em]">
           {forecast.slice(0, 3).map((day: any, i: number) => (
             <div key={i} className="bg-slate-800/50 rounded-lg p-[0.5em] flex flex-col items-center justify-center text-center">
                <span className="text-slate-400 font-bold uppercase mb-[0.2em]" style={{ fontSize: '0.54em' }}>
                  {new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                </span>
                <CloudSun size={20} className="text-slate-300 mb-1" style={{ width: '1.25em', height: '1.25em' }} />
                <div className="flex gap-1 font-bold" style={{ fontSize: '0.75em' }}>
                   <span className="text-white">{day.max}°</span>
                   <span className="text-slate-500">{day.min}°</span>
                </div>
             </div>
           ))}
        </div>
      </div>
    );
  }

  if (model === 'weekly') {
    return (
      <div className="w-full h-full flex flex-col bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-[1.5em] text-white shadow-2xl relative overflow-hidden" style={containerStyle}>
        <BackgroundLayer />
        {/* Header */}
        <div className="flex items-center justify-between pb-[1em] border-b border-slate-700/50 relative z-10">
          <div className="flex items-center gap-[1em]">
             {getWeatherIcon(code, { className: "text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]", style: { width: '3.5em', height: '3.5em' } })}
             <div>
               <div className="font-black tracking-tighter leading-none" style={{ fontSize: '3em' }}>{temp}°</div>
               <div className="text-slate-400 uppercase tracking-widest font-bold mt-[0.3em]" style={{ fontSize: '0.75em' }}>{cityName}</div>
             </div>
          </div>
          <div className="text-right flex flex-col items-end">
             <div className="text-slate-300 font-bold tracking-wide uppercase" style={{ fontSize: '0.8em' }}>{capitalizedDay}</div>
             <div className="font-medium capitalize text-cyan-400 mt-[0.2em]" style={{ fontSize: '0.9em' }}>{desc}</div>
             <div className="flex gap-[0.8em] mt-[0.5em] font-mono opacity-80" style={{ fontSize: '0.7em' }}>
                <span className="flex items-center gap-[0.2em]">💧 {humidity}%</span>
                <span className="flex items-center gap-[0.2em]">💨 {wind}km/h</span>
             </div>
          </div>
        </div>
        
        {/* Weekly Forecast List */}
        <div className="flex-1 flex flex-col justify-between relative z-10 mt-[1em] overflow-hidden">
           {forecast.slice(0, 7).map((day: any, i: number) => {
             const dateObj = new Date(day.date + 'T12:00:00');
             const isToday = i === 0;
             return (
               <div key={i} className={`flex items-center justify-between py-[0.4em] px-[0.8em] rounded-lg transition-colors ${isToday ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-slate-800/50'}`}>
                  <div className="flex items-center gap-[1em] w-[40%]">
                    <span className={`font-bold uppercase tracking-wider ${isToday ? 'text-cyan-400' : 'text-slate-300'}`} style={{ fontSize: '0.85em' }}>
                      {isToday ? 'Hoje' : dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-center w-[20%]">
                    {getWeatherIcon(day.code, { size: 20, className: isToday ? "text-cyan-400" : "text-slate-400", style: { width: '1.4em', height: '1.4em' } })}
                  </div>
                  
                  <div className="flex items-center justify-end gap-[1em] w-[40%] font-mono font-bold" style={{ fontSize: '0.9em' }}>
                     <span className="text-white w-[2em] text-right">{day.max}°</span>
                     <span className="text-slate-500 w-[2em] text-right">{day.min}°</span>
                  </div>
               </div>
             );
           })}
        </div>
      </div>
    );
  }

  if (model === 'detailed') {
    return (
      <div className="w-full h-full flex flex-col justify-between p-6 text-white bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg relative overflow-hidden" style={{ ...containerStyle, padding: '1.5em' }}>
        <BackgroundLayer />
        <div className="flex justify-between items-start">
           <div>
             <p className="font-bold uppercase tracking-widest text-cyan-400" style={{ fontSize: '1.25em' }}>{capitalizedDay}</p>
             <p className="text-white/60 font-mono" style={{ fontSize: '0.875em' }}>{cityName}</p>
           </div>
           <CloudSun className="text-orange-400" style={{ width: '3em', height: '3em' }} />
        </div>
        
        <div className="flex items-end gap-4">
           <span className="font-black leading-none" style={{ fontSize: '4.5em' }}>{temp}°</span>
           <div className="flex flex-col pb-2">
             <span className="font-bold uppercase" style={{ fontSize: '1.125em' }}>{desc}</span>
             <div className="flex gap-3 text-white/50 font-mono mt-1" style={{ fontSize: '0.75em' }}>
               <span>💧 {humidity}%</span>
               <span>💨 {wind} km/h</span>
             </div>
           </div>
        </div>
      </div>
    );
  }

  if (model === 'windows') {
    return (
      <div className="w-full h-full flex flex-col bg-slate-950/60 backdrop-blur-xl text-white p-6 rounded-xl shadow-2xl relative overflow-hidden font-sans" style={containerStyle}>
        <BackgroundLayer />
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors cursor-pointer">
            <Home size={18} />
            <span className="font-semibold text-lg">{cityName}</span>
            <ChevronRight size={16} className="rotate-90" />
          </div>
          <MoreHorizontal size={20} className="text-slate-400 hover:text-white cursor-pointer" />
        </div>

        {/* Current Weather */}
        <div className="flex items-center gap-6 mb-8 relative z-10">
          <CloudSun className="text-yellow-400 drop-shadow-lg" size={64} />
          <div>
            <div className="text-6xl font-light tracking-tighter">{temp}°C</div>
            <div className="text-slate-300 text-sm mt-1 flex items-center gap-1">
              {desc}
              <ChevronRight size={14} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-slate-700/50 mb-4 relative z-10">
          <button className={`pb-2 text-sm font-medium transition-colors ${activeWindowsView === 'hourly' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'}`}>De hora em hora</button>
          <button className={`pb-2 text-sm font-medium transition-colors ${activeWindowsView === 'daily' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'}`}>Diariamente</button>
          <button className={`pb-2 text-sm font-medium transition-colors ${activeWindowsView === 'precipitation' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'}`}>Precipitação</button>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0 relative z-10 w-full mt-4">
          {activeWindowsView === 'precipitation' && (weather as any).hourly && (weather as any).hourly.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={(weather as any).hourly.slice(0, 12)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={(time) => new Date(time).getHours() + 'h'} 
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val} mm`}
                  domain={[0, (dataMax: number) => Math.max(dataMax || 0, 4)]}
                  dx={-10}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}%`}
                  domain={[0, 100]}
                  dx={10}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', padding: '12px' }}
                  itemStyle={{ color: '#38bdf8', fontSize: '14px' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '14px' }}
                  labelFormatter={(label) => new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  formatter={(value: number, name: string) => [name === 'Precipitação' ? `${value} mm` : `${value}%`, name]}
                />
                <Bar yAxisId="left" dataKey="precip" name="Precipitação" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={24} />
                <Line yAxisId="right" type="monotone" dataKey="prob" name="Probabilidade" stroke="#38bdf8" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#0f172a', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {activeWindowsView === 'hourly' && (weather as any).hourly && (weather as any).hourly.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={(weather as any).hourly.slice(0, 12)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={(time) => new Date(time).getHours() + 'h'} 
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}°`}
                  dx={-10}
                  domain={['auto', 'auto']}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}%`}
                  domain={[0, 100]}
                  dx={10}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', padding: '12px' }}
                  itemStyle={{ color: '#f59e0b', fontSize: '14px' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '14px' }}
                  labelFormatter={(label) => new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  formatter={(value: number, name: string) => [name === 'Probabilidade' ? `${value}%` : `${value}°C`, name]}
                />
                <Line yAxisId="left" type="monotone" dataKey="temp" name="Temperatura" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#0f172a', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#f59e0b', stroke: '#0f172a', strokeWidth: 2 }} />
                <Line yAxisId="right" type="monotone" dataKey="prob" name="Probabilidade" stroke="#38bdf8" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#0f172a', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {activeWindowsView === 'daily' && (weather as any).forecast && (weather as any).forecast.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={(weather as any).forecast.slice(0, 7)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' })} 
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}°`}
                  dx={-10}
                  domain={['auto', 'auto']}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', padding: '12px' }}
                  itemStyle={{ color: '#f87171', fontSize: '14px' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '14px' }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
                  formatter={(value: number, name: string) => [`${value}°C`, name === 'max' ? 'Máxima' : 'Mínima']}
                />
                <Line type="monotone" dataKey="max" name="Máxima" stroke="#f87171" strokeWidth={3} dot={{ r: 4, fill: '#0f172a', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#f87171', stroke: '#0f172a', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="min" name="Mínima" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4, fill: '#0f172a', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#60a5fa', stroke: '#0f172a', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {!((weather as any).hourly && (weather as any).hourly.length > 0) && !((weather as any).forecast && (weather as any).forecast.length > 0) && (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Sem dados disponíveis
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex justify-center relative z-10">
          <button className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white px-4 py-2 rounded-full text-sm font-medium transition-colors border border-slate-700/50 backdrop-blur-sm">
            Ver a previsão completa
          </button>
        </div>
      </div>
    );
  }

  // Default / Simple
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-white gap-[0.5em] drop-shadow-xl relative overflow-hidden" style={containerStyle}>
      <BackgroundLayer />
      <CloudSun className="text-orange-400 relative z-10" style={{ width: '4em', height: '4em' }} />
      <div className="text-center relative z-10">
        <span className="font-black" style={{ fontSize: '3.75em' }}>{temp}°C</span>
        <p className="font-bold uppercase tracking-widest text-white/70" style={{ fontSize: '1.125em' }}>{desc}</p>
        <p className="font-black text-cyan-400 uppercase tracking-widest mt-[0.5em]" style={{ fontSize: '1.25em' }}>{capitalizedDay}</p>
        <p className="text-white/50 font-mono mt-[0.25em]" style={{ fontSize: '0.75em' }}>{cityName}</p>
      </div>
    </div>
  );
};

export const FullInfoWidget: React.FC<{
  city: string;
  backgroundImage?: string;
  backgroundAnimation?: string;
  model?: string;
  textSize?: number;
  numberSize?: number;
  transparentBackground?: boolean;
  backgroundColor?: string;
}> = ({ city, backgroundImage, backgroundAnimation, model = 'standard', textSize = 100, numberSize = 100, transparentBackground = false, backgroundColor }) => {
  const [weather, setWeather] = useState<any>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const cleanCity = city.split(',')[0].split('-')[0].split('/')[0].trim();
        if (!cleanCity) return;
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&language=pt&format=json`);
        if (!geoRes.ok) return;
        const geoData = await geoRes.json();
        
        if (geoData.results && geoData.results.length > 0) {
          const { latitude, longitude, name } = geoData.results[0];
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
          if (!weatherRes.ok) return;
          const weatherData = await weatherRes.json();
          
          setWeather({
            temp: Math.round(weatherData.current_weather.temperature),
            code: weatherData.current_weather.weathercode,
            isDay: weatherData.current_weather.is_day,
            name: name,
            forecast: weatherData.daily.time.slice(1, 4).map((timeStr: string, index: number) => ({
              date: timeStr,
              max: Math.round(weatherData.daily.temperature_2m_max[index + 1]),
              min: Math.round(weatherData.daily.temperature_2m_min[index + 1]),
              code: weatherData.daily.weathercode[index + 1]
            }))
          });
        }
      } catch (error) {
        console.error("Erro ao buscar clima", error);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 300000);
    return () => clearInterval(interval);
  }, [city]);

  const getWeatherIcon = (code: number, size: number = 24) => {
    if (code <= 1) return <Sun size={size} className="text-yellow-400" />;
    if (code <= 48) return <Cloud size={size} className="text-slate-300" />;
    if (code >= 51 && code <= 67) return <CloudRain size={size} className="text-blue-400" />;
    if (code >= 71 && code <= 77) return <Snowflake size={size} className="text-white" />;
    if (code >= 80 && code <= 82) return <CloudRain size={size} className="text-blue-400" />;
    if (code >= 85 && code <= 86) return <Snowflake size={size} className="text-white" />;
    if (code >= 95) return <CloudLightning size={size} className="text-yellow-300" />;
    return <CloudSun size={size} className="text-slate-300" />;
  };

  const BackgroundLayer = () => {
    if (transparentBackground) return null;
    
    if (backgroundImage) {
      return (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        </div>
      );
    }
    if (backgroundAnimation && backgroundAnimation !== 'none') {
      let animClass = '';
      if (backgroundAnimation === 'auto-weather' && weather) {
        animClass = getWeatherAnimationClass(weather.code, weather.isDay);
      } else {
        switch (backgroundAnimation) {
          case 'gradient-flow': animClass = 'bg-anim-gradient-flow'; break;
          case 'clouds': animClass = 'bg-anim-clouds'; break;
          case 'rain': animClass = 'bg-anim-rain'; break;
          case 'snow': animClass = 'bg-anim-snow'; break;
          case 'fire': animClass = 'bg-anim-fire'; break;
          case 'tech-grid': animClass = 'bg-anim-tech-grid'; break;
          case 'pulse-red': animClass = 'bg-anim-pulse-red'; break;
          case 'pulse-blue': animClass = 'bg-anim-pulse-blue'; break;
          case 'pulse-green': animClass = 'bg-anim-pulse-green'; break;
          case 'aurora': animClass = 'bg-anim-aurora'; break;
          default: animClass = 'bg-slate-900';
        }
      }
      return <div className={`absolute inset-0 z-0 ${animClass}`} />;
    }
    return <div className="absolute inset-0 z-0 bg-slate-900" />;
  };

  const formattedTime = time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formattedDate = time.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const formattedDay = time.toLocaleDateString('pt-BR', { weekday: 'long' });

  if (model === 'minimal') {
    return (
      <div className={`w-full h-full relative overflow-hidden flex flex-col p-8 md:p-16 text-white ${transparentBackground ? 'bg-transparent' : 'bg-slate-900'}`}>
        <BackgroundLayer />
        <div className="relative z-10 flex flex-col h-full justify-center items-center text-center">
          <div className="mb-8">
            <h1 className="font-light tracking-tighter drop-shadow-lg leading-none" style={{ fontSize: `calc(15cqw * ${numberSize / 100})` }}>{formattedTime}</h1>
            <p className="font-medium text-white/80 uppercase tracking-widest mt-4 drop-shadow-md" style={{ fontSize: `calc(3cqw * ${textSize / 100})` }}>{formattedDay}, {formattedDate}</p>
          </div>
          {weather && (
            <div className="flex flex-col items-center gap-4 mt-8">
              <div className="flex items-center gap-6">
                {getWeatherIcon(weather.code, 80 * (numberSize / 100))}
                <div className="font-light tracking-tighter drop-shadow-lg" style={{ fontSize: `calc(8cqw * ${numberSize / 100})` }}>{weather.temp}°</div>
              </div>
              <div className="text-white/70 tracking-widest uppercase drop-shadow-md" style={{ fontSize: `calc(3cqw * ${textSize / 100})` }}>{weather.name}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (model === 'glass') {
    return (
      <div className={`w-full h-full relative overflow-hidden flex flex-col p-8 md:p-12 text-white ${transparentBackground ? 'bg-transparent' : 'bg-slate-900'}`}>
        <BackgroundLayer />
        <div className="relative z-10 flex h-full items-center justify-between gap-8">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-10 border border-white/20 shadow-2xl flex-1 h-full flex flex-col justify-center">
            <h1 className="font-bold tracking-tighter drop-shadow-xl leading-none" style={{ fontSize: `calc(12cqw * ${numberSize / 100})` }}>{formattedTime}</h1>
            <p className="font-medium text-white/90 capitalize mt-4 drop-shadow-md" style={{ fontSize: `calc(3.5cqw * ${textSize / 100})` }}>{formattedDay}</p>
            <p className="text-white/70 drop-shadow-md" style={{ fontSize: `calc(2.5cqw * ${textSize / 100})` }}>{formattedDate}</p>
          </div>

          {weather && (
            <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-10 border border-white/20 shadow-2xl flex-1 h-full flex flex-col justify-between items-end text-right">
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="font-bold tracking-tighter drop-shadow-xl leading-none" style={{ fontSize: `calc(8cqw * ${numberSize / 100})` }}>{weather.temp}°</div>
                  <div className="text-white/90 font-medium mt-2 drop-shadow-md" style={{ fontSize: `calc(2.5cqw * ${textSize / 100})` }}>{weather.name}</div>
                </div>
                {getWeatherIcon(weather.code, 96 * (numberSize / 100))}
              </div>
              <div className="flex gap-6 mt-8 pt-8 border-t border-white/20 w-full justify-end">
                {weather.forecast?.map((day: any, i: number) => (
                  <div key={i} className="flex flex-col items-center">
                    <span className="text-white/80 uppercase font-bold mb-2 drop-shadow-md" style={{ fontSize: `calc(2cqw * ${textSize / 100})` }}>
                      {new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </span>
                    {getWeatherIcon(day.code, 32 * (numberSize / 100))}
                    <div className="flex gap-3 mt-2 font-bold drop-shadow-md" style={{ fontSize: `calc(2cqw * ${numberSize / 100})` }}>
                      <span className="text-white">{day.max}°</span>
                      <span className="text-white/50">{day.min}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (model === 'modern') {
    const hasCustomBg = !transparentBackground && (backgroundImage || (backgroundAnimation && backgroundAnimation !== 'none'));
    const customBgColor = !transparentBackground && backgroundColor ? backgroundColor : undefined;
    const isDarkTheme = transparentBackground || hasCustomBg || customBgColor;

    return (
      <div 
        className={`w-full h-full relative overflow-hidden flex ${transparentBackground ? 'bg-transparent text-white' : hasCustomBg || customBgColor ? 'text-white rounded-3xl shadow-2xl border border-white/20' : 'bg-slate-50 text-slate-800 rounded-3xl shadow-2xl border border-slate-200/50'}`}
        style={customBgColor ? { backgroundColor: customBgColor } : {}}
      >
        {hasCustomBg && <BackgroundLayer />}
        
        {/* Left Panel - Blue Gradient */}
        <div className={`w-1/3 h-full flex flex-col justify-between p-8 md:p-12 ${isDarkTheme ? 'bg-black/40 backdrop-blur-md border-r border-white/10' : 'bg-gradient-to-br from-blue-500 to-blue-600'} text-white relative overflow-hidden z-10`}>
          {/* Decorative circles */}
          {!isDarkTheme && (
            <>
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-blue-400/20 blur-2xl"></div>
            </>
          )}
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Map size={16} className={isDarkTheme ? "text-white/70" : "text-blue-200"} />
              <span className="font-medium text-white" style={{ fontSize: `calc(2cqw * ${textSize / 100})` }}>{weather?.name || city}</span>
            </div>
            <div className={isDarkTheme ? "text-white/70" : "text-blue-100"} style={{ fontSize: `calc(1.5cqw * ${textSize / 100})` }}>
              {formattedDay}, {formattedDate}
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center flex-1 my-8">
            {weather ? (
              <>
                <div className="drop-shadow-xl mb-4">
                  {getWeatherIcon(weather.code, 120 * (numberSize / 100))}
                </div>
                <div className="font-bold tracking-tighter leading-none" style={{ fontSize: `calc(10cqw * ${numberSize / 100})` }}>
                  {weather.temp}°<span className={`font-medium ${isDarkTheme ? 'text-white/70' : 'text-blue-200'}`} style={{ fontSize: `calc(5cqw * ${numberSize / 100})` }}>C</span>
                </div>
              </>
            ) : (
              <Loader2 className="animate-spin text-white/50" size={48} />
            )}
          </div>

          <div className="relative z-10 flex flex-col gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex justify-between items-center border border-white/10">
              <span className={isDarkTheme ? "text-white/70" : "text-blue-100"} style={{ fontSize: `calc(1.5cqw * ${textSize / 100})` }}>Precipitação</span>
              <span className="font-bold" style={{ fontSize: `calc(1.5cqw * ${numberSize / 100})` }}>11%</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex justify-between items-center border border-white/10">
              <span className={isDarkTheme ? "text-white/70" : "text-blue-100"} style={{ fontSize: `calc(1.5cqw * ${textSize / 100})` }}>Umidade</span>
              <span className="font-bold" style={{ fontSize: `calc(1.5cqw * ${numberSize / 100})` }}>77%</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex justify-between items-center border border-white/10">
              <span className={isDarkTheme ? "text-white/70" : "text-blue-100"} style={{ fontSize: `calc(1.5cqw * ${textSize / 100})` }}>Vento</span>
              <span className="font-bold" style={{ fontSize: `calc(1.5cqw * ${numberSize / 100})` }}>6 km/h</span>
            </div>
          </div>
        </div>

        {/* Right Panel - White */}
        <div className={`w-2/3 h-full flex flex-col p-8 md:p-12 ${isDarkTheme ? 'bg-black/20 backdrop-blur-sm' : 'bg-slate-50'} relative z-10`}>
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className={`font-bold leading-tight ${isDarkTheme ? 'text-white' : 'text-slate-800'}`} style={{ fontSize: `calc(3.5cqw * ${textSize / 100})` }}>
                {time.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h2>
              <p className={`mt-1 ${isDarkTheme ? 'text-white/60' : 'text-slate-500'}`} style={{ fontSize: `calc(1.8cqw * ${textSize / 100})` }}>
                {formattedDay}, {formattedDate}
              </p>
            </div>
          </div>

          <div className="flex gap-4 mb-8">
            <button className={`font-medium border-b-2 pb-2 px-2 ${isDarkTheme ? 'text-white border-white' : 'text-slate-800 border-slate-800'}`} style={{ fontSize: `calc(1.8cqw * ${textSize / 100})` }}>Hoje</button>
            <button className={`font-medium pb-2 px-2 ${isDarkTheme ? 'text-white/50' : 'text-slate-400'}`} style={{ fontSize: `calc(1.8cqw * ${textSize / 100})` }}>Amanhã</button>
            <button className={`font-medium rounded-full px-6 py-2 ml-auto shadow-md ${isDarkTheme ? 'bg-white/20 text-white' : 'bg-slate-800 text-white'}`} style={{ fontSize: `calc(1.8cqw * ${textSize / 100})` }}>Próximos 7 dias</button>
          </div>

          {weather && weather.forecast && (
            <div className="flex justify-between gap-4 mb-12">
              {weather.forecast.map((day: any, i: number) => (
                <div key={i} className={`flex-1 flex flex-col items-center p-6 rounded-3xl ${isDarkTheme ? (i === 0 ? 'bg-white/20 border-white/20' : 'bg-white/5 border-white/10') : (i === 0 ? 'bg-blue-50 border-blue-100 shadow-sm' : 'bg-white border-slate-100 shadow-sm')} border`}>
                  <span className={`font-medium mb-4 ${isDarkTheme ? 'text-white/80' : 'text-slate-600'}`} style={{ fontSize: `calc(1.8cqw * ${textSize / 100})` }}>
                    {new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </span>
                  <div className="mb-4">
                    {getWeatherIcon(day.code, 48 * (numberSize / 100))}
                  </div>
                  <div className={`font-bold ${isDarkTheme ? 'text-white' : 'text-slate-800'}`} style={{ fontSize: `calc(2.5cqw * ${numberSize / 100})` }}>
                    {day.max}°
                  </div>
                </div>
              ))}
              {/* Add a couple of mock days to fill the space if we only have 3 */}
              {[1, 2].map((_, i) => (
                <div key={`mock-${i}`} className={`flex-1 flex flex-col items-center p-6 rounded-3xl border opacity-50 ${isDarkTheme ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm'}`}>
                   <span className={`font-medium mb-4 ${isDarkTheme ? 'text-white/80' : 'text-slate-600'}`} style={{ fontSize: `calc(1.8cqw * ${textSize / 100})` }}>
                    {new Date(time.getTime() + (i + 4) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </span>
                  <div className="mb-4">
                    <CloudSun size={48 * (numberSize / 100)} className={isDarkTheme ? 'text-white/50' : 'text-slate-300'} />
                  </div>
                  <div className={`font-bold ${isDarkTheme ? 'text-white' : 'text-slate-800'}`} style={{ fontSize: `calc(2.5cqw * ${numberSize / 100})` }}>
                    --°
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className={`font-bold ${isDarkTheme ? 'text-white/90' : 'text-slate-700'}`} style={{ fontSize: `calc(2cqw * ${textSize / 100})` }}>Outras cidades</h3>
              <button className={`${isDarkTheme ? 'text-white/50 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`} style={{ fontSize: `calc(1.5cqw * ${textSize / 100})` }}>→</button>
            </div>
            <div className="flex gap-6">
              <div className={`flex-1 p-6 rounded-3xl border shadow-sm flex items-center justify-between ${isDarkTheme ? 'bg-white/10 border-white/10' : 'bg-white border-slate-100'}`}>
                <div>
                  <div className={`font-bold ${isDarkTheme ? 'text-white' : 'text-slate-800'}`} style={{ fontSize: `calc(1.8cqw * ${textSize / 100})` }}>São Paulo</div>
                  <div className={`mt-1 ${isDarkTheme ? 'text-white/60' : 'text-slate-500'}`} style={{ fontSize: `calc(1.5cqw * ${textSize / 100})` }}>Ensolarado</div>
                </div>
                <div className="flex items-center gap-4">
                  <Sun size={40 * (numberSize / 100)} className="text-yellow-400" />
                  <span className={`font-bold ${isDarkTheme ? 'text-white' : 'text-slate-800'}`} style={{ fontSize: `calc(3cqw * ${numberSize / 100})` }}>28°</span>
                </div>
              </div>
              <div className={`flex-1 p-6 rounded-3xl border shadow-sm flex items-center justify-between ${isDarkTheme ? 'bg-white/10 border-white/10' : 'bg-white border-slate-100'}`}>
                <div>
                  <div className={`font-bold ${isDarkTheme ? 'text-white' : 'text-slate-800'}`} style={{ fontSize: `calc(1.8cqw * ${textSize / 100})` }}>Rio de Janeiro</div>
                  <div className={`mt-1 ${isDarkTheme ? 'text-white/60' : 'text-slate-500'}`} style={{ fontSize: `calc(1.5cqw * ${textSize / 100})` }}>Parcialmente Nublado</div>
                </div>
                <div className="flex items-center gap-4">
                  <CloudSun size={40 * (numberSize / 100)} className={isDarkTheme ? 'text-white/50' : 'text-slate-400'} />
                  <span className={`font-bold ${isDarkTheme ? 'text-white' : 'text-slate-800'}`} style={{ fontSize: `calc(3cqw * ${numberSize / 100})` }}>32°</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard model
  return (
    <div className={`w-full h-full relative overflow-hidden flex flex-col p-8 md:p-12 text-white ${transparentBackground ? 'bg-transparent' : 'bg-slate-900'}`}>
      <BackgroundLayer />
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex flex-col">
          <h1 className="font-black tracking-tighter drop-shadow-2xl leading-none" style={{ fontSize: `calc(12cqw * ${numberSize / 100})` }}>{formattedTime}</h1>
          <p className="font-light text-white/90 capitalize mt-4 drop-shadow-lg" style={{ fontSize: `calc(4cqw * ${textSize / 100})` }}>{formattedDay}</p>
          <p className="text-white/70 drop-shadow-md mt-1" style={{ fontSize: `calc(2.5cqw * ${textSize / 100})` }}>{formattedDate}</p>
        </div>

        <div className="flex flex-col gap-6 self-end text-right items-end">
          {weather ? (
            <>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="font-bold tracking-tighter drop-shadow-2xl leading-none" style={{ fontSize: `calc(9cqw * ${numberSize / 100})` }}>
                    {weather.temp}°
                  </div>
                  <div className="text-white/80 font-medium mt-2 drop-shadow-lg" style={{ fontSize: `calc(3cqw * ${textSize / 100})` }}>
                    {weather.name}
                  </div>
                </div>
                {getWeatherIcon(weather.code, 96 * (numberSize / 100))}
              </div>

              <div className="flex gap-4 mt-6 pt-6 border-t border-white/20 w-full justify-end">
                {weather.forecast?.map((day: any, i: number) => (
                  <div key={i} className="flex flex-col items-center bg-black/30 rounded-2xl p-4 backdrop-blur-lg border border-white/10">
                    <span className="text-white/80 uppercase font-bold mb-2 drop-shadow-md" style={{ fontSize: `calc(2cqw * ${textSize / 100})` }}>
                      {new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </span>
                    {getWeatherIcon(day.code, 32 * (numberSize / 100))}
                    <div className="flex gap-3 mt-3 font-bold drop-shadow-md" style={{ fontSize: `calc(2cqw * ${numberSize / 100})` }}>
                      <span className="text-white">{day.max}°</span>
                      <span className="text-white/50">{day.min}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 text-white/60">
              <Loader2 className="animate-spin" size={32} />
              <span style={{ fontSize: `calc(2cqw * ${textSize / 100})` }}>Carregando clima...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 1. NOTES WIDGET
// ==========================================
export const NotesWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.notesConfig || {};
  const theme = config.paperTheme || 'glass';
  const text = data.content || 'Sua nota aqui...';

  const getThemeClass = () => {
    switch (theme) {
      case 'yellow-sticky':
        return 'bg-gradient-to-br from-amber-100 to-yellow-200 text-slate-800 border-l-4 border-yellow-400 rotate-[-1deg] shadow-lg';
      case 'purple-haze':
        return 'bg-gradient-to-br from-purple-950/70 via-indigo-900/60 to-purple-900/70 text-purple-100 border border-purple-500/30 backdrop-blur-md shadow-2xl';
      case 'neon-glow':
        return 'bg-slate-950 text-[#ea580c] border border-[#ea580c]/70 shadow-[0_0_20px_rgba(124,58,237,0.4)] font-mono';
      case 'glass':
      default:
        return 'bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-2xl';
    }
  };

  const getFontFamily = () => {
    switch (config.fontFamily) {
      case 'serif': return 'font-serif';
      case 'mono': return 'font-mono';
      case 'display': return 'font-black tracking-tight';
      default: return 'font-sans';
    }
  };

  return (
    <div className={`w-full h-full p-6 flex flex-col justify-start rounded-2xl overflow-y-auto ${getThemeClass()}`}>
      <div className="flex items-center gap-2 mb-3 shrink-0 opacity-80 border-b border-white/10 pb-2">
        <StickyNote size={18} className="text-cyan-400 animate-pulse" />
        <span className="text-xs uppercase tracking-widest font-bold">Nota / Recado</span>
      </div>
      <div 
        className={`flex-1 overflow-y-auto whitespace-pre-wrap leading-relaxed ${getFontFamily()}`}
        style={{
          fontSize: config.fontSize || '1.1rem',
          color: config.textColor || undefined
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ==========================================
// 2. TODO WIDGET
// ==========================================
export const TodoWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.todoConfig || { items: [] };
  const items = config.items || [];
  const title = config.title || 'Lista de Tarefas';

  const total = items.length;
  const doneCount = items.filter((i: any) => i.done).length;
  const progressPercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="w-full h-full p-6 bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col justify-between text-white overflow-hidden shadow-2xl">
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ListTodo size={20} className="text-[#ea580c]" />
            <h3 className="font-extrabold tracking-tight text-lg">{title}</h3>
          </div>
          <span className="text-xs font-mono bg-[#ea580c]/20 text-[#ea580c] px-2 py-0.5 rounded-full font-bold">
            {doneCount}/{total}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-4 relative">
          <motion.div 
            className="h-full bg-gradient-to-r from-[#ea580c] to-[#A855F7] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
            Nenhuma tarefa pendente.
          </div>
        ) : (
          items.map((item: any) => (
            <div 
              key={item.id} 
              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 ${
                item.done 
                  ? 'bg-slate-900/30 border-slate-800/40 text-slate-500 line-through' 
                  : 'bg-white/5 border-white/5 text-slate-200 hover:bg-white/10'
              }`}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-all duration-300 ${
                item.done 
                  ? 'bg-[#ea580c]/20 border-[#ea580c]/50 text-[#ea580c]' 
                  : 'border-slate-500'
              }`}>
                {item.done && <CheckSquare size={14} className="stroke-[3]" />}
              </div>
              <span className="text-sm font-medium truncate flex-1">{item.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. COUNTDOWN WIDGET
// ==========================================
export const CountdownWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.countdownConfig || { targetDate: '' };
  const targetDateStr = config.targetDate;
  const title = config.title || 'Contagem Regressiva';
  const expiredMsg = config.expiredMessage || 'Tempo Esgotado!';
  const theme = config.theme || 'glass';

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });

  useEffect(() => {
    if (!targetDateStr) return;

    const interval = setInterval(() => {
      const difference = +new Date(targetDateStr) - +new Date();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        clearInterval(interval);
      } else {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
          expired: false
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDateStr]);

  const getThemeClass = () => {
    switch (theme) {
      case 'neon':
        return 'bg-black border border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)] text-rose-500 font-mono';
      case 'bold-gradient':
        return 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 border border-white/20 text-white shadow-2xl';
      case 'minimal':
        return 'bg-transparent text-white border border-white/5';
      case 'glass':
      default:
        return 'bg-white/5 backdrop-blur-xl border border-white/10 text-white shadow-2xl';
    }
  };

  if (timeLeft.expired) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center p-6 rounded-2xl text-center ${getThemeClass()}`}>
        <Hourglass size={36} className="text-[#ea580c] mb-3 animate-spin" />
        <h4 className="text-2xl font-black uppercase tracking-wider animate-pulse">{expiredMsg}</h4>
      </div>
    );
  }

  const Segment: React.FC<{ value: number, label: string }> = ({ value, label }) => (
    <div className="flex flex-col items-center bg-black/40 rounded-xl px-4 py-3 border border-white/5 min-w-[70px]">
      <span className="text-3xl font-black tracking-tight tabular-nums">{value.toString().padStart(2, '0')}</span>
      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">{label}</span>
    </div>
  );

  return (
    <div className={`w-full h-full p-6 rounded-2xl flex flex-col justify-between ${getThemeClass()}`}>
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <Hourglass size={18} className="text-[#ea580c] animate-pulse" />
        <h3 className="text-sm font-black uppercase tracking-widest">{title}</h3>
      </div>
      <div className="flex justify-around items-center gap-2 flex-1 my-2">
        <Segment value={timeLeft.days} label="Dias" />
        <span className="text-2xl font-bold text-white/50 animate-pulse">:</span>
        <Segment value={timeLeft.hours} label="Horas" />
        <span className="text-2xl font-bold text-white/50 animate-pulse">:</span>
        <Segment value={timeLeft.minutes} label="Minutos" />
        <span className="text-2xl font-bold text-white/50 animate-pulse">:</span>
        <Segment value={timeLeft.seconds} label="Segundos" />
      </div>
    </div>
  );
};

// ==========================================
// 4. CHORES WIDGET
// ==========================================
export const ChoresWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.choresConfig || { items: [] };
  const items = config.items || [];
  const title = config.title || 'Quadro de Deveres';

  // Gerador de HSL dinâmico para os badges
  const getAssigneeColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsla(${h}, 70%, 50%, 0.25)`;
  };

  return (
    <div className="w-full h-full p-6 bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col justify-between text-white overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <ClipboardList size={20} className="text-[#ea580c]" />
        <h3 className="font-extrabold tracking-tight text-lg">{title}</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
            Nenhuma tarefa cadastrada.
          </div>
        ) : (
          items.map((item: any) => (
            <div 
              key={item.id} 
              className={`flex items-center justify-between p-3 rounded-xl border bg-white/5 border-white/5 transition-all duration-300 ${item.done ? 'opacity-50' : 'hover:bg-white/10'}`}
            >
              <div className="flex flex-col min-w-0 flex-1 mr-2">
                <span className={`text-sm font-bold truncate ${item.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                  {item.chore}
                </span>
                {item.day && (
                  <span className="text-[10px] font-mono text-[#ea580c] mt-0.5 uppercase tracking-wider">{item.day}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span 
                  className="text-xs px-2.5 py-1 rounded-full font-black border border-white/10 uppercase tracking-widest"
                  style={{ backgroundColor: getAssigneeColor(item.assignee), color: '#ffffff' }}
                >
                  {item.assignee}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ==========================================
// 5. MEAL PLAN WIDGET
// ==========================================
export const MealPlanWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.mealPlanConfig || { days: {} };
  const title = config.title || 'Cardápio Semanal';
  const days = config.days || {};
  const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  return (
    <div className="w-full h-full p-6 bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col justify-between text-white overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Utensils size={20} className="text-amber-400" />
        <h3 className="font-extrabold tracking-tight text-lg">{title}</h3>
      </div>

      <div className="flex-1 overflow-x-auto flex gap-4 pb-2 pr-1 custom-scrollbar items-stretch">
        {dayNames.map(day => {
          const meal = days[day] || {};
          const hasMeals = meal.breakfast || meal.lunch || meal.dinner || meal.snacks;

          return (
            <div key={day} className="flex-1 min-w-[200px] bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col justify-between transition-all duration-300 hover:bg-white/10">
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-widest border-b border-white/10 pb-1.5 mb-2">{day}</h4>
              
              {hasMeals ? (
                <div className="space-y-2 flex-1 flex flex-col justify-around">
                  {meal.breakfast && (
                    <div className="text-[11px] leading-tight">
                      <span className="font-bold text-slate-400 uppercase tracking-widest block text-[9px] mb-0.5">Café</span>
                      <p className="truncate font-semibold text-slate-200">{meal.breakfast}</p>
                    </div>
                  )}
                  {meal.lunch && (
                    <div className="text-[11px] leading-tight">
                      <span className="font-bold text-slate-400 uppercase tracking-widest block text-[9px] mb-0.5">Almoço</span>
                      <p className="truncate font-semibold text-slate-200">{meal.lunch}</p>
                    </div>
                  )}
                  {meal.dinner && (
                    <div className="text-[11px] leading-tight">
                      <span className="font-bold text-slate-400 uppercase tracking-widest block text-[9px] mb-0.5">Jantar</span>
                      <p className="truncate font-semibold text-slate-200">{meal.dinner}</p>
                    </div>
                  )}
                  {meal.snacks && (
                    <div className="text-[11px] leading-tight">
                      <span className="font-bold text-slate-400 uppercase tracking-widest block text-[9px] mb-0.5">Lanche</span>
                      <p className="truncate font-semibold text-slate-200">{meal.snacks}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[11px] text-slate-500 italic">
                  Sem refeições.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// 6. MARKET WATCH WIDGET
// ==========================================
export const MarketWatchWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.marketWatchConfig || { symbols: [] };
  const symbols = config.symbols && config.symbols.length > 0 ? config.symbols : ['AAPL', 'BTC-USD', 'EUR-USD', 'TSLA'];
  const title = config.title || 'Mercado Financeiro';
  
  // Simulador financeiro altamente estético com flutuação a cada 2s
  const [marketData, setMarketData] = useState<{[sym: string]: { price: number, pct: number, isUp: boolean, history: { value: number }[] }}>({});

  useEffect(() => {
    // Inicialização mock de dados realistas
    const initData: any = {};
    symbols.forEach((sym: string) => {
      let basePrice = 150;
      if (sym.includes('BTC')) basePrice = 64500;
      else if (sym.includes('ETH')) basePrice = 3100;
      else if (sym.includes('EUR')) basePrice = 1.08;
      else if (sym.includes('TSLA')) basePrice = 175;
      else if (sym.includes('NVDA')) basePrice = 900;
      else if (sym.includes('PETR4')) basePrice = 36.5;

      const history = Array.from({ length: 10 }, () => ({
        value: basePrice * (1 + (Math.random() - 0.5) * 0.02)
      }));

      initData[sym] = {
        price: basePrice,
        pct: (Math.random() - 0.4) * 3, // leve bias positivo
        isUp: true,
        history
      };
      initData[sym].isUp = initData[sym].pct >= 0;
    });
    setMarketData(initData);

    const interval = setInterval(() => {
      setMarketData(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(sym => {
          const item = next[sym];
          if (!item) return;
          const fluctuation = (Math.random() - 0.48) * 0.004; // leve viés de subida
          const newPrice = item.price * (1 + fluctuation);
          const newPct = item.pct + fluctuation * 100;
          const newHistory = [...item.history.slice(1), { value: newPrice }];
          next[sym] = {
            price: Number(newPrice.toFixed(sym.includes('EUR') ? 4 : 2)),
            pct: Number(newPct.toFixed(2)),
            isUp: newPct >= 0,
            history: newHistory
          };
        });
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [JSON.stringify(symbols)]);

  return (
    <div className="w-full h-full p-6 bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col justify-between text-white overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 mb-3 shrink-0 border-b border-white/5 pb-2">
        <TrendingUp size={20} className="text-emerald-400" />
        <h3 className="font-extrabold tracking-tight text-lg">{title}</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {symbols.map((sym: string) => {
          const item = marketData[sym];
          if (!item) return null;

          return (
            <div key={sym} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all duration-300">
              <div className="w-1/4">
                <span className="font-black text-sm uppercase tracking-wider block">{sym}</span>
                <span className="text-[10px] text-slate-500 font-mono">Bolsa / Realtime</span>
              </div>
              
              {/* Sparkline Chart */}
              <div className="w-1/3 h-8 flex items-center overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={item.history}>
                    <defs>
                      <linearGradient id={`grad-${sym}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={item.isUp ? "#10b981" : "#ef4444"} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={item.isUp ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke={item.isUp ? "#10b981" : "#ef4444"} strokeWidth={1.5} fillOpacity={1} fill={`url(#grad-${sym})`} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="text-right flex flex-col items-end">
                <span className="font-mono font-black text-sm tabular-nums">
                  {sym.includes('EUR') ? '€' : '$'} {item.price.toLocaleString('pt-BR', { minimumFractionDigits: sym.includes('EUR') ? 4 : 2 })}
                </span>
                <span className={`text-xs font-black font-mono flex items-center gap-0.5 mt-0.5 tabular-nums ${item.isUp ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {item.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {item.isUp ? '+' : ''}{item.pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// 7. BROWSER SNAPSHOT WIDGET
// ==========================================
export const BrowserSnapshotWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.browserSnapshotConfig || { url: '' };
  const rawUrl = config.url || 'https://google.com';
  
  // Sanitizar URL
  const getCleanUrl = (u: string) => {
    if (!/^https?:\/\//i.test(u)) {
      return `https://${u}`;
    }
    return u;
  };

  const url = getCleanUrl(rawUrl);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 flex flex-col bg-slate-900 shadow-2xl relative">
      {/* Moldura de Navegador */}
      <div className="bg-slate-950 p-3 shrink-0 flex items-center gap-3 border-b border-white/5 select-none">
        <div className="flex gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-full bg-rose-500"></span>
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
        </div>
        <div className="flex-1 bg-slate-900 text-white/50 text-[10px] font-mono px-3 py-1 rounded-md border border-white/5 truncate flex items-center gap-1.5 justify-center">
          <Globe size={10} className="text-cyan-400" />
          <span>{url}</span>
        </div>
      </div>
      {/* Iframe em escala */}
      <div className="flex-1 bg-white relative overflow-hidden">
        <iframe 
          src={url} 
          className="absolute inset-0 w-full h-full border-none"
          title="Browser snapshot"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
        <div className="absolute inset-0 bg-transparent pointer-events-none" />
      </div>
    </div>
  );
};

// ==========================================
// 8. EMBED HTML WIDGET
// ==========================================
export const EmbedHtmlWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.embedHtmlConfig || { html: '' };
  const html = config.html || '<div style="color: white; font-family: sans-serif; text-align: center; padding: 20px;">Cole seu código HTML customizado aqui.</div>';

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-black/10 flex items-center justify-center">
      <iframe 
        srcDoc={html} 
        className="w-full h-full border-none bg-transparent"
        title="Custom HTML Embed"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};

// ==========================================
// 9. GOOGLE DOCS WIDGET
// ==========================================
export const GoogleDocsWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.googleDocsConfig || { url: '', docType: 'document' };
  const rawUrl = config.url || '';
  const type = config.docType || 'document';

  // Sanitiza a URL para embed
  const getEmbeddableUrl = (u: string, t: string) => {
    if (!u) return '';
    let base = u.split('/edit')[0];
    if (t === 'spreadsheet') {
      return `${base}/preview?widget=true&headers=false`;
    } else if (t === 'presentation') {
      return `${base}/embed?start=true&loop=true&delayms=5000`;
    } else if (t === 'form') {
      return u; // forms são embedados diretamente
    }
    return `${base}/preview`;
  };

  const embedUrl = getEmbeddableUrl(rawUrl, type);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-slate-900 flex flex-col shadow-2xl relative">
      <div className="bg-slate-950 p-3 shrink-0 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-blue-400" />
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-200">Google Workspace</span>
        </div>
        <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded uppercase tracking-wider font-black">{type}</span>
      </div>
      <div className="flex-1 bg-white relative">
        {embedUrl ? (
          <iframe 
            src={embedUrl} 
            className="w-full h-full border-none"
            title="Google Docs Embed"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
            <Globe size={24} />
            <span>Nenhum documento incorporado.</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 10. OFFICE DOCS WIDGET
// ==========================================
export const OfficeDocsWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.officeDocsConfig || { url: '', docType: 'word' };
  const rawUrl = config.url || '';
  const type = config.docType || 'word';

  // Usamos o visualizador oficial de embed do Office Web Apps
  const embedUrl = rawUrl ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawUrl)}` : '';

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-slate-900 flex flex-col shadow-2xl relative">
      <div className="bg-slate-950 p-3 shrink-0 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-orange-500" />
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-200">Microsoft Office 365</span>
        </div>
        <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded uppercase tracking-wider font-black">{type}</span>
      </div>
      <div className="flex-1 bg-white relative">
        {embedUrl ? (
          <iframe 
            src={embedUrl} 
            className="w-full h-full border-none"
            title="Office Docs Embed"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
            <Globe size={24} />
            <span>Nenhuma planilha ou doc incorporado.</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 11. POWER BI WIDGET
// ==========================================
export const PowerBIWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.powerBiConfig || { embedUrl: '' };
  const embedUrl = config.embedUrl || '';

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-slate-900 flex flex-col shadow-2xl relative">
      <div className="bg-slate-950 p-3 shrink-0 flex items-center gap-2 border-b border-white/5">
        <TrendingUp size={16} className="text-yellow-400" />
        <span className="text-xs uppercase font-extrabold tracking-widest text-slate-200">Power BI Dashboard</span>
      </div>
      <div className="flex-1 bg-slate-950 relative">
        {embedUrl ? (
          <iframe 
            src={embedUrl} 
            className="w-full h-full border-none"
            title="Power BI Dashboard Embed"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
            <Globe size={24} />
            <span>Nenhum painel do Power BI configurado.</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 12. AIRTABLE WIDGET
// ==========================================
export const AirtableWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.airtableConfig || { shareUrl: '' };
  const shareUrl = config.shareUrl || '';

  // Sanitiza a URL de base para embed
  const getEmbedUrl = (u: string) => {
    if (!u) return '';
    if (u.includes('/embed/')) return u;
    return u.replace('airtable.com/', 'airtable.com/embed/');
  };

  const embedUrl = getEmbedUrl(shareUrl);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-slate-900 flex flex-col shadow-2xl relative">
      <div className="bg-slate-950 p-3 shrink-0 flex items-center gap-2 border-b border-white/5">
        <Database size={16} className="text-rose-500" />
        <span className="text-xs uppercase font-extrabold tracking-widest text-slate-200">Airtable Database</span>
      </div>
      <div className="flex-1 bg-slate-900 relative">
        {embedUrl ? (
          <iframe 
            src={embedUrl} 
            className="w-full h-full border-none"
            title="Airtable Base Embed"
            style={{ background: 'transparent' }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
            <Globe size={24} />
            <span>Nenhuma base Airtable configurada.</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 13. PDF DOCUMENT WIDGET
// ==========================================
export const PdfDocumentWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.pdfDocumentConfig || { pdfUrl: '' };
  const pdfUrl = config.pdfUrl || '';

  // Esconder barra do PDF nativo se necessário
  const embedUrl = pdfUrl ? `${pdfUrl}#toolbar=0` : '';

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-slate-900 flex flex-col shadow-2xl relative">
      <div className="bg-slate-950 p-3 shrink-0 flex items-center gap-2 border-b border-white/5">
        <FileText size={16} className="text-red-500" />
        <span className="text-xs uppercase font-extrabold tracking-widest text-slate-200">Documento PDF</span>
      </div>
      <div className="flex-1 bg-slate-950 relative">
        {embedUrl ? (
          <iframe 
            src={embedUrl} 
            className="w-full h-full border-none bg-slate-800"
            title="PDF Document Embed"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
            <FileText size={24} />
            <span>Nenhum documento PDF configurado.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Player;
