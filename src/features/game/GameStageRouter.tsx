"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameSessionStore } from "@/stores/gameSession.store";
import { usePlayer } from "@/contexts/PlayerContext";
import { MatchmakingScreen } from "@/components/game/MatchmakingScreen";
import { ShowdownScreen } from "@/components/game/ShowdownScreen";
import { RoundIntroScreen } from "@/components/game/RoundIntroScreen";
import { RoundResultScreen } from "@/components/game/RoundResultScreen";
import { QuizBallGameScreen } from "@/components/game/QuizBallGameScreen";
import { QuizBallResultsScreen } from "@/components/game/QuizBallResultsScreen";
import type { Question } from "@/types/game";
import type { GameMode as LegacyGameMode } from "@/types/game";
import type { GameQuestion } from "@/lib/domain";

type OpponentInfo = {
  id: string;
  username: string;
  avatar: string;
  tier?: string;
};

type LastGameStats = {
  playerScore: number;
  opponentScore: number;
  correctAnswers: number;
  playerAnswers: (number | null)[];
};

const toLegacyMode = (mode: string | undefined): LegacyGameMode => {
  if (mode === "buzzer") return "buzzer";
  if (mode === "ranked") return "timeAttack";
  if (mode === "quizball") return "categories";
  return "timeAttack";
};

const toLegacyQuestions = (questions: GameQuestion[]): Question[] => {
  return questions.map((q) => ({
    id: q.id,
    question: q.prompt,
    options: q.options,
    correctAnswer: q.correctIndex,
    difficulty: (q.difficulty || "medium") as Question["difficulty"],
    category: q.categoryName || "General",
    clue: q.explanation || "",
  }));
};

export function GameStageRouter() {
  const router = useRouter();
  const { player } = usePlayer();
  const stage = useGameSessionStore((state) => state.stage);
  const config = useGameSessionStore((state) => state.config);
  const questions = useGameSessionStore((state) => state.questions);
  const setStage = useGameSessionStore((state) => state.setStage);
  const reset = useGameSessionStore((state) => state.reset);

  const [opponent, setOpponent] = useState<OpponentInfo>({
    id: "opponent",
    username: "TriviaKing",
    avatar: "👑",
    tier: "Silver",
  });
  const [lastGameStats, setLastGameStats] = useState<LastGameStats>({
    playerScore: 0,
    opponentScore: 0,
    correctAnswers: 0,
    playerAnswers: [],
  });
  const [roundNumber, setRoundNumber] = useState(1);
  const totalRounds = 3;

  useEffect(() => {
    if (stage === "idle") {
      router.replace("/play");
    }
  }, [stage, router]);

  const legacyQuestions = useMemo(
    () => toLegacyQuestions(questions),
    [questions],
  );

  if (stage === "idle") {
    return null;
  }

  const matchType = config?.matchType || "casual";
  const showdownType = matchType === "ranked" ? "ranked" : "friendly";
  const legacyMode = toLegacyMode(config?.mode);

  if (stage === "matchmaking") {
    return (
      <MatchmakingScreen
        matchType={matchType}
        onCancel={() => {
          reset();
          router.push("/play");
        }}
        onMatchFound={(nextOpponent) => {
          setOpponent(nextOpponent);
          setStage("showdown");
        }}
      />
    );
  }

  if (stage === "showdown") {
    return (
      <ShowdownScreen
        matchType={showdownType}
        playerUsername={player.username}
        playerAvatar={player.avatar}
        opponentUsername={opponent.username}
        opponentAvatar={opponent.avatar}
        onComplete={() => setStage("roundIntro")}
      />
    );
  }

  if (stage === "roundIntro") {
    return (
      <RoundIntroScreen
        roundNumber={roundNumber}
        totalRounds={totalRounds}
        mode={legacyMode}
        playerUsername={player.username}
        opponentUsername={opponent.username}
        playerAvatar={player.avatar}
        opponentAvatar={opponent.avatar}
        playerRoundsWon={0}
        opponentRoundsWon={0}
        onReady={() => setStage("playing")}
      />
    );
  }

  if (stage === "playing") {
    return (
      <QuizBallGameScreen
        questions={legacyQuestions}
        category={config?.categoryName || "General"}
        categoryIcon={config?.categoryIcon || "⚽"}
        playerAvatar={player.avatar}
        playerUsername={player.username}
        opponentAvatar={opponent.avatar}
        opponentUsername={opponent.username}
        onGameEnd={(playerScore, opponentScore, correctAnswers, playerAnswers) => {
          setLastGameStats({
            playerScore,
            opponentScore,
            correctAnswers,
            playerAnswers,
          });
          setStage("roundResult");
        }}
        onQuit={() => {
          reset();
          router.push("/play");
        }}
      />
    );
  }

  if (stage === "roundResult") {
    const playerWonRound = lastGameStats.playerScore >= lastGameStats.opponentScore;
    return (
      <RoundResultScreen
        roundNumber={roundNumber}
        totalRounds={totalRounds}
        mode={legacyMode}
        playerScore={lastGameStats.playerScore}
        opponentScore={lastGameStats.opponentScore}
        playerUsername={player.username}
        opponentUsername={opponent.username}
        playerAvatar={player.avatar}
        opponentAvatar={opponent.avatar}
        playerRoundsWon={playerWonRound ? 1 : 0}
        opponentRoundsWon={!playerWonRound ? 1 : 0}
        isRanked={matchType === "ranked"}
        onReady={() => {
          if (roundNumber < totalRounds) {
            setRoundNumber((prev) => prev + 1);
            setStage("roundIntro");
            return;
          }
          setStage("finalResults");
        }}
      />
    );
  }

  return (
    <QuizBallResultsScreen
      categoryName={config?.categoryName || "General"}
      categoryIcon={config?.categoryIcon || "⚽"}
      playerScore={lastGameStats.playerScore}
      opponentScore={lastGameStats.opponentScore}
      playerUsername={player.username}
      opponentUsername={opponent.username}
      playerAvatar={player.avatar}
      opponentAvatar={opponent.avatar}
      oldRank={120}
      newRank={125}
      correctAnswers={lastGameStats.correctAnswers}
      totalQuestions={legacyQuestions.length}
      coinsEarned={150}
      questions={legacyQuestions}
      playerAnswers={lastGameStats.playerAnswers}
      onPlayAgain={() => {
        reset();
        router.push("/play");
      }}
      onMainMenu={() => {
        reset();
        router.push("/play");
      }}
    />
  );
}
