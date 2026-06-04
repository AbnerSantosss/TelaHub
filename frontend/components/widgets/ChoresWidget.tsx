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

export const ChoresWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.choresConfig || { items: [] };
  const items = config.items || [];
  const title = config.title || 'Quadro de Deveres';

  // Gerador de HSL dinâmico para os badges
  const getAssigneeColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsla(${h}, 70%, 50%, 0.25)`;
  };

  return (
    <div className="w-full h-full p-6 bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col justify-between text-white overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <ClipboardList size={20} className="text-[#0ea5e9]" />
        <h3 className="font-extrabold tracking-tight text-lg">{title}</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
            Nenhuma tarefa cadastrada.
          </div>
        ) : (
          items.map((item: any) => (
            <div 
              key={item.id} 
              className={`flex items-center justify-between p-3 rounded-xl border bg-white/5 border-white/5 transition-all duration-300 ${item.done ? 'opacity-50' : 'hover:bg-white/10'}`}
            >
              <div className="flex flex-col min-w-0 flex-1 mr-2">
                <span className={`text-sm font-bold truncate ${item.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                  {item.chore}
                </span>
                {item.day && (
                  <span className="text-[10px] font-mono text-[#0ea5e9] mt-0.5 uppercase tracking-wider">{item.day}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span 
                  className="text-xs px-2.5 py-1 rounded-full font-black border border-white/10 uppercase tracking-widest"
                  style={{ backgroundColor: getAssigneeColor(item.assignee), color: '#ffffff' }}
                >
                  {item.assignee}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ==========================================
// 5. MEAL PLAN WIDGET
