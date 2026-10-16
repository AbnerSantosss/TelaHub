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
        <div className="flex items-center justify-between p-5 border-b border-borda">
          <DialogTitle className="font-bold text-lg flex items-center gap-2 text-tinta">
            <Settings className="text-marca" size={20} /> Configurações de Conta
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-11 md:size-8 rounded-lg text-tinta-3 hover:text-tinta" aria-label="Fechar">
              <X size={18} />
            </Button>
          </DialogClose>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 min-h-0 overflow-y-auto space-y-5">
          {/* Notifications */}
          {accountError && (
            <div role="alert" className="rounded-xl p-3.5 flex items-start gap-2.5 bg-danger-fundo border border-borda">
              <XCircle className="text-danger shrink-0 mt-0.5" size={16} />
              <p className="text-danger text-sm leading-relaxed font-semibold">{accountError}</p>
            </div>
          )}
          {accountSuccess && (
            <div role="status" className="rounded-xl p-3.5 flex items-start gap-2.5 bg-ok-fundo border border-borda">
              <CheckCircle className="text-ok shrink-0 mt-0.5" size={16} />
              <p className="text-ok text-sm leading-relaxed font-semibold">{accountSuccess}</p>
            </div>
          )}

          {/* User Profile Card */}
          <div className="p-5 rounded-xl space-y-3 bg-papel-2 border border-borda">
            <p className="text-sm font-semibold text-tinta pl-0.5">Perfil do Usuário</p>
            <div className="flex justify-between items-center text-sm">
              <span className="text-tinta-2">Nome de Exibição:</span>
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
                    className="w-40 h-10 md:h-9 rounded-lg text-base md:text-sm border-marca"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={onUpdateName}
                    disabled={accountActionLoading}
                    className="size-10 md:size-9 text-ok hover:bg-ok-fundo rounded-md"
                    title="Salvar"
                    aria-label="Salvar nome"
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
                    className="size-10 md:size-9 rounded-md text-tinta-3 hover:text-tinta"
                    title="Cancelar"
                    aria-label="Cancelar edição"
                  >
                    <X size={14} />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-tinta">{currentUser.name || currentUser.username}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { 
                      setEditName(currentUser.name || currentUser.username); 
                      setIsEditingName(true); 
                    }}
                    className="size-10 md:size-8 text-tinta-3 hover:text-marca rounded-md"
                    title="Editar nome"
                    aria-label="Editar nome"
                  >
                    <Pencil size={14} />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-tinta-2">Permissão:</span>
              <span className="text-[13px] px-2.5 py-0.5 rounded-md font-semibold bg-papel border border-borda text-tinta-2">
                {currentUser.role === 'master' ? 'Owner (Dono)' : currentUser.role === 'admin' ? 'Administrador' : 'Operador'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-tinta-2">E-mail Cadastrado:</span>
              <span className="font-bold truncate max-w-[200px] text-tinta">{currentUser.email || 'Nenhum'}</span>
            </div>
          </div>

          {/* Master Only: Configure Master Email */}
          {currentUser.role === 'master' && (
            <form onSubmit={onUpdateEmail} className="space-y-3.5 pt-4 border-t border-borda">
              <h4 className="text-sm font-bold text-marca flex items-center gap-1.5 pl-0.5">
                <Mail size={14} /> Configurar E-mail Principal do Sistema
              </h4>
              <p className="text-sm leading-relaxed pl-0.5 text-tinta-2">
                Como proprietário do sistema, você pode atualizar o endereço de e-mail administrativo principal.
              </p>
              <div className="flex gap-2.5">
                <Input
                  type="email"
                  required
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  className="flex-1 h-11 md:h-10 rounded-xl text-base md:text-sm"
                  placeholder="novo-email@exemplo.com"
                />
                <Button
                  type="submit"
                  variant="brand"
                  disabled={accountActionLoading}
                  className="h-11 md:h-10 px-4 rounded-lg text-sm font-semibold whitespace-nowrap"
                >
                  {accountActionLoading ? 'Salvando...' : 'Atualizar'}
                </Button>
              </div>
            </form>
          )}

          {/* Change Password */}
          <form onSubmit={onChangePassword} className="space-y-4 pt-4 border-t border-borda">
            <h4 className="text-sm font-bold flex items-center gap-1.5 pl-0.5 text-tinta">
              <KeyRound size={14} className="text-marca" /> Alterar Senha de Acesso
            </h4>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-tinta-2 block pl-0.5">Senha Atual</label>
                <Input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-11 md:h-10 rounded-xl text-base md:text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-tinta-2 block pl-0.5">Nova Senha</label>
                  <Input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-11 md:h-10 rounded-xl text-base md:text-sm"
                    placeholder="Mín. 6 caracteres"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-tinta-2 block pl-0.5">Confirmar Nova Senha</label>
                  <Input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-11 md:h-10 rounded-xl text-base md:text-sm"
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
                className="w-full sm:w-auto min-h-11 md:min-h-0 text-sm font-semibold flex items-center gap-1.5 bg-transparent p-0 justify-start text-tinta-2 hover:bg-transparent hover:text-marca"
                title={!smtpConfigured ? 'Configure o SMTP para redefinir por e-mail' : ''}
              >
                <Mail size={14} /> Solicitar redefinição por e-mail
              </Button>
              <Button
                type="submit"
                variant="brand"
                disabled={accountActionLoading}
                className="w-full sm:w-auto h-11 md:h-10 px-6 rounded-lg text-sm font-semibold"
              >
                {accountActionLoading ? 'Salvando...' : 'Salvar Nova Senha'}
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 flex justify-end border-t border-borda">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="h-11 md:h-10 px-5 rounded-lg text-sm font-semibold text-tinta-2 hover:text-tinta"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
