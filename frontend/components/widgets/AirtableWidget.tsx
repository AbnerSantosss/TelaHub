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

export const AirtableWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.airtableConfig || { shareUrl: '' };
  const shareUrl = config.shareUrl || '';

  // Sanitiza a URL de base para embed
  const getEmbedUrl = (u: string) => {
    if (!u) return '';
    if (u.includes('/embed/')) return u;
    return u.replace('airtable.com/', 'airtable.com/embed/');
  };

  const embedUrl = getEmbedUrl(shareUrl);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-slate-900 flex flex-col shadow-2xl relative">
      <div className="bg-slate-950 p-3 shrink-0 flex items-center gap-2 border-b border-white/5">
        <Database size={16} className="text-rose-500" />
        <span className="text-xs uppercase font-extrabold tracking-widest text-slate-200">Airtable Database</span>
      </div>
      <div className="flex-1 bg-slate-900 relative">
        {embedUrl ? (
          <IframeWithSkeleton
            src={embedUrl}
            className="w-full h-full border-none"
            title="Airtable Base Embed"
            style={{ background: 'transparent' }}
            errorMessage="Não foi possível carregar a base do Airtable."
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
            <Globe size={24} />
            <span>Nenhuma base Airtable configurada.</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 13. PDF DOCUMENT WIDGET
