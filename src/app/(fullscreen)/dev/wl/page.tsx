'use client';

// Dev playground for the Weekend League — mock data + the phase switcher,
// reachable without login (/dev/* bypasses AppAuthGate). The in-app events tab
// runs the same screen off the live backend; iterate here.
//
// SIMULATE walks the REAL live-game UI (WlLiveFlowView, the exact production
// component) through a scripted full match: check-in → game intros → all five
// question kinds → reveals → standings → elimination → breaks → champion.

import { useState } from 'react';
import { LayoutGrid, PlayCircle } from 'lucide-react';
import { WeekendLeagueScreen } from '@/features/weekend-league/WeekendLeagueScreen';
import { WlLiveSimFlow } from '@/features/weekend-league/live/WlLiveSimFlow';
import { WlComponentGallery } from '@/features/weekend-league/live/WlComponentGallery';
import { BoardStrip } from '@/features/weekend-league/live/WlLiveFlow';

export default function DevWlPage() {
  const [mode, setMode] = useState<'league' | 'sim' | 'gallery'>('league');

  if (mode === 'sim') {
    return <WlLiveSimFlow onExit={() => setMode('league')} />;
  }
  if (mode === 'gallery') {
    return (
      <WlComponentGallery
        onExit={() => setMode('league')}
        boardStrip={(rows, selfId, count) => (
          <BoardStrip board={rows} selfUserId={selfId} rows={count} />
        )}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat">
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setMode('gallery')}
          className="flex items-center gap-2 rounded-2xl border-2 border-brand-purple/40 bg-black/85 px-4 py-2.5 font-poppins text-[12px] font-black uppercase tracking-wide text-white backdrop-blur hover:bg-black"
        >
          <LayoutGrid className="size-4 text-brand-purple" /> Component gallery
        </button>
        <button
          type="button"
          onClick={() => setMode('sim')}
          className="flex items-center gap-2 rounded-2xl border-2 border-brand-purple/40 bg-black/85 px-4 py-2.5 font-poppins text-[12px] font-black uppercase tracking-wide text-white backdrop-blur hover:bg-black"
        >
          <PlayCircle className="size-4 text-brand-purple" /> Simulate live match
        </button>
      </div>
      <WeekendLeagueScreen showControls />
    </div>
  );
}
