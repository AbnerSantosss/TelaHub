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
      <DialogContent className="max-w-lg border border-border bg-[#151926]/95 backdrop-blur-md p-0 overflow-hidden shadow-2xl rounded-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <DialogHeader className="p-6 border-b border-border bg-gray-950/20 flex flex-row items-center justify-between">
          <DialogTitle className="font-black text-lg text-text flex items-center gap-2">
            <Settings className="text-accent" size={20} /> Configurações de Conta
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-8 text-text-muted hover:text-danger rounded-lg">
              <X size={18} />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {/* Notifications */}
          {accountError && (
            <div className="bg-danger/10 border border-danger/25 rounded-xl p-3.5 flex items-start gap-2.5">
              <XCircle className="text-danger shrink-0 mt-0.5" size={16} />
              <p className="text-danger text-xs leading-relaxed font-bold">{accountError}</p>
            </div>
          )}
          {accountSuccess && (
            <div className="bg-success/10 border border-success/25 rounded-xl p-3.5 flex items-start gap-2.5">
              <CheckCircle className="text-success shrink-0 mt-0.5" size={16} />
              <p className="text-success text-xs leading-relaxed font-bold">{accountSuccess}</p>
            </div>
          )}

          {/* User Profile Card */}
          <div className="bg-gray-950/40 p-5 rounded-xl border border-border space-y-3">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider pl-0.5">Perfil do Usuário</p>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted">Nome de Exibição:</span>
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
                    className="bg-gray-950/60 border-accent/50 text-text w-36 h-8 rounded-lg text-xs"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={onUpdateName}
                    disabled={accountActionLoading}
                    className="size-7 text-success hover:bg-success/10 rounded-md"
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
                    className="size-7 text-text-muted hover:bg-gray-950 rounded-md"
                    title="Cancelar"
                  >
                    <X size={12} />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-text">{currentUser.name || currentUser.username}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { 
                      setEditName(currentUser.name || currentUser.username); 
                      setIsEditingName(true); 
                    }}
                    className="size-6 text-text-muted hover:text-accent rounded-md"
                    title="Editar nome"
                  >
                    <Pencil size={12} />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted">Permissão:</span>
              <span className="font-mono text-[10px] px-2.5 py-0.5 rounded bg-gray-900 border border-border text-text-muted uppercase tracking-wider font-bold">
                {currentUser.role === 'master' ? 'Owner (Dono)' : currentUser.role === 'admin' ? 'Administrador' : 'Operador'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted">E-mail Cadastrado:</span>
              <span className="font-bold text-text truncate max-w-[200px]">{currentUser.email || 'Nenhum'}</span>
            </div>
          </div>

          {/* Master Only: Configure Master Email */}
          {currentUser.role === 'master' && (
            <form onSubmit={onUpdateEmail} className="space-y-3.5 pt-4 border-t border-border/60">
              <h4 className="text-xs font-black text-accent uppercase tracking-wider flex items-center gap-1.5 pl-0.5">
                <Mail size={14} /> Configurar E-mail Principal do Sistema
              </h4>
              <p className="text-[11px] text-text-muted leading-relaxed pl-0.5">
                Como proprietário do sistema, você pode atualizar o endereço de e-mail administrativo principal.
              </p>
              <div className="flex gap-2.5">
                <Input
                  type="email"
                  required
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  className="flex-1 bg-gray-950/40 border border-border text-text placeholder:text-text-muted/40 h-10 rounded-xl text-xs"
                  placeholder="novo-email@exemplo.com"
                />
                <Button
                  type="submit"
                  variant="brand"
                  disabled={accountActionLoading}
                  className="h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all"
                >
                  {accountActionLoading ? 'Salvando...' : 'Atualizar'}
                </Button>
              </div>
            </form>
          )}

          {/* Change Password */}
          <form onSubmit={onChangePassword} className="space-y-4 pt-4 border-t border-border/60">
            <h4 className="text-xs font-black text-text uppercase tracking-wider flex items-center gap-1.5 pl-0.5">
              <KeyRound size={14} className="text-accent" /> Alterar Senha de Acesso
            </h4>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase block pl-0.5">Senha Atual</label>
                <Input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-gray-950/40 border border-border text-text placeholder:text-text-muted/40 h-10 rounded-xl text-xs"
                  placeholder="••••••••"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-muted uppercase block pl-0.5">Nova Senha</label>
                  <Input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-950/40 border border-border text-text placeholder:text-text-muted/40 h-10 rounded-xl text-xs"
                    placeholder="Mín. 6 caracteres"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-muted uppercase block pl-0.5">Confirmar Nova Senha</label>
                  <Input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-950/40 border border-border text-text placeholder:text-text-muted/40 h-10 rounded-xl text-xs"
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
                className="w-full sm:w-auto text-text-muted hover:text-accent text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 bg-transparent p-0 justify-start hover:bg-transparent"
                title={!smtpConfigured ? 'Configure o SMTP para redefinir por e-mail' : ''}
              >
                <Mail size={12} /> Solicitar redefinição por e-mail
              </Button>
              <Button
                type="submit"
                variant="brand"
                disabled={accountActionLoading}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                {accountActionLoading ? 'Salvando...' : 'Salvar Nova Senha'}
              </Button>
            </div>
          </form>
        </div>

        <div className="bg-gray-950/20 p-4 border-t border-border flex justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-950/40"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
