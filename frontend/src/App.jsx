import { useState, useEffect } from 'react';
import NetworkCanvas from './components/NetworkCanvas';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TechArchitecture from './components/TechArchitecture';
import BentoFeatures from './components/BentoFeatures';
import UseCases from './components/UseCases';
import Pricing from './components/Pricing';
import CtaStrip from './components/CtaStrip';
import Footer from './components/Footer';
import LeadModal from './components/LeadModal';



function App() {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [activeTab, setActiveTab] = useState('cond');
  const [activeDock, setActiveDock] = useState('home');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Starter');
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



    // C. Initialize GSAP Elite Entrance Animations
    let gsapCtx;
    if (typeof window !== 'undefined' && window.gsap && window.ScrollTrigger) {
      const gsap = window.gsap;
      const ScrollTrigger = window.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      gsapCtx = gsap.context(() => {
        // Hero reveals
        gsap.from('.hero-headline', { duration: 1.1, y: 35, opacity: 0, ease: 'power3.out' });
        gsap.from('.hero-subheadline', { duration: 0.9, y: 20, opacity: 0, ease: 'power2.out', delay: 0.2 });
        gsap.from('.hero-actions', { duration: 0.8, y: 15, opacity: 0, ease: 'power2.out', delay: 0.35 });
        gsap.from('.hero-mockup', { duration: 1.3, scale: 0.96, y: 25, opacity: 0, ease: 'power3.out', delay: 0.25 });
        gsap.from('.hero-float-badge', { duration: 1.3, scale: 0.8, opacity: 0, y: 20, ease: 'back.out(1.7)', delay: 0.6 });

        // ScrollTriggers for segments
        gsap.utils.toArray('.reveal').forEach((elem) => {
          gsap.from(elem, {
            scrollTrigger: {
              trigger: elem,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
            duration: 0.8,
            y: 25,
            opacity: 0,
            ease: 'power2.out'
          });
        });
      });
    }

    return () => {
      clearInterval(syncInterval);
      if (gsapCtx) gsapCtx.revert();
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

  // Open Lead Registration Modal prefilled with selected plan
  const triggerConversionModal = (planName) => {
    setSelectedPlan(planName);
    setSubmitStatus({ loading: false, success: false, error: null });
    setIsModalOpen(true);
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
      setFormName('');
      setFormEmail('');
      setFormCompany('');
      setFormPhone('');
    }, 800);
  };

  return (
    <>
      {/* 1. Touch-Interactive particles background */}
      <NetworkCanvas />

      {/* 2. Top navigation header */}
      <Navbar 
        scrollToSection={scrollToSection} 
        triggerConversionModal={triggerConversionModal} 
      />

      {/* 3. Hero section (includes DashboardMockup inside) */}
      <Hero 
        triggerConversionModal={triggerConversionModal}
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
      <Pricing triggerConversionModal={triggerConversionModal} />

      {/* 8. Conversion action strip */}
      <CtaStrip triggerConversionModal={triggerConversionModal} />

      {/* 9 & 10. Footer and mobile bottom navigation dock */}
      <Footer 
        scrollToSection={scrollToSection}
        setActiveTab={setActiveTab}
        activeDock={activeDock}
        triggerConversionModal={triggerConversionModal}
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
