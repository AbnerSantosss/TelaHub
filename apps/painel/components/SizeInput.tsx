import React from 'react';

interface SizeInputProps {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  isFont?: boolean;
}

export const SizeInput: React.FC<SizeInputProps> = ({ 
  label, 
  value, 
  onChange, 
  placeholder = '0px',
  min = 0,
  max = 100,
  step = 1,
  isFont = false
}) => {
  // Extract number and unit
  const parseValue = (val: string | undefined) => {
    if (!val) {
      const match = placeholder.match(/^([\d.]+)([a-z%]+)$/);
      if (match) {
        return { num: parseFloat(match[1]), unit: match[2] };
      }
      return { num: isFont ? 16 : 0, unit: 'px' };
    }
    const match = val.match(/^([\d.]+)([a-z%]+)$/);
    if (match) {
      return { num: parseFloat(match[1]), unit: match[2] };
    }
    const num = parseFloat(val);
    return { num: isNaN(num) ? (isFont ? 16 : 0) : num, unit: 'px' };
  };

  const { num, unit } = parseValue(value);
  const isCqw = unit === 'cqw' || unit === 'vw';
  
  const rangeMin = isFont ? (isCqw ? 0.5 : 8) : (isCqw ? 0 : min);
  const rangeMax = isFont ? (isCqw ? 15 : 120) : (isCqw ? 10 : max);
  const rangeStep = isCqw ? 0.1 : step;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onChange(`${val}${unit || 'px'}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      onChange(`${val}${unit || 'px'}`);
    } else {
      onChange('');
    }
  };

  const toggleUnit = () => {
    const newUnit = unit === 'cqw' ? 'px' : 'cqw';
    let newNum = num;
    if (unit === 'cqw' && newUnit === 'px') newNum = Math.round(num * 16); 
    if (unit === 'px' && newUnit === 'cqw') newNum = Math.round((num / 16) * 10) / 10;
    onChange(`${newNum}${newUnit}`);
  };

  return (
    <div className="flex flex-col gap-1.5 bg-slate-950/40 p-2 rounded-lg border border-slate-800/80 hover:border-slate-700/50 transition-all">
      <div className="flex items-center justify-between">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</label>
        <button 
          type="button"
          onClick={toggleUnit}
          className="text-[8px] font-bold text-slate-500 bg-slate-900/80 px-1.5 py-0.5 rounded hover:text-cyan-400 hover:bg-slate-800 transition-all uppercase tracking-wider border border-slate-800/60"
          title="Alternar unidade (px/cqw)"
        >
          {unit || 'px'}
        </button>
      </div>
      
      {/* Slider */}
      <input 
        type="range"
        min={rangeMin}
        max={rangeMax}
        step={rangeStep}
        value={num}
        onChange={handleSliderChange}
        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
      />
      
      {/* Pixel Input below the slider */}
      <div className="flex items-center gap-1 mt-1 bg-slate-950/80 border border-slate-800 rounded px-2 py-0.5 group focus-within:border-cyan-500/50 transition-colors">
        <input 
          type="number" 
          value={num}
          onChange={handleInputChange}
          className="flex-1 bg-transparent text-left text-[11px] text-slate-200 outline-none font-mono min-w-0"
          placeholder="Ex: 12"
        />
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{unit || 'px'}</span>
      </div>
    </div>
  );
};
