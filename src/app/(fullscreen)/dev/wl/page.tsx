'use client';

// Dev playground for the Weekend League prototype — mock data + the phase
// switcher, reachable without login (/dev/* bypasses AppAuthGate). The in-app
// events tab runs the same screen off the live backend; iterate here.

import { WeekendLeagueScreen } from '@/features/weekend-league/WeekendLeagueScreen';

export default function DevWlPage() {
  return (
    <div className="min-h-screen bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat">
      <WeekendLeagueScreen showControls />
    </div>
  );
}
