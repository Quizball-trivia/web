"use client";

/* eslint-disable @next/next/no-img-element -- Small navbar currency icons are static decorative assets. */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown";
import { ChallengeInvitePrompt } from "@/components/layout/ChallengeInvitePrompt";
import { ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Gamepad2 } from "lucide-react";
import type { MessageKey } from "@/lib/i18n/messages";

import type { AppShellProps } from "./app-shell/appShell.types";
import { MOBILE_NAV_ITEMS, formatRejoinCopy } from "./app-shell/appShell.helpers";
import { useAppShellViewModel } from "./app-shell/useAppShellViewModel";
import { AppShellPageChrome } from "./app-shell/AppShellPageChrome";
import { AppShellLogoutDialog } from "./app-shell/AppShellLogoutDialog";
import { AppShellCurrencyPills } from "./app-shell/AppShellCurrencyPills";
import { AppShellLobbyDebugBadge } from "./app-shell/AppShellLobbyDebugBadge";
import { AppShellProfileMenu } from "./app-shell/AppShellProfileMenu";

export function AppShell({ children }: AppShellProps) {
  const vm = useAppShellViewModel();
  const {
    t,
    playerStats,
    authUser,
    currentPath,
    showHeader,
    showNav,
    isPathActive,
    lobby,
    lobbyCode,
    draftOpponent,
    activeDraftBanner,
    activeMatchBanner,
    completedMatchBanner,
    forfeitPending,
    forfeitPendingTitle,
    forfeitPendingDescription,
    completedByForfeit,
    completedPartyQuiz,
    rejoinReconnectsLeft,
    showLobbyBanner,
    showRankedLobbyBanner,
    showDraftBanner,
    showRejoinBanner,
    showCompletedMatchBanner,
    showForfeitPendingBanner,
    navbarCoins,
    navbarTickets,
    socialBadgeCount,
    socketConnected,
    showLobbyDebug,
    lobbyDebugMismatch,
    localWaitingLobbyId,
    sessionWaitingLobbyId,
    sessionStateLabel,
    rankedGeoHintDebug,
    showLogoutConfirm,
    setShowLogoutConfirm,
    handleLogout,
    handleReturnToLobby,
    handleReturnToRankedLobby,
    handleLeaveLobby,
    handleRejoinMatch,
    handleReturnToDraft,
    handleForfeitRejoin,
    handleViewCompletedMatch,
    handleDismissCompletedMatch,
  } = vm;

  return (
    <div className="relative min-h-screen text-foreground">
      <ChallengeInvitePrompt />
      <AppShellPageChrome />
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
                <AppShellLobbyDebugBadge
                  lobbyDebugMismatch={lobbyDebugMismatch}
                  localWaitingLobbyId={localWaitingLobbyId}
                  sessionWaitingLobbyId={sessionWaitingLobbyId}
                  sessionStateLabel={sessionStateLabel}
                  rankedGeoHintDebug={rankedGeoHintDebug}
                />
              )}
              <AppShellCurrencyPills variant="desktop" coins={navbarCoins} tickets={navbarTickets} />

              <div className="h-6 w-px bg-border/50" />

              {/* Notifications */}
              <NotificationsDropdown badgeCount={socialBadgeCount} />

              <AppShellProfileMenu
                variant="desktop"
                playerStats={playerStats}
                authUserCountry={authUser?.country}
                onRequestLogout={() => setShowLogoutConfirm(true)}
              />
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
                  <AppShellProfileMenu
                    variant="mobile"
                    playerStats={playerStats}
                    authUserCountry={authUser?.country}
                    onRequestLogout={() => setShowLogoutConfirm(true)}
                  />
                </div>

                <div className="flex items-center gap-2 z-10">
                  <AppShellCurrencyPills variant="mobile" coins={navbarCoins} tickets={navbarTickets} />
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

      <AppShellLogoutDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        onConfirm={handleLogout}
      />
    </div>
  );
}
