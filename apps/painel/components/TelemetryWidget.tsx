import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wifi, WifiOff, Activity, Clock, ShieldCheck, Database, Server } from 'lucide-react';
import { cn } from '../libs/utils';

// Animated Badge component from Eldora UI
export const AnimatedBadge: React.FC<{
  status: 'online' | 'offline';
  className?: string;
}> = ({ status, className }) => {
  const isOnline = status === 'online';

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider select-none relative overflow-hidden",
        isOnline
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          : "bg-slate-800/50 border-slate-700/60 text-slate-500",
        className
      )}
    >
      {/* Pulse Ripple background for premium feel */}
      {isOnline && (
        <span className="absolute inset-0 rounded-full bg-emerald-500/5 animate-ping pointer-events-none" />
      )}
      
      {/* Status indicator dot */}
      <span className="relative flex h-1.5 w-1.5">
        {isOnline && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className={cn(
          "relative inline-flex rounded-full h-1.5 w-1.5",
          isOnline ? "bg-emerald-500" : "bg-slate-600"
        )} />
      </span>
      
      {isOnline ? 'TV ONLINE' : 'TV OFFLINE'}
    </motion.div>
  );
};

export interface TelemetryItem {
  id: string;
  timestamp: string;
  category: 'system' | 'sync' | 'media' | 'alert';
  message: string;
}

// Eldora UI inspired Animated List
export const AnimatedList: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <AnimatePresence mode="popLayout">
        {children}
      </AnimatePresence>
    </div>
  );
};

interface TelemetryWidgetProps {
  status?: 'online' | 'offline';
  items: TelemetryItem[];
  title?: string;
  className?: string;
}

export const TelemetryWidget: React.FC<TelemetryWidgetProps> = ({
  status = 'online',
  items,
  title = 'Registro de Telemetria SSE',
  className,
}) => {
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system':
        return <Server className="w-4 h-4 text-cyan-400" />;
      case 'sync':
        return <Activity className="w-4 h-4 text-sky-400" />;
      case 'media':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'alert':
        return <Clock className="w-4 h-4 text-rose-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className={cn(
      "w-full h-full bg-gray-800/40 border border-white/5 rounded-2xl backdrop-blur-xl p-5 flex flex-col justify-between overflow-hidden shadow-2xl relative select-none",
      className
    )}>
      {/* Top Header Section */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-inner">
            <Activity className="w-4.5 h-4.5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider leading-none mb-1">{title}</h4>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Database className="w-2.5 h-2.5" /> Atualizações via SSE reativas
            </span>
          </div>
        </div>
        
        {/* Animated Connection Badge */}
        <AnimatedBadge status={status} />
      </div>

      {/* Animated List Container */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pr-1">
        <AnimatedList>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout // Framer Motion auto-animates layout positions when other items are added/removed!
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1,
                transition: {
                  type: "spring",
                  damping: 15,
                  stiffness: 150
                }
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.95, 
                x: -30,
                transition: { duration: 0.2 }
              }}
              className="group p-3.5 rounded-xl border border-white/5 bg-slate-900/35 hover:bg-slate-800/40 hover:border-white/10 transition-all flex items-start gap-3 shadow-[0_4px_12px_-5px_rgba(0,0,0,0.5)]"
            >
              {/* Category Icon */}
              <div className="w-8 h-8 rounded-lg bg-slate-950/40 border border-white/5 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                {getCategoryIcon(item.category)}
              </div>

              {/* Message Context */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-wider",
                    item.category === 'system' && 'text-cyan-400',
                    item.category === 'sync' && 'text-sky-400',
                    item.category === 'media' && 'text-emerald-400',
                    item.category === 'alert' && 'text-rose-400'
                  )}>
                    {item.category}
                  </span>
                  <span className="text-[8px] font-bold text-slate-600 font-mono flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> {item.timestamp}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-200 leading-snug line-clamp-2">
                  {item.message}
                </p>
              </div>
            </motion.div>
          ))}
          {items.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-slate-500 text-[10px] py-12 uppercase tracking-widest gap-2 font-bold"
            >
              <Activity className="w-6 h-6 animate-ping text-slate-700" />
              Aguardando telemetria...
            </motion.div>
          )}
        </AnimatedList>
      </div>
    </div>
  );
};
