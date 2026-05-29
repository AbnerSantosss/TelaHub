import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, LogIn, Loader2, AlertTriangle, CheckCircle2, Tv } from 'lucide-react';
import { motion } from 'motion/react';
import { login } from '../services/storage';

// Geometric minimal icon representing a matrix of interconnected screens (Corporate Amethyst Theme)
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
      <rect x="15" y="15" width="30" height="24" rx="4" stroke="#7C3AED" strokeWidth="3" fill="rgba(124, 58, 237, 0.1)" />
      <rect x="55" y="15" width="30" height="24" rx="4" stroke="#7C3AED" strokeWidth="3" fill="rgba(124, 58, 237, 0.1)" />
      <rect x="15" y="53" width="30" height="24" rx="4" stroke="#7C3AED" strokeWidth="3" fill="rgba(124, 58, 237, 0.1)" />
      <rect x="55" y="53" width="30" height="32" rx="4" stroke="#7C3AED" strokeWidth="3" fill="rgba(124, 58, 237, 0.1)" />
      
      {/* Interconnections (lines representing data flow) */}
      <path d="M45 27H55" stroke="#7C3AED" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
      <path d="M45 65H55" stroke="#7C3AED" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
      <path d="M30 39V53" stroke="#7C3AED" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
      <path d="M70 39V53" stroke="#7C3AED" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
      
      {/* Glowing center hub dot */}
      <circle cx="50" cy="46" r="5" fill="#7C3AED" />
      <circle cx="50" cy="46" r="10" stroke="#7C3AED" strokeWidth="1.5" className="animate-ping" opacity="0.4" />
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
    <div className="min-h-screen flex bg-[#1C1D22] text-[#F3F4F6] overflow-hidden font-sans relative">
      {/* Background Mesh Grid (Aceternity Style) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>
      
      {/* Lateral Marketing / Copywriting Panel (Desktop only: lg and above) */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative flex-col justify-between p-16 overflow-hidden border-r border-[#9CA3AF]/10 bg-gradient-to-br from-[#131418] via-[#1C1D22] to-[#252830] z-10">
        {/* Decorative background blur glow elements */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#7C3AED]/10 rounded-full blur-[150px] pointer-events-none"></div>
        
        {/* Upper Header: Logo and Brand Name */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-12 h-12 bg-gradient-to-br from-[#2D3139] to-[#1C1D22] rounded-xl flex items-center justify-center border border-[#9CA3AF]/15 shadow-lg p-2">
            <LogoHub size={28} />
          </div>
          <span className="text-2xl font-black tracking-tight text-white uppercase">
            Tela<span className="text-[#7C3AED]">Hub</span>
          </span>
        </div>

        {/* Core Marketing Copy & Feature List */}
        <div className="my-auto z-10 max-w-xl space-y-8 pr-8">
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-widest bg-[#7C3AED]/10 px-3.5 py-1.5 rounded-full border border-[#7C3AED]/20 inline-block">
              Mídia Digital Corporativa Premium
            </span>
            <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
              Transforme qualquer tela em um canal de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#A855F7]">comunicação inteligente</span>.
            </h2>
            <p className="text-slate-400 text-sm xl:text-base leading-relaxed">
              O TelaHub é um sistema full-stack premium para gerenciar e transmitir programações, informativos, indicadores corporativos e mídias de forma dinâmica e totalmente remota em tempo real.
            </p>
          </div>

          {/* Benefits list */}
          <div className="space-y-5">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED] shrink-0 mt-0.5">
                <Tv size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Gestão Remota de Displays</h4>
                <p className="text-xs text-slate-400 mt-1">Monitore e gerencie Smart TVs, painéis e totens direto do painel administrativo, com pareamento instantâneo via código.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Editor Modular com +20 Widgets</h4>
                <p className="text-xs text-slate-400 mt-1">Crie layouts de arrastar-e-soltar com previsão do tempo, cotações, metas de produtividade, feeds RSS e integrações nativas de Power BI.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Sincronização em Tempo Real (SSE)</h4>
                <p className="text-xs text-slate-400 mt-1">Transmissões de emergência, comunicados imediatos e mudanças de layout sincronizam instantaneamente sem recarregar as telas.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Mockup Widgets using motion for incredible premium vibe */}
        <div className="absolute right-[-60px] xl:right-[-40px] top-[15%] w-[380px] h-[500px] pointer-events-none hidden xl:block select-none opacity-90">
          {/* Floating Weather Widget */}
          <motion.div 
            initial={{ x: 50, y: 0, opacity: 0 }}
            animate={{ x: 0, y: [-15, 10, -15], opacity: 1 }}
            transition={{ 
              x: { duration: 1 }, 
              y: { duration: 6, repeat: Infinity, ease: "easeInOut" } 
            }}
            className="absolute top-[10%] left-0 w-[240px] bg-[#2D3139]/80 backdrop-blur-md border border-[#9CA3AF]/20 rounded-2xl p-5 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Tempo Real</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 text-xl">☀️</div>
              <div>
                <h5 className="text-xs font-bold text-white">São Paulo, BR</h5>
                <p className="text-[10px] text-slate-400 font-medium">Ensolarado • 26°C</p>
              </div>
            </div>
          </motion.div>

          {/* Floating Market Watch Widget */}
          <motion.div 
            initial={{ x: 100, y: 0, opacity: 0 }}
            animate={{ x: 0, y: [15, -15, 15], opacity: 1 }}
            transition={{ 
              x: { duration: 1, delay: 0.2 }, 
              y: { duration: 7, repeat: Infinity, ease: "easeInOut" } 
            }}
            className="absolute top-[42%] left-[40px] w-[260px] bg-[#2D3139]/90 backdrop-blur-md border border-[#9CA3AF]/20 rounded-2xl p-5 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-bold text-[#7C3AED] uppercase tracking-widest">Painel Financeiro</span>
              <span className="text-[10px] font-mono font-bold text-emerald-400">+2.47%</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-200">PETR4.SA</span>
                <span className="text-xs font-bold text-slate-100">R$ 38,42</span>
              </div>
              <div className="h-6 w-full opacity-60">
                <svg className="w-full h-full" viewBox="0 0 100 20">
                  <path d="M0,15 L20,10 L40,12 L60,5 L80,8 L100,2" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Floating Chores/Todos Widget */}
          <motion.div 
            initial={{ x: 120, y: 0, opacity: 0 }}
            animate={{ x: 0, y: [-5, 12, -5], opacity: 0.8 }}
            transition={{ 
              x: { duration: 1, delay: 0.4 }, 
              y: { duration: 5, repeat: Infinity, ease: "easeInOut" } 
            }}
            className="absolute top-[75%] left-[-20px] w-[220px] bg-[#2D3139]/70 backdrop-blur-md border border-[#9CA3AF]/15 rounded-2xl p-4 shadow-2xl"
          >
            <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest block mb-2">Produtividade</span>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded border border-emerald-500 bg-emerald-500/20 flex items-center justify-center"><CheckCircle2 size={10} className="text-emerald-400" /></div>
                <span className="text-[10px] text-slate-300 line-through">Reunião Geral 10h</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded border border-[#9CA3AF]/30"></div>
                <span className="text-[10px] text-slate-300">Atualizar Display Copa</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer info in sidebar */}
        <div className="text-slate-500 text-xs font-mono tracking-wider z-10 flex items-center gap-2">
          <span>TELA_HUB_OS v2.0</span>
          <span>•</span>
          <span>CORPORATE DIGITAL SIGNAGE</span>
        </div>
      </div>

      {/* Right Section: Login Form (Full width on mobile, centered; lg and above takes side portion) */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex items-center justify-center p-6 sm:p-12 relative z-10 bg-[#1C1D22]">
        {/* Subtle Radial Glow in Violet/Indigo on right side */}
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] bg-[#7C3AED]/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

        <div className="w-full max-w-md relative z-10 flex flex-col gap-6">
          
          {/* Logo e Branding */}
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Logo perfeitamente alinhado acima do H1 */}
            <div className="w-20 h-20 bg-gradient-to-br from-[#2D3139] to-[#1C1D22] rounded-2xl flex items-center justify-center border border-[#9CA3AF]/10 mb-4 shadow-[0_0_30px_rgba(124,58,237,0.12)] relative group p-3">
               <div className="absolute inset-0 bg-[#7C3AED]/5 rounded-2xl blur-xl group-hover:bg-[#7C3AED]/10 transition-all duration-500"></div>
               <LogoHub size={44} />
            </div>
            
            {/* Mobile Header (Hidden on lg since sidebar has it) */}
            <div className="lg:hidden text-center">
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F3F4F6] via-[#9CA3AF] to-[#9CA3AF] tracking-tight mb-1 uppercase">
                Tela<span className="text-[#7C3AED]">Hub</span>
              </h1>
              <p className="text-[#9CA3AF] text-xs font-medium tracking-wide max-w-[280px] mx-auto">
                Gerenciamento inteligente de mídia digital corporativa
              </p>
            </div>
            
            {/* Desktop-only Header (Simpler, welcoming title) */}
            <div className="hidden lg:block text-center">
              <h1 className="text-2xl font-black text-slate-100 tracking-tight mb-1 uppercase">
                Acessar <span className="text-[#7C3AED]">TelaHub</span>
              </h1>
              <p className="text-[#9CA3AF] text-xs font-medium tracking-wide">
                Entre com suas credenciais administrativas
              </p>
            </div>
          </div>

          <div className={`bg-[#2D3139] border border-[#9CA3AF]/15 rounded-3xl shadow-2xl p-6 sm:p-8 transition-all duration-500 hover:border-[#7C3AED]/30 hover:shadow-[0_0_60px_rgba(124,58,237,0.08)] ${!isConfigured ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider pl-1">E-mail de Acesso</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#1C1D22]/60 border border-[#9CA3AF]/20 rounded-xl py-3.5 pl-12 text-[#F3F4F6] outline-none focus:border-[#7C3AED] focus:bg-[#1C1D22] focus:shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all placeholder:text-[#9CA3AF]/40 text-sm"
                    placeholder="Ex: seu.email@exemplo.com"
                    autoComplete="username"
                  />
                  <User size={18} className="absolute left-4 top-3.5 text-[#9CA3AF]/60 group-focus-within:text-[#7C3AED] transition-colors" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider pl-1">Senha</label>
                <div className="relative group">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#1C1D22]/60 border border-[#9CA3AF]/20 rounded-xl py-3.5 pl-12 pr-10 text-[#F3F4F6] outline-none focus:border-[#7C3AED] focus:bg-[#1C1D22] focus:shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all placeholder:text-[#9CA3AF]/40 text-sm"
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
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

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-[#9CA3AF]/40 bg-[#1C1D22] group-hover:border-[#9CA3AF]'}`}>
                    {rememberMe && <CheckCircle2 size={10} className="text-[#F3F4F6] stroke-[4]" />}
                  </div>
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="hidden"
                  />
                  <span className={`text-xs font-semibold transition-colors ${rememberMe ? 'text-[#7C3AED]' : 'text-[#9CA3AF]/80 group-hover:text-white'}`}>Lembrar meu usuário</span>
                </label>
                
                <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs font-medium text-[#9CA3AF]/80 hover:text-[#7C3AED] transition-colors">Esqueceu a senha?</button>
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

              <button 
                type="submit" 
                disabled={loading}
                className="w-full liquid-metal-btn text-[#F3F4F6] font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />} 
                {loading ? 'ENTRANDO...' : 'ACESSAR SISTEMA'}
              </button>
            </form>
          </div>
          
          <div className="text-center space-y-2 lg:hidden">
            <p className="text-[#9CA3AF] text-[10px] font-mono uppercase tracking-widest">
              &copy; {new Date().getFullYear()} TelaHub System v2.0
            </p>
            <div className="flex justify-center gap-4">
               <div className="h-1 w-1 bg-[#9CA3AF]/30 rounded-full"></div>
               <div className="h-1 w-1 bg-[#9CA3AF]/30 rounded-full"></div>
               <div className="h-1 w-1 bg-[#9CA3AF]/30 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
