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

  useEffect(() => {
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/auth/welcome");
    }
  }, [status, router]);

  useEffect(() => {
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
  }, [pathname, router, status, user]);

  if (status === "loading") {
    return <LoadingScreen text="Warming Up..." />;
  }

  if (status !== "authenticated") {
    return null;
  }

  return <>{children}</>;
}
