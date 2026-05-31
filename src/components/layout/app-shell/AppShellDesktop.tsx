'use client';

/**
 * Desktop layout (>= xl). Sidebar + topbar (debug pill, currencies,
 * notifications, profile menu) + the scrollable content area with
 * banners and {children}.
 *
 * iPad Pro portrait + smaller still gets the mobile shell via the
 * `xl:hidden` / `hidden xl:flex` Tailwind pair.
 */

import { Sidebar } from '@/components/layout/Sidebar';
import { NotificationsDropdown } from '@/components/layout/NotificationsDropdown';
import { AppShellLobbyDebugBadge } from './AppShellLobbyDebugBadge';
import { AppShellCurrencyPills } from './AppShellCurrencyPills';
import { AppShellProfileMenu } from './AppShellProfileMenu';
import { AppShellBanners } from './AppShellBanners';
import type { useAppShellViewModel } from './useAppShellViewModel';

type AppShellViewModel = ReturnType<typeof useAppShellViewModel>;

interface AppShellDesktopProps {
  vm: AppShellViewModel;
  children: React.ReactNode;
}

export function AppShellDesktop({ vm, children }: AppShellDesktopProps) {
  const {
    playerStats,
    authUser,
    currentPath,
    navbarCoins,
    navbarTickets,
    socialBadgeCount,
    showLobbyDebug,
    lobbyDebugMismatch,
    localWaitingLobbyId,
    sessionWaitingLobbyId,
    sessionStateLabel,
    rankedGeoHintDebug,
    setShowLogoutConfirm,
  } = vm;

  return (
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
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
