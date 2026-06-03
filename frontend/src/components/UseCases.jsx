const TV_DATA = {
  cond: {
    landscape: { img: '/assets/images/recepcao_boas_vindas.png', label: '16:9 Horizontal' },
    vertical:  { img: '/assets/images/aviso_condominio.png',      label: '9:16 Vertical' },
  },
  corp: {
    landscape: { img: '/assets/images/recepcao_boas_vindas.png', label: '16:9 Horizontal' },
    vertical:  { img: '/assets/images/aviso_condominio.png',      label: '9:16 Vertical' },
  },
  varejo: {
    landscape: { img: '/assets/images/cardapio_digital.png',     label: '16:9 Horizontal' },
    vertical:  { img: '/assets/images/aviso_condominio.png',      label: '9:16 Vertical' },
  },
  rh: {
    landscape: { img: '/assets/images/painel_rh.png',            label: '16:9 Horizontal' },
    vertical:  { img: '/assets/images/aviso_condominio.png',      label: '9:16 Vertical' },
  },
};

const TvSimulation = ({ tabKey }) => {
  const data = TV_DATA[tabKey];
  return (
    <div className="tv-simulation-container">
      {/* TV Horizontal 16:9 */}
      <div className="tv-bezel tv-landscape">
        <span className="tv-ratio-badge">{data.landscape.label}</span>
        <div
          className="tv-screen landscape-aspect"
          style={{ backgroundImage: `url('${data.landscape.img}')` }}
          role="img"
          aria-label={`Simulação de tela horizontal ${data.landscape.label}`}
        />
      </div>
      {/* TV Vertical 9:16 */}
      <div className="tv-bezel tv-vertical">
        <span className="tv-ratio-badge">{data.vertical.label}</span>
        <div
          className="tv-screen vertical-aspect"
          style={{ backgroundImage: `url('${data.vertical.img}')` }}
          role="img"
          aria-label={`Simulação de tela vertical ${data.vertical.label}`}
        />
      </div>
    </div>
  );
};

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
                <TvSimulation tabKey="cond" />
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.2)', borderRadius: 8, padding: 14, fontSize: '0.78rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Telas ativas</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {telemetry.onlineCount} / {telemetry.total}
                    </div>
                  </div>
                  <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 2, padding: 14, fontSize: '0.78rem' }}>
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
                <TvSimulation tabKey="corp" />
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.2)', borderRadius: 8, padding: 14, fontSize: '0.78rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Displays</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>12 andares</div>
                  </div>
                  <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 2, padding: 14, fontSize: '0.78rem' }}>
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
                <TvSimulation tabKey="varejo" />
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.2)', borderRadius: 8, padding: 14, fontSize: '0.78rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Economia mensal</div>
                    <div style={{ fontWeight: 700, color: 'var(--cyan)', fontSize: '0.9rem' }}>R$ 1.200+</div>
                  </div>
                  <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 2, padding: 14, fontSize: '0.78rem' }}>
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
                <TvSimulation tabKey="rh" />
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.2)', borderRadius: 8, padding: 14, fontSize: '0.78rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Setores ativos</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>8 TVs</div>
                  </div>
                  <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 2, padding: 14, fontSize: '0.78rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Autonomia do RH</div>
                    <div style={{ fontWeight: 700, color: 'var(--cyan)', fontSize: '0.9rem' }}>100%</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Testimonials Section - Prova Social */}
        <div style={{ marginTop: '72px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '56px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', fontWeight: '800', marginBottom: '12px', color: '#F8FAFC' }}>
              Quem já usa o TelaHub para modernizar suas telas...
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '1rem', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
              Veja como empresários reais aboliram o pen-drive e transformaram o visual das suas recepções em minutos.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: '24px'
          }}>
            {/* Testimonial 1 */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '4px', color: '#FBBF24', fontSize: '1.2rem' }}>★★★★★</div>
              <p style={{ fontSize: '0.95rem', color: '#CBD5E1', lineHeight: '1.6', fontStyle: 'italic', margin: 0 }}>
                "Eu perdia horas toda semana gravando vídeos em pendrives para colocar na TV da recepção. Com o TelaHub, eu atualizo a grade de aulas e os avisos de feriado direto de casa, em dois minutos. A recepção da academia ficou com cara de rede gigante."
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                <div style={{ width: '36px', height: '36px', background: 'rgba(14,165,233,0.2)', border: '1px solid rgba(14,165,233,0.35)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#38bdf8', fontSize: '0.9rem' }}>RA</div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#E2E8F0', margin: 0 }}>Rodrigo Alencar</h4>
                  <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Proprietário da FitLife Academia</span>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '2px', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '4px', color: '#FBBF24', fontSize: '1.2rem' }}>★★★★★</div>
              <p style={{ fontSize: '0.95rem', color: '#CBD5E1', lineHeight: '1.6', fontStyle: 'italic', margin: 0 }}>
                "As TVs da minha clínica ficavam desligadas ou passando canais abertos que não interessavam a ninguém. Hoje, nós exibimos os vídeos dos nossos procedimentos estéticos, dicas de saúde e comunicados em loop automático. Nossos clientes elogiam a modernidade."
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                <div style={{ width: '36px', height: '36px', background: 'rgba(14,165,233,0.2)', border: '1px solid rgba(14,165,233,0.35)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#38bdf8', fontSize: '0.9rem' }}>MC</div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#E2E8F0', margin: 0 }}>Dra. Mariana Costa</h4>
                  <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Diretora da OdontoClean</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UseCases;
