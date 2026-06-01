import React from 'react';

const TechArchitecture = () => {
  return (
    <section id="argumento" aria-labelledby="argumento-heading" style={{ background: '#FFFFFF' }}>
      <div className="container">
        <div className="argumento-header" style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div className="label reveal" style={{ background: '#ECFDF5', color: '#10B981', borderColor: '#A7F3D0', borderRadius: '99px' }}>
            Simplicidade Extrema
          </div>
          <h2 id="argumento-heading" className="reveal" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: '800' }}>
            Os Pilares do TelaHub: Como funciona na prática
          </h2>
          <p className="reveal" style={{ marginTop: '16px', color: '#4B5563', fontSize: '1.05rem', maxWidth: '580px', marginLeft: 'auto', marginRight: 'auto' }}>
            Diga adeus à dor de cabeça de atualizar pen-drives nas TVs. Criamos um sistema intuitivo focado na agilidade do seu negócio local.
          </p>
        </div>

        <div className="argumento-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px'
        }}>
          {/* Pillar 1: O Fim do Pendrive */}
          <div className="argumento-card reveal" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '2px', padding: '28px' }}>
            <div className="argumento-icon" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', width: '44px', height: '44px', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyItems: 'center', marginBottom: '20px' }}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#2563EB" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                style={{ width: 22, height: 22, margin: 'auto' }}
              >
                <path d="M18 10h-1.25M6 10H4.75M12 2v4M12 18v4M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h4M18 12h4M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#111827', marginBottom: '10px' }}>O fim do Pendrive</h3>
            <p style={{ fontSize: '0.9rem', color: '#4B5563', lineHeight: '1.5' }}>
              Pareamento simples por código. Basta digitar na plataforma o número exibido na sua TV e a conexão é feita em menos de 2 minutos, sem fios soltos.
            </p>
          </div>

          {/* Pillar 2: Arraste, Solte e Exiba */}
          <div className="argumento-card reveal" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '2px', padding: '28px' }}>
            <div className="argumento-icon" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', width: '44px', height: '44px', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyItems: 'center', marginBottom: '20px' }}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#2563EB" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                style={{ width: 22, height: 22, margin: 'auto' }}
              >
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#111827', marginBottom: '10px' }}>Arraste, Solte e Exiba</h3>
            <p style={{ fontSize: '0.9rem', color: '#4B5563', lineHeight: '1.5' }}>
              Editor visual intuitivo. Adicione textos dinâmicos, GIFs, imagens e informativos arrastando elementos em uma tela totalmente interativa.
            </p>
          </div>

          {/* Pillar 3: Fotos e vídeos rodando no automático */}
          <div className="argumento-card reveal" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '2px', padding: '28px' }}>
            <div className="argumento-icon" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', width: '44px', height: '44px', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyItems: 'center', marginBottom: '20px' }}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#2563EB" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                style={{ width: 22, height: 22, margin: 'auto' }}
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#111827', marginBottom: '10px' }}>Vídeos no automático</h3>
            <p style={{ fontSize: '0.9rem', color: '#4B5563', lineHeight: '1.5' }}>
              Widgets de mídia e loops. Seus vídeos institucionais, imagens promocionais ou links do YouTube rodam com autoplay e repetição contínua.
            </p>
          </div>

          {/* Pillar 4: Avisos instantâneos */}
          <div className="argumento-card reveal" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '2px', padding: '28px' }}>
            <div className="argumento-icon" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', width: '44px', height: '44px', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyItems: 'center', marginBottom: '20px' }}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#2563EB" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                style={{ width: 22, height: 22, margin: 'auto' }}
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#111827', marginBottom: '10px' }}>Avisos instantâneos</h3>
            <p style={{ fontSize: '0.9rem', color: '#4B5563', lineHeight: '1.5' }}>
              Recurso de Broadcast. Publique alertas urgentes, informativos ou promoções relâmpago instantaneamente em tela cheia com um clique.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechArchitecture;
