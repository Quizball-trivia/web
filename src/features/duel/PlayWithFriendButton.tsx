"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/locale";
import type { DuelGameId } from "@/lib/realtime/socket.types";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { duelCopy } from "./duel.copy";

const ENABLED = (process.env.NEXT_PUBLIC_DUEL_GAMES ?? "").split(",").map((game) => game.trim()).filter(Boolean);

/**
 * The daily's way into a friend duel: a private room for this game with an invite link. A plain link, so it
 * works on the public game pages too (they have no socket); the room page creates the room, guests included.
 */
export function PlayWithFriendButton({ game, locale, className }: { game: DuelGameId; locale: Locale; className?: string }) {
  if (!ENABLED.includes(game)) return null;
  const c = duelCopy(locale);
  return (
    // App routes read the stored language, not the SEO page's URL: keep the room in the language the player is reading.
    <Link href={`/friend/room/new?duel=${game}`} prefetch={false} onClick={() => storage.set(STORAGE_KEYS.LOCALE, locale)}
      className={cn("flex h-12 items-center justify-center gap-2 rounded-full border border-sky-300/40 bg-sky-300/10 text-sm font-black uppercase tracking-wide text-sky-200 hover:bg-sky-300/20", className)}
      style={{ fontFamily: "'Poppins', sans-serif" }} aria-describedby={`duel-hint-${game}`}>
      <Users className="size-4" />{c.playWithFriend}
      <span id={`duel-hint-${game}`} className="sr-only">{c.playWithFriendHint}</span>
    </Link>
  );
}
