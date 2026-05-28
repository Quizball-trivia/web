"use client";

/* eslint-disable @next/next/no-img-element -- Small navbar currency icons are static decorative assets. */

import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown";
import { ChallengeInvitePrompt } from "@/components/layout/ChallengeInvitePrompt";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n/messages";

import type { AppShellProps } from "./app-shell/appShell.types";
import { MOBILE_NAV_ITEMS } from "./app-shell/appShell.helpers";
import { useAppShellViewModel } from "./app-shell/useAppShellViewModel";
import { AppShellPageChrome } from "./app-shell/AppShellPageChrome";
import { AppShellLogoutDialog } from "./app-shell/AppShellLogoutDialog";
import { AppShellCurrencyPills } from "./app-shell/AppShellCurrencyPills";
import { AppShellLobbyDebugBadge } from "./app-shell/AppShellLobbyDebugBadge";
import { AppShellProfileMenu } from "./app-shell/AppShellProfileMenu";
import { AppShellBanners } from "./app-shell/AppShellBanners";

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
            <AppShellBanners variant="desktop" vm={vm} />
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
          <AppShellBanners variant="mobile" vm={vm} />
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
