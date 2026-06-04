import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, KeyRound, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { resetPassword } from '../services/storage';
import { LogoHub } from './Login';
import { Button } from './ui/button';
import { Input } from './ui/input';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get('token');
    if (t) {
      setToken(t);
    } else {
      setError('Link de redefinição inválido. Solicite um novo link.');
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-transparent text-foreground">
      {/* Background Mesh Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(14,165,233,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0"></div>

      <div className="w-full max-w-md p-6 sm:p-8 relative z-10 flex flex-col gap-6">
        
        {/* Logo e Branding */}
        <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-20 h-20 bg-card flex items-center justify-center border border-border mb-4 shadow-md relative p-2.5">
             <LogoHub size={48} />
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight mb-1 text-center uppercase font-sans">
            Tela<span className="text-accent font-black">Hub</span>
          </h1>
          <p className="text-muted-foreground text-xs font-semibold tracking-wider text-center max-w-[280px] uppercase">
            Redefinição de Senha
          </p>
        </div>

        <div className="bg-[#0a0f24]/60 backdrop-blur-md border border-border shadow-soft p-6 sm:p-8 transition-all duration-300 hover:border-sky-500/30 rounded-xl">
          
          {success ? (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="w-16 h-16 bg-emerald-500/5 border border-emerald-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-emerald-400">Senha Redefinida!</h2>
              <p className="text-muted-foreground text-sm text-center leading-relaxed">
                Sua senha foi alterada com sucesso. Agora você pode fazer login com a nova senha.
              </p>
              
              <Button 
                onClick={() => navigate('/login')}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-6 rounded-lg shadow-md mt-2 text-xs tracking-wider flex items-center justify-center gap-2"
              >
                <Lock size={16} /> Ir para Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-3 mb-2 border-b border-border pb-4">
                <div className="w-10 h-10 bg-accent/5 border border-accent/10 flex items-center justify-center">
                  <KeyRound size={16} className="text-accent" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Nova Senha</h2>
                  <p className="text-muted-foreground text-xs">Crie uma nova senha para sua conta</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-0.5">Nova Senha</label>
                <div className="relative group">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 text-foreground border-border bg-background focus-visible:ring-ring h-11"
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    minLength={6}
                  />
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-accent transition-colors"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-0.5">Confirmar Nova Senha</label>
                <div className="relative group">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 text-foreground border-border bg-background focus-visible:ring-ring h-11"
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                  />
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                </div>
              </div>

              {/* Password strength indicator */}
              {password && (
                <div className="flex gap-1 pt-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-sm transition-all ${
                      password.length >= i * 3 
                        ? password.length >= 10 ? 'bg-emerald-500' : password.length >= 7 ? 'bg-amber-500' : 'bg-rose-500'
                        : 'bg-muted/30'
                    }`} />
                  ))}
                </div>
              )}

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-bold text-center flex items-center justify-center gap-2">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={loading || !token || !password || !confirmPassword}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-6 rounded-lg shadow-[0_4px_12px_rgba(14,165,233,0.15)] hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs tracking-wider"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />} 
                {loading ? 'PROCESSANDO...' : 'REDEFINIR SENHA'}
              </Button>

              <button 
                type="button"
                onClick={() => navigate('/login')}
                className="w-full text-muted-foreground hover:text-accent text-xs font-semibold py-2 flex items-center justify-center gap-1 transition-colors"
              >
                <ArrowLeft size={12} /> Voltar para o Login
              </button>
            </form>
          )}
        </div>
        
        <div className="text-center">
          <p className="text-muted-foreground text-[9px] font-mono uppercase tracking-widest">
            &copy; {new Date().getFullYear()} TelaHub System v2.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
