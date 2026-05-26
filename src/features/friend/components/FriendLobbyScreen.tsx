"use client";

import { CheckCircle2, Loader2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { LobbyHeader } from "./LobbyHeader";
import { LobbySettings } from "./LobbySettings";
import { useFriendLobbyLogic } from "../hooks/useFriendLobbyLogic";
import { AlreadyInLobbyModal } from "./AlreadyInLobbyModal";
import { useLocale } from "@/contexts/LocaleContext";

interface FriendLobbyScreenProps {
  roomCode: string;
  isHost: boolean;
}

export function FriendLobbyScreen({ roomCode, isHost }: FriendLobbyScreenProps) {
  const { t } = useLocale();
  const {
    lobby,
    members,
    lobbyCode,
    me,
    h2hSummary,
    allCategories,
    settingsErrorVersion,
    isStartingMatch,
    optimisticReady,
    actions
  } = useFriendLobbyLogic({ roomCode, isHost });
  const displayedReady = optimisticReady ?? me?.isReady ?? false;
  // Host has local `isStartingMatch`; non-host members infer "preparing"
  // from the broadcast lobby status flipping to "active" (server emits this
  // right after creating the match, before the match-start countdown fires).
  const matchIsStarting = isStartingMatch || lobby?.status === "active";

  const settings = lobby?.settings;
  const isCurrentHost = Boolean(me?.isHost) || isHost;
  const allReady = members.length > 0 && members.every((member) => member.isReady);
  const isPartyMode = settings?.gameMode === "friendly_party_quiz" || members.length > 2;
  const hasFriendlyCategories =
    settings?.friendlyRandom ||
    Boolean(settings?.friendlyCategoryAId);
  const readyCopy =
    settings?.gameMode === "ranked_sim"
      ? t("friend.readyCopyRanked")
      : isPartyMode
        ? t("friend.readyCopyParty")
        : t("friend.readyCopyClassic");
  const canStartMatch =
    Boolean(
      isCurrentHost &&
        allReady &&
        lobby?.status === "waiting" &&
        (settings?.gameMode === "friendly_possession" || settings?.gameMode === "friendly_party_quiz") &&
        hasFriendlyCategories &&
        !isStartingMatch
    );
  const startLabel = isPartyMode ? t("friend.startPartyQuiz") : t("friend.startMatch");
  const statusCopy = allReady
    ? isPartyMode
      ? t("friend.everyoneReady")
      : t("friend.bothPlayersReady")
    : members.length <= 1
      ? t("friend.waitingMorePlayers")
      : isPartyMode
        ? t("friend.waitingEveryoneReady")
        : t("friend.waitingBothReady");

  const poppins = "'Poppins', sans-serif";

  return (
    <div className="container mx-auto max-w-5xl py-6 animate-in fade-in space-y-6">

      <LobbyHeader
        lobbyName={lobby?.displayName}
        lobbyCode={lobbyCode}
        me={me}
        members={members}
        h2hSummary={h2hSummary}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LobbySettings
            isHost={isCurrentHost}
            lobby={lobby}
            categories={allCategories}
            onUpdateSettings={actions.handleUpdateSettings}
            settingsErrorVersion={settingsErrorVersion}
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-[20px]">
            <div className="px-1 pb-1">
              <h2
                className="text-white uppercase"
                style={{ fontFamily: poppins, fontWeight: 600, fontSize: 16, letterSpacing: '0.04em' }}
              >
                {t("friend.readyCheck")}
              </h2>
            </div>
            <div
              className="rounded-[20px] p-5 space-y-4 lg:mt-6"
              style={{
                background: 'linear-gradient(180deg, #1645FF 35%, #1a35a1 100%)',
              }}
            >
              <p
                className="text-white/70"
                style={{ fontFamily: poppins, fontWeight: 500, fontSize: 13, lineHeight: 1.4 }}
              >
                {readyCopy}
              </p>

              <button
                onClick={actions.handleReadyToggle}
                disabled={!lobby}
                className={cn(
                  "w-full min-h-14 rounded-[20px] uppercase transition-colors flex items-center justify-center gap-3 py-3 px-4 disabled:opacity-60 active:scale-[0.98]",
                  displayedReady
                    ? "bg-black/30 text-white/70 hover:bg-black/40"
                    : "bg-surface-page text-white hover:bg-surface-page/90"
                )}
                style={{
                  fontFamily: poppins,
                  fontWeight: 600,
                  fontSize: 15,
                  letterSpacing: '0.04em',
                }}
              >
                <CheckCircle2
                  className={cn(
                    "size-7 shrink-0",
                    displayedReady ? "text-brand-green-light" : "text-brand-yellow"
                  )}
                  strokeWidth={displayedReady ? 2 : 2.5}
                />
                <span className="text-center leading-tight">
                  {displayedReady ? t("friend.readyTapToUnready") : t("friend.markReady")}
                </span>
              </button>

              {(settings?.gameMode === "friendly_possession" || settings?.gameMode === "friendly_party_quiz") && (
                <button
                  onClick={actions.handleStartMatch}
                  disabled={!canStartMatch}
                  className={cn(
                    "w-full h-14 rounded-[20px] uppercase transition-all flex items-center justify-center gap-2 active:scale-[0.98]",
                    canStartMatch
                      ? "bg-brand-green text-white hover:bg-brand-green-deep"
                      : "bg-black/20 text-white/35 cursor-not-allowed",
                    isStartingMatch && "cursor-wait opacity-90"
                  )}
                  style={{
                    fontFamily: poppins,
                    fontWeight: 600,
                    fontSize: 14,
                    letterSpacing: '0.04em',
                  }}
                >
                  {isStartingMatch ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t("friend.startingMatch")}
                    </>
                  ) : (
                    startLabel
                  )}
                </button>
              )}

              {matchIsStarting && (
                <div className="bg-black/30 rounded-[14px] py-2 px-3 text-center animate-pulse flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin text-brand-yellow" />
                  <span
                    className="text-brand-yellow uppercase"
                    style={{ fontFamily: poppins, fontWeight: 600, fontSize: 11, letterSpacing: '0.1em' }}
                  >
                    {t("friend.preparingMatchSpinner")}
                  </span>
                </div>
              )}

              <button
                onClick={actions.handleLeaveLobby}
                disabled={!lobby}
                className="w-full h-12 rounded-[20px] bg-brand-red text-white uppercase transition-all hover:bg-brand-red/90 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                style={{ fontFamily: poppins, fontWeight: 600, fontSize: 13, letterSpacing: '0.04em' }}
              >
                <LogOut className="size-4" />
                {t("friend.leaveLobby")}
              </button>

              <div className="py-1 text-center">
                <span
                  className={cn(
                    "uppercase",
                    allReady ? "text-brand-green-light" : "text-white/60"
                  )}
                  style={{ fontFamily: poppins, fontWeight: 600, fontSize: 11, letterSpacing: '0.1em' }}
                >
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
