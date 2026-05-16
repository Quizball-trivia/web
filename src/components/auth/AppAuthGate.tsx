"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { isOnboardingComplete } from "@/lib/auth/onboarding";

type AppAuthGateProps = {
  children: React.ReactNode;
};

export default function AppAuthGate({ children }: AppAuthGateProps) {
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
    if (status === "anonymous") {
      router.replace("/auth/welcome");
    }
  }, [isDevelopmentDevRoute, status, router]);

  useEffect(() => {
    if (isDevelopmentDevRoute) return;
    if (status !== "authenticated" || !user) return;

    const currentPath = pathname ?? "/";
    const onOnboardingPage = currentPath.startsWith("/onboarding");
    const completed = isOnboardingComplete(user);

    if (!completed && !onOnboardingPage) {
      router.replace("/onboarding");
      return;
    }

    if (completed && onOnboardingPage) {
      router.replace("/play");
    }
  }, [isDevelopmentDevRoute, pathname, router, status, user]);

  if (isDevelopmentDevRoute) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return <LoadingScreen text="Warming Up..." />;
  }

  if (status !== "authenticated") {
    return <LoadingScreen text="Redirecting..." />;
  }

  return <>{children}</>;
}
