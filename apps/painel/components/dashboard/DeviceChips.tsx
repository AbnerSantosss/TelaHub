import React from 'react';
import { Tv } from 'lucide-react';
import { Device, Display } from '../../types';

interface DeviceChipsProps {
  devices: Device[];
  displays: Display[];
}

export const DeviceChips: React.FC<DeviceChipsProps> = ({ devices, displays }) => {
  const linked = devices.filter(d => d.status === 'linked');

  if (linked.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[9px] uppercase tracking-widest font-bold text-slate-600 mr-0.5">TVs:</span>
      {linked.map(device => {
        const isOnline = device.online;
        const linkedDisplay = displays.find(d => d.id === device.display_id);

        return (
          <div
            key={device.id}
            title={linkedDisplay ? `Exibindo: ${linkedDisplay.name}` : 'Sem conteúdo'}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md cursor-default"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background: isOnline ? '#22c55e' : '#475569',
                boxShadow: isOnline ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
              }}
            />
            <Tv size={10} className="text-slate-500 flex-shrink-0" />
            <span className="text-[10px] font-medium text-slate-400 leading-none max-w-[80px] truncate">
              {device.name || 'TV'}
            </span>
          </div>
        );
      })}
    </div>
  );
};
