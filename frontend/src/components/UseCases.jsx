import React from 'react';

const UseCases = ({ activeTab, setActiveTab, telemetry }) => {
  return (
    <section id="casos" aria-labelledby="casos-heading">
      <div className="container">
        <div className="casos-header">
          <div className="label reveal">Casos de Uso</div>
          <h2 id="casos-heading" className="reveal">
            Cada mercado.<br /><span className="text-gradient">Uma solução sob medida.</span>
          </h2>
          <p className="reveal" style={{ marginTop: '16px' }}>
            Descubra como o TelaHub é aplicado no dia a dia do seu segmento para economizar tempo, aumentar as vendas e engajar seu público.
          </p>
        </div>

        <div className="tabs-wrapper reveal">
          {/* Navigation Tabs */}
          <div className="tabs-nav" role="tablist" aria-label="Casos de uso por segmento">
            <button 
              className={`tab-btn ${activeTab === 'cond' ? 'active' : ''}`} 
              role="tab" 
              aria-selected={activeTab === 'cond'} 
              onClick={() => setActiveTab('cond')}
            >
              <span className="tab-icon">🏢</span> Condomínios
            </button>
            <button 
              className={`tab-btn ${activeTab === 'corp' ? 'active' : ''}`} 
              role="tab" 
              aria-selected={activeTab === 'corp'} 
              onClick={() => setActiveTab('corp')}
            >
              <span className="tab-icon">🏙️</span> Prédios Corporativos
            </button>
            <button 
              className={`tab-btn ${activeTab === 'varejo' ? 'active' : ''}`} 
              role="tab" 
              aria-selected={activeTab === 'varejo'} 
              onClick={() => setActiveTab('varejo')}
            >
              <span className="tab-icon">🍽️</span> Varejo & Alimentação
            </button>
            <button 
              className={`tab-btn ${activeTab === 'rh' ? 'active' : ''}`} 
              role="tab" 
              aria-selected={activeTab === 'rh'} 
              onClick={() => setActiveTab('rh')}
            >
              <span className="tab-icon">📣</span> Endomarketing & RH
            </button>
          </div>

          {/* Tab Content: Condominios */}
          {activeTab === 'cond' && (
            <div className="tab-panel active" role="tabpanel">
              <div className="tab-content">
                <h3>Comunicação que os moradores realmente leem.</h3>
                <p>
                  Substitua murais de papel por avisos digitais nos elevadores. Notifique manutenções e encomendas em tempo real.
                </p>
                <div className="tab-features">
                  <div className="tab-feature">
                    <div className="tab-feature-icon">🖥️</div>
                    <div className="tab-feature-text">
                      <strong>Elevadores e Halls de Entrada</strong>
                      Formato vertical 9:16 nativo, otimizado para o tempo de tráfego dos elevadores.
                    </div>
                  </div>
                  <div className="tab-feature">
                    <div className="tab-feature-icon">📋</div>
                    <div className="tab-feature-text">
                      <strong>Publicação Sincronizada</strong>
                      Publique convocações de assembleia em múltiplos blocos simultaneamente com um único clique.
                    </div>
                  </div>
                  <div className="tab-feature">
                    <div className="tab-feature-icon">☀️</div>
                    <div className="tab-feature-text">
                      <strong>Engajamento de Moradores</strong>
                      Clima ao vivo e relógio automatizados que garantem que todos olhem para a tela.
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="tab-visual">
                <div className="tv-screen-sim sim-cond">
                  <div className="tv-screen-content">
                    <div className="screen-title" style={{ color: 'var(--cyan)', fontSize: '0.72rem', marginBottom: 8, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
                      Condomínio Alameda Verde
                    </div>
                    <div className="screen-title" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                      📋 Aviso de Manutenção
                    </div>
                    <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Elevador B — Parada para revisão<br />
                      <strong>Quinta-feira, 08h–12h</strong>
                    </p>
                    <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Publicado há 2 min · Síndico responsável
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, background: 'rgba(37, 99, 235, 0.04)', border: '1px solid rgba(37, 99, 235, 0.15)', borderRadius: 2, padding: 14, fontSize: '0.78rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Telas ativas</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {telemetry.onlineCount} / {telemetry.total}
                    </div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 2, padding: 14, fontSize: '0.78rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Última publicação</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Há 2 min</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Corporativo */}
          {activeTab === 'corp' && (
            <div className="tab-panel active" role="tabpanel">
              <div className="tab-content">
                <h3>Recepções que impressionam.</h3>
                <p>
                  Exiba uma mensagem de boas-vindas para clientes importantes, diretórios de andares e agendas de salas de reunião integradas.
                </p>
                <div className="tab-features">
                  <div className="tab-feature">
                    <div className="tab-feature-icon">🗺️</div>
                    <div className="tab-feature-text">
                      <strong>Diretórios de Salas Digitais</strong>
                      Mapeamento intuitivo de salas e andares atualizado ao vivo via nuvem.
                    </div>
                  </div>
                  <div className="tab-feature">
                    <div className="tab-feature-icon">👤</div>
                    <div className="tab-feature-text">
                      <strong>Boas-vindas Automatizado</strong>
                      Impressione investidores mostrando nome e marca da empresa parceira na recepção.
                    </div>
                  </div>
                  <div className="tab-feature">
                    <div className="tab-feature-icon">📡</div>
                    <div className="tab-feature-text">
                      <strong>Gerenciamento Multi-Display</strong>
                      Distribua permissões para recepção, andares e salas de forma segura e rápida.
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="tab-visual">
                <div className="tv-screen-sim sim-corp">
                  <div className="tv-screen-content">
                    <div className="screen-title" style={{ color: 'var(--cyan)', fontSize: '0.72rem', marginBottom: 8, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
                      HUB Inovação — Recepção
                    </div>
                    <div className="screen-title" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                      👋 Bem-vindo, Carlos Mendes
                    </div>
                    <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Empresa: TechBridge Ltda.<br />
                      <strong>Sala 304 · 14h30</strong>
                    </p>
                    <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Recepcionista: Amanda Costa
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, background: 'rgba(37, 99, 235, 0.04)', border: '1px solid rgba(37, 99, 235, 0.15)', borderRadius: 2, padding: 14, fontSize: '0.78rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Displays</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>12 andares</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 2, padding: 14, fontSize: '0.78rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Visitantes hoje</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>34</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Varejo */}
          {activeTab === 'varejo' && (
            <div className="tab-panel active" role="tabpanel">
              <div className="tab-content">
                <h3>O fim da impressão de cardápios.</h3>
                <p>
                  Destaque o prato do dia, altere preços instantaneamente e aumente o ticket médio em até 22% com vídeos que dão fome.
                </p>
                <div className="tab-features">
                  <div className="tab-feature">
                    <div className="tab-feature-icon">💲</div>
                    <div className="tab-feature-text">
                      <strong>Margem de Lucro Protegida</strong>
                      Atualize valores de pratos e produtos instantaneamente conforme os custos oscilam.
                    </div>
                  </div>
                  <div className="tab-feature">
                    <div className="tab-feature-icon">🎯</div>
                    <div className="tab-feature-text">
                      <strong>Cardápios Inteligentes por Horário</strong>
                      Alterne a grade de exibição do menu de café, almoço e jantar automaticamente por cronômetro.
                    </div>
                  </div>
                  <div className="tab-feature">
                    <div className="tab-feature-icon">📷</div>
                    <div className="tab-feature-text">
                      <strong>Vídeos e Imagens Irresistíveis</strong>
                      Destaque produtos parados no estoque com fotos e animações em alta resolução.
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="tab-visual">
                <div className="tv-screen-sim sim-varejo">
                  <div className="tv-screen-content">
                    <div className="screen-title" style={{ color: 'var(--cyan)', fontSize: '0.72rem', marginBottom: 8, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
                      Restaurante Central — Menu Board
                    </div>
                    <div className="screen-title" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                      🍝 Prato do Dia
                    </div>
                    <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Macarrão à Bolonhesa<br />
                      <strong style={{ color: 'var(--cyan)', fontSize: '1.1rem', display: 'block', marginTop: 4 }}>R$ 28,90</strong>
                    </p>
                    <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Atualizado há 1 min · Gerente João
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, background: 'rgba(37, 99, 235, 0.04)', border: '1px solid rgba(37, 99, 235, 0.15)', borderRadius: 2, padding: 14, fontSize: '0.78rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Economia mensal</div>
                    <div style={{ fontWeight: 700, color: 'var(--cyan)', fontSize: '0.9rem' }}>R$ 1.200+</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 2, padding: 14, fontSize: '0.78rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Impressão eliminada</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>100%</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: RH */}
          {activeTab === 'rh' && (
            <div className="tab-panel active" role="tabpanel">
              <div className="tab-content">
                <h3>Equipe alinhada e motivada.</h3>
                <p>
                  Projete dashboards do Power BI, metas batidas e aniversariantes do mês para todos verem, sem precisar enviar dezenas de e-mails.
                </p>
                <div className="tab-features">
                  <div className="tab-feature">
                    <div className="tab-feature-icon">📊</div>
                    <div className="tab-feature-text">
                      <strong>Metas em Tempo Real via Power BI</strong>
                      Conexão automatizada para dashboards visuais sempre atualizados na TV da fábrica ou escritório.
                    </div>
                  </div>
                  <div className="tab-feature">
                    <div className="tab-feature-icon">🎂</div>
                    <div className="tab-feature-text">
                      <strong>Clima e Cultura Interna</strong>
                      Automação para aniversariantes e reconhecimentos públicos de colaboradores em segundos.
                    </div>
                  </div>
                  <div className="tab-feature">
                    <div className="tab-feature-icon">📢</div>
                    <div className="tab-feature-text">
                      <strong>Comunicados Segmentados</strong>
                      Direcione avisos exclusivos para setores específicos (comercial, logística, etc.) de forma independente.
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="tab-visual">
                <div className="tv-screen-sim sim-rh">
                  <div className="tv-screen-content">
                    <div className="screen-title" style={{ color: 'var(--cyan)', fontSize: '0.72rem', marginBottom: 8, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
                      Setor Comercial — Meta Maio
                    </div>
                    <div className="screen-title" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                      📈 Vendas do Mês
                    </div>
                    <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Realizado: <strong style={{ color: '#10b981' }}>R$ 340.500</strong><br />
                      Meta: R$ 400.000 · <strong style={{ color: 'var(--cyan)' }}>85% atingido</strong>
                    </p>
                    <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Sincronizado via Power BI · ao vivo
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, background: 'rgba(37, 99, 235, 0.04)', border: '1px solid rgba(37, 99, 235, 0.15)', borderRadius: 2, padding: 14, fontSize: '0.78rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Setores ativos</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>8 TVs</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 2, padding: 14, fontSize: '0.78rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Autonomia do RH</div>
                    <div style={{ fontWeight: 700, color: 'var(--cyan)', fontSize: '0.9rem' }}>100%</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default UseCases;
