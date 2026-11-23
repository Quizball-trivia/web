'use client';

import { useRouter } from 'next/navigation';
import { LiveEventScreen } from '@/features/live-event/LiveEventScreen';
import { NoLiveEvent } from '@/features/live-event/NoLiveEvent';

/** ორშაბათობა studio: the full-page 3D studio where registration, the host's Start, the countdown and the game happen. */
export default function OrshabatobaStudioPage() {
  const router = useRouter();
  return (
    <LiveEventScreen
      studio
      fallback={(
        <div className="min-h-dvh bg-surface-page-alt">
          <button type="button" onClick={() => router.push('/events')} className="m-4 rounded-full bg-white/10 px-4 py-2 font-poppins text-sm font-bold text-white">← უკან</button>
          <NoLiveEvent />
        </div>
      )}
    />
  );
}
