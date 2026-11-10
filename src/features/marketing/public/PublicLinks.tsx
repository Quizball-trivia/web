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
import { SIGN_IN_PATH } from "@/lib/seo/public-game-runtime";
import { GUEST_LOBBIES_ENABLED, ROOM_GAMES_ENABLED } from "@/lib/config";
import { isRoomGameEnabled } from "@/lib/lobby/lobbyModes";
import { STORAGE_KEYS, storage } from "@/utils/storage";

const useAccess = () => (useAuthStore((state) => state.status) === "authenticated" ? "member" : "guest");

/** A crawlable card link that records which public card was chosen and where it led. */
export function GameCardLink({ href, modeId, group, surface, destination, className, children }: {
  href: string; modeId: string; group: string; surface: PublicSurface; destination: "page" | "quiz" | "app"; className?: string; children: ReactNode;
}) {
  return (
    <Link href={href} prefetch={false} className={className} onClick={() => trackGameCardClick({ modeId, surface, group, destination })}>
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
    return <Link href={memberHref ?? returnTo ?? "/play"} prefetch={false} className={className}>{memberLabel ?? children}</Link>;
  }
  return (
    <Link
      href={href}
      prefetch={false}
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

/** The room game a `/friend/room/new?room=<id>` path names, or null for any other path. */
export function roomGameOfPath(href: string): string | null {
  const [path, query = ""] = href.split("?");
  if (path !== "/friend/room/new") return null;
  return new URLSearchParams(query).get("room");
}

/**
 * Entry to a private friends' room from its public page (`guest: "room"`). Only a navigation link: the room page
 * itself creates the room, so rendering, re-mounting or clicking this never calls the API or opens a socket.
 *
 * - Room game switched off (NEXT_PUBLIC_ROOM_GAMES_DISABLED): renders nothing, no actionable creation link.
 * - Member, or guest while guest lobbies are on: links straight to the room creator.
 * - Auth still loading while guest lobbies are off: an inert, non-link placeholder (no sign-in, nothing remembered).
 * - Signed-out guest while guest lobbies are off: links to sign-in and returns to `returnTo`, the localized public
 *   page (the room URL `/friend/room/new?room=…` is not an accepted post-auth redirect, so it is never remembered).
 *
 * Both paths store the page's language first: app routes read the stored language, not the SEO URL.
 */
export function RoomEntryLink({ href, locale, returnTo, modeId, placement, signInLabel, className, children }: {
  /** The room creator, e.g. `/friend/room/new?room=mentalista`. */
  href: string; locale: string;
  /** The localized public page a signed-out visitor returns to after signing in. */
  returnTo: string; modeId: string; placement: string;
  /** Label of the sign-in link shown instead when a guest cannot open a room. */
  signInLabel: ReactNode; className?: string; children: ReactNode;
}) {
  // The exact status, not useAccess: "loading" must not be read as a signed-out guest.
  const status = useAuthStore((state) => state.status);
  const pathname = usePathname();
  if (!isRoomGameEnabled(roomGameOfPath(href), ROOM_GAMES_ENABLED)) return null;
  const saveLocale = () => storage.set(STORAGE_KEYS.LOCALE, locale);
  const member = status === "authenticated";
  if (member || GUEST_LOBBIES_ENABLED) {
    return <Link href={href} prefetch={false} className={className} data-room-entry="room" onClick={saveLocale}>{children}</Link>;
  }
  // Auth still settling with guest rooms off: a returning member must not be sent to sign-in (and nothing is
  // remembered), so show an inert placeholder until the status is known.
  if (status !== "anonymous") {
    return <span className={className} data-room-entry="pending" aria-disabled="true">{children}</span>;
  }
  return (
    <Link
      href={SIGN_IN_PATH}
      prefetch={false}
      className={className}
      data-room-entry="sign-in"
      onClick={() => {
        saveLocale();
        rememberPostAuthRedirect(returnTo);
        trackGamesSignupClick({ modeId, page: pathname ?? "", placement, destination: SIGN_IN_PATH });
      }}
    >
      {signInLabel}
    </Link>
  );
}
