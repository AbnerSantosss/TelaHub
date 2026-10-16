import React from 'react';
import { 
  Layers, X, Trash2, ImageIcon, Film, Type, Sparkles, Globe, Clock, CloudSun, 
  LayoutDashboard, Rss, CalendarDays, StickyNote, ListTodo, Timer, ClipboardList, 
  Utensils, TrendingUp, Aperture, FileText, BookOpen, BarChart3, Database, Code2, 
  Upload, MonitorPlay, Move, Info, Lock
} from 'lucide-react';
import { Display, Page, WidgetType } from '../../types';
import { DOC_FEATURE_KEY, isWidgetLocked, widgetFeatureKey } from '../../services/billing';

interface WidgetLibraryProps {
  display: Display;
  activePage: Page;
  activePageIdx: number;
  setDisplay: React.Dispatch<React.SetStateAction<Display | null>>;
  selectedWidget: string | null;
  setSelectedWidget: React.Dispatch<React.SetStateAction<string | null>>;
  addWidget: (type: WidgetType) => void;
  setIsClearingScene: React.Dispatch<React.SetStateAction<boolean>>;
  setMediaLibraryConfig: React.Dispatch<React.SetStateAction<any>>;
  setShowBgAnimModal: React.Dispatch<React.SetStateAction<boolean>>;
  showLeftSidebar: boolean;
  setShowLeftSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  /**
   * Features do plano da assinatura atual. `undefined` enquanto carrega — e
   * nesse caso nada é bloqueado, porque o gate real é do servidor e esconder
   * widget por dado ausente tiraria recurso de quem tem direito.
   */
  planFeatures?: string[];
  /** Nome do plano que libera os widgets bloqueados, para o texto do cadeado. */
  requiredPlanName?: string;
}

const WidgetTool = ({ icon, label, description, onClick, tooltipAlign = 'center', locked = false, lockedHint }: any) => {
  const alignClass = 
    tooltipAlign === 'left' ? 'left-0 items-start' :
    tooltipAlign === 'right' ? 'right-0 items-end' :
    'left-1/2 -translate-x-1/2 items-center';

  const arrowClass = 
    tooltipAlign === 'left' ? 'left-8' :
    tooltipAlign === 'right' ? 'right-8' :
    '';

  return (
    <button
      onClick={onClick}
      disabled={locked}
      aria-disabled={locked}
      title={locked ? lockedHint : undefined}
      className={`relative flex flex-col items-center justify-center p-1 bg-papel-3 border rounded-lg active:scale-95 transition-all group w-full py-1.5 ${
        locked
          ? 'border-borda opacity-45 cursor-not-allowed'
          : 'border-borda hover:bg-marca-fundo hover:border-marca cursor-pointer'
      }`}
    >
      <div className={`absolute top-1 right-1 transition-opacity ${locked ? 'opacity-70 text-warn' : 'opacity-20 group-hover:opacity-100 text-tinta-3 group-hover:text-marca'}`}>
        {locked ? <Lock size={8} /> : <Info size={8} />}
      </div>

      <div className={`absolute bottom-full mb-2 hidden group-hover:flex flex-col pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-200 ${alignClass}`}>
        <div className="bg-papel-2 border border-borda text-tinta text-[9px] font-bold py-1.5 px-3 rounded-lg shadow-flutuante w-48 text-center leading-relaxed">
          {locked ? lockedHint : description}
        </div>
        <div className={`w-2 h-2 bg-papel-2 border-r border-b border-borda rotate-45 -mt-1 ${arrowClass}`}></div>
      </div>

      <div className={`mb-0.5 transition-colors drop-shadow-sm flex items-center justify-center h-8 w-8 ${locked ? 'text-tinta-3 grayscale' : 'text-tinta-2 group-hover:text-marca'}`}>
        {icon}
      </div>
      <span className={`text-[8px] font-bold uppercase tracking-wider transition-colors text-center truncate w-full px-0.5 ${locked ? 'text-tinta-3' : 'text-tinta-3 group-hover:text-tinta'}`}>
        {label}
      </span>
    </button>
  );
};

