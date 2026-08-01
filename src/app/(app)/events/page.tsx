"use client";

import { Suspense } from "react";
import { WeekendLeagueLiveScreen } from "@/features/weekend-league/WeekendLeagueLiveScreen";

// The events tab IS the Weekend League (launch decision 2026-08-01).
export default function EventsPage() {
  return (
    <Suspense fallback={null}>
      <WeekendLeagueLiveScreen />
    </Suspense>
  );
}
