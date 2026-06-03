import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, LogIn, Loader2, CheckCircle2, Tv } from 'lucide-react';
import { motion } from 'motion/react';
import { login } from '../services/storage';
import { Button } from './ui/button';
import { Input } from './ui/input';

// Geometric minimal icon representing a matrix of interconnected screens (Swiss Grid / Signal Orange Theme)
export const LogoHub: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 48 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} relative z-10`}
    >
      {/* 2x2 grid representing interconnected displays */}
      <rect x="15" y="15" width="30" height="24" rx="2" stroke="var(--brand-accent)" strokeWidth="3.5" fill="rgba(14, 165, 233, 0.05)" />
      <rect x="55" y="15" width="30" height="24" rx="2" stroke="var(--brand-accent)" strokeWidth="3.5" fill="rgba(14, 165, 233, 0.05)" />
      <rect x="15" y="53" width="30" height="24" rx="2" stroke="var(--brand-accent)" strokeWidth="3.5" fill="rgba(14, 165, 233, 0.05)" />
      <rect x="55" y="53" width="30" height="32" rx="2" stroke="var(--brand-accent)" strokeWidth="3.5" fill="rgba(14, 165, 233, 0.05)" />
      
      {/* Interconnections (lines representing data flow) */}
      <path d="M45 27H55" stroke="var(--brand-accent)" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.75" />
      <path d="M45 65H55" stroke="var(--brand-accent)" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.75" />
      <path d="M30 39V53" stroke="var(--brand-accent)" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.75" />
      <path d="M70 39V53" stroke="var(--brand-accent)" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.75" />
      
      {/* Glowing center hub dot */}
      <circle cx="50" cy="46" r="5" fill="var(--brand-accent)" />
      <circle cx="50" cy="46" r="10" stroke="var(--brand-accent)" strokeWidth="2" className="animate-ping" opacity="0.4" />
    </svg>
  );
};

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isConfigured = true; // Backend sempre disponível
  
  const navigate = useNavigate();

  useEffect(() => {
    // Carrega credenciais salvas se existirem
    const savedUser = localStorage.getItem('officecom_saved_user');
    if (savedUser) {
      setUsername(savedUser);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) return;

    setLoading(true);
    setError('');
    
    try {
      const user = await login(username, password);
      if (user) {
        if (rememberMe) {
          localStorage.setItem('officecom_saved_user', username);
        } else {
          localStorage.removeItem('officecom_saved_user');
        }
        navigate('/');
      } else {
        setError('Login realizado, mas perfil de usuário não encontrado. Contate o suporte.');
      }
    } catch (e: any) {
      console.error(e);
      let msg = e.message || 'Erro de conexão ou credenciais.';
      if (msg.includes('Invalid login credentials')) msg = 'Email ou senha incorretos.';
      if (msg.includes('Email not confirmed')) msg = 'Email não confirmado. Verifique sua caixa de entrada.';
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground overflow-hidden font-sans relative">
      {/* Background Mesh Grid (Technical Dot-Grid) */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(14,165,233,0.04)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0"></div>
      
      {/* Premium Video Background — Login Only (ABOVE panels, blended) */}
      <div className="absolute inset-0 z-[15] pointer-events-none overflow-hidden">
        <video
          key={typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'desktop' : 'mobile'}
          src={typeof window !== 'undefined' && window.innerWidth >= 1024 ? '/backgrounds/bg_desktop.mp4' : '/backgrounds/BG-mobile.mp4'}
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          style={{ 
            position: 'absolute', 
            inset: 0, 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            opacity: 0.15,
            mixBlendMode: 'screen'
          }}
        />
      </div>
      
      {/* Lateral Marketing / Copywriting Panel (Desktop only: lg and above) */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative flex-col justify-between p-16 overflow-hidden border-r border-border bg-card z-10">
        
        {/* Upper Header: Logo and Brand Name */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-12 h-12 bg-background border border-border flex items-center justify-center shadow-md p-1.5">
            <LogoHub size={28} />
          </div>
          <span className="text-xl font-black tracking-tight text-foreground uppercase font-sans">
            Tela<span className="text-accent">Hub</span>
          </span>
        </div>

        {/* Core Marketing Copy & Feature List */}
        <div className="my-auto z-10 max-w-xl space-y-8 pr-8 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="space-y-4">
            <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-widest bg-sky-500/10 px-3.5 py-1.5 border border-sky-500/20 rounded-full inline-block">
              Mídia Digital Corporativa Premium
            </span>
            <h2 className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight font-sans bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-white pb-1">
              Transforme qualquer tela em um canal de comunicação inteligente.
            </h2>
            <p className="text-slate-400 text-sm xl:text-base leading-relaxed">
              O TelaHub é um sistema full-stack premium para gerenciar e transmitir programações, informativos, indicadores corporativos e mídias de forma dinâmica e totalmente remota em tempo real.
            </p>
          </div>

          {/* Benefits list */}
          <div className="space-y-5">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-accent/5 border border-accent/10 flex items-center justify-center text-accent shrink-0 mt-0.5">
                <Tv size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Gestão Remota de Displays</h4>
                <p className="text-xs text-muted-foreground mt-1">Monitore e gerencie Smart TVs, painéis e totens direto do painel administrativo, com pareamento instantâneo via código.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-accent/5 border border-accent/10 flex items-center justify-center text-accent shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
              </div>
              <div>
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Editor Modular com +20 Widgets</h4>
                <p className="text-xs text-muted-foreground mt-1">Crie layouts de arrastar-e-soltar com previsão do tempo, cotações, metas de produtividade, feeds RSS e integrações nativas de Power BI.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div>
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Sincronização em Tempo Real (SSE)</h4>
                <p className="text-xs text-muted-foreground mt-1">Transmissões de emergência, comunicados imediatos e mudanças de layout sincronizam instantaneamente sem recarregar as telas.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Simulated TV Displays representing the app in action */}
        <div className="absolute right-[-50px] xl:right-[-30px] top-[15%] w-[380px] h-[500px] pointer-events-none hidden xl:block select-none opacity-95">
          {/* Card 1: Monitor de Clima (Horizontal 16:9 Glassmorphism) */}
          <motion.div 
            initial={{ x: 50, y: 0, opacity: 0 }}
            animate={{ x: 0, y: [-6, 6, -6], opacity: 1 }}
            transition={{ 
              x: { duration: 1 }, 
              y: { duration: 5, repeat: Infinity, ease: "easeInOut" } 
            }}
            className="absolute top-[5%] left-[20px] w-[260px] flex flex-col select-none bg-gray-800/40 border border-white/10 backdrop-blur-md shadow-2xl rounded-xl p-4 transition-all duration-300 ease-out hover:border-sky-500/50 hover:shadow-sky-500/5"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-bold text-sky-400 uppercase tracking-widest">Display Copa #01</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 text-xl">☀️</div>
              <div>
                <h5 className="text-xs font-semibold text-white leading-tight">São Paulo, BR</h5>
                <p className="text-[10px] text-slate-400 font-medium">Ensolarado • 26°C</p>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Totem de Indicadores (Vertical Totem Glassmorphism) */}
          <motion.div 
            initial={{ x: 100, y: 0, opacity: 0 }}
            animate={{ x: 0, y: [6, -6, 6], opacity: 1 }}
            transition={{ 
              x: { duration: 1, delay: 0.2 }, 
              y: { duration: 6, repeat: Infinity, ease: "easeInOut" } 
            }}
            className="absolute top-[34%] right-[20px] w-[180px] flex flex-col select-none bg-gray-800/40 border border-white/10 backdrop-blur-md shadow-2xl rounded-xl p-4 transition-all duration-300 ease-out hover:border-sky-500/50 hover:shadow-sky-500/5 h-[220px]"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-[8px] font-bold text-sky-400 uppercase tracking-widest">Totem Sul #02</span>
              <span className="text-[10px] font-mono font-bold text-emerald-400">+2.47%</span>
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h6 className="text-[10px] font-medium text-slate-400 block mb-0.5 leading-none">Métrica Financeira</h6>
                <span className="text-xs font-bold text-white">PETR4.SA</span>
                <span className="text-xs font-semibold text-slate-300 block mt-1">R$ 38,42</span>
              </div>
              <div className="h-12 w-full mt-3 bg-gray-900/60 rounded-lg p-1.5 flex items-center border border-white/5">
                <svg className="w-full h-full" viewBox="0 0 100 30">
                  <path d="M0,25 L20,18 L40,22 L60,8 L80,14 L100,2" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Painel de Tarefas (Horizontal Glassmorphism) */}
          <motion.div 
            initial={{ x: 120, y: 0, opacity: 0 }}
            animate={{ x: 0, y: [-8, 8, -8], opacity: 0.95 }}
            transition={{ 
              x: { duration: 1, delay: 0.4 }, 
              y: { duration: 7, repeat: Infinity, ease: "easeInOut" } 
            }}
            className="absolute top-[68%] left-[0px] w-[250px] flex flex-col select-none bg-gray-800/40 border border-white/10 backdrop-blur-md shadow-2xl rounded-xl p-4 transition-all duration-300 ease-out hover:border-sky-500/50 hover:shadow-sky-500/5"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-bold text-sky-400 uppercase tracking-widest">Display Recepção</span>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">100% OK</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center"><CheckCircle2 size={10} className="text-emerald-400" /></div>
                <span className="text-xs text-slate-400 line-through">Reunião Geral 10h</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-white/10 bg-gray-900/60"></div>
                <span className="text-xs text-slate-300">Atualizar Display Copa</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer info in sidebar */}
        <div className="text-muted-foreground text-[10px] font-mono tracking-widest z-10 flex items-center gap-2">
          <span>TELA_HUB_OS v2.0</span>
          <span>•</span>
          <span>CORPORATE DIGITAL SIGNAGE</span>
        </div>
      </div>

      {/* Right Section: Login Form (Full width on mobile, centered; lg and above takes side portion) */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex items-center justify-center p-6 sm:p-12 relative z-10 bg-background border-l border-border/10 lg:border-border/5">

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md relative z-10 flex flex-col gap-6"
        >
          
          {/* Logo e Branding */}
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Logo perfeitamente alinhado acima do H1 */}
            <div className="w-20 h-20 bg-card flex items-center justify-center border border-border mb-4 shadow-md relative p-2.5">
               <LogoHub size={44} />
            </div>
            
            {/* Mobile Header (Hidden on lg since sidebar has it) */}
            <div className="lg:hidden text-center">
              <h1 className="text-3xl font-black text-foreground tracking-tight mb-1 uppercase font-sans">
                Tela<span className="text-accent">Hub</span>
              </h1>
              <p className="text-muted-foreground text-xs font-medium tracking-wide max-w-[280px] mx-auto">
                Gerenciamento inteligente de mídia digital corporativa
              </p>
            </div>
            
            {/* Desktop-only Header (Simpler, welcoming title) */}
            <div className="hidden lg:block text-center">
              <h1 className="text-2xl font-black text-foreground tracking-tight mb-1 uppercase font-sans">
                Acessar <span className="text-accent font-black">TelaHub</span>
              </h1>
              <p className="text-muted-foreground text-xs font-medium tracking-wide">
                Entre com suas credenciais administrativas
              </p>
            </div>
          </div>

          <div className={`bg-gray-800/50 border border-slate-700/50 shadow-2xl p-6 sm:p-8 rounded-2xl transition-all duration-300 ease-out hover:border-sky-500/30 ${!isConfigured ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-0.5">E-mail de Acesso</label>
                <div className="relative group">
                  <Input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 text-foreground border-slate-700 bg-gray-900/60 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none h-11 rounded-lg transition-all duration-300 ease-out"
                    placeholder="Ex: seu.email@exemplo.com"
                    autoComplete="username"
                  />
                  <User size={16} className="absolute left-3.5 top-3.5 text-muted-foreground group-focus-within:text-sky-400 transition-colors" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-0.5">Senha</label>
                <div className="relative group">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 text-foreground border-slate-700 bg-gray-900/60 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none h-11 rounded-lg transition-all duration-300 ease-out"
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                  />
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-muted-foreground group-focus-within:text-sky-400 transition-colors" />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-sky-400 transition-colors"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer group select-none">
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-300 ease-out ${rememberMe ? 'bg-sky-500 border-sky-500' : 'border-slate-700 bg-gray-900/60 group-hover:border-sky-400'}`}>
                    {rememberMe && <CheckCircle2 size={10} className="text-white stroke-[4]" />}
                  </div>
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="hidden"
                  />
                  <span className={`text-xs font-semibold transition-colors duration-300 ease-out ${rememberMe ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-200'}`}>Lembrar meu usuário</span>
                </label>
                
                <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs font-semibold text-slate-400 hover:text-sky-400 transition-colors duration-300 ease-out">Esqueceu a senha?</button>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-bold text-center animate-in fade-in slide-in-from-top-2 flex flex-col gap-1">
                  <span>{error}</span>
                  {error.includes('incorretos') && (
                    <span className="text-[10px] font-normal opacity-80 block mt-1">
                      Dica: Use o <strong>E-mail</strong> completo (ex: abner@hotmail.com)
                    </span>
                  )}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-6 rounded-lg shadow-md hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all duration-300 ease-out flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed text-xs tracking-wider active:scale-[0.98] border border-white/10 uppercase"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} className="group-hover:translate-x-0.5 transition-transform" />} 
                {loading ? 'ENTRANDO...' : 'ACESSAR SISTEMA'}
              </Button>
            </form>
          </div>
          
          <div className="text-center space-y-2 lg:hidden">
            <p className="text-muted-foreground text-[9px] font-mono uppercase tracking-widest">
              &copy; {new Date().getFullYear()} TelaHub System v2.0
            </p>
            <div className="flex justify-center gap-4">
               <div className="h-1 w-1 bg-border rounded-full"></div>
               <div className="h-1 w-1 bg-border rounded-full"></div>
               <div className="h-1 w-1 bg-border rounded-full"></div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
