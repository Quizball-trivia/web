'use client';

import { Suspense, useEffect } from 'react';
import type { ReactElement } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { consumeExitToPlayPending, trackExitToPlayLanded } from '@/lib/analytics/game-events';

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

  useEffect(() => {
    // Track pageviews wherever a PostHog key is configured (prod + staging).
    if (pathname && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
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
