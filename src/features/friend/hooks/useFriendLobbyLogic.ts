import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRealtimeConnection } from "@/lib/realtime/useRealtimeConnection";
import { getSocket } from "@/lib/realtime/socket-client";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthStore } from "@/stores/auth.store";
import { useGameSessionStore } from "@/stores/gameSession.store";
import { logger } from "@/utils/logger";
import type { LobbySettings as LobbySettingsState } from "@/lib/realtime/socket.types";
import { useCategoriesList } from "@/lib/queries/categories.queries";
import { copyToClipboard } from "@/utils/clipboard";
import { useHeadToHead } from "@/lib/queries/stats.queries";

interface UseFriendLobbyLogicProps {
  roomCode: string;
  isHost: boolean;
}

export function useFriendLobbyLogic({ roomCode, isHost }: UseFriendLobbyLogicProps) {
  const router = useRouter();
  const { player } = usePlayer();
  const authUser = useAuthStore((state) => state.user);
  const selfUserId = authUser?.id ?? player.id;

  // Stores
  const lobby = useRealtimeMatchStore((state) => state.lobby);
  const draft = useRealtimeMatchStore((state) => state.draft);
  const match = useRealtimeMatchStore((state) => state.match);
  const error = useRealtimeMatchStore((state) => state.error);
  const clearError = useRealtimeMatchStore((state) => state.clearError);
  const startSession = useGameSessionStore((state) => state.startSession);

  // Queries
  const { data: categoriesData } = useCategoriesList({ limit: 100, is_active: "true" });
  const allCategories = categoriesData?.items ?? [];

  // Connection
  useRealtimeConnection({ enabled: true, selfUserId });

  const startedRef = useRef(false);
  const createdRef = useRef(false);

  const lobbyCode = lobby?.inviteCode ?? (roomCode === "new" ? "" : roomCode);
  const members = lobby?.members ?? [];
  const me = members.find((member) => member.userId === selfUserId);
  const opponent = members.find((member) => member.userId !== selfUserId);

  const { data: h2hSummary } = useHeadToHead(
    me?.userId ?? selfUserId,
    opponent?.userId
  );

  // 1. Reset local guards after leaving a lobby/match
  useEffect(() => {
    if (lobby || draft || match) return;
    startedRef.current = false;
    createdRef.current = false;
  }, [lobby, draft, match]);

  // 2. Socket Initialization
  useEffect(() => {
    if (createdRef.current) return;
    const socket = getSocket();
    const targetCode = roomCode === "new" ? null : roomCode.toUpperCase();
    const currentCode = lobby?.inviteCode?.toUpperCase() ?? null;

    if (isHost) {
      createdRef.current = true;
      socket.emit("lobby:create", { mode: "friendly" });
      logger.info("Socket emit lobby:create", { mode: "friendly" });
      return;
    }

    if (!roomCode || roomCode === "new") return;
    if (currentCode && currentCode === targetCode) return;

    createdRef.current = true;
    socket.emit("lobby:join_by_code", { inviteCode: roomCode });
    logger.info("Socket emit lobby:join_by_code", {
      inviteCode: `${roomCode.slice(0, 2)}***`,
    });
  }, [isHost, roomCode, lobby?.inviteCode, lobby]);

  // 3. Navigation & Session Logic
  useEffect(() => {
    if (!lobby || startedRef.current) return;
    startedRef.current = true;
    // Derive questionCount from lobby settings, fallback to 10 if missing or invalid
    const settingsCount = (lobby.settings as unknown as Record<string, unknown>)?.questionCount;
    const derivedCount =
      typeof settingsCount === "number" && settingsCount > 0 ? settingsCount : 10;
    startSession({ mode: "quizball", matchType: "friendly", questionCount: derivedCount });
  }, [lobby, startSession]);

  useEffect(() => {
    if (!lobby) return;
    logger.info("Lobby state in UI", {
      lobbyId: lobby.lobbyId,
      inviteCode: lobby.inviteCode ?? null,
      selfUserId,
      isHost,
    });
  }, [lobby?.lobbyId, lobby?.inviteCode, selfUserId, isHost, lobby]);

  useEffect(() => {
    if (!draft && !match) return;
    router.push("/game");
  }, [draft, match, router]);

  useEffect(() => {
    if (!error) return;
    toast.error(error.message);
    clearError();
  }, [error, clearError]);

  // 3. Actions
  const copyCode = async () => {
    if (!lobbyCode) return;
    const success = await copyToClipboard(lobbyCode);
    if (success) toast.success("Room Code copied!");
  };

  const handleReadyToggle = () => {
    if (!me) return;
    getSocket().emit("lobby:ready", { ready: !me.isReady });
    logger.info("Socket emit lobby:ready", { ready: !me.isReady });
  };

  const handleUpdateSettings = (updates: Partial<LobbySettingsState>) => {
    if (!lobby) return;
    const nextSettings = {
      ...lobby.settings,
      ...updates,
    };
    getSocket().emit("lobby:update_settings", {
      gameMode: nextSettings.gameMode,
      friendlyRandom: nextSettings.friendlyRandom,
      friendlyCategoryAId: nextSettings.friendlyCategoryAId,
      friendlyCategoryBId: nextSettings.friendlyCategoryBId,
    });
    logger.info("Socket emit lobby:update_settings", nextSettings);
  };

  const handleStartMatch = () => {
    getSocket().emit("lobby:start");
    logger.info("Socket emit lobby:start");
  };

  const handleLeaveLobby = () => {
    getSocket().emit("lobby:leave");
    useRealtimeMatchStore.getState().reset();
    logger.info("Socket emit lobby:leave");
  };

  return {
    lobby,
    lobbyCode,
    me,
    opponent,
    h2hSummary: opponent ? h2hSummary ?? null : null,
    allCategories,
    actions: {
      copyCode,
      handleReadyToggle,
      handleUpdateSettings,
      handleStartMatch,
      handleLeaveLobby,
    },
  };
}
