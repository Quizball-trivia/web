'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { trackWlTabViewed } from '@/lib/analytics/game-events';
import { useWeekendLeagueLive } from './use-weekend-league-live';
import { WeekendLeagueScreen } from './WeekendLeagueScreen';
import { WlLiveFlow } from './live/WlLiveFlow';

/** In-app Weekend League: the prototype screen driven by the real backend. */
export function WeekendLeagueLiveScreen() {
  const { t } = useLocale();
  const live = useWeekendLeagueLive();
  const [mode, setMode] = useState<'player' | 'spectator' | null>(null);
  // One tab-view per visit, fired when the /current query has RESOLVED — not
  // when status is non-null: a week with no active tournament legitimately
  // has status null and phase 'upcoming', and must still count (review).
  const tabViewedRef = useRef(false);
  useEffect(() => {
    // statusFresh, not !isLoading: cached data shown during a background
    // refetch would log a stale phase/has_entered and the ref would then
    // block the corrected values (review).
    if (tabViewedRef.current || !live.statusFresh) return;
    tabViewedRef.current = true;
    trackWlTabViewed(live.phase, live.hasEntered);
  }, [live.statusFresh, live.phase, live.hasEntered]);
  // Pin the tournament being played/watched: when it completes, /current
  // moves on to the NEXT event — without the pin that yanked the champion
  // screen away mid-ceremony and replaced it with "you're not registered"
  // for an event the player never joined (rehearsal report).
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  if (live.isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-5">
        <div className="h-72 animate-pulse rounded-[24px] bg-white/5" />
        <div className="h-40 animate-pulse rounded-[24px] bg-white/5" />
      </div>
    );
  }

  if (live.isError) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-5">
        <div className="rounded-[24px] border-2 border-white/10 bg-surface-card-deep p-8 text-center">
          <div className="font-poppins text-lg font-black uppercase text-white">
            {t('weekendLeague.loadError')}
          </div>
          <button
            type="button"
            onClick={live.refetch}
            className="mx-auto mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-green px-6 font-poppins text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green/90"
          >
            <RotateCw className="size-4" /> {t('weekendLeague.retry')}
          </button>
        </div>
      </div>
    );
  }

  const activeTournamentId = pinnedId ?? live.tournamentId;
  if (mode != null && activeTournamentId != null) {
    // The tapped button is an INTENT, not a seat: with the game running and
    // no check-in, the server refuses every answer — so the UI must present
    // spectator mode (chip, board, locked answers, honest result screens),
    // not player chrome with dead buttons. Check-in windows stay player-side
    // so the check-in panel can render.
    const gameRunning = live.status === 'game_live' || live.status === 'break' || live.status === 'final_live';
    const effectiveRole = mode === 'player' && gameRunning && !live.checkedIn
      ? 'spectator'
      : mode;
    return (
      <WlLiveFlow
        tournamentId={activeTournamentId}
        role={effectiveRole}
        status={live.status}
        checkedIn={live.checkedIn}
        checkinPending={live.checkinPending}
        onCheckin={live.checkinLeague}
        lateJoinUntilMs={live.lateJoinUntilMs}
        onLateJoin={() => { live.checkinLeague(); setMode('player'); }}
        onExit={() => { setMode(null); setPinnedId(null); }}
        onSpectate={() => setMode('spectator')}
        kickoffMs={live.kickoffMs}
        registered={live.registered}
        checkedInCount={live.checkedInCount}
        breakUntilMs={live.breakUntilMs}
        spectatorDelayMs={live.spectatorDelayMs}
        lastGameRank={live.lastGameRank}
        currentGameIndex={live.currentGameIndex}
      />
    );
  }

  return (
    <WeekendLeagueScreen
      showControls={false}
      controller={live}
      onJoinLive={live.hasEntered ? () => { setPinnedId(live.tournamentId); setMode('player'); } : undefined}
      onWatchLive={() => { setPinnedId(live.tournamentId); setMode('spectator'); }}
    />
  );
}
