'use client';

// Dev playground for the Weekend League — mock data + the phase switcher,
// reachable without login (/dev/* bypasses AppAuthGate). The in-app events tab
// runs the same screen off the live backend; iterate here.
//
// SIMULATE walks the REAL live-game UI (WlLiveFlowView, the exact production
// component) through a scripted full match: check-in → game intros → all five
// question kinds → reveals → standings → elimination → breaks → champion.

import { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { WeekendLeagueScreen } from '@/features/weekend-league/WeekendLeagueScreen';
import { WlLiveSimFlow } from '@/features/weekend-league/live/WlLiveSimFlow';

export default function DevWlPage() {
  const [simulating, setSimulating] = useState(false);

  if (simulating) {
    return <WlLiveSimFlow onExit={() => setSimulating(false)} />;
  }

  return (
    <div className="min-h-screen bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat">
      <button
        type="button"
        onClick={() => setSimulating(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-2xl border-2 border-brand-purple/40 bg-black/85 px-4 py-2.5 font-poppins text-[12px] font-black uppercase tracking-wide text-white backdrop-blur hover:bg-black"
      >
        <PlayCircle className="size-4 text-brand-purple" /> Simulate live match
      </button>
      <WeekendLeagueScreen showControls />
    </div>
  );
}
