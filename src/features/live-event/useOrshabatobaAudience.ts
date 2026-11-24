'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { geoEligibilityUrl, subscribeGeoEligibility } from '@/lib/geo/geoEligibilityResolver';

/**
 * ორშაბათობა is shown only to players whose location (IP) is in Georgia — not by app language or profile country.
 * 'loading' until the location check answers; a failed check counts as outside Georgia.
 */
export function useOrshabatobaAudience(): 'loading' | boolean {
  // Re-rendered on navigation, so a staging/preview ?geo= override switch re-subscribes without a remount.
  useSearchParams();
  const url = typeof window === 'undefined' ? null : geoEligibilityUrl();
  const [state, setState] = useState<{ url: string | null; value: boolean } | null>(null);
  useEffect(() => {
    if (!url) return;
    return subscribeGeoEligibility(url, (geo) => setState({ url, value: geo ? geo.isGeorgia : false }));
  }, [url]);
  return state && state.url === url ? state.value : 'loading';
}
