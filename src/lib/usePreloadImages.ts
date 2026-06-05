import { useEffect, useRef } from 'react';

/**
 * Warm the browser cache for a set of image URLs as soon as they're known,
 * so they're already loaded by the time they render (e.g. ban/halftime cards).
 * Each URL is preloaded once per mount; new URLs added to the list are picked up.
 */
export function usePreloadImages(urls: ReadonlyArray<string | null | undefined>): void {
  const preloadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    for (const url of urls) {
      if (!url || preloadedRef.current.has(url)) continue;
      preloadedRef.current.add(url);
      const img = new window.Image();
      img.decoding = 'async';
      img.src = url;
    }
  }, [urls]);
}
