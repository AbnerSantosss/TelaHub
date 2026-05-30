import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, KeyRound, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { resetPassword } from '../services/storage';
import { LogoHub } from './Login';

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#1C1D22]">
      {/* Background Mesh Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>

      <div className="w-full max-w-md p-8 relative z-10 flex flex-col gap-6">
        
        {/* Logo e Branding */}
        <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="w-24 h-24 bg-[#2D3139] rounded-2xl flex items-center justify-center border border-[#9CA3AF]/10 mb-5 shadow-lg relative group p-4">
             <LogoHub size={52} />
          </div>
          <h1 className="text-3xl font-black text-[#F3F4F6] tracking-tight mb-1 text-center uppercase">
            Tela<span className="text-[#7C3AED]">Hub</span>
          </h1>
          <p className="text-[#9CA3AF] text-xs font-medium tracking-wide text-center max-w-[280px]">
            Redefinição de Senha
          </p>
        </div>

        <div className="bg-[#2D3139] border border-[#9CA3AF]/15 rounded-2xl shadow-xl p-8 transition-all duration-300 hover:border-[#7C3AED]/30">
          
          {success ? (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-emerald-400">Senha Redefinida!</h2>
              <p className="text-[#F3F4F6] text-sm text-center">
                Sua senha foi alterada com sucesso. Agora você pode fazer login com a nova senha.
              </p>
              <button 
                onClick={() => navigate('/login')}
                className="w-full liquid-metal-btn text-[#F3F4F6] font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Lock size={18} /> Ir para Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-xl flex items-center justify-center">
                  <KeyRound size={18} className="text-[#7C3AED]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-200">Nova Senha</h2>
                  <p className="text-[#9CA3AF] text-xs">Crie uma nova senha para sua conta</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider pl-1">Nova Senha</label>
                <div className="relative group">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#1C1D22]/60 border border-[#9CA3AF]/20 rounded-xl py-3.5 pl-12 pr-10 text-[#F3F4F6] outline-none focus:border-[#7C3AED] focus:bg-[#1C1D22] focus:shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all placeholder:text-[#9CA3AF]/40 text-sm"
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    minLength={6}
                  />
                  <Lock size={18} className="absolute left-4 top-3.5 text-[#9CA3AF]/60 group-focus-within:text-[#7C3AED] transition-colors" />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-[#9CA3AF]/60 hover:text-[#7C3AED] transition-colors"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider pl-1">Confirmar Nova Senha</label>
                <div className="relative group">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#1C1D22]/60 border border-[#9CA3AF]/20 rounded-xl py-3.5 pl-12 text-[#F3F4F6] outline-none focus:border-[#7C3AED] focus:bg-[#1C1D22] focus:shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all placeholder:text-[#9CA3AF]/40 text-sm"
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                  />
                  <Lock size={18} className="absolute left-4 top-3.5 text-[#9CA3AF]/60 group-focus-within:text-[#7C3AED] transition-colors" />
                </div>
              </div>

              {/* Password strength indicator */}
              {password && (
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                      password.length >= i * 3 
                        ? password.length >= 10 ? 'bg-emerald-500' : password.length >= 7 ? 'bg-amber-500' : 'bg-rose-500'
                        : 'bg-slate-800'
                    }`} />
                  ))}
                </div>
              )}

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-bold text-center flex items-center justify-center gap-2">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading || !token || !password || !confirmPassword}
                className="w-full liquid-metal-btn text-[#F3F4F6] font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <KeyRound size={20} />} 
                {loading ? 'PROCESSANDO...' : 'REDEFINIR SENHA'}
              </button>

              <button 
                type="button"
                onClick={() => navigate('/login')}
                className="w-full text-[#9CA3AF]/80 hover:text-[#7C3AED] text-xs font-medium py-2 flex items-center justify-center gap-1 transition-colors"
              >
                <ArrowLeft size={14} /> Voltar para o Login
              </button>
            </form>
          )}
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-[#9CA3AF] text-[10px] font-mono uppercase tracking-widest">
            &copy; {new Date().getFullYear()} TelaHub System v2.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
