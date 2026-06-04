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
