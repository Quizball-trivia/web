'use client';

import { useState } from 'react';
import { RotateCw } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { useWeekendLeagueLive } from './use-weekend-league-live';
import { WeekendLeagueScreen } from './WeekendLeagueScreen';
import { WlLiveFlow } from './live/WlLiveFlow';

/** In-app Weekend League: the prototype screen driven by the real backend. */
export function WeekendLeagueLiveScreen() {
  const { t } = useLocale();
  const live = useWeekendLeagueLive();
  const [mode, setMode] = useState<'player' | 'spectator' | null>(null);

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

  if (mode != null && live.tournamentId != null) {
    return (
      <WlLiveFlow
        tournamentId={live.tournamentId}
        role={mode}
        status={live.status}
        checkedIn={live.checkedIn}
        checkinPending={live.checkinPending}
        onCheckin={live.checkinLeague}
        onExit={() => setMode(null)}
        onSpectate={() => setMode('spectator')}
        kickoffMs={live.kickoffMs}
        registered={live.registered}
        checkedInCount={live.checkedInCount}
        breakUntilMs={live.breakUntilMs}
        lastGameRank={live.lastGameRank}
        currentGameIndex={live.currentGameIndex}
      />
    );
  }

  return (
    <WeekendLeagueScreen
      showControls={false}
      controller={live}
      onJoinLive={live.hasEntered ? () => setMode('player') : undefined}
      onWatchLive={() => setMode('spectator')}
    />
  );
}
