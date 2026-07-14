import React, { useState, useEffect, useCallback } from 'react';
import { Tv, Zap, Shield, BarChart3, Monitor, Smartphone, ChevronRight, Star, Check, Clock, ArrowRight, Users, Globe, Play, Pause } from 'lucide-react';

// ============================================================
// TELAHUB LANDING PAGE — VENDAS AGRESSIVAS
// Copywriting + Design System proprietário
// ============================================================

/* ── Countdown Timer (Urgência real) ── */
const CountdownBanner: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({ horas: 0, min: 0, seg: 0 });

  const calcTime = useCallback(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const diff = end.getTime() - now.getTime();
    return {
      horas: Math.floor(diff / (1000 * 60 * 60)),
      min: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seg: Math.floor((diff % (1000 * 60)) / 1000),
    };
  }, []);

  useEffect(() => {
    setTimeLeft(calcTime());
    const t = setInterval(() => setTimeLeft(calcTime()), 1000);
    return () => clearInterval(t);
  }, [calcTime]);

  return (
    <div className="w-full bg-gradient-to-r from-[#FF3B00] via-[#FF5C1A] to-[#FF3B00] text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMTAgTDEwIDAgTTEwIDQwIEw0MCAzMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDYpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] opacity-40" />
      <div className="th-container py-2.5 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm font-semibold relative z-10">
        <span className="flex items-center gap-1.5">
          <Clock size={15} className="animate-pulse" />
          <span className="font-black tracking-wider">OFERTA RELÂMPAGO ACABA HOJE:</span>
        </span>
        <span className="flex gap-1.5 font-mono tabular-nums">
          {['horas','min','seg'].map((u, i) => (
            <span key={u} className="flex items-center gap-1">
              <span className="bg-black/25 px-2 py-0.5 rounded text-base font-black min-w-[2.2rem] text-center tabular-nums">
                {String(timeLeft[u as keyof typeof timeLeft]).padStart(2, '0')}
              </span>
              <span className="text-[10px] uppercase tracking-widest opacity-80">{u}</span>
              {i < 2 && <span className="text-black/40 font-black">:</span>}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
};

/* ── Stats Marquee ── */
const StatsMarquee: React.FC = () => {
  const stats = [
    { value: '+500', label: 'Empresas Ativas' },
    { value: '12.400+', label: 'Displays Gerenciados' },
    { value: '99,9%', label: 'Uptime Garantido' },
    { value: '4.9', label: 'Avaliação Média' },
  ];

  return (
    <div className="w-full py-3 bg-[#0A0D16] border-y border-white/5 overflow-hidden">
      <div className="flex gap-12 md:gap-20 justify-center flex-wrap">
        {stats.map(s => (
          <div key={s.label} className="flex items-center gap-2.5">
            <span className="text-xl md:text-2xl font-black text-[#FFD700] tabular-nums leading-none">{s.value}</span>
            <span className="text-[11px] text-[#9DA4B4] font-semibold uppercase tracking-wider leading-tight max-w-[70px]">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Plan Card ── */
interface PlanCardProps {
  nome: string;
  precoDe: string;
  precoPor: string;
  destaque?: boolean;
  recursos: string[];
  cta: string;
  cor: string;
}
const PlanCard: React.FC<PlanCardProps> = ({ nome, precoDe, precoPor, destaque, recursos, cta, cor }) => (
  <div className={`relative flex flex-col rounded-2xl border p-6 md:p-8 h-full transition-all duration-300
    ${destaque
      ? 'border-[#FF3B00]/40 bg-gradient-to-b from-[#FF3B00]/8 to-transparent shadow-[0_0_40px_rgba(255,59,0,0.12)] scale-[1.02] md:scale-105 z-10'
      : 'border-white/8 bg-[#0D1117]/70 hover:border-white/15 hover:bg-[#0D1117]'
    }`}
  >
    {destaque && (
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#FF3B00] text-white text-[10px] font-black uppercase tracking-[0.15em] px-5 py-1.5 rounded-full whitespace-nowrap">
        🏆 MAIS VENDIDO
      </div>
    )}
    <h3 className={`text-lg font-black mb-1 ${destaque ? 'text-[#FFD700]' : 'text-white'}`}>{nome}</h3>
    <div className="mb-5">
      <span className="text-sm text-[#6B7280] line-through">R$ {precoDe}</span>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-xs text-[#9DA4B4]">R$</span>
        <span className={`text-4xl font-black tracking-tight ${destaque ? 'text-[#FF3B00]' : 'text-white'}`}>{precoPor}</span>
        <span className="text-sm text-[#9DA4B4]">/mês</span>
      </div>
    </div>
    <ButtonPrimary href="#cta" className="w-full mb-5" variant={destaque ? 'fire' : 'ghost'}>
      {cta}
    </ButtonPrimary>
    <ul className="space-y-2.5 mt-auto">
      {recursos.map(r => (
        <li key={r} className="flex items-start gap-2 text-sm">
          <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <span className="text-[#B0B8C4]">{r}</span>
        </li>
      ))}
    </ul>
  </div>
);

/* ── Primary CTA Button ── */
const ButtonPrimary: React.FC<{ href: string; className?: string; children: React.ReactNode; variant?: 'fire' | 'ghost' }> = ({ href, className, children, variant = 'fire' }) => {
  const base = variant === 'fire'
    ? 'bg-[#FF3B00] hover:bg-[#E03500] text-white shadow-[0_4px_24px_rgba(255,59,0,0.35)] hover:shadow-[0_6px_32px_rgba(255,59,0,0.5)] border border-[#FF3B00]'
    : 'bg-transparent hover:bg-white/5 text-white border border-white/15 hover:border-white/30';
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-black text-sm uppercase tracking-[0.08em] transition-all duration-200 active:scale-[0.97] ${base} ${className}`}
    >
      {children}
    </a>
  );
};

/* ── Feature Card ── */
const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="group p-6 rounded-xl border border-white/6 bg-[#0D1117]/60 hover:border-[#FF3B00]/25 hover:bg-[#0D1117] transition-all duration-300">
    <div className="w-11 h-11 rounded-lg bg-[#FF3B00]/8 border border-[#FF3B00]/15 flex items-center justify-center mb-4 group-hover:bg-[#FF3B00]/15 group-hover:scale-105 transition-all duration-300">
      {icon}
    </div>
    <h4 className="text-sm font-black text-white mb-2">{title}</h4>
    <p className="text-[13px] text-[#8B93A4] leading-relaxed">{desc}</p>
  </div>
);

/* ── Pain Card ── */
const PainCard: React.FC<{ emoji: string; dor: string; solucao: string }> = ({ emoji, dor, solucao }) => (
  <div className="flex gap-4 items-start p-5 rounded-xl border border-white/5 bg-[#0D1117]/40">
    <span className="text-2xl shrink-0">{emoji}</span>
    <div>
      <p className="text-sm font-bold text-[#FF3B00] mb-1">PROBLEMA:</p>
      <p className="text-sm text-[#B0B8C4] mb-3">{dor}</p>
      <p className="text-sm font-bold text-emerald-400 mb-1">COM TELAHUB:</p>
      <p className="text-sm text-[#B0B8C4]">{solucao}</p>
    </div>
  </div>
);

/* ── Testimonial Card ── */
const TestimonialCard: React.FC<{ nome: string; cargo: string; texto: string; stars?: number }> = ({ nome, cargo, texto, stars = 5 }) => (
  <div className="p-6 rounded-xl border border-white/6 bg-[#0D1117]/50 flex flex-col">
    <div className="flex gap-0.5 mb-3">
      {Array.from({ length: stars }).map((_, i) => <Star key={i} size={14} className="text-[#FFD700] fill-[#FFD700]" />)}
    </div>
    <p className="text-sm text-[#B0B8C4] leading-relaxed mb-4 flex-1 italic">"{texto}"</p>
    <div>
      <p className="text-sm font-black text-white">{nome}</p>
      <p className="text-[11px] text-[#6B7280] font-semibold">{cargo}</p>
    </div>
  </div>
);

/* ── FAQ Item ── */
const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/6">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full py-5 flex items-center justify-between text-left gap-4 group"
      >
        <span className="text-sm font-bold text-white group-hover:text-[#FFD700] transition-colors">{q}</span>
        <span className={`text-[#FF3B00] transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
        </span>
      </button>
      {open && <p className="pb-5 text-sm text-[#8B93A4] leading-relaxed pr-6">{a}</p>}
    </div>
  );
};

/* ============================================================
   COMPONENTE PRINCIPAL — LANDING PAGE
   ============================================================ */
const Landing: React.FC = () => {
  const [videoPlaying, setVideoPlaying] = useState(true);

  return (
    <div className="min-h-screen bg-[#06080D] text-white overflow-x-hidden font-sans selection:bg-[#FF3B00]/30 selection:text-[#FFD700]">

      {/* ═══════ URGENCY BANNER ═══════ */}
      <CountdownBanner />

      {/* ═══════ HERO ═══════ */}
      <header className="relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-[-30%] right-[-15%] w-[600px] h-[600px] rounded-full bg-[#FF3B00]/6 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[#FFD700]/4 blur-[120px] pointer-events-none" />

        <div className="th-container py-16 md:py-24 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            {/* Left: Copy */}
            <div className="flex-1 text-center lg:text-left space-y-6">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#FF3B00] uppercase tracking-[0.15em] bg-[#FF3B00]/8 border border-[#FF3B00]/20 px-4 py-1.5 rounded-full">
                <Zap size={13} /> Plataforma de Digital Signage Nº1 do Brasil
              </span>

              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.05] tracking-tight">
                <span className="text-white">Suas telas paradas </span>
                <span className="bg-gradient-to-r from-[#FF3B00] via-[#FF5C1A] to-[#FFD700] bg-clip-text text-transparent">
                  perdendo dinheiro
                </span>
                <span className="text-white">. Isso acaba </span>
                <span className="inline-block bg-[#FF3B00] text-white px-3 py-0.5 rounded-lg -rotate-1">HOJE.</span>
              </h1>

              <p className="text-base md:text-lg text-[#9DA4B4] max-w-xl leading-relaxed">
                Transforme cada TV da sua empresa em um canal de comunicação que <strong className="text-white">vende, informa e engaja</strong> — 100% remoto, sem instalar nada complicado. Resultado visível na primeira hora.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <ButtonPrimary href="#planos" variant="fire" className="text-base px-10 py-4">
                  COMEÇAR COM 40% OFF <ArrowRight size={18} />
                </ButtonPrimary>
                <ButtonPrimary href="#demo" variant="ghost" className="text-base px-10 py-4">
                  <Play size={16} /> VER DEMO DE 2 MIN
                </ButtonPrimary>
              </div>

              <p className="text-[11px] text-[#6B7280] font-medium">
                ⚡ Sem cartão de crédito • Setup em menos de 3 minutos • Cancele quando quiser
              </p>
            </div>

            {/* Right: Visual Demo */}
            <div className="flex-1 w-full max-w-[540px]">
              <div className="relative rounded-2xl border border-white/8 bg-[#0D1117] overflow-hidden shadow-[0_0_60px_rgba(255,59,0,0.08)]">
                {/* Fake browser bar */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0A0D16] border-b border-white/5">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B00]/50" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFD700]/50" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/50" />
                  </div>
                  <span className="mx-auto text-[10px] text-[#6B7280] font-mono">app.telahub.com/dashboard</span>
                </div>
                {/* Demo video or mock */}
                <div className="aspect-video bg-[#0A0D16] relative flex items-center justify-center">
                  <video
                    src="/backgrounds/bg_desktop.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover opacity-30"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="flex gap-2 mb-3">
                      {[
                        { label: 'TV Copa', w: 'w-20', color: 'border-sky-400/20 bg-sky-400/5' },
                        { label: 'Totem Entrada', w: 'w-24', color: 'border-emerald-400/20 bg-emerald-400/5' },
                        { label: 'Painel Vendas', w: 'w-28', color: 'border-[#FF3B00]/20 bg-[#FF3B00]/5' },
                      ].map(c => (
                        <span key={c.label} className={`${c.w} ${c.color} border rounded-md px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-center`}>
                          {c.label}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-[#9DA4B4] font-semibold">Dashboard em tempo real</p>
                    <p className="text-[10px] text-[#6B7280] mt-1 font-mono">3 displays ativos • todos online</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════ STATS MARQUEE ═══════ */}
      <StatsMarquee />

      {/* ═══════ PROBLEMAS QUE RESOLVEMOS ═══════ */}
      <section className="th-container py-20 md:py-28">
        <div className="text-center mb-14">
          <span className="text-[11px] font-black text-[#FF3B00] uppercase tracking-[0.15em] bg-[#FF3B00]/8 px-4 py-1 rounded-full">
            Pare de perder dinheiro
          </span>
          <h2 className="text-3xl md:text-4xl font-black mt-4 mb-3 leading-tight">
            Sua empresa sofre com{' '}
            <span className="bg-gradient-to-r from-[#FF3B00] to-[#FF5C1A] bg-clip-text text-transparent">isso todo dia</span>?
          </h2>
          <p className="text-[#8B93A4] max-w-xl mx-auto">Se identificou com algum desses? O TelaHub foi feito pra resolver exatamente isso.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <PainCard
            emoji="📺"
            dor="TVs desligadas ou passando o mesmo slide em loop há 6 meses. Conteúdo parado não vende."
            solucao="Programação dinâmica com +20 widgets: clima, cotações, metas, feeds RSS. Tudo atualizando em tempo real."
          />
          <PainCard
            emoji="😰"
            dor="Precisa ir até cada TV fisicamente pra atualizar um banner. Tempo e dinheiro indo pro ralo."
            solucao="Gerencie TODAS as telas remotamente do seu computador ou celular. Uma mudança, todas as telas atualizadas."
          />
          <PainCard
            emoji="📊"
            dor="Não sabe se as telas estão realmente ligadas e funcionando. Zero visibilidade."
            solucao="Monitoramento em tempo real de cada display. Status online/offline, uptime, e logs de exibição."
          />
          <PainCard
            emoji="💸"
            dor="Pagou caro em sistema complicado que ninguém na equipe consegue usar. Adoção zero."
            solucao="Interface drag-and-drop intuitiva. Qualquer pessoa da equipe aprende em minutos. Zero treinamento técnico."
          />
        </div>
      </section>

      {/* ═══════ COMO FUNCIONA ═══════ */}
      <section className="bg-[#0A0D16] border-y border-white/5">
        <div className="th-container py-20 md:py-28">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-3">
              Do zero ao ar em{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-[#FFD700] bg-clip-text text-transparent">3 passos</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { step: '01', icon: <Monitor size={22} className="text-[#FF3B00]" />, title: 'Crie seu display', desc: 'Dê um nome, escolha a orientação (horizontal ou vertical) e pronto. Sua tela digital já existe.' },
              { step: '02', icon: <Tv size={22} className="text-[#FFD700]" />, title: 'Vincule qualquer TV', desc: 'Abra o player em qualquer Smart TV ou dispositivo Android. Digite o código de 6 dígitos. Pareado.' },
              { step: '03', icon: <Zap size={22} className="text-emerald-400" />, title: 'Publique e veja o resultado', desc: 'Monte seu layout arrastando widgets, agende conteúdos, e veja tudo funcionando em tempo real.' },
            ].map(s => (
              <div key={s.step} className="relative text-center group">
                <span className="text-[64px] font-black text-white/3 absolute top-[-20px] left-1/2 -translate-x-1/2 select-none group-hover:text-[#FF3B00]/5 transition-colors">{s.step}</span>
                <div className="relative z-10 pt-8">
                  <div className="w-14 h-14 rounded-xl bg-[#0D1117] border border-white/8 flex items-center justify-center mx-auto mb-4 group-hover:border-[#FF3B00]/30 group-hover:scale-105 transition-all duration-300">
                    {s.icon}
                  </div>
                  <h4 className="text-sm font-black text-white mb-2">{s.title}</h4>
                  <p className="text-[13px] text-[#8B93A4] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ RECURSOS ═══════ */}
      <section className="th-container py-20 md:py-28">
        <div className="text-center mb-14">
          <span className="text-[11px] font-black text-[#FF3B00] uppercase tracking-[0.15em] bg-[#FF3B00]/8 px-4 py-1 rounded-full">
            Tudo que você precisa
          </span>
          <h2 className="text-3xl md:text-4xl font-black mt-4 mb-3">
            O arsenal completo pra{' '}
            <span className="bg-gradient-to-r from-[#FF3B00] to-[#FFD700] bg-clip-text text-transparent">dominar suas telas</span>
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <FeatureCard icon={<Tv size={20} className="text-[#FF3B00]" />} title="+20 Widgets Nativos" desc="Clima, relógio, cotações B3, metas, RSS, Power BI, trânsito, redes sociais e mais. Tudo arrastável." />
          <FeatureCard icon={<Monitor size={20} className="text-[#FFD700]" />} title="Editor Drag & Drop" desc="Monte layouts profissionais em minutos. Horizontal, vertical, qualquer proporção. Visualize em tempo real." />
          <FeatureCard icon={<BarChart3 size={20} className="text-emerald-400" />} title="Dashboards Corporativos" desc="Integração nativa com Power BI, Google Data Studio e APIs REST. KPIs ao vivo nas telas." />
          <FeatureCard icon={<Smartphone size={20} className="text-[#FF3B00]" />} title="Gestão Mobile" desc="Controle tudo do celular. Publique comunicados de emergência, mude layouts, monitore status." />
          <FeatureCard icon={<Globe size={20} className="text-[#FFD700]" />} title="Multi-Unidades" desc="Gerencie displays em dezenas de filiais. Agrupamento por região, loja, departamento." />
          <FeatureCard icon={<Shield size={20} className="text-emerald-400" />} title="Segurança Empresarial" desc="Criptografia ponta-a-ponta, autenticação 2 fatores, logs de auditoria. Preparado pra LGPD." />
          <FeatureCard icon={<Zap size={20} className="text-[#FF3B00]" />} title="Tempo Real (SSE)" desc="Atualizações instantâneas via Server-Sent Events. Sem refresh, sem delay. O que você publica aparece na hora." />
          <FeatureCard icon={<Users size={20} className="text-[#FFD700]" />} title="Multi-Usuário" desc="Convide sua equipe com permissões personalizadas. Admin, editor, visualizador. Cada um vê o que precisa." />
          <FeatureCard icon={<Clock size={20} className="text-emerald-400" />} title="Agendamento Inteligente" desc="Programe playlists por horário, dia da semana ou data específica. Conteúdo certo na hora certa." />
        </div>
      </section>

      {/* ═══════ DEPOIMENTOS ═══════ */}
      <section className="bg-[#0A0D16] border-y border-white/5">
        <div className="th-container py-20 md:py-28">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-3">
              Quem usa,{' '}
              <span className="bg-gradient-to-r from-[#FFD700] to-[#FF3B00] bg-clip-text text-transparent">aprova</span>
            </h2>
            <div className="flex items-center justify-center gap-2 text-sm text-[#8B93A4]">
              <span className="flex gap-0.5">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} className="text-[#FFD700] fill-[#FFD700]" />)}
              </span>
              <span className="font-bold text-white">4.9</span> de 5 • +200 avaliações
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            <TestimonialCard
              nome="Ricardo Almeida"
              cargo="Diretor de Marketing • Rede SuperVarejo"
              texto="Instalamos em 42 lojas em 2 dias. O time de marketing agora publica ofertas do dia direto do celular. Nossas vendas de itens promocionais subiram 18%."
            />
            <TestimonialCard
              nome="Camila Nogueira"
              cargo="COO • Hospital São Lucas"
              texto="Usamos nos painéis de espera e monitores dos corredores. Comunicação interna melhorou absurdamente. Até o sindicato elogiou a transparência das informações."
            />
            <TestimonialCard
              nome="André Menezes"
              cargo="Gerente de TI • Grupo Educacional Conexão"
              texto="Migrei 87 telas de um concorrente pra cá. Economia de 60% na mensalidade e muito mais funcionalidades. O suporte respondeu num domingo às 22h!"
            />
          </div>
        </div>
      </section>

      {/* ═══════ PLANOS ═══════ */}
      <section id="planos" className="th-container py-20 md:py-28">
        <div className="text-center mb-14">
          <span className="text-[11px] font-black text-[#FF3B00] uppercase tracking-[0.15em] bg-[#FF3B00]/8 px-4 py-1 rounded-full">
            Preços que cabem no seu bolso
          </span>
          <h2 className="text-3xl md:text-4xl font-black mt-4 mb-3">
            Escolha seu plano.{' '}
            <span className="bg-gradient-to-r from-[#FF3B00] to-[#FFD700] bg-clip-text text-transparent">Economize até 40%</span>
          </h2>
          <p className="text-[#8B93A4]">Preços promocionais de lançamento. Quem entrar agora garante o desconto pra sempre.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto items-stretch">
          <PlanCard
            nome="Starter"
            precoDe="97"
            precoPor="57"
            recursos={['Até 5 displays', '10 widgets essenciais', 'Suporte por email', 'Player web e Android TV', '1 usuário admin']}
            cta="COMEÇAR AGORA"
            cor="#3B82F6"
          />
          <PlanCard
            nome="Profissional"
            precoDe="247"
            precoPor="147"
            destaque
            recursos={['Até 25 displays', 'Todos os 20+ widgets', 'Power BI e APIs externas', 'Agendamento avançado', 'Multi-usuário (até 10)', 'Suporte prioritário WhatsApp', 'Domínio personalizado']}
            cta="QUERO O MAIS VENDIDO"
            cor="#FF3B00"
          />
          <PlanCard
            nome="Empresarial"
            precoDe="597"
            precoPor="357"
            recursos={['Displays ilimitados', 'Tudo do Pro +', 'White label', 'SSO / SAML / LDAP', 'SLA 99,9% garantido', 'Gerente de conta dedicado', 'Onboarding premium']}
            cta="FALAR COM VENDAS"
            cor="#FFD700"
          />
        </div>

        <div className="flex items-center justify-center gap-3 mt-8 text-[11px] text-[#6B7280]">
          <Shield size={14} className="text-emerald-400" />
          <span>Garantia de 7 dias ou seu dinheiro de volta. Sem perguntas, sem burocracia.</span>
        </div>
      </section>

      {/* ═══════ CTA FINAL ═══════ */}
      <section id="cta" className="bg-[#0A0D16] border-y border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,59,0,0.06),transparent_70%)]" />
        <div className="th-container py-20 md:py-28 relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-4 max-w-2xl mx-auto leading-[1.1]">
            Não deixe suas telas{' '}
            <span className="bg-gradient-to-r from-[#FF3B00] to-[#FFD700] bg-clip-text text-transparent">paradas no tempo</span>
            {' '}enquanto seu concorrente já está na frente.
          </h2>
          <p className="text-[#9DA4B4] text-lg mb-8 max-w-xl mx-auto">
            Primeiros 100 clientes ganham <strong className="text-[#FFD700]">onboarding grátis</strong> com nossa equipe. Suas telas no ar ainda esta semana.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <ButtonPrimary href="#planos" variant="fire" className="text-lg px-12 py-4">
              <Zap size={20} /> QUERO MEUS 40% OFF AGORA
            </ButtonPrimary>
            <ButtonPrimary href="#" variant="ghost" className="text-lg px-12 py-4">
              FALAR COM ESPECIALISTA
            </ButtonPrimary>
          </div>
          <p className="text-[11px] text-[#6B7280] mt-4 font-medium">
            🟢 Vagas com desconto: <strong className="text-white">12 restantes</strong> • Oferta acaba hoje às 23:59
          </p>
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section className="th-container py-20 md:py-28">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-12">Dúvidas <span className="text-[#FFD700]">frequentes</span></h2>
          <FaqItem q="Preciso instalar algo na TV?" a="Nada. Basta abrir o navegador da sua Smart TV (Samsung Tizen, LG webOS, Android TV, etc.) e acessar o link do player. Funciona em qualquer dispositivo com navegador moderno. Para TVs mais antigas, recomendamos um Chromecast ou Fire Stick (custo único de ~R$200)." />
          <FaqItem q="Tem fidelidade? Posso cancelar?" a="Zero fidelidade. Cancele quando quiser, sem multa, sem burocracia. E você ainda tem 7 dias de garantia incondicional: se não gostar, devolvemos 100% do seu dinheiro." />
          <FaqItem q="Dá pra usar em várias filiais?" a="Sim! Esse é um dos nossos diferenciais. O plano Profissional já suporta múltiplas localizações com agrupamento por unidade. O plano Empresarial é ilimitado. Gerencie dezenas de filiais num painel só." />
          <FaqItem q="Preciso de conhecimento técnico?" a="Não. Nossa interface é 100% visual drag-and-drop. Se você sabe usar o Canva, sabe usar o TelaHub. E se travar, nosso suporte responde em minutos — até em domingos e feriados." />
          <FaqItem q="Funciona offline? Se a internet cair?" a="O player mantém o último conteúdo em cache local. Se a internet cair momentaneamente, a tela continua exibindo normalmente. Assim que reconectar, sincroniza automático." />
          <FaqItem q="Meus dados estão seguros?" a="Seus dados são criptografados em trânsito (TLS 1.3) e em repouso (AES-256). Seguimos as melhores práticas de segurança e estamos adequados à LGPD. Autenticação 2 fatores disponível em todos os planos." />
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="bg-[#0A0D16] border-t border-white/5 py-10">
        <div className="th-container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF3B00]/10 border border-[#FF3B00]/20 flex items-center justify-center">
              <Tv size={16} className="text-[#FF3B00]" />
            </div>
            <span className="text-sm font-black text-white tracking-tight uppercase">
              Tela<span className="text-[#FF3B00]">Hub</span>
            </span>
          </div>
          <p className="text-[11px] text-[#6B7280] font-mono">
            © {new Date().getFullYear()} TelaHub • Digital Signage Corporativo • Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;