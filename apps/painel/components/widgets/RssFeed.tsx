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

// Import Recharts parts to make sure they are accessible (recharts does not default export AreaChart sometimes)
// If Recharts has specific issues, importing them directly as named works in Vite.

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
