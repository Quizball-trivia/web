"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { rememberPostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import {
  trackGameCardClick,
  trackGamesSignupClick,
  trackRankedEntryClick,
  trackWeekendLeagueEntryClick,
  type PublicSurface,
} from "@/lib/analytics/public-games.analytics";
import { SIGN_IN_PATH } from "@/lib/seo/public-games";

const useAccess = () => (useAuthStore((state) => state.status) === "authenticated" ? "member" : "guest");

/** A crawlable card link that records which public card was chosen and where it led. */
export function GameCardLink({ href, modeId, group, surface, destination, className, children }: {
  href: string; modeId: string; group: string; surface: PublicSurface; destination: "page" | "quiz" | "app"; className?: string; children: ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => trackGameCardClick({ modeId, surface, group, destination })}>
      {children}
    </Link>
  );
}

/**
 * Sign-in / app entry from a public page: remembers the current public page so
 * the visitor returns here after authentication, and records the intent.
 */
export function SignInLink({ href = SIGN_IN_PATH, placement, modeId, returnTo, className, children }: {
  href?: string; placement: string; modeId?: string; returnTo?: string; className?: string; children: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        rememberPostAuthRedirect(returnTo ?? pathname);
        trackGamesSignupClick({ modeId, page: pathname ?? "", placement, destination: href });
      }}
    >
      {children}
    </Link>
  );
}

export function CompetitiveLink({ kind, href, placement, className, children }: {
  kind: "ranked" | "weekend_league"; href: string; placement: string; className?: string; children: ReactNode;
}) {
  const access = useAccess();
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        rememberPostAuthRedirect(href);
        if (kind === "ranked") trackRankedEntryClick({ access, placement });
        else trackWeekendLeagueEntryClick({ access, placement });
      }}
    >
      {children}
    </Link>
  );
}

/** Header control: members see "Open play", guests "Sign in" — both open the app. */
export function HeaderPlayLink({ signIn, openPlay, className }: { signIn: string; openPlay: string; className?: string }) {
  const access = useAccess();
  const pathname = usePathname();
  return (
    <Link href={access === "member" ? "/play" : SIGN_IN_PATH} className={className} onClick={() => { if (access === "guest") { rememberPostAuthRedirect(pathname); trackGamesSignupClick({ page: pathname ?? "", placement: "header", destination: SIGN_IN_PATH }); } }}>
      {access === "member" ? openPlay : signIn}
    </Link>
  );
}
