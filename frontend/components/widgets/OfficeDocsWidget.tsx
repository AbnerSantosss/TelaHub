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

export const OfficeDocsWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.officeDocsConfig || { url: '', docType: 'word' };
  const rawUrl = config.url || '';
  const type = config.docType || 'word';

  // Usamos o visualizador oficial de embed do Office Web Apps
  const embedUrl = rawUrl ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawUrl)}` : '';

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-slate-900 flex flex-col shadow-2xl relative">
      <div className="bg-slate-950 p-3 shrink-0 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-orange-500" />
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-200">Microsoft Office 365</span>
        </div>
        <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded uppercase tracking-wider font-black">{type}</span>
      </div>
      <div className="flex-1 bg-white relative">
        {embedUrl ? (
          <IframeWithSkeleton
            src={embedUrl}
            className="w-full h-full border-none"
            title="Office Docs Embed"
            errorMessage="Não foi possível carregar o documento do Office."
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
            <Globe size={24} />
            <span>Nenhuma planilha ou doc incorporado.</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 11. POWER BI WIDGET
