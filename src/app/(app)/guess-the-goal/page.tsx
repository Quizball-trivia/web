"use client";

import { GuessTheGoalLive } from "@/features/mini-games/components/GuessTheGoalLive";

export default function GuessTheGoalPage() {
  // Players reach this from the Daily Challenges hub while the mini-games tab
  // is hidden, so back must return there — /mini-games would land on a page
  // nothing links to.
  return <GuessTheGoalLive backHref="/daily/challenges" />;
}
