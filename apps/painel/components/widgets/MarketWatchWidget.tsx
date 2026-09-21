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

export const MarketWatchWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.marketWatchConfig || { symbols: [] };
  const symbols = config.symbols && config.symbols.length > 0 ? config.symbols : ['AAPL', 'BTC-USD', 'EUR-USD', 'TSLA'];
  const title = config.title || 'Mercado Financeiro';
  
  // Simulador financeiro altamente estético com flutuação a cada 2s
  const [marketData, setMarketData] = useState<{[sym: string]: { price: number, pct: number, isUp: boolean, history: { value: number }[] }}>({});

  useEffect(() => {
    // Inicialização mock de dados realistas
    const initData: any = {};
    symbols.forEach((sym: string) => {
      let basePrice = 150;
      if (sym.includes('BTC')) basePrice = 64500;
      else if (sym.includes('ETH')) basePrice = 3100;
      else if (sym.includes('EUR')) basePrice = 1.08;
      else if (sym.includes('TSLA')) basePrice = 175;
      else if (sym.includes('NVDA')) basePrice = 900;
      else if (sym.includes('PETR4')) basePrice = 36.5;

      const history = Array.from({ length: 10 }, () => ({
        value: basePrice * (1 + (Math.random() - 0.5) * 0.02)
      }));

      initData[sym] = {
        price: basePrice,
        pct: (Math.random() - 0.4) * 3, // leve bias positivo
        isUp: true,
        history
      };
      initData[sym].isUp = initData[sym].pct >= 0;
    });
    setMarketData(initData);

    const interval = setInterval(() => {
      setMarketData(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(sym => {
          const item = next[sym];
          if (!item) return;
          const fluctuation = (Math.random() - 0.48) * 0.004; // leve viés de subida
          const newPrice = item.price * (1 + fluctuation);
          const newPct = item.pct + fluctuation * 100;
          const newHistory = [...item.history.slice(1), { value: newPrice }];
          next[sym] = {
            price: Number(newPrice.toFixed(sym.includes('EUR') ? 4 : 2)),
            pct: Number(newPct.toFixed(2)),
            isUp: newPct >= 0,
            history: newHistory
          };
        });
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [JSON.stringify(symbols)]);

  return (
    <div className="w-full h-full p-6 bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col justify-between text-white overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 mb-3 shrink-0 border-b border-white/5 pb-2">
        <TrendingUp size={20} className="text-emerald-400" />
        <h3 className="font-extrabold tracking-tight text-lg">{title}</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {symbols.map((sym: string) => {
          const item = marketData[sym];
          if (!item) return null;

          return (
            <div key={sym} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all duration-300">
              <div className="w-1/4">
                <span className="font-black text-sm uppercase tracking-wider block">{sym}</span>
                <span className="text-[10px] text-slate-500 font-mono">Bolsa / Realtime</span>
              </div>
              
              {/* Sparkline Chart */}
              <div className="w-1/3 h-8 flex items-center overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={item.history}>
                    <defs>
                      <linearGradient id={`grad-${sym}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={item.isUp ? "#10b981" : "#ef4444"} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={item.isUp ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke={item.isUp ? "#10b981" : "#ef4444"} strokeWidth={1.5} fillOpacity={1} fill={`url(#grad-${sym})`} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="text-right flex flex-col items-end">
                <span className="font-mono font-black text-sm tabular-nums">
                  {sym.includes('EUR') ? '€' : '$'} {item.price.toLocaleString('pt-BR', { minimumFractionDigits: sym.includes('EUR') ? 4 : 2 })}
                </span>
                <span className={`text-xs font-black font-mono flex items-center gap-0.5 mt-0.5 tabular-nums ${item.isUp ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {item.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {item.isUp ? '+' : ''}{item.pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// 7. BROWSER SNAPSHOT WIDGET
