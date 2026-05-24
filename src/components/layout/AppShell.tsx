"use client";

/* eslint-disable @next/next/no-img-element -- Small navbar currency icons are static decorative assets. */

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuthStore } from "@/stores/auth.store";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useRankedMatchmakingStore } from "@/stores/rankedMatchmaking.store";
import { useGameSessionStore } from "@/stores/gameSession.store";
import { useStoreWallet } from "@/lib/queries/store.queries";
import { useIncomingFriendRequestCount } from "@/lib/queries/social.queries";
import { Button } from "@/components/ui/button";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown";
import { ChallengeInvitePrompt } from "@/components/layout/ChallengeInvitePrompt";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Settings,
  Home,
  LogOut,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSocket } from "@/lib/realtime/socket-client";
import { useRealtimeConnection } from "@/lib/realtime/useRealtimeConnection";
import { Medal, Gem, User, Gamepad2, UserRound } from "lucide-react";
import type { MessageKey } from "@/lib/i18n/messages";

const MOBILE_NAV_ITEMS = [
  { path: "/", labelKey: "navigation.home", icon: Home },
  { path: "/leaderboard", labelKey: "navigation.leaderboard", icon: Medal },
  { path: "/social", labelKey: "navigation.social", icon: UserRound },
  { path: "/store", labelKey: "navigation.store", icon: Gem },
  { path: "/profile", labelKey: "navigation.profile", icon: User },
] as const;

const HIDE_NAV_PATHS = ["/game", "/onboarding"];
const HEADER_PATHS = ["/", "/play", "/events", "/leaderboard", "/social", "/profile", "/store", "/career", "/daily"];

type AppShellProps = {
  children: React.ReactNode;
};

type RankedGeoHintDebug = {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  source?: string;
};

function isRankedGeoHintDebug(value: unknown): value is RankedGeoHintDebug {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RankedGeoHintDebug>;
  const isMaybeString = (input: unknown) => input === undefined || typeof input === "string";
  const isMaybeNumber = (input: unknown) => input === undefined || typeof input === "number";
  return (
    isMaybeString(candidate.city) &&
    isMaybeString(candidate.region) &&
    isMaybeString(candidate.country) &&
    isMaybeString(candidate.countryCode) &&
    isMaybeNumber(candidate.latitude) &&
    isMaybeNumber(candidate.longitude) &&
    isMaybeString(candidate.source)
  );
}

