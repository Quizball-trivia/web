"use client";

import { notFound, useParams } from "next/navigation";
import { DemoAuction } from "@/features/demos/DemoAuction";
import { DemoDailyChallenge } from "@/features/demos/DemoDailyChallenge";
import { DemoTraining } from "@/features/demos/DemoTraining";
import { DemoWeekendLeague } from "@/features/demos/DemoWeekendLeague";
import { findDemoMode } from "@/features/demos/demoModes";

export default function DemoModePage() {
  const params = useParams();
  const slug = String(params.mode ?? "");
  const mode = findDemoMode(slug);

  if (!mode) {
    notFound();
  }

  if (mode.dailyType) {
    return <DemoDailyChallenge type={mode.dailyType} />;
  }

  switch (mode.slug) {
    case "match":
      return <DemoTraining />;
    case "auction":
      return <DemoAuction />;
    case "weekend-league":
      return <DemoWeekendLeague />;
    default:
      notFound();
  }
}
