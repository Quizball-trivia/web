"use client";

import { ChallengeInvitePrompt } from "@/components/layout/ChallengeInvitePrompt";
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown";
import { Sidebar } from "@/components/layout/Sidebar";

import type { AppShellProps } from "./app-shell/appShell.types";
import { useAppShellViewModel } from "./app-shell/useAppShellViewModel";
import { AppShellPageChrome } from "./app-shell/AppShellPageChrome";
import { AppShellLogoutDialog } from "./app-shell/AppShellLogoutDialog";
import { AppShellBanners } from "./app-shell/AppShellBanners";
import { AppShellCurrencyPills } from "./app-shell/AppShellCurrencyPills";
import { AppShellLobbyDebugBadge } from "./app-shell/AppShellLobbyDebugBadge";
import { AppShellMobileBottomNav } from "./app-shell/AppShellMobileBottomNav";
import { AppShellProfileMenu } from "./app-shell/AppShellProfileMenu";
import { ConnectionQualitySignal } from "@/components/shared/ConnectionQualitySignal";

export function AppShell({ children }: AppShellProps) {
  const vm = useAppShellViewModel();
  const {
    playerStats,
    authUser,
    currentPath,
    showHeader,
    showNav,
    isPathActive,
    navbarCoins,
    navbarTickets,
    socialBadgeCount,
    showLobbyDebug,
    lobbyDebugMismatch,
    localWaitingLobbyId,
    sessionWaitingLobbyId,
    sessionStateLabel,
    rankedGeoHintDebug,
    showLogoutConfirm,
    setShowLogoutConfirm,
    handleLogout,
  } = vm;

  return (
    <div className="relative min-h-screen text-foreground">
      <ChallengeInvitePrompt />
      <AppShellPageChrome />

      <div className="relative z-10 flex min-h-screen flex-col xl:grid xl:h-dvh xl:grid-cols-[auto_minmax(0,1fr)] xl:overflow-hidden">
        {/* DESKTOP SIDEBAR (>= xl) */}
        <div className="hidden xl:block">
          <Sidebar currentPath={currentPath} socialBadgeCount={socialBadgeCount} />
        </div>

        <div className="flex min-h-screen min-w-0 flex-col xl:min-h-0">
          {/* DESKTOP TOPBAR (>= xl) */}
          <header className="sticky top-0 z-30 hidden h-16 items-center justify-between bg-background/60 px-6 backdrop-blur-md xl:flex">
            {/* Socials + Contact moved into the Sidebar (above the World Cup
                trophy); spacer keeps the right control cluster right-aligned. */}
            <div aria-hidden />

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
              <ConnectionQualitySignal />
              <AppShellCurrencyPills variant="desktop" coins={navbarCoins} tickets={navbarTickets} />

              <div className="h-6 w-px bg-border/50" />

              <NotificationsDropdown badgeCount={socialBadgeCount} />

              <AppShellProfileMenu
                variant="desktop"
                playerStats={playerStats}
                authUserCountry={authUser?.country}
                onRequestLogout={() => setShowLogoutConfirm(true)}
              />
            </div>
          </header>

          {/* MOBILE / TABLET HEADER (< xl) */}
          {showHeader && (
            <div className="xl:hidden">
              <div className="px-4 pb-5 pt-6">
                <div className="relative mb-3 flex items-center justify-between gap-2">
                  {/* min-w-0 lets a long username truncate rather than push the
                      right cluster (incl. the bell) off-screen on narrow phones. */}
                  <div className="z-10 flex min-w-0 items-center gap-2">
                    <AppShellProfileMenu
                      variant="mobile"
                      playerStats={playerStats}
                      authUserCountry={authUser?.country}
                      onRequestLogout={() => setShowLogoutConfirm(true)}
                    />
                  </div>

                  {/* No ping pill on mobile — it crowded the row / pushed the
                      card down. It stays on desktop and in-match. shrink-0 keeps
                      coins/tickets/bell intact. */}
                  <div className="z-10 flex shrink-0 items-center gap-2">
                    <AppShellCurrencyPills variant="mobile" coins={navbarCoins} tickets={navbarTickets} />
                    <NotificationsDropdown badgeCount={socialBadgeCount} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Shared page mount: chrome can be responsive, but route children must only mount once. */}
          <div className="min-h-0 flex-1 overflow-y-auto pb-20 xl:overflow-y-auto xl:overscroll-contain xl:pb-0 xl:scrollbar-hide">
            <div className="hidden xl:block">
              <AppShellBanners variant="desktop" vm={vm} />
            </div>
            <div className="xl:hidden">
              <AppShellBanners variant="mobile" vm={vm} />
            </div>
            <main className="xl:p-6">{children}</main>
          </div>
        </div>
      </div>

      {/* MOBILE / TABLET BOTTOM NAV (< xl) */}
      {showNav && (
        <div className="xl:hidden">
          <AppShellMobileBottomNav
            isPathActive={isPathActive}
            socialBadgeCount={socialBadgeCount}
          />
        </div>
      )}

      <AppShellLogoutDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        onConfirm={handleLogout}
      />
    </div>
  );
}
