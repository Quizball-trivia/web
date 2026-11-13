"use client";

import { Suspense } from "react";
import { redirect, useSearchParams } from "next/navigation";

import { EventsDashboard } from "@/features/tournaments/EventsDashboard";
import { WeekendLeagueLiveScreen } from "@/features/weekend-league/WeekendLeagueLiveScreen";
import { WEEKEND_LEAGUE_PAUSED } from "@/features/weekend-league/paused";

const EVENTS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_EVENTS_ENABLED === "true";

function EventsContent() {
  const searchParams = useSearchParams();

  // The events hub dashboard survives behind an explicit tab while the
  // Weekend League IS the events tab (launch decision 2026-08-01).
  if (EVENTS_ENABLED && searchParams?.get("tab") === "hub") {
    return <EventsDashboard />;
  }

  return <WeekendLeagueLiveScreen />;
}

export default function EventsPage() {
  if (WEEKEND_LEAGUE_PAUSED) redirect("/play");
  return (
    <Suspense fallback={null}>
      <EventsContent />
    </Suspense>
  );
}
