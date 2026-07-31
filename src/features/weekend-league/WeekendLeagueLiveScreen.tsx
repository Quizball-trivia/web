'use client';

import { useWeekendLeagueLive } from './use-weekend-league-live';
import { WeekendLeagueScreen } from './WeekendLeagueScreen';

/** In-app Weekend League: the prototype screen driven by the real backend. */
export function WeekendLeagueLiveScreen() {
  const live = useWeekendLeagueLive();

  if (live.isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-5">
        <div className="h-72 animate-pulse rounded-[24px] bg-white/5" />
        <div className="h-40 animate-pulse rounded-[24px] bg-white/5" />
      </div>
    );
  }

  return <WeekendLeagueScreen showControls={false} controller={live} />;
}
