import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, FileImage, Users as UsersIcon, Settings } from 'lucide-react';
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
    return `flex items-center gap-2 px-3.5 py-1 h-[32px] rounded-xl font-semibold text-[11.5px] uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${active ? 'nav-item-dashboard active' : 'nav-item-dashboard'
      }`;
  };

  return (
    <div
      className="flex gap-2 items-center relative z-10 w-full overflow-x-auto scrollbar-none"
      style={{
        background: 'var(--color-surface, rgba(255,255,255,0.025))',
        border: '1px solid var(--color-border, rgba(255,255,255,0.07))',
        borderRadius: '14px',
        height: '46px',
        padding: '5px 16px',
        marginBottom: '16px'
      }}
    >
      <span
        className="uppercase tracking-widest mr-2.5 hidden md:inline border-r pr-3 h-[18px] flex items-center shrink-0"
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
        className={getNavItemClass(isRouteActive('#/scheduler'))}
      >
        {isRouteActive('#/scheduler') && (
          <span className="w-[6px] h-[6px] rounded-full bg-[#0ea5e9] shrink-0"></span>
        )}
        <Calendar size={13} />
        <span className="hidden min-[681px]:inline">Central de Programação</span>
      </Button>

      <Button
        variant="ghost"
        onClick={onOpenMediaLibrary}
        className={getNavItemClass(false)}
      >
        <FileImage size={13} />
        <span className="hidden min-[681px]:inline">Mídia</span>
      </Button>

      <Button
        variant="ghost"
        onClick={onOpenUserManagement}
        className={getNavItemClass(false)}
      >
        <UsersIcon size={13} />
        <span className="hidden min-[681px]:inline">Usuários</span>
      </Button>

      {(currentUser?.role === 'admin' || currentUser?.role === 'master') && (
        <Button
          variant="ghost"
          onClick={onOpenEmailSettings}
          className={getNavItemClass(false)}
        >
          <Settings size={13} />
          <span className="hidden min-[681px]:inline">Config. E-mail</span>
        </Button>
      )}
    </div>
  );
};
