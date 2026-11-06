'use client';

/** Dev concept: the zone match's players as real 3D footballers (ZoneMatchPlayer3DLab). Guarded by NODE_ENV. */

import { ZoneMatchPlayer3DLab } from '@/features/zone-match/ZoneMatchPlayer3DLab';

export default function DevZoneMatchPlayer3DPage() {
  if (process.env.NODE_ENV !== 'development') {
    return <div className="flex min-h-dvh items-center justify-center bg-surface-page font-poppins text-white">Dev only</div>;
  }
  return <ZoneMatchPlayer3DLab />;
}
