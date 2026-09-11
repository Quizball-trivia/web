"use client";

import { ChallengeInvitePrompt } from "@/components/layout/ChallengeInvitePrompt";
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown";
import { Sidebar } from "@/components/layout/Sidebar";

import type { AppShellProps } from "./app-shell/appShell.types";
import { useAppShellViewModel } from "./app-shell/useAppShellViewModel";
import { AppShellPageChrome } from "./app-shell/AppShellPageChrome";
import { AppShellLogoutDialog } from "./app-shell/AppShellLogoutDialog";
import { AppShellBanners } from "./app-shell/AppShellBanners";
import { EventAwardCeremony } from "@/components/shared/EventAwardCeremony";
import { AppShellCurrencyPills } from "./app-shell/AppShellCurrencyPills";
import { AppShellLobbyDebugBadge } from "./app-shell/AppShellLobbyDebugBadge";
import { AppShellMobileBottomNav } from "./app-shell/AppShellMobileBottomNav";
import { AppShellProfileMenu } from "./app-shell/AppShellProfileMenu";
import { ConnectionQualitySignal } from "@/components/shared/ConnectionQualitySignal";
import { GuestAuthDialog } from "@/features/auth/GuestAuthDialog";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useIsGuest } from "@/lib/auth/useIsGuest";
import { rememberPostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { hubPath, isGuestAllowedPath, publicLocaleOf } from "@/lib/routes/publicHub";
import { useAuthPromptStore } from "@/stores/authPrompt.store";
import { useLocale } from "@/contexts/LocaleContext";

export function AppShell({ children }: AppShellProps) {
  const vm = useAppShellViewModel();
  const { t, locale } = useLocale();
  // Guest mode: signed-out visitors browsing the hub get a Sign-in button
  // instead of the profile/coins cluster, and any nav tap that isn't a public
  // surface opens the sign-in dialog instead of navigating.
  const isGuest = useIsGuest();
  const openAuthPrompt = useAuthPromptStore((state) => state.open);
  // Signed-out visitors stay on their locale hub; the geo redirect on "/" is
  // never the logo target, and members go to their Play.
  const publicLocale = publicLocaleOf(vm.currentPath);
  const homeHref = isGuest ? hubPath(publicLocale ?? locale) : "/play";
  const guestNavGuard = (event: React.MouseEvent) => {
    if (!isGuest) return;
    const href = (event.target as HTMLElement).closest("a")?.getAttribute("href");
    if (!href || isGuestAllowedPath(href.split(/[?#]/)[0])) return;
    event.preventDefault();
    event.stopPropagation();
    // Return to what they asked for after sign-in (non-returnable paths fall through to /play).
    rememberPostAuthRedirect(href);
    openAuthPrompt();
  };
  const signIn = () => {
    rememberPostAuthRedirect(vm.currentPath);
    openAuthPrompt();
  };
  const signInButton = (
    <div className="flex items-center gap-2" data-chrome="guest">
      {/* Suspense: the switcher reads search params, which must not bail the whole shell out of static rendering. */}
      {publicLocale && <Suspense fallback={null}><LanguageSwitcher locale={publicLocale} className="h-10 min-h-0" /></Suspense>}
      <button
        type="button"
        onClick={signIn}
        className="flex h-10 items-center justify-center rounded-xl bg-brand-yellow px-5 font-poppins text-sm font-black uppercase tracking-wide text-black transition-colors hover:bg-brand-yellow-deep"
      >
        {t("welcome.signInTab")}
      </button>
    </div>
  );
  const {
    playerStats,
    authUser,
    showHeader,
    showNav,
    isPathActive,
    navbarCoins,
    navbarTickets,
    socialBadgeCount,
    bellBadgeCount,
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
    <div className="relative min-h-screen text-foreground" data-shell="app">
      <ChallengeInvitePrompt />
      <AppShellPageChrome />

      <div className="relative z-10 flex min-h-screen flex-col xl:grid xl:h-dvh xl:grid-cols-[auto_minmax(0,1fr)] xl:overflow-hidden">
        {/* DESKTOP SIDEBAR (>= xl) */}
        <div className="hidden xl:block" onClickCapture={guestNavGuard}>
          <Sidebar currentPath={vm.navPath} homeHref={homeHref} socialBadgeCount={socialBadgeCount} />
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
              {isGuest ? (
                signInButton
              ) : (
                <>
                  <AppShellCurrencyPills variant="desktop" coins={navbarCoins} tickets={navbarTickets} />

                  <div className="h-6 w-px bg-border/50" />

                  <NotificationsDropdown badgeCount={bellBadgeCount} />

                  <AppShellProfileMenu
                    variant="desktop"
                    playerStats={playerStats}
                    authUserCountry={authUser?.country}
                    onRequestLogout={() => setShowLogoutConfirm(true)}
                  />
                </>
              )}
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
                    {!isGuest && (
                      <AppShellProfileMenu
                        variant="mobile"
                        playerStats={playerStats}
                        authUserCountry={authUser?.country}
                        onRequestLogout={() => setShowLogoutConfirm(true)}
                      />
                    )}
                  </div>

                  {/* No ping pill on mobile — it crowded the row / pushed the
                      card down. It stays on desktop and in-match. shrink-0 keeps
                      coins/tickets/bell intact. */}
                  <div className="z-10 flex shrink-0 items-center gap-2">
                    {isGuest ? (
                      signInButton
                    ) : (
                      <>
                        <AppShellCurrencyPills variant="mobile" coins={navbarCoins} tickets={navbarTickets} />
                        <NotificationsDropdown badgeCount={bellBadgeCount} />
                      </>
                    )}
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
            <EventAwardCeremony />
          </div>
        </div>
      </div>

      {/* MOBILE / TABLET BOTTOM NAV (< xl) */}
      {showNav && (
        <div className="xl:hidden" onClickCapture={guestNavGuard}>
          <AppShellMobileBottomNav
            isPathActive={isPathActive}
            homeHref={homeHref}
            socialBadgeCount={socialBadgeCount}
          />
        </div>
      )}

      {/* Sign-in dialog for guests — summoned from the header button, gated
          nav taps, and auth-gated game entries via useAuthPromptStore. */}
      {isGuest && <GuestAuthDialog />}

      <AppShellLogoutDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        onConfirm={handleLogout}
      />
    </div>
  );
}