function readRankedGeoHintDebug(): RankedGeoHintDebug | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("ranked_geo_hint_v1");
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isRankedGeoHintDebug(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

type TranslateFn = (key: MessageKey, params?: Record<string, string | number>) => string;

function formatRejoinCopy(t: TranslateFn, remainingReconnects: number, compact = false): string {
  if (remainingReconnects <= 0) {
    return compact
      ? t("appShell.rejoinNowLastMobile")
      : t("appShell.rejoinNowLastDesktop");
  }

  const label = remainingReconnects === 1
    ? t("appShell.reconnect")
    : t("appShell.reconnects");
  return compact
    ? t("appShell.rejoinShortMany", { count: remainingReconnects, label })
    : t("appShell.rejoinNowToContinue", { count: remainingReconnects, label });
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();
  const { player: playerStats } = usePlayer();
  const { data: storeWallet } = useStoreWallet();
  const { data: incomingFriendRequestCount = 0 } = useIncomingFriendRequestCount();
  const authUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const lobby = useRealtimeMatchStore((state) => state.lobby);
  const draft = useRealtimeMatchStore((state) => state.draft);
  const match = useRealtimeMatchStore((state) => state.match);
  const remainingReconnects = useRealtimeMatchStore((state) => state.remainingReconnects);
  const sessionState = useRealtimeMatchStore((state) => state.sessionState);
  const rejoinMatch = useRealtimeMatchStore((state) => state.rejoinMatch);
  const forfeitPending = useRealtimeMatchStore((state) => state.forfeitPending);
  const challengeInviteCount = useRealtimeMatchStore((state) => state.challengeInvites.length);
  const suppressLobbyBannerUntil = useRealtimeMatchStore((state) => state.suppressLobbyBannerUntil);
  const suppressLobbyBannerReason = useRealtimeMatchStore((state) => state.suppressLobbyBannerReason);
  const clearLobbyBannerSuppression = useRealtimeMatchStore((state) => state.clearLobbyBannerSuppression);
  const clearRejoinAvailable = useRealtimeMatchStore((state) => state.clearRejoinAvailable);
  const resetRealtime = useRealtimeMatchStore((state) => state.reset);
  const startSession = useGameSessionStore((state) => state.startSession);
  const setGameStage = useGameSessionStore((state) => state.setStage);
  const [socketConnected, setSocketConnected] = useState(() => getSocket().connected);
  const [rankedGeoHintDebug, setRankedGeoHintDebug] = useState<RankedGeoHintDebug | null>(
    () => readRankedGeoHintDebug()
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  useRealtimeConnection({ enabled: Boolean(authUser), selfUserId: authUser?.id ?? null });

  // Tick once per second so any time-comparison render values
  // (e.g. lobby banner suppression deadline) stay fresh without
  // calling Date.now() during render.
  useEffect(() => {
    if (suppressLobbyBannerUntil === null) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [suppressLobbyBannerUntil]);

  const currentPath = pathname ?? "/";
  const showHeader = HEADER_PATHS.some((p) => p === "/" ? currentPath === "/" : currentPath.startsWith(p));
  const showNav = !HIDE_NAV_PATHS.some((path) => currentPath.startsWith(path));
  const inLobbyRoom = currentPath.startsWith("/friend/room");
  const lobbyBannerSuppressed =
    suppressLobbyBannerReason !== null ||
    (suppressLobbyBannerUntil !== null && suppressLobbyBannerUntil > nowTick);
  const showLobbyBanner =
    !!lobby &&
    lobby.status === "waiting" &&
    lobby.mode === "friendly" &&
    Boolean(lobby.inviteCode) &&
    !inLobbyRoom &&
    !lobbyBannerSuppressed;
  const showRankedLobbyBanner =
    !!lobby &&
    lobby.status === "waiting" &&
    lobby.mode === "ranked" &&
    !currentPath.startsWith("/game");

  useEffect(() => {
    if (inLobbyRoom && suppressLobbyBannerReason !== null) {
      clearLobbyBannerSuppression();
    }
  }, [clearLobbyBannerSuppression, inLobbyRoom, suppressLobbyBannerReason]);

  const draftOpponent = lobby?.members.find((member) => member.userId !== authUser?.id);
  const activeDraftBanner = lobby?.status === "active" && draft
    ? {
        lobbyId: lobby.lobbyId,
        mode: lobby.mode,
        opponent: draftOpponent,
      }
    : null;
  const showDraftBanner = !!activeDraftBanner && !currentPath.startsWith("/game");
  const activeMatchBanner = rejoinMatch
    ? {
        matchId: rejoinMatch.matchId,
        mode: rejoinMatch.mode,
        opponent: rejoinMatch.opponent,
        source: "rejoin" as const,
      }
    : match && !match.finalResults
      ? {
          matchId: match.matchId,
          mode: match.mode,
          opponent: match.opponent,
          source: "active" as const,
        }
      : null;
  const showRejoinBanner = !!activeMatchBanner && !currentPath.startsWith("/game");
  const completedMatchBanner = match?.finalResults
    ? {
        matchId: match.matchId,
        mode: match.mode,
        variant: match.variant,
        opponent: match.opponent,
      }
    : null;
  const showCompletedMatchBanner = !!completedMatchBanner && !currentPath.startsWith("/game");
  const showForfeitPendingBanner = !!forfeitPending && !match?.finalResults && !currentPath.startsWith("/game");
  const forfeitPendingTitle =
    forfeitPending?.reason === "opponent_forfeit"
      ? "Opponent forfeited"
      : forfeitPending?.reason === "opponent_reconnect_limit"
        ? "Opponent did not reconnect"
        : "You lost the match";
  const forfeitPendingDescription = forfeitPending?.message ?? "Finalizing result...";
  const completedByForfeit = match?.finalResults?.winnerDecisionMethod === "forfeit";
  const completedPartyQuiz = completedMatchBanner?.variant === "friendly_party_quiz";
  const rejoinReconnectsLeft = rejoinMatch?.remainingReconnects ?? remainingReconnects ?? 0;
  const lobbyCode = lobby?.inviteCode ?? "";
  const showLobbyDebug = process.env.NODE_ENV !== "production";
  const localWaitingLobbyId = lobby?.status === "waiting" ? lobby.lobbyId : null;
  const sessionWaitingLobbyId = sessionState?.waitingLobbyId ?? null;
  const lobbyDebugMismatch = localWaitingLobbyId !== sessionWaitingLobbyId;
  const sessionStateLabel = sessionState?.state ?? "NO_SESSION";
  const navbarCoins = storeWallet?.coins ?? 0;
  const navbarTickets = storeWallet?.tickets ?? 0;
  const socialBadgeCount = incomingFriendRequestCount + challengeInviteCount;

  useEffect(() => {
    const socket = getSocket();
    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  useEffect(() => {
    const sync = () => setRankedGeoHintDebug(readRankedGeoHintDebug());
    window.addEventListener("storage", sync);
    const intervalId = window.setInterval(sync, 1500);
    return () => {
      window.removeEventListener("storage", sync);
      window.clearInterval(intervalId);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace("/auth/welcome");
  };

  const isPathActive = (path: string, exact?: boolean) => {
    if (path === "/") return currentPath === "/";
    const basePath = path.split("?")[0];
    if (exact) return currentPath === basePath;
    return currentPath === basePath || currentPath.startsWith(`${basePath}/`);
  };

  const handleReturnToLobby = () => {
    if (!lobbyCode) return;
    router.push(`/friend/room/${lobbyCode}`);
  };

  const handleReturnToRankedLobby = () => {
    startSession({
      mode: "ranked",
      matchType: "ranked",
      questionCount: 10,
      opponentId: draftOpponent?.userId ?? "opponent",
      opponentUsername: draftOpponent?.username ?? "Opponent",
      opponentAvatar: draftOpponent?.avatarUrl ?? undefined,
    });
    setGameStage("matchmaking");
    router.push("/game");
  };

  const handleLeaveLobby = () => {
    getSocket().emit("lobby:leave");
    resetRealtime();
    useRankedMatchmakingStore.getState().clearRankedMatchmaking();
  };

  const handleRejoinMatch = () => {
    if (!activeMatchBanner) return;

    const matchId = activeMatchBanner.matchId;

    startSession({
      mode: activeMatchBanner.mode === "ranked" ? "ranked" : "quizball",
      matchType: activeMatchBanner.mode === "ranked" ? "ranked" : "friendly",
      questionCount: 10,
      opponentId: activeMatchBanner.opponent.id,
      opponentUsername: activeMatchBanner.opponent.username,
      opponentAvatar: activeMatchBanner.opponent.avatarUrl ?? undefined,
    });
    // Avoid re-entering matchmaking queue on rejoin.
    setGameStage("playing");

    if (activeMatchBanner.source === "rejoin") {
      getSocket().emit("match:rejoin", { matchId });
      clearRejoinAvailable();
    }

    router.push("/game");
  };

  const handleReturnToDraft = () => {
    if (!activeDraftBanner) return;

    startSession({
      mode: activeDraftBanner.mode === "ranked" ? "ranked" : "quizball",
      matchType: activeDraftBanner.mode === "ranked" ? "ranked" : "friendly",
      questionCount: 10,
      opponentId: activeDraftBanner.opponent?.userId ?? "opponent",
      opponentUsername: activeDraftBanner.opponent?.username ?? "Opponent",
      opponentAvatar: activeDraftBanner.opponent?.avatarUrl ?? undefined,
      skipDraftShowdown: true,
    });
    setGameStage("categoryBlocking");
    router.push("/game");
  };

  const handleForfeitRejoin = () => {
    if (!activeMatchBanner) {
      clearRejoinAvailable();
      return;
    }
    getSocket().emit("match:forfeit", { matchId: activeMatchBanner.matchId });
  };

  const handleViewCompletedMatch = () => {
    if (!completedMatchBanner) return;

    startSession({
      mode: completedMatchBanner.mode === "ranked" ? "ranked" : "quizball",
      matchType: completedMatchBanner.mode === "ranked" ? "ranked" : "friendly",
      questionCount: 10,
      opponentId: completedMatchBanner.opponent.id,
      opponentUsername: completedMatchBanner.opponent.username,
      opponentAvatar: completedMatchBanner.opponent.avatarUrl ?? undefined,
    });
    setGameStage("finalResults");
    router.push("/game");
  };

  const handleDismissCompletedMatch = () => {
    resetRealtime();
    useRankedMatchmakingStore.getState().clearRankedMatchmaking();
  };

  return (
    <div className="relative min-h-screen text-foreground">
      <ChallengeInvitePrompt />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at top center, rgba(28,176,246,0.08), transparent 32%), radial-gradient(circle at bottom left, rgba(88,204,2,0.06), transparent 28%)",
        }}
      />
      {/* DESKTOP LAYOUT (>= xl) — tablets including iPad Pro portrait get the mobile shell */}
      <div className="relative z-10 hidden h-dvh overflow-hidden xl:flex">
        <Sidebar currentPath={currentPath} socialBadgeCount={socialBadgeCount} />

        {/* Main Wrapper */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* TopBar */}
          <header className="h-16 bg-background/60 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
            <div className="flex-1" />

            <div className="flex items-center gap-4">
              {showLobbyDebug && (
                <div
                  className={cn(
                    "hidden lg:flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold",
                    lobbyDebugMismatch
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                      : "border-slate-500/40 bg-slate-500/15 text-slate-200"
                  )}
                  title="Temporary lobby/session debug badge"
                >
                  <span>LobbyDbg</span>
                  <span>local:{localWaitingLobbyId ? localWaitingLobbyId.slice(0, 6) : "-"}</span>
                  <span>session:{sessionWaitingLobbyId ? sessionWaitingLobbyId.slice(0, 6) : "-"}</span>
                  <span>state:{sessionStateLabel}</span>
                  <span>
                    loc:{rankedGeoHintDebug?.city ?? "-"},
                    {rankedGeoHintDebug?.countryCode ?? rankedGeoHintDebug?.country ?? "-"}
                  </span>
                  <span>
                    ll:
                    {typeof rankedGeoHintDebug?.latitude === "number"
                      ? rankedGeoHintDebug.latitude.toFixed(2)
                      : "-"},
                    {typeof rankedGeoHintDebug?.longitude === "number"
                      ? rankedGeoHintDebug.longitude.toFixed(2)
                      : "-"}
                  </span>
                  <span>src:{rankedGeoHintDebug?.source ?? "-"}</span>
                </div>
              )}
              {/* Currencies */}
              <div className="flex items-center gap-3 mr-4">
                {/* Coins */}
                <Link
                  href="/store"
                  className="flex items-center gap-1 pl-1.5 pr-3.5 py-1 rounded-full bg-brand-yellow hover:bg-[#FFD000] transition-all active:scale-95"
                >
                  <Image
                    src="/assets/coin-1.png"
                    alt="Coins"
                    width={24}
                    height={24}
                    className="size-6"
                  />
                  <span className="text-sm font-black text-black">
                    {navbarCoins.toLocaleString()}
                  </span>
                </Link>

                {/* Tickets */}
                <Link
                  href="/store"
                  className="flex items-center gap-1.5 pl-2 pr-3.5 py-1 rounded-full bg-brand-green-light hover:bg-brand-green-light transition-all active:scale-95"
                >
                  <Image
                    src="/assets/ticket-1.png"
                    alt="Tickets"
                    width={20}
                    height={20}
                    className="size-5"
                  />
                  <span className="text-sm font-black text-white">
                    {navbarTickets}
                  </span>
                </Link>
              </div>

              <div className="h-6 w-px bg-border/50" />

              {/* Notifications */}
              <NotificationsDropdown badgeCount={socialBadgeCount} />

              {/* User Profile + Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 rounded-full px-1 py-1 hover:bg-white/5 transition-colors focus:outline-none">
                    <div className="rounded-full bg-brand-blue p-1.5">
                      <AvatarDisplay
                        customization={playerStats.avatarCustomization || { base: playerStats.avatar }}
                        size="sm"
                        countryCode={authUser?.country}
                      />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black uppercase tracking-wide text-white">
                        {playerStats.username}
                      </div>
                      <div className="mt-0.5 inline-flex items-center rounded-full bg-brand-yellow px-2.5 py-0.5 text-xs font-black text-black">
                        {playerStats.rankPoints ?? 0}RP
                      </div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-64 rounded-[20px] border-0 p-3 text-white font-poppins shadow-[0_18px_48px_rgba(0,0,0,0.45)]"
                  style={{ backgroundColor: '#1645FF' }}
                  align="end"
                  forceMount
                >
                  <DropdownMenuLabel className="font-normal px-2 pb-3">
                    <div className="flex flex-col space-y-1">
                      <p className="font-poppins text-base font-semibold leading-none text-white">
                        {playerStats.username}
                      </p>
                      <p className="font-poppins text-xs font-medium leading-none text-white/70">
                        {t("accountMenu.levelAndRp", {
                          level: playerStats.level,
                          rp: playerStats.rankPoints ?? 0,
                        })}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className="rounded-[12px] px-3 py-2.5 font-poppins text-sm font-semibold text-white focus:bg-white/15 focus:text-white"
                    onClick={() => router.push("/profile")}
                  >
                    <User className="mr-2 h-4 w-4 text-brand-yellow" />
                    <span>{t("navigation.profile")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-[12px] px-3 py-2.5 font-poppins text-sm font-semibold text-white focus:bg-white/15 focus:text-white"
                    onClick={() => router.push("/settings")}
                  >
                    <Settings className="mr-2 h-4 w-4 text-brand-yellow" />
                    <span>{t("navigation.settings")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowLogoutConfirm(true)}
                    className="mt-2 justify-center rounded-[16px] bg-brand-red-soft px-3 py-3 font-poppins text-sm font-semibold uppercase text-white transition-colors focus:bg-brand-red-deep focus:text-white hover:bg-brand-red-deep"
                  >
                    <LogOut className="mr-2 h-4 w-4 text-white" />
                    <span>{t("accountMenu.logOut")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Content Area */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
            {showForfeitPendingBanner && (
              <div className="px-6 pt-4">
                <div className="rounded-2xl border-2 border-brand-red-soft bg-brand-red-soft/10 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-brand-red-soft/20 text-brand-red-soft flex items-center justify-center">
                        <Gamepad2 className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{forfeitPendingTitle}</p>
                        <p className="text-xs text-white/70">{forfeitPendingDescription}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {showCompletedMatchBanner && (
              <div className="px-6 pt-4">
                <div className="rounded-2xl border-2 border-brand-green bg-brand-green/10 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center">
                        <Gamepad2 className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {completedPartyQuiz ? (
                            t("appShell.partyQuizFinished")
                          ) : (
                            <>
                              {t("appShell.matchFinishedAgainst")}{" "}
                              <span className="text-white">{completedMatchBanner?.opponent.username ?? t("appShell.opponentFallback")}</span>
                            </>
                          )}
                        </p>
                          <p className="text-xs text-white/70">
                            {completedPartyQuiz
                              ? t("appShell.partyQuizFinishedDesc")
                              : completedByForfeit
                              ? t("appShell.completedByForfeit")
                              : t("appShell.viewFinalResult")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="h-9 bg-brand-green text-white hover:bg-brand-green-deep"
                          onClick={handleViewCompletedMatch}
                        >
                          {t("appShell.viewResults")} <ArrowRight className="ml-2 size-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-9 bg-brand-red-soft text-white hover:bg-brand-red-soft/90"
                          onClick={handleDismissCompletedMatch}
                        >
                          Dismiss <X className="ml-2 size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {showDraftBanner && (
                <div className="px-6 pt-4">
                  <div className="rounded-2xl border-2 border-brand-orange bg-brand-orange/10 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center">
                          <Gamepad2 className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {t("appShell.draftActiveAgainst")}{" "}
                            <span className="text-white">{activeDraftBanner?.opponent?.username ?? t("appShell.opponentFallback")}</span>
                          </p>
                          <p className="text-xs text-white/70">{t("appShell.returnToCategoryBanning")}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="h-9 bg-brand-orange text-white hover:bg-brand-orange-light"
                        onClick={handleReturnToDraft}
                      >
                        {t("appShell.returnToDraft")} <ArrowRight className="ml-2 size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {showRejoinBanner && (
              <div className="px-6 pt-4">
                <div className="rounded-2xl border-2 border-brand-yellow bg-brand-yellow/10 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-brand-yellow/20 text-brand-yellow flex items-center justify-center">
                        <Gamepad2 className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {t("appShell.matchStillActiveAgainst")}{" "}
                          <span className="text-white">{activeMatchBanner?.opponent.username ?? t("appShell.opponentFallback")}</span>
                        </p>
                        <p className="text-xs text-white/70">
                            {activeMatchBanner?.source === "rejoin"
                              ? formatRejoinCopy(t, rejoinReconnectsLeft)
                              : t("appShell.returnToLiveMatch")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-9 bg-brand-yellow text-surface-page hover:bg-brand-yellow-deep"
                        onClick={handleRejoinMatch}
                      >
                        {t("appShell.rejoinMatch")} <ArrowRight className="ml-2 size-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 bg-brand-red-soft text-white hover:bg-brand-red-soft/90"
                        onClick={handleForfeitRejoin}
                      >
                        {t("appShell.forfeit")} <X className="ml-2 size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {showLobbyBanner && (
              <div className="px-6 pt-4">
                <div className="rounded-2xl border-2 border-brand-green bg-brand-green/10 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center">
                        <Gamepad2 className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {t("appShell.stillInLobby")}{" "}
                          <span className="text-white">{lobby?.displayName ?? t("appShell.lobbyFallback")}</span>
                        </p>
                        <p className="text-xs text-white/70">
                          {t("appShell.code")}{" "}
                          <span className="font-mono font-bold text-white">{lobbyCode || "..."}</span>
                          {!socketConnected && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-yellow/20 px-2 py-0.5 text-[10px] font-semibold text-brand-yellow">
                              {t("appShell.reconnecting")}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-9 bg-brand-green text-white hover:bg-brand-green-deep"
                        onClick={handleReturnToLobby}
                        disabled={!lobbyCode}
                      >
                        {t("appShell.returnToLobby")} <ArrowRight className="ml-2 size-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 bg-brand-red-soft text-white hover:bg-brand-red-soft/90"
                        onClick={handleLeaveLobby}
                      >
                        {t("appShell.leave")} <X className="ml-2 size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {showRankedLobbyBanner && (
              <div className="px-6 pt-4">
                <div className="rounded-2xl border-2 border-brand-blue bg-brand-blue/10 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-brand-blue/20 text-brand-blue flex items-center justify-center">
                        <Gamepad2 className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {t("appShell.rankedMatchPreparing")}
                        </p>
                        <p className="text-xs text-white/70">
                          {draftOpponent
                            ? <>{t("appShell.opponentFound")}<span className="text-white">{draftOpponent.username}</span></>
                            : t("appShell.returnToMatchmakingOrLeave")}
                          {!socketConnected && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-yellow/20 px-2 py-0.5 text-[10px] font-semibold text-brand-yellow">
                              {t("appShell.reconnecting")}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-9 bg-brand-blue text-white hover:bg-brand-blue/90"
                        onClick={handleReturnToRankedLobby}
                      >
                        {t("appShell.returnToMatchmaking")} <ArrowRight className="ml-2 size-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 bg-brand-red-soft text-white hover:bg-brand-red-soft/90"
                        onClick={handleLeaveLobby}
                      >
                        {t("appShell.leave")} <X className="ml-2 size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <main className="p-6">
              {children}
            </main>
          </div>
        </div>
      </div>

      {/* MOBILE / TABLET LAYOUT (< xl) */}
      <div className="relative z-10 flex min-h-screen flex-col xl:hidden">
        {/* Header */}
        {showHeader && (
          <div>
            <div className="px-4 pt-6 pb-5">
              <div className="flex items-center justify-between mb-3 relative">
                <div className="flex items-center gap-2 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 rounded-full focus:outline-none">
                        <div className="size-12 rounded-full overflow-hidden">
                          <AvatarDisplay
                            customization={playerStats.avatarCustomization || { base: playerStats.avatar }}
                            size="sm"
                            countryCode={authUser?.country}
                          />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-black uppercase tracking-[0.03em] text-white">
                            {playerStats.username}
                          </div>
                          <div className="mt-1 inline-flex items-center rounded-full bg-brand-yellow px-2.5 py-0.5 text-[11px] font-black uppercase leading-none text-black">
                            {playerStats.rankPoints ?? 0} RP
                          </div>
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-64 rounded-[20px] border-0 p-3 text-white font-poppins shadow-[0_18px_48px_rgba(0,0,0,0.45)]"
                      style={{ backgroundColor: '#1645FF' }}
                      align="start"
                      forceMount
                    >
                      <DropdownMenuLabel className="font-normal px-2 pb-3">
                        <div className="flex flex-col space-y-1">
                          <p className="font-poppins text-base font-semibold leading-none text-white">
                            {playerStats.username}
                          </p>
                          <p className="font-poppins text-xs font-medium leading-none text-white/70">
                            {t("accountMenu.levelAndRp", {
                              level: playerStats.level,
                              rp: playerStats.rankPoints ?? 0,
                            })}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        className="rounded-[12px] px-3 py-2.5 font-poppins text-sm font-semibold text-white focus:bg-white/15 focus:text-white"
                        onClick={() => router.push("/profile")}
                      >
                        <User className="mr-2 h-4 w-4 text-brand-yellow" />
                        <span>{t("navigation.profile")}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="rounded-[12px] px-3 py-2.5 font-poppins text-sm font-semibold text-white focus:bg-white/15 focus:text-white"
                        onClick={() => router.push("/settings")}
                      >
                        <Settings className="mr-2 h-4 w-4 text-brand-yellow" />
                        <span>{t("navigation.settings")}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowLogoutConfirm(true)}
                        className="mt-2 justify-center rounded-[16px] bg-brand-red-soft px-3 py-3 font-poppins text-sm font-semibold uppercase text-white transition-colors focus:bg-brand-red-deep focus:text-white hover:bg-brand-red-deep"
                      >
                        <LogOut className="mr-2 h-4 w-4 text-white" />
                        <span>{t("accountMenu.logOut")}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2 z-10">
                  {/* Coins */}
                  <Link
                    href="/store"
                    className="flex h-8 min-w-[72px] items-center gap-1.5 rounded-full bg-brand-yellow pl-1 pr-3 transition-colors hover:bg-[#FFD000] active:scale-95"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center">
                      <img src="/assets/coin-1.png" alt="Coins" className="size-6 object-contain" />
                    </span>
                    <span className="text-sm font-black text-black tabular-nums">
                      {navbarCoins.toLocaleString()}
                    </span>
                  </Link>

                  {/* Tickets */}
                  <Link
                    href="/store"
                    className="flex h-8 min-w-[72px] items-center gap-1.5 rounded-full bg-brand-green-light pl-1 pr-3 transition-colors hover:bg-brand-green-light active:scale-95"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center">
                      <img src="/assets/ticket-1.png" alt="Tickets" className="size-5 object-contain" />
                    </span>
                    <span className="text-sm font-black text-white tabular-nums">{navbarTickets}</span>
                  </Link>

                  <NotificationsDropdown badgeCount={socialBadgeCount} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20">
          {showForfeitPendingBanner && (
            <div className="px-4 pt-4">
              <div className="rounded-2xl border-2 border-brand-red-soft bg-brand-red-soft/10 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-brand-red-soft/20 text-brand-red-soft flex items-center justify-center">
                    <Gamepad2 className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{forfeitPendingTitle}</p>
                    <p className="text-xs text-white/70">{forfeitPendingDescription}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {showCompletedMatchBanner && (
            <div className="px-4 pt-4">
              <div className="rounded-2xl border-2 border-brand-green bg-brand-green/10 px-4 py-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center">
                      <Gamepad2 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {completedPartyQuiz ? (
                          t("appShell.partyQuizFinished")
                        ) : (
                          <>
                            {t("appShell.matchFinishedVs")}{" "}
                            <span className="text-white">{completedMatchBanner?.opponent.username ?? t("appShell.opponentFallback")}</span>
                          </>
                        )}
                      </p>
                        <p className="text-xs text-white/70">
                          {completedPartyQuiz
                            ? t("appShell.partyQuizFinishedCompactDesc")
                            : completedByForfeit
                              ? t("appShell.completedByForfeitCompact")
                              : t("appShell.matchFinishedCompactDesc")}
                        </p>
                    </div>
                  </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-10 bg-brand-green text-white hover:bg-brand-green-deep"
                        onClick={handleViewCompletedMatch}
                      >
                        {t("appShell.viewResults")}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-10 bg-brand-red-soft text-white hover:bg-brand-red-soft/90"
                        onClick={handleDismissCompletedMatch}
                      >
                        {t("appShell.dismiss")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {showDraftBanner && (
              <div className="px-4 pt-4">
                <div className="rounded-2xl border-2 border-brand-orange bg-brand-orange/10 px-4 py-3">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center">
                        <Gamepad2 className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {t("appShell.draftActiveVs")}{" "}
                          <span className="text-white">{activeDraftBanner?.opponent?.username ?? t("appShell.opponentFallback")}</span>
                        </p>
                        <p className="text-xs text-white/70">{t("appShell.returnToCategoryBanningShort")}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="h-10 bg-brand-orange text-white hover:bg-brand-orange-light"
                      onClick={handleReturnToDraft}
                    >
                      {t("appShell.returnToDraft")}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {showRejoinBanner && (
            <div className="px-4 pt-4">
              <div className="rounded-2xl border-2 border-brand-yellow bg-brand-yellow/10 px-4 py-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-brand-yellow/20 text-brand-yellow flex items-center justify-center">
                      <Gamepad2 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {t("appShell.matchActiveVs")}{" "}
                        <span className="text-white">{activeMatchBanner?.opponent.username ?? t("appShell.opponentFallback")}</span>
                      </p>
                      <p className="text-xs text-white/70">
                          {activeMatchBanner?.source === "rejoin"
                            ? formatRejoinCopy(t, rejoinReconnectsLeft, true)
                            : t("appShell.returnToContinue")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-10 bg-brand-yellow text-surface-page hover:bg-brand-yellow-deep"
                      onClick={handleRejoinMatch}
                    >
                      {t("appShell.rejoin")}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-10 bg-brand-red-soft text-white hover:bg-brand-red-soft/90"
                      onClick={handleForfeitRejoin}
                    >
                      {t("appShell.forfeit")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {showLobbyBanner && (
            <div className="px-4 pt-4">
              <div className="rounded-2xl border-2 border-brand-green bg-brand-green/10 px-4 py-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center">
                      <Gamepad2 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {t("appShell.stillInLobby")}{" "}
                        <span className="text-white">{lobby?.displayName ?? t("appShell.lobbyFallback")}</span>
                      </p>
                      <p className="text-xs text-white/70">
                        {t("appShell.code")}{" "}
                        <span className="font-mono font-bold text-white">{lobbyCode || "..."}</span>
                        {!socketConnected && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-yellow/20 px-2 py-0.5 text-[10px] font-semibold text-brand-yellow">
                            {t("appShell.reconnecting")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-10 bg-brand-green text-white hover:bg-brand-green-deep"
                      onClick={handleReturnToLobby}
                      disabled={!lobbyCode}
                    >
                      {t("appShell.return")}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-10 bg-brand-red-soft text-white hover:bg-brand-red-soft/90"
                      onClick={handleLeaveLobby}
                    >
                      {t("appShell.leave")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {showRankedLobbyBanner && (
            <div className="px-4 pt-4">
              <div className="rounded-2xl border-2 border-brand-blue bg-brand-blue/10 px-4 py-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-brand-blue/20 text-brand-blue flex items-center justify-center">
                      <Gamepad2 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {t("appShell.rankedMatchPreparing")}
                      </p>
                      <p className="text-xs text-white/70">
                        {draftOpponent
                          ? <>{t("appShell.opponentFound")}<span className="text-white">{draftOpponent.username}</span></>
                          : t("appShell.returnToMatchmakingOrLeaveShort")}
                        {!socketConnected && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-yellow/20 px-2 py-0.5 text-[10px] font-semibold text-brand-yellow">
                            {t("appShell.reconnecting")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-10 bg-brand-blue text-white hover:bg-brand-blue/90"
                      onClick={handleReturnToRankedLobby}
                    >
                      {t("appShell.return")}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-10 bg-brand-red-soft text-white hover:bg-brand-red-soft/90"
                      onClick={handleLeaveLobby}
                    >
                      {t("appShell.leave")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {children}
        </main>

        {/* Sticky Play Button - Only on Home Screen */}
        {currentPath === "/" && (
          <div className="fixed bottom-16 left-0 right-0 z-30 bg-background border-t border-border/50">
            <div className="px-4 pt-3.5 pb-3 flex justify-center">
              <Button
                onClick={() => router.push("/play")}
                size="lg"
                className="w-11/12 h-12 shadow-lg shadow-primary/20"
              >
                {t("common.play")}
              </Button>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        {showNav && (
          <div className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t border-border/50">
            <nav className="flex justify-around px-2 py-2">
              {MOBILE_NAV_ITEMS.map((item) => {
                const isActive = isPathActive(item.path, undefined);
                const showSocialBadge = item.path === "/social" && socialBadgeCount > 0;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={cn(
                      "relative flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors",
                      isActive ? "text-primary bg-secondary" : "text-muted-foreground",
                    )}
                  >
                    <item.icon className="size-5" />
                    <span className="text-xs">{t(item.labelKey as MessageKey)}</span>
                    {showSocialBadge && (
                      <span className="absolute right-1 top-1 min-w-4 rounded-full bg-red-500 px-1 py-0.5 text-center text-[9px] font-black text-white">
                        {socialBadgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent
          className="max-w-md w-[92vw] rounded-[24px] border-0 p-8 font-poppins shadow-none sm:p-10"
          style={{ backgroundColor: '#1645FF' }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center font-poppins text-[22px] font-semibold text-white sm:text-[26px]">
              {t("accountMenu.logOutQuestion")}
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-3 text-center font-poppins text-[13px] font-medium leading-snug text-white/80 sm:text-[14px]">
              {t("accountMenu.logOutDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-col sm:space-x-0">
            <AlertDialogAction
              onClick={handleLogout}
              className="w-full rounded-[16px] border-0 bg-brand-red-soft from-brand-red-soft to-brand-red-soft px-3 py-3 font-poppins text-sm font-semibold uppercase tracking-wide text-white shadow-none hover:bg-brand-red-soft/90 hover:from-brand-red-soft/90 hover:to-brand-red-soft/90 hover:shadow-none focus-visible:ring-0"
            >
              {t("accountMenu.logOut")}
            </AlertDialogAction>
            <AlertDialogCancel className="mt-0 w-full rounded-[16px] border-0 bg-white/15 px-3 py-3 font-poppins text-sm font-semibold uppercase tracking-wide text-white shadow-none hover:bg-white/25 hover:text-white focus-visible:ring-0">
              {t("common.cancel")}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
