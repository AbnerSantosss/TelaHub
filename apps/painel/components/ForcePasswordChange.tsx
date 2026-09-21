import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock, Loader2, ShieldCheck, LogOut, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { changeMyPassword, logout } from '../services/storage';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { User } from '../types';

/**
 * Tela de troca OBRIGATÓRIA de senha.
 *
 * Contexto: quem entra por convite ou por compra no checkout recebe uma senha
 * gerada pelo servidor e enviada em texto claro por e-mail. Enquanto essa senha
 * valer, qualquer pessoa com acesso àquela caixa de entrada tem a conta — por
 * isso o backend marca `User.mustChangePassword` e o painel não libera nada
 * antes da troca.
 *
 * Ela NÃO é uma rota: é renderizada de dentro do `ProtectedRoute` no lugar do
 * conteúdo protegido (ver comentário em `App.tsx`). Assim não existe URL que
 * "pule" a exigência, e ao trocar a senha o usuário continua exatamente na rota
 * para onde ia — sem redirect nem perda de parâmetros (`/edit/:id`, p.ex.).
 */

/** Mesmo mínimo que o servidor aplica em `PUT /users/me/password`. */
const MIN_PASSWORD_LENGTH = 6;

interface ForcePasswordChangeProps {
  /** Usuário autenticado, só para personalizar o cabeçalho. */
  user: User | null;
  /** Chamado após o servidor confirmar a troca (e zerar o flag). */
  onSuccess: () => void;
}

const ForcePasswordChange: React.FC<ForcePasswordChangeProps> = ({ user, onSuccess }) => {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Validação local antes de gastar uma ida ao servidor. O servidor valida de
    // novo — isto aqui é só para dar erro imediato, não é a barreira de fato.
    if (!currentPassword) {
      toast.error('Informe a senha provisória que você recebeu por e-mail.');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(`A nova senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('A nova senha e a confirmação não coincidem.');
      return;
    }
    if (newPassword === currentPassword) {
      // Se o servidor aceitasse repetir a senha do e-mail, a troca não teria
      // resolvido nada: a credencial vazada continuaria válida.
      toast.error('A nova senha precisa ser diferente da senha provisória.');
      return;
    }

    setLoading(true);
    try {
      await changeMyPassword(currentPassword, newPassword);
      // O flag `mustChangePassword` é zerado pelo próprio servidor nesta rota,
      // então basta avisar o pai para refazer a checagem/seguir adiante.
      toast.success('Senha alterada. Bem-vindo ao TelaHub!');
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível alterar a senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Saída de emergência: sem isto, quem esquecer a senha provisória fica preso
   * nesta tela (não há como voltar ao login, já que ela não é uma rota).
   */
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-950">
      {/* Mesma malha de pontos da tela de login, para não parecer outra aplicação. */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(14,165,233,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <Card className="w-full max-w-lg relative z-10 border border-white/10 bg-slate-900/70 backdrop-blur-md">
        <CardHeader className="gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--th-accent)]/10 border border-[var(--th-accent)]/25 text-[var(--th-accent)] shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <CardTitle className="text-base font-black uppercase tracking-tight text-slate-100">
                Defina sua senha
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                {user?.name || user?.email || 'Sua conta'}
              </CardDescription>
            </div>
          </div>

          {/* O "porquê" precisa estar na tela: sem explicação, uma exigência de
              troca no primeiro acesso parece burocracia e o usuário reutiliza a
              senha do e-mail. */}
          <p className="text-xs leading-relaxed text-slate-400 border-l-2 border-[var(--th-accent)]/40 pl-3">
            A senha que você recebeu por e-mail é <strong className="text-slate-200">provisória</strong>: ela
            trafegou em texto claro, então qualquer pessoa com acesso à sua caixa de entrada poderia
            usá-la para entrar na sua conta. Escolha uma senha sua agora. Leva dez segundos, e a
            provisória deixa de valer.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="fpc-current" className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                Senha provisória (a do e-mail)
              </label>
              <div className="relative group">
                <Input
                  id="fpc-current"
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-slate-950/40 border-white/10 text-slate-100"
                  placeholder="Cole aqui a senha recebida"
                  autoComplete="current-password"
                  autoFocus
                />
                <Lock size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="fpc-new" className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                Nova senha
              </label>
              <div className="relative group">
                <Input
                  id="fpc-new"
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 rounded-xl bg-slate-950/40 border-white/10 text-slate-100"
                  placeholder={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
                  autoComplete="new-password"
                />
                <KeyRound size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
                <button
                  type="button"
                  onClick={() => setShowPasswords((v) => !v)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-[var(--th-accent)] transition-colors"
                  aria-label={showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}
                >
                  {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="fpc-confirm" className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                Confirme a nova senha
              </label>
              <div className="relative group">
                <Input
                  id="fpc-confirm"
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-slate-950/40 border-white/10 text-slate-100"
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                />
                <KeyRound size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
              </div>
            </div>

            <Button
              type="submit"
              variant="brand"
              disabled={loading}
              className="w-full py-6 rounded-xl uppercase text-xs tracking-wider font-bold"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {loading ? 'Salvando...' : 'Salvar e continuar'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={handleLogout}
              disabled={loading}
              className="w-full text-xs text-slate-500 hover:text-slate-300"
            >
              <LogOut size={14} />
              Sair e trocar depois
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForcePasswordChange;
