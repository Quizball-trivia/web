'use client';

// In-app placement of the Weekend League, behind the normal app auth gate.
// Driven by the live backend; the mock prototype with the demo phase switcher
// lives at /dev/wl.

import { redirect } from 'next/navigation';

import { WeekendLeagueLiveScreen } from '@/features/weekend-league/WeekendLeagueLiveScreen';
import { WEEKEND_LEAGUE_PAUSED } from '@/features/weekend-league/paused';

export default function WeekendLeaguePage() {
  if (WEEKEND_LEAGUE_PAUSED) redirect('/play');
  return <WeekendLeagueLiveScreen />;
}
