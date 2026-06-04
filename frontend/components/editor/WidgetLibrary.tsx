import React from 'react';
import { 
  Layers, X, Trash2, ImageIcon, Film, Type, Sparkles, Globe, Clock, CloudSun, 
  LayoutDashboard, Rss, CalendarDays, StickyNote, ListTodo, Timer, ClipboardList, 
  Utensils, TrendingUp, Aperture, FileText, BookOpen, BarChart3, Database, Code2, 
  Upload, MonitorPlay, Move, Info
} from 'lucide-react';
import { Display, Page, WidgetType } from '../../types';

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
}

const WidgetTool = ({ icon, label, description, onClick, tooltipAlign = 'center' }: any) => {
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
      className="relative flex flex-col items-center justify-center p-1 bg-[#111827] border border-slate-800/60 rounded-lg hover:bg-[#0ea5e9]/10 hover:border-[#0ea5e9] hover:shadow-[0_0_12px_rgba(14,165,233,0.15)] active:scale-95 transition-all group w-full cursor-pointer py-1.5"
    >
      <div className="absolute top-1 right-1 opacity-20 group-hover:opacity-100 transition-opacity text-slate-400 group-hover:text-[#0ea5e9]">
        <Info size={8} />
      </div>

      <div className={`absolute bottom-full mb-2 hidden group-hover:flex flex-col pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-200 ${alignClass}`}>
        <div className="bg-slate-950 border border-slate-800 text-slate-200 text-[9px] font-bold py-1.5 px-3 rounded-lg shadow-xl w-48 text-center leading-relaxed">
          {description}
        </div>
        <div className={`w-2 h-2 bg-slate-950 border-r border-b border-slate-800 rotate-45 -mt-1 ${arrowClass}`}></div>
      </div>

      <div className="text-slate-300 group-hover:text-[#0ea5e9] mb-0.5 transition-colors drop-shadow-sm flex items-center justify-center h-8 w-8">
        {icon}
      </div>
      <span className="text-[8px] font-bold text-slate-400 group-hover:text-white uppercase tracking-wider transition-colors text-center truncate w-full px-0.5">
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
}) => {
  return (
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
             <WidgetTool icon={<ImageIcon size={20} className="text-sky-400" />} label="Imagem" description="Exibe imagens de alta qualidade (PNG, JPG, SVG) com ajuste automático ao contêiner." onClick={() => addWidget(WidgetType.IMAGE)} tooltipAlign="left" />
             <WidgetTool icon={<Film size={20} className="text-rose-400" />} label="Vídeo" description="Reproduz vídeos locais em looping ou links diretos do YouTube." onClick={() => addWidget(WidgetType.VIDEO)} tooltipAlign="center" />
             <WidgetTool icon={<Type size={20} className="text-slate-200" />} label="Texto" description="Adiciona caixas de texto com fontes, cores e tamanhos personalizáveis." onClick={() => addWidget(WidgetType.TEXT)} tooltipAlign="right" />
             <WidgetTool icon={<Sparkles size={20} className="text-fuchsia-400" />} label="GIF" description="Exibe animações divertidas em formato GIF para atrair a atenção do público." onClick={() => addWidget(WidgetType.GIF)} tooltipAlign="left" />
             <WidgetTool icon={<Globe size={20} className="text-cyan-400" />} label="Web" description="Incorpora qualquer site ou página web externa de forma interativa." onClick={() => addWidget(WidgetType.IFRAME)} tooltipAlign="center" />
           </div>
         </div>

         {/* Utilitários */}
         <div className="mb-2.5">
           <h4 className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-cyan-400 inline-block"></span>Utilitários</h4>
           <div className="grid grid-cols-3 gap-1.5">
             <WidgetTool icon={<Clock size={20} className="text-sky-300" />} label="Relógio" description="Mostra um relógio digital sincronizado em tempo real com a cidade escolhida." onClick={() => addWidget(WidgetType.CLOCK)} tooltipAlign="left" />
             <WidgetTool icon={<CloudSun size={20} className="text-amber-400" />} label="Clima" description="Exibe a previsão do tempo e temperatura em tempo real para qualquer cidade." onClick={() => addWidget(WidgetType.WEATHER)} tooltipAlign="center" />
             <WidgetTool icon={<LayoutDashboard size={20} className="text-teal-400" />} label="Completo" description="Painel integrado de relógio, clima e fundos de alta definição." onClick={() => addWidget(WidgetType.FULL_INFO)} tooltipAlign="right" />
             <WidgetTool icon={<Rss size={20} className="text-orange-400" />} label="RSS" description="Exibe feeds de notícias em tempo real de portais de notícias como G1 e CNN." onClick={() => addWidget(WidgetType.RSS)} tooltipAlign="left" />
             <WidgetTool icon={<CalendarDays size={20} className="text-rose-300" />} label="Agenda" description="Integração direta com Google Agenda para exibir eventos e programações." onClick={() => addWidget(WidgetType.CALENDAR)} tooltipAlign="center" />
           </div>
         </div>

         {/* Interativos */}
         <div className="mb-2.5">
           <h4 className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-amber-400 inline-block"></span>Interativos</h4>
           <div className="grid grid-cols-3 gap-1.5">
             <WidgetTool icon={<StickyNote size={20} className="text-yellow-400" />} label="Notas" description="Mural de notas adesivas com temas neon, glassmorphism e cores vibrantes." onClick={() => addWidget(WidgetType.NOTES)} tooltipAlign="left" />
             <WidgetTool icon={<ListTodo size={20} className="text-emerald-400" />} label="Tarefas" description="Lista de tarefas interativa com checkboxes e progresso de conclusão." onClick={() => addWidget(WidgetType.TODO)} tooltipAlign="center" />
             <WidgetTool icon={<Timer size={20} className="text-rose-400" />} label="Contador" description="Cronômetro regressivo para grandes eventos, metas ou datas especiais." onClick={() => addWidget(WidgetType.COUNTDOWN)} tooltipAlign="right" />
             <WidgetTool icon={<ClipboardList size={20} className="text-cyan-400" />} label="Deveres" description="Quadro semanal de deveres domésticos ou corporativos com responsáveis." onClick={() => addWidget(WidgetType.CHORES)} tooltipAlign="left" />
             <WidgetTool icon={<Utensils size={20} className="text-amber-400" />} label="Meal Plan" description="Planejador ou cardápio de refeições semanais com slide para os dias." onClick={() => addWidget(WidgetType.MEAL_PLAN)} tooltipAlign="center" />
           </div>
         </div>

         {/* Integrações */}
         <div className="mb-2.5">
           <h4 className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-rose-400 inline-block"></span>Integrações</h4>
           <div className="grid grid-cols-3 gap-1.5">
             <WidgetTool icon={<TrendingUp size={20} className="text-green-400" />} label="Bolsa" description="Painel de cotações financeiras de ações e criptomoedas em tempo real." onClick={() => addWidget(WidgetType.MARKET_WATCH)} tooltipAlign="left" />
             <WidgetTool icon={<Aperture size={20} className="text-blue-400" />} label="Snapshot" description="Renderiza capturas estáticas e periódicas de páginas de forma segura." onClick={() => addWidget(WidgetType.BROWSER_SNAPSHOT)} tooltipAlign="center" />
             <WidgetTool icon={<FileText size={20} className="text-cyan-500" />} label="G Docs" description="Incorpora documentos, planilhas ou slides do Google Workspace." onClick={() => addWidget(WidgetType.GOOGLE_DOCS)} tooltipAlign="right" />
             <WidgetTool icon={<BookOpen size={20} className="text-blue-500" />} label="Office Docs" description="Exibe planilhas Excel, documentos Word ou slides PowerPoint do Office 365." onClick={() => addWidget(WidgetType.OFFICE_DOCS)} tooltipAlign="left" />
             <WidgetTool icon={<BarChart3 size={20} className="text-amber-500" />} label="Power BI" description="Exibe painéis interativos e relatórios dinâmicos do Microsoft Power BI." onClick={() => addWidget(WidgetType.POWER_BI)} tooltipAlign="center" />
             <WidgetTool icon={<Database size={20} className="text-rose-500" />} label="Airtable" description="Exibe visualizações, tabelas ou bases de dados completas do Airtable." onClick={() => addWidget(WidgetType.AIRTABLE)} tooltipAlign="right" />
             <WidgetTool icon={<FileText size={20} className="text-red-500" />} label="PDF" description="Exibe documentos PDFs e apostilas corporativas página a página." onClick={() => addWidget(WidgetType.PDF_DOCUMENT)} tooltipAlign="left" />
             <WidgetTool icon={<Code2 size={20} className="text-indigo-400" />} label="HTML" description="Insira código HTML, CSS ou JS personalizado livremente." onClick={() => addWidget(WidgetType.EMBED_HTML)} tooltipAlign="center" />
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
      </div>

      {/* Section 2: Fundo da Cena */}
      <div className="p-3.5 border-b border-slate-800">
         <div className="flex items-center gap-2 mb-4">
           <MonitorPlay size={12} className="text-indigo-500" />
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
                  value={activePage.backgroundVideoUrl || ''}
                  onChange={(e) => {
                    const updated = [...display.pages];
                    updated[activePageIdx].backgroundVideoUrl = e.target.value;
                    updated[activePageIdx].backgroundImage = ''; 
                    setDisplay({...display, pages: updated});
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
                  <span className="bg-slate-900 px-2 text-slate-500 font-bold uppercase text-[8px]">ou</span>
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
                className="flex items-center justify-center gap-1.5 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-all border border-slate-700 hover:border-slate-500 shadow-md"
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
                      className="w-3 h-3 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-offset-0 focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                    />
                    <label htmlFor="bg-video-mute" className="text-[9px] font-bold text-slate-400 uppercase cursor-pointer select-none hover:text-cyan-400 transition-colors">
                      Vídeo Mudo (Sem Áudio)
                    </label>
                  </div>
                  
                  {isYouTubeUrl(activePage.backgroundVideoUrl) && (
                    <div className="flex items-center justify-between bg-slate-950/50 p-1.5 rounded-lg border border-slate-800/50 mt-0.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Qualidade YouTube</label>
                      <select 
                        value={activePage.backgroundVideoQuality || 'highres'}
                        onChange={(e) => {
                          const updated = [...display.pages];
                          updated[activePageIdx].backgroundVideoQuality = e.target.value;
                          setDisplay({...display, pages: updated});
                        }}
                        className="bg-slate-900 border border-slate-700 text-slate-300 text-[9px] rounded px-1.5 py-0.5 outline-none focus:border-cyan-500"
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
                  <span className="bg-slate-900 px-2 text-[8px] text-slate-600 font-bold">OU</span>
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 pl-7 text-[10px] text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
                <ImageIcon size={11} className="absolute left-2.5 top-2.5 text-slate-600" />
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
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-[9px] font-bold text-slate-400 hover:text-white transition-all"
              >
                <Upload size={11} /> 
                SELECIONAR IMAGEM
              </button>
            </div>

            <div className="relative">
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="bg-slate-900 px-2 text-[8px] text-slate-600 font-bold">OU</span>
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
                className="w-full flex items-center justify-between gap-1.5 py-2 px-2.5 bg-slate-950 border border-slate-700 hover:border-cyan-500 rounded-lg text-[10px] text-slate-300 hover:text-white transition-all group-hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <MonitorPlay size={13} className="text-cyan-500 shrink-0" />
                  {activePage.backgroundAnimation ? 
                    ['Automático (Clima)', 'Fluxo Gradiente', 'Céu e Nuvens', 'Chuva Digital', 'Neve Caindo', 'Chamas', 'Grid Tech', 'Alerta Vermelho', 'Pulso Azul', 'Pulso Verde', 'Aurora Boreal']
                    [['auto-weather', 'gradient-flow', 'clouds', 'rain', 'snow', 'fire', 'tech-grid', 'pulse-red', 'pulse-blue', 'pulse-green', 'aurora'].indexOf(activePage.backgroundAnimation)]
                    : 'Escolher Animação'}
                </span>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activePage.backgroundAnimation ? 'bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.8)]' : 'bg-slate-700'}`}></div>
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
                    value={activePage.transitionType || 'none'}
                    onChange={(e) => {
                      const updated = [...display.pages];
                      updated[activePageIdx].transitionType = e.target.value as any;
                      setDisplay({...display, pages: updated});
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
                    value={activePage.transitionDuration || 500}
                    onChange={(e) => {
                      const updated = [...display.pages];
                      updated[activePageIdx].transitionDuration = parseInt(e.target.value);
                      setDisplay({...display, pages: updated});
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
           <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Duração (Segundos)</label>
           <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg p-1">
             <Clock size={13} className="ml-1.5 text-slate-600" />
             <input 
               type="number" 
               value={activePage.duration} 
               onChange={(e) => {
                 const updated = [...display.pages];
                 updated[activePageIdx].duration = parseInt(e.target.value) || 5;
                 setDisplay({...display, pages: updated});
               }}
               className="w-full bg-transparent border-none p-1 text-xs font-bold text-slate-200 focus:ring-0 outline-none"
             />
           </div>
         </div>
      </div>
      
      {activePage.broadcast_id && (
         <div className="m-3.5 p-2 bg-cyan-900/20 border border-cyan-800/30 rounded-xl flex items-start gap-2">
           <CalendarDays className="text-cyan-400 shrink-0 mt-0.5" size={14} />
           <div>
             <p className="text-[10px] font-bold text-cyan-400 mb-0.5">Cena Programada</p>
             <p className="text-[9px] text-cyan-200/60 leading-relaxed">
               Esta cena foi injetada pela Central. Alterações feitas aqui afetarão apenas esta tela.
             </p>
           </div>
         </div>
      )}
    </aside>
  );
};
