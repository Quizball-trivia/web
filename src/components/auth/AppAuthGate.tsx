"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { AccountBannedScreen } from "@/features/auth/AccountBannedScreen";
import { isOnboardingComplete } from "@/lib/auth/onboarding";
import { consumePostAuthRedirect, rememberPostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { useLocale } from "@/contexts/LocaleContext";
import { stopBgm } from "@/lib/sounds/gameSounds";

type AppAuthGateProps = {
  children: React.ReactNode;
};

/** Routes a signed-out visitor may browse in guest mode: demo play is open,
 *  and every auth-gated action opens the sign-in dialog instead of redirecting
 *  to the landing. First step toward retiring the landing page entirely. */
const GUEST_ALLOWED_ROUTES = ["/play"];

function isGuestAllowedPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return GUEST_ALLOWED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export default function AppAuthGate({ children }: AppAuthGateProps) {
  const { t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const bootstrap = useAuthStore((state) => state.bootstrap);
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
      rememberPostAuthRedirect(currentPath);
      router.replace("/onboarding");
      return;
    }

    if (completed && onOnboardingPage) {
      router.replace(consumePostAuthRedirect() ?? "/play");
    }
  }, [isDevelopmentDevRoute, pathname, router, status, user]);

  if (isDevelopmentDevRoute) {
    return <>{children}</>;
  }

  if (status === "banned") {
    return <AccountBannedScreen />;
  }

  if (status === "loading") {
    return <LoadingScreen text={t("appAuthGate.warmingUp")} />;
  }

  // Guest mode: a signed-out visitor browses the allowed routes directly; the
  // page itself gates auth-only actions behind the sign-in dialog.
  if (status === "anonymous" && isGuestAllowedPath(pathname)) {
    return <>{children}</>;
  }

  if (status !== "authenticated") {
    return <LoadingScreen text={t("appAuthGate.redirecting")} />;
  }

  return <>{children}</>;
}
