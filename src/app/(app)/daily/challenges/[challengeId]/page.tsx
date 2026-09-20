"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveDailyChallengeType } from "@/lib/domain/dailyChallengeSlugs";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoneyDropGame } from "@/features/daily/MoneyDropGame";
import { ClueGame } from "@/features/daily/ClueGame";
import { CountdownGame } from "@/features/daily/CountdownGame";
import { PutInOrderGame } from "@/features/daily/PutInOrderGame";
import { TrueFalseGame } from "@/features/daily/TrueFalseGame";
import { ImposterGame } from "@/features/daily/ImposterGame";
import { CareerPathGame } from "@/features/daily/CareerPathGame";
import { HighLowGame } from "@/features/daily/HighLowGame";
import { FootballLogicGame } from "@/features/daily/FootballLogicGame";
import { CardDetectiveDailyGame } from "@/features/daily/CardDetectiveDailyGame";
import { MissingXiSoloGame } from "@/features/missing-xi/MissingXiSoloGame";
import { PassChainGame } from "@/features/daily/PassChainGame";
import { StatSniperGame } from "@/features/daily/StatSniperGame";
import { QuitGameDialog } from "@/features/daily/QuitGameDialog";
import { DailyChallengeIntro } from "@/features/daily/components/DailyChallengeIntro";
import { consumeDailyChallengeSession } from "@/features/daily/dailyChallengeSessionPrefetch";
import { DAILY_CHALLENGE_VISUALS } from "@/lib/domain/dailyChallengeVisuals";
import { useCompleteDailyChallenge } from "@/lib/queries/dailyChallenges.queries";
import { queryKeys } from "@/lib/queries/queryKeys";
import { usePlayer } from "@/contexts/PlayerContext";
import type { DailyChallengeCardOutcome, DailyChallengeSession, DailyChallengeType } from "@/lib/domain/dailyChallenge";
import { trackDailyChallengeCompleted, trackDailyChallengeStarted, trackDailyChallengeQuit } from "@/lib/analytics/game-events";
import { createDailyChallengeSession } from "@/lib/repositories/dailyChallenges.repo";
import { toDailyChallengeSession } from "@/lib/mappers/dailyChallenge.mapper";
import { useLocale } from "@/contexts/LocaleContext";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import {
  type DailyChallengeCompletionSuccess,
  isDailyChallengeAlreadyCompletedError,
} from "@/lib/queries/dailyChallengeCompletion";


