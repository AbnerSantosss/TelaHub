import React from 'react';

const BentoFeatures = () => {
  const desires = [
    {
      id: 1,
      title: "Exibir cardápios do dia sem complicação",
      description: "Substitua quadros de giz ou impressos. Destaque o prato do dia, altere preços no celular e faça seus clientes comerem com os olhos.",
      emoji: "🍽️"
    },
    {
      id: 2,
      title: "Passar o vídeo institucional da sua clínica",
      description: "Esqueça canais de TV aberta chatos na recepção. Promova seus tratamentos, passe dicas de saúde e eduque seus pacientes em loop contínuo.",
      emoji: "🩺"
    },
    {
      id: 3,
      title: "Parar de brigar com a TV da sua loja",
      description: "Chega de pen-drives corrompidos, cabos HDMI enormes ou sistemas caros que travam todo dia. Controle tudo da recepção de forma simples.",
      emoji: "📺"
    },
    {
      id: 4,
      title: "Vender muito mais no piloto automático",
      description: "Exiba ofertas dinâmicas, promoções relâmpago e QR Codes diretamente para os clientes que já estão dentro do seu estabelecimento.",
      emoji: "📈"
    }
  ];

  return (
    <section id="recursos" aria-labelledby="recursos-heading" style={{ background: '#F9FAFB' }}>
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div className="label reveal" style={{ background: '#ECFDF5', color: '#10B981', borderColor: '#A7F3D0', borderRadius: '99px' }}>
            Foco no Dono do Negócio
          </div>
          <h2 id="recursos-heading" className="reveal" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: '800' }}>
            O TelaHub é para você que quer...
          </h2>
          <p className="reveal" style={{ marginTop: '16px', color: '#4B5563', fontSize: '1.05rem', maxWidth: '580px', marginLeft: 'auto', marginRight: 'auto' }}>
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
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '2px',
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981',
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}>
                ✓
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#4B5563', lineHeight: '1.6', margin: 0 }}>
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
