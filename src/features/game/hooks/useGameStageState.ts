"use client";

import { useEffect, useMemo, useState } from "react";
import { useGameSessionStore } from "@/stores/gameSession.store";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthStore } from "@/stores/auth.store";
import { useRealtimeConnection } from "@/lib/realtime/useRealtimeConnection";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useRankedMatchmakingStore } from "@/stores/rankedMatchmaking.store";
import { resolveAvatarUrl } from "@/lib/avatars";
import { useRankedProfile } from "@/lib/queries/ranked.queries";
import type { RankedProfileResponse } from "@/lib/repositories/ranked.repo";
import { usePossessionMatchStore } from "@/stores/possessionMatch.store";
import { tierFromRp } from "@/utils/rankedTier";
import type { UserProgression } from "@/lib/domain";

type OpponentInfo = {
  id: string;
  username: string;
  avatar: string;
  tier?: string;
};

export function useGameStageState() {
  const { player } = usePlayer();
  const stage = useGameSessionStore((state) => state.stage);
  const config = useGameSessionStore((state) => state.config);
  const setStage = useGameSessionStore((state) => state.setStage);
  const resetGameSession = useGameSessionStore((state) => state.reset);
  const authUser = useAuthStore((state) => state.user);
  const realtimeLobby = useRealtimeMatchStore((state) => state.lobby);
  const realtimeDraft = useRealtimeMatchStore((state) => state.draft);
  const realtimeMatch = useRealtimeMatchStore((state) => state.match);
  const realtimeError = useRealtimeMatchStore((state) => state.error);
  const sessionState = useRealtimeMatchStore((state) => state.sessionState);
  const connectedSelfUserId = useRealtimeMatchStore((state) => state.selfUserId);
  const rankedSearching = useRankedMatchmakingStore((state) => state.rankedSearching);
  const rankedSearchDurationMs = useRankedMatchmakingStore((state) => state.rankedSearchDurationMs);
  const rankedSearchStartedAt = useRankedMatchmakingStore((state) => state.rankedSearchStartedAt);
  const rankedFoundOpponent = useRankedMatchmakingStore((state) => state.rankedFoundOpponent);
  const exitCompletedMatchToLobby = useRealtimeMatchStore((state) => state.exitCompletedMatchToLobby);
  const resetRealtime = useRealtimeMatchStore((state) => state.reset);
  const clearRankedMatchmaking = useRankedMatchmakingStore((state) => state.clearRankedMatchmaking);

  const { data: rankedProfile } = useRankedProfile();
  const clientTotalCorrect = usePossessionMatchStore((s) => s.totalCorrect);
  const clientTotalQuestions = usePossessionMatchStore((s) => s.totalQuestions);

  const defaultOpponent = useMemo<OpponentInfo>(
    () => ({
      id: "opponent",
      username: "TriviaKing",
      avatar: "👑",
      tier: tierFromRp(0),
    }),
    [],
  );

  const [rankedProfileSnapshot, setRankedProfileSnapshot] = useState<{
    matchId: string;
    profile: RankedProfileResponse;
  } | null>(null);
  const [progressionSnapshot, setProgressionSnapshot] = useState<{
    matchId: string;
    progression: UserProgression;
  } | null>(null);

  const isMultiplayer = config?.mode !== "solo" && !!config;
  const selfUserId = connectedSelfUserId ?? authUser?.id ?? player.id;
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
  const matchVariant = realtimeMatch?.variant ?? null;
  const activeRankedMatchId = matchType === "ranked" ? realtimeMatch?.matchId ?? null : null;
  const isPartyQuizMatch = matchVariant === "friendly_party_quiz";
  const activeMatchId = realtimeMatch?.matchId ?? null;

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

  const stableRankedProfile = rankedProfileSnapshot?.matchId === activeRankedMatchId
    ? rankedProfileSnapshot.profile
    : rankedProfile ?? null;
  const stableProgression = progressionSnapshot?.matchId === activeMatchId
    ? progressionSnapshot.progression
    : authUser?.progression ?? null;

  useEffect(() => {
    if (!activeRankedMatchId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRankedProfileSnapshot(null);
      return;
    }
    if (!rankedProfile) return;

    setRankedProfileSnapshot((current) => {
      if (current?.matchId === activeRankedMatchId) {
        return current;
      }
      return {
        matchId: activeRankedMatchId,
        profile: { ...rankedProfile },
      };
    });
  }, [activeRankedMatchId, rankedProfile]);

  useEffect(() => {
    if (!activeMatchId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgressionSnapshot(null);
      return;
    }
    if (!authUser?.progression) return;

    setProgressionSnapshot((current) => {
      if (current?.matchId === activeMatchId) {
        return current;
      }
      return {
        matchId: activeMatchId,
        progression: { ...authUser.progression },
      };
    });
  }, [activeMatchId, authUser?.progression]);

  return {
    // Player
    player,
    authUser,
    selfUserId,

    // Game session
    stage,
    config,
    setStage,
    resetGameSession,

    // Realtime state
    realtimeLobby,
    realtimeDraft,
    realtimeMatch,
    realtimeError,
    sessionState,
    exitCompletedMatchToLobby,
    resetRealtime,
    clearRankedMatchmaking,

    // Ranked matchmaking
    rankedSearching,
    rankedSearchDurationMs,
    rankedSearchStartedAt,
    rankedFoundOpponent,
    rankedProfile,

    // Socket
    socket,
    socketConnected,
    socketId,
    isMultiplayer,

    // Derived
    opponent,
    matchType,
    matchVariant,
    isPartyQuizMatch,
    playerGameAvatar,
    opponentGameAvatar,
    stableRankedProfile,
    stableProgression,

    // Possession
    clientTotalCorrect,
    clientTotalQuestions,
  };
}
