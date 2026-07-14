import React from 'react';
import { 
  Settings, Trash2, X, MonitorPlay, Maximize2, Upload, Rss, Search, 
  Palette, MoveHorizontal, CloudSun, Clock, Calendar, Type, 
  BookOpen, ChevronDown, Globe, Film, ImageIcon, ListTodo, Timer, 
  ClipboardList, Utensils, TrendingUp, Aperture, FileText, BarChart3, 
  Code2, Database, Layout, Move
} from 'lucide-react';
import { SizeInput } from '../SizeInput';
import { Display, Page, WidgetType, LayoutItem } from '../../types';

interface PropertiesPanelProps {
  selectedWidget: string | null;
  currentWidget: LayoutItem | undefined;
  updateWidgetData: (wId: string, dataUpdates: any) => void;
  removeWidget: (wId: string) => void;
  showRightSidebar: boolean;
  setShowRightSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  setShowBgAnimModal: React.Dispatch<React.SetStateAction<boolean>>;
  setMediaLibraryConfig: React.Dispatch<React.SetStateAction<any>>;
  setFullScreen: () => void;
  activeMealDay: string;
  setActiveMealDay: React.Dispatch<React.SetStateAction<string>>;
}

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

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedWidget,
  currentWidget,
  updateWidgetData,
  removeWidget,
  showRightSidebar,
  setShowRightSidebar,
  setShowBgAnimModal,
  setMediaLibraryConfig,
  setFullScreen,
  activeMealDay,
  setActiveMealDay
}) => {
  // When no widget is selected, don't render the panel at all so the canvas stays centered
  if (!currentWidget) {
    return null;
  }

  return (
    <aside className={`absolute md:relative right-0 top-0 h-full w-80 bg-[#1f2937] border-l border-slate-800 p-6 overflow-y-auto z-[60] shadow-xl transition-transform duration-300 ease-in-out ${showRightSidebar ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
      {currentWidget ? (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="font-bold text-slate-200 flex items-center gap-2 text-xs uppercase tracking-wider">
               <Settings size={14} className="text-[#0ea5e9]" /> Configuração
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
            {currentWidget.data.fillContainer && (
              <div className="bg-gradient-to-b from-cyan-950/40 to-slate-950/90 p-4 rounded-xl border border-cyan-500/40 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2">
                  <Maximize2 size={12} className="text-cyan-400" />
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">Modo Tela Cheia Ativo</span>
                </div>

                <button
                  onClick={setFullScreen}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-[0_4px_12px_rgba(14,165,233,0.25)] flex items-center justify-center gap-2 relative overflow-hidden group border border-sky-400/30"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <Maximize2 size={14} className="relative z-10" />
                  <span className="relative z-10">Preencher Tela Inteira</span>
                </button>
                <p className="text-[8px] text-amber-400/80 text-center leading-tight">
                  ⚠️ Atenção: Isso removerá todos os outros widgets desta cena e deixará o widget ocupando 100% da tela como fundo.
                </p>
                
                <div className="pt-2 border-t border-slate-800/60 space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase block">Selecione o Background</label>
                  <input
                    type="text"
                    value={currentWidget.data.backgroundImage || ''}
                    onChange={e => updateWidgetData(selectedWidget!, { backgroundImage: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                    placeholder="URL da imagem ou vídeo de fundo..."
                  />
                  <div className="grid grid-cols-2 gap-1.5 mt-1.5">
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
                      className="py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <Upload size={10} />
                      Selecionar Imagem
                    </button>
                    <button
                      onClick={() => {
                        setMediaLibraryConfig({
                          isOpen: true,
                          allowedTypes: 'video' as const,
                          onSelect: (url: string) => {
                            updateWidgetData(selectedWidget!, { backgroundImage: url });
                          }
                        });
                      }}
                      className="py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <Upload size={10} />
                      Selecionar Vídeo
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Background Animation Button */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                <MonitorPlay size={12} /> Fundo Animado
              </h4>
              <button 
                onClick={() => setShowBgAnimModal(true)}
                className="w-full py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg text-xs font-bold transition-colors shadow-lg flex items-center justify-center gap-2"
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
                      onSelect: (url: string) => {
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
                        Faixa / Letreiro
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
                     O modo "Faixa / Letreiro" utiliza o visual Full Imagem otimizado para ocupar toda a largura da tela (redimensione o widget na grade).
                   </p>
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

                <div className="pt-2 border-t border-slate-800/60 space-y-2 mt-4">
                  <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><ImageIcon size={10} /> Selecione o Background</label>
                  <input 
                    type="text" 
                    value={currentWidget.data.backgroundImage || ''} 
                    onChange={(e) => updateWidgetData(selectedWidget!, { backgroundImage: e.target.value })} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono" 
                    placeholder="URL da imagem ou vídeo (ex: https://...)"
                  />
                  <div className="grid grid-cols-2 gap-1.5 mt-1.5">
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
                      className="py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <Upload size={10} />
                      Selecionar Imagem
                    </button>
                    <button
                      onClick={() => {
                        setMediaLibraryConfig({
                          isOpen: true,
                          allowedTypes: 'video' as const,
                          onSelect: (url: string) => {
                            updateWidgetData(selectedWidget!, { backgroundImage: url });
                          }
                        });
                      }}
                      className="py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <Upload size={10} />
                      Selecionar Vídeo
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-600 leading-relaxed mt-1">
                    Dica: Se deixar vazio, usará a imagem de clima baseada no clima atual.
                  </p>
                </div>

                <div className="space-y-4 mt-4 pt-4 border-t border-slate-800">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">Tamanho dos Textos</label>
                      <span className="text-[10px] font-mono text-[#0ea5e9]">{currentWidget.data.textSize || 100}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="50" 
                      max="200" 
                      step="5"
                      value={currentWidget.data.textSize || 100} 
                      onChange={(e) => updateWidgetData(selectedWidget!, { textSize: parseInt(e.target.value) })}
                      className="w-full accent-[#0ea5e9]"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">Tamanho dos Números</label>
                      <span className="text-[10px] font-mono text-[#0ea5e9]">{currentWidget.data.numberSize || 100}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="50" 
                      max="300" 
                      step="5"
                      value={currentWidget.data.numberSize || 100} 
                      onChange={(e) => updateWidgetData(selectedWidget!, { numberSize: parseInt(e.target.value) })}
                      className="w-full accent-[#0ea5e9]"
                    />
                  </div>
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
                  onChange={(e) => {
                    let raw = e.target.value.trim();
                    const iframeSrcMatch = raw.match(/src=["']([^"']+)["']/i);
                    if (iframeSrcMatch) raw = iframeSrcMatch[1];
                    try {
                      const url = new URL(raw);
                      if (url.hostname.includes('calendar.google.com')) {
                        const srcParam = url.searchParams.get('src');
                        if (srcParam) { raw = srcParam; }
                      }
                    } catch {}
                    updateWidgetData(selectedWidget!, { calendarId: raw });
                  }} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono" 
                  placeholder="Cole aqui o ID, URL ou iframe do Google Calendar"
                />
                <p className="text-[9px] text-emerald-500/80 leading-relaxed bg-emerald-500/5 p-2 rounded border border-emerald-500/10">
                  💡 <strong>Dica:</strong> Você pode colar diretamente a URL do calendário, o código de incorporação (iframe), ou apenas o ID da agenda.
                </p>

                <details className="group bg-slate-900/60 rounded-xl border border-slate-700/50 overflow-hidden transition-all">
                  <summary className="flex items-center justify-between cursor-pointer p-3 hover:bg-slate-800/50 transition-colors select-none">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                      <BookOpen size={12} /> Como Conectar sua Agenda
                    </span>
                    <ChevronDown size={14} className="text-slate-500 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <div className="px-3 pb-3 space-y-3 border-t border-slate-800">
                    <div className="mt-3 space-y-2.5">
                      <div className="flex gap-2.5 items-start">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-black flex items-center justify-center">1</span>
                        <p className="text-[10px] text-slate-300 leading-relaxed">Abra o <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">Google Calendar</a> no navegador.</p>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-black flex items-center justify-center">2</span>
                        <p className="text-[10px] text-slate-300 leading-relaxed">Clique no ícone de <strong className="text-white">⚙️ Configurações</strong> no canto superior direito.</p>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-black flex items-center justify-center">3</span>
                        <p className="text-[10px] text-slate-300 leading-relaxed">No menu lateral, selecione a <strong className="text-white">agenda desejada</strong>.</p>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-black flex items-center justify-center">4</span>
                        <p className="text-[10px] text-slate-300 leading-relaxed">Role até a seção <strong className="text-white">"Integrar agenda"</strong>.</p>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-black flex items-center justify-center">5</span>
                        <p className="text-[10px] text-slate-300 leading-relaxed">Copie o <strong className="text-white">"ID da agenda"</strong> ou o <strong className="text-white">"Código de incorporação"</strong> e cole no campo acima.</p>
                      </div>
                    </div>
                    <div className="mt-3 p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <p className="text-[9px] text-amber-400 leading-relaxed flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold flex-shrink-0">⚠️</span>
                        <span><strong>Importante:</strong> A agenda deve estar com <strong>acesso público</strong> ativado.</span>
                      </p>
                    </div>
                  </div>
                </details>

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
                       <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Cor de Fundo</label>
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
                  Nota: Se aparecer um erro, o site possui proteção (X-Frame-Options) e não permite ser incorporado.
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
                      <span className="font-bold text-slate-300">Permitir Interação</span>
                      <span className="text-[8px] text-slate-500">Ative para interagir ou fazer login no site.</span>
                    </div>
                  </div>

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
                      onSelect: (url: string) => {
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
                </div>
              </div>
            )}
            {currentWidget.type === WidgetType.GIF && (
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setMediaLibraryConfig({
                      isOpen: true,
                      allowedTypes: 'image',
                      onSelect: (url: string) => {
                        updateWidgetData(selectedWidget!, { url: url });
                      }
                    });
                  }}
                  className="w-full py-3 bg-slate-800 text-slate-300 rounded-lg font-bold text-xs hover:bg-slate-700 hover:text-white transition-all border border-slate-700 hover:border-cyan-500 flex items-center justify-center gap-2"
                >
                  <Upload size={14} /> 
                  Selecionar GIF
                </button>
                <div className="text-center text-[9px] text-slate-600 font-bold uppercase">- OU -</div>
                <input type="text" placeholder="URL do GIF..." value={currentWidget.data.url} onChange={(e) => updateWidgetData(selectedWidget!, { url: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-[10px] text-slate-200 outline-none focus:border-cyan-500" />
              </div>
            )}
            {currentWidget.type === WidgetType.TEXT && (
              <>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Conteúdo</label>
                  <textarea
                    value={w => currentWidget.data.content}
                    onChange={e => updateWidgetData(selectedWidget!, { content: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 h-24"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <SizeInput 
                    label="Tamanho da Fonte"
                    value={currentWidget.data.textConfig?.fontSize || currentWidget.data.fontSize}
                    onChange={(val) => updateWidgetData(selectedWidget!, { 
                      textConfig: { ...(currentWidget.data.textConfig || {}), fontSize: val },
                      fontSize: val 
                    })}
                    placeholder="4cqw"
                    step={0.5}
                    isFont={true}
                  />
                  
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Cor do Texto</label>
                    <div className="flex gap-2 h-[38px]">
                      <input
                        type="color"
                        value={currentWidget.data.color || '#ffffff'}
                        onChange={e => updateWidgetData(selectedWidget!, { color: e.target.value })}
                        className="h-full w-10 bg-transparent border-0 cursor-pointer rounded overflow-hidden p-0"
                      />
                      <input 
                        type="text" 
                        value={currentWidget.data.color || '#ffffff'} 
                        onChange={e => updateWidgetData(selectedWidget!, { color: e.target.value })} 
                        className="w-full bg-slate-950 border border-slate-700 rounded text-[10px] text-slate-300 px-2 uppercase font-mono outline-none focus:border-cyan-500" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mt-2">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Alinhamento Texto</label>
                    <select
                      value={currentWidget.data.textConfig?.textAlign || 'center'}
                      onChange={e => updateWidgetData(selectedWidget!, { textConfig: { ...(currentWidget.data.textConfig || {}), textAlign: e.target.value } })}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="left">Esquerda</option>
                      <option value="center">Centralizado</option>
                      <option value="right">Direita</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Efeito de Animação</label>
                    <select
                      value={currentWidget.data.textConfig?.animation || 'none'}
                      onChange={e => updateWidgetData(selectedWidget!, { textConfig: { ...(currentWidget.data.textConfig || {}), animation: e.target.value } })}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="none">Nenhuma</option>
                      <option value="fade">Esmaecer (Fade In)</option>
                      <option value="slide">Deslizar (Slide Up)</option>
                      <option value="pulse">Pulsar</option>
                      <option value="bounce">Balançar</option>
                      <option value="typewriter">Máquina de Escrever</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Fonte / Tipografia</label>
                    <select
                      value={currentWidget.data.textConfig?.fontFamily || 'Inter'}
                      onChange={e => updateWidgetData(selectedWidget!, { textConfig: { ...(currentWidget.data.textConfig || {}), fontFamily: e.target.value } })}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="Inter">Inter (Padrão)</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Outfit">Outfit (Moderna)</option>
                      <option value="Georgia">Georgia (Serif)</option>
                      <option value="Courier New">Courier New (Mono)</option>
                      <option value="Impact">Impact (Display)</option>
                    </select>
                  </div>
                </div>
              </>
            )}
            {currentWidget.type === WidgetType.NOTES && (
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Texto da Nota</label>
                  <textarea
                    value={currentWidget.data.content}
                    onChange={e => updateWidgetData(selectedWidget!, { content: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 h-24"
                    placeholder="Escreva sua nota aqui..."
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Estilo Visual</label>
                  <select
                    value={currentWidget.data.notesConfig?.paperTheme || 'glass'}
                    onChange={e => updateWidgetData(selectedWidget!, { notesConfig: { ...currentWidget.data.notesConfig, paperTheme: e.target.value } })}
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
                      className="bg-indigo-600 hover:bg-[#0284c7] px-3 rounded text-white text-xs font-bold"
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
                    className="w-full py-1.5 bg-indigo-600 hover:bg-[#0284c7] rounded text-white text-xs font-bold transition-colors"
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
                      className="bg-indigo-600 hover:bg-[#0284c7] px-3 rounded text-white text-xs font-bold"
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
                  Certifique-se de que o documento esteja visível para "Qualquer pessoa com o link".
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
                    <span className="text-[9px] text-slate-500 leading-tight">Widget de complemento em tela cheia — ocupa 100% da tela</span>
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

              {/* Painel de Tela Cheia removido daqui e movido para o topo */}

              {/* Alignment Controls */}
              {!currentWidget.data.fillContainer && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase block">Alinhamento Interno</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { val: "start", label: "Topo" },
                      { val: "center", label: "Centro" },
                      { val: "end", label: "Base" },
                      { val: "stretch", label: "Esticar" }
                    ].map((align) => (
                      <button 
                        key={align.val}
                        onClick={() => updateWidgetData(selectedWidget!, { contentAlignment: align.val })}
                        className={`py-1.5 border rounded text-[9px] font-bold uppercase transition-all ${
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
  );
};
