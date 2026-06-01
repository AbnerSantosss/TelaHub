import React, { useState } from 'react';

const Pricing = ({ triggerConversionModal }) => {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      id: 1,
      question: "Funciona em qualquer Smart TV?",
      answer: "Sim! Se a sua Smart TV possui um navegador de internet (browser) ou sistema operacional Android, ela funciona nativamente. Se a sua TV for antiga, basta conectar qualquer dispositivo de TV Box HDMI (como Chromecast, Xiaomi Mi Box, ou Fire TV Stick) para transformá-la em uma central TelaHub."
    },
    {
      id: 2,
      question: "Preciso de um técnico ou de cabos para instalar?",
      answer: "Absolutamente não. Sem furos, sem fios soltos e sem complicações. Você só precisa abrir o navegador da TV, acessar o nosso site de pareamento, e digitar o código numérico exibido na tela direto no seu painel de controle. Conexão imediata em menos de 2 minutos."
    },
    {
      id: 3,
      question: "Posso colocar vídeos do YouTube na tela?",
      answer: "Sim! Você pode copiar e colar qualquer link do YouTube, configurar para rodar em loop automático, ajustar o volume ou desativar o som totalmente. Ideal para exibir vídeos institucionais, demonstrações de produtos e receitas."
    },
    {
      id: 4,
      question: "O que acontece se a internet da minha loja cair?",
      answer: "O TelaHub possui resiliência failsafe com cache offline. Isso significa que todas as imagens, vídeos, cardápios e informativos são baixados e salvos localmente na memória do seu display. Se a conexão cair, a programação continua rodando normalmente. Sem telas pretas ou mensagens de erro."
    }
  ];

  const toggleFaq = (id) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  return (
    <section id="precos" aria-labelledby="precos-heading" style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}>
      <div className="container">
        {/* Price Anchor Header */}
        <div className="precos-header" style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div className="label reveal" style={{ background: '#ECFDF5', color: '#10B981', borderColor: '#A7F3D0', borderRadius: '99px' }}>
            Investimento Inteligente
          </div>
          <h2 id="precos-heading" className="reveal" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: '800', lineHeight: '1.2', maxWidth: '780px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '20px' }}>
            Quanto custa manter a TV do seu negócio desligada enquanto seu cliente já está dentro da sua loja?
          </h2>
          <p className="reveal" style={{ marginTop: '16px', color: '#4B5563', fontSize: '1.05rem', maxWidth: '680px', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.6' }}>
            Divulgue suas ofertas de alto valor, pratos do dia e informativos diretamente para quem já está pronto para comprar de você. O TelaHub se paga no primeiro dia, custando uma fração de panfletos ou cartazes impressos.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="precos-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '24px',
          alignItems: 'stretch',
          marginBottom: '56px'
        }}>
          {/* Starter Plan */}
          <div className="preco-card reveal" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '2px', padding: '36px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <p className="plan-name" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Starter</p>
              <div className="plan-price" style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                <span className="plan-currency" style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827' }}>R$</span>
                <span className="plan-amount" style={{ fontSize: '3rem', fontWeight: '800', color: '#111827', letterSpacing: '-0.04em', lineHeight: '1' }}>69</span>
                <span className="plan-period" style={{ fontSize: '0.85rem', color: '#6B7280' }}>/mês</span>
              </div>
              <p className="plan-description" style={{ fontSize: '0.88rem', color: '#4B5563', lineHeight: '1.5', marginBottom: '24px' }}>
                Para pequenos negócios. Consultórios, lojas de bairro e condomínios. 2 telas já eliminam impressos e comunicam com máxima eficiência.
              </p>
              <div className="plan-divider" style={{ height: '1px', background: '#E5E7EB', marginBottom: '24px' }}></div>
              
              <ul className="plan-features" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', padding: 0, listStyle: 'none' }}>
                <li className="plan-feature" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#4B5563' }}>
                  <span className="plan-check" style={{ width: '18px', height: '18px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', fontSize: '0.65rem', fontWeight: 'bold' }}>✓</span>
                  <span>Até 2 telas conectadas</span>
                </li>
                <li className="plan-feature" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#4B5563' }}>
                  <span className="plan-check" style={{ width: '18px', height: '18px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', fontSize: '0.65rem', fontWeight: 'bold' }}>✓</span>
                  <span>Editor visual de arrastar e soltar</span>
                </li>
                <li className="plan-feature" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#4B5563' }}>
                  <span className="plan-check" style={{ width: '18px', height: '18px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', fontSize: '0.65rem', fontWeight: 'bold' }}>✓</span>
                  <span>Fotos, GIFs e vídeos em loop</span>
                </li>
                <li className="plan-feature" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#4B5563' }}>
                  <span className="plan-check" style={{ width: '18px', height: '18px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', fontSize: '0.65rem', fontWeight: 'bold' }}>✓</span>
                  <span>Cache offline failsafe inteligente</span>
                </li>
              </ul>
            </div>
            <button onClick={() => triggerConversionModal('Starter')} className="btn btn-plan btn-plan-outline" style={{ width: '100%', padding: '12px 0', fontSize: '0.9rem' }}>
              Quero modernizar minhas telas
            </button>
          </div>

          {/* Business Plan (Featured) */}
          <div className="preco-card preco-card-featured reveal" style={{ background: '#FFFFFF', border: '2px solid #2563EB', borderRadius: '2px', padding: '36px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', boxShadow: '0 12px 32px rgba(37, 99, 235, 0.04)' }}>
            <span className="featured-tag" style={{ position: 'absolute', top: '16px', right: '16px', background: '#2563EB', color: '#FFFFFF', fontSize: '0.65rem', fontWeight: '700', padding: '4px 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mais Escolhido</span>
            <div>
              <p className="plan-name featured" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Business</p>
              <div className="plan-price" style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                <span className="plan-currency" style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827' }}>R$</span>
                <span className="plan-amount" style={{ fontSize: '3rem', fontWeight: '800', color: '#111827', letterSpacing: '-0.04em', lineHeight: '1' }}>149</span>
                <span className="plan-period" style={{ fontSize: '0.85rem', color: '#6B7280' }}>/mês</span>
              </div>
              <p className="plan-description" style={{ fontSize: '0.88rem', color: '#4B5563', lineHeight: '1.5', marginBottom: '24px' }}>
                Para empresas em crescimento e condomínios. Múltiplos pontos de comunicação, suporte prioritário e integrações em tempo real.
              </p>
              <div className="plan-divider" style={{ height: '1px', background: '#E5E7EB', marginBottom: '24px' }}></div>
              
              <ul className="plan-features" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', padding: 0, listStyle: 'none' }}>
                <li className="plan-feature" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#111827', fontWeight: '600' }}>
                  <span className="plan-check" style={{ width: '18px', height: '18px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', fontSize: '0.65rem', fontWeight: 'bold' }}>✓</span>
                  <span>Até 6 telas conectadas</span>
                </li>
                <li className="plan-feature" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#4B5563' }}>
                  <span className="plan-check" style={{ width: '18px', height: '18px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', fontSize: '0.65rem', fontWeight: 'bold' }}>✓</span>
                  <span>Tudo do plano Starter</span>
                </li>
                <li className="plan-feature" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#4B5563' }}>
                  <span className="plan-check" style={{ width: '18px', height: '18px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', fontSize: '0.65rem', fontWeight: 'bold' }}>✓</span>
                  <span>Recurso de avisos rápidos (Broadcast)</span>
                </li>
                <li className="plan-feature" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#4B5563' }}>
                  <span className="plan-check" style={{ width: '18px', height: '18px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', fontSize: '0.65rem', fontWeight: 'bold' }}>✓</span>
                  <span>Suporte Prioritário por WhatsApp com SLA</span>
                </li>
              </ul>
            </div>
            <button onClick={() => triggerConversionModal('Business')} className="btn btn-plan btn-plan-featured" style={{ width: '100%', padding: '12px 0', fontSize: '0.9rem', background: '#2563EB', color: '#FFFFFF', fontWeight: '700' }}>
              Quero modernizar minhas telas
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="preco-card reveal" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '2px', padding: '36px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <p className="plan-name" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Enterprise</p>
              <div className="plan-price" style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                <span className="plan-consult" style={{ fontSize: '1.8rem', fontWeight: '800', color: '#111827', letterSpacing: '-0.02em', lineHeight: '1' }}>Sob consulta</span>
              </div>
              <p className="plan-description" style={{ fontSize: '0.88rem', color: '#4B5563', lineHeight: '1.5', marginBottom: '24px' }}>
                Para grandes redes e franquias com mais de 10 telas. White Label completo com sua marca, APIs dedicadas e SLA personalizado.
              </p>
              <div className="plan-divider" style={{ height: '1px', background: '#E5E7EB', marginBottom: '24px' }}></div>
              
              <ul className="plan-features" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', padding: 0, listStyle: 'none' }}>
                <li className="plan-feature" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#4B5563' }}>
                  <span className="plan-check" style={{ width: '18px', height: '18px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', fontSize: '0.65rem', fontWeight: 'bold' }}>✓</span>
                  <span>Mais de 10 telas conectadas</span>
                </li>
                <li className="plan-feature" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#4B5563' }}>
                  <span className="plan-check" style={{ width: '18px', height: '18px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', fontSize: '0.65rem', fontWeight: 'bold' }}>✓</span>
                  <span>White Label completo (Sua marca no painel)</span>
                </li>
                <li className="plan-feature" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#4B5563' }}>
                  <span className="plan-check" style={{ width: '18px', height: '18px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', fontSize: '0.65rem', fontWeight: 'bold' }}>✓</span>
                  <span>Gerente de contas dedicado por WhatsApp</span>
                </li>
                <li className="plan-feature" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#4B5563' }}>
                  <span className="plan-check" style={{ width: '18px', height: '18px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', fontSize: '0.65rem', fontWeight: 'bold' }}>✓</span>
                  <span>SLA contratual robusto</span>
                </li>
              </ul>
            </div>
            <button onClick={() => triggerConversionModal('Enterprise')} className="btn btn-plan btn-plan-outline" style={{ width: '100%', padding: '12px 0', fontSize: '0.9rem' }}>
              Falar com Comercial
            </button>
          </div>
        </div>

        {/* 7-Day Guarantee Banner */}
        <div className="reveal" style={{
          background: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '2px',
          padding: '36px',
          display: 'flex',
          flexDirection: 'column',
          mdDirection: 'row',
          gap: '24px',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          maxWidth: '820px',
          marginLeft: 'auto',
          marginRight: 'auto',
          marginBottom: '72px'
        }}>
          <div style={{ fontSize: '3rem', margin: 0, opacity: 0.9 }}>🛡️</div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>Garantia de Risco Zero e Teste Sem Compromisso</h3>
            <p style={{ fontSize: '0.9rem', color: '#4B5563', lineHeight: '1.6', margin: 0, maxWidth: '600px' }}>
              Oferecemos <strong>7 dias de garantia incondicional</strong>. Faça o pareamento do TelaHub nas Smart TVs do seu estabelecimento hoje. Se você não achar a plataforma extremamente simples e profissional, nós devolvemos cada centavo do seu investimento, sem perguntas.
            </p>
          </div>
        </div>

        {/* FAQ Accordion Section */}
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '72px', maxWidth: '820px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div className="label reveal" style={{ background: '#ECFDF5', color: '#10B981', borderColor: '#A7F3D0', borderRadius: '99px' }}>Perguntas Frequentes</div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', fontWeight: '800', marginTop: '12px' }}>Dúvidas frequentes de empresários</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {faqs.map((faq) => {
              const isOpen = openFaq === faq.id;
              return (
                <div key={faq.id} style={{
                  border: '1px solid #E5E7EB',
                  borderRadius: '2px',
                  background: isOpen ? '#F9FAFB' : '#FFFFFF',
                  transition: 'background 0.2s ease'
                }}>
                  <button 
                    onClick={() => toggleFaq(faq.id)}
                    style={{
                      width: '100%',
                      padding: '20px 24px',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontFamily: 'var(--font)',
                      fontWeight: '700',
                      fontSize: '1rem',
                      color: '#111827'
                    }}
                  >
                    <span>{faq.question}</span>
                    <span style={{ fontSize: '1.2rem', color: '#2563EB', fontWeight: 'bold' }}>{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div style={{
                      padding: '0 24px 20px 24px',
                      fontSize: '0.92rem',
                      color: '#4B5563',
                      lineHeight: '1.6'
                    }}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* WhatsApp Support CTA Button */}
          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <p style={{ fontSize: '0.9rem', color: '#6B7280', marginBottom: '16px' }}>Ainda ficou com alguma dúvida sobre o pareamento ou planos?</p>
            <a 
              href="https://wa.me/5500000000000?text=Ol%C3%A1%2C+gostaria+de+saber+mais+sobre+o+TelaHub" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-ghost" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                fontSize: '0.95rem',
                border: '1px solid #10B981',
                color: '#10B981',
                fontWeight: '700',
                background: '#FFFFFF'
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.733-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.852.002-2.63-1.023-5.101-2.883-6.963C16.49 1.83 14.024.808 11.393.808c-5.409 0-9.833 4.417-9.837 9.849-.001 1.714.453 3.39 1.316 4.869L1.87 21.65l6.323-1.657c1.171.748 2.479 1.157 3.824 1.161zM17.06 14.37c-.29-.145-1.716-.847-1.978-.942-.262-.096-.453-.145-.644.145-.191.29-.739.942-.907 1.134-.167.191-.335.215-.625.07-2.932-1.464-4.81-2.91-5.69-4.426-.233-.401-.023-.62.179-.821.18-.18.396-.462.593-.693.197-.23.262-.384.394-.64.13-.256.065-.486-.032-.682-.096-.197-.644-1.554-.881-2.127-.23-.556-.464-.48-.644-.48-.166-.008-.358-.008-.55-.008-.192 0-.503.072-.767.359-.263.287-1.004.981-1.004 2.394 0 1.413 1.029 2.778 1.173 2.97 1.102 1.472 2.784 2.502 4.482 3.149 1.698.647 2.044.519 2.404.485.36-.034 1.154-.47 1.314-.923.16-.453.16-.841.112-.922-.048-.08-.175-.128-.465-.273z" />
              </svg>
              Ainda tenho dúvidas. Falar no WhatsApp.
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
