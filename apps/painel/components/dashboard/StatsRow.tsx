import React from 'react';
import { Monitor, Wifi, WifiOff, Tv } from 'lucide-react';
import { Display, Device } from '../../types';
import { moverSpotlight } from '../../lib/spotlight';

interface StatsRowProps {
  displays: Display[];
  devices: Device[];
}

export const StatsRow: React.FC<StatsRowProps> = ({ displays, devices }) => {
  const totalDisplays = displays.length;

  const onlineDisplays = displays.filter(display =>
    devices
      .filter(d => d.display_id === display.id)
      .some(d => d.online)
  ).length;

  const offlineDisplays = totalDisplays - onlineDisplays;
  const totalDevices = devices.filter(d => d.status === 'linked').length;

  const stats = [
    {
      label: 'Total',
      value: totalDisplays,
      color: 'var(--tinta)',
      icon: <Monitor size={13} className="text-marca" />,
    },
    {
      label: 'Online',
      value: onlineDisplays,
      color: 'var(--ok)',
      icon: <Wifi size={13} className="text-ok" />,
    },
    {
      label: 'Offline',
      value: offlineDisplays,
      // Fora do ar é TV desligada, não erro: tinta-3, sem vermelho.
      color: 'var(--tinta-3)',
      icon: <WifiOff size={13} className="text-tinta-3" />,
    },
    {
      label: 'TVs',
      value: totalDevices,
      color: 'var(--tinta)',
      icon: <Tv size={13} className="text-marca" />,
    },
  ];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {stats.map((stat, i) => (
        <div
          key={i}
          // fx-spotlight: mesmo brilho que segue o mouse dos cards de tela,
          // com raio menor porque o cartão de número é pequeno.
          className="fx-spotlight flex items-center gap-1.5 rounded-md border border-borda bg-papel px-2.5 py-1"
          onPointerMove={moverSpotlight}
          style={{
            ['--spot-size' as string]: '90px',
          } as React.CSSProperties}
        >
          {stat.icon}
          <span className="text-[13px] font-medium text-tinta-2 leading-none">{stat.label}</span>
          <span className="font-mono text-sm font-semibold tabular-nums leading-none" style={{ color: stat.color }}>{stat.value}</span>
        </div>
      ))}
    </div>
  );
};
