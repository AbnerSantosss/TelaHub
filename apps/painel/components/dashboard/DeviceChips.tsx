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

  // Rótulos aqui eram de 9 px e 10 px. O sistema visual do produto define 12 px
  // como mínimo, e não é preciosismo: esta faixa é onde o dono do negócio
  // confere se a TV da recepção está no ar.
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-sm font-semibold text-tinta-2 mr-0.5">TVs:</span>
      {linked.map(device => {
        const isOnline = device.online;
        const linkedDisplay = displays.find(d => d.id === device.display_id);

        return (
          <div
            key={device.id}
            title={linkedDisplay ? `Exibindo: ${linkedDisplay.name}` : 'Sem conteúdo'}
            className="flex items-center gap-1.5 rounded-md border border-borda bg-papel px-2.5 py-1 cursor-default"
          >
            {/* No ar = ponto cheio verde; fora do ar = anel neutro. A forma muda
                junto com a cor, para não depender só do verde. */}
            <span
              aria-hidden="true"
              className={`size-2 rounded-full flex-shrink-0 ${
                isOnline ? 'bg-ok' : 'border border-borda-3 bg-papel'
              }`}
            />
            <span className="sr-only">{isOnline ? 'No ar:' : 'Fora do ar:'}</span>
            <Tv size={14} className="text-tinta-3 flex-shrink-0" aria-hidden="true" />
            <span className="text-[13px] font-medium text-tinta leading-none max-w-[140px] truncate">
              {device.name || 'TV'}
            </span>
          </div>
        );
      })}
    </div>
  );
};
