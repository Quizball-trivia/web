'use client';

import { Suspense, useEffect } from 'react';
import type { ReactElement } from 'react';
import { usePathname } from 'next/navigation';
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

  // ($pageview capture removed — ~20k events/day of pure cost. We don't analyze
  // pageviews/funnels by URL; our funnels run on named events. capture_pageview
  // is already false in the PostHog init, so nothing else emits them.)

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
