"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { MoneyDropGame } from "@/features/daily/MoneyDropGame";
import { FootballJeopardyGame } from "@/features/daily/FootballJeopardyGame";
import { ClueGame } from "@/features/daily/ClueGame";
import { CountdownGame } from "@/features/daily/CountdownGame";
import { PutInOrderGame } from "@/features/daily/PutInOrderGame";
import { QuitGameDialog } from "@/features/daily/QuitGameDialog";
import { DAILY_CHALLENGE_VISUALS } from "@/lib/domain/dailyChallengeVisuals";
import { useCompleteDailyChallenge, useDailyChallengeSession } from "@/lib/queries/dailyChallenges.queries";
import { queryKeys } from "@/lib/queries/queryKeys";
import { usePlayer } from "@/contexts/PlayerContext";
import type { DailyChallengeType } from "@/lib/domain/dailyChallenge";
import { trackDailyChallengeCompleted } from "@/lib/analytics/game-events";

function isDailyChallengeType(value: string): value is DailyChallengeType {
  return value in DAILY_CHALLENGE_VISUALS;
}

export default function ChallengePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addXP } = usePlayer();
  const [showBrowserBackDialog, setShowBrowserBackDialog] = useState(false);
  const guardPushed = useRef(false);
  const completeOnceRef = useRef(false);
  const sessionRequestedForRef = useRef<string | null>(null);

  const challengeId = String(params.challengeId ?? "");
  const challengeType = isDailyChallengeType(challengeId) ? challengeId : undefined;
  const sessionMutation = useDailyChallengeSession(challengeType);
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

  const session = challengeType && sessionMutation.data?.challengeType === challengeType
    ? sessionMutation.data
    : undefined;
  const requestSession = sessionMutation.mutate;

  useEffect(() => {
    if (!challengeType || sessionRequestedForRef.current === challengeType) {
      return;
    }
    sessionRequestedForRef.current = challengeType;
    requestSession();
  }, [challengeType, requestSession]);

  useEffect(() => {
    if (!challengeType || sessionMutation.isError) {
      router.replace("/daily/challenges");
    }
  }, [challengeType, router, sessionMutation.isError]);

  const gameContent = useMemo(() => {
    if (!session) return null;

    switch (session.challengeType) {
      case "moneyDrop":
        return <MoneyDropGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} />;
      case "footballJeopardy":
        return <FootballJeopardyGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} />;
      case "clues":
        return <ClueGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} />;
      case "countdown":
        return <CountdownGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} />;
      case "putInOrder":
        return <PutInOrderGame key={session.challengeType} session={session} onBack={handleBack} onComplete={handleComplete} />;
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

  if (!challengeType || sessionMutation.isError) {
    return null;
  }

  if (sessionMutation.isPending || !session) {
    return (
      <div className="fixed inset-0 z-40 bg-[#131F24] font-fun flex items-center justify-center">
        <div className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] p-6 text-center">
          <p className="text-white font-black uppercase">Loading challenge</p>
          <p className="text-sm text-[#56707A] mt-2">Fetching today&apos;s live challenge session.</p>
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
