import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Loader2, CheckCircle2, AlertTriangle, ArrowLeft, Send } from 'lucide-react';
import { forgotPassword } from '../services/storage';
import { LogoHub } from './Login';
import { Button } from './ui/button';
import { Input } from './ui/input';

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background text-foreground">
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
            Recuperação de Acesso
          </p>
        </div>

        <div className="bg-card border border-border shadow-md p-6 sm:p-8 transition-all duration-300 hover:border-sky-500/30 rounded-xl">
          
          {success ? (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="w-16 h-16 bg-emerald-500/5 border border-emerald-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-emerald-400">E-mail Enviado!</h2>
              <p className="text-muted-foreground text-sm text-center leading-relaxed">
                Se o e-mail <strong className="text-foreground">{email}</strong> estiver cadastrado, 
                você receberá as instruções para redefinir sua senha.
              </p>
              <p className="text-muted-foreground text-xs text-center opacity-80">
                Verifique também a pasta de spam/lixo eletrônico.
              </p>
              
              <Button 
                onClick={() => navigate('/login')}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-6 rounded-lg shadow-md mt-2 text-xs tracking-wider flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} /> Voltar ao Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-3 mb-2 border-b border-border pb-4">
                <div className="w-10 h-10 bg-accent/5 border border-accent/10 flex items-center justify-center">
                  <Mail size={16} className="text-accent" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Esqueceu sua senha?</h2>
                  <p className="text-muted-foreground text-xs">Enviaremos um link de redefinição</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-0.5">Seu E-mail</label>
                <div className="relative group">
                  <Input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 text-foreground border-border bg-background focus-visible:ring-ring h-11"
                    placeholder="Ex: seu.email@exemplo.com"
                    autoComplete="email"
                  />
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                </div>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-bold text-center flex items-center justify-center gap-2">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={loading || !email}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-6 rounded-lg shadow-[0_4px_12px_rgba(14,165,233,0.15)] hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs tracking-wider"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} 
                {loading ? 'ENVIANDO...' : 'ENVIAR LINK DE REDEFINIÇÃO'}
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

export default ForgotPassword;
