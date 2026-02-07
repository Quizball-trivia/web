"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

type AppAuthGateProps = {
  children: React.ReactNode;
};

export default function AppAuthGate({ children }: AppAuthGateProps) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
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

  if (status === "loading") {
    return <LoadingScreen text="Warming Up..." />;
  }

  if (status !== "authenticated") {
    return null;
  }

  return <>{children}</>;
}
