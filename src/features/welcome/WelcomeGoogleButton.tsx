'use client';

/**
 * "Continue with Google" CTA inside the login dialog.
 *
 * Visually this is our branded yellow button, but the real click target is
 * Google's own GIS button rendered transparently on top of it. The rendered
 * button runs a Google-hosted popup that returns an id_token — which works
 * inside embedded webviews (Instagram, etc.) where the classic OAuth redirect
 * is blocked with `disallowed_useragent`. The credential is handed back to the
 * controller, which exchanges it for a session via socialLoginWithIdToken.
 *
 * If GIS can't load (rare locked-down webviews), the overlay never appears and
 * the visible button falls back to onClick (classic redirect flow).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/contexts/LocaleContext';
import { renderGoogleButton, type GoogleCredential } from '@/lib/auth/google-identity';

interface WelcomeGoogleButtonProps {
  clientId: string;
  onClick: () => void;
  onCredential: (credential: GoogleCredential) => void;
}

export function WelcomeGoogleButton({ clientId, onClick, onCredential }: WelcomeGoogleButtonProps) {
  const { t } = useLocale();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const onCredentialRef = useRef(onCredential);
  const observerRef = useRef<ResizeObserver | null>(null);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  // Measure the visible button so Google's iframe is rendered at the same
  // width — callback ref, not useEffect+ref, so it survives the dialog's
  // conditional DOM (see project ResizeObserver guidance). Falls back to the
  // configured max-w-md dialog width when measurement isn't available (e.g.
  // jsdom), so the overlay still renders. Callback refs ignore returned
  // cleanups, so the observer is tracked in a ref and disconnected on the
  // next ref call and on unmount.
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    const update = () => {
      const measured = Math.round(node.getBoundingClientRect().width);
      setWidth(measured > 0 ? measured : 320);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  useEffect(() => {
    const container = overlayRef.current;
    if (!container || !clientId || width <= 0) return;
    let cancelled = false;
    void renderGoogleButton(clientId, container, width, (credential) => {
      if (!cancelled) onCredentialRef.current(credential);
    });
    return () => {
      cancelled = true;
    };
  }, [clientId, width]);

  return (
    <div ref={measureRef} className="relative w-full">
      <Button
        onClick={onClick}
        className="flex h-[52px] w-full items-center justify-center rounded-[28px] bg-brand-yellow px-6 font-poppins text-sm font-semibold uppercase tracking-wide text-black shadow-none transition-colors hover:bg-brand-yellow-deep hover:shadow-none sm:h-14 sm:px-8 sm:text-base focus-visible:ring-0 focus-visible:outline-none"
      >
        <span className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-3">
          <FcGoogle className="size-6 justify-self-center" />
          <span className="min-w-0 text-center">{t('welcome.continueWithGoogle')}</span>
        </span>
      </Button>

      {/* Real GIS button, rendered transparently on top. It captures the tap
          and runs Google's popup token flow. Near-zero opacity keeps our button
          visible underneath; the iframe still receives pointer events. Centered
          so Google's shorter button covers the middle of our taller CTA; a tap
          on the very top/bottom edge harmlessly falls through to the redirect
          fallback. */}
      <div
        ref={overlayRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden opacity-[0.001] [&>*]:pointer-events-auto [color-scheme:light]"
      />
    </div>
  );
}
