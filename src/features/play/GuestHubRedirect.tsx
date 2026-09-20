"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { hubPath } from "@/lib/routes/publicHub";
import { useAuthStore } from "@/stores/auth.store";

/**
 * /play is the member alias of the hub. A signed-out visitor who lands on it
 * (old link, bookmark) goes to their locale hub, which carries the public copy.
 * The one exception is the sign-in entry (`/play?signin=1`), where the dialog
 * opens in place and the visitor becomes a member on this page.
 */
export function GuestHubRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const status = useAuthStore((state) => state.status);
  const signingIn = searchParams.get("signin") === "1";
  useEffect(() => {
    if (status === "anonymous" && !signingIn) router.replace(hubPath(locale));
  }, [status, signingIn, locale, router]);
  return null;
}
