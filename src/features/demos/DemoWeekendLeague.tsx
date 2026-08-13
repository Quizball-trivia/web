"use client";

import { WeekendLeagueScreen } from "@/features/weekend-league/WeekendLeagueScreen";

export function DemoWeekendLeague() {
  return (
    <div className="min-h-dvh w-full bg-surface-page">
      <WeekendLeagueScreen
        showControls={false}
        initial={{ phase: "qualifier_live", hasEntered: true }}
      />
    </div>
  );
}
