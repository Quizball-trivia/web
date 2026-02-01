"use client";

import { useParams, useRouter } from "next/navigation";
import { ComponentType } from "react";

import { storage, STORAGE_KEYS } from "@/utils/storage";
import { MoneyDropGame } from "@/features/daily/MoneyDropGame";
import { FootballJeopardyGame } from "@/features/daily/FootballJeopardyGame";
import { ClueGame } from "@/features/daily/ClueGame";
import { TrueFalseGame } from "@/features/daily/TrueFalseGame";
import { EmojiGuessGame } from "@/features/daily/EmojiGuessGame";
import { CountdownGame } from "@/features/daily/CountdownGame";
import { PutInOrderGame } from "@/features/daily/PutInOrderGame";
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

  const GameComponent = GAME_COMPONENTS[challengeId];

  if (!GameComponent) {
    router.push("/daily/challenges");
    return null;
  }

  const handleBack = () => {
    router.push("/daily/challenges");
  };

  const handleComplete: GameScreenProps["onComplete"] = () => {
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
  };

  return <GameComponent onBack={handleBack} onComplete={handleComplete} />;
}
