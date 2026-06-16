import React from 'react';
import { Plus, RefreshCw, LogOut, Tv, Monitor } from 'lucide-react';
import { User, Display, Device } from '../../types';
import { Button } from '../ui/button';

interface TopBarProps {
  currentUser: User | null;
  loading: boolean;
  displays?: Display[];
  devices?: Device[];
  onLinkTv: () => void;
  onCreateDisplay: () => void;
  onRefresh: () => void;
  onLogout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  loading,
  displays = [],
  devices = [],
  onLinkTv,
  onCreateDisplay,
  onRefresh,
  onLogout,
}) => {
  const totalDisplays = displays.length;

  const onlineDisplays = displays.filter(display =>
    devices
      .filter(d => d.display_id === display.id)
      .some(d => (Date.now() - d.last_seen) < 60000)
  ).length;

  const offlineDisplays = totalDisplays - onlineDisplays;
  const totalDevices = devices.filter(d => d.status === 'linked').length;

  return (
    <div
      className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 rounded-2xl relative z-10 w-full"
      style={{
        background: 'var(--color-surface, rgba(255,255,255,0.025))',
        border: '1px solid var(--color-border, rgba(255,255,255,0.07))',
        padding: '12px 20px',
        marginBottom: '12px'
      }}
    >
      {/* 1. Logo */}
      <div className="flex items-center gap-3 flex-shrink-0 w-full lg:w-auto justify-between lg:justify-start">
        <div className="flex items-center gap-3">
          <div className="grid grid-cols-2 gap-[3px] w-[32px] h-[32px] flex-shrink-0">
            <div className="bg-[#0ea5e9] rounded-[2px]"></div>
            <div className="bg-[#0ea5e9]/35 rounded-[2px]"></div>
            <div className="bg-[#0ea5e9]/35 rounded-[2px]"></div>
            <div className="bg-[#2563eb] rounded-[2px]"></div>
          </div>
          <div className="flex-shrink-0">
            <h1 className="text-xl font-normal text-[#eaf2ff] tracking-tight uppercase leading-none">
              TELA<span className="font-extrabold text-[#0ea5e9]">HUB</span>
            </h1>
            <p
              className="mt-0.5 font-medium whitespace-nowrap"
              style={{
                color: 'var(--txt3)',
                fontSize: '10px',
                letterSpacing: '0.06em'
              }}
            >
              Bem-vindo, {currentUser?.username || 'admin'}
            </p>
          </div>
        </div>

        {/* Refresh Action for Mobile Only - keeps top bar balanced */}
        <div className="lg:hidden flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            className="flex items-center justify-center w-[32px] h-[32px] rounded-xl border-white/10 hover:bg-white/5 text-slate-400 hover:text-slate-200"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-[#0ea5e9]' : ''} />
          </Button>
        </div>
      </div>

      {/* 2. STATS (Minimalist & Responsive) */}
      <div className="flex items-center gap-2.5 flex-wrap flex-1 lg:justify-center w-full lg:w-auto">
        {/* Telas */}
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1">
          <Monitor size={12} className="text-[#0ea5e9]" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Telas:</span>
          <span className="text-[11px] font-bold text-white">{totalDisplays}</span>
        </div>

        {/* TVs Vinculadas */}
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1">
          <Tv size={12} className="text-[#a855f7]" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">TVs:</span>
          <span className="text-[11px] font-bold text-white">{totalDevices}</span>
        </div>

        {/* Online */}
        <div className="flex items-center gap-1.5 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg px-2.5 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
          <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Online:</span>
          <span className="text-[11px] font-bold text-[#22c55e]">{onlineDisplays}</span>
        </div>

        {/* Offline */}
        <div className="flex items-center gap-1.5 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-2.5 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
          <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Offline:</span>
          <span className="text-[11px] font-bold text-[#ef4444]">{offlineDisplays}</span>
        </div>
      </div>

      {/* 3. Actions */}
      <div className="flex items-center gap-2 flex-shrink-0 w-full lg:w-auto justify-end border-t border-white/5 lg:border-t-0 pt-3 lg:pt-0">
        <Button
          variant="outline"
          onClick={onLinkTv}
          className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs uppercase tracking-wider btn-tb-outline border-white/10"
        >
          <Tv size={13} className="text-slate-400" />
          <span className="text-slate-300">Vincular</span>
        </Button>

        <Button
          variant="brand"
          onClick={onCreateDisplay}
          disabled={loading}
          className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold text-slate-900 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:opacity-50 text-xs"
        >
          <Plus size={14} strokeWidth={3} />
          <span>Nova Tela</span>
        </Button>

        <div className="hidden lg:block h-5 w-px bg-white/10 mx-0.5" />

        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          className="hidden lg:flex items-center justify-center w-[32px] h-[32px] rounded-xl border-white/10 hover:bg-white/5 text-slate-400 hover:text-slate-200"
          title="Atualizar lista"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-[#0ea5e9]' : ''} />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onLogout}
          className="flex items-center justify-center w-[32px] h-[32px] rounded-xl border-white/10 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 flex-shrink-0"
          title="Sair"
        >
          <LogOut size={13} />
        </Button>
      </div>
    </div>
  );
};
