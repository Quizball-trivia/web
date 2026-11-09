'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { reopenAdPrivacyChoices, whenConsentReady } from './googleConsent';

const CLIENT = 'ca-pub-8572537761531435';
const SLOTS = { lobby: '2443345758', results: '1130264086' } as const;
const SCRIPT_ID = 'quizball-adsense';

/** Mount only in lobby or final-results branches. Auto ads must remain off. */
export function ManualAdSlot({ placement }: { placement: keyof typeof SLOTS }) {
  const pathname = usePathname();
  const enabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === 'true';
  const allowed = pathname === (placement === 'lobby' ? '/play' : '/game');
  if (!enabled || !allowed) return null;
  return <DisplayAd key={placement} slot={SLOTS[placement]} />;
}

function DisplayAd({ slot }: { slot: string }) {
  const adRef = useRef<HTMLModElement>(null);
  const requested = useRef(false);

  useEffect(() => {
    const ad = adRef.current;
    if (!ad) return;
    let active = true;
    let consentReady = false;
    const requestAd = () => {
      // A script can finish loading after navigation or a match-stage change.
      if (!active || !ad.isConnected || requested.current || ad.clientWidth === 0) return;
      if (!consentReady) return;
      if (document.getElementById(SCRIPT_ID)?.dataset.loaded !== 'true') return;
      requested.current = true;
      try {
        const adWindow = window as Window & { adsbygoogle?: object[] };
        (adWindow.adsbygoogle = adWindow.adsbygoogle || []).push({});
      } catch {
        // Blocked or unavailable ads must never interrupt the game.
      }
    };

    const stopWaitingForConsent = whenConsentReady(() => {
      consentReady = true;
      requestAd();
    });

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
      const createdScript = script;
      createdScript.addEventListener('load', () => { createdScript.dataset.loaded = 'true'; }, { once: true });
      document.head.appendChild(script);
    }
    const onLoad = () => {
      requestAd();
    };
    script.addEventListener('load', onLoad);
    requestAd();
    const observer = new ResizeObserver(requestAd);
    observer.observe(ad);
    return () => {
      active = false;
      stopWaitingForConsent();
      observer.disconnect();
      script.removeEventListener('load', onLoad);
    };
  }, []);

  return (
    <section aria-label="Advertisement" className="mx-auto my-8 w-full max-w-[728px] px-3">
      <p className="mb-2 text-center text-xs text-white/50">Advertisement</p>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', minHeight: 100 }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
      <button type="button" onClick={reopenAdPrivacyChoices} className="mx-auto mt-3 block text-xs text-white/50 underline underline-offset-4 hover:text-white">
        Privacy and cookie settings
      </button>
    </section>
  );
}