const isYouTubeUrl = (url: string) => {
  if (!url) return false;
  const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
  return regExp.test(url);
};

export const WidgetLibrary: React.FC<WidgetLibraryProps> = ({
  display,
  activePage,
  activePageIdx,
  setDisplay,
  selectedWidget,
  setSelectedWidget,
  addWidget,
  setIsClearingScene,
  setMediaLibraryConfig,
  setShowBgAnimModal,
  showLeftSidebar,
  setShowLeftSidebar,
  planFeatures,
  requiredPlanName = 'Rede',
}) => {
  const locked = (type: WidgetType): boolean => isWidgetLocked(type, planFeatures);

  // O aviso precisa nomear o plano CERTO: documento destrava no Loja (1 tela),
  // painel de gestão só no Rede (piso de 5). Um texto único mandaria para o
  // plano de 5 telas quem resolveria o problema com o de 1.
  const lockedHint = (type: WidgetType): string =>
    widgetFeatureKey(type) === DOC_FEATURE_KEY
      ? 'Disponível a partir do plano Loja. Seu plano atual não inclui documentos (PDF, Google Docs e Office).'
      : `Disponível no plano ${requiredPlanName}. Seu plano atual não inclui os painéis de gestão.`;

  return (
    <aside className={`absolute md:relative left-0 top-0 h-full w-64 bg-papel border-r border-borda overflow-y-auto z-[60] shadow-flutuante transition-transform duration-300 ease-in-out ${showLeftSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      
      {/* Section 1: Biblioteca de Widgets */}
      <div className="p-3.5 border-b border-borda">
         <div className="flex justify-between items-center mb-3">
           <h3 className="text-[10px] font-black text-marca uppercase tracking-widest flex items-center gap-1.5">
             <Layers size={11} /> Biblioteca de Widgets
           </h3>
           <button onClick={() => setShowLeftSidebar(false)} className="md:hidden text-tinta-3 hover:text-tinta p-1 rounded-lg hover:bg-papel-3 transition-colors">
             <X size={16} />
           </button>
         </div>
         
         {/* Básicos */}
         <div className="mb-2.5">
           <h4 className="text-[9px] font-black text-ok uppercase tracking-widest mb-1 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-ok inline-block"></span>Básicos</h4>
           <div className="grid grid-cols-3 gap-1.5">
             <WidgetTool icon={<ImageIcon size={20} className="text-marca" />} label="Imagem" description="Mostra imagens PNG, JPG ou SVG ajustadas ao espaço do bloco." onClick={() => addWidget(WidgetType.IMAGE)} tooltipAlign="left" />
             <WidgetTool icon={<Film size={20} className="text-danger" />} label="Vídeo" description="Toca vídeos enviados, em repetição, ou links do YouTube." onClick={() => addWidget(WidgetType.VIDEO)} tooltipAlign="center" />
             <WidgetTool icon={<Type size={20} className="text-tinta" />} label="Texto" description="Caixa de texto com fonte, cor e tamanho que você escolhe." onClick={() => addWidget(WidgetType.TEXT)} tooltipAlign="right" />
             <WidgetTool icon={<Sparkles size={20} className="text-marca" />} label="GIF" description="Mostra animações em GIF." onClick={() => addWidget(WidgetType.GIF)} tooltipAlign="left" />
             <WidgetTool icon={<Globe size={20} className="text-marca" />} label="Web" description="Mostra uma página de outro site dentro da tela." onClick={() => addWidget(WidgetType.IFRAME)} tooltipAlign="center" />
           </div>
         </div>

         {/* Utilitários */}
         <div className="mb-2.5">
           <h4 className="text-[9px] font-black text-marca uppercase tracking-widest mb-1 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-marca inline-block"></span>Utilitários</h4>
           <div className="grid grid-cols-3 gap-1.5">
             <WidgetTool icon={<Clock size={20} className="text-marca" />} label="Relógio" description="Relógio digital com o horário da cidade escolhida." onClick={() => addWidget(WidgetType.CLOCK)} tooltipAlign="left" />
             <WidgetTool icon={<CloudSun size={20} className="text-warn" />} label="Clima" description="Previsão do tempo e temperatura atual da cidade escolhida." onClick={() => addWidget(WidgetType.WEATHER)} tooltipAlign="center" />
             <WidgetTool icon={<LayoutDashboard size={20} className="text-marca" />} label="Completo" description="Relógio e clima juntos, com imagem de fundo." onClick={() => addWidget(WidgetType.FULL_INFO)} tooltipAlign="right" />
             <WidgetTool icon={<Rss size={20} className="text-warn" />} label="RSS" description="Notícias de portais como G1 e CNN, por RSS." onClick={() => addWidget(WidgetType.RSS)} tooltipAlign="left" />
             <WidgetTool icon={<CalendarDays size={20} className="text-danger" />} label="Agenda" description="Mostra os eventos de uma agenda do Google." onClick={() => addWidget(WidgetType.CALENDAR)} tooltipAlign="center" />
           </div>
         </div>

         {/* Interativos */}
         <div className="mb-2.5">
           <h4 className="text-[9px] font-black text-warn uppercase tracking-widest mb-1 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-warn inline-block"></span>Interativos</h4>
           <div className="grid grid-cols-3 gap-1.5">
             <WidgetTool icon={<StickyNote size={20} className="text-warn" />} label="Notas" description="Recados em formato de nota adesiva, com vários temas de cor." onClick={() => addWidget(WidgetType.NOTES)} tooltipAlign="left" />
             <WidgetTool icon={<ListTodo size={20} className="text-ok" />} label="Tarefas" description="Lista de tarefas com itens marcados e o total concluído." onClick={() => addWidget(WidgetType.TODO)} tooltipAlign="center" />
             <WidgetTool icon={<Timer size={20} className="text-danger" />} label="Contador" description="Contagem regressiva para um evento, meta ou data." onClick={() => addWidget(WidgetType.COUNTDOWN)} tooltipAlign="right" />
             <WidgetTool icon={<ClipboardList size={20} className="text-marca" />} label="Deveres" description="Quadro semanal de tarefas com o responsável por cada uma." onClick={() => addWidget(WidgetType.CHORES)} tooltipAlign="left" />
             <WidgetTool icon={<Utensils size={20} className="text-warn" />} label="Meal Plan" description="Cardápio da semana, passando dia a dia." onClick={() => addWidget(WidgetType.MEAL_PLAN)} tooltipAlign="center" />
           </div>
         </div>

         {/* Integrações */}
         <div className="mb-2.5">
           <h4 className="text-[9px] font-black text-danger uppercase tracking-widest mb-1 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-danger inline-block"></span>Integrações</h4>
           <div className="grid grid-cols-3 gap-1.5">
             <WidgetTool icon={<TrendingUp size={20} className="text-ok" />} label="Bolsa" description="Cotações de ações e criptomoedas." onClick={() => addWidget(WidgetType.MARKET_WATCH)} tooltipAlign="left" locked={locked(WidgetType.MARKET_WATCH)} lockedHint={lockedHint(WidgetType.MARKET_WATCH)} />
             <WidgetTool icon={<Aperture size={20} className="text-marca" />} label="Snapshot" description="Mostra uma foto da página, atualizada de tempos em tempos." onClick={() => addWidget(WidgetType.BROWSER_SNAPSHOT)} tooltipAlign="center" locked={locked(WidgetType.BROWSER_SNAPSHOT)} lockedHint={lockedHint(WidgetType.BROWSER_SNAPSHOT)} />
             <WidgetTool icon={<FileText size={20} className="text-marca" />} label="G Docs" description="Incorpora documentos, planilhas ou slides do Google Workspace." onClick={() => addWidget(WidgetType.GOOGLE_DOCS)} tooltipAlign="right" locked={locked(WidgetType.GOOGLE_DOCS)} lockedHint={lockedHint(WidgetType.GOOGLE_DOCS)} />
             <WidgetTool icon={<BookOpen size={20} className="text-marca" />} label="Office Docs" description="Exibe planilhas Excel, documentos Word ou slides PowerPoint do Office 365." onClick={() => addWidget(WidgetType.OFFICE_DOCS)} tooltipAlign="left" locked={locked(WidgetType.OFFICE_DOCS)} lockedHint={lockedHint(WidgetType.OFFICE_DOCS)} />
             <WidgetTool icon={<BarChart3 size={20} className="text-warn" />} label="Power BI" description="Mostra painéis e relatórios do Microsoft Power BI." onClick={() => addWidget(WidgetType.POWER_BI)} tooltipAlign="center" locked={locked(WidgetType.POWER_BI)} lockedHint={lockedHint(WidgetType.POWER_BI)} />
             <WidgetTool icon={<Database size={20} className="text-danger" />} label="Airtable" description="Mostra visualizações, tabelas ou bases do Airtable." onClick={() => addWidget(WidgetType.AIRTABLE)} tooltipAlign="right" locked={locked(WidgetType.AIRTABLE)} lockedHint={lockedHint(WidgetType.AIRTABLE)} />
             <WidgetTool icon={<FileText size={20} className="text-danger" />} label="PDF" description="Mostra um PDF, uma página por vez." onClick={() => addWidget(WidgetType.PDF_DOCUMENT)} tooltipAlign="left" locked={locked(WidgetType.PDF_DOCUMENT)} lockedHint={lockedHint(WidgetType.PDF_DOCUMENT)} />
             <WidgetTool icon={<Code2 size={20} className="text-marca" />} label="HTML" description="Coloque seu próprio código HTML, CSS ou JS." onClick={() => addWidget(WidgetType.EMBED_HTML)} tooltipAlign="center" locked={locked(WidgetType.EMBED_HTML)} lockedHint={lockedHint(WidgetType.EMBED_HTML)} />
           </div>
         </div>
         
         <div className="mt-3 pt-3 border-t border-borda">
            <button 
              onClick={() => setIsClearingScene(true)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-danger-fundo hover:bg-danger-fundo text-danger rounded-lg text-[9px] font-bold transition-colors border border-danger/30 uppercase tracking-wider"
            >
              <Trash2 size={11} /> Limpar Todos os Widgets
            </button>
         </div>
      </div>

      {/* Section 2: Fundo da Cena */}
      <div className="p-3.5 border-b border-borda">
         <div className="flex items-center gap-2 mb-4">
           <MonitorPlay size={12} className="text-marca" />
           <h3 className="text-[10px] font-black text-marca uppercase tracking-widest">
             Fundo da Cena
           </h3>
         </div>
         
         <div className="space-y-4">
            <div className="group">
              <label className="text-[9px] font-bold text-tinta-3 uppercase block mb-1.5">Vídeo de Fundo (YouTube ou MP4)</label>
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
                  className="w-full bg-papel-2 border border-borda-3 rounded-lg p-2 pl-7 text-base md:text-[10px] text-tinta focus:border-marca focus:ring-1 focus:ring-marca outline-none transition-all"
                />
                <Film size={11} className="absolute left-2.5 top-2.5 text-tinta-3" />
              </div>
              
              <div className="relative mt-2.5 mb-2.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-borda"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-papel px-2 text-tinta-3 font-bold uppercase text-[8px]">ou</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  setMediaLibraryConfig({
                    isOpen: true,
                    allowedTypes: 'video',
                    onSelect: (url: string) => {
                      const updated = [...display.pages];
                      updated[activePageIdx].backgroundVideoUrl = url;
                      updated[activePageIdx].backgroundImage = ''; 
                      setDisplay({...display, pages: updated});
                    }
                  });
                }}
                className="flex items-center justify-center gap-1.5 w-full bg-papel-3 hover:bg-borda text-tinta-2 px-3 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-all border border-borda-2 hover:border-borda-3 shadow-card"
              >
                <Upload size={12} />
                Selecionar Vídeo
              </button>
              
              {activePage.backgroundVideoUrl && (
                <div className="flex flex-col gap-1.5 mt-2 ml-1">
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="checkbox" 
                      id="bg-video-mute"
                      checked={activePage.backgroundVideoMuted !== false}
                      onChange={(e) => {
                        const updated = [...display.pages];
                        updated[activePageIdx].backgroundVideoMuted = e.target.checked;
                        setDisplay({...display, pages: updated});
                      }}
                      className="w-3 h-3 rounded border-borda-2 bg-papel text-marca focus:ring-offset-0 focus:ring-1 focus:ring-marca cursor-pointer"
                    />
                    <label htmlFor="bg-video-mute" className="text-[9px] font-bold text-tinta-3 uppercase cursor-pointer select-none hover:text-marca-hover transition-colors">
                      Vídeo Mudo (Sem Áudio)
                    </label>
                  </div>
                  
                  {isYouTubeUrl(activePage.backgroundVideoUrl) && (
                    <div className="flex items-center justify-between bg-papel-2 p-1.5 rounded-lg border border-borda mt-0.5">
                      <label className="text-[9px] font-bold text-tinta-3 uppercase">Qualidade YouTube</label>
                      <select 
                        value={activePage.backgroundVideoQuality || 'highres'}
                        onChange={(e) => {
                          const updated = [...display.pages];
                          updated[activePageIdx].backgroundVideoQuality = e.target.value;
                          setDisplay({...display, pages: updated});
                        }}
                        className="bg-papel border border-borda-3 text-tinta-2 text-[9px] rounded px-1.5 py-0.5 outline-none focus:border-marca"
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
                  <span className="bg-papel px-2 text-[8px] text-tinta-3 font-bold">OU</span>
               </div>
               <div className="border-t border-borda w-full"></div>
            </div>

            <div className="group">
              <label className="text-[9px] font-bold text-tinta-3 uppercase block mb-1.5">Imagem de Fundo</label>
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
                  className="w-full bg-papel-2 border border-borda-3 rounded-lg p-2 pl-7 text-base md:text-[10px] text-tinta focus:border-marca focus:ring-1 focus:ring-marca outline-none transition-all"
                />
                <ImageIcon size={11} className="absolute left-2.5 top-2.5 text-tinta-3" />
              </div>
              
              <button 
                onClick={() => {
                  setMediaLibraryConfig({
                    isOpen: true,
                    allowedTypes: 'image',
                    onSelect: (url: string) => {
                      const updated = [...display.pages];
                      updated[activePageIdx].backgroundImage = url;
                      updated[activePageIdx].backgroundVideoUrl = ''; 
                      setDisplay({...display, pages: updated});
                    }
                  });
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-papel border border-borda hover:bg-papel-3 rounded-lg text-[9px] font-bold text-tinta-3 hover:text-tinta transition-all"
              >
                <Upload size={11} /> 
                SELECIONAR IMAGEM
              </button>
            </div>

            <div className="relative">
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="bg-papel px-2 text-[8px] text-tinta-3 font-bold">OU</span>
               </div>
               <div className="border-t border-borda w-full"></div>
            </div>

            <div className="group">
              <label className="text-[9px] font-bold text-tinta-3 uppercase block mb-1.5">Fundo Animado</label>
              <button
                onClick={() => {
                  setSelectedWidget(null);
                  setShowBgAnimModal(true);
                }}
                className="w-full flex items-center justify-between gap-1.5 py-2 px-2.5 bg-papel-2 border border-borda-2 hover:border-marca rounded-lg text-[10px] text-tinta-2 hover:text-tinta transition-all"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <MonitorPlay size={13} className="text-marca shrink-0" />
                  {activePage.backgroundAnimation ? 
                    ['Automático (Clima)', 'Fluxo Gradiente', 'Céu e Nuvens', 'Chuva Digital', 'Neve Caindo', 'Chamas', 'Grid Tech', 'Alerta Vermelho', 'Pulso Azul', 'Pulso Verde', 'Aurora Boreal']
                    [['auto-weather', 'gradient-flow', 'clouds', 'rain', 'snow', 'fire', 'tech-grid', 'pulse-red', 'pulse-blue', 'pulse-green', 'aurora'].indexOf(activePage.backgroundAnimation)]
                    : 'Escolher Animação'}
                </span>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activePage.backgroundAnimation ? 'bg-marca' : 'bg-borda'}`}></div>
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-borda">
              <h3 className="text-[10px] font-black text-warn uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Move size={11} /> Transições
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-bold text-tinta-3 uppercase block mb-1">Tipo de Transição</label>
                  <select 
                    value={activePage.transitionType || 'none'}
                    onChange={(e) => {
                      const updated = [...display.pages];
                      updated[activePageIdx].transitionType = e.target.value as any;
                      setDisplay({...display, pages: updated});
                    }}
                    className="w-full bg-papel-2 border border-borda-3 rounded-lg p-2 text-base md:text-[10px] text-tinta focus:border-warn focus:ring-1 focus:ring-warn outline-none transition-all cursor-pointer"
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
                  <label className="text-[9px] font-bold text-tinta-3 uppercase block mb-1">Duração (ms)</label>
                  <input 
                    type="number"
                    value={activePage.transitionDuration || 500}
                    onChange={(e) => {
                      const updated = [...display.pages];
                      updated[activePageIdx].transitionDuration = parseInt(e.target.value);
                      setDisplay({...display, pages: updated});
                    }}
                    className="w-full bg-papel-2 border border-borda-3 rounded-lg p-2 text-base md:text-[10px] text-tinta focus:border-warn focus:ring-1 focus:ring-warn outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-[9px] font-bold text-tinta-3 uppercase block mb-1">Ajuste da Imagem</label>
              <select 
                className="w-full bg-papel-2 border border-borda-3 rounded-lg p-2 text-base md:text-[10px] text-tinta outline-none focus:border-marca cursor-pointer"
                value={activePage.backgroundFit || 'cover'}
                onChange={(e) => {
                  const updated = [...display.pages];
                  updated[activePageIdx].backgroundFit = e.target.value as any;
                  setDisplay({...display, pages: updated});
                }}
              >
                <option value="cover">Preencher (Corta)</option>
                <option value="fill">Esticar</option>
                <option value="contain">Ajustar (Bordas)</option>
              </select>
            </div>
         </div>

         <div>
           <label className="text-[9px] font-bold text-tinta-3 uppercase block mb-1">Duração (Segundos)</label>
           <div className="flex items-center gap-2 bg-papel-2 border border-borda-2 rounded-lg p-1">
             <Clock size={13} className="ml-1.5 text-tinta-3" />
             <input 
               type="number" 
               value={activePage.duration} 
               onChange={(e) => {
                 const updated = [...display.pages];
                 updated[activePageIdx].duration = parseInt(e.target.value) || 5;
                 setDisplay({...display, pages: updated});
               }}
               className="w-full bg-transparent border-none p-1 text-xs font-bold text-tinta focus:ring-0 outline-none"
             />
           </div>
         </div>
      </div>
      
      {activePage.broadcast_id && (
         <div className="m-3.5 p-2 bg-marca-fundo border border-borda rounded-xl flex items-start gap-2">
           <CalendarDays className="text-marca shrink-0 mt-0.5" size={14} />
           <div>
             <p className="text-[10px] font-bold text-marca mb-0.5">Cena Programada</p>
             <p className="text-[9px] text-marca leading-relaxed">
               Esta cena veio da Central de Programação. O que você mudar aqui vale só para esta tela.
             </p>
           </div>
         </div>
      )}
    </aside>
  );
};
