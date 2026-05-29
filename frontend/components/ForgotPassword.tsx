import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Loader2, CheckCircle2, AlertTriangle, ArrowLeft, Send } from 'lucide-react';
import { forgotPassword } from '../services/storage';
import { LogoHub } from './Login';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Informe um e-mail válido.');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#1C1D22]">
      {/* Background Mesh Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>
      
      {/* Subtle Radial Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px] animate-pulse z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#7C3AED]/5 rounded-full blur-[120px] animate-pulse z-0" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md p-8 relative z-10 flex flex-col gap-6">
        
        {/* Logo e Branding */}
        <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="w-24 h-24 bg-gradient-to-br from-[#2D3139] to-[#1C1D22] rounded-2xl flex items-center justify-center border border-[#9CA3AF]/10 mb-5 shadow-[0_0_40px_rgba(124,58,237,0.12)] relative group p-4">
             <div className="absolute inset-0 bg-[#7C3AED]/5 rounded-2xl blur-xl group-hover:bg-[#7C3AED]/10 transition-all duration-500"></div>
             <LogoHub size={52} />
          </div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F3F4F6] via-[#9CA3AF] to-[#9CA3AF] tracking-tight mb-1 text-center uppercase">
            Tela<span className="text-[#7C3AED]">Hub</span>
          </h1>
          <p className="text-[#9CA3AF] text-xs font-medium tracking-wide text-center max-w-[280px]">
            Recuperação de Acesso
          </p>
        </div>

        <div className="bg-[#2D3139] border border-[#9CA3AF]/15 rounded-3xl shadow-2xl p-8 transition-all duration-500 hover:border-[#7C3AED]/30">
          
          {success ? (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-emerald-400">E-mail Enviado!</h2>
              <p className="text-slate-400 text-sm text-center leading-relaxed">
                Se o e-mail <strong className="text-slate-300">{email}</strong> estiver cadastrado, 
                você receberá as instruções para redefinir sua senha.
              </p>
              <p className="text-slate-500 text-xs text-center">
                Verifique também a pasta de spam/lixo eletrônico.
              </p>
              <button 
                onClick={() => navigate('/login')}
                className="w-full liquid-metal-btn text-[#F3F4F6] font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
              >
                <ArrowLeft size={18} /> Voltar ao Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-xl flex items-center justify-center">
                  <Mail size={18} className="text-[#7C3AED]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-200">Esqueceu sua senha?</h2>
                  <p className="text-[#9CA3AF] text-xs">Enviaremos um link de redefinição</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider pl-1">Seu E-mail</label>
                <div className="relative group">
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#1C1D22]/60 border border-[#9CA3AF]/20 rounded-xl py-3.5 pl-12 text-[#F3F4F6] outline-none focus:border-[#7C3AED] focus:bg-[#1C1D22] focus:shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all placeholder:text-[#9CA3AF]/40 text-sm"
                    placeholder="Ex: seu.email@exemplo.com"
                    autoComplete="email"
                  />
                  <Mail size={18} className="absolute left-4 top-3.5 text-[#9CA3AF]/60 group-focus-within:text-[#7C3AED] transition-colors" />
                </div>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-bold text-center flex items-center justify-center gap-2">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading || !email}
                className="w-full liquid-metal-btn text-[#F3F4F6] font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />} 
                {loading ? 'ENVIANDO...' : 'ENVIAR LINK DE REDEFINIÇÃO'}
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

export default ForgotPassword;
