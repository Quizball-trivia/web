"use client";

import { GuessTheGoalLive } from "@/features/mini-games/components/GuessTheGoalLive";

export default function GuessTheGoalPage() {
  // Players reach this from the Play screen's Daily Challenges row (the old
  // daily-challenges hub is retired), so back returns to /play.
  return <GuessTheGoalLive backHref="/play" />;
}
