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

export const MealPlanWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.mealPlanConfig || { days: {} };
  const title = config.title || 'Cardápio Semanal';
  const days = config.days || {};
  const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  return (
    <div className="w-full h-full p-6 bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col justify-between text-white overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Utensils size={20} className="text-amber-400" />
        <h3 className="font-extrabold tracking-tight text-lg">{title}</h3>
      </div>

      <div className="flex-1 overflow-x-auto flex gap-4 pb-2 pr-1 custom-scrollbar items-stretch">
        {dayNames.map(day => {
          const meal = days[day] || {};
          const hasMeals = meal.breakfast || meal.lunch || meal.dinner || meal.snacks;

          return (
            <div key={day} className="flex-1 min-w-[200px] bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col justify-between transition-all duration-300 hover:bg-white/10">
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-widest border-b border-white/10 pb-1.5 mb-2">{day}</h4>
              
              {hasMeals ? (
                <div className="space-y-2 flex-1 flex flex-col justify-around">
                  {meal.breakfast && (
                    <div className="text-[11px] leading-tight">
                      <span className="font-bold text-slate-400 uppercase tracking-widest block text-[9px] mb-0.5">Café</span>
                      <p className="truncate font-semibold text-slate-200">{meal.breakfast}</p>
                    </div>
                  )}
                  {meal.lunch && (
                    <div className="text-[11px] leading-tight">
                      <span className="font-bold text-slate-400 uppercase tracking-widest block text-[9px] mb-0.5">Almoço</span>
                      <p className="truncate font-semibold text-slate-200">{meal.lunch}</p>
                    </div>
                  )}
                  {meal.dinner && (
                    <div className="text-[11px] leading-tight">
                      <span className="font-bold text-slate-400 uppercase tracking-widest block text-[9px] mb-0.5">Jantar</span>
                      <p className="truncate font-semibold text-slate-200">{meal.dinner}</p>
                    </div>
                  )}
                  {meal.snacks && (
                    <div className="text-[11px] leading-tight">
                      <span className="font-bold text-slate-400 uppercase tracking-widest block text-[9px] mb-0.5">Lanche</span>
                      <p className="truncate font-semibold text-slate-200">{meal.snacks}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[11px] text-slate-500 italic">
                  Sem refeições.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// 6. MARKET WATCH WIDGET
