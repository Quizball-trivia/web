'use client';

import { Suspense, useEffect } from 'react';
import type { ReactElement } from 'react';
import { usePathname } from 'next/navigation';
import { consumeExitToPlayPending, trackExitToPlayLanded } from '@/lib/analytics/game-events';
import { startSessionRecording, stopSessionRecording } from '@/lib/posthog';
import { LOCALES } from '@/lib/i18n/locale';

// Only the real SEO quiz routes (/:locale/football-quiz and one slug below
// it), not any URL containing the substring — 404s like /en/football-quiz-foo
// must not opt into replay.
const FOOTBALL_QUIZ_PATH = new RegExp(
  `^/(${LOCALES.join('|')})/football-quiz(/[^/]+)?/?$`,
);

export function PostHogPageView(): ReactElement {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewInner />
    </Suspense>
  );
}

function PostHogPageViewInner(): ReactElement {
  const pathname = usePathname();

  // ($pageview comes from capture_pageview: 'history_change' in the PostHog
  // init — nothing to do per-route here.)

  useEffect(() => {
    if (!pathname) return;
    if (FOOTBALL_QUIZ_PATH.test(pathname)) {
      startSessionRecording();
    } else {
      stopSessionRecording();
    }
  }, [pathname]);

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
