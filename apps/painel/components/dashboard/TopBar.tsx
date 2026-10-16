import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const totalDisplays = displays.length;

  const onlineDisplays = displays.filter(display =>
    devices
      .filter(d => d.display_id === display.id)
      .some(d => d.online)
  ).length;

  const offlineDisplays = totalDisplays - onlineDisplays;
  const totalDevices = devices.filter(d => d.status === 'linked').length;

  // Pílula de contagem. Rótulo em tinta-2 e número em Geist Mono: os quatro
  // números lado a lado se leem como uma régua, sem cor de destaque em cada um.
  const pilula =
    'inline-flex items-center gap-2 rounded-md border border-borda bg-papel-2 px-2.5 py-1.5 text-[13px]';
  const rotulo = 'font-medium text-tinta-2';
  const numero = 'font-mono text-sm font-semibold tabular-nums';
  // Botões de ícone: 44px no celular (alvo de toque), 36px a partir de lg. Sem
  // `flex` aqui: quem usa decide o display. Com ele, o `hidden lg:flex` do
  // "Atualizar" perdia para o `flex` e o botão aparecia duas vezes no celular,
  // espremendo o "Conectar TV" até cortar o texto em 360px.
  const botaoIcone =
    'items-center justify-center size-11 lg:size-9 rounded-lg border-borda-2 bg-papel text-tinta-2 hover:bg-papel-2 hover:text-tinta';

  return (
    // Mesma barra da landing (apps/site Navbar.css): papel, borda fina e a
    // sombra da navbar. Aqui fica dentro do container, por isso tem raio.
    <div className="relative z-10 mb-3 flex w-full flex-col items-start justify-between gap-4 rounded-xl border border-borda bg-papel px-4 py-3 shadow-navbar sm:px-5 lg:flex-row lg:items-center">
      {/* 1. Marca */}
      <div className="flex w-full flex-shrink-0 items-center justify-between gap-3 lg:w-auto lg:justify-start">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border-0 bg-transparent p-0 text-left"
          title="Ir para o início"
          aria-label="Ir para o início"
        >
          {/* O mesmo quadrado da navbar do site: marca com a TV em traço claro. */}
          <span className="inline-flex size-8 flex-none items-center justify-center rounded-md bg-marca" aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--papel)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="5" width="20" height="13" rx="2" />
              <path d="M8 22h8M12 18v4" />
            </svg>
          </span>
          <span className="flex-shrink-0">
            <span className="block text-lg font-extrabold leading-none tracking-[-0.01em] text-tinta">
              TelaHub
            </span>
            <span className="mt-1 block whitespace-nowrap text-[13px] font-medium text-tinta-3">
              Bem-vindo, {currentUser?.name?.trim().split(/\s+/)[0] || currentUser?.username || 'admin'}
            </span>
          </span>
        </button>

        {/* Atualizar no celular: mantém a barra equilibrada */}
        <div className="flex items-center gap-2 lg:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            className={`flex ${botaoIcone}`}
            title="Atualizar lista"
            aria-label="Atualizar lista"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-marca' : ''} />
          </Button>
        </div>
      </div>

      {/* 2. Contagens */}
      <div className="flex w-full flex-1 flex-wrap items-center gap-2 lg:w-auto lg:justify-center">
        <div className={pilula}>
          <Monitor size={14} className="text-marca" aria-hidden="true" />
          <span className={rotulo}>Telas</span>
          <span className={`${numero} text-tinta`}>{totalDisplays}</span>
        </div>

        <div className={pilula}>
          <Tv size={14} className="text-marca" aria-hidden="true" />
          <span className={rotulo}>TVs</span>
          <span className={`${numero} text-tinta`}>{totalDevices}</span>
        </div>

        {/* Verde só para o que está no ar. Fora do ar fica neutro: não é erro,
            é a TV desligada. */}
        <div className={pilula}>
          <span className="size-2 rounded-full bg-ok" aria-hidden="true" />
          <span className={rotulo}>Online</span>
          <span className={`${numero} text-ok`}>{onlineDisplays}</span>
        </div>

        <div className={pilula}>
          <span className="size-2 rounded-full border border-borda-3 bg-papel" aria-hidden="true" />
          <span className={rotulo}>Offline</span>
          <span className={`${numero} text-tinta-3`}>{offlineDisplays}</span>
        </div>
      </div>

      {/* 3. Ações */}
      <div className="flex w-full flex-shrink-0 items-center justify-end gap-2 border-t border-borda pt-3 lg:w-auto lg:border-t-0 lg:pt-0">
        {/* "Vincular" era jargão nosso: quem administra um condomínio ou uma
            clínica chama isso de conectar a TV. O botão agora leva à tela
            inteira de ativação, não a um modal. */}
        <Button
          variant="shimmer"
          onClick={onLinkTv}
          className="h-11 flex-1 gap-1.5 rounded-lg px-3 text-sm font-semibold lg:h-9 lg:flex-none"
        >
          <Tv size={15} />
          <span>Conectar TV</span>
        </Button>

        <Button
          variant="glow"
          onClick={onCreateDisplay}
          disabled={loading}
          className="h-11 flex-1 gap-1.5 rounded-lg px-4 text-sm font-semibold lg:h-9 lg:flex-none"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Nova Tela</span>
        </Button>

        <div className="mx-0.5 hidden h-5 w-px bg-borda lg:block" />

        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          className={`hidden lg:flex ${botaoIcone}`}
          title="Atualizar lista"
          aria-label="Atualizar lista"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin text-marca' : ''} />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onLogout}
          className={`flex flex-shrink-0 ${botaoIcone} hover:border-danger hover:text-danger`}
          title="Sair"
          aria-label="Sair"
        >
          <LogOut size={15} />
        </Button>
      </div>
    </div>
  );
};
