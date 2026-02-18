"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameSessionStore } from "@/stores/gameSession.store";
import { usePlayer } from "@/contexts/PlayerContext";
import { MatchmakingMapScreen } from "./components/MatchmakingMapScreen";
import { ShowdownScreen } from "./components/ShowdownScreen";
import { RankedCategoryBlockingScreen } from "@/features/play/RankedCategoryBlockingScreen";
import { RoundIntroScreen } from "./components/RoundIntroScreen";
import { RoundResultScreen } from "./components/RoundResultScreen";
import { QuizBallGameScreen } from "./components/QuizBallGameScreen";
import { QuizBallResultsScreen } from "./components/QuizBallResultsScreen";
import { RealtimeResultsScreen } from "./RealtimeResultsScreen";
import { RealtimePossessionMatchScreen } from "@/features/possession/RealtimePossessionMatchScreen";
import { useAuthStore } from "@/stores/auth.store";
import { useRealtimeConnection } from "@/lib/realtime/useRealtimeConnection";
import { getSocket } from "@/lib/realtime/socket-client";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { logger } from "@/utils/logger";
import { useGameStageTransitions } from "@/features/game/hooks/useGameStageTransitions";
import type { GameMode as LegacyGameMode } from "@/types/game";
import { resolveAvatarUrl } from "@/lib/avatars";
import { useRankedProfile } from "@/lib/queries/ranked.queries";
import { usePossessionMatchStore } from "@/stores/possessionMatch.store";

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

