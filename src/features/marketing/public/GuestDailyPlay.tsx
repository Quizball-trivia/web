"use client";

import { useCallback } from "react";
import { DemoDailyChallenge } from "@/features/demos/DemoDailyChallenge";
import type { DailyChallengeType, StatSniperLeaderboard } from "@/lib/domain/dailyChallenge";

/** Fixed board for the Stat Sniper sample, so the screen matches the real one; nothing is fetched or saved. */
const SAMPLE_STAT_SNIPER_BOARD: StatSniperLeaderboard = {
  challengeDay: "sample",
  entries: [
    { userId: "sample-1", rank: 1, username: "BOBBIGOL", country: "GE", score: 96 },
    { userId: "sample-2", rank: 2, username: "TIKI_TAKA", country: "ES", score: 93 },
    { userId: "sample-3", rank: 3, username: "GAFFER_88", country: "GB", score: 91 },
    { userId: "sample-4", rank: 4, username: "MEZZALA", country: "IT", score: 88 },
    { userId: "sample-5", rank: 5, username: "KVARA77", country: "GE", score: 85 },
    { userId: "sample-6", rank: 6, username: "TRIVELA", country: "BR", score: 82 },
    { userId: "sample-7", rank: 7, username: "LIBERO_TR", country: "TR", score: 79 },
    { userId: "sample-8", rank: 8, username: "REGISTA", country: "AR", score: 76 },
    { userId: "sample-9", rank: 9, username: "POACHER9", country: "FR", score: 72 },
    { userId: "sample-10", rank: 10, username: "SWEEPER", country: "DE", score: 68 },
  ],
  me: null,
};

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
  const leaderboardFetcher = useCallback(() => Promise.resolve(SAMPLE_STAT_SNIPER_BOARD), []);
  return (
    <DemoDailyChallenge
      type={type}
      backHref={pagePath}
      onExit={onExit}
      onEvent={onEvent}
      leaderboardFetcher={type === "statSniper" ? leaderboardFetcher : undefined}
      peek
      resultCta={{ modeId, returnTo: playPath, onBeforeLeave: onLeaveToRealGame }}
    />
  );
}
