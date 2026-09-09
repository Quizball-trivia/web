"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { rememberPostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import {
  trackGameCardClick,
  trackGamesSignupClick,
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
export function SignInLink({ href = SIGN_IN_PATH, placement, modeId, returnTo, memberHref, memberLabel, className, children }: {
  href?: string; placement: string; modeId?: string; returnTo?: string;
  /** A member goes straight to the game (they never complete another sign-in that would consume `returnTo`). */
  memberHref?: string; memberLabel?: ReactNode; className?: string; children: ReactNode;
}) {
  const pathname = usePathname();
  const access = useAccess();
  if (access === "member") {
    return <Link href={memberHref ?? returnTo ?? "/play"} className={className}>{memberLabel ?? children}</Link>;
  }
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
