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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../ui/select';
import { ScrollArea } from '../../ui/scroll-area';
import { 
  Users as UsersIcon, 
  X, 
  AlertTriangle, 
  Mail, 
  Send, 
  Loader2, 
  Shield, 
  RotateCcw, 
  KeyRound, 
  Trash2 
} from 'lucide-react';
import { User } from '../../../types';

interface UserManagementModalProps {
  open: boolean;
  onClose: () => void;
  usersList: User[];
  currentUser: User | null;
  smtpConfigured: boolean;
  inviteEmail: string;
  setInviteEmail: (value: string) => void;
  inviteRole: 'user' | 'admin';
  setInviteRole: (value: 'user' | 'admin') => void;
  onSubmitInvite: (e: React.FormEvent) => void;
  loading: boolean;
  onDeleteUser: (user: User) => void;
  onResendInvite: (email: string) => void;
  onSendResetPassword: (email: string) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  open,
  onClose,
  usersList,
  currentUser,
  smtpConfigured,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  onSubmitInvite,
  loading,
  onDeleteUser,
  onResendInvite,
  onSendResetPassword,
}) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-2xl max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-borda">
          <DialogTitle className="font-bold text-lg flex items-center gap-2 text-tinta">
            <UsersIcon className="text-marca" size={20} /> Gestão de Usuários
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-11 md:size-8 rounded-lg text-tinta-3 hover:text-tinta" aria-label="Fechar">
              <X size={18} />
            </Button>
          </DialogClose>
        </div>

        <div className="p-6 flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-6">
          {/* SMTP Not Configured Warning */}
          {!smtpConfigured && (
            <div className="bg-warn-fundo border border-borda rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="text-warn shrink-0 mt-0.5" size={18} aria-hidden="true" />
              <div>
                <h4 className="text-sm font-bold text-tinta">Aviso de SMTP</h4>
                <p className="text-sm text-tinta-2 mt-1 leading-relaxed">
                  O e-mail (SMTP) ainda não foi configurado, então convites e redefinições de senha não serão enviados. Configure o SMTP na guia administrativa.
                </p>
              </div>
            </div>
          )}

          {/* Convite só para quem tem team:write na API (admin e master). */}
          {currentUser?.role === 'master' || currentUser?.role === 'admin' ? (
          <form onSubmit={onSubmitInvite} className="bg-papel p-5 border border-borda rounded-xl space-y-4">
            <h4 className="text-sm font-bold text-text flex items-center gap-1.5 pl-0.5">
              <Mail size={15} className="text-marca" /> Convidar Novo Integrante
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 relative group">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="E-mail do novo usuário"
                  className="w-full bg-papel border border-borda-3 text-tinta text-base md:text-sm placeholder:text-tinta-3 focus-visible:border-marca focus-visible:ring-3 focus-visible:ring-ring/30 h-11 rounded-xl"
                  required
                />
              </div>
              <div>
                <Select value={inviteRole} onValueChange={(v: 'user' | 'admin') => setInviteRole(v)}>
                  <SelectTrigger className="w-full h-11 rounded-xl text-tinta">
                    <SelectValue placeholder="Nível..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Operador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                variant="brand"
                disabled={loading || !inviteEmail}
                className="h-11 md:h-10 px-5 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Enviar Convite</span>
              </Button>
            </div>
          </form>
          ) : (
            <p className="text-sm text-tinta-3 bg-papel p-4 border border-borda rounded-xl">
              Só administradores convidam pessoas para a equipe.
            </p>
          )}

          {/* User List */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-tinta-2 pl-0.5">
              Usuários Cadastrados ({usersList.length})
            </h4>
            <ScrollArea className="h-64 border border-borda rounded-xl bg-papel-2 p-4">
              <div className="space-y-2.5">
                {usersList.map((user) => {
                  const isSelf = currentUser?.id === user.id;
                  const canManage = currentUser?.role === 'master' || (currentUser?.role === 'admin' && user.role !== 'master');

                  return (
                    <div
                      key={user.id}
                      className="bg-papel border border-borda hover:border-borda-2 rounded-xl p-3.5 flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-text text-sm truncate">{user.username}</span>
                          {user.name && (
                            <span className="text-sm text-text-muted truncate">({user.name})</span>
                          )}
                          {user.role === 'master' ? (
                            <span className="bg-papel-3 border border-borda-2 text-tinta text-[13px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Shield size={12} aria-hidden="true" /> Owner
                            </span>
                          ) : user.role === 'admin' ? (
                            <span className="bg-marca-fundo border border-borda text-marca text-[13px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Shield size={12} aria-hidden="true" /> Admin
                            </span>
                          ) : (
                            <span className="bg-papel-3 text-tinta-2 text-[13px] font-semibold px-2 py-0.5 rounded-full">
                              Operador
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-text-muted mt-0.5 truncate">{user.email || 'Sem e-mail cadastrado'}</p>
                      </div>

                      {/* User Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {user.inviteCode && (
                          <Button
                            variant="outline"
                            onClick={() => onResendInvite(user.email)}
                            className="bg-papel text-marca border border-borda-2 hover:border-marca hover:bg-marca-fundo px-2.5 py-1.5 h-auto min-h-11 md:min-h-9 text-[13px] font-semibold rounded-lg transition-colors"
                            title="Reenviar código de convite por e-mail"
                          >
                            <RotateCcw size={12} className="mr-1" aria-hidden="true" /> Reenviar Convite
                          </Button>
                        )}
                        {!isSelf && canManage && (
                          <>
                            {user.email && (
                              <Button
                                variant="outline"
                                onClick={() => onSendResetPassword(user.email)}
                                className="bg-papel text-tinta-2 border border-borda-2 hover:border-borda-3 hover:text-tinta px-2.5 py-1.5 h-auto min-h-11 md:min-h-9 text-[13px] font-semibold rounded-lg transition-colors"
                                title="Enviar e-mail para redefinir senha"
                              >
                                <KeyRound size={12} className="mr-1" aria-hidden="true" /> Reset Senha
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              onClick={() => onDeleteUser(user)}
                              className="bg-papel text-danger border border-borda-2 hover:border-danger hover:bg-danger-fundo px-2.5 py-1.5 h-auto min-h-11 min-w-11 md:min-h-9 md:min-w-9 text-[13px] font-semibold rounded-lg transition-colors"
                              title="Remover Usuário"
                              aria-label={`Remover ${user.username}`}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
