import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Monitor, Wifi, WifiOff, Tv } from 'lucide-react';
import { Display, Device } from '../../types';
import { motion } from 'motion/react';
import { cardItem } from '../../libs/motion';

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
      icon: <Monitor className="size-4 text-[#0ea5e9]" />,
    },
    {
      label: 'Telas Online',
      value: onlineDisplays,
      color: '#22c55e',
      glowRgb: '34, 197, 94',
      icon: <Wifi className="size-4 text-[#22c55e]" />,
    },
    {
      label: 'Telas Offline',
      value: offlineDisplays,
      color: '#ef4444',
      glowRgb: '239, 68, 68',
      icon: <WifiOff className="size-4 text-[#ef4444]" />,
    },
    {
      label: 'TVs Vinculadas',
      value: totalDevices,
      color: '#a855f7',
      glowRgb: '168, 85, 247',
      icon: <Tv className="size-4 text-[#a855f7]" />,
    },
  ];

  return (
    <div className="grid grid-cols-[repeat(4,1fr)] max-[1050px]:grid-cols-2 gap-[8px] mt-[16px] relative z-10 mb-8">
      {stats.map((stat, i) => (
        <motion.div
          key={i}
          variants={cardItem}
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Card 
            className="relative group transition-all duration-300 overflow-hidden"
            style={{
              background: 'var(--color-surface, rgba(255,255,255,0.025))',
              border: '1px solid var(--color-border, rgba(255,255,255,0.07))',
              borderRadius: '10px',
            }}
          >
            {/* Top color bar */}
            <div 
              className="absolute top-0 left-0 right-0 h-[2px]" 
              style={{ backgroundColor: stat.color }}
            />

            {/* Subtle background glow on hover */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 100% 0%, rgba(${stat.glowRgb}, 0.15), transparent 60%)`
              }}
            />

            <CardContent 
              className="flex items-center justify-between"
              style={{ padding: '10px 14px' }}
            >
              <div className="space-y-0.5">
                <p 
                  className="font-extrabold uppercase tracking-[0.12em]"
                  style={{ fontSize: '8.5px', color: 'var(--txt3)' }}
                >
                  {stat.label}
                </p>
                <h3 
                  className="font-extrabold tracking-tight"
                  style={{ fontSize: '20px', color: 'var(--txt)' }}
                >
                  {stat.value}
                </h3>
              </div>
              <div 
                className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-colors"
                style={{
                  backgroundColor: `rgba(${stat.glowRgb}, 0.1)`,
                }}
              >
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
