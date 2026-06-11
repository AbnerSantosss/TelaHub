import React from 'react';
import { Plus, RefreshCw, LogOut, Tv } from 'lucide-react';
import { User } from '../../types';
import { Button } from '../ui/button';

interface TopBarProps {
  currentUser: User | null;
  loading: boolean;
  onLinkTv: () => void;
  onCreateDisplay: () => void;
  onRefresh: () => void;
  onLogout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  loading,
  onLinkTv,
  onCreateDisplay,
  onRefresh,
  onLogout,
}) => {
  return (
    <div 
      className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 rounded-2xl relative z-10"
      style={{
        background: 'var(--color-surface, rgba(255,255,255,0.025))',
        border: '1px solid var(--color-border, rgba(255,255,255,0.07))',
        padding: '13px 20px',
        marginBottom: '12px'
      }}
    >
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Designer Logo */}
        <div className="grid grid-cols-2 gap-[3px] w-[36px] h-[36px] flex-shrink-0">
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
            className="mt-1 font-medium flex items-center gap-1.5 whitespace-nowrap"
            style={{
              color: 'var(--txt3)',
              fontSize: '10.5px',
              letterSpacing: '0.06em'
            }}
          >
            Bem-vindo, {currentUser?.username || 'admin'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
        <Button
          variant="outline"
          onClick={onLinkTv}
          className="hidden min-[681px]:flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider btn-tb-outline"
        >
          <Tv size={14} /> <span>Vincular TV</span>
        </Button>

        <Button
          variant="brand"
          onClick={onCreateDisplay}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-white btn-tb-primary disabled:opacity-50"
        >
          <Plus size={16} strokeWidth={3} className="text-white" /> <span>Nova Tela</span>
        </Button>

        <div className="h-6 w-px bg-border mx-1 hidden lg:block" style={{ backgroundColor: 'var(--border)' }}></div>

        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          className="flex items-center justify-center w-[34px] h-[34px] touch-target-48 rounded-[10px] btn-tb-outline"
          title="Atualizar lista"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-accent' : ''} />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onLogout}
          className="flex items-center justify-center w-[34px] h-[34px] touch-target-48 rounded-[10px] btn-tb-danger"
          title="Sair"
        >
          <LogOut size={14} />
        </Button>
      </div>
    </div>
  );
};
