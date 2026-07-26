import { useState } from 'react';

/**
 * Catálogo de planos — espelho de `backend/prisma/seed-plans.ts`.
 *
 * O modelo é **cobrança por tela ativa**, em real. Não existe pacote fechado de
 * "até N telas": nos planos pagos o número de telas é ilimitado e o que cresce
 * é a fatura. A única trava de tela no catálogo é o plano Grátis (1 tela).
 *
 * `powerbi` é feature do plano Rede para cima — por isso os widgets de BI só
 * aparecem a partir dele.
 */
const plans = [
  {
    code: 'gratis',
    name: 'Grátis',
    price: '0',
    period: '/mês',
    priceNote: '1 tela, para sempre',
    description: 'Para tirar do papel hoje. Uma tela no ar, sem cartão de crédito e sem prazo para expirar.',
    features: [
      '1 tela conectada para sempre',
      'Editor visual de arrastar e soltar',
      'Fotos, GIFs e textos',
      // Degustação de vídeo: 7 dias contados da criação da conta, aplicada de
      // verdade no servidor (`FREE_VIDEO_TRIAL_DAYS` em entitlement.service.ts).
      // O prazo aqui e o do backend precisam bater — é oferta vinculante (CDC).
      'Vídeos liberados nos 7 primeiros dias',
      // NÃO escrever "cache offline failsafe" aqui: não existe persistência
      // offline (só cache por versão/ETag), e o FAQ desta mesma página declara
      // isso. Bullet e FAQ se contradizendo é exatamente o que os arts. 30 e 37
      // do CDC transformam em publicidade enganosa.
      'Atualização em tempo real na tela',
      'Alerta por e-mail se a tela cair',
    ],
    cta: 'Começar grátis',
  },
  {
    code: 'loja',
    name: 'Loja',
    price: '49',
    period: '/tela/mês',
    priceNote: 'a partir de 1 tela',
    description: 'Para quem já depende da tela no dia a dia. Telas ilimitadas — você paga só pelas que estiverem ativas.',
    features: [
      'Telas ilimitadas (paga por tela ativa)',
      'Vídeos em loop e YouTube, sem prazo',
      'Até 3 usuários na equipe',
      'Avisos rápidos em todas as telas',
      'Relatórios de exibição',
      'Trilha de auditoria de alterações',
    ],
    cta: 'Assinar o Loja',
    // Telas com que o checkout abre. É só sugestão: quem calcula o valor é o
    // servidor, no PATCH da sessão.
    checkoutScreens: 1,
  },
  {
    code: 'rede',
    name: 'Rede',
    price: '39',
    period: '/tela/mês',
    priceNote: 'mínimo de 5 telas na fatura',
    featured: true,
    // "Mais Escolhido" não pode voltar: não há base de clientes para sustentar
    // superlativo de venda. "Recomendado" é escolha editorial nossa, e isso é
    // legítimo dizer.
    tag: 'Recomendado',
    description: 'Menor preço por tela em troca de um piso de 5 telas. É aqui que entram os painéis de indicador e as integrações.',
    features: [
      'Tudo do plano Loja',
      'Power BI, Airtable e planilhas na TV',
      'Google Docs, Office e PDF na tela',
      'Agendamento avançado por horário',
      'API externa e múltiplas unidades',
      'Até 15 usuários na equipe',
    ],
    cta: 'Assinar o Rede',
    // Abre no piso de telas cobradas do plano — abrir em 1 mostraria um valor
    // menor do que a fatura mínima real, que é o tipo de surpresa que derruba a
    // conversão no passo seguinte.
    checkoutScreens: 5,
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    price: null,
    period: '',
    priceNote: 'proposta sob medida',
    description: 'Para redes e franquias que precisam da plataforma com a própria marca e contrato formal.',
    features: [
      'Tudo do plano Rede',
      'Usuários ilimitados',
      // White label, SSO e SLA NÃO estão implementados. Só podem aparecer aqui
      // marcados como escopo a contratar — como recurso pronto, seriam promessa
      // vinculante (CDC arts. 30 e 37).
      'Marca própria no painel — sob escopo de projeto',
      'Login único (SSO) — sob escopo de projeto',
      'SLA e gerente dedicado — definidos em contrato',
    ],
    cta: 'Falar com Comercial',
  },
];

