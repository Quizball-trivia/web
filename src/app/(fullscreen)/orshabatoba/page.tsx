'use client';

import { useRouter } from 'next/navigation';
import { LiveEventScreen } from '@/features/live-event/LiveEventScreen';
import { EventLobby } from '@/features/live-event/OrshabatobaCard';
import { NoLiveEvent } from '@/features/live-event/NoLiveEvent';
import { liveEventCopy } from '@/features/live-event/liveEvent.copy';

/** ორშაბათობა studio: the full-page 3D studio where registration, the host's Start, the countdown and the game happen. */
export default function OrshabatobaStudioPage() {
  const router = useRouter();
  const back = (
    <button type="button" onClick={() => router.push('/events')} className="m-4 rounded-full bg-white/10 px-4 py-2 font-poppins text-sm font-bold text-white">← უკან</button>
  );
  return (
    <LiveEventScreen
      studio
      // Outside Georgia (or location unknown): a neutral empty state, never the show.
      fallback={<div className="min-h-dvh bg-surface-page-alt">{back}<NoLiveEvent /></div>}
      // Georgian visitor in the seconds between a finished show and the next one opening: the next show, registration soon.
      studioEmpty={(
        <div className="min-h-dvh bg-surface-page-alt">
          {back}
          <EventLobby copy={liveEventCopy('ka')} registered={null} status="scheduled" entered={false} />
        </div>
      )}
    />
  );
}
