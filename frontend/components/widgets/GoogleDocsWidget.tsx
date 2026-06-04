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

export const GoogleDocsWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.googleDocsConfig || { url: '', docType: 'document' };
  const rawUrl = config.url || '';
  const type = config.docType || 'document';

  // Sanitiza a URL para embed
  const getEmbeddableUrl = (u: string, t: string) => {
    if (!u) return '';
    let base = u.split('/edit')[0];
    if (t === 'spreadsheet') {
      return `${base}/preview?widget=true&headers=false`;
    } else if (t === 'presentation') {
      return `${base}/embed?start=true&loop=true&delayms=5000`;
    } else if (t === 'form') {
      return u; // forms são embedados diretamente
    }
    return `${base}/preview`;
  };

  const embedUrl = getEmbeddableUrl(rawUrl, type);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-slate-900 flex flex-col shadow-2xl relative">
      <div className="bg-slate-950 p-3 shrink-0 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-blue-400" />
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-200">Google Workspace</span>
        </div>
        <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded uppercase tracking-wider font-black">{type}</span>
      </div>
      <div className="flex-1 bg-white relative">
        {embedUrl ? (
          <iframe 
            src={embedUrl} 
            className="w-full h-full border-none"
            title="Google Docs Embed"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
            <Globe size={24} />
            <span>Nenhum documento incorporado.</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 10. OFFICE DOCS WIDGET
