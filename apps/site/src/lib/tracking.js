export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...params });
}

export function updateConsent(state) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('consent', 'update', state);
}

export const CONSENT_STORAGE_KEY = 'telahub_consent';
export const CONSENT_POLICY_VERSION = '1.0';

export function readStoredConsent() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeConsent(state) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
    ...state,
    decided_at: new Date().toISOString(),
    policy_version: CONSENT_POLICY_VERSION
  }));
}
