import React, { Suspense } from 'react';
import RGL, { WidthProvider } from 'react-grid-layout';
import { 
  Maximize2, Film, ImageIcon, Gift, CalendarDays, Loader2, Trash2, MoveHorizontal
} from 'lucide-react';
import { 
  LiveClock, WeatherWidget, RssFeed, FullInfoWidget, NotesWidget, 
  TodoWidget, CountdownWidget, ChoresWidget, MealPlanWidget, 
  MarketWatchWidget, BrowserSnapshotWidget, GoogleDocsWidget, OfficeDocsWidget, 
  PowerBIWidget, EmbedHtmlWidget, AirtableWidget, PdfDocumentWidget
} from '../widgets';
import { getAlignmentClasses } from '../Player';
import { Display, Page, WidgetType, LayoutItem } from '../../types';

const GridLayout = WidthProvider(RGL);

interface CanvasProps {
  display: Display;
  activePage: Page;
  activePageIdx: number;
  setDisplay: React.Dispatch<React.SetStateAction<Display | null>>;
  selectedWidget: string | null;
  setSelectedWidget: React.Dispatch<React.SetStateAction<string | null>>;
  containerWidth: number;
  rowHeight: number;
  containerRef: React.RefObject<HTMLDivElement>;
  handleLayoutChange: (layout: any[]) => void;
  removeWidget: (wId: string) => void;
}

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
  
  iframe.contentWindow?.postMessage(JSON.stringify({
    event: 'command',
    func: 'playVideo',
    args: []
  }), '*');
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
    case WidgetType.CALENDAR:
      return (
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
      );
    default:
      return <div className="w-full h-full bg-slate-900 flex items-center justify-center text-[10px] text-slate-600 uppercase font-bold">{w.type}</div>;
  }
};

export const Canvas: React.FC<CanvasProps> = ({
  display,
  activePage,
  activePageIdx,
  setDisplay,
  selectedWidget,
  setSelectedWidget,
  containerWidth,
  rowHeight,
  containerRef,
  handleLayoutChange,
  removeWidget
}) => {
  const GRID_COLS = 48;

  return (
    <main className={`flex-1 bg-[#111827] relative flex justify-center p-4 ${
      display.orientation === 'vertical'
        ? 'overflow-y-auto overflow-x-hidden items-start'
        : 'overflow-hidden items-center'
    }`}>
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ 
             backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', 
             backgroundSize: '20px 20px' 
           }}>
      </div>

      {/* Orientation label */}
      <div className={`absolute top-3 left-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-slate-900/80 px-3 py-1.5 rounded-full border backdrop-blur-sm z-20 ${
        display.orientation === 'vertical'
          ? 'text-purple-400 border-purple-800'
          : 'text-slate-600 border-slate-800'
      }`}>
        <Maximize2 size={12} className={display.orientation === 'vertical' ? 'text-purple-500' : 'text-[#F97316]'} />
        {display.orientation === 'vertical' ? 'Canvas 9:16 — Vertical' : 'Canvas 16:9 — Horizontal'}
      </div>
      
      {/*
        9:16 vertical: canvas tem largura fixa 405px × altura 720px (ratio exato 9:16).
        Isso dá espaço suficiente para editar com fidelidade.
        O container dá scroll vertical para acomodar o canvas inteiro.

        16:9 horizontal: canvas preenche a largura disponível sem scroll.
      */}
      <div 
        ref={containerRef}
        className="bg-black shadow-[0_0_40px_rgba(0,0,0,0.8)] relative border border-[#0ea5e9] rounded-md overflow-hidden shrink-0"
        style={
          display.orientation === 'vertical'
            ? { width: '405px', height: '720px' }
            : { width: '100%', maxWidth: '100%', aspectRatio: '16/9' }
        }
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
                className={`group transition-all ${selectedWidget === w.i ? 'border border-[#0ea5e9] shadow-[0_0_15px_rgba(124,58,237,0.35)]' : 'border border-transparent hover:border-white/20 hover:bg-white/5'} ${w.data.backgroundAnimation ? getBackgroundAnimationClass(w.data.backgroundAnimation) : (selectedWidget === w.i ? 'bg-slate-900/50 backdrop-blur-sm' : '')}`}
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
                    <div className="absolute top-2 right-2 z-30 bg-indigo-950/80 border border-[#0ea5e9]/50 backdrop-blur-sm text-[#0ea5e9] text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(124,58,237,0.3)] pointer-events-none animate-pulse flex items-center gap-1">
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
                  
                  <Suspense fallback={
                    <div className="flex items-center justify-center w-full h-full bg-slate-950/20 backdrop-blur-sm">
                      <Loader2 className="animate-spin text-cyan-500" size={24} />
                    </div>
                  }>
                    {renderWidgetPreview(w)}
                  </Suspense>

                  {selectedWidget === w.i && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeWidget(w.i); }}
                      className="absolute -top-2 -right-2 p-1.5 bg-rose-600 text-white rounded-full shadow-lg hover:bg-rose-500 transition-all z-30"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </GridLayout>
        </div>
      </div>
    </main>
  );
};