const Pricing = ({ startConversion }) => {
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
      // A redação anterior afirmava que as mídias eram baixadas para a memória
      // do display e que a programação continuava rodando na queda de internet.
      // Isso NÃO existe no produto: o player só tem cache por versão/ETag. Como
      // os arts. 30 e 37 do CDC fazem a publicidade vincular o contrato, a
      // promessa foi substituída pelo comportamento real. Só volte a prometer
      // operação offline quando a persistência real existir (US-039 no Kanban).
      answer: "Enquanto a tela está ligada e exibindo, uma queda breve de conexão não interrompe o que já está no ar: o player segue com o conteúdo que carregou e volta a sincronizar sozinho quando a internet retorna. Sendo direto sobre o limite atual, ainda não há armazenamento offline completo — se o aparelho for reiniciado sem internet, ele não carrega a programação. Está no nosso roteiro, e preferimos avisar agora a te surpreender na loja. Em compensação, se uma tela parar de responder você recebe um aviso por e-mail em vez de descobrir dias depois."
    },
    {
      id: 5,
      question: "Tem contrato de fidelidade? Como faço para cancelar?",
      answer: "Não existe fidelidade, multa nem carência. É mês a mês: você cancela pelo próprio painel quando quiser e continua usando até o fim do período já pago. Além disso, por lei (art. 49 do Código de Defesa do Consumidor) você tem 7 dias para desistir e receber o valor de volta — e nós honramos isso sem pedir explicação."
    },
    {
      id: 6,
      question: "Não tenho tempo nem equipe de marketing. Quem monta minha primeira tela?",
      answer: "Nós montamos com você. Você entra no plano, chama no WhatsApp e um especialista configura a primeira tela junto com você, usando as fotos e os preços que você já tem. Depois disso, trocar uma oferta leva cerca de 30 segundos pelo celular — é escolher o modelo, trocar a imagem e publicar."
    },
    {
      id: 7,
      question: "Meu concorrente da esquina vai ver o que eu anuncio. Meus dados ficam seguros?",
      answer: "Cada empresa opera em um ambiente isolado: seu conteúdo, suas telas e seus usuários só são acessíveis por quem você convidar. Ninguém de outra empresa enxerga sua programação, seus preços ou suas mídias, e nenhum funcionário seu vê dados de outro cliente. Tratamos dados pessoais conforme a LGPD e o consentimento de cookies do site é negado por padrão até você aceitar."
    },
    {
      // Divulgação obrigatória: a degustação de vídeo é oferta vinculante (arts.
      // 30 e 31 do CDC), então o que acontece no 8º dia precisa estar escrito
      // ANTES da contratação — e precisa descrever o comportamento real do
      // sistema (gate na publicação, não na exibição).
      id: 8,
      question: "No plano Grátis, o que acontece com meus vídeos depois dos 7 dias?",
      answer: "Nos 7 primeiros dias você publica vídeo à vontade, para ver funcionando na TV da sua loja antes de decidir. Depois desse prazo, o que muda é a publicação: você não consegue mais salvar uma tela nova com vídeo, e o editor avisa na hora. O que já estava publicado continua tocando — não apagamos seu conteúdo e não deixamos a tela em branco no meio do expediente. Para voltar a publicar vídeos, o plano Loja libera sem prazo. Imagens, GIFs e textos seguem ilimitados no Grátis, para sempre."
    }
  ];

  const toggleFaq = (id) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  return (
    <section id="precos" aria-labelledby="precos-heading" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="container">
        {/* Price Anchor Header */}
        <div className="precos-header" style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div className="label reveal" style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', borderColor: 'rgba(14, 165, 233, 0.25)', borderRadius: '99px' }}>
            Investimento Inteligente
          </div>
          <h2 id="precos-heading" className="reveal" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: '800', lineHeight: '1.2', maxWidth: '780px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '20px' }}>
            Quanto custa manter a TV do seu negócio desligada enquanto seu cliente já está dentro da sua loja?
          </h2>
          <p className="reveal" style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '680px', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.6' }}>
            Divulgue suas ofertas de alto valor, pratos do dia e informativos diretamente para quem já está pronto para comprar de você. O TelaHub se paga no primeiro dia, custando uma fração de panfletos ou cartazes impressos.
          </p>
        </div>

        {/*
          Bloco de ancoragem de preço. Os números externos foram verificados em
          julho/2026 e devem ser reconferidos antes de cada campanha:
            - Playtix (BR): kit básico monitor profissional 43" + player + CMS a
              partir de R$ 3.500 — playtix.com.br/digital-signage-sinalizacao-digital-guia
            - Yodeck: plano Basic US$ 8/tela/mês (Premium subiu de US$ 11 para
              US$ 12 em 01/04/2026) — checkthat.ai/brands/yodeck/pricing
            - ScreenCloud: US$ 20–30/tela/mês, plano Pro com mínimo de 5 telas
              — cast-hub.com/digital-signage-cost-per-screen
          Os valores por tela do TelaHub são derivados dos próprios planos abaixo
          (R$ 69 ÷ 2 telas e R$ 149 ÷ 6 telas). Se o preço dos planos mudar,
          ATUALIZE estes dois números junto.
        */}
        <div className="reveal" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '880px',
          margin: '0 auto 56px',
        }}>
          <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px', textAlign: 'center' }}>
            Compare antes de decidir
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '20px' }}>
            <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Kit tradicional no Brasil</p>
              <p style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.1', marginBottom: '8px' }}>R$ 3.500</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                de entrada, por ponto: monitor profissional, player e licença — antes da primeira oferta ir ao ar.
              </p>
            </div>
            <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Plataformas de fora</p>
              <p style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.1', marginBottom: '8px' }}>US$ 8 a 30</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                por tela/mês, cobrado em dólar. As intermediárias só vendem a partir de 5 telas, e o suporte não fala português.
              </p>
            </div>
            <div style={{ padding: '20px', background: 'rgba(14, 165, 233, 0.07)', borderRadius: '12px', border: '1px solid rgba(14, 165, 233, 0.3)' }}>
              <p style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: '700', marginBottom: '8px' }}>TelaHub</p>
              <p style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.1', marginBottom: '8px' }}>R$ 0 a 49<span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}> /tela</span></p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                a 1ª tela é grátis para sempre; depois R$ 49 por tela ativa (R$ 39 acima de 5). Em real, sem hardware para comprar — na TV que já está na sua parede.
              </p>
            </div>
          </div>
          {/*
            Declaração de posicionamento no formato Onliness Statement (Marty
            Neumeier, "Zag"): um diferencial só é real se couber numa frase de
            contraste com as alternativas concretas do mercado. O contraste aqui
            é factual (dólar / mínimo de 5 telas / hardware de entrada) e NÃO um
            "somos os únicos" — reivindicar unicidade exigiria varrer antes os
            players brasileiros (Pricefy, RDS, Megamidia, Playtix).
          */}
          <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', textAlign: 'center', marginTop: '24px', marginBottom: '10px', lineHeight: '1.6', fontWeight: '600' }}>
            O kit tradicional pede R$ 3.500 de hardware antes da primeira oferta ir ao ar. As plataformas de fora cobram em dólar
            e as intermediárias só vendem a partir de 5 telas. No TelaHub a primeira tela é grátis para sempre, na TV que já está
            na sua parede — e o piso de 5 telas só existe se você quiser o desconto do plano Rede.
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 0, marginBottom: 0, lineHeight: '1.5' }}>
            Você já pagou pela TV. Já paga a internet. O que falta custa menos que uma tinta de impressora por mês.
          </p>
        </div>

        {/*
          Grade de planos — ESPELHA `backend/prisma/seed-plans.ts` (PLAN_CATALOG).
          Modelo real: cobrança POR TELA ATIVA, em real. `maxDevices` é ilimitado
          nos planos pagos de propósito (quem limita a expansão é a fatura, não
          uma trava no software); só o plano `gratis` trava em 1 tela.
          Ao mexer em preço/limite/feature aqui, mexa no seed também — os dois
          precisam contar a mesma história.
        */}
        <div className="precos-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px',
          alignItems: 'stretch',
          marginBottom: '56px'
        }}>
          {plans.map((plan) => (
            <div
              key={plan.code}
              className={`preco-card reveal${plan.featured ? ' preco-card-featured' : ''}`}
              style={{
                background: plan.featured ? 'rgba(14, 165, 233, 0.05)' : 'var(--bg-card)',
                border: plan.featured ? '2px solid #0ea5e9' : '1px solid var(--border)',
                borderRadius: '16px',
                padding: '36px 28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                boxShadow: plan.featured ? '0 12px 32px rgba(14, 165, 233, 0.1)' : 'none',
              }}
            >
              {plan.tag && (
                <span className="featured-tag" style={{ position: 'absolute', top: '16px', right: '16px', background: '#0ea5e9', color: '#FFFFFF', fontSize: '0.65rem', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {plan.tag}
                </span>
              )}
              <div>
                <p className={`plan-name${plan.featured ? ' featured' : ''}`} style={{ fontSize: '0.8rem', fontWeight: '700', color: plan.featured ? '#38bdf8' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
                  {plan.name}
                </p>

                <div className="plan-price" style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                  {plan.price === null ? (
                    <span className="plan-consult" style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: '1' }}>Sob consulta</span>
                  ) : (
                    <>
                      <span className="plan-currency" style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>R$</span>
                      <span className="plan-amount" style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: '1' }}>{plan.price}</span>
                      <span className="plan-period" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{plan.period}</span>
                    </>
                  )}
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px', minHeight: '18px' }}>
                  {plan.priceNote}
                </p>

                <p className="plan-description" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '24px' }}>
                  {plan.description}
                </p>
                <div className="plan-divider" style={{ height: '1px', background: 'var(--border)', marginBottom: '24px' }}></div>

                <ul className="plan-features" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', padding: 0, listStyle: 'none' }}>
                  {plan.features.map((feature) => (
                    <li key={feature} className="plan-feature" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      <span className="plan-check" style={{ width: '18px', height: '18px', flex: '0 0 18px', background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9', fontSize: '0.65rem', fontWeight: 'bold' }}>✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => startConversion(plan.code, 'pricing', plan.cta, plan.checkoutScreens)}
                className={`btn btn-plan ${plan.featured ? 'btn-plan-featured' : 'btn-plan-outline'}`}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  fontSize: '0.9rem',
                  ...(plan.featured ? { background: '#0ea5e9', color: '#FFFFFF', fontWeight: '700' } : {}),
                }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* 7-Day Guarantee Banner */}
        <div className="reveal" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '36px',
          display: 'flex',
          flexDirection: 'column',
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>O risco é todo nosso, não seu</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0, maxWidth: '600px' }}>
              <strong>7 dias de garantia incondicional</strong>, como manda o art. 49 do Código de Defesa do Consumidor — e sem burocracia da nossa parte. Pareie o TelaHub nas TVs do seu estabelecimento hoje. Se achar difícil, feio ou desnecessário, você pede o dinheiro de volta e recebe cada centavo, sem precisar justificar. Sem fidelidade e sem multa de cancelamento.
            </p>
          </div>
        </div>

        {/* FAQ Accordion Section */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '72px', maxWidth: '820px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div className="label reveal" style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', borderColor: 'rgba(14, 165, 233, 0.25)', borderRadius: '99px' }}>Perguntas Frequentes</div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', fontWeight: '800', marginTop: '12px' }}>Dúvidas frequentes de empresários</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {faqs.map((faq) => {
              const isOpen = openFaq === faq.id;
              return (
                <div key={faq.id} style={{
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  background: isOpen ? 'var(--bg-secondary)' : 'var(--bg-card)',
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
                      color: 'var(--text-primary)'
                    }}
                  >
                    <span>{faq.question}</span>
                    <span style={{ fontSize: '1.2rem', color: '#0ea5e9', fontWeight: 'bold' }}>{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div style={{
                      padding: '0 24px 20px 24px',
                      fontSize: '0.92rem',
                      color: 'var(--text-secondary)',
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
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Ainda ficou com alguma dúvida sobre o pareamento ou planos?</p>
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
                border: '1px solid #0ea5e9',
                color: '#0ea5e9',
                fontWeight: '700',
                background: 'transparent'
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
