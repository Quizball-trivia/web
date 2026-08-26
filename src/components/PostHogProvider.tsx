'use client';

import { Suspense, useEffect } from 'react';
import type { ReactElement } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { consumeExitToPlayPending, trackExitToPlayLanded } from '@/lib/analytics/game-events';
import { startSessionRecording, stopSessionRecording } from '@/lib/posthog';
import { LOCALES } from '@/lib/i18n/locale';
import { hasRecentCampaignAttribution } from '@/features/campaign-quiz/campaignAttribution';

// Only the real SEO quiz routes (/:locale/football-quiz and one slug below
// it), not any URL containing the substring — 404s like /en/football-quiz-foo
// must not opt into replay.
const FOOTBALL_QUIZ_PATH = new RegExp(
  `^/(${LOCALES.join('|')})/football-quiz(/[^/]+)?/?$`,
);
const LOCALIZED_LANDING_PATH = new RegExp(`^/(${LOCALES.join('|')})/?$`);
const SEO_RECORDING_DELAY_MS = 5_000;

export function PostHogPageView(): ReactElement {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewInner />
    </Suspense>
  );
}

function PostHogPageViewInner(): ReactElement {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ($pageview comes from capture_pageview: 'history_change' in the PostHog
  // init — nothing to do per-route here.)

  useEffect(() => {
    if (!pathname) return;
    const isCampaignSignupLanding =
      LOCALIZED_LANDING_PATH.test(pathname) &&
      (searchParams.get('signup') === '1' || hasRecentCampaignAttribution());

    if (isCampaignSignupLanding) {
      startSessionRecording();
      return;
    }

    if (!FOOTBALL_QUIZ_PATH.test(pathname)) {
      stopSessionRecording();
      return;
    }

    // The recorder is valuable for the SEO-to-signup investigation, but its
    // ~60 KiB lazy bundle must not compete with the LCP image. Start after the
    // critical paint, or sooner once the visitor actively engages.
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
      startSessionRecording();
    };
    const timeoutId = window.setTimeout(start, SEO_RECORDING_DELAY_MS);
    window.addEventListener('pointerdown', start, { once: true, passive: true });
    window.addEventListener('keydown', start, { once: true });

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!pathname) return;
    const normalizedPath = pathname.replace(/\/$/, '');
    if (normalizedPath !== '/play' && !normalizedPath.endsWith('/play')) return;
    const pendingExit = consumeExitToPlayPending();
    if (!pendingExit) return;
    trackExitToPlayLanded({
      ...pendingExit,
      landedPath: pathname,
    });
  }, [pathname]);

  return <></>;
}
