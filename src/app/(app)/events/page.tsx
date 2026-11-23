"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { EventsDashboard } from "@/features/tournaments/EventsDashboard";
import { WeekendLeagueLiveScreen } from "@/features/weekend-league/WeekendLeagueLiveScreen";
import { WEEKEND_LEAGUE_PAUSED } from "@/features/weekend-league/paused";
import { LiveEventScreen } from "@/features/live-event/LiveEventScreen";
import { NoLiveEvent } from "@/features/live-event/NoLiveEvent";

const EVENTS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_EVENTS_ENABLED === "true";

function EventsContent() {
  const searchParams = useSearchParams();

  // The events hub dashboard survives behind an explicit tab while the
  // Weekend League IS the events tab (launch decision 2026-08-01).
  if (EVENTS_ENABLED && searchParams?.get("tab") === "hub") {
    return <EventsDashboard />;
  }

  // A host-run live event (Orshabatoba podcast night) takes the tab whenever
  // one exists; otherwise the Weekend League, or an empty state while the
  // league is paused.
  return (
    <LiveEventScreen
      fallback={WEEKEND_LEAGUE_PAUSED ? <NoLiveEvent /> : <WeekendLeagueLiveScreen />}
    />
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={null}>
      <EventsContent />
    </Suspense>
  );
}
