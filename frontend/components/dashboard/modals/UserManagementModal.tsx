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
      <DialogContent className="max-w-2xl border border-border bg-[#151926]/95 backdrop-blur-md p-0 overflow-hidden shadow-2xl rounded-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <DialogHeader className="p-6 border-b border-border bg-gray-950/20 flex flex-row items-center justify-between">
          <DialogTitle className="font-black text-lg text-text flex items-center gap-2">
            <UsersIcon className="text-emerald-400" size={20} /> Gestão de Usuários
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-8 text-text-muted hover:text-danger rounded-lg">
              <X size={18} />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* SMTP Not Configured Warning */}
          {!smtpConfigured && (
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="text-warning shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-xs font-black text-warning uppercase tracking-wider">Aviso de SMTP</h4>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  As configurações de e-mail (SMTP) não estão preenchidas. O sistema não poderá disparar convites ou redefinições de senha automaticamente. Configure o SMTP na guia administrativa para habilitar envios automatizados.
                </p>
              </div>
            </div>
          )}

          {/* Invite User Form */}
          <form onSubmit={onSubmitInvite} className="bg-gray-950/40 p-5 border border-border rounded-xl space-y-4">
            <h4 className="text-xs font-black text-text uppercase tracking-wider flex items-center gap-1.5 pl-0.5">
              <Mail size={14} className="text-accent" /> Convidar Novo Integrante
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 relative group">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="E-mail do novo usuário"
                  className="w-full bg-gray-950/50 border border-border text-text placeholder:text-text-muted/40 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 h-11 rounded-xl"
                  required
                />
              </div>
              <div>
                <Select value={inviteRole} onValueChange={(v: 'user' | 'admin') => setInviteRole(v)}>
                  <SelectTrigger className="w-full bg-gray-950/50 border border-border text-text h-11 rounded-xl focus:ring-accent/40">
                    <SelectValue placeholder="Nível..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#151926] border-border text-text">
                    <SelectItem value="user" className="focus:bg-accent/15 focus:text-accent">Operador</SelectItem>
                    <SelectItem value="admin" className="focus:bg-accent/15 focus:text-accent">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                variant="brand"
                disabled={loading || !inviteEmail}
                className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Enviar Convite</span>
              </Button>
            </div>
          </form>

          {/* User List */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">
              Usuários Cadastrados ({usersList.length})
            </h4>
            <ScrollArea className="h-64 border border-border rounded-xl bg-gray-950/20 p-4">
              <div className="space-y-2.5">
                {usersList.map((user) => {
                  const isSelf = currentUser?.id === user.id;
                  const canManage = currentUser?.role === 'master' || (currentUser?.role === 'admin' && user.role !== 'master');

                  return (
                    <div
                      key={user.id}
                      className="bg-surface/30 border border-border/60 hover:border-border rounded-xl p-3.5 flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-text text-sm truncate">{user.username}</span>
                          {user.name && (
                            <span className="text-xs text-text-muted truncate">({user.name})</span>
                          )}
                          {user.role === 'master' ? (
                            <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                              <Shield size={10} /> Owner
                            </span>
                          ) : user.role === 'admin' ? (
                            <span className="bg-accent/10 border border-accent/30 text-accent text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                              <Shield size={10} /> Admin
                            </span>
                          ) : (
                            <span className="bg-border text-text-muted text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Operador
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted mt-0.5 truncate">{user.email || 'Sem e-mail cadastrado'}</p>
                      </div>

                      {/* User Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {user.inviteCode && (
                          <Button
                            variant="outline"
                            onClick={() => onResendInvite(user.email)}
                            className="bg-gray-950/40 text-accent border border-accent/20 hover:bg-accent/10 px-2.5 py-1.5 h-auto text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                            title="Reenviar código de convite por e-mail"
                          >
                            <RotateCcw size={10} className="mr-1" /> Reenviar Convite
                          </Button>
                        )}
                        {!isSelf && canManage && (
                          <>
                            {user.email && (
                              <Button
                                variant="outline"
                                onClick={() => onSendResetPassword(user.email)}
                                className="bg-gray-950/40 text-text-muted border border-border hover:border-accent-2/30 hover:text-text px-2.5 py-1.5 h-auto text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                                title="Enviar e-mail para redefinir senha"
                              >
                                <KeyRound size={10} className="mr-1" /> Reset Senha
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              onClick={() => onDeleteUser(user)}
                              className="bg-gray-950/40 text-danger border border-danger/20 hover:bg-danger/10 px-2.5 py-1.5 h-auto text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                              title="Remover Usuário"
                            >
                              <Trash2 size={10} />
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
