import { useEffect, useState } from 'react';
import { readStoredConsent, storeConsent, updateConsent } from '../lib/tracking';

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

const ConsentBanner = () => {
  const [visible, setVisible] = useState(() => readStoredConsent() === null);

  useEffect(() => {
    const stored = readStoredConsent();
    if (stored) {
      updateConsent(stored);
    }
  }, []);

  const decide = (accepted) => {
    const state = accepted ? GRANTED : DENIED;
    updateConsent(state);
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
        ou recusar — sua escolha não afeta o funcionamento do site.
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
