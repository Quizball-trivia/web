'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { subscribeGeoEligibility } from '@/lib/geo/geoEligibilityResolver';

/** Same shape as geoEligibilityUrl(). */
function geoUrlFor(override: string | null): string {
  const params = new URLSearchParams();
  if (override) params.set('geo', override);
  return `/api/geo${params.size ? `?${params}` : ''}`;
}

/**
 * ორშაბათობა is shown only to players whose location (IP) is in Georgia — not by app language or profile country.
 * 'loading' until the location check answers; a failed check counts as outside Georgia.
 */
export function useOrshabatobaAudience(): 'loading' | boolean {
  // From the router's search params (not window.location, which can lag a client navigation), built the same way as
  // geoEligibilityUrl() so it shares that cache entry; a staging/preview ?geo= switch re-subscribes without a remount.
  const override = useSearchParams()?.get('geo') ?? null;
  const url = typeof window === 'undefined' ? null : geoUrlFor(override);
  const [state, setState] = useState<{ url: string | null; value: boolean } | null>(null);
  useEffect(() => {
    if (!url) return;
    return subscribeGeoEligibility(url, (geo) => setState({ url, value: geo ? geo.isGeorgia : false }));
  }, [url]);
  return state && state.url === url ? state.value : 'loading';
}