export default function ChallengePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addXP } = usePlayer();
  const { locale, t } = useLocale();
  const [showBrowserBackDialog, setShowBrowserBackDialog] = useState(false);
  const [session, setSession] = useState<DailyChallengeSession | undefined>();
  const [sessionError, setSessionError] = useState<unknown>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  // Gate the game behind a "get ready" intro; the game (and its timer) only
  // mounts once the intro has played. Reset on every new session attempt.
  const [introDone, setIntroDone] = useState(false);
  const guardPushed = useRef(false);
  const completeOnceRef = useRef(false);

  const challengeId = String(params.challengeId ?? "");
  // FIFA Cards was replaced by Card Detective (2026-09-06); old links land on the new daily.
  useEffect(() => {
    if (challengeId === "fifaCards") router.replace("/daily/challenges/cardDetective");
  }, [challengeId, router]);
  // Public slug ("who-am-i") or legacy internal type ("clues") — both resolve.
  const challengeType = resolveDailyChallengeType(challengeId) ?? undefined;
  const completeMutation = useCompleteDailyChallenge(challengeType ?? "moneyDrop");

  const invalidateAfterComplete = useCallback(async () => {
    await Promise.all([
      // `.all` (not `.list()`, which defaults to the "en" locale key) so the
      // refetch hits whatever locale the hub is actually showing — otherwise a
      // Georgian user's list never refreshes and can show a stale/empty state.
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyChallenges.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() }),
    ]);
  }, [queryClient]);

  const handleBack = useCallback(() => {
    // Treat "back" before completion as a quit. handleComplete sets
    // completeOnceRef.current = true; we only fire `daily_challenge_quit`
    // when no completion has been recorded for this session.
    if (challengeType && !completeOnceRef.current) {
      try {
        trackDailyChallengeQuit({
          challengeType,
          // Per-game progress isn't exposed at the page level (each game
          // owns its own state). Leaving the optional fields off keeps
          // the event durable; product can derive partial completion from
          // session-start timing + return events.
        });
      } catch {
        /* analytics best-effort */
      }
    }
    router.replace("/play");
  }, [challengeType, router]);

  // The completion write, once per session. Games that show a leaderboard call it
  // before their results screen; everything else goes through handleComplete.
  const persistRef = useRef<Promise<void> | null>(null);
  const persistCompletion = useCallback(
    (score: number, outcomes?: DailyChallengeCardOutcome[]): Promise<void> => {
      if (!challengeType) return Promise.resolve();
      if (persistRef.current) return persistRef.current;
      completeOnceRef.current = true;
      const run = (async () => {
        // Only a failed completion WRITE may surface the failure toast and
        // re-arm the once-guard; post-write side effects (analytics, local XP,
        // cache invalidation) can fail without the reward being lost, so each
        // is guarded to log-and-continue.
        let completion: DailyChallengeCompletionSuccess;
        try {
          completion = {
            status: "completed",
            result: await completeMutation.mutateAsync(outcomes && outcomes.length > 0 ? { score, outcomes } : score),
          };
        } catch (error) {
          if (isDailyChallengeAlreadyCompletedError(error)) {
            completion = { status: "alreadyCompleted" };
          } else {
            console.error('Daily challenge completion failed', error);
            completeOnceRef.current = false;
            persistRef.current = null;
            toast.error(t("dailyGames.completionSaveFailed"));
            await invalidateAfterComplete().catch((invalidateError) => {
              console.error('Post-failure invalidation failed', invalidateError);
            });
            return;
          }
        }

        if (completion.status === "completed") {
          const { result } = completion;
          try {
            trackDailyChallengeCompleted({
              challengeType,
              score,
              xpAwarded: result.xpAwarded,
            });
          } catch (error) {
            console.error('Analytics trackDailyChallengeCompleted failed', error);
          }
          try {
            if (result.xpAwarded > 0) {
              addXP(result.xpAwarded);
            }
          } catch (error) {
            console.error('Applying XP reward failed', error);
          }
        }

        await invalidateAfterComplete().catch((invalidateError) => {
          console.error('Post-completion invalidation failed', invalidateError);
        });
      })();
      persistRef.current = run;
      return run;
    },
    [addXP, challengeType, completeMutation, invalidateAfterComplete, t]
  );

  const handleComplete = useCallback(
    (score: number, nextPath?: string, outcomes?: DailyChallengeCardOutcome[]) => {
      if (!challengeType) return;
      const alreadySaved = Boolean(persistRef.current);
      if (!alreadySaved && completeOnceRef.current) return;
      // Navigate back instantly — the completion write + cache refresh run in
      // the background so the user isn't stuck waiting on a round-trip.
      router.replace(nextPath ?? "/play");
      if (!alreadySaved) void persistCompletion(score, outcomes);
    },
    [challengeType, persistCompletion, router]
  );

  useEffect(() => {
    if (!challengeType) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setIsSessionLoading(true);
      setSessionError(null);
      setSession(undefined);
      setIntroDone(false);
    });

    // Reuse the session the hub started on tap-down if it's still fresh; that
    // POST already overlapped the navigation, so this is usually resolved by now.
    // Falls back to creating one when there's no fresh prefetch (deep link, slow
    // network, stale TTL).
    const prefetched = consumeDailyChallengeSession(challengeType, locale, Date.now());
    const sessionPromise =
      prefetched ?? createDailyChallengeSession(challengeType, locale).then(toDailyChallengeSession);

    sessionPromise
      .then((nextSession) => {
        if (cancelled) return;
        setSession(nextSession);
        // Count a start only once a playable session for THIS challenge exists —
        // a failed load or a mismatched session shows "unavailable", not a game.
        if (nextSession.challengeType === challengeType) {
          try {
            trackDailyChallengeStarted(challengeType);
          } catch (error) {
            console.error('Analytics trackDailyChallengeStarted failed', error);
          }
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSessionError(error);
      })
      .finally(() => {
        if (cancelled) return;
        setIsSessionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [challengeType, locale, sessionAttempt]);

  const sessionTypeMismatch = Boolean(
    challengeType
    && session
    && session.challengeType !== challengeType
  );

  useEffect(() => {
    if (!challengeType) {
      router.replace("/play");
    }
  }, [challengeType, router]);

  const gameContent = useMemo(() => {
    if (!session) return null;

    switch (session.challengeType) {
      case "moneyDrop":
        return <MoneyDropGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} />;
      case "trueFalse":
        return <TrueFalseGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} />;
      case "clues":
        return <ClueGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} />;
      case "countdown":
        return <CountdownGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} />;
      case "putInOrder":
        return <PutInOrderGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} />;
      case "imposter":
        return <ImposterGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} />;
      case "careerPath":
        return <CareerPathGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} />;
      case "highLow":
        return <HighLowGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} />;
      case "footballLogic":
        return <FootballLogicGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} />;
      case "cardDetective":
        return <CardDetectiveDailyGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} />;
      case "missingXi":
        return <MissingXiSoloGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} />;
      case "passChain":
        return <PassChainGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} />;
      case "statSniper":
        return <StatSniperGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} onSaveResult={(score) => persistCompletion(score)} />;
      default:
        return null;
    }
  }, [handleBack, handleComplete, session, persistCompletion]);

  const handleBrowserBackConfirm = useCallback(() => {
    setShowBrowserBackDialog(false);
    handleBack();
  }, [handleBack]);

  useEffect(() => {
    if (typeof window === "undefined" || guardPushed.current) return undefined;
    window.history.pushState({ gameGuard: true }, "");
    guardPushed.current = true;
    const handlePopState = () => {
      window.history.pushState({ gameGuard: true }, "");
      setShowBrowserBackDialog(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (!challengeType) {
    return null;
  }

  if (sessionError || sessionTypeMismatch) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface-page px-4">
        <div className="w-full max-w-md rounded-[24px] bg-brand-blue p-8 text-center sm:p-10">
          <h2 className="font-poppins text-[22px] font-semibold uppercase text-white sm:text-[26px]">
            {t("dailyGames.unavailableTitle")}
          </h2>
          <p className="mt-3 font-poppins text-[13px] font-medium leading-snug text-white/80 sm:text-sm">
            {t("dailyGames.unavailableMessage")}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setSessionAttempt((attempt) => attempt + 1)}
              className="h-12 w-full rounded-[28px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black transition-colors hover:bg-brand-yellow-deep"
            >
              {t("dailyGames.unavailableTryAgain")}
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="h-11 w-full rounded-[28px] bg-white/10 font-poppins text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white/15"
            >
              {t("dailyGames.unavailableBack")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isSessionLoading || !session) {
    return (
      <LoadingScreen
        className="bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
      />
    );
  }

  // Play the "get ready" intro first; the game (and its timer) only mounts
  // after it finishes, so the countdown never starts before the player is ready.
  if (!introDone) {
    return <DailyChallengeIntro title={session.title} onDone={() => setIntroDone(true)} />;
  }

  return (
    <>
      {gameContent}
      <QuitGameDialog
        open={showBrowserBackDialog}
        onOpenChange={setShowBrowserBackDialog}
        onQuit={handleBrowserBackConfirm}
      />
    </>
  );
}
