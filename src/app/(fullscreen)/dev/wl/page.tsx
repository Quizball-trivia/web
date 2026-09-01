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

// Real prod podiums (2026-08-08 .. 2026-08-29) so the hall of fame renders
// with truthful shapes here — the live page fetches /hall-of-fame instead.
const HALL_OF_FAME_FIXTURE = {
  editions: [
    { week_key: '2026-08-29', entrants: 120, podium: [
      { rank: 1, nickname: 'kartvela', avatar_url: null, points: 1880 },
      { rank: 2, nickname: 'PONCHOLO', avatar_url: null, points: 1730 },
      { rank: 3, nickname: 'კირილე მიმინოშვილი', avatar_url: null, points: 1720 },
    ] },
    { week_key: '2026-08-22', entrants: 122, podium: [
      { rank: 1, nickname: 'TsotneLomsadze', avatar_url: null, points: 744 },
      { rank: 2, nickname: 'Nikusha FC', avatar_url: null, points: 740 },
      { rank: 3, nickname: 'owms', avatar_url: null, points: 711 },
    ] },
    { week_key: '2026-08-15', entrants: 128, podium: [
      { rank: 1, nickname: 'TsotneLomsadze', avatar_url: null, points: 733 },
      { rank: 2, nickname: 'xardzo', avatar_url: null, points: 725 },
      { rank: 3, nickname: 'მახატა', avatar_url: null, points: 720 },
    ] },
    { week_key: '2026-08-08', entrants: 102, podium: [
      { rank: 1, nickname: 'კირილე მიმინოშვილი', avatar_url: null, points: 836 },
      { rank: 2, nickname: 'AchiLFC', avatar_url: null, points: 822 },
      { rank: 3, nickname: 'TsotneLomsadze', avatar_url: null, points: 782 },
    ] },
  ],
  all_time: [
    { nickname: 'TsotneLomsadze', avatar_url: null, gold: 2, silver: 0, bronze: 1, finals_played: 4 },
    { nickname: 'კირილე მიმინოშვილი', avatar_url: null, gold: 1, silver: 0, bronze: 1, finals_played: 4 },
    { nickname: 'kartvela', avatar_url: null, gold: 1, silver: 0, bronze: 0, finals_played: 1 },
    { nickname: 'Nikusha FC', avatar_url: null, gold: 0, silver: 1, bronze: 0, finals_played: 4 },
    { nickname: 'AchiLFC', avatar_url: null, gold: 0, silver: 1, bronze: 0, finals_played: 4 },
    { nickname: 'PONCHOLO', avatar_url: null, gold: 0, silver: 1, bronze: 0, finals_played: 2 },
    { nickname: 'xardzo', avatar_url: null, gold: 0, silver: 1, bronze: 0, finals_played: 2 },
    { nickname: 'მახატა', avatar_url: null, gold: 0, silver: 0, bronze: 1, finals_played: 3 },
    { nickname: 'owms', avatar_url: null, gold: 0, silver: 0, bronze: 1, finals_played: 1 },
  ],
};

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
      <WeekendLeagueScreen showControls hallOfFame={HALL_OF_FAME_FIXTURE} />
    </div>
  );
}
