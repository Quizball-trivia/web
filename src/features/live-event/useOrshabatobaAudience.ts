'use client';

import { useEffect, useState } from 'react';
import { geoEligibilityUrl, peekGeoEligibility, subscribeGeoEligibility } from '@/lib/geo/geoEligibilityResolver';

/**
 * ორშაბათობა is shown only to players whose location (IP) is in Georgia — not by app language or profile country.
 * 'loading' until the location check answers; a failed check counts as outside Georgia.
 */
export function useOrshabatobaAudience(): 'loading' | boolean {
  const [state, setState] = useState<'loading' | boolean>(() => {
    if (typeof window === 'undefined') return 'loading';
    const known = peekGeoEligibility(geoEligibilityUrl());
    return known ? known.isGeorgia : 'loading';
  });
  useEffect(() => subscribeGeoEligibility(geoEligibilityUrl(), (geo) => setState(geo ? geo.isGeorgia : false)), []);
  return state;
}
