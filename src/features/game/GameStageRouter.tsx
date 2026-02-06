"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameSessionStore } from "@/stores/gameSession.store";
import { usePlayer } from "@/contexts/PlayerContext";
import { MatchmakingScreen } from "./components/MatchmakingScreen";
import { ShowdownScreen } from "./components/ShowdownScreen";
import { RankedCategoryBlockingScreen } from "@/features/play/RankedCategoryBlockingScreen";
import { RoundIntroScreen } from "./components/RoundIntroScreen";
import { RoundResultScreen } from "./components/RoundResultScreen";
import { QuizBallGameScreen } from "./components/QuizBallGameScreen";
import { QuizBallResultsScreen } from "./components/QuizBallResultsScreen";
import { RealtimeQuizBallGameScreen } from "./RealtimeQuizBallGameScreen";
import { RealtimeResultsScreen } from "./RealtimeResultsScreen";
import { useAuthStore } from "@/stores/auth.store";
import { useRealtimeConnection } from "@/lib/realtime/useRealtimeConnection";
import { getSocket } from "@/lib/realtime/socket-client";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { logger } from "@/utils/logger";
import { useGameStageTransitions } from "@/features/game/hooks/useGameStageTransitions";
import type { GameMode as LegacyGameMode } from "@/types/game";

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
  const rankedSearchDurationMs = useRealtimeMatchStore((state) => state.rankedSearchDurationMs);
  const rankedSearchStartedAt = useRealtimeMatchStore((state) => state.rankedSearchStartedAt);
  const rankedFoundOpponent = useRealtimeMatchStore((state) => state.rankedFoundOpponent);
  const resetRealtime = useRealtimeMatchStore((state) => state.reset);

  const defaultOpponent = useMemo<OpponentInfo>(
    () => ({
      id: "opponent",
      username: "TriviaKing",
      avatar: "👑",
      tier: "Silver",
    }),
    [],
  );
  const [lastGameStats, setLastGameStats] = useState<LastGameStats>({
    playerScore: 0,
    opponentScore: 0,
    correctAnswers: 0,
    playerAnswers: [],
  });
  const [roundNumber, setRoundNumber] = useState(1);
  const totalRounds = 3;
  const isMultiplayer = config?.mode !== "solo" && !!config;
  const selfUserId = authUser?.id ?? player.id;
  const socket = useRealtimeConnection({ enabled: isMultiplayer, selfUserId });

  useGameStageTransitions({
    isMultiplayer,
    stage,
    config,
    socket,
    realtimeDraft,
    realtimeMatch,
    setStage,
  });

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const opponent = useMemo<OpponentInfo>(() => {
    if (isMultiplayer && realtimeMatch?.opponent) {
      return {
        id: realtimeMatch.opponent.id,
        username: realtimeMatch.opponent.username,
        avatar: realtimeMatch.opponent.avatarUrl ?? "👑",
      };
    }
    if (isMultiplayer && realtimeLobby) {
      const opp = realtimeLobby.members.find(
        (member) => member.userId !== selfUserId
      );
      if (opp) {
        return {
          id: opp.userId,
          username: opp.username,
          avatar: opp.avatarUrl ?? "👑",
        };
      }
    }
    return defaultOpponent;
  }, [defaultOpponent, isMultiplayer, realtimeLobby, realtimeMatch?.opponent, selfUserId]);

  const matchType = config?.matchType || "friendly";
  const showdownType = matchType === "ranked" ? "ranked" : "friendly";
  const legacyMode = toLegacyMode(config?.mode);

  const exitToPlay = useCallback(() => {
    resetRealtime();
    reset();
    router.push("/play");
  }, [reset, resetRealtime, router]);

  useEffect(() => {
    if (stage === "idle") {
      router.replace("/play");
    }
  }, [stage, router]);

  if (stage === "idle") {
    return null;
  }

  if (isMultiplayer) {
    if (stage === "matchmaking") {
      return (
        <MatchmakingScreen
          matchType={matchType}
          rankedSearchDurationMs={rankedSearchDurationMs}
          rankedSearchStartedAt={rankedSearchStartedAt}
          rankedFoundOpponent={rankedFoundOpponent}
          onCancel={() => {
            if (matchType === "ranked") {
              getSocket().emit("ranked:queue_leave");
              logger.info("Socket emit ranked:queue_leave");
            } else {
              getSocket().emit("lobby:leave");
              logger.info("Socket emit lobby:leave");
            }
            exitToPlay();
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
            getSocket().emit("match:leave", {
              matchId: realtimeMatch?.matchId,
            });
            logger.info("Socket emit match:leave", {
              matchId: realtimeMatch?.matchId,
            });
            exitToPlay();
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
            if (matchType === "ranked") {
              resetRealtime();
              setStage("matchmaking");
              return;
            }
            logger.info("Play Again clicked for friendly: rematch flow not implemented yet");
          }}
          onMainMenu={() => {
            exitToPlay();
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
        questions={questions}
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
          exitToPlay();
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
      totalQuestions={questions.length}
      coinsEarned={150}
      questions={questions}
      playerAnswers={lastGameStats.playerAnswers}
      onPlayAgain={() => {
        exitToPlay();
      }}
      onMainMenu={() => {
        exitToPlay();
      }}
    />
  );
}
