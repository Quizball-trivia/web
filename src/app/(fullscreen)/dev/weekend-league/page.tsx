'use client';

// Dev preview of the Weekend League prototype — reachable without login in dev
// (/dev/* bypasses AppAuthGate). The phase switcher lets you walk the whole week.

import { WeekendLeagueScreen } from '@/features/weekend-league/WeekendLeagueScreen';

export default function DevWeekendLeaguePage() {
  return (
    <div className="min-h-screen bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat">
      <WeekendLeagueScreen />
    </div>
  );
}
