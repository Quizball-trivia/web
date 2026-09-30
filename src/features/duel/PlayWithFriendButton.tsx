"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { GUEST_LOBBIES_ENABLED } from "@/lib/config";
import { useAuthStore } from "@/stores/auth.store";
import type { Locale } from "@/lib/i18n/locale";
import type { DuelGameId } from "@/lib/realtime/socket.types";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { duelCopy } from "./duel.copy";

const ENABLED = (process.env.NEXT_PUBLIC_DUEL_GAMES ?? "").split(",").map((game) => game.trim()).filter(Boolean);

/** The button's look: shared by the real button and the games playground (which passes its own click). */
export const FRIEND_BUTTON_CLASS = "flex h-12 items-center justify-center gap-2 rounded-full bg-brand-blue text-sm font-black uppercase tracking-wide text-white hover:bg-brand-blue/85";

export function PlayWithFriendContent({ game, locale }: { game: DuelGameId; locale: Locale }) {
  const c = duelCopy(locale);
  return (
    <>
      <Users className="size-4" />{c.playWithFriend}
      <span id={`duel-hint-${game}`} className="sr-only">{c.playWithFriendHint}</span>
    </>
  );
}

/**
 * The daily's way into a friend duel: a private room for this game with an invite link. A plain link, so it
 * works on the public game pages too (they have no socket); the room page creates the room, guests included.
 */
export function PlayWithFriendButton({ game, locale, className }: { game: DuelGameId; locale: Locale; className?: string }) {
  const authStatus = useAuthStore((state) => state.status);
  // Without guest rooms a signed-out player would only be bounced off the room page.
  if (!ENABLED.includes(game) || (!GUEST_LOBBIES_ENABLED && authStatus !== "authenticated")) return null;
  return (
    // App routes read the stored language, not the SEO page's URL: keep the room in the language the player is reading.
    <Link href={`/friend/room/new?duel=${game}`} prefetch={false} onClick={() => storage.set(STORAGE_KEYS.LOCALE, locale)}
      className={cn(FRIEND_BUTTON_CLASS, className)} style={{ fontFamily: "'Poppins', sans-serif" }} aria-describedby={`duel-hint-${game}`}>
      <PlayWithFriendContent game={game} locale={locale} />
    </Link>
  );
}
