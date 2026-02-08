'use client';

import { Suspense, useEffect } from 'react';
import type { ReactElement } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

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
    // Only track pageviews in production
    if (
      pathname &&
      process.env.NEXT_PUBLIC_POSTHOG_KEY &&
      process.env.NODE_ENV === 'production'
    ) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture('$pageview', {
        $current_url: url,
      });
    } else if (pathname && process.env.NODE_ENV !== 'production') {
      // Log in development for visibility
      console.log('[Dev] PostHog PageView:', pathname);
    }
  }, [pathname, searchParams]);

  return <></>;
}
