"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameSessionStore } from "@/stores/gameSession.store";
import { usePlayer } from "@/contexts/PlayerContext";
import { MatchmakingScreen } from "@/components/game/MatchmakingScreen";
import { ShowdownScreen } from "@/components/game/ShowdownScreen";
import { RankedCategoryBlockingScreen } from "@/features/play/RankedCategoryBlockingScreen";
import { RoundIntroScreen } from "@/components/game/RoundIntroScreen";
import { RoundResultScreen } from "@/components/game/RoundResultScreen";
import { QuizBallGameScreen } from "@/components/game/QuizBallGameScreen";
import { QuizBallResultsScreen } from "@/components/game/QuizBallResultsScreen";
import { RealtimeQuizBallGameScreen } from "@/features/game/RealtimeQuizBallGameScreen";
import { RealtimeResultsScreen } from "@/features/game/RealtimeResultsScreen";
import { useAuthStore } from "@/stores/auth.store";
import { useRealtimeConnection } from "@/lib/realtime/useRealtimeConnection";
import { getSocket } from "@/lib/realtime/socket-client";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { logger } from "@/utils/logger";
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
  const authUser = useAuthStore((state) => state.user);
  const realtimeLobby = useRealtimeMatchStore((state) => state.lobby);
  const realtimeDraft = useRealtimeMatchStore((state) => state.draft);
  const realtimeMatch = useRealtimeMatchStore((state) => state.match);
  const resetRealtime = useRealtimeMatchStore((state) => state.reset);

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
  const rankedRequestRef = useRef(false);

  const isMultiplayer = config?.mode !== "solo" && !!config;
  const selfUserId = authUser?.id ?? player.id;
  const socket = useRealtimeConnection({ enabled: isMultiplayer, selfUserId });

  useEffect(() => {
    if (!isMultiplayer || config?.matchType !== "ranked") return;
    if (stage === "matchmaking" && !rankedRequestRef.current) {
      rankedRequestRef.current = true;
      socket.emit("lobby:create", { mode: "ranked" });
      logger.info("Socket emit lobby:create", { mode: "ranked" });
    }
  }, [isMultiplayer, config?.matchType, stage, socket]);

  useEffect(() => {
    if (stage === "idle") {
      rankedRequestRef.current = false;
    }
  }, [stage]);

  useEffect(() => {
    if (!isMultiplayer) return;
    if (realtimeDraft && stage !== "categoryBlocking") {
      setStage("categoryBlocking");
    }
  }, [isMultiplayer, realtimeDraft, setStage, stage]);

  useEffect(() => {
    if (!isMultiplayer) return;
    if (realtimeMatch?.currentQuestion && stage !== "playing") {
      setStage("playing");
    }
  }, [isMultiplayer, realtimeMatch?.currentQuestion, setStage, stage]);

  useEffect(() => {
    if (!isMultiplayer) return;
    if (realtimeMatch?.finalResults && stage !== "finalResults") {
      setStage("finalResults");
    }
  }, [isMultiplayer, realtimeMatch?.finalResults, setStage, stage]);

  useEffect(() => {
    if (!isMultiplayer) return;
    if (realtimeMatch?.opponent) {
      setOpponent({
        id: realtimeMatch.opponent.id,
        username: realtimeMatch.opponent.username,
        avatar: realtimeMatch.opponent.avatarUrl ?? "👑",
      });
    } else if (realtimeLobby) {
      const opp = realtimeLobby.members.find((member) => member.userId !== selfUserId);
      if (opp) {
        setOpponent({
          id: opp.userId,
          username: opp.username,
          avatar: opp.avatarUrl ?? "👑",
        });
      }
    }
  }, [isMultiplayer, realtimeLobby, realtimeMatch?.opponent, selfUserId]);

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

  const matchType = config?.matchType || "friendly";
  const showdownType = matchType === "ranked" ? "ranked" : "friendly";
  const legacyMode = toLegacyMode(config?.mode);

  if (isMultiplayer) {
    if (stage === "matchmaking") {
      return (
        <MatchmakingScreen
          matchType={matchType}
          onCancel={() => {
            getSocket().emit("lobby:leave");
            logger.info("Socket emit lobby:leave");
            resetRealtime();
            reset();
            router.push("/play");
          }}
        />
      );
    }

    if (stage === "categoryBlocking") {
      return <RankedCategoryBlockingScreen />;
    }

    if (stage === "playing") {
      return (
        <RealtimeQuizBallGameScreen
          playerAvatar={player.avatar}
          playerUsername={player.username}
          opponentAvatar={opponent.avatar}
          opponentUsername={opponent.username}
          onQuit={() => {
            getSocket().emit("lobby:leave");
            logger.info("Socket emit lobby:leave");
            resetRealtime();
            reset();
            router.push("/play");
          }}
        />
      );
    }

    if (stage === "finalResults" && realtimeMatch?.finalResults) {
      const final = realtimeMatch.finalResults;
      const myStats = selfUserId ? final.players[selfUserId] : undefined;
      const opponentStats = selfUserId
        ? Object.entries(final.players).find(([userId]) => userId !== selfUserId)?.[1]
        : undefined;

      return (
        <RealtimeResultsScreen
          playerUsername={player.username}
          playerAvatar={player.avatar}
          opponentUsername={opponent.username}
          opponentAvatar={opponent.avatar}
          playerScore={myStats?.totalPoints ?? realtimeMatch.myTotalPoints}
          opponentScore={opponentStats?.totalPoints ?? realtimeMatch.oppTotalPoints}
          playerCorrect={myStats?.correctAnswers ?? 0}
          opponentCorrect={opponentStats?.correctAnswers ?? 0}
          totalQuestions={10}
          onPlayAgain={() => {
            resetRealtime();
            reset();
            router.push("/play");
          }}
          onMainMenu={() => {
            resetRealtime();
            reset();
            router.push("/play");
          }}
        />
      );
    }
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
