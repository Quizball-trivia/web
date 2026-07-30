"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { EventsDashboard } from "@/features/tournaments/EventsDashboard";
import { UpcomingEventScreen } from "@/features/tournaments/UpcomingEventScreen";
import { WeekendLeagueScreen } from "@/features/weekend-league/WeekendLeagueScreen";

const EVENTS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_EVENTS_ENABLED === "true";

function EventsContent() {
  const searchParams = useSearchParams();

  // ?tab=weekend-league is a direct link from the play-screen rail. It has to be
  // handled before the feature-flag fallback, otherwise the link lands on the
  // "upcoming event" placeholder whenever the events hub is still gated off.
  if (searchParams?.get("tab") === "weekend-league") {
    return <WeekendLeagueScreen />;
  }

  if (!EVENTS_ENABLED) {
    return <UpcomingEventScreen />;
  }

  return <EventsDashboard />;
}

export default function EventsPage() {
  return (
    <Suspense fallback={null}>
      <EventsContent />
    </Suspense>
  );
}
