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
import { getAlignmentClasses, getWeatherAnimationClass } from '../Player';

// Import Recharts parts to make sure they are accessible (recharts does not default export AreaChart sometimes)
// If Recharts has specific issues, importing them directly as named works in Vite.

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
