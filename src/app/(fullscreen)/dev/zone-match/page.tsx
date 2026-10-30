'use client';

/**
 * Dev harness for the zone match prototype (draft → six possession rounds per half → full time) against a scripted
 * opponent. Guarded by NODE_ENV; production paths are untouched.
 */

import { ZoneMatchPrototype } from '@/features/zone-match/ZoneMatchPrototype';

export default function DevZoneMatchPage() {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-page font-poppins text-white">Dev only</div>
    );
  }
  return <ZoneMatchPrototype />;
}
