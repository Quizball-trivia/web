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
  const postHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();

  useEffect(() => {
    // Track pageviews in any environment with a PostHog key (prod AND staging —
    // separate project keys). Local dev has no key, so it just logs instead.
    if (pathname && postHogKey) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture('$pageview', {
        $current_url: url,
      });
    } else if (pathname && !postHogKey) {
      // Log in local dev (no key) for visibility
      console.log('[Dev] PostHog PageView:', pathname);
    }
  }, [pathname, postHogKey, searchParams]);

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
