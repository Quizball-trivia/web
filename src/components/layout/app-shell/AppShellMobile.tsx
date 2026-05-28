'use client';

/**
 * Mobile / tablet layout (< xl). Header (profile + currencies +
 * notifications) only on HEADER_PATHS, banners, scrollable content
 * with the children, and a fixed bottom navigation when the route
 * isn't in HIDE_NAV_PATHS.
 */

import { NotificationsDropdown } from '@/components/layout/NotificationsDropdown';
import { AppShellCurrencyPills } from './AppShellCurrencyPills';
import { AppShellProfileMenu } from './AppShellProfileMenu';
import { AppShellBanners } from './AppShellBanners';
import { AppShellMobileBottomNav } from './AppShellMobileBottomNav';
import type { useAppShellViewModel } from './useAppShellViewModel';

type AppShellViewModel = ReturnType<typeof useAppShellViewModel>;

interface AppShellMobileProps {
  vm: AppShellViewModel;
  children: React.ReactNode;
}

export function AppShellMobile({ vm, children }: AppShellMobileProps) {
  const {
    playerStats,
    authUser,
    showHeader,
    showNav,
    isPathActive,
    navbarCoins,
    navbarTickets,
    socialBadgeCount,
    setShowLogoutConfirm,
  } = vm;

  return (
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
        <AppShellMobileBottomNav
          isPathActive={isPathActive}
          socialBadgeCount={socialBadgeCount}
        />
      )}
    </div>
  );
}
