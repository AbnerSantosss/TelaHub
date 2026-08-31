import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Cenas from './components/Cenas';
import Passos from './components/Passos';
import Formatos from './components/Formatos';
import Blocos from './components/Blocos';
import Hospedagem from './components/Hospedagem';
import Comparacao from './components/Comparacao';
import Precos from './components/Precos';
import RiscoZero from './components/RiscoZero';
import Faq from './components/Faq';
import CtaFinal from './components/CtaFinal';
import Rodape from './components/Rodape';
import LeadModal from './components/LeadModal';
import ConsentBanner from './components/ConsentBanner';
import { trackEvent } from './lib/tracking';
import { conversionDestination, API_URL, attributionFields } from './lib/funnel';
import { iniciarReveal } from './lib/reveal';

/**
 * Landing v2 do TelaHub.
 *
 * ── O que mudou em 30/08/2026 e por quê ─────────────────────────────────────
 * A página anterior era escura, "corporativa", abria com um painel de telemetria
 * falso e vendia por RAMO (cardápio, ofertas). A auditoria do plano comercial v2
 * mostrou dois problemas que se somam: (1) quem chega não sabe que tem o
 * problema, então recurso no herói não converte — dor invisível converte; e (2)
 * ancorar o produto em comida entrega a página a uma disputa que não é a nossa
 * (o termo é dominado por QR/delivery) e faz síndico, gerente e dono de clínica
 * concluírem "não é pra mim". O produto passou a ser apresentado por PORTE:
 * condomínio, escritório, clínica, loja, academia, rede — comida é um caso entre
 * vários e nunca abre nada.
 *
 * ── A ordem das seções é o argumento ────────────────────────────────────────
 * dor → cena reconhecível → como funciona (com a TV real) → dois formatos →
 * o que cabe na tela (só o que existe) → por que é barato → contra o que se
 * compara → preço → risco zero → dúvidas → convite. Cada seção responde à
 * objeção que a anterior levanta; trocar a ordem quebra a corrente.
 *
 * ── Regras que a página inteira herda ───────────────────────────────────────
 * Nenhum fato que não exista pode aparecer aqui. Sem depoimento, sem nota, sem
 * "+N clientes", sem contador de vagas, sem "14 dias" (o trial foi
 * descontinuado e essa frase já voltou quatro vezes), sem "API externa" nem
 * "múltiplas unidades" (vendidos e inexistentes), sem Pix/boleto (não há
 * gateway), sem WhatsApp ou CNPJ (não há número publicável).
 */

