"use client";

import { useRouter } from "next/navigation";
import { WlLiveSimFlow } from "@/features/weekend-league/live/WlLiveSimFlow";
import { WL_LAST_WEEK_QUESTIONS } from "./data/demoWlLastWeek";

const DEMO_CHECKIN_MS = 8_000;

/**
 * Weekend League demo: one game of the live-game simulator playing LAST
 * WEEK'S real qualifier questions (game 1, one question per round type),
 * so investors see exactly what the Saturday event feels like.
 */
export function DemoWeekendLeague() {
  const router = useRouter();

  return (
    <WlLiveSimFlow
      onExit={() => router.push("/demos")}
      questions={WL_LAST_WEEK_QUESTIONS}
      games={1}
      showControls={false}
      checkInWindowMs={DEMO_CHECKIN_MS}
    />
  );
}
