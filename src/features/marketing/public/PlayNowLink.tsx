"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle, Play } from "lucide-react";
import { rememberPostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { trackPlayNowClick } from "@/lib/analytics/public-games.analytics";
import { ensureGuestPrincipal } from "@/lib/realtime/realtime-principal";
import { SIGN_IN_PATH } from "@/lib/seo/public-games";
import { useAuthStore } from "@/stores/auth.store";
import { useLocale } from "@/contexts/LocaleContext";
import { isSupportedLocale } from "@/lib/i18n/messages";
import { storage, STORAGE_KEYS } from "@/utils/storage";

/**
 * "Play now" on the public Tic Tac Toe / Auction pages. A guest gets a server
 * principal first, then opens the game in practice-bot mode; a member goes to
 * the normal online flow. When guest play is refused (provisioning off, rate
 * limit) the visitor is sent to sign in, like every other member-only CTA.
 */
export function PlayNowLink({ modeId, locale, guestHref, memberHref, className, children }: {
  modeId: string; locale: string; guestHref: string; memberHref: string; className?: string; children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { setLocale } = useLocale();
  const authStatus = useAuthStore((state) => state.status);
  const isMember = authStatus === "authenticated";
  // Until auth has hydrated a returning member would be mistaken for a guest.
  const authPending = authStatus === "loading";
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (busy || authPending) return;
    if (isMember) {
      trackPlayNowClick({ modeId, access: "member", destination: memberHref });
      router.push(memberHref);
      return;
    }
    setBusy(true);
    try {
      const guest = await ensureGuestPrincipal(locale);
      if (!guest) {
        rememberPostAuthRedirect(pathname);
        trackPlayNowClick({ modeId, access: "guest", destination: SIGN_IN_PATH });
        router.push(SIGN_IN_PATH);
        return;
      }
      // Guest games use an unprefixed route and may mount a new provider.
      // Carry the language of the page the visitor explicitly chose to play.
      if (isSupportedLocale(locale)) {
        storage.set(STORAGE_KEYS.LOCALE, locale);
        setLocale(locale);
      }
      trackPlayNowClick({ modeId, access: "guest", destination: guestHref });
      router.push(guestHref);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={() => { void start(); }} disabled={busy || authPending} aria-busy={busy || authPending} className={className}>
      {busy || authPending ? <LoaderCircle className="size-5 animate-spin" /> : <Play className="size-5" />} {children}
    </button>
  );
}
