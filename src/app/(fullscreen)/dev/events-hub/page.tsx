'use client';

// Dev preview of the events hub — reachable without login in dev (/dev/*
// bypasses AppAuthGate). Links into the /dev weekend-league preview.

import { EventsDashboard } from '@/features/tournaments/EventsDashboard';

export default function DevEventsHubPage() {
  return (
    <div className="min-h-screen bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat">
      <EventsDashboard weekendLeagueHref="/dev/weekend-league" />
    </div>
  );
}
