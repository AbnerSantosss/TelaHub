const DashboardMockup = ({ telemetry, lastSyncTime, triggerConversionModal }) => {
  return (
    <>
      <div className="hero-mockup">
        {/* Browser Mockup Header Bar */}
        <div className="hero-mockup-bar">
          <span className="mockup-dot"></span>
          <span className="mockup-dot"></span>
          <span className="mockup-dot"></span>
          <span className="mockup-url">app.telahub.com.br/displays</span>
        </div>

        {/* Dashboard Main Panel */}
        <div className="mockup-body">
          <div className="mockup-header">
            <span className="mockup-title">Seus Displays</span>
            <span className="mockup-badge-total">
              {telemetry.onlineCount} / {telemetry.total} online
            </span>
          </div>

          {/* Displays Grid */}
          <div className="mockup-grid">
            {telemetry.displays.map((disp) => (
              <div 
                key={disp.id} 
                className="mockup-display-card" 
                style={{ opacity: disp.status === 'offline' ? 0.5 : 1 }}
              >
                <div className={`mockup-screen ${disp.screen}`}>
                  <div className="mockup-screen-inner">
                    <div className="screen-icon">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        style={{ width: 22, height: 22, color: 'var(--cyan)' }}
                      >
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="mockup-display-info">
                  <span className="mockup-display-name">{disp.name}</span>
                  <span className={`badge ${disp.status === 'online' ? 'badge-online' : 'badge-offline'}`}>
                    {disp.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Telemetry Stats Bar */}
          <div className="mockup-stat-row">
            <div className="mockup-stat">
              <div className="mockup-stat-label">Uptime médio</div>
              <div className="mockup-stat-value cyan">{telemetry.uptime}</div>
            </div>
            <div className="mockup-stat">
              <div className="mockup-stat-label">Conteúdo ativo</div>
              <div className="mockup-stat-value">{telemetry.scenesActive} cenas</div>
            </div>
            <div className="mockup-stat">
              <div className="mockup-stat-label">Última sync</div>
              <div className="mockup-stat-value">há {lastSyncTime}s</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Active Pulse Notification Badge */}
      <div className="hero-float-badge" aria-hidden="true" onClick={() => triggerConversionModal('Business')} style={{ cursor: 'pointer' }}>
        <span className="float-icon">⚡</span>
        <div className="float-text">
          <strong>Atualização enviada</strong>
          <span>Cardápio sync em {telemetry.onlineCount} displays · agora</span>
        </div>
      </div>
    </>
  );
};

export default DashboardMockup;
