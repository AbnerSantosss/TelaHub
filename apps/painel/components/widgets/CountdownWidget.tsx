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
        <Hourglass size={36} className="text-[#0ea5e9] mb-3 animate-spin" />
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
        <Hourglass size={18} className="text-[#0ea5e9] animate-pulse" />
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
