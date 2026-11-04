'use client';

/** Dev: every playstyle as a two-avatar showdown duet (DuetLab). Guarded by NODE_ENV. */

import dynamic from 'next/dynamic';

const DuetLab = dynamic(() => import('@/features/zone-match/duets/DuetLab').then((m) => m.DuetLab), { ssr: false });

export default function DevZoneMatchDuetsPage() {
  if (process.env.NODE_ENV !== 'development') {
    return <div className="flex min-h-dvh items-center justify-center bg-surface-page font-poppins text-white">Dev only</div>;
  }
  return <DuetLab />;
}
