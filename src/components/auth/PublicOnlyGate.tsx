"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { getAuthenticatedEntryRoute } from "@/lib/auth/onboarding";

type PublicOnlyGateProps = {
  children: React.ReactNode;
};

export default function PublicOnlyGate({ children }: PublicOnlyGateProps) {
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
    if (status === "authenticated") {
      router.replace(getAuthenticatedEntryRoute(user));
    }
  }, [status, user, router]);

  if (status === "loading") {
    return <LoadingScreen fullScreen />;
  }

  if (status === "authenticated") {
    return null;
  }

  return <>{children}</>;
}
