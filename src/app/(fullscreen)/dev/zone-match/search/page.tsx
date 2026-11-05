'use client';

/** Dev: the zone match searching-screen directions (ZoneMatchSearchLab). Guarded by NODE_ENV; browser-only (clocks). */

import dynamic from 'next/dynamic';

const ZoneMatchSearchLab = dynamic(() => import('@/features/zone-match/search/ZoneMatchSearchLab').then((m) => m.ZoneMatchSearchLab), { ssr: false });

export default function DevZoneMatchSearchPage() {
  if (process.env.NODE_ENV !== 'development') {
    return <div className="flex min-h-dvh items-center justify-center bg-surface-page font-poppins text-white">Dev only</div>;
  }
  return <ZoneMatchSearchLab />;
}
