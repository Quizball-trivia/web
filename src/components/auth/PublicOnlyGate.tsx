"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";

type PublicOnlyGateProps = {
  children: React.ReactNode;
};

export default function PublicOnlyGate({ children }: PublicOnlyGateProps) {
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
    if (status === "authenticated") {
      router.replace("/play");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return <>{children}</>;
}
