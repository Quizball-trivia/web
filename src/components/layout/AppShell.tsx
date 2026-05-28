"use client";

import { ChallengeInvitePrompt } from "@/components/layout/ChallengeInvitePrompt";

import type { AppShellProps } from "./app-shell/appShell.types";
import { useAppShellViewModel } from "./app-shell/useAppShellViewModel";
import { AppShellPageChrome } from "./app-shell/AppShellPageChrome";
import { AppShellLogoutDialog } from "./app-shell/AppShellLogoutDialog";
import { AppShellDesktop } from "./app-shell/AppShellDesktop";
import { AppShellMobile } from "./app-shell/AppShellMobile";

export function AppShell({ children }: AppShellProps) {
  const vm = useAppShellViewModel();
  const { showLogoutConfirm, setShowLogoutConfirm, handleLogout } = vm;

  return (
    <div className="relative min-h-screen text-foreground">
      <ChallengeInvitePrompt />
      <AppShellPageChrome />

      {/* DESKTOP LAYOUT (>= xl) — tablets including iPad Pro portrait get the mobile shell */}
      <AppShellDesktop vm={vm}>{children}</AppShellDesktop>

      {/* MOBILE / TABLET LAYOUT (< xl) */}
      <AppShellMobile vm={vm}>{children}</AppShellMobile>

      <AppShellLogoutDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        onConfirm={handleLogout}
      />
    </div>
  );
}
