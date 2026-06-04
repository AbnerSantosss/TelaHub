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

export const TodoWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.todoConfig || { items: [] };
  const items = config.items || [];
  const title = config.title || 'Lista de Tarefas';

  const total = items.length;
  const doneCount = items.filter((i: any) => i.done).length;
  const progressPercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="w-full h-full p-6 bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col justify-between text-white overflow-hidden shadow-2xl">
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ListTodo size={20} className="text-[#0ea5e9]" />
            <h3 className="font-extrabold tracking-tight text-lg">{title}</h3>
          </div>
          <span className="text-xs font-mono bg-[#0ea5e9]/20 text-[#0ea5e9] px-2 py-0.5 rounded-full font-bold">
            {doneCount}/{total}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-4 relative">
          <motion.div 
            className="h-full bg-gradient-to-r from-[#0ea5e9] to-[#A855F7] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
            Nenhuma tarefa pendente.
          </div>
        ) : (
          items.map((item: any) => (
            <div 
              key={item.id} 
              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 ${
                item.done 
                  ? 'bg-slate-900/30 border-slate-800/40 text-slate-500 line-through' 
                  : 'bg-white/5 border-white/5 text-slate-200 hover:bg-white/10'
              }`}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-all duration-300 ${
                item.done 
                  ? 'bg-[#0ea5e9]/20 border-[#0ea5e9]/50 text-[#0ea5e9]' 
                  : 'border-slate-500'
              }`}>
                {item.done && <CheckSquare size={14} className="stroke-[3]" />}
              </div>
              <span className="text-sm font-medium truncate flex-1">{item.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. COUNTDOWN WIDGET
