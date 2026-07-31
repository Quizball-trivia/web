'use client';

// In-app placement of the Weekend League, behind the normal app auth gate.
// Driven by the live backend; the mock prototype with the demo phase switcher
// lives at /dev/wl.

import { WeekendLeagueLiveScreen } from '@/features/weekend-league/WeekendLeagueLiveScreen';

export default function WeekendLeaguePage() {
  return <WeekendLeagueLiveScreen />;
}
