"use client";

import { CheckCircle2, Loader2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { LobbyHeader } from "./LobbyHeader";
import { LobbySettings } from "./LobbySettings";
import { useFriendLobbyLogic } from "../hooks/useFriendLobbyLogic";
import { AlreadyInLobbyModal } from "./AlreadyInLobbyModal";

interface FriendLobbyScreenProps {
  roomCode: string;
  isHost: boolean;
}

export function FriendLobbyScreen({ roomCode, isHost }: FriendLobbyScreenProps) {
  const {
    lobby,
    members,
    lobbyCode,
    me,
    h2hSummary,
    allCategories,
    settingsErrorVersion,
    isStartingMatch,
    actions
  } = useFriendLobbyLogic({ roomCode, isHost });

  const settings = lobby?.settings;
  const isCurrentHost = Boolean(me?.isHost) || isHost;
  const allReady = members.length > 0 && members.every((member) => member.isReady);
  const isPartyMode = settings?.gameMode === "friendly_party_quiz" || members.length > 2;
  const hasFriendlyCategories =
    settings?.friendlyRandom ||
    Boolean(settings?.friendlyCategoryAId);
  const readyCopy =
    settings?.gameMode === "ranked_sim"
      ? "When both players are ready, ranked sim begins automatically."
      : isPartyMode
        ? "When everyone is ready, the host can start the party quiz."
        : "When both players are ready, the host can start the match.";
  const canStartMatch =
    Boolean(
      isCurrentHost &&
        allReady &&
        lobby?.status === "waiting" &&
        (settings?.gameMode === "friendly_possession" || settings?.gameMode === "friendly_party_quiz") &&
        hasFriendlyCategories &&
        !isStartingMatch
    );
  const startLabel = isPartyMode ? "Start Party Quiz" : "Start Match";
  const statusCopy = allReady
    ? isPartyMode
      ? "Everyone is ready."
      : "Both players ready."
    : members.length <= 1
      ? "Waiting for more players..."
      : isPartyMode
        ? "Waiting for everyone to ready up..."
        : "Waiting for both players to ready up...";

  return (
    <div className="container mx-auto max-w-5xl py-6 animate-in fade-in space-y-6 font-fun">

      {/* Header with H2H */}
      <LobbyHeader
        lobbyName={lobby?.displayName}
        lobbyCode={lobbyCode}
        me={me}
        members={members}
        h2hSummary={h2hSummary}
      />

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
          <div className="bg-surface-card rounded-2xl border-b-4 border-surface-card-deep sticky top-4">
            <div className="px-5 py-4 border-b-[3px] border-surface-card-deep">
              <h2 className="text-lg font-black text-white">Ready Check</h2>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm font-bold text-brand-slate">
                {readyCopy}
              </p>

              {/* Mark Ready */}
              <button
                onClick={actions.handleReadyToggle}
                disabled={!lobby}
                className={cn(
                  "w-full py-4 rounded-2xl border-b-4 text-base font-black uppercase tracking-wide active:translate-y-[2px] active:border-b-2 transition-all",
                  me?.isReady
                    ? "bg-surface-card-tint border-surface-card text-brand-slate hover:bg-[#2D4A55]"
                    : "bg-brand-green-light border-brand-green text-white hover:bg-brand-green shadow-[0_0_20px_rgba(88,204,2,0.4),0_0_40px_rgba(88,204,2,0.15)]"
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
              {(settings?.gameMode === "friendly_possession" || settings?.gameMode === "friendly_party_quiz") && (
                <button
                  onClick={actions.handleStartMatch}
                  disabled={!canStartMatch}
                  className={cn(
                    "w-full py-3.5 rounded-2xl border-b-4 text-sm font-black uppercase tracking-wide transition-all",
                    canStartMatch
                      ? "bg-brand-cyan border-brand-cyan-deep text-white hover:bg-brand-cyan active:translate-y-[2px] active:border-b-2"
                      : "bg-surface-card-tint border-surface-card text-brand-slate/50 cursor-not-allowed",
                    isStartingMatch && "cursor-wait bg-brand-cyan-deep border-brand-cyan-deep"
                  )}
                >
                  {isStartingMatch ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Starting Match...
                    </span>
                  ) : (
                    startLabel
                  )}
                </button>
              )}

              {isStartingMatch && (
                <div className="bg-surface-deep rounded-xl border-b-[3px] border-surface-card-deep py-2 px-3 text-center animate-pulse">
                  <span className="text-[11px] font-black uppercase tracking-wider text-brand-cyan">
                    Preparing match...
                  </span>
                </div>
              )}

              {/* Leave Lobby */}
              <button
                onClick={actions.handleLeaveLobby}
                disabled={!lobby}
                className="w-full py-3.5 rounded-2xl bg-surface-card border-b-4 border-surface-card-deep text-sm font-black text-brand-red-soft uppercase tracking-wide hover:bg-brand-red-soft hover:text-white hover:border-brand-red-deep active:translate-y-[2px] active:border-b-2 transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="size-4" />
                Leave Lobby
              </button>

              {/* Status */}
              <div className="bg-surface-deep rounded-xl border-b-[3px] border-surface-card-deep py-2.5 px-3 text-center">
                <span className={cn(
                  "text-xs font-black uppercase tracking-wider",
                  allReady ? "text-brand-green-light" : "text-brand-slate"
                )}>
                  {statusCopy}
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
