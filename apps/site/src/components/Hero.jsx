import DashboardMockup from './DashboardMockup';

const Hero = ({ 
  startConversion, 
  scrollToSection, 
  telemetry, 
  lastSyncTime 
}) => {
  return (
    <section id="hero" aria-labelledby="hero-heading">
      <div className="container">
        <div className="hero-inner">
          <div className="hero-content">
            <div className="label animate-in" style={{ background: 'var(--brand-wash)', color: 'var(--brand)', borderColor: 'rgba(14, 165, 233, 0.25)', borderRadius: '99px', fontSize: '12px' }}>
              <span style={{ display: 'inline-block', marginRight: '6px' }}>🟢</span>
              {/* "Mais de 200 empresas" foi removido: número não verificado. Prova
                  social só volta aqui com contagem real de clientes (arts. 30 e
                  37 do CDC — publicidade vincula o contrato). */}
              Sua TV, seu cardápio, seu preço — atualizado do celular
            </div>
            <h1 id="hero-heading" className="hero-headline animate-in" style={{ fontSize: 'clamp(1.9rem, 3.5vw, 2.75rem)', fontWeight: '900', lineHeight: '1.2', letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Troque o preço da vitrine em 30 segundos, do seu celular, sem sair do caixa.
            </h1>
            <p className="hero-subheadline animate-in" style={{ fontSize: 'clamp(0.95rem, 1.25vw, 1.1rem)', color: 'var(--text-secondary)', lineHeight: '1.65', marginBottom: '32px', maxWidth: '540px' }}>
              Transforme qualquer Smart TV em vitrine de ofertas, cardápio ou mural de avisos. Você digita um código na TV uma única vez — e nunca mais toca em pen-drive, cabo ou técnico. E se uma tela parar, você recebe um aviso por e-mail em vez de descobrir dias depois.
            </p>
            <div className="hero-actions animate-in">
              <button onClick={() => startConversion('gratis', 'hero', 'Começar com a tela grátis')} className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '0.95rem', fontWeight: '700' }}>
                Começar com a tela grátis
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  style={{ width: 16, height: 16 }}
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              <button onClick={() => scrollToSection('#recursos', 'recursos')} className="btn btn-ghost" style={{ padding: '14px 28px', fontSize: '0.95rem' }}>
                Ver recursos
              </button>
            </div>
            <div className="hero-trust animate-in" style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '24px' }}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                style={{ color: 'var(--brand)', width: 14, height: 14, marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {/* NÃO reintroduzir prazo de teste aqui sem decidir a oferta: a página
                  já dizia "7 dias" na Hero e "14 dias" no CTA final, e o backend
                  descontinuou o trial de 14 dias. "Sem cartão de crédito" é a
                  única promessa hoje verificável (não há gateway de pagamento). */}
              Primeira tela grátis para sempre · Sem cartão de crédito · Pareamento em 2 minutos
            </div>
          </div>
 
          <div className="hero-visual animate-in">
            <DashboardMockup telemetry={telemetry} lastSyncTime={lastSyncTime} startConversion={startConversion} />
            {/*
              Legenda obrigatória, acrescentada em 2026-07-31.

              O mockup mostra "99,7% uptime médio", "4/6 online" e nomes de
              display — todos inventados, vindos do estado `telemetry` fixo em
              App.jsx. Número de uptime é exatamente um dos claims que a wiki
              lista como proibidos (canais-de-venda-e-landings §7), e sem
              legenda a ilustração é lida como painel real de cliente real:
              publicidade enganosa por omissão (CDC arts. 30 e 37).

              A landing interna já tinha recebido esta mesma legenda antes de
              ser apagada; o site externo nunca recebeu. Se um dia o mockup
              passar a exibir dados reais, é esta linha que sai — não o
              contrário.
            */}
            {/* Alinhada à DIREITA de propósito. O badge flutuante "Atualização
                enviada" é absoluto e ocupa o canto inferior ESQUERDO; centrada,
                a legenda passava por dentro dele e saía ilegível — e legenda de
                conformidade encoberta vale o mesmo que legenda ausente. */}
            <p style={{
              position: 'relative',
              zIndex: 2,
              marginTop: '18px',
              paddingRight: '4px',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              textAlign: 'right',
              lineHeight: 1.5,
            }}>
              Ilustração da interface, com dados de exemplo.
            </p>
          </div>
        </div>
 
        {/* Objection Breaking Banner - Directly under the mockup/video */}
        <div className="hero-objection-banner animate-in" style={{
          marginTop: '56px',
          padding: '24px 32px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: '20px',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left'
        }}>
          <p className="objection-text" style={{ fontSize: 'clamp(0.9rem, 1.1vw, 1rem)', color: 'var(--text-primary)', margin: 0, lineHeight: '1.5', maxWidth: '640px', flex: '1 1 450px' }}>
            <strong>Você não precisa saber de tecnologia nem de design.</strong> Escolha um modelo pronto, troque a foto e o preço, e clique em publicar. Se travar, um especialista monta a sua primeira tela com você pelo WhatsApp.
          </p>
          <button onClick={() => startConversion('gratis', 'hero_objection_banner', 'Começar com a tela grátis')} className="btn btn-primary" style={{
            padding: '12px 24px',
            fontSize: '0.9rem',
            fontWeight: '700',
            width: '100%',
            maxWidth: '300px',
            flex: '0 0 auto'
          }}>
            Quero modernizar minhas telas
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
