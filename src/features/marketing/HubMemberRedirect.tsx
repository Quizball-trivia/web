"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";

/** Members do not stay on the locale hub: /play is their Play, in their saved language. */
export function HubMemberRedirect() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  useEffect(() => {
    if (status === "authenticated") router.replace("/play");
  }, [status, router]);
  return null;
}
