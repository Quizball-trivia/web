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
    // Track pageviews on real deployments — production AND staging ("preview").
    const deployEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
    if (
      pathname &&
      process.env.NEXT_PUBLIC_POSTHOG_KEY &&
      (deployEnv === 'production' || deployEnv === 'preview')
    ) {
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
