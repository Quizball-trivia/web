'use client';

import { useRouter } from 'next/navigation';
import { LiveEventScreen } from '@/features/live-event/LiveEventScreen';
import { EventLobby } from '@/features/live-event/OrshabatobaCard';
import { liveEventCopy } from '@/features/live-event/liveEvent.copy';

/** ორშაბათობა studio: the full-page 3D studio where registration, the host's Start, the countdown and the game happen. */
export default function OrshabatobaStudioPage() {
  const router = useRouter();
  return (
    <LiveEventScreen
      studio
      fallback={(
        <div className="min-h-dvh bg-surface-page-alt">
          <button type="button" onClick={() => router.push('/events')} className="m-4 rounded-full bg-white/10 px-4 py-2 font-poppins text-sm font-bold text-white">← უკან</button>
          {/* Only between a finished show and the next one opening (seconds): the next show's card, registration soon. */}
          <EventLobby copy={liveEventCopy('ka')} registered={null} status="scheduled" entered={false} />
        </div>
      )}
    />
  );
}
