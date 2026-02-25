"use client";

import { useParams, useRouter } from "next/navigation";
import { ComponentType, useEffect, useCallback, useState, useRef } from "react";

import { storage, STORAGE_KEYS } from "@/utils/storage";
import { MoneyDropGame } from "@/features/daily/MoneyDropGame";
import { FootballJeopardyGame } from "@/features/daily/FootballJeopardyGame";
import { ClueGame } from "@/features/daily/ClueGame";
import { TrueFalseGame } from "@/features/daily/TrueFalseGame";
import { EmojiGuessGame } from "@/features/daily/EmojiGuessGame";
import { CountdownGame } from "@/features/daily/CountdownGame";
import { PutInOrderGame } from "@/features/daily/PutInOrderGame";
import { QuitGameDialog } from "@/features/daily/QuitGameDialog";
import type { DailyChallengeId } from "@/features/home/challenges";

interface DailyChallengeState {
  completedChallenges: Record<string, number>;
}

interface GameScreenProps {
  onBack: () => void;
  onComplete: (score: number) => void;
}

const GAME_COMPONENTS: Record<
  DailyChallengeId,
  ComponentType<GameScreenProps>
> = {
  moneyDrop: MoneyDropGame,
  footballJeopardy: FootballJeopardyGame,
  clues: ClueGame,
  trueFalse: TrueFalseGame,
  emojiGuess: EmojiGuessGame,
  countdown: CountdownGame,
  putInOrder: PutInOrderGame,
  hairstyle: ClueGame, // Fallback to ClueGame for hairstyle challenge
};

export default function ChallengePage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.challengeId as DailyChallengeId;
  const [showBrowserBackDialog, setShowBrowserBackDialog] = useState(false);
  const guardPushed = useRef(false);

  const GameComponent = GAME_COMPONENTS[challengeId];

  // Redirect to challenges list if invalid challengeId (must be in an effect, not during render)
  useEffect(() => {
    if (!GameComponent) {
      router.replace("/daily/challenges");
    }
  }, [GameComponent, router]);

  // Intercept browser back button / mouse back button
  useEffect(() => {
    // Push a guard history entry so pressing back doesn't leave the page
    if (!guardPushed.current) {
      window.history.pushState({ gameGuard: true }, "");
      guardPushed.current = true;
    }

    const handlePopState = () => {
      // Re-push the guard to stay on the page and show quit dialog
      window.history.pushState({ gameGuard: true }, "");
      setShowBrowserBackDialog(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleBack = useCallback(() => {
    router.push("/daily/challenges");
  }, [router]);

  const handleBrowserBackConfirm = useCallback(() => {
    setShowBrowserBackDialog(false);
    router.push("/daily/challenges");
  }, [router]);

  // TODO: score parameter intentionally unused — score persistence is not yet implemented
  const handleComplete: GameScreenProps["onComplete"] = useCallback(() => {
    // Mark challenge as completed
    const state = storage.get<DailyChallengeState | null>(
      STORAGE_KEYS.DAILY_CHALLENGE_STATE,
      null
    );

    const completedChallenges = state?.completedChallenges || {};
    completedChallenges[challengeId] = Date.now();

    storage.set(STORAGE_KEYS.DAILY_CHALLENGE_STATE, {
      completedChallenges,
    });

    // Navigate back to challenges list
    router.push("/daily/challenges");
  }, [challengeId, router]);

  if (!GameComponent) {
    return null;
  }

  return (
    <>
      <GameComponent onBack={handleBack} onComplete={handleComplete} />
      <QuitGameDialog
        open={showBrowserBackDialog}
        onOpenChange={setShowBrowserBackDialog}
        onQuit={handleBrowserBackConfirm}
      />
    </>
  );
}
