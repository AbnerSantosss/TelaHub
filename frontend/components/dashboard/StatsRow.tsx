import React from 'react';
import { Monitor, Wifi, WifiOff, Tv } from 'lucide-react';
import { Display, Device } from '../../types';
import { motion } from 'motion/react';

interface StatsRowProps {
  displays: Display[];
  devices: Device[];
}

export const StatsRow: React.FC<StatsRowProps> = ({ displays, devices }) => {
  const totalDisplays = displays.length;
  
  const onlineDisplays = displays.filter(display => 
    devices
      .filter(d => d.display_id === display.id)
      .some(d => (Date.now() - d.last_seen) < 60000)
  ).length;

  const offlineDisplays = totalDisplays - onlineDisplays;
  const totalDevices = devices.filter(d => d.status === 'linked').length;

  const stats = [
    {
      label: 'Total de Telas',
      value: totalDisplays,
      color: '#0ea5e9',
      glowRgb: '14, 165, 233',
      icon: <Monitor className="size-3.5 text-[#0ea5e9]" />,
    },
    {
      label: 'Telas Online',
      value: onlineDisplays,
      color: '#22c55e',
      glowRgb: '34, 197, 94',
      icon: <Wifi className="size-3.5 text-[#22c55e]" />,
    },
    {
      label: 'Telas Offline',
      value: offlineDisplays,
      color: '#ef4444',
      glowRgb: '239, 68, 68',
      icon: <WifiOff className="size-3.5 text-[#ef4444]" />,
    },
    {
      label: 'TVs Vinculadas',
      value: totalDevices,
      color: '#a855f7',
      glowRgb: '168, 85, 247',
      icon: <Tv className="size-3.5 text-[#a855f7]" />,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full flex flex-wrap items-center justify-between md:justify-start gap-x-6 gap-y-3 px-4 py-2.5 relative z-10 mb-6 backdrop-blur-md"
      style={{
        background: 'var(--color-surface, rgba(255,255,255,0.015))',
        border: '1px solid var(--color-border, rgba(255,255,255,0.06))',
        borderRadius: '12px',
      }}
    >
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-r border-white/5 pr-4 mr-2 hidden sm:flex">
        <span>Status</span>
      </div>
      
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 w-full sm:w-auto">
        {stats.map((stat, i) => (
          <div key={i} className="flex items-center gap-2.5 shrink-0">
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/5"
              style={{
                backgroundColor: `rgba(${stat.glowRgb}, 0.08)`,
              }}
            >
              {stat.icon}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span 
                className="font-bold text-[11px] md:text-[12px] uppercase tracking-wider text-slate-400"
              >
                {stat.label}:
              </span>
              <span 
                className="font-extrabold text-[13px] md:text-[14px]"
                style={{ color: stat.color }}
              >
                {stat.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
