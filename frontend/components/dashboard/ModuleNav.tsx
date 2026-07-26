import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, FileImage, Users as UsersIcon, Settings, BarChart3 } from 'lucide-react';
import { User } from '../../types';
import { Button } from '../ui/button';

interface ModuleNavProps {
  currentUser: User | null;
  onOpenMediaLibrary: () => void;
  onOpenUserManagement: () => void;
  onOpenEmailSettings: () => void;
}

export const ModuleNav: React.FC<ModuleNavProps> = ({
  currentUser,
  onOpenMediaLibrary,
  onOpenUserManagement,
  onOpenEmailSettings,
}) => {
  const navigate = useNavigate();
  const currentHash = window.location.hash;

  const isRouteActive = (route: string) => currentHash.startsWith(route);

  const getNavItemClass = (active: boolean) => {
    return `flex items-center gap-2 px-1 h-[44px] font-bold text-[11.5px] uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border-b-[3px] rounded-none hover:bg-transparent ${
      active ? 'text-[#0ea5e9] border-[#0ea5e9]' : 'text-slate-500 border-transparent hover:text-slate-300'
    }`;
  };

  return (
    <div
      className="flex gap-6 items-center relative z-10 w-full overflow-x-auto scrollbar-none px-4"
      style={{
        background: 'transparent',
        borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.07))',
        height: '46px',
        marginBottom: '24px'
      }}
    >
      <span
        className="uppercase tracking-widest mr-2 hidden md:inline border-r pr-4 h-[18px] flex items-center shrink-0 font-bold"
        style={{
          fontSize: '9.5px',
          color: 'var(--txt3)',
          borderColor: 'var(--border)'
        }}
      >
        MÓDULOS
      </span>

      <Button
        variant="ghost"
        onClick={() => navigate('/scheduler')}
        className={getNavItemClass(isRouteActive('#/scheduler') || currentHash === '#/')}
      >
        <Calendar size={14} className={isRouteActive('#/scheduler') || currentHash === '#/' ? 'text-[#0ea5e9]' : ''} />
        <span className="hidden min-[681px]:inline">Central de Programação</span>
      </Button>

      <Button
        variant="ghost"
        onClick={onOpenMediaLibrary}
        className={getNavItemClass(false)}
      >
        <FileImage size={14} />
        <span className="hidden min-[681px]:inline">Mídia</span>
      </Button>

      <Button
        variant="ghost"
        onClick={onOpenUserManagement}
        className={getNavItemClass(false)}
      >
        <UsersIcon size={14} />
        <span className="hidden min-[681px]:inline">Usuários</span>
      </Button>

      <Button
        variant="ghost"
        onClick={() => navigate('/reports')}
        className={getNavItemClass(isRouteActive('#/reports'))}
      >
        <BarChart3 size={14} className={isRouteActive('#/reports') ? 'text-[#0ea5e9]' : ''} />
        <span className="hidden min-[681px]:inline">Relatórios</span>
      </Button>

      {(currentUser?.role === 'admin' || currentUser?.role === 'master') && (
        <Button
          variant="ghost"
          onClick={onOpenEmailSettings}
          className={getNavItemClass(false)}
        >
          <Settings size={14} />
          <span className="hidden min-[681px]:inline">Config. E-mail</span>
        </Button>
      )}
    </div>
  );
};
