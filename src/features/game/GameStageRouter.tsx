"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { MatchmakingMapScreen } from "@/components/match/MatchmakingMapScreen";
import { ShowdownScreen } from "@/components/ShowdownScreen";
import { RankedCategoryBlockingScreen } from "@/features/play/RankedCategoryBlockingScreen";
import { RealtimeResultsScreen } from "./RealtimeResultsScreen";
import { RealtimePossessionMatchScreen } from "@/features/possession/RealtimePossessionMatchScreen";
import { RealtimePartyQuizScreen } from "@/features/party/RealtimePartyQuizScreen";
import { PartyQuizResultsScreen } from "@/features/party/PartyQuizResultsScreen";
import { getSocket } from "@/lib/realtime/socket-client";
import { logger } from "@/utils/logger";
import { useGameStageTransitions } from "@/lib/match/useGameStageTransitions";
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
  const showingFinalResultsFromReplay = stage === "idle" && Boolean(realtimeMatch?.finalResults);

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
    const final = realtimeMatch?.finalResults;
    if (final) {
      socket.emit("match:final_results_ack", {
        matchId: final.matchId,
        resultVersion: final.resultVersion,
      });
      logger.info("Socket emit match:final_results_ack before exit", {
        matchId: final.matchId,
        resultVersion: final.resultVersion,
      });
    }
    resetRealtime();
    clearRankedMatchmaking();
    resetGameSession();
    router.push("/play");
  }, [clearRankedMatchmaking, realtimeMatch?.finalResults, resetGameSession, resetRealtime, router, socket]);

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
    if (stage === "idle" && !returningToLobbyRef.current && !realtimeMatch?.finalResults) {
      router.replace("/play");
    }
  }, [realtimeMatch?.finalResults, stage, router]);

  const realtimeMatchId = realtimeMatch?.matchId;
  const handleQuit = useCallback(() => {
    if (realtimeMatchId) {
      getSocket().emit("match:leave", { matchId: realtimeMatchId });
      logger.info("Socket emit match:leave", { matchId: realtimeMatchId });
    } else {
      logger.info("Socket emit match:leave skipped (missing matchId)");
    }
    exitToPlay();
  }, [realtimeMatchId, exitToPlay]);

  const handleForfeit = useCallback(() => {
    if (realtimeMatchId) {
      getSocket().emit("match:forfeit", { matchId: realtimeMatchId });
      logger.info("Socket emit match:forfeit", { matchId: realtimeMatchId });
    } else {
      logger.info("Socket emit match:forfeit skipped (missing matchId)");
    }
    resetRealtime();
    clearRankedMatchmaking();
    resetGameSession();
    router.push("/");
  }, [clearRankedMatchmaking, realtimeMatchId, resetGameSession, resetRealtime, router]);

  const handleMatchmakingExit = useCallback(() => {
    if (matchType === "ranked") {
      getSocket().emit("ranked:queue_leave");
      logger.info("Socket emit ranked:queue_leave");
      getSocket().emit("lobby:leave");
      logger.info("Socket emit lobby:leave during ranked matchmaking cleanup");
    } else {
      getSocket().emit("lobby:leave");
      logger.info("Socket emit lobby:leave");
    }
    exitToPlay();
  }, [exitToPlay, matchType]);

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
      hasMatch: Boolean(realtimeMatch.matchId),
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

  if (stage === "idle" && !showingFinalResultsFromReplay) {
    return <LoadingScreen />;
  }

  if (isMultiplayer || showingFinalResultsFromReplay) {
    if (stage === "matchmaking") {
      // Friendly matches skip matchmaking — match data arrives before navigation.
      // Show bouncing ball instead of the map/searching screen for that brief transition frame.
      if (realtimeMatch.matchId) {
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
          onCancel={handleMatchmakingExit}
          onRestart={handleMatchmakingExit}
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
            mobileStandingsPlacement="below-options"
          />
        );
      }

      // Resolve opponent country from match/matchmaking data so the halftime
      // avatars can show the flag badge (same derivation as showdown).
      const playingOppInfo = realtimeMatch?.opponent ?? rankedFoundOpponent;
      const playingOppGeo = playingOppInfo?.geo && typeof playingOppInfo.geo === 'object' ? playingOppInfo.geo : null;
      const playingOppCountryCode =
        playingOppInfo?.countryCode
        ?? playingOppInfo?.country
        ?? playingOppGeo?.countryCode
        ?? playingOppGeo?.country_code
        ?? null;

      return (
        <RealtimePossessionMatchScreen
          playerAvatar={playerGameAvatar}
          playerAvatarCustomization={authUser?.avatar_customization ?? player.avatarCustomization}
          playerUsername={player.username}
          opponentAvatar={opponentGameAvatar}
          opponentAvatarCustomization={opponent.avatarCustomization}
          opponentUsername={opponent.username}
          playerCountryCode={authUser?.country ?? null}
          opponentCountryCode={playingOppCountryCode}
          playerFavoriteClub={authUser?.favorite_club ?? null}
          onQuit={handleQuit}
          onForfeit={handleForfeit}
        />
      );
    }

    if (stage === "finalResults" || showingFinalResultsFromReplay) {
      const final = realtimeMatch?.finalResults;
      if (!isPartyQuizMatch && !final) {
        return (
          <LoadingScreen
            text={matchType === "ranked" ? "Updating rank..." : "Finalizing results..."}
          />
        );
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
            preMatchProgression={stableProgression}
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
      const opponentEntry = selfUserId && final
        ? Object.entries(final.players).find(([userId]) => userId !== selfUserId)
        : undefined;
      const opponentStats = opponentEntry?.[1];
      const finalOpponentUserId = opponentEntry?.[0] ?? opponent.id;
      const opponentParticipant = realtimeMatch?.participants?.find((participant) => participant.userId === finalOpponentUserId)
        ?? realtimeMatch?.participants?.find((participant) => participant.userId !== selfUserId);
      const opponentRankPoints = parseRp(
        realtimeMatch?.opponent?.rp
        ?? rankedFoundOpponent?.rp
        ?? opponentParticipant?.rankPoints
      );

      // Regulation goals are 0 when the match went to penalty shootout. To
      // avoid the "0:0 VICTORY" confusion, include penalty goals in the
      // displayed score whenever penalties decided it.
      const wentToPenalties = (final?.winnerDecisionMethod === 'penalty_goals')
        || (myStats?.penaltyGoals ?? 0) > 0
        || (opponentStats?.penaltyGoals ?? 0) > 0;
      const playerDisplayScore = (myStats?.goals ?? 0)
        + (wentToPenalties ? (myStats?.penaltyGoals ?? 0) : 0);
      const opponentDisplayScore = (opponentStats?.goals ?? 0)
        + (wentToPenalties ? (opponentStats?.penaltyGoals ?? 0) : 0);
      const knownQuestionCount = realtimeMatch?.questions
        ? Math.max(0, ...Object.keys(realtimeMatch.questions).map((key) => Number(key) + 1).filter(Number.isFinite))
        : 0;
      const firstPositiveQuestionCount = [
        final?.totalQuestions,
        realtimeMatch.currentQuestionTotal,
        clientTotalQuestions,
      ].find((value): value is number => typeof value === 'number' && value > 0);
      const totalQuestionsPlayed = firstPositiveQuestionCount
        ?? Math.max(knownQuestionCount, POSSESSION_TOTAL_QUESTIONS_FALLBACK);

      // Per-question dot strip: read the correctness flags captured by
      // round_result for each qIndex. `undefined` → not yet reached (renders
      // as a hollow yellow ring in the strip).
      const toResult = (v: boolean | undefined): 'correct' | 'wrong' | null =>
        v === undefined ? null : v ? 'correct' : 'wrong';
      const buildQuestionResults = (
        userId: string | undefined,
        readLocalFlag: (qIndex: number) => boolean | undefined
      ): Array<'correct' | 'wrong' | null> => {
        const finalResults = userId ? final?.questionResults?.[userId] : undefined;
        return Array.from({ length: totalQuestionsPlayed }, (_, i) => (
          finalResults?.[i] ?? toResult(readLocalFlag(i))
        ));
      };
      const playerQuestionResults = buildQuestionResults(selfUserId, (i) =>
        realtimeMatch?.questions?.[i]?.selfIsCorrect
      );
      const opponentQuestionResults = buildQuestionResults(finalOpponentUserId, (i) =>
        realtimeMatch?.questions?.[i]?.opponentIsCorrect
      );

      return (
        <RealtimeResultsScreen
          matchType={matchType}
          playerUsername={player.username}
          playerAvatar={playerGameAvatar}
          playerAvatarCustomization={authUser?.avatar_customization ?? player.avatarCustomization}
          opponentUsername={opponent.username}
          opponentAvatar={opponentGameAvatar}
          opponentAvatarCustomization={opponent.avatarCustomization}
          playerScore={playerDisplayScore}
          opponentScore={opponentDisplayScore}
          playerCorrect={myStats?.correctAnswers ?? clientTotalCorrect}
          opponentCorrect={opponentStats?.correctAnswers ?? 0}
          totalQuestions={totalQuestionsPlayed}
          playerQuestionResults={playerQuestionResults}
          opponentQuestionResults={opponentQuestionResults}
          selfUserId={selfUserId}
          finalWinnerId={final?.winnerId}
          winnerDecisionMethod={final?.winnerDecisionMethod ?? null}
          preMatchRp={stableRankedProfile?.placementStatus === 'placed' ? stableRankedProfile.rp : undefined}
          opponentId={finalOpponentUserId}
          opponentRankPoints={opponentRankPoints ?? null}
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
            if (!realtimeMatch.matchId) {
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
      oppInfo?.avatarUrl ?? opponent.avatar);
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
          avatarCustomization: authUser?.avatar_customization ?? player.avatarCustomization,
          rankPoints: playerRankPoints,
          level: player.level,
          tier: playerRankPoints != null ? tierFromRp(playerRankPoints) : undefined,
          country: authUser?.country ?? undefined,
          countryCode: authUser?.country ?? undefined,
          favoriteClub: authUser?.favorite_club ?? null,
          recentForm: realtimeMatch?.myRecentForm,
        }}
        opponentInfo={oppInfo ? {
          username: oppInfo.username,
          avatar: showdownOpponentAvatar,
          avatarCustomization: oppInfo.avatarCustomization,
          rankPoints: opponentRankPoints,
          tier: opponentRankPoints != null ? tierFromRp(opponentRankPoints) : undefined,
          country: oppCountry,
          countryCode: oppCountryCode,
          flag: oppInfo.flag,
          favoriteClub: oppInfo.favoriteClub ?? null,
          recentForm: oppInfo.recentForm,
        } : undefined}
      />
    );
  }

  return <LoadingScreen />;
}
