"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { getPostAuthEntryRoute } from "@/lib/auth/postAuthRedirect";
import { AccountBannedScreen } from "@/features/auth/AccountBannedScreen";

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
  const pathname = usePathname();
  // The OAuth callback navigates on its own (and consumes the saved return path): redirecting here too would find
  // that path already used and send the player to /play instead of where they were going.
  const callbackOwnsNavigation = pathname?.startsWith("/auth/callback") ?? false;
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
    if (status === "authenticated" && !callbackOwnsNavigation) {
      router.replace(getPostAuthEntryRoute(user));
    }
  }, [status, user, router, callbackOwnsNavigation]);

  if (status === "authenticated" && !callbackOwnsNavigation) {
    return null;
  }

  if (status === "banned") {
    return <AccountBannedScreen />;
  }

  return <>{children}</>;
}
