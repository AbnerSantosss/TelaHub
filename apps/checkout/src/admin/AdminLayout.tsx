/**
 * Shell do painel: topo escuro com busca (Ctrl+K) e sidebar clara.
 *
 * Duas ausências deliberadas em relação à referência do Yampi (DESIGN.md):
 * não há barra de progresso gamificada ("5/48") nem banner de oferta interna.
 * São mecânicas de retenção da plataforma deles e ocupariam o espaço mais
 * valioso da tela com algo que não ajuda quem opera o funil.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Clock,
  Hourglass,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShoppingCart,
  Undo2,
  X,
} from 'lucide-react';

import { getAdminToken } from '../lib/api';
import { clearAdminSession, getStoredUser } from './api';
import { cx } from './ui';

interface NavEntry {
  to: string;
  label: string;
  icon: ReactNode;
  /** Como decidir se está ativo: caminho exato, prefixo, ou caminho + filtro. */
  match: (pathname: string, search: URLSearchParams) => boolean;
}

const iconClass = 'h-[18px] w-[18px] shrink-0';

const PRIMARY: NavEntry[] = [
  {
    to: '/admin',
    label: 'Início',
    icon: <LayoutDashboard aria-hidden="true" className={iconClass} />,
    match: (pathname) => pathname === '/admin' || pathname === '/admin/',
  },
  {
    to: '/admin/sessions',
    label: 'Checkouts',
    icon: <ShoppingCart aria-hidden="true" className={iconClass} />,
    match: (pathname, search) => pathname.startsWith('/admin/sessions') && !search.get('status'),
  },
];

/** Grupo secundário: são recortes da mesma lista, não seções novas. */
const SECONDARY: NavEntry[] = [
  {
    to: '/admin/sessions?status=abandoned',
    label: 'Para recuperar',
    icon: <Undo2 aria-hidden="true" className={iconClass} />,
    match: (pathname, search) => pathname.startsWith('/admin/sessions') && search.get('status') === 'abandoned',
  },
  {
    to: '/admin/sessions?status=payment_pending',
    label: 'Aguardando pagamento',
    icon: <Hourglass aria-hidden="true" className={iconClass} />,
    match: (pathname, search) =>
      pathname.startsWith('/admin/sessions') && search.get('status') === 'payment_pending',
  },
  {
    to: '/admin/sessions?status=expired',
    label: 'Expirados',
    icon: <Clock aria-hidden="true" className={iconClass} />,
    match: (pathname, search) => pathname.startsWith('/admin/sessions') && search.get('status') === 'expired',
  },
];

const NavLinkItem = ({
  entry,
  active,
  onNavigate,
}: {
  entry: NavEntry;
  active: boolean;
  onNavigate?: () => void;
}) => (
  <Link
    to={entry.to}
    onClick={onNavigate}
    aria-current={active ? 'page' : undefined}
    className={cx(
      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
      active ? 'bg-nav text-white' : 'text-ink-muted hover:bg-app hover:text-ink'
    )}
  >
    {entry.icon}
    <span className="truncate">{entry.label}</span>
  </Link>
);

const NavTree = ({
  pathname,
  search,
  onNavigate,
}: {
  pathname: string;
  search: URLSearchParams;
  onNavigate?: () => void;
}) => (
  <nav aria-label="Seções do painel" className="flex flex-col gap-1 px-3">
    {PRIMARY.map((entry) => (
      <NavLinkItem
        key={entry.to}
        entry={entry}
        active={entry.match(pathname, search)}
        onNavigate={onNavigate}
      />
    ))}

    <p className="eyebrow mt-5 mb-1 px-3">Recuperação</p>
    {SECONDARY.map((entry) => (
      <NavLinkItem
        key={entry.to}
        entry={entry}
        active={entry.match(pathname, search)}
        onNavigate={onNavigate}
      />
    ))}
  </nav>
);

