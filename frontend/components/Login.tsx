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
      <rect x="15" y="15" width="30" height="24" rx="2" stroke="var(--brand-accent)" strokeWidth="3.5" fill="rgba(234, 88, 12, 0.05)" />
      <rect x="55" y="15" width="30" height="24" rx="2" stroke="var(--brand-accent)" strokeWidth="3.5" fill="rgba(234, 88, 12, 0.05)" />
      <rect x="15" y="53" width="30" height="24" rx="2" stroke="var(--brand-accent)" strokeWidth="3.5" fill="rgba(234, 88, 12, 0.05)" />
      <rect x="55" y="53" width="30" height="32" rx="2" stroke="var(--brand-accent)" strokeWidth="3.5" fill="rgba(234, 88, 12, 0.05)" />
      
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
      <div className="absolute inset-0 bg-[radial-gradient(rgba(234,88,12,0.04)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0"></div>
      
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
            <span className="text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/10 px-3.5 py-1.5 border border-accent/20 inline-block">
              Mídia Digital Corporativa Premium
            </span>
            <h2 className="text-4xl xl:text-5xl font-black text-foreground leading-tight tracking-tight font-sans">
              Transforme qualquer tela em um canal de <span className="text-accent">comunicação inteligente</span>.
            </h2>
            <p className="text-muted-foreground text-sm xl:text-base leading-relaxed">
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
        <div className="absolute right-[-60px] xl:right-[-40px] top-[15%] w-[380px] h-[500px] pointer-events-none hidden xl:block select-none opacity-95">
          {/* TV 1: Monitor de Clima (Horizontal 16:9) */}
          <motion.div 
            initial={{ x: 50, y: 0, opacity: 0 }}
            animate={{ x: 0, y: [-10, 10, -10], opacity: 1 }}
            transition={{ 
              x: { duration: 1 }, 
              y: { duration: 6, repeat: Infinity, ease: "easeInOut" } 
            }}
            className="absolute top-[5%] left-[20px] w-[250px] flex flex-col select-none filter drop-shadow-2xl"
          >
            {/* TV Bezel */}
            <div className="border-[4px] border-border bg-[#18181b] relative overflow-hidden p-3.5 pt-4 border-b-[6px] border-b-border shadow-lg">
              {/* Power LED Indicator */}
              <div className="absolute bottom-[1.5px] left-1/2 -translate-x-1/2 w-1 h-1 bg-[#10B981] rounded-full"></div>
              
              <div className="flex justify-between items-center mb-3">
                <span className="text-[8px] font-black text-accent uppercase tracking-widest">Display Copa #01</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-amber-500/10 flex items-center justify-center text-amber-500 text-lg">☀️</div>
                <div>
                  <h5 className="text-[11px] font-black text-white leading-tight">São Paulo, BR</h5>
                  <p className="text-[9px] text-[#9CA3AF] font-bold">Ensolarado • 26°C</p>
                </div>
              </div>
            </div>
            {/* TV Neck & Base */}
            <div className="w-2.5 h-2 bg-border mx-auto"></div>
            <div className="w-14 h-0.5 bg-border rounded mx-auto"></div>
          </motion.div>

          {/* TV 2: Totem de Indicadores (Vertical Totem Monitor 9:16) */}
          <motion.div 
            initial={{ x: 100, y: 0, opacity: 0 }}
            animate={{ x: 0, y: [10, -10, 10], opacity: 1 }}
            transition={{ 
              x: { duration: 1, delay: 0.2 }, 
              y: { duration: 7, repeat: Infinity, ease: "easeInOut" } 
            }}
            className="absolute top-[34%] right-[20px] w-[170px] flex flex-col select-none filter drop-shadow-2xl"
          >
            {/* TV Bezel (Vertical) */}
            <div className="border-[4px] border-border bg-[#18181b] relative overflow-hidden p-3.5 pb-5 border-b-[6px] border-b-border shadow-lg flex flex-col h-[210px]">
              {/* Power LED Indicator */}
              <div className="absolute bottom-[1.5px] left-1/2 -translate-x-1/2 w-1 h-1 bg-accent rounded-full"></div>
              
              <div className="flex justify-between items-center mb-3">
                <span className="text-[7px] font-black text-accent uppercase tracking-widest">Totem Sul #02</span>
                <span className="text-[8px] font-mono font-black text-emerald-400">+2.47%</span>
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h6 className="text-[9px] font-black text-slate-400 block mb-0.5 leading-none">Métrica Financeira</h6>
                  <span className="text-[11px] font-bold text-white">PETR4.SA</span>
                  <span className="text-[11px] font-black text-[#F3F4F6] block mt-0.5">R$ 38,42</span>
                </div>
                <div className="h-10 w-full mt-2 bg-[#09090b]/60 rounded p-1.5 flex items-center border border-white/5">
                  <svg className="w-full h-full" viewBox="0 0 100 30">
                    <path d="M0,25 L20,18 L40,22 L60,8 L80,14 L100,2" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
            {/* TV Neck & Base */}
            <div className="w-2.5 h-3 bg-border mx-auto"></div>
            <div className="w-16 h-1 bg-border rounded mx-auto"></div>
          </motion.div>

          {/* TV 3: Painel de Tarefas (Horizontal 16:9) */}
          <motion.div 
            initial={{ x: 120, y: 0, opacity: 0 }}
            animate={{ x: 0, y: [-8, 8, -8], opacity: 0.95 }}
            transition={{ 
              x: { duration: 1, delay: 0.4 }, 
              y: { duration: 5, repeat: Infinity, ease: "easeInOut" } 
            }}
            className="absolute top-[68%] left-[0px] w-[240px] flex flex-col select-none filter drop-shadow-2xl"
          >
            {/* TV Bezel */}
            <div className="border-[4px] border-border bg-[#18181b] relative overflow-hidden p-3.5 pt-4 border-b-[6px] border-b-border shadow-lg">
              {/* Power LED Indicator */}
              <div className="absolute bottom-[1.5px] left-1/2 -translate-x-1/2 w-1 h-1 bg-[#10B981] rounded-full"></div>
              
              <div className="flex justify-between items-center mb-3">
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Display Recepção</span>
                <span className="text-[8px] font-mono text-slate-500 font-bold">100% OK</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-sm border border-emerald-500 bg-emerald-500/20 flex items-center justify-center"><CheckCircle2 size={8} className="text-emerald-400" /></div>
                  <span className="text-[10px] text-slate-400 line-through">Reunião Geral 10h</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-sm border border-border"></div>
                  <span className="text-[10px] text-slate-300">Atualizar Display Copa</span>
                </div>
              </div>
            </div>
            {/* TV Neck & Base */}
            <div className="w-2.5 h-2 bg-border mx-auto"></div>
            <div className="w-14 h-0.5 bg-border rounded mx-auto"></div>
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
      <div className="w-full lg:w-[45%] xl:w-[40%] flex items-center justify-center p-6 sm:p-12 relative z-10 bg-background border-l border-border/5">

        <div className="w-full max-w-md relative z-10 flex flex-col gap-6">
          
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

          <div className={`bg-card border border-border shadow-md p-6 sm:p-8 transition-all duration-300 hover:border-accent/30 ${!isConfigured ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-0.5">E-mail de Acesso</label>
                <div className="relative group">
                  <Input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 text-foreground border-border bg-background focus-visible:ring-ring h-11"
                    placeholder="Ex: seu.email@exemplo.com"
                    autoComplete="username"
                  />
                  <User size={16} className="absolute left-3.5 top-3.5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-0.5">Senha</label>
                <div className="relative group">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 text-foreground border-border bg-background focus-visible:ring-ring h-11"
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
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

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer group select-none">
                  <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all ${rememberMe ? 'bg-accent border-accent' : 'border-input bg-background group-hover:border-muted-foreground'}`}>
                    {rememberMe && <CheckCircle2 size={10} className="text-white stroke-[4]" />}
                  </div>
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="hidden"
                  />
                  <span className={`text-xs font-semibold transition-colors ${rememberMe ? 'text-accent' : 'text-muted-foreground group-hover:text-foreground'}`}>Lembrar meu usuário</span>
                </label>
                
                <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs font-semibold text-muted-foreground hover:text-accent transition-colors">Esqueceu a senha?</button>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-sm font-bold text-center animate-in fade-in slide-in-from-top-2 flex flex-col gap-1">
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
                className="w-full bg-accent text-accent-foreground font-black py-6 rounded shadow hover:bg-accent/90 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed text-xs tracking-wider"
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
        </div>
      </div>
    </div>
  );
};

export default Login;
