import React from 'react';
import { Monitor, Wifi, WifiOff, Tv } from 'lucide-react';
import { Display, Device } from '../../types';

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
      label: 'Total',
      value: totalDisplays,
      color: '#0ea5e9',
      icon: <Monitor size={11} className="text-[#0ea5e9]" />,
    },
    {
      label: 'Online',
      value: onlineDisplays,
      color: '#22c55e',
      icon: <Wifi size={11} className="text-[#22c55e]" />,
    },
    {
      label: 'Offline',
      value: offlineDisplays,
      color: '#ef4444',
      icon: <WifiOff size={11} className="text-[#ef4444]" />,
    },
    {
      label: 'TVs',
      value: totalDevices,
      color: '#0ea5e9',
      icon: <Tv size={11} className="text-[#0ea5e9]" />,
    },
  ];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {stat.icon}
          <span className="text-[10px] font-medium text-slate-500 leading-none">{stat.label}</span>
          <span className="text-[11px] font-bold leading-none" style={{ color: stat.color }}>{stat.value}</span>
        </div>
      ))}
    </div>
  );
};
