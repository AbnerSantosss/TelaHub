import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, FileImage, Users as UsersIcon, Settings, BarChart3, Tv, CreditCard } from 'lucide-react';
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
    // Abas como os links da navbar do site: 15px, peso 600, sem caixa alta.
    // Ativa = marca com o traço de 2px embaixo; as outras em tinta-2.
    return `flex items-center gap-2 px-1 h-11 font-semibold text-[15px] transition-colors whitespace-nowrap cursor-pointer border-b-2 rounded-none hover:bg-transparent ${
      active ? 'text-marca border-marca' : 'text-tinta-2 border-transparent hover:text-marca'
    }`;
  };

  return (
    // O rótulo "MÓDULOS" antes das abas saiu: era um kicker em 9,5px que não
    // dizia nada que as próprias abas não digam.
    <nav
      aria-label="Módulos do painel"
      className="relative z-10 mb-6 flex h-12 w-full items-end gap-6 overflow-x-auto border-b border-borda px-1 scrollbar-none"
    >

      <Button
        variant="ghost"
        onClick={() => navigate('/scheduler')}
        className={getNavItemClass(isRouteActive('#/scheduler') || currentHash === '#/')}
      >
        <Calendar size={14} className={isRouteActive('#/scheduler') || currentHash === '#/' ? 'text-marca' : ''} />
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
        <BarChart3 size={14} className={isRouteActive('#/reports') ? 'text-marca' : ''} />
        <span className="hidden min-[681px]:inline">Relatórios</span>
      </Button>

      {/* Ativação: o caminho de volta para "Conecte sua TV". Antes o vínculo só
          existia dentro de um modal do topo — quem fechasse o modal não achava
          mais. Conectar mais uma TV é operação recorrente, não de instalação. */}
      <Button
        variant="ghost"
        onClick={() => navigate('/conecte-sua-tv')}
        className={getNavItemClass(isRouteActive('#/conecte-sua-tv'))}
      >
        <Tv size={14} className={isRouteActive('#/conecte-sua-tv') ? 'text-marca' : ''} />
        <span className="hidden min-[681px]:inline">Conectar TV</span>
      </Button>

      {/* Assinatura fica no menu, e não escondida em "minha conta": cancelamento
          difícil de achar é problema de CDC, não de navegação. */}
      <Button
        variant="ghost"
        onClick={() => navigate('/assinatura')}
        className={getNavItemClass(isRouteActive('#/assinatura'))}
      >
        <CreditCard size={14} className={isRouteActive('#/assinatura') ? 'text-marca' : ''} />
        <span className="hidden min-[681px]:inline">Assinatura</span>
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
    </nav>
  );
};
