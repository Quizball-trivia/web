"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { AccountBannedScreen } from "@/features/auth/AccountBannedScreen";
import { isOnboardingComplete } from "@/lib/auth/onboarding";
import { consumePostAuthRedirect, peekPostAuthRedirect, rememberPostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { useLocale } from "@/contexts/LocaleContext";
import { stopBgm } from "@/lib/sounds/gameSounds";
import { isGuestAllowedPath } from "@/lib/routes/publicHub";
import { GuestAuthDialog } from "@/features/auth/GuestAuthDialog";
import { useAuthPromptStore } from "@/stores/authPrompt.store";

type AppAuthGateProps = {
  children: React.ReactNode;
};

export default function AppAuthGate({ children }: AppAuthGateProps) {
  const { t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const isAuthPromptOpen = useAuthPromptStore((state) => state.isOpen);
  const closeAuthPrompt = useAuthPromptStore((state) => state.close);
  const hasBootstrapped = useRef(false);
  const isDevelopmentDevRoute = process.env.NODE_ENV === "development" && (pathname?.startsWith("/dev") ?? false);

  useEffect(() => {
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (isDevelopmentDevRoute) return;
    if (status === "anonymous" && !isGuestAllowedPath(pathname)) {
      stopBgm(0);
      rememberPostAuthRedirect(pathname);
      // The landing is retired — signed-out visitors land on the guest Play
      // page, where the header/nav offer the sign-in dialog.
      router.replace("/play");
    }
  }, [isDevelopmentDevRoute, pathname, status, router]);

  useEffect(() => {
    if (isDevelopmentDevRoute) return;
    if (status !== "authenticated" || !user) return;

    const currentPath = pathname ?? "/";
    const onOnboardingPage = currentPath.startsWith("/onboarding");
    const completed = isOnboardingComplete(user);

    if (!completed && !onOnboardingPage) {
      if (!peekPostAuthRedirect()) rememberPostAuthRedirect(currentPath);
      if (isAuthPromptOpen) closeAuthPrompt();
      router.replace("/onboarding");
      return;
    }

    if (completed && onOnboardingPage) {
      if (isAuthPromptOpen) closeAuthPrompt();
      router.replace(consumePostAuthRedirect() ?? "/play");
    } else if (completed && isAuthPromptOpen) {
      closeAuthPrompt();
      router.replace(consumePostAuthRedirect() ?? "/play");
    }
  }, [isDevelopmentDevRoute, pathname, router, status, user, isAuthPromptOpen, closeAuthPrompt]);

  // This gate wraps both the normal app and fullscreen game routes. Owning
  // the prompt here keeps post-game sign-in available in either layout, and
  // navigation survives the guest UI unmounting after authentication.
  const page = <>{children}{(status === "anonymous" || isAuthPromptOpen) && <GuestAuthDialog />}</>;

  if (isDevelopmentDevRoute) {
    return <>{children}</>;
  }

  if (status === "banned") {
    return <AccountBannedScreen />;
  }

  // Guest-visible routes render straight away, even before the session check
  // finishes: the server HTML then carries the real page (crawlable, and no
  // loading screen for guests). A signed-in player sees the guest chrome for
  // the split second until their session resolves, then the app takes over.
  if ((status === "loading" || status === "anonymous") && isGuestAllowedPath(pathname)) {
    return page;
  }

  if (status === "loading") {
    return <LoadingScreen text={t("appAuthGate.warmingUp")} />;
  }

  if (status !== "authenticated") {
    return <LoadingScreen text={t("appAuthGate.redirecting")} />;
  }

  return page;
}
