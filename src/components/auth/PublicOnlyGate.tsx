"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { getPostAuthEntryRoute } from "@/lib/auth/postAuthRedirect";

type PublicOnlyGateProps = {
  children: React.ReactNode;
};

// Renders children while auth status is loading or unauthenticated so the
// public landing/legal pages have real content in the server-rendered HTML
// (crawlers don't wait for client bootstrap). If bootstrap resolves to
// `authenticated`, redirect to the in-app entry route — authed users see a
// brief flash of the landing, which is acceptable and rare.
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
      router.replace(getPostAuthEntryRoute(user));
    }
  }, [status, user, router]);

  if (status === "authenticated") {
    return null;
  }

  return <>{children}</>;
}
