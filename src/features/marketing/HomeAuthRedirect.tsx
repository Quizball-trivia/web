"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";

/**
 * The hubs are the front door for guests and search engines; a signed-in
 * player has no reason to see marketing and goes straight to the app.
 * Waits for the session to resolve so a signed-in user never flashes the hub.
 */
export function HomeAuthRedirect() {
  const status = useAuthStore((state) => state.status);
  const router = useRouter();
  useEffect(() => {
    if (status === "authenticated") router.replace("/play");
  }, [router, status]);
  return null;
}
