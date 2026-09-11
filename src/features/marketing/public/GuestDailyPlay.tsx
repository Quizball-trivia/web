"use client";

import { useEffect, useState } from "react";
import { DemoDailyChallenge } from "@/features/demos/DemoDailyChallenge";
import type { DailyChallengeSession, DailyChallengeType } from "@/lib/domain/dailyChallenge";
import { guestApi } from "@/lib/repositories/guest.repo";
import { trackPublicGameError } from "@/lib/analytics/public-games.analytics";

type Locale = "en" | "ka" | "es";

/**
 * A guest plays TODAY'S real daily set: the session comes from the guest API and
 * the result is recorded without rewards. If the guest API is unreachable the
 * built-in sample round runs instead, labelled as such.
 */
export function GuestDailyPlay({ type, modeId, locale, pagePath, onExit, onEvent, copy }: {
  type: DailyChallengeType;
  modeId: string;
  locale: Locale;
  pagePath: string;
  onExit: () => void;
  onEvent: (event: "start" | "complete" | "replay", detail?: { score?: number }) => void;
  copy: { loading: string; sampleFallback: string };
}) {
  const [state, setState] = useState<{ status: "loading" } | { status: "ready"; session: DailyChallengeSession } | { status: "sample" }>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    guestApi.createDailySession(type, locale)
      .then((session) => { if (!cancelled) setState({ status: "ready", session }); })
      .catch((error: unknown) => {
        trackPublicGameError({ modeId, category: error instanceof Error && "status" in error ? `http_${(error as { status: number }).status}` : "network", stage: "guest_session" });
        if (!cancelled) setState({ status: "sample" });
      });
    return () => { cancelled = true; };
  }, [type, locale, modeId]);

  if (state.status === "loading") {
    return <div role="status" aria-live="polite" className="flex min-h-[60vh] items-center justify-center text-sm font-semibold text-white/70">{copy.loading}</div>;
  }
  const shared = { type, backHref: pagePath, onExit, onEvent };
  if (state.status === "sample") {
    // The sample round must work with the API down: demo link resolver, no remote board, nothing submitted.
    return (
      <>
        <p role="status" aria-live="polite" className="fixed inset-x-0 top-3 z-[115] mx-auto w-fit rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-brand-yellow backdrop-blur-sm">{copy.sampleFallback}</p>
        <DemoDailyChallenge {...shared} />
      </>
    );
  }
  return (
    <DemoDailyChallenge
      {...shared}
      session={state.session}
      resolveLink={(fromPlayerId, text, _targetId, puzzleId, l) => guestApi.linkPassChain({ puzzleId, fromPlayerId, text, locale: l })}
      leaderboardFetcher={() => guestApi.statSniperLeaderboard(locale)}
      onRemoteComplete={(score) => guestApi.completeDaily(type, score, locale)}
    />
  );
}
