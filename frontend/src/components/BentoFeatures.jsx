import React from 'react';

const BentoFeatures = ({ bentoCarouselRef, handleBentoScroll, activeBentoIndex }) => {
  return (
    <section id="recursos" aria-labelledby="recursos-heading">
      <div className="container">
        <div className="section-header">
          <div className="label reveal">Recursos da Plataforma</div>
          <h2 id="recursos-heading" className="reveal">
            Tudo o que você precisa para<br />dominar a atenção do seu público.
          </h2>
          <p className="reveal" style={{ marginTop: '16px' }}>
            Ferramentas pensadas para quem precisa de resultados rápidos, autonomia de criação e controle absoluto de múltiplos displays.
          </p>
        </div>

        <div className="bento-grid-wrapper">
          <div 
            className="bento-grid" 
            id="bento-carousel" 
            ref={bentoCarouselRef} 
            onScroll={handleBentoScroll}
          >
            {/* Bento Card 1 (Large - Canvas Studio) */}
            <div className="bento-card bento-card-large bento-card-glow reveal">
              <div className="bento-icon">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  style={{ width: 20, height: 20, color: 'var(--cyan)' }}
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </div>
              <h3>Canvas Livre. Vertical ou Horizontal.</h3>
              <p>
                Não somos presos a templates engessados. Posicione mídias, textos de notícias, letreiros dinâmicos e widgets em qualquer orientação (vertical 9:16 ou horizontal 16:9) arrastando e soltando.
              </p>
              <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Suporta orientação horizontal 16:9 e vertical 9:16 no mesmo painel.
              </p>
              
              {/* Interactive Canvas Demo */}
              <div className="canvas-demo">
                <div className="canvas-demo-label">Camadas da Cena 1 — Cardápio</div>
                <div className="canvas-layers">
                  <div className="canvas-layer">
                    <div className="layer-thumb lt-img"></div>
                    <span className="layer-name">Imagem de fundo</span>
                    <span className="layer-fade">Fade 300ms</span>
                  </div>
                  <div className="canvas-layer">
                    <div className="layer-thumb lt-text"></div>
                    <span className="layer-name">Título + Preços</span>
                    <span className="layer-fade">Fade 500ms</span>
                  </div>
                  <div className="canvas-layer">
                    <div className="layer-thumb lt-video"></div>
                    <span className="layer-name">Vídeo Promocional</span>
                    <span className="layer-fade">Fade 200ms</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 2 (Widgets) */}
            <div className="bento-card reveal">
              <div className="bento-icon">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  style={{ width: 20, height: 20, color: 'var(--cyan)' }}
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <h3>Automação Pronta</h3>
              <p>Previsão do tempo, Relógio, Letreiro de Notícias e QR Code dinâmico.</p>
              <div className="widget-chips">
                <div className="chip"><span className="chip-dot"></span>Previsão do Tempo</div>
                <div className="chip"><span className="chip-dot"></span>Relógio & Data</div>
                <div className="chip"><span className="chip-dot"></span>Notícias RSS</div>
                <div className="chip"><span className="chip-dot"></span>Letreiro Rolável</div>
                <div className="chip"><span className="chip-dot"></span>Páginas Web</div>
                <div className="chip"><span className="chip-dot"></span>Contador Regressivo</div>
                <div className="chip"><span className="chip-dot"></span>QR Code</div>
              </div>
            </div>

            {/* Bento Card 3 (Integrations) */}
            <div className="bento-card reveal">
              <div className="bento-icon">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  style={{ width: 20, height: 20, color: 'var(--cyan)' }}
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <h3>Dados Vivos</h3>
              <p>Conexão direta com Power BI, Planilhas Google e Airtable.</p>
              <div className="integration-row">
                <div className="integration-badge"><span className="int-icon">📊</span>Power BI</div>
                <div className="integration-badge"><span className="int-icon">🗂️</span>Airtable</div>
                <div className="integration-badge"><span className="int-icon">📄</span>Google Docs</div>
                <div className="integration-badge"><span className="int-icon">📁</span>SharePoint</div>
                <div className="integration-badge"><span className="int-icon">📑</span>PDF Remoto</div>
                <div className="integration-badge"><span className="int-icon">📈</span>Google Sheets</div>
              </div>
            </div>

          </div>

          {/* Swipe snap indicators for mobile viewport */}
          <div className="bento-dots" id="bento-dots-container">
            {[0, 1, 2].map((idx) => (
              <span 
                key={idx} 
                className={`bento-dot ${activeBentoIndex === idx ? 'active' : ''}`}
              ></span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BentoFeatures;
