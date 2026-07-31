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

export const NotesWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.notesConfig || {};
  const theme = config.paperTheme || 'glass';
  const text = data.content || 'Sua nota aqui...';

  const getThemeClass = () => {
    switch (theme) {
      case 'yellow-sticky':
        return 'bg-gradient-to-br from-amber-100 to-yellow-200 text-slate-800 border-l-4 border-yellow-400 rotate-[-1deg] shadow-lg';
      case 'purple-haze':
        return 'bg-gradient-to-br from-purple-950/70 via-indigo-900/60 to-purple-900/70 text-purple-100 border border-purple-500/30 backdrop-blur-md shadow-2xl';
      case 'neon-glow':
        return 'bg-slate-950 text-[#0ea5e9] border border-[#0ea5e9]/70 shadow-[0_0_20px_rgba(124,58,237,0.4)] font-mono';
      case 'glass':
      default:
        return 'bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-2xl';
    }
  };

  const getFontFamily = () => {
    switch (config.fontFamily) {
      case 'serif': return 'font-serif';
      case 'mono': return 'font-mono';
      case 'display': return 'font-black tracking-tight';
      default: return 'font-sans';
    }
  };

  return (
    <div className={`w-full h-full p-6 flex flex-col justify-start rounded-2xl overflow-y-auto ${getThemeClass()}`}>
      <div className="flex items-center gap-2 mb-3 shrink-0 opacity-80 border-b border-white/10 pb-2">
        <StickyNote size={18} className="text-cyan-400 animate-pulse" />
        <span className="text-xs uppercase tracking-widest font-bold">Nota / Recado</span>
      </div>
      <div 
        className={`flex-1 overflow-y-auto whitespace-pre-wrap leading-relaxed ${getFontFamily()}`}
        style={{
          fontSize: config.fontSize || '1.1rem',
          color: config.textColor || undefined
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ==========================================
// 2. TODO WIDGET
