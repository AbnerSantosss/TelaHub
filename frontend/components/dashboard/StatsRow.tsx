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
      icon: <Monitor className="text-accent size-5" />,
      glowColor: 'rgba(56, 189, 248, 0.15)',
    },
    {
      label: 'Telas Online',
      value: onlineDisplays,
      icon: <Wifi className="text-success size-5" />,
      glowColor: 'rgba(52, 211, 153, 0.15)',
    },
    {
      label: 'Telas Offline',
      value: offlineDisplays,
      icon: <WifiOff className="text-danger size-5" />,
      glowColor: 'rgba(248, 113, 113, 0.15)',
    },
    {
      label: 'TVs Vinculadas',
      value: totalDevices,
      icon: <Tv className="text-violet size-5" />,
      glowColor: 'rgba(232, 121, 249, 0.15)',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 relative z-10">
      {stats.map((stat, i) => (
        <motion.div
          key={i}
          variants={cardItem}
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Card className="border border-border bg-surface backdrop-blur-md overflow-hidden relative group hover:border-accent-2/30 transition-all duration-300">
            {/* Subtle background glow on hover */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 100% 0%, ${stat.glowColor} 0%, transparent 60%)`
              }}
            />
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-black text-text-muted uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-3xl font-black text-text tracking-tight">{stat.value}</h3>
              </div>
              <div className="p-3 rounded-xl bg-gray-950/40 border border-white/5 group-hover:border-white/10 transition-colors">
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
