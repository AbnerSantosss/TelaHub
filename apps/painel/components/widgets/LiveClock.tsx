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
