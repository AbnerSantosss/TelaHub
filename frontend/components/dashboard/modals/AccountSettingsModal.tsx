import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogClose 
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { 
  Settings, 
  X, 
  XCircle, 
  CheckCircle, 
  Pencil, 
  Check, 
  Mail, 
  KeyRound, 
  Loader2 
} from 'lucide-react';
import { User } from '../../../types';

interface AccountSettingsModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: User | null;
  accountEmail: string;
  setAccountEmail: (value: string) => void;
  currentPassword: string;
  setCurrentPassword: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  editName: string;
  setEditName: (value: string) => void;
  isEditingName: boolean;
  setIsEditingName: (value: boolean) => void;
  accountError: string;
  accountSuccess: string;
  accountActionLoading: boolean;
  smtpConfigured: boolean;
  onUpdateEmail: (e: React.FormEvent) => void;
  onUpdateName: () => void;
  onChangePassword: (e: React.FormEvent) => void;
  onSendResetEmail: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  open,
  onClose,
  currentUser,
  accountEmail,
  setAccountEmail,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  editName,
  setEditName,
  isEditingName,
  setIsEditingName,
  accountError,
  accountSuccess,
  accountActionLoading,
  smtpConfigured,
  onUpdateEmail,
  onUpdateName,
  onChangePassword,
  onSendResetEmail,
}) => {
  if (!currentUser) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent 
        showCloseButton={false}
        className="sm:max-w-lg max-w-lg max-h-[90vh] overflow-y-auto flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Settings className="text-[#38bdf8]" size={20} /> Configurações de Conta
          </h2>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
              <X size={18} />
            </Button>
          </DialogClose>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 min-h-0 overflow-y-auto space-y-5">
          {/* Notifications */}
          {accountError && (
            <div className="rounded-xl p-3.5 flex items-start gap-2.5" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>
              <XCircle className="text-[#f87171] shrink-0 mt-0.5" size={16} />
              <p className="text-[#f87171] text-xs leading-relaxed font-bold">{accountError}</p>
            </div>
          )}
          {accountSuccess && (
            <div className="rounded-xl p-3.5 flex items-start gap-2.5" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}>
              <CheckCircle className="text-[#34d399] shrink-0 mt-0.5" size={16} />
              <p className="text-[#34d399] text-xs leading-relaxed font-bold">{accountSuccess}</p>
            </div>
          )}

          {/* User Profile Card */}
          <div className="p-5 rounded-xl space-y-3" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--color-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider pl-0.5" style={{ color: 'var(--color-text-muted)' }}>Perfil do Usuário</p>
            <div className="flex justify-between items-center text-xs">
              <span style={{ color: 'var(--color-text-muted)' }}>Nome de Exibição:</span>
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter') onUpdateName(); 
                      if (e.key === 'Escape') setIsEditingName(false); 
                    }}
                    className="w-36 h-8 rounded-lg text-xs"
                    style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(56,189,248,0.3)', color: 'var(--color-text)' }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={onUpdateName}
                    disabled={accountActionLoading}
                    className="size-7 text-[#34d399] hover:bg-[#34d399]/10 rounded-md"
                    title="Salvar"
                  >
                    <Check size={14} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { 
                      setIsEditingName(false); 
                      setEditName(currentUser.name || currentUser.username); 
                    }}
                    className="size-7 rounded-md"
                    style={{ color: 'var(--color-text-muted)' }}
                    title="Cancelar"
                  >
                    <X size={12} />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold" style={{ color: 'var(--color-text)' }}>{currentUser.name || currentUser.username}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { 
                      setEditName(currentUser.name || currentUser.username); 
                      setIsEditingName(true); 
                    }}
                    className="size-6 hover:text-[#38bdf8] rounded-md"
                    style={{ color: 'var(--color-text-muted)' }}
                    title="Editar nome"
                  >
                    <Pencil size={12} />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span style={{ color: 'var(--color-text-muted)' }}>Permissão:</span>
              <span className="font-mono text-[10px] px-2.5 py-0.5 rounded uppercase tracking-wider font-bold" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                {currentUser.role === 'master' ? 'Owner (Dono)' : currentUser.role === 'admin' ? 'Administrador' : 'Operador'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span style={{ color: 'var(--color-text-muted)' }}>E-mail Cadastrado:</span>
              <span className="font-bold truncate max-w-[200px]" style={{ color: 'var(--color-text)' }}>{currentUser.email || 'Nenhum'}</span>
            </div>
          </div>

          {/* Master Only: Configure Master Email */}
          {currentUser.role === 'master' && (
            <form onSubmit={onUpdateEmail} className="space-y-3.5 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              <h4 className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5 pl-0.5">
                <Mail size={14} /> Configurar E-mail Principal do Sistema
              </h4>
              <p className="text-[11px] leading-relaxed pl-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Como proprietário do sistema, você pode atualizar o endereço de e-mail administrativo principal.
              </p>
              <div className="flex gap-2.5">
                <Input
                  type="email"
                  required
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  className="flex-1 h-10 rounded-xl text-xs"
                  style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  placeholder="novo-email@exemplo.com"
                />
                <Button
                  type="submit"
                  variant="brand"
                  disabled={accountActionLoading}
                  className="h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                >
                  {accountActionLoading ? 'Salvando...' : 'Atualizar'}
                </Button>
              </div>
            </form>
          )}

          {/* Change Password */}
          <form onSubmit={onChangePassword} className="space-y-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 pl-0.5" style={{ color: 'var(--color-text)' }}>
              <KeyRound size={14} className="text-[#38bdf8]" /> Alterar Senha de Acesso
            </h4>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase block pl-0.5" style={{ color: 'var(--color-text-muted)' }}>Senha Atual</label>
                <Input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-10 rounded-xl text-xs"
                  style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  placeholder="••••••••"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase block pl-0.5" style={{ color: 'var(--color-text-muted)' }}>Nova Senha</label>
                  <Input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-10 rounded-xl text-xs"
                    style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                    placeholder="Mín. 6 caracteres"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase block pl-0.5" style={{ color: 'var(--color-text-muted)' }}>Confirmar Nova Senha</label>
                  <Input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-10 rounded-xl text-xs"
                    style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onSendResetEmail}
                disabled={accountActionLoading || !smtpConfigured}
                className="w-full sm:w-auto text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-transparent p-0 justify-start hover:bg-transparent hover:text-[#38bdf8]"
                style={{ color: 'var(--color-text-muted)' }}
                title={!smtpConfigured ? 'Configure o SMTP para redefinir por e-mail' : ''}
              >
                <Mail size={12} /> Solicitar redefinição por e-mail
              </Button>
              <Button
                type="submit"
                variant="brand"
                disabled={accountActionLoading}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                {accountActionLoading ? 'Salvando...' : 'Salvar Nova Senha'}
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 flex justify-end" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
