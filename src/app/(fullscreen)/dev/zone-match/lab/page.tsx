'use client';

/** Dev harness: the zone match's animations one at a time (ZoneMatchAnimationLab). Guarded by NODE_ENV. */

import { ZoneMatchAnimationLab } from '@/features/zone-match/ZoneMatchAnimationLab';

export default function DevZoneMatchLabPage() {
  if (process.env.NODE_ENV !== 'development') {
    return <div className="flex min-h-dvh items-center justify-center bg-surface-page font-poppins text-white">Dev only</div>;
  }
  return <ZoneMatchAnimationLab />;
}
