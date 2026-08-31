import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CloudSun, Rss, Monitor, Loader2, Home, ChevronRight, MoreHorizontal, ChevronLeft, 
  Cloud, CloudRain, CloudLightning, Snowflake, Sun, Search, Map,
  StickyNote, ListTodo, Hourglass, ClipboardList, Utensils, TrendingUp, TrendingDown, 
  ArrowUpRight, ArrowDownRight, Globe, FileText, Code2, Database, Layers, CheckSquare,
  Gift, CheckCircle2, Tv, FileImage, Check, Copy, ExternalLink, Calendar, CalendarDays,
  Pencil, Trash2, X, Settings, Image as ImageIcon, BookOpen, BarChart3, Aperture,
  ArrowUp, ArrowDown, Play, Pause, Square, Power, CheckSquare as CheckSquareIcon,
  Hourglass as HourglassIcon, User, Users, Lock, Shield, Eye, EyeOff, Info, HelpCircle,
  Menu, ChevronDown, CheckCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, ComposedChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { getAlignmentClasses } from '../Player';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const RssFeed: React.FC<{url: string, config?: any, widgetData?: any}> = ({ url, config, widgetData }) => {
  const [items, setItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const layout = config?.layout || 'full-image';
  const feedMode = config?.feedMode || 'default';

  // Função para extrair imagem
  const getImageUrl = (item: any) => {
    if (!item) return null;
    let img: string | null = null;
    if (item.thumbnail && typeof item.thumbnail === 'string' && item.thumbnail.length > 0) {
      img = item.thumbnail;
    } else if (item.enclosure?.url) {
      img = item.enclosure.url;
    } else if (item.enclosure?.link) {
      img = item.enclosure.link;
    } else {
      const descImg = item.description?.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
      if (descImg) img = descImg;
      else {
        const contentImg = item.content?.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
        if (contentImg) img = contentImg;
      }
    }
    if (img && brokenImages.has(img)) return null;
    return img;
  };

  useEffect(() => {
    let isMounted = true;

    const fetchRss = async () => {
      const targetUrl = url?.trim() || 'https://g1.globo.com/rss/g1/tecnologia/';
      try {
        let itemsData: any[] = [];
        
        // Tentativa 1: Proxy interno do backend (sem CORS, rápido e com cache)
        try {
          const proxyBase = API_BASE.startsWith('http') 
            ? API_BASE 
            : `${window.location.origin}${API_BASE.startsWith('/') ? '' : '/'}${API_BASE}`;
          const res = await fetch(`${proxyBase}/proxy/rss?url=${encodeURIComponent(targetUrl)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'ok' && Array.isArray(data.items) && data.items.length > 0) {
              itemsData = data.items;
            }
          }
        } catch (e) {
          console.warn("Proxy backend falhou, tentando fallback externo...", e);
        }

        // Tentativa 2: rss2json
        if (itemsData.length === 0) {
          try {
            const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(targetUrl)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.status === 'ok' && data.items && data.items.length > 0) {
                itemsData = data.items;
              }
            }
          } catch (e) {
            console.warn("rss2json falhou, tentando fallback", e);
          }
        }

        // Tentativa 3: Fallback usando corsproxy.io
        if (itemsData.length === 0) {
          try {
            const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
            if (res.ok) {
              const text = await res.text();
              const parser = new DOMParser();
              const xml = parser.parseFromString(text, "text/xml");
              const rawItems = Array.from(xml.querySelectorAll("item, entry"));
              
              itemsData = rawItems.map(item => {
                const title = item.querySelector("title")?.textContent || "";
                const description = item.querySelector("description, summary")?.textContent || "";
                const link = item.querySelector("link")?.textContent || item.querySelector("link")?.getAttribute("href") || "";
                const pubDate = item.querySelector("pubDate, published, updated")?.textContent || "";
                const author = item.querySelector("author, creator")?.textContent || "";
                const enclosureUrl = item.querySelector("enclosure")?.getAttribute("url") || item.querySelector("content")?.getAttribute("url");
                
                return {
                  title,
                  description,
                  link,
                  pubDate,
                  author,
                  thumbnail: enclosureUrl || '',
                  enclosure: enclosureUrl ? { url: enclosureUrl } : null
                };
              });
            }
          } catch (e) {
            console.warn("Fallback corsproxy falhou, tentando allorigins alternativo", e);
          }
        }

        // Tentativa 4: Fallback usando allorigins (get)
        if (itemsData.length === 0) {
          try {
            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
            if (res.ok) {
              const json = await res.json();
              const text = json.contents;
              
              const parser = new DOMParser();
              const xml = parser.parseFromString(text, "text/xml");
              const rawItems = Array.from(xml.querySelectorAll("item, entry"));
              
              itemsData = rawItems.map(item => {
                const title = item.querySelector("title")?.textContent || "";
                const description = item.querySelector("description, summary")?.textContent || "";
                const link = item.querySelector("link")?.textContent || item.querySelector("link")?.getAttribute("href") || "";
                const pubDate = item.querySelector("pubDate, published, updated")?.textContent || "";
                const author = item.querySelector("author, creator")?.textContent || "";
                const enclosureUrl = item.querySelector("enclosure")?.getAttribute("url") || item.querySelector("content")?.getAttribute("url");
                
                return {
                  title,
                  description,
                  link,
                  pubDate,
                  author,
                  thumbnail: enclosureUrl || '',
                  enclosure: enclosureUrl ? { url: enclosureUrl } : null
                };
              });
            }
          } catch (err) {
            console.error("Todos os fallbacks RSS falharam", err);
          }
        }

        if (isMounted) {
          if (itemsData.length > 0) {
            setItems(itemsData);
          }
        }
      } catch (e) {
        console.error("Erro geral ao carregar RSS", e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRss();
    const interval = setInterval(fetchRss, 180000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [url]);

  useEffect(() => {
    if (items.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [items.length]);

  const handleImageError = (imgUrl: string | null) => {
    if (!imgUrl) return;
    setBrokenImages(prev => {
      const newSet = new Set(prev);
      newSet.add(imgUrl);
      return newSet;
    });
  };

  if (loading) return <div className="text-white/50 text-xs animate-pulse font-mono flex items-center justify-center h-full">CARREGANDO FEED...</div>;
  
  if (items.length === 0) {
    return (
      <div className="text-white/50 text-xs font-mono flex flex-col items-center justify-center h-full p-4 text-center">
        <Rss size={24} className="mb-2 opacity-50" />
        <span>NENHUMA NOTÍCIA ENCONTRADA</span>
      </div>
    );
  }

  const currentItem = items[currentIndex % items.length];
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
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9]"></span>
                  <span className="uppercase tracking-wider font-bold text-[#0ea5e9]">{currentItem.author || 'Fonte Externa'}</span> 
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
              <span className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9] shadow-[0_0_5px_rgba(124,58,237,0.8)]"></span>
              <span className="uppercase tracking-wider font-bold text-[#0ea5e9]">{currentItem.author || 'Fonte Externa'}</span> 
              <span className="opacity-50">•</span> 
              <span className="opacity-80">{new Date(currentItem.pubDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </p>
          </div>
       </div>
    </div>
  );
};
