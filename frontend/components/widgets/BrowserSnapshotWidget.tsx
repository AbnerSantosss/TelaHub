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
import { IframeWithSkeleton } from './IframeWithSkeleton';

// Import Recharts parts to make sure they are accessible (recharts does not default export AreaChart sometimes)
// If Recharts has specific issues, importing them directly as named works in Vite.

export const BrowserSnapshotWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.browserSnapshotConfig || { url: '' };
  const rawUrl = config.url || 'https://google.com';
  
  // Sanitizar URL
  const getCleanUrl = (u: string) => {
    if (!/^https?:\/\//i.test(u)) {
      return `https://${u}`;
    }
    return u;
  };

  const url = getCleanUrl(rawUrl);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 flex flex-col bg-slate-900 shadow-2xl relative">
      {/* Moldura de Navegador */}
      <div className="bg-slate-950 p-3 shrink-0 flex items-center gap-3 border-b border-white/5 select-none">
        <div className="flex gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-full bg-rose-500"></span>
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
        </div>
        <div className="flex-1 bg-slate-900 text-white/50 text-[10px] font-mono px-3 py-1 rounded-md border border-white/5 truncate flex items-center gap-1.5 justify-center">
          <Globe size={10} className="text-cyan-400" />
          <span>{url}</span>
        </div>
      </div>
      {/* Iframe em escala */}
      <div className="flex-1 bg-white relative overflow-hidden">
        <IframeWithSkeleton
          src={url}
          className="absolute inset-0 w-full h-full border-none"
          title="Browser snapshot"
          sandbox="allow-scripts allow-same-origin allow-popups"
          errorMessage="Não foi possível carregar esta página."
        />
        <div className="absolute inset-0 bg-transparent pointer-events-none" />
      </div>
    </div>
  );
};

// ==========================================
// 8. EMBED HTML WIDGET
