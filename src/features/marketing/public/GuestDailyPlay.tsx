"use client";

import { DemoDailyChallenge } from "@/features/demos/DemoDailyChallenge";
import type { DailyChallengeType } from "@/lib/domain/dailyChallenge";

/**
 * The public daily pages are a sneak peek: the bundled sample session for the
 * type (same questions every day), with exactly the real screens. Nothing is
 * requested from the backend and nothing is saved — the real daily, coins and
 * streak are what an account adds.
 */
export function GuestDailyPlay({ type, modeId, pagePath, playPath, onExit, onEvent, onLeaveToRealGame }: {
  type: DailyChallengeType;
  modeId: string;
  pagePath: string;
  /** The real (member) game, for the result screen's primary action. */
  playPath: string;
  onExit: () => void;
  onEvent: (event: "start" | "complete" | "replay", detail?: { score?: number }) => void;
  /** The result screen's primary action navigates away: record it like an exit. */
  onLeaveToRealGame: () => void;
}) {
  return (
    <DemoDailyChallenge
      type={type}
      backHref={pagePath}
      onExit={onExit}
      onEvent={onEvent}
      peek
      resultCta={{ modeId, returnTo: playPath, onBeforeLeave: onLeaveToRealGame }}
    />
  );
}
