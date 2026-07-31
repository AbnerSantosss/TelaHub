const BentoFeatures = () => {
  const desires = [
    {
      id: 1,
      title: "Trocar o preço do prato do dia às 11h, do celular",
      description: "Acabou o salmão? Você tira do cardápio antes do almoço, sem reimprimir nada. Quadro de giz e cartaz plastificado viram custo fixo que você deixa de pagar todo mês.",
      emoji: "🍽️"
    },
    {
      id: 2,
      title: "Ocupar os 18 minutos que o paciente passa na sua recepção",
      description: "Em vez de novela e propaganda de concorrente, sua sala de espera roda seus tratamentos, seus casos e suas orientações — em loop, sem ninguém apertar play.",
      emoji: "🩺"
    },
    {
      id: 3,
      title: "Nunca mais atravessar a loja com um pen-drive na mão",
      description: "Pen-drive corrompido, cabo HDMI atravessando a parede, sistema que trava e mostra a tela preta na frente do cliente. Você publica de onde estiver e a TV obedece.",
      emoji: "📺"
    },
    {
      id: 4,
      title: "Anunciar para quem já está com a carteira na mão",
      description: "Seu cliente já entrou. É o momento mais barato de vender pra ele: oferta do dia, combo, QR Code de cadastro. Sem disputar leilão de anúncio com ninguém.",
      emoji: "📈"
    }
  ];

  return (
    <section id="recursos" aria-labelledby="recursos-heading">
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div className="label reveal" style={{ background: 'var(--brand-wash)', color: 'var(--brand)', borderColor: 'rgba(14, 165, 233, 0.25)', borderRadius: '99px' }}>
            Foco no Dono do Negócio
          </div>
          <h2 id="recursos-heading" className="reveal" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: '800' }}>
            O TelaHub é para você que quer...
          </h2>
          <p className="reveal" style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '580px', marginLeft: 'auto', marginRight: 'auto' }}>
            Seja você dono de academia, clínica, restaurante, supermercado ou loja física, o TelaHub é a ponte para uma comunicação de nível de grandes redes.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {desires.map((item) => (
            <div key={item.id} className="reveal" style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative',
              transition: 'all 0.3s ease-out'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                background: 'var(--brand-wash)',
                border: '1px solid rgba(14, 165, 233, 0.25)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand)',
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}>
                ✓
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                {item.description}
              </p>
              <span style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                fontSize: '1.5rem',
                opacity: 0.85
              }}>
                {item.emoji}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BentoFeatures;
