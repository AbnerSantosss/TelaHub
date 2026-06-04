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

  return (
    <div className="bg-gray-950/40 px-6 py-3 flex gap-2 overflow-x-auto scrollbar-none items-center border-t border-border/40">
      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest mr-2.5 hidden md:inline">Módulos:</span>

      <Button
        variant="ghost"
        onClick={() => navigate('/scheduler')}
        className="flex items-center gap-2 bg-gray-950/40 border border-sky-500/15 hover:border-sky-500/50 text-sky-400 hover:bg-sky-500/10 px-3.5 py-1.5 h-auto rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap"
      >
        <Calendar size={13} /> <span>Central de Programação</span>
      </Button>

      <Button
        variant="ghost"
        onClick={onOpenMediaLibrary}
        className="flex items-center gap-2 bg-gray-950/40 border border-fuchsia-500/15 hover:border-fuchsia-500/50 text-fuchsia-400 hover:bg-fuchsia-500/10 px-3.5 py-1.5 h-auto rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap"
      >
        <FileImage size={13} /> <span>Mídia</span>
      </Button>

      <Button
        variant="ghost"
        onClick={onOpenUserManagement}
        className="flex items-center gap-2 bg-gray-950/40 border border-emerald-500/15 hover:border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 px-3.5 py-1.5 h-auto rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap"
      >
        <UsersIcon size={13} /> <span>Usuários</span>
      </Button>

      {(currentUser?.role === 'admin' || currentUser?.role === 'master') && (
        <Button
          variant="ghost"
          onClick={onOpenEmailSettings}
          className="flex items-center gap-2 bg-gray-950/40 border border-accent/15 hover:border-accent/50 text-accent hover:bg-accent/10 px-3.5 py-1.5 h-auto rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap"
        >
          <Settings size={13} /> <span>Config. E-mail</span>
        </Button>
      )}
    </div>
  );
};
