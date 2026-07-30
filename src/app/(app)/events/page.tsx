"use client";

import { EventsDashboard } from "@/features/tournaments/EventsDashboard";
import { UpcomingEventScreen } from "@/features/tournaments/UpcomingEventScreen";

const EVENTS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_EVENTS_ENABLED === "true";

export default function EventsPage() {
  if (!EVENTS_ENABLED) {
    return <UpcomingEventScreen />;
  }

  return <EventsDashboard />;
}
