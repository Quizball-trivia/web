"use client";

import { GameHubScreen } from "@/features/tournaments/GameHubScreen";
import { EventsComingSoon } from "@/features/tournaments/EventsComingSoon";

const EVENTS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_EVENTS_ENABLED === "true";

export default function EventsPage() {
  if (!EVENTS_ENABLED) {
    return <EventsComingSoon />;
  }

  return <GameHubScreen />;
}
