"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { MoneyDropGame } from "@/features/daily/MoneyDropGame";
import { ClueGame } from "@/features/daily/ClueGame";
import { CountdownGame } from "@/features/daily/CountdownGame";
import { PutInOrderGame } from "@/features/daily/PutInOrderGame";
import { TrueFalseGame } from "@/features/daily/TrueFalseGame";
import { ImposterGame } from "@/features/daily/ImposterGame";
import { CareerPathGame } from "@/features/daily/CareerPathGame";
import { HighLowGame } from "@/features/daily/HighLowGame";
import { FootballLogicGame } from "@/features/daily/FootballLogicGame";
import { QuitGameDialog } from "@/features/daily/QuitGameDialog";
import { DAILY_CHALLENGE_VISUALS } from "@/lib/domain/dailyChallengeVisuals";
import { useCompleteDailyChallenge } from "@/lib/queries/dailyChallenges.queries";
import { queryKeys } from "@/lib/queries/queryKeys";
import { usePlayer } from "@/contexts/PlayerContext";
import type { DailyChallengeSession, DailyChallengeType } from "@/lib/domain/dailyChallenge";
import { trackDailyChallengeCompleted } from "@/lib/analytics/game-events";
import { ApiError } from "@/lib/api/api";
import { createDailyChallengeSession } from "@/lib/repositories/dailyChallenges.repo";
import { toDailyChallengeSession } from "@/lib/mappers/dailyChallenge.mapper";
import { useLocale } from "@/contexts/LocaleContext";

function isDailyChallengeType(value: string): value is DailyChallengeType {
  return value in DAILY_CHALLENGE_VISUALS;
}

function getSessionErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.data && typeof error.data === "object") {
    const data = error.data as {
      code?: string;
      message?: string;
      details?: {
        needed?: number;
        available?: number;
      };
    };

    if (data.code === "DAILY_CHALLENGE_CONTENT_UNAVAILABLE") {
      const needed = data.details?.needed;
      const available = data.details?.available;
      if (typeof needed === "number" && typeof available === "number") {
        return `This challenge needs ${needed} published questions, but only ${available} are available. Lower the question count in CMS or publish more questions.`;
      }
      return "This challenge does not have enough published questions yet. Update the CMS config or publish more questions.";
    }

    if (data.message) {
      return data.message;
    }
  }

  return "Could not start this daily challenge. Check the CMS setup and try again.";
}

export default function ChallengePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addXP } = usePlayer();
  const { locale } = useLocale();
  const [showBrowserBackDialog, setShowBrowserBackDialog] = useState(false);
  const [session, setSession] = useState<DailyChallengeSession | undefined>();
  const [sessionError, setSessionError] = useState<unknown>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const guardPushed = useRef(false);
  const completeOnceRef = useRef(false);

  const challengeId = String(params.challengeId ?? "");
  const challengeType = isDailyChallengeType(challengeId) ? challengeId : undefined;
  const completeMutation = useCompleteDailyChallenge(challengeType ?? "moneyDrop");

  const invalidateAfterComplete = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyChallenges.list() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() }),
    ]);
  }, [queryClient]);

  const handleBack = useCallback(() => {
    router.replace("/daily/challenges");
  }, [router]);

  const handleComplete = useCallback(
    async (score: number) => {
      if (!challengeType || completeOnceRef.current) return;
      completeOnceRef.current = true;

      try {
        const result = await completeMutation.mutateAsync(score);
        trackDailyChallengeCompleted(challengeType);
        if (result.xpAwarded > 0) {
          addXP(result.xpAwarded);
        }
        await invalidateAfterComplete();
        router.replace("/daily/challenges");
      } catch {
        completeOnceRef.current = false;
      }
    },
    [addXP, challengeType, completeMutation, invalidateAfterComplete, router]
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
    });

    createDailyChallengeSession(challengeType, locale)
      .then(toDailyChallengeSession)
      .then((nextSession) => {
        if (cancelled) return;
        setSession(nextSession);
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
      router.replace("/daily/challenges");
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
      default:
        return null;
    }
  }, [handleBack, handleComplete, session]);

  const handleBrowserBackConfirm = useCallback(() => {
    setShowBrowserBackDialog(false);
    router.replace("/daily/challenges");
  }, [router]);

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
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface-deep px-4 font-fun text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface-card p-6 text-center shadow-2xl">
          <p className="text-lg font-black uppercase">Challenge unavailable</p>
          <p className="mt-3 text-sm leading-6 text-brand-slate-light">
            {sessionTypeMismatch
              ? `Received a ${session?.challengeType} session while opening ${challengeType}. Refresh and try again.`
              : getSessionErrorMessage(sessionError)}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setSessionAttempt((attempt) => attempt + 1);
              }}
              className="flex-1 rounded-xl bg-brand-green px-4 py-3 text-sm font-black uppercase text-white"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-sm font-black uppercase text-white/80"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isSessionLoading || !session) {
    return (
      <div className="fixed inset-0 z-40 bg-surface-deep font-fun flex items-center justify-center">
        <div className="bg-surface-card rounded-xl border-b-4 border-surface-card-deeper p-6 text-center">
          <p className="text-white font-black uppercase">Loading challenge</p>
          <p className="text-sm text-brand-slate mt-2">Fetching today&apos;s live challenge session.</p>
        </div>
      </div>
    );
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
