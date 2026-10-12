import { useEffect, useState } from 'react';
import { readStoredConsent, storeConsent, updateConsent } from '../lib/tracking';

/**
 * Faixa de consentimento (LGPD).
 *
 * ── São DOIS consentimentos, não um ─────────────────────────────────────────
 * O `index.html` nega tudo antes de qualquer tag carregar, em dois lugares
 * diferentes: `gtag('consent','default', …)` com tudo `denied` para o Google, e
 * `fbq('consent','revoke')` antes do `init` para o Meta. São mecanismos
 * separados, de empresas separadas — liberar um NÃO libera o outro.
 *
 * Até agora esta faixa só chamava `updateConsent()`, ou seja, só falava com o
 * Google. O efeito era silencioso e caro: quem aceitava continuava com o Pixel
 * revogado, o `Lead` do navegador não saía, e a Conversions API do servidor
 * ficava sem o par para deduplicar. Nenhum erro no console, nenhum aviso — só
 * um público de remarketing que nunca enche e um custo por resultado que parece
 * ruim porque metade das conversões não é atribuída.
 *
 * Ao RECUSAR, os dois seguem negados: `denied` no Google e `revoke` no Meta. É
 * o lado seguro e é o padrão — o estado inicial já é esse, então recusar apenas
 * confirma o que já vale, e a decisão fica gravada para a faixa não voltar.
 *
 * ── Por que o link da política mora aqui ────────────────────────────────────
 * A LGPD exige que a informação sobre o tratamento esteja acessível NO momento
 * da escolha. Uma faixa que pede consentimento e só oferece "Aceitar" e
 * "Recusar" pede decisão sem base. O link vai para /privacidade, rota que
 * existe e é pré-renderizada — se ela sumir, este link some junto: apontar para
 * política inexistente é pior do que não ter faixa nenhuma.
 *
 * ⚠️ Nada aqui pode lançar. Pixel bloqueado por extensão, `fbq` inexistente e
 * storage negado em navegação privada são casos NORMAIS, não erros nossos: o
 * acesso é sempre defensivo, e a página continua funcionando sem medição.
 */

const GRANTED = {
  ad_storage: 'granted',
  analytics_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted'
};

const DENIED = {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
};

/**
 * O consentimento do Meta, que não passa pelo Consent Mode do Google.
 *
 * `grant` só depois do aceite; `revoke` é o estado que o `index.html` já
 * deixou ligado. Chamar de novo no "Recusar" não é redundância inútil: quem
 * recusa depois de ter aceitado numa visita anterior precisa voltar a revogar,
 * e é esse caminho que o `useEffect` abaixo também percorre ao reaplicar a
 * decisão gravada.
 */
function metaConsent(concedido) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  try {
    window.fbq('consent', concedido ? 'grant' : 'revoke');
  } catch {
    // Pixel bloqueado por extensão é o caso comum, não um erro nosso.
  }
}

const ConsentBanner = () => {
  const [visible, setVisible] = useState(() => readStoredConsent() === null);

  useEffect(() => {
    const stored = readStoredConsent();
    if (stored) {
      updateConsent(stored);
      // A decisão gravada precisa ser reaplicada AOS DOIS a cada visita: o
      // `index.html` recomeça negando, e sem esta linha quem já tinha aceitado
      // navegaria com o Pixel revogado para sempre.
      metaConsent(stored.ad_storage === 'granted');
    }
  }, []);

  const decide = (accepted) => {
    const state = accepted ? GRANTED : DENIED;
    updateConsent(state);
    metaConsent(accepted);
    storeConsent(state);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="consent-banner"
      role="region"
      aria-label="Aviso de cookies e privacidade"
    >
      <p className="consent-banner-text">
        Usamos cookies para medir desempenho e personalizar anúncios. Você pode aceitar
        ou recusar, e a sua escolha não muda o funcionamento do site. Detalhes na{' '}
        <a href="/privacidade">Política de Privacidade</a>.
      </p>
      <div className="consent-banner-actions">
        <button
          type="button"
          className="btn btn--fantasma"
          onClick={() => decide(false)}
        >
          Recusar
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => decide(true)}
        >
          Aceitar tudo
        </button>
      </div>
    </div>
  );
};

export default ConsentBanner;
