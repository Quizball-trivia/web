'use client';

/**
 * "Continue with Google" CTA inside the login dialog.
 *
 * GIS-everywhere strategy: visually this is our branded yellow button, but
 * Google's own GIS button is rendered transparently on top, stretched to cover
 * the ENTIRE button so a tap anywhere goes through GIS (deterministic — no
 * center/edge dead zones). The rendered button runs a Google-hosted popup that
 * returns an id_token, which works in normal browsers and some embedded
 * webviews like Instagram — the token endpoint isn't subject to the
 * `disallowed_useragent` block that kills the classic OAuth redirect. The
 * credential is exchanged for a session via socialLoginWithIdToken.
 *
 * Redirect is the FALLBACK only: if GIS can't load (rare locked-down webview),
 * the overlay never renders, `gisReady` stays false, and the visible button's
 * onClick runs the classic redirect flow instead.
 *
 * In Messenger/Facebook-style in-app browsers the overlay is disabled so the
 * visible React button can show the external-browser instructions instead of
 * being intercepted by Google's iframe.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/contexts/LocaleContext';
import { renderGoogleButton, type GoogleCredential } from '@/lib/auth/google-identity';

interface WelcomeGoogleButtonProps {
  clientId: string;
  onClick: () => void;
  onCredential: (credential: GoogleCredential) => void;
  submitting?: boolean;
  disableIdentityOverlay?: boolean;
}

function hasRenderedGoogleButton(container: HTMLElement): boolean {
  return Boolean(container.firstElementChild || container.querySelector('iframe'));
}

export function WelcomeGoogleButton({
  clientId,
  onClick,
  onCredential,
  submitting = false,
  disableIdentityOverlay = false,
}: WelcomeGoogleButtonProps) {
  const { t } = useLocale();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  // True once Google's real (overlaid) button has rendered. When ready, ALL
  // clicks go through GIS (the overlay covers the whole button); the visible
  // button's onClick redirect-fallback only fires when GIS never rendered.
  const [gisReady, setGisReady] = useState(false);
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
    if (!container || !clientId || width <= 0 || disableIdentityOverlay) {
      container?.replaceChildren();
      return;
    }
    let cancelled = false;
    void renderGoogleButton(clientId, container, width, (credential) => {
      if (!cancelled) onCredentialRef.current(credential);
    }).then((rendered) => {
      if (!cancelled) setGisReady(rendered && hasRenderedGoogleButton(container));
    }).catch(() => {
      if (!cancelled) setGisReady(false);
    });
    return () => {
      cancelled = true;
    };
  }, [clientId, disableIdentityOverlay, width]);

  const overlayInteractive = Boolean(clientId && width > 0 && !disableIdentityOverlay && gisReady);

  // GIS-everywhere with redirect fallback: when a real GIS iframe/button exists,
  // the overlay owns every click. Otherwise the visible button falls back to the
  // prompt/redirect path instead of becoming a dead CTA.
  const handleVisibleClick = useCallback(() => {
    const container = overlayRef.current;
    if (overlayInteractive && container && hasRenderedGoogleButton(container)) return; // overlay handles it
    onClick();
  }, [onClick, overlayInteractive]);

  return (
    <div ref={measureRef} className="relative w-full">
      <Button
        onClick={handleVisibleClick}
        disabled={submitting}
        aria-busy={submitting}
        className="flex h-[52px] w-full items-center justify-center rounded-[28px] bg-brand-yellow px-6 font-poppins text-sm font-semibold uppercase tracking-wide text-black shadow-none transition-colors hover:bg-brand-yellow-deep hover:shadow-none sm:h-14 sm:px-8 sm:text-base focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:opacity-70"
      >
        {submitting ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <span className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-3">
            <FcGoogle className="size-6 justify-self-center" />
            <span className="min-w-0 text-center">{t('welcome.continueWithGoogle')}</span>
          </span>
        )}
      </Button>

      {/* Real GIS button, rendered transparently on top. It captures the tap
          and runs Google's popup token flow. Near-zero opacity keeps our button
          visible underneath. The rendered Google iframe is stretched to fill the
          WHOLE button (scale-y) so a tap ANYWHERE goes through GIS — no
          center/edge dead zones, so behaviour is deterministic. While submitting,
          it's click-blocked so it can't be re-fired mid-sign-in. */}
      <div
        ref={overlayRef}
        aria-hidden
        className={`absolute inset-0 z-10 flex items-stretch justify-center overflow-hidden opacity-[0.001] [color-scheme:light] [&>*]:h-full [&>*]:w-full [&_iframe]:h-full [&_iframe]:w-full ${
          submitting || !overlayInteractive ? 'pointer-events-none [&>*]:pointer-events-none' : 'pointer-events-none [&>*]:pointer-events-auto'
        }`}
      />
    </div>
  );
}
