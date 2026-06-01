import React from 'react';

const Pricing = ({ triggerConversionModal }) => {
  return (
    <section id="precos" aria-labelledby="precos-heading">
      <div className="container">
        <div className="precos-header">
          <div className="label reveal">Planos e Preços</div>
          <h2 id="precos-heading" className="reveal">
            Preços transparentes que cabem<br />
            <span className="text-gradient">no seu orçamento.</span>
          </h2>
          <p className="reveal" style={{ marginTop: '16px' }}>
            Escolha o plano ideal para a sua estrutura. Comece grátis, faça o teste em poucos minutos e cancele a qualquer momento.
          </p>
        </div>

        <div className="precos-grid">
          {/* Starter Plan */}
          <div className="preco-card reveal">
            <p className="plan-name">Starter</p>
            <div className="plan-price">
              <span className="plan-currency">R$</span>
              <span className="plan-amount">69</span>
              <span className="plan-period">/mês</span>
            </div>
            <p className="plan-description">Para pequenos negócios. Consultórios, lojas de bairro e condomínios pequenos. 2 telas já eliminam impressos e comunicam com eficiência.</p>
            <div className="plan-divider"></div>
            
            <ul className="plan-features">
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Até 2 telas conectadas</span>
              </li>
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Canvas Livre 16:9 e 9:16</span>
              </li>
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Widgets padrão (Clima, Relógio, RSS)</span>
              </li>
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Sincronização em tempo real</span>
              </li>
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Cache offline failsafe</span>
              </li>
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Suporte via e-mail</span>
              </li>
            </ul>
            <button onClick={() => triggerConversionModal('Starter')} className="btn btn-plan btn-plan-outline" style={{ marginTop: '12px' }}>
              Começar com Starter
            </button>
          </div>

          {/* Business Plan (Featured) */}
          <div className="preco-card preco-card-featured reveal" style={{ marginTop: '-12px', background: 'rgba(37, 99, 235, 0.02)', borderColor: '#2563EB' }}>
            <span className="featured-tag">Mais Escolhido</span>
            <p className="plan-name featured">Business</p>
            <div className="plan-price">
              <span className="plan-currency" style={{ color: 'var(--cyan)' }}>R$</span>
              <span className="plan-amount" style={{ color: 'var(--text-primary)' }}>149</span>
              <span className="plan-period">/mês</span>
            </div>
            <p className="plan-description">Para empresas e condomínios. Múltiplos pontos de comunicação, zero tolerância a tela preta. 6 telas, agendamento avançado e integração com Power BI.</p>
            <div className="plan-divider"></div>
            
            <ul className="plan-features">
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span><strong>Até 6 telas conectadas</strong></span>
              </li>
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Tudo do plano Starter</span>
              </li>
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Biblioteca de transições avançadas</span>
              </li>
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Integrações Power BI e Airtable</span>
              </li>
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Agendamento de playlists por horário</span>
              </li>
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span><strong style={{ color: 'var(--cyan)' }}>Suporte prioritário com SLA</strong></span>
              </li>
            </ul>
            <button 
              onClick={() => triggerConversionModal('Business')} 
              className="btn btn-plan btn-plan-featured"
              style={{ marginTop: '12px' }}
            >
              Começar com Business
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                style={{ width: 14, height: 14, marginLeft: 6 }}
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="preco-card reveal">
            <p className="plan-name">Enterprise</p>
            <p className="plan-consult">Sob consulta</p>
            <p className="plan-description">Para franquias com mais de 10 telas que exigem o impossível: White Label com sua marca, API customizada e um gerente de conta dedicado.</p>
            <div className="plan-divider"></div>
            
            <ul className="plan-features">
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Acima de 10 telas conectadas</span>
              </li>
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span><strong>White Label completo</strong></span>
              </li>
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Integrações e API customizadas</span>
              </li>
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Gerente de conta dedicado</span>
              </li>
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>SLA garantido em contrato</span>
              </li>
              <li className="plan-feature">
                <span className="plan-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--cyan)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Onboarding e treinamento</span>
              </li>
            </ul>
            <button onClick={() => triggerConversionModal('Enterprise')} className="btn btn-plan btn-plan-outline" style={{ marginTop: '12px' }}>
              Falar com Comercial
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
