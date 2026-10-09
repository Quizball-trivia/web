"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEnsureGuestPrincipal } from "@/lib/realtime/realtime-principal";
import { CheckCircle2, Loader2, LogOut, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { LobbyHeader } from "./LobbyHeader";
import { LobbySettings } from "./LobbySettings";
import { type FriendLobbyInviteSource, useFriendLobbyLogic } from "../hooks/useFriendLobbyLogic";
import { AlreadyInLobbyModal } from "./AlreadyInLobbyModal";
import { InviteFailureScreen } from "./InviteFailureScreen";
import { useLocale } from "@/contexts/LocaleContext";
import type { DuelGameId, LobbySeenGame, RoomGameId } from "@/lib/realtime/socket.types";
import { canHostStart, lobbyModeCapabilities, settingsChoiceKey } from "@/lib/lobby/lobbyModes";
import { toast } from "sonner";

type ShownGame = { lobbyId: string | null; choiceKey: string; game: LobbySeenGame };
/** Longer than the server may itself wait for the room's lock (3.5 s) before it applies a change. */
const SETTINGS_CONFIRM_TIMEOUT_MS = 6_000;

interface FriendLobbyScreenProps {
  roomCode: string;
  isHost: boolean;
  inviteSource?: FriendLobbyInviteSource;
  /** `/friend/room/new?duel=<game>`: open the new room as a duel of that game. */
  newRoomDuelGame?: DuelGameId | null;
  /** `/friend/room/new?room=<game>`: open the new room as that room game. */
  newRoomRoomGame?: RoomGameId | null;
  /** `/friend/room/new?game=auction|football_grid`: open the new room in that game. */
  newRoomGameMode?: "auction" | "football_grid" | null;
}

export function FriendLobbyScreen({ roomCode, isHost, inviteSource, newRoomDuelGame, newRoomRoomGame, newRoomGameMode }: FriendLobbyScreenProps) {
  const { t, locale } = useLocale();
  useEnsureGuestPrincipal(locale);
  const {
    lobby,
    isAuctionLobby,
    isFootballGridLobby,
    isDuelLobby,
    isSittingOutRoomGame,
    members,
    lobbyCode,
    isResolvingInvite,
    isPreparingMatch,
    roomHandoffStalled,
    inviteJoinFailure,
    targetInviteCode,
    me,
    h2hSummary,
    allCategories,
    settingsErrorVersion,
    isStartingMatch,
    isLeaving,
    optimisticReady,
    actions
  } = useFriendLobbyLogic({ roomCode, isHost, inviteSource, newRoomDuelGame, newRoomRoomGame, newRoomGameMode });
  const displayedReady = optimisticReady ?? me?.isReady ?? false;
  const lobbyId = lobby?.lobbyId ?? null;
  const serverChoiceKey = settingsChoiceKey(lobby?.settings);
  // A game change the server never answered counts as refused: it bumps this, which rolls the settings screen back.
  const [abandonedVersion, setAbandonedVersion] = useState(0);
  const rollbackVersion = settingsErrorVersion + abandonedVersion;
  // What the settings screen shows and whether it still has changes on their way (see LobbySettings).
  const [shownGame, setShownGame] = useState<ShownGame | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  // The same two for the click handlers: a click right behind a change must see it before the next render does.
  const shownGameRef = useRef<ShownGame | null>(null);
  const settingsBusyRef = useRef(false);
  const handleGameShown = useCallback((shown: ShownGame | null) => {
    shownGameRef.current = shown;
    setShownGame((current) => (current?.lobbyId === shown?.lobbyId && current?.choiceKey === shown?.choiceKey ? current : shown));
    // The settings screen went away (the match is being prepared): that confirms nothing.
    if (shown === null) setReadyHeld(null);
  }, []);
  // What Ready and Start tell the server they were pressed on: the game on this screen, in this room.
  const seenNow = () => (shownGameRef.current?.lobbyId === lobbyId ? shownGameRef.current.game : null);
  const handleSettingsBusy = useCallback((busy: boolean) => {
    settingsBusyRef.current = busy;
    setSettingsBusy(busy);
  }, []);
  // The screen shows a game the server does not hold (yet): a Ready or a Start now would be for the other game.
  const gameUnconfirmed = (shown: ShownGame | null) => shown !== null && shown.lobbyId === lobbyId && shown.choiceKey !== serverChoiceKey;
  const unconfirmedGame = gameUnconfirmed(shownGame) ? shownGame!.choiceKey : null;
  const holding = unconfirmedGame !== null || settingsBusy;
  const isHolding = () => gameUnconfirmed(shownGameRef.current) || settingsBusyRef.current;
  useEffect(() => {
    if (unconfirmedGame === null) return;
    const timer = setTimeout(() => {
      shownGameRef.current = null;
      setShownGame(null);
      setAbandonedVersion((version) => version + 1);
      toast.error(t("friend.toastLobbyError"));
    }, SETTINGS_CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [lobbyId, serverChoiceKey, t, unconfirmedGame]);

  // A Ready pressed meanwhile is held, and sent as "ready" for the game it was pressed on once the screen and the
  // server agree. It is dropped when the change is (refused or abandoned), when another game is chosen after it, or
  // when the room it was pressed in is no longer there to ready in.
  const [readyHeld, setReadyHeld] = useState<{ lobbyId: string; rollbackVersion: number; shown: ShownGame | null } | null>(null);
  const heldValid = Boolean(
    readyHeld && lobby && me && readyHeld.lobbyId === lobby.lobbyId && readyHeld.rollbackVersion === rollbackVersion
      && (readyHeld.shown?.choiceKey ?? null) === (shownGame?.lobbyId === lobbyId ? shownGame.choiceKey : null)
      && lobby.status === "waiting" && !displayedReady && !isSittingOutRoomGame && !isPreparingMatch && !isStartingMatch
  );
  const sentHeldRef = useRef<object | null>(null);
  const handleSetReady = actions.handleSetReady;
  useEffect(() => {
    if (!readyHeld || (heldValid && holding)) return;
    if (heldValid && sentHeldRef.current !== readyHeld) {
      sentHeldRef.current = readyHeld;
      handleSetReady(true, readyHeld.shown?.game);
    }
    const timer = setTimeout(() => setReadyHeld((held) => (held === readyHeld ? null : held)), 0);
    return () => clearTimeout(timer);
    // handleSetReady is the one of the render that found the wait over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyHeld, heldValid, holding]);
  const handleReadyClick = () => {
    if (heldValid) setReadyHeld(null);
    else if (lobby && !displayedReady && isHolding()) {
      const shown = shownGameRef.current?.lobbyId === lobbyId ? shownGameRef.current : null;
      setReadyHeld({ lobbyId: lobby.lobbyId, rollbackVersion, shown });
    }
    else actions.handleReadyToggle(seenNow());
  };
  const handleStartClick = () => {
    if (!isHolding()) actions.handleStartMatch(seenNow());
  };
  // Host has local `isStartingMatch`; non-host members infer "preparing"
  // from the broadcast lobby status flipping to "active" (server emits this
  // right after creating the match, before the match-start countdown fires).
  const matchIsStarting = isStartingMatch || (lobby?.status === "active" && !isSittingOutRoomGame);

  const settings = lobby?.settings;
  const modeCaps = lobbyModeCapabilities(settings?.gameMode);
  const isCurrentHost = Boolean(me?.isHost) || (isHost && roomCode.trim().toLowerCase() === "new");
  const allReady = members.length > 0 && members.every((member) => member.isReady);
  const isPartyMode =
    settings?.gameMode === "friendly_party_quiz" || (members.length > 2 && modeCaps.promotesToPartyQuiz);
  // Seats shown by mode (lib/lobby/lobbyModes): party quiz 6, auction 3 (empty
  // seats become bots), every 1v1 mode 2.
  const lobbyMaxMembers = modeCaps.playable;
  // Auction, grid and duels bring their own content: lobby quiz categories do not apply.
  const hasFriendlyCategories =
    !modeCaps.needsCategories ||
    settings?.friendlyRandom ||
    Boolean(settings?.friendlyCategoryAId);
  const readyCopy = isAuctionLobby
    ? t("friend.readyCopyAuction")
    : isFootballGridLobby
      ? t("friend.readyCopyFootballGrid")
    : isDuelLobby
      ? t("friend.readyCopyDuel")
    : settings?.gameMode === "room_game"
      ? t("friend.readyCopyRoomGame")
    : settings?.gameMode === "ranked_sim"
      ? t("friend.readyCopyRanked")
      : isPartyMode
        ? t("friend.readyCopyParty")
        : t("friend.readyCopyClassic");
  const isHostStartableMode = Boolean(settings) && modeCaps.hostStart !== null;
  const canStartMatch =
    Boolean(
      isCurrentHost &&
        allReady &&
        lobby?.status === "waiting" &&
        canHostStart(settings?.gameMode, members.length) &&
        hasFriendlyCategories &&
        !isStartingMatch &&
        // Not while the settings screen shows a game the server has not confirmed: it would start the other one.
        !holding
    );
  const startLabel = isAuctionLobby
    ? t("friend.startAuction")
    : isFootballGridLobby
      ? t("friend.startFootballGrid")
    : isDuelLobby
      ? t("friend.startDuel")
    : settings?.gameMode === "room_game"
      ? t("friend.startRoomGame")
    : isPartyMode
      ? t("friend.startPartyQuiz")
      : t("friend.startMatch");
  const statusCopy = isSittingOutRoomGame
    ? t("friend.roomGameInProgress")
    : isAuctionLobby
    ? allReady
      ? t("friend.everyoneReady")
      : t("friend.waitingEveryoneReady")
    : allReady
    ? isPartyMode || settings?.gameMode === "room_game"
      ? t("friend.everyoneReady")
      : t("friend.bothPlayersReady")
    : members.length <= 1
      ? t("friend.waitingMorePlayers")
      : isPartyMode || settings?.gameMode === "room_game"
        ? t("friend.waitingEveryoneReady")
        : t("friend.waitingBothReady");

  const poppins = "'Poppins', sans-serif";

  if (isPreparingMatch && roomHandoffStalled) {
    // The match started but this screen never heard where to go: say so and offer a way on, never an endless spinner.
    return (
      <div className="container mx-auto max-w-5xl px-3 py-6 animate-in fade-in lg:px-0">
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-5 rounded-[20px] border border-white/10 bg-white/[0.03] px-6 text-center">
          <div className="space-y-2">
            <h1
              className="text-white uppercase"
              style={{ fontFamily: poppins, fontWeight: 700, fontSize: 24, letterSpacing: '0.04em' }}
            >
              {t("friend.handoffStalledTitle")}
            </h1>
            <p className="max-w-sm text-sm text-white/65" style={{ fontFamily: poppins }}>
              {t("friend.handoffStalledText")}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={actions.handleRoomHandoffRetry}
              className="flex h-12 items-center justify-center gap-2 rounded-[16px] bg-brand-blue px-5 text-white uppercase transition-all hover:bg-brand-blue/90 active:scale-[0.98]"
              style={{ fontFamily: poppins, fontWeight: 600, fontSize: 13, letterSpacing: '0.04em' }}
            >
              <RotateCw className="size-4" />
              {t("friend.handoffRetry")}
            </button>
            <button
              onClick={actions.handleRoomHandoffExit}
              className="flex h-12 items-center justify-center gap-2 rounded-[16px] bg-brand-red px-5 text-white uppercase transition-all hover:bg-brand-red/90 active:scale-[0.98]"
              style={{ fontFamily: poppins, fontWeight: 600, fontSize: 13, letterSpacing: '0.04em' }}
            >
              <LogOut className="size-4" />
              {t("friend.handoffExit")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isPreparingMatch) {
    return (
      <div className="container mx-auto max-w-5xl px-3 py-6 animate-in fade-in lg:px-0">
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-5 rounded-[20px] border border-white/10 bg-white/[0.03] px-6 text-center">
          <Loader2 className="size-9 animate-spin text-brand-yellow" />
          <div className="space-y-2">
            <h1
              className="text-white uppercase"
              style={{ fontFamily: poppins, fontWeight: 700, fontSize: 24, letterSpacing: '0.04em' }}
            >
              {t("friend.preparingMatchSpinner")}
            </h1>
            <p
              className="text-white/55 uppercase"
              style={{ fontFamily: poppins, fontWeight: 600, fontSize: 12, letterSpacing: '0.08em' }}
            >
              {t("friend.matchHandoffDescription")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isResolvingInvite) {
    const code = targetInviteCode ?? lobbyCode;

    return (
      <div className="container mx-auto max-w-5xl px-3 py-6 animate-in fade-in lg:px-0">
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-5 rounded-[20px] border border-white/10 bg-white/[0.03] px-6 text-center">
          <Loader2 className="size-9 animate-spin text-brand-yellow" />
          <div className="space-y-2">
            <h1
              className="text-white uppercase"
              style={{ fontFamily: poppins, fontWeight: 700, fontSize: 24, letterSpacing: '0.04em' }}
            >
              {t("friend.joiningCode", { code })}
            </h1>
            <p
              className="text-white/55 uppercase"
              style={{ fontFamily: poppins, fontWeight: 600, fontSize: 12, letterSpacing: '0.08em' }}
            >
              {code}
            </p>
          </div>
          <button
            onClick={actions.handleLeaveLobby}
            className="flex h-12 items-center justify-center gap-2 rounded-[16px] bg-brand-red px-5 text-white uppercase transition-all hover:bg-brand-red/90 active:scale-[0.98]"
            style={{ fontFamily: poppins, fontWeight: 600, fontSize: 13, letterSpacing: '0.04em' }}
          >
            <LogOut className="size-4" />
            {t("friend.leaveLobby")}
          </button>
        </div>
      </div>
    );
  }

  if (inviteJoinFailure) {
    return (
      <InviteFailureScreen failure={inviteJoinFailure} code={inviteJoinFailure.inviteCode || targetInviteCode || lobbyCode}
        onRetry={actions.handleInviteRetry} onBack={actions.handleInviteBack} onSignUp={actions.handleInviteSignUp}
        onNewRoom={actions.handleInviteNewRoom} onTryAgain={actions.handleInviteTryAgain} />
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-3 py-6 animate-in fade-in space-y-6 lg:px-0">

      <LobbyHeader
        lobbyName={lobby?.displayName}
        lobbyCode={lobbyCode}
        me={me}
        members={members}
        h2hSummary={h2hSummary}
        maxMembers={lobbyMaxMembers}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LobbySettings
            isHost={isCurrentHost}
            lobby={lobby}
            categories={allCategories}
            onUpdateSettings={actions.handleUpdateSettings}
            onRoomOptions={actions.handleRoomOptions}
            settingsErrorVersion={rollbackVersion}
            onSavingChange={handleSettingsBusy}
            onGameShown={handleGameShown}
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-[20px]">
            <div className="pb-3">
              <h2
                className="text-white uppercase"
                style={{ fontFamily: poppins, fontWeight: 600, fontSize: 16, letterSpacing: '0.04em' }}
              >
                {t("friend.readyCheck")}
              </h2>
            </div>
            <div
              className="rounded-[20px] px-7 py-7 space-y-5 lg:mt-6"
              style={{
                background: 'linear-gradient(180deg, #1645FF 35%, #1a35a1 100%)',
              }}
            >
              <p
                className="text-white/90"
                style={{ fontFamily: poppins, fontWeight: 500, fontSize: 13, lineHeight: 1.45 }}
              >
                {readyCopy}
              </p>

              <button
                onClick={handleReadyClick}
                disabled={!lobby || isSittingOutRoomGame}
                aria-busy={heldValid}
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
                {heldValid ? (
                  <Loader2 className="size-7 shrink-0 animate-spin text-brand-yellow" />
                ) : (
                  <CheckCircle2
                    className={cn(
                      "size-7 shrink-0",
                      displayedReady ? "text-brand-green-light" : "text-brand-yellow"
                    )}
                    strokeWidth={displayedReady ? 2 : 2.5}
                  />
                )}
                <span className="text-center leading-tight">
                  {heldValid ? t("friend.savingSettings") : displayedReady ? t("friend.readyTapToUnready") : t("friend.markReady")}
                </span>
              </button>

              {isHostStartableMode && (
                <button
                  onClick={handleStartClick}
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
                disabled={!lobby || isLeaving}
                aria-busy={isLeaving}
                className="w-full h-12 rounded-[20px] bg-brand-red text-white uppercase transition-all hover:bg-brand-red/90 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                style={{ fontFamily: poppins, fontWeight: 600, fontSize: 13, letterSpacing: '0.04em' }}
              >
                {isLeaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t("friend.leavingLobby")}
                  </>
                ) : (
                  <>
                    <LogOut className="size-4" />
                    {t("friend.leaveLobby")}
                  </>
                )}
              </button>

              <div className="py-1 text-center">
                <span
                  className={cn(
                    "uppercase",
                    allReady ? "text-brand-green-light" : "text-white/80"
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
