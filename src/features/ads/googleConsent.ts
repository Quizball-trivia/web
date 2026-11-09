type ConsentCallback = { CONSENT_DATA_READY: () => void } | (() => void);

type ConsentWindow = Window & {
  googlefc?: {
    callbackQueue?: { push: (callback: ConsentCallback) => unknown };
    showRevocationMessage?: () => void;
  };
};

function googleConsent() {
  const consentWindow = window as ConsentWindow;
  consentWindow.googlefc = consentWindow.googlefc || {};
  consentWindow.googlefc.callbackQueue = consentWindow.googlefc.callbackQueue || ([] as ConsentCallback[]);
  return consentWindow.googlefc;
}

/** Google CMP determines consent or regional applicability before ad requests. */
export function whenConsentReady(callback: () => void) {
  let active = true;
  googleConsent().callbackQueue!.push({ CONSENT_DATA_READY: () => {
    if (active) callback();
  } });
  return () => { active = false; };
}

export function reopenAdPrivacyChoices() {
  googleConsent().callbackQueue!.push(() => {
    googleConsent().showRevocationMessage?.();
  });
}