/** Código do plano → nome exibido. Os eventos de analytics usam o nome. */
const PLAN_LABELS = {
  gratis: 'Grátis',
  loja: 'Loja',
  rede: 'Rede',
  enterprise: 'Enterprise',
};

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Grátis');

  // Formulário de contato (o único backend que esta página chama).
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [submitStatus, setSubmitStatus] = useState({ loading: false, success: false, error: null });

  useEffect(() => {
    // Revelação ao rolar. Era GSAP + ScrollTrigger de CDN e tinha duas formas de
    // deixar a página em branco — CDN fora do ar e chegada por âncora
    // (`/#precos`, o link que o painel e o checkout usam). Virou CSS +
    // IntersectionObserver com estado padrão VISÍVEL; o raciocínio completo está
    // no cabeçalho de `src/lib/reveal.js`. O herói não participa disso: é a
    // primeira coisa que o visitante vê e não pode depender de JavaScript.
    const pararReveal = iniciarReveal();
    return pararReveal;
  }, []);

  const scrollToSection = (id) => {
    const alvo = document.querySelector(id);
    if (!alvo) return;
    window.scrollTo({ top: alvo.offsetTop - 80, behavior: 'smooth' });
  };

  /**
   * CTA de navegação: leva à GRADE DE PLANOS, não ao cadastro.
   *
   * Vale para os botões que aparecem ANTES da seção de preços e não dizem qual
   * plano estão oferecendo (hoje, o da navbar). Eles mandavam direto para o
   * `signup`, e o visitante saía do site sem nunca ver que existem Loja e Rede:
   * todo clique de topo virava conversão para R$ 0. Quem escolhe o plano é o
   * visitante, na grade.
   *
   * O botão do herói é a exceção deliberada: ele diz "minha 1ª tela — grátis",
   * então mandá-lo para a grade seria um clique que não anda.
   */
  const goToPlans = (ctaLocation = 'unknown', ctaLabel = 'Ver planos') => {
    trackEvent('cta_click', {
      cta_location: ctaLocation,
      cta_label: ctaLabel,
      plan_selected: 'nao_escolhido',
    });
    trackEvent('view_item_list', { item_list_name: 'planos', cta_location: ctaLocation });
    scrollToSection('#precos');
  };

  /** Abre o formulário de contato (Parceiro, Enterprise, setup assistido). */
  const abrirContato = (planName = 'Contato', ctaLocation = 'unknown') => {
    setSelectedPlan(planName);
    setSubmitStatus({ loading: false, success: false, error: null });
    setIsModalOpen(true);
    trackEvent('modal_open', {
      modal_name: 'lead_capture',
      plan_selected: planName,
      cta_location: ctaLocation,
    });
  };

  /**
   * Ponto único de conversão da página.
   *
   * Funil híbrido: `gratis` vai para o cadastro (sem cartão, como o FAQ desta
   * página promete), `loja`/`rede` vão para o checkout com plano, telas e
   * INTERVALO sugeridos, e `enterprise` — que não tem preço público — cai no
   * formulário de contato.
   *
   * O `intervalo` é o que impede a incoerência mais cara desta página: o
   * visitante escolhe "anual — R$ 39/tela" na grade e, sem esse parâmetro, o
   * checkout abriria no mensal cobrando R$ 49. Anunciar um preço e cobrar outro
   * é CDC arts. 30 e 37, além de matar a conversão no último passo.
   *
   * O `trackEvent` dispara ANTES de navegar: sair da página cancela requisição
   * em voo, e um clique que não é medido é uma venda que some do funil.
   */
  const startConversion = (planCode, ctaLocation = 'unknown', ctaLabel = planCode, screens, intervalo) => {
    const planName = PLAN_LABELS[planCode] || planCode;
    trackEvent('cta_click', {
      cta_location: ctaLocation,
      cta_label: ctaLabel,
      plan_selected: planName,
      billing_interval: intervalo || 'nao_escolhido',
    });

    const destination = conversionDestination(planCode, screens, intervalo);

    if (!destination) {
      abrirContato(planName, ctaLocation);
      return;
    }

    trackEvent('begin_checkout', {
      plan_selected: planName,
      cta_location: ctaLocation,
      billing_interval: intervalo || 'mensal',
      destination: planCode === 'gratis' ? 'signup' : 'checkout',
    });

    window.location.href = destination;
  };

  /**
   * Envia o lead para `POST /api/leads`.
   *
   * Era um `setTimeout` que mostrava "Recebemos seu contato!" sem gravar nada:
   * todo lead de plano sob consulta era perdido em silêncio. Agora, se o envio
   * falhar, a pessoa VÊ o erro — mostrar sucesso sobre uma falha é o que fazia
   * o problema durar.
   */
  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      setSubmitStatus({ loading: false, success: false, error: 'Preencha nome e e-mail.' });
      return;
    }

    setSubmitStatus({ loading: true, success: false, error: null });

    try {
      const response = await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          company: formCompany || undefined,
          phone: formPhone || undefined,
          planCode: selectedPlan || undefined,
          ...attributionFields(),
        }),
      });

      if (!response.ok) {
        const corpo = await response.json().catch(() => ({}));
        throw new Error(corpo.error || 'Não foi possível enviar agora.');
      }

      setSubmitStatus({ loading: false, success: true, error: null });

      trackEvent('generate_lead', {
        event_id: crypto.randomUUID(),
        plan_selected: selectedPlan,
        lead_company: formCompany || undefined,
        value: 0,
        currency: 'BRL',
      });

      setFormName('');
      setFormEmail('');
      setFormCompany('');
      setFormPhone('');
    } catch (error) {
      setSubmitStatus({
        loading: false,
        success: false,
        error: `${error.message} Tente de novo em instantes.`,
      });
    }
  };

  return (
    <>
      {/* Decide o consentimento ANTES de qualquer tag de marketing disparar. */}
      <ConsentBanner />

      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>

      <Navbar scrollToSection={scrollToSection} goToPlans={goToPlans} />

      <main id="conteudo">
        <Hero startConversion={startConversion} scrollToSection={scrollToSection} />
        <Cenas />
        <Passos />
        <Formatos />
        <Blocos />
        <Hospedagem />
        <Comparacao />
        <Precos startConversion={startConversion} abrirContato={abrirContato} />
        <RiscoZero abrirContato={() => abrirContato('Setup assistido', 'risco_zero')} />
        <Faq />
        <CtaFinal startConversion={startConversion} />
      </main>

      <Rodape scrollToSection={scrollToSection} />

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