const POSSESSION_TOTAL_QUESTIONS_FALLBACK = 12;

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
  const realtimeError = useRealtimeMatchStore((state) => state.error);
  const sessionState = useRealtimeMatchStore((state) => state.sessionState);
  const rankedSearching = useRealtimeMatchStore((state) => state.rankedSearching);
  const rankedSearchDurationMs = useRealtimeMatchStore((state) => state.rankedSearchDurationMs);
  const rankedSearchStartedAt = useRealtimeMatchStore((state) => state.rankedSearchStartedAt);
  const rankedFoundOpponent = useRealtimeMatchStore((state) => state.rankedFoundOpponent);
  const resetRealtime = useRealtimeMatchStore((state) => state.reset);

  const { data: rankedProfile } = useRankedProfile();
  const clientTotalCorrect = usePossessionMatchStore((s) => s.totalCorrect);
  const clientTotalQuestions = usePossessionMatchStore((s) => s.totalQuestions);

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
  const [socketConnected, setSocketConnected] = useState(() => socket.connected);
  const [socketId, setSocketId] = useState<string | null>(() => socket.id ?? null);

  useEffect(() => {
    const handleConnect = () => {
      setSocketConnected(true);
      setSocketId(socket.id ?? null);
    };
    const handleDisconnect = () => {
      setSocketConnected(false);
      setSocketId(socket.id ?? null);
    };
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket]);

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
  const playerGameAvatar = useMemo(
    () =>
      resolveAvatarUrl(
        authUser?.avatar_url ?? player.avatarCustomization?.base ?? player.avatar,
        "player",
        256
      ),
    [authUser?.avatar_url, player.avatarCustomization?.base, player.avatar]
  );
  const opponentGameAvatar = useMemo(
    () => resolveAvatarUrl(opponent.avatar, "opponent", 256),
    [opponent.avatar]
  );

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

  const matchmakingDebugInfo = useMemo(
    () => ({
      socketConnected,
      socketId,
      sessionState: sessionState?.state ?? "NO_SESSION",
      activeMatchId: sessionState?.activeMatchId ?? null,
      waitingLobbyId: sessionState?.waitingLobbyId ?? null,
      queueSearchId: sessionState?.queueSearchId ?? null,
      rankedSearching,
      rankedSearchStartedAt,
      rankedSearchDurationMs,
      hasLobby: Boolean(realtimeLobby),
      hasMatch: Boolean(realtimeMatch),
      errorCode: realtimeError?.code ?? null,
    }),
    [
      rankedSearchDurationMs,
      rankedSearchStartedAt,
      rankedSearching,
      realtimeError?.code,
      realtimeLobby,
      realtimeMatch,
      sessionState?.activeMatchId,
      sessionState?.queueSearchId,
      sessionState?.state,
      sessionState?.waitingLobbyId,
      socketConnected,
      socketId,
    ]
  );

  if (stage === "idle") {
    return null;
  }

  if (isMultiplayer) {
    if (stage === "matchmaking") {
      return (
        <MatchmakingMapScreen
          matchType={matchType}
          rankedSearchDurationMs={rankedSearchDurationMs}
          rankedSearchStartedAt={rankedSearchStartedAt}
          rankedFoundOpponent={rankedFoundOpponent}
          selfUsername={player.username}
          selfAvatarCustomization={player.avatarCustomization}
          debugInfo={matchmakingDebugInfo}
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
        <RealtimePossessionMatchScreen
          playerAvatar={playerGameAvatar}
          playerUsername={player.username}
          opponentAvatar={opponentGameAvatar}
          opponentUsername={opponent.username}
          onQuit={() => {
            if (realtimeMatch?.matchId) {
              getSocket().emit("match:leave", {
                matchId: realtimeMatch.matchId,
              });
              logger.info("Socket emit match:leave", {
                matchId: realtimeMatch.matchId,
              });
            } else {
              logger.info("Socket emit match:leave skipped (missing matchId)");
            }
            exitToPlay();
          }}
          onForfeit={() => {
            if (realtimeMatch?.matchId) {
              getSocket().emit("match:forfeit", {
                matchId: realtimeMatch.matchId,
              });
              logger.info("Socket emit match:forfeit", {
                matchId: realtimeMatch.matchId,
              });
            } else {
              logger.info("Socket emit match:forfeit skipped (missing matchId)");
            }
            exitToPlay();
          }}
        />
      );
    }

    if (stage === "finalResults") {
      const final = realtimeMatch?.finalResults;
      const myStats = selfUserId && final ? final.players[selfUserId] : undefined;
      const opponentStats = selfUserId && final
        ? Object.entries(final.players).find(([userId]) => userId !== selfUserId)?.[1]
        : undefined;

      // Use finalResults if available, otherwise derive scores from possessionState
      const poss = realtimeMatch?.possessionState;
      const mySeat = realtimeMatch?.mySeat;
      const playerDisplayScore = myStats?.goals
        ?? (mySeat === 2 ? poss?.goals.seat2 : poss?.goals.seat1)
        ?? 0;
      const opponentDisplayScore = opponentStats?.goals
        ?? (mySeat === 2 ? poss?.goals.seat1 : poss?.goals.seat2)
        ?? 0;
      const totalQuestionsPlayed = realtimeMatch?.currentQuestion?.total
        ?? POSSESSION_TOTAL_QUESTIONS_FALLBACK;

      return (
        <RealtimeResultsScreen
          matchType={matchType}
          playerUsername={player.username}
          playerAvatar={playerGameAvatar}
          opponentUsername={opponent.username}
          opponentAvatar={opponentGameAvatar}
          playerScore={playerDisplayScore}
          opponentScore={opponentDisplayScore}
          playerCorrect={myStats?.correctAnswers ?? clientTotalCorrect}
          opponentCorrect={opponentStats?.correctAnswers ?? 0}
          totalQuestions={totalQuestionsPlayed ?? clientTotalQuestions}
          selfUserId={selfUserId}
          opponentId={opponent.id}
          rankedOutcome={final?.rankedOutcome ?? null}
          preMatchRankedProfile={rankedProfile ?? null}
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
        playerAvatar={playerGameAvatar}
        opponentUsername={opponent.username}
        opponentAvatar={opponentGameAvatar}
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
        playerAvatar={playerGameAvatar}
        opponentAvatar={opponentGameAvatar}
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
        playerAvatar={playerGameAvatar}
        playerUsername={player.username}
        opponentAvatar={opponentGameAvatar}
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
        playerAvatar={playerGameAvatar}
        opponentAvatar={opponentGameAvatar}
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
      playerAvatar={playerGameAvatar}
      opponentAvatar={opponentGameAvatar}
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