/**
 * Identidade no topo da sidebar. A referência tem um seletor de organização;
 * aqui não existe escolha a fazer — o funil é da plataforma inteira e só o
 * `master` o vê. Um seletor que não seleciona nada seria mentira de interface,
 * então isto é um rótulo, não um controle.
 */
const ScopeBadge = () => (
  <div className="mx-3 mb-4 rounded-lg border border-line bg-app px-3 py-2.5">
    <p className="text-[13px] font-bold text-ink">TelaHub</p>
    <p className="text-[11px] font-medium text-ink-subtle">Funil da plataforma</p>
  </div>
);

const UserFooter = ({ onLogout }: { onLogout: () => void }) => {
  const user = getStoredUser();
  return (
    <div className="mt-auto border-t border-line p-3">
      <div className="mb-2 flex items-center gap-2.5 px-1">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nav text-[13px] font-bold text-white"
        >
          {(user?.name ?? user?.username ?? '?').slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">{user?.name ?? user?.username ?? 'Operador'}</p>
          <p className="truncate text-[11px] text-ink-subtle">{user?.email ?? ''}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-app hover:text-ink"
      >
        <LogOut aria-hidden="true" className={iconClass} />
        Sair
      </button>
    </div>
  );
};

const AdminLayout = ({ children }: { children?: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const search = new URLSearchParams(location.search);

  // Ctrl+K (e Cmd+K no Mac) foca a busca — atalho previsto no DESIGN.md.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Navegar fecha a gaveta do mobile.
  useEffect(() => setDrawerOpen(false), [location.pathname, location.search]);

  const token = getAdminToken();
  if (!token) {
    return <Navigate to="/admin/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  const onSubmitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const value = term.trim();
    navigate(value ? `/admin/sessions?email=${encodeURIComponent(value)}` : '/admin/sessions');
  };

  const onLogout = () => {
    clearAdminSession();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-app">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 bg-nav px-3 sm:gap-4 sm:px-4">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir navegação"
          aria-expanded={drawerOpen}
          className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>

        <Link to="/admin" className="flex shrink-0 items-center gap-2">
          <span className="text-[15px] font-extrabold tracking-tight text-white">TelaHub</span>
          <span className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.14em] text-white/70 uppercase sm:inline">
            Checkout
          </span>
        </Link>

        <form onSubmit={onSubmitSearch} className="mx-auto w-full max-w-md" role="search">
          <label htmlFor="admin-topbar-search" className="sr-only">
            Buscar checkout por e-mail do lead
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40"
            />
            <input
              id="admin-topbar-search"
              ref={searchRef}
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Buscar pelo e-mail do lead"
              className="w-full rounded-lg border border-white/10 bg-white/10 py-2 pr-14 pl-9 text-sm text-white placeholder:text-white/40 focus:border-accent focus:bg-white/15 focus:outline-none"
            />
            <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border border-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white/50 sm:block">
              Ctrl+K
            </kbd>
          </div>
        </form>

        <span className="hidden shrink-0 text-[11px] font-bold tracking-[0.12em] text-white/40 uppercase sm:block">
          {getStoredUser()?.role === 'master' ? 'Master' : (getStoredUser()?.role ?? '')}
        </span>
      </header>

      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 flex-col border-r border-line bg-surface pt-4 lg:flex">
          <ScopeBadge />
          <NavTree pathname={location.pathname} search={search} />
          <UserFooter onLogout={onLogout} />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">{children ?? <Outlet />}</div>
        </main>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar navegação"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-nav/50"
          />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col bg-surface pt-4">
            <div className="mb-3 flex items-center justify-between px-4">
              <span className="text-sm font-extrabold text-ink">Navegação</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar navegação"
                className="rounded-lg p-1.5 text-ink-subtle hover:bg-app hover:text-ink"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <ScopeBadge />
            <NavTree pathname={location.pathname} search={search} onNavigate={() => setDrawerOpen(false)} />
            <UserFooter onLogout={onLogout} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
