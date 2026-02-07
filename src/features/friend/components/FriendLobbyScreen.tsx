"use client";

import { CheckCircle2, Loader2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { LobbyHeader } from "./LobbyHeader";
import { LobbySettings } from "./LobbySettings";
import { WarmupGame } from "./WarmupGame";
import { useFriendLobbyLogic } from "../hooks/useFriendLobbyLogic";
import { AlreadyInLobbyModal } from "./AlreadyInLobbyModal";

interface FriendLobbyScreenProps {
  roomCode: string;
  isHost: boolean;
}

export function FriendLobbyScreen({ roomCode, isHost }: FriendLobbyScreenProps) {
  const {
    lobby,
    lobbyCode,
    me,
    opponent,
    h2hSummary,
    allCategories,
    settingsErrorVersion,
    isStartingMatch,
    actions
  } = useFriendLobbyLogic({ roomCode, isHost });

  const settings = lobby?.settings;
  const isCurrentHost = Boolean(me?.isHost) || isHost;
  const bothReady = Boolean(me?.isReady && opponent?.isReady);
  const hasFriendlyCategories =
    settings?.friendlyRandom ||
    (settings?.friendlyCategoryAId &&
      settings?.friendlyCategoryBId &&
      settings?.friendlyCategoryAId !== settings?.friendlyCategoryBId);
  const readyCopy =
    settings?.gameMode === "friendly"
      ? "When both players are ready, the host can start the match."
      : "When both players are ready, the match will begin.";
  const canStartMatch =
    Boolean(
      isCurrentHost &&
        bothReady &&
        lobby?.status === "waiting" &&
        settings?.gameMode === "friendly" &&
        hasFriendlyCategories &&
        !isStartingMatch
    );

  return (
    <div className="container mx-auto max-w-5xl py-6 animate-in fade-in space-y-6 font-fun">

      {/* Header with H2H */}
      <LobbyHeader
        lobbyName={lobby?.displayName}
        lobbyCode={lobbyCode}
        me={me}
        opponent={opponent}
        h2hSummary={h2hSummary}
      />

      {/* Warm-Up Game (when both players are in the lobby) */}
      {lobby?.status === "waiting" && lobby.members.length === 2 && (
        <WarmupGame />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel (Host Controls) */}
        <div className="lg:col-span-2 space-y-6">
          <LobbySettings
            isHost={isCurrentHost}
            lobby={lobby}
            categories={allCategories}
            onUpdateSettings={actions.handleUpdateSettings}
            settingsErrorVersion={settingsErrorVersion}
          />
        </div>

        {/* Ready / Status Panel */}
        <div className="space-y-6">
          <div className="bg-[#1B2F36] rounded-2xl border-b-4 border-[#0D1B21] sticky top-4">
            <div className="px-5 py-4 border-b-[3px] border-[#0D1B21]">
              <h2 className="text-lg font-black text-white">Ready Check</h2>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm font-bold text-[#56707A]">
                {readyCopy}
              </p>

              {/* Mark Ready */}
              <button
                onClick={actions.handleReadyToggle}
                disabled={!lobby}
                className={cn(
                  "w-full py-4 rounded-2xl border-b-4 text-base font-black uppercase tracking-wide active:translate-y-[2px] active:border-b-2 transition-all",
                  me?.isReady
                    ? "bg-[#243B44] border-[#1B2F36] text-[#56707A] hover:bg-[#2D4A55]"
                    : "bg-[#58CC02] border-[#46A302] text-white hover:bg-[#4CB801] shadow-[0_0_20px_rgba(88,204,2,0.4),0_0_40px_rgba(88,204,2,0.15)]"
                )}
              >
                {me?.isReady ? (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="size-5" /> Ready (Tap to unready)
                  </span>
                ) : (
                  "Mark Ready"
                )}
              </button>

              {/* Start Match */}
              {settings?.gameMode === "friendly" && (
                <button
                  onClick={actions.handleStartMatch}
                  disabled={!canStartMatch}
                  className={cn(
                    "w-full py-3.5 rounded-2xl border-b-4 text-sm font-black uppercase tracking-wide transition-all",
                    canStartMatch
                      ? "bg-[#1CB0F6] border-[#1899D6] text-white hover:bg-[#18A0E0] active:translate-y-[2px] active:border-b-2"
                      : "bg-[#243B44] border-[#1B2F36] text-[#56707A]/50 cursor-not-allowed",
                    isStartingMatch && "cursor-wait bg-[#1899D6] border-[#127FB3]"
                  )}
                >
                  {isStartingMatch ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Starting Match...
                    </span>
                  ) : (
                    "Start Match"
                  )}
                </button>
              )}

              {isStartingMatch && (
                <div className="bg-[#131F24] rounded-xl border-b-[3px] border-[#0D1B21] py-2 px-3 text-center animate-pulse">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#1CB0F6]">
                    Preparing match...
                  </span>
                </div>
              )}

              {/* Leave Lobby */}
              <button
                onClick={actions.handleLeaveLobby}
                disabled={!lobby}
                className="w-full py-3.5 rounded-2xl bg-[#1B2F36] border-b-4 border-[#0D1B21] text-sm font-black text-[#FF4B4B] uppercase tracking-wide hover:bg-[#FF4B4B] hover:text-white hover:border-[#E04242] active:translate-y-[2px] active:border-b-2 transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="size-4" />
                Leave Lobby
              </button>

              {/* Status */}
              <div className="bg-[#131F24] rounded-xl border-b-[3px] border-[#0D1B21] py-2.5 px-3 text-center">
                <span className={cn(
                  "text-xs font-black uppercase tracking-wider",
                  bothReady ? "text-[#58CC02]" : "text-[#56707A]"
                )}>
                  {bothReady ? "Both players ready!" : opponent ? "Waiting for both players to ready up..." : "Waiting for opponent..."}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlreadyInLobbyModal
        currentLobbyCode={lobby?.inviteCode ?? null}
      />
    </div>
  );
}
