import { useState, useEffect } from 'react';
import ScreenWall from './components/ScreenWall';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TechArchitecture from './components/TechArchitecture';
import BentoFeatures from './components/BentoFeatures';
import UseCases from './components/UseCases';
import Pricing from './components/Pricing';
import CtaStrip from './components/CtaStrip';
import Footer from './components/Footer';
import LeadModal from './components/LeadModal';
import ConsentBanner from './components/ConsentBanner';
import { trackEvent } from './lib/tracking';
import { conversionDestination } from './lib/funnel';
import { iniciarReveal } from './lib/reveal';

/** Código do plano → nome exibido. Os eventos de analytics usam o nome. */
const PLAN_LABELS = {
  gratis: 'Grátis',
  loja: 'Loja',
  rede: 'Rede',
  enterprise: 'Enterprise',
};



function App() {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [activeTab, setActiveTab] = useState('cond');
  const [activeDock, setActiveDock] = useState('home');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Grátis');
  const [lastSyncTime, setLastSyncTime] = useState(3);
  
  // Leads Registration Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [submitStatus, setSubmitStatus] = useState({ loading: false, success: false, error: null });

  // Telemetry displays live fallback state
  const [telemetry] = useState({
    total: 6,
    onlineCount: 4,
    uptime: '99.7%',
    scenesActive: 4,
    displays: [
      { id: 1, name: 'Hall Principal', status: 'online', screen: 'screen-a' },
      { id: 2, name: 'Elevador A', status: 'online', screen: 'screen-b' },
      { id: 3, name: 'Recepção', status: 'online', screen: 'screen-c' },
      { id: 4, name: 'Sala de Reunião', status: 'offline', screen: 'screen-d' },
      { id: 5, name: 'Cafeteria', status: 'offline', screen: 'screen-e' },
      { id: 6, name: 'Loja Térreo', status: 'online', screen: 'screen-a' }
    ]
  });


  // ==========================================
  // API INTEGRATIONS & GSAP ANIMATIONS
  // ==========================================
  useEffect(() => {
    
    // Simulate real-time sync seconds counter update
    const syncInterval = setInterval(() => {
      setLastSyncTime(Math.floor(Math.random() * 7) + 1);
    }, 4000);



    // C. Revelação ao rolar.
    //
    // Era GSAP + ScrollTrigger vindos de dois <script> do cdnjs. Trocado por
    // CSS + IntersectionObserver porque a montagem antiga tinha duas formas de
    // deixar a página em branco — a de chegada por âncora foi reproduzida. O
    // raciocínio completo está no cabeçalho de `src/lib/reveal.js`.
    //
    // A entrada do herói agora é CSS puro (`.hero-headline` e companhia em
    // index.css): é a primeira coisa que o visitante vê, e não pode depender
    // de JavaScript ter executado.
    const pararReveal = iniciarReveal();

    return () => {
      clearInterval(syncInterval);
      pararReveal();
    };
  }, []);

  // Ergonomic smooth scrolling to sections
  const scrollToSection = (id, dockName) => {
    setActiveDock(dockName);
    const target = document.querySelector(id);
    if (target) {
      window.scrollTo({
        top: target.offsetTop - 70,
        behavior: 'smooth'
      });
    }
  };

  /**
   * Ponto único de conversão da página.
   *
   * Funil híbrido: `gratis` vai para o cadastro (sem cartão, como o FAQ desta
   * página promete), `loja`/`rede` vão para o checkout com o plano sugerido, e
   * `enterprise` — que não tem preço público — cai no modal de contato.
   *
   * O `trackEvent` dispara ANTES de navegar: sair da página cancela requisição
   * em voo, e um clique que não é medido é uma venda que some do funil.
   */
  const startConversion = (planCode, ctaLocation = 'unknown', ctaLabel = planCode, screens) => {
    const planName = PLAN_LABELS[planCode] || planCode;
    trackEvent('cta_click', { cta_location: ctaLocation, cta_label: ctaLabel, plan_selected: planName });

    const destination = conversionDestination(planCode, screens);

    if (!destination) {
      // Enterprise: contratação por proposta, não self-service.
      setSelectedPlan(planName);
      setSubmitStatus({ loading: false, success: false, error: null });
      setIsModalOpen(true);
      trackEvent('modal_open', { modal_name: 'lead_capture', plan_selected: planName });
      return;
    }

    trackEvent('begin_checkout', {
      plan_selected: planName,
      cta_location: ctaLocation,
      destination: planCode === 'gratis' ? 'signup' : 'checkout',
    });

    window.location.href = destination;
  };

  // Handle Lead Form Submission (Client-side — integrate with Formspree/Zapier/Webhook later)
  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      setSubmitStatus({ loading: false, success: false, error: 'Por favor, preencha nome e email.' });
      return;
    }

    setSubmitStatus({ loading: true, success: false, error: null });

    // TODO: Replace with your preferred integration:
    // - Formspree: fetch('https://formspree.io/f/YOUR_ID', { method: 'POST', body: ... })
    // - Zapier Webhook: fetch('https://hooks.zapier.com/hooks/catch/YOUR_ID', { method: 'POST', body: ... })
    // - EmailJS, Google Forms, etc.
    setTimeout(() => {
      setSubmitStatus({ loading: false, success: true, error: null });

      trackEvent('generate_lead', {
        event_id: crypto.randomUUID(),
        plan_selected: selectedPlan,
        lead_company: formCompany || undefined,
        value: 0,
        currency: 'BRL'
      });

      setFormName('');
      setFormEmail('');
      setFormCompany('');
      setFormPhone('');
    }, 800);
  };

  return (
    <>
      {/* 0. Consent banner (LGPD/GDPR) — decide antes de qualquer tag de marketing/analytics disparar */}
      <ConsentBanner />

      {/* 1. Fundo ambiente: parede de telas se atualizando (ver ScreenWall.jsx) */}
      <ScreenWall />

      {/* 2. Top navigation header */}
      <Navbar 
        scrollToSection={scrollToSection} 
        startConversion={startConversion} 
      />

      {/* 3. Hero section (includes DashboardMockup inside) */}
      <Hero 
        startConversion={startConversion}
        scrollToSection={scrollToSection}
        telemetry={telemetry}
        lastSyncTime={lastSyncTime}
      />

      {/* 4. Technical argument section */}
      <TechArchitecture />

      {/* 5. Bento grid resources */}
      <BentoFeatures />

      {/* 6. Case of Use tabs section */}
      <UseCases 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        telemetry={telemetry}
      />

      {/* 7. Pricing section */}
      <Pricing startConversion={startConversion} />

      {/* 8. Conversion action strip */}
      <CtaStrip startConversion={startConversion} />

      {/* 9 & 10. Footer and mobile bottom navigation dock */}
      <Footer 
        scrollToSection={scrollToSection}
        setActiveTab={setActiveTab}
        activeDock={activeDock}
        startConversion={startConversion}
      />

      {/* 11. Lead capture conversion modal */}
      <LeadModal 
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        selectedPlan={selectedPlan}
        formName={formName}
        setFormName={setFormName}
        formEmail={formEmail}
        setFormEmail={setFormEmail}
        formCompany={formCompany}
        setFormCompany={setFormCompany}
        formPhone={formPhone}
        setFormPhone={setFormPhone}
        submitStatus={submitStatus}
        handleLeadSubmit={handleLeadSubmit}
      />
    </>
  );
}

export default App;
