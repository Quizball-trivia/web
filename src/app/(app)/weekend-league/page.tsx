'use client';

// In-app placement of the Weekend League. Behind the normal app auth gate.
// Keeps the demo phase switcher on for now so the whole flow is testable; drop
// `showControls` (defaults off would need a prop) once the backend drives phases.

import { WeekendLeagueScreen } from '@/features/weekend-league/WeekendLeagueScreen';

export default function WeekendLeaguePage() {
  return <WeekendLeagueScreen />;
}
