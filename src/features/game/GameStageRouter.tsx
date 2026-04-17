"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { MatchmakingMapScreen } from "./components/MatchmakingMapScreen";
import { ShowdownScreen } from "./components/ShowdownScreen";
import { RankedCategoryBlockingScreen } from "@/features/play/RankedCategoryBlockingScreen";
import { RealtimeResultsScreen } from "./RealtimeResultsScreen";
import { RealtimePossessionMatchScreen } from "@/features/possession/RealtimePossessionMatchScreen";
import { RealtimePartyQuizScreen } from "@/features/party/RealtimePartyQuizScreen";
import { PartyQuizResultsScreen } from "@/features/party/PartyQuizResultsScreen";
import { getSocket } from "@/lib/realtime/socket-client";
import { logger } from "@/utils/logger";
import { useGameStageTransitions } from "@/features/game/hooks/useGameStageTransitions";
import { resolveAvatarUrl } from "@/lib/avatars";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { tierFromRp } from "@/utils/rankedTier";
import { parseRp } from "@/lib/utils";
import { TrainingMatchScreen } from "@/features/training/TrainingMatchScreen";
import { useGameStageState } from "@/features/game/hooks/useGameStageState";

const POSSESSION_TOTAL_QUESTIONS_FALLBACK = 12;

