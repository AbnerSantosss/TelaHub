import React from 'react';
import { Plus, RefreshCw, LogOut, Tv } from 'lucide-react';
import { User } from '../../types';
import { LogoHub } from '../Login';
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
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-6 gap-5 border-b border-border bg-gray-950/20">
      <div className="flex items-center gap-4 flex-shrink-0">
        <LogoHub size={40} className="drop-shadow-[0_0_12px_rgba(56,189,248,0.2)] flex-shrink-0" />
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-black text-text tracking-tight uppercase leading-none">
            Tela<span className="text-accent">Hub</span>
          </h1>
          <p className="text-text-muted text-xs mt-1.5 font-medium flex items-center gap-1.5 whitespace-nowrap">
            Bem-vindo, <span className="text-text font-bold">{currentUser?.username || '...'}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
        <Button
          variant="outline"
          onClick={onLinkTv}
          className="flex items-center gap-2 bg-gray-950/40 border border-accent/20 text-accent hover:bg-accent/10 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
        >
          <Tv size={14} /> <span>Vincular TV</span>
        </Button>

        <Button
          variant="brand"
          onClick={onCreateDisplay}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold transition-all disabled:opacity-50"
        >
          <Plus size={16} strokeWidth={3} className="text-white" /> <span>Nova Tela</span>
        </Button>

        <div className="h-6 w-px bg-border mx-1 hidden lg:block"></div>

        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          className="flex items-center justify-center size-9 bg-gray-950/40 text-text-muted border border-border hover:border-accent-2/50 rounded-xl transition-all"
          title="Atualizar lista"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-accent' : ''} />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onLogout}
          className="flex items-center justify-center size-9 bg-gray-950/40 hover:bg-rose-500/10 border border-border text-text-muted hover:text-danger hover:border-danger/30 rounded-xl transition-all"
          title="Sair"
        >
          <LogOut size={14} />
        </Button>
      </div>
    </div>
  );
};