export function GameStageRouter() {
  const router = useRouter();
  const {
    player,
    authUser,
    selfUserId,
    stage,
    config,
    setStage,
    resetGameSession,
    realtimeLobby,
    realtimeDraft,
    realtimeMatch,
    realtimeError,
    sessionState,
    exitCompletedMatchToLobby,
    resetRealtime,
    clearRankedMatchmaking,
    rankedSearching,
    rankedSearchDurationMs,
    rankedSearchStartedAt,
    rankedFoundOpponent,
    rankedProfile,
    socket,
    socketConnected,
    socketId,
    isMultiplayer,
    opponent,
    matchType,
    isPartyQuizMatch,
    playerGameAvatar,
    opponentGameAvatar,
    stableRankedProfile,
    stableProgression,
    clientTotalCorrect,
    clientTotalQuestions,
  } = useGameStageState();

  const returningToLobbyRef = useRef(false);

  useGameStageTransitions({
    isMultiplayer,
    stage,
    config,
    socket,
    realtimeDraft,
    realtimeMatch,
    setStage,
  });

  const showdownType = matchType === "ranked" ? "ranked" : "friendly";

  const exitToPlay = useCallback(() => {
    resetRealtime();
    clearRankedMatchmaking();
    resetGameSession();
    router.push("/play");
  }, [clearRankedMatchmaking, resetGameSession, resetRealtime, router]);

  useEffect(() => {
    const inviteCode = realtimeLobby?.inviteCode;
    if (
      stage !== "finalResults" ||
      matchType !== "friendly" ||
      !realtimeMatch?.finalResults ||
      realtimeLobby?.status !== "waiting" ||
      !inviteCode
    ) {
      return;
    }

    returningToLobbyRef.current = true;
    exitCompletedMatchToLobby();
    resetGameSession();
    router.push(`/friend/room/${inviteCode}`);
  }, [
    exitCompletedMatchToLobby,
    matchType,
    realtimeLobby?.inviteCode,
    realtimeLobby?.status,
    realtimeMatch?.finalResults,
    resetGameSession,
    router,
    stage,
  ]);

  useEffect(() => {
    if (stage === "idle" && !returningToLobbyRef.current) {
      router.replace("/play");
    }
  }, [stage, router]);

  const handleQuit = useCallback(() => {
    if (realtimeMatch?.matchId) {
      getSocket().emit("match:leave", { matchId: realtimeMatch.matchId });
      logger.info("Socket emit match:leave", { matchId: realtimeMatch.matchId });
    } else {
      logger.info("Socket emit match:leave skipped (missing matchId)");
    }
    exitToPlay();
  }, [realtimeMatch?.matchId, exitToPlay]);

  const handleForfeit = useCallback(() => {
    if (realtimeMatch?.matchId) {
      getSocket().emit("match:forfeit", { matchId: realtimeMatch.matchId });
      logger.info("Socket emit match:forfeit", { matchId: realtimeMatch.matchId });
    } else {
      logger.info("Socket emit match:forfeit skipped (missing matchId)");
    }
    exitToPlay();
  }, [realtimeMatch?.matchId, exitToPlay]);

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

  if (config?.mode === "training") {
    return <TrainingMatchScreen onComplete={exitToPlay} />;
  }

  if (stage === "idle") {
    return <LoadingScreen />;
  }

  if (isMultiplayer) {
    if (stage === "matchmaking") {
      // Friendly matches skip matchmaking — match data arrives before navigation.
      // Show bouncing ball instead of the map/searching screen for that brief transition frame.
      if (realtimeMatch) {
        return <LoadingScreen />;
      }
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
      if (isPartyQuizMatch) {
        return (
          <RealtimePartyQuizScreen
            onQuit={handleQuit}
            onForfeit={handleForfeit}
          />
        );
      }

      return (
        <RealtimePossessionMatchScreen
          playerAvatar={playerGameAvatar}
          playerUsername={player.username}
          opponentAvatar={opponentGameAvatar}
          opponentUsername={opponent.username}
          onQuit={handleQuit}
          onForfeit={handleForfeit}
        />
      );
    }

    if (stage === "finalResults") {
      const final = realtimeMatch?.finalResults;
      if (!isPartyQuizMatch && !final) {
        return <LoadingScreen />;
      }
      const unlockedAchievements = selfUserId
        ? final?.unlockedAchievements?.[selfUserId] ?? []
        : [];
      if (isPartyQuizMatch && final) {
        return (
          <PartyQuizResultsScreen
            finalResults={final}
            participants={realtimeMatch?.participants ?? []}
            selfUserId={selfUserId}
            unlockedAchievements={unlockedAchievements}
            onPlayAgain={() => {
              if (!realtimeMatch?.matchId) {
                logger.warn("Play Again clicked for friendly party quiz without an active match id");
                return;
              }
              socket.emit("match:play_again", { matchId: realtimeMatch.matchId });
              logger.info("Socket emit match:play_again", { matchId: realtimeMatch.matchId });
            }}
            onMainMenu={() => {
              exitToPlay();
            }}
          />
        );
      }

      const myStats = selfUserId && final ? final.players[selfUserId] : undefined;
      const opponentStats = selfUserId && final
        ? Object.entries(final.players).find(([userId]) => userId !== selfUserId)?.[1]
        : undefined;

      const playerDisplayScore = myStats?.goals ?? 0;
      const opponentDisplayScore = opponentStats?.goals ?? 0;
      const totalQuestionsPlayed = realtimeMatch?.currentQuestion?.total
        ?? clientTotalQuestions
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
          totalQuestions={totalQuestionsPlayed}
          selfUserId={selfUserId}
          finalWinnerId={final?.winnerId}
          winnerDecisionMethod={final?.winnerDecisionMethod ?? null}
          preMatchRp={stableRankedProfile?.placementStatus === 'placed' ? stableRankedProfile.rp : undefined}
          opponentId={opponent.id}
          opponentRp={realtimeMatch?.opponent?.rp != null ? Number(realtimeMatch.opponent.rp) : undefined}
          rankedOutcome={final?.rankedOutcome ?? null}
          preMatchRankedProfile={stableRankedProfile}
          preMatchProgression={stableProgression}
          unlockedAchievements={unlockedAchievements}
          onPlayAgain={() => {
            if (matchType === "ranked") {
              resetRealtime();
              clearRankedMatchmaking();
              setStage("matchmaking");
              return;
            }
            if (!realtimeMatch?.matchId) {
              logger.warn("Play Again clicked for friendly without an active match id");
              return;
            }
            socket.emit("match:play_again", { matchId: realtimeMatch.matchId });
            logger.info("Socket emit match:play_again", { matchId: realtimeMatch.matchId });
          }}
          onMainMenu={() => {
            exitToPlay();
          }}
        />
      );
    }
  }

  if (stage === "showdown") {
    const oppInfo = realtimeMatch?.opponent ?? rankedFoundOpponent;
    const isPlaced = rankedProfile?.placementStatus === 'placed';
    const playerRankPoints = isPlaced ? (rankedProfile?.rp ?? player.rankPoints) : undefined;
    const opponentRankPoints = parseRp(oppInfo?.rp);
    const showdownOpponentUsername = oppInfo?.username ?? opponent.username;
    const showdownOpponentAvatar = resolveAvatarUrl(
      oppInfo?.avatarUrl ?? opponent.avatar,
      "opponent",
      256
    );
    // Extract opponent country from various possible fields
    const oppGeo = oppInfo?.geo && typeof oppInfo.geo === 'object' ? oppInfo.geo : null;
    const oppCountry = oppInfo?.country ?? oppGeo?.country ?? oppGeo?.countryName ?? oppGeo?.country_name;
    const oppCountryCode = oppInfo?.countryCode ?? oppGeo?.countryCode ?? oppGeo?.country_code;
    return (
      <ShowdownScreen
        matchType={showdownType}
        playerUsername={player.username}
        playerAvatar={playerGameAvatar}
        opponentUsername={showdownOpponentUsername}
        opponentAvatar={showdownOpponentAvatar}
        onComplete={() => setStage("roundIntro")}
        playerInfo={{
          username: player.username,
          avatar: playerGameAvatar,
          rankPoints: playerRankPoints,
          level: player.level,
          tier: playerRankPoints != null ? tierFromRp(playerRankPoints) : undefined,
          country: authUser?.country ?? undefined,
          countryCode: authUser?.country ?? undefined,
          favoriteClub: authUser?.favorite_club ?? undefined,
        }}
        opponentInfo={oppInfo ? {
          username: oppInfo.username,
          avatar: showdownOpponentAvatar,
          rankPoints: opponentRankPoints,
          tier: opponentRankPoints != null ? tierFromRp(opponentRankPoints) : undefined,
          country: oppCountry,
          countryCode: oppCountryCode,
          flag: oppInfo.flag,
        } : undefined}
      />
    );
  }

  return <LoadingScreen />;
}
