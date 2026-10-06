"use client";

import { useId } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { GUEST_LOBBIES_ENABLED, ROOM_GAMES_ENABLED } from "@/lib/config";
import { useAuthStore } from "@/stores/auth.store";
import type { Locale } from "@/lib/i18n/locale";
import { storage, STORAGE_KEYS } from "@/utils/storage";

const COPY: Record<Locale, { label: string; hint: string }> = {
  es: { label: "Jugar con amigos (2–6)", hint: "Sala privada: compartí el enlace y jueguen en vivo, sin cuenta." },
  en: { label: "Play with friends (2–6)", hint: "A private room: share the link and play live, no account needed." },
  ka: { label: "მეგობრებთან თამაში (2–6)", hint: "პირადი ოთახი: გაუზიარე ბმული და ითამაშეთ ერთად, ანგარიშის გარეშე." },
  tr: { label: "Arkadaşlarla oyna (2–6)", hint: "Özel oda: bağlantıyı paylaş, hesap olmadan canlı oynayın." },
};

/**
 * The daily's way into a 2–6 player room of the same game: a plain link (works on public pages, which have no socket);
 * the room page creates the room, guests included. "white" sits on brand-blue cards, "blue" on the page background.
 */
const ROOM_HREF = "/friend/room/new?room=aproximado";

/**
 * `onNavigate`: inside a flow that must finish first (a daily's results, whose completion retries a failed save), the
 * click is handed to it with the room's address instead of navigating on its own.
 */
export function PlayRoomWithFriendsButton({ locale, tone = "blue", showHint = false, className, onBeforeLeave, onNavigate }: {
  locale: Locale; tone?: "blue" | "white"; showHint?: boolean; className?: string; onBeforeLeave?: () => void;
  onNavigate?: (href: string) => void;
}) {
  const authStatus = useAuthStore((state) => state.status);
  const hintId = useId();
  if (!ROOM_GAMES_ENABLED.includes("aproximado") || (!GUEST_LOBBIES_ENABLED && authStatus !== "authenticated")) return null;
  const c = COPY[locale] ?? COPY.en;
  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {/* App routes read the stored language, not the page URL: keep the room in the language the player is reading. */}
      <Link href={ROOM_HREF} prefetch={false} aria-describedby={hintId}
        onClick={(event) => {
          storage.set(STORAGE_KEYS.LOCALE, locale);
          onBeforeLeave?.();
          if (onNavigate) {
            event.preventDefault();
            onNavigate(ROOM_HREF);
          }
        }}
        className={cn("flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-black uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
          tone === "white" ? "bg-white text-brand-blue hover:bg-white/90" : "bg-brand-blue text-white hover:bg-brand-blue/85")}
        style={{ fontFamily: "'Poppins', sans-serif" }}>
        <Users className="size-4" aria-hidden />{c.label}
      </Link>
      <span id={hintId} className={showHint ? "text-center text-xs font-medium text-white/75" : "sr-only"}>{c.hint}</span>
    </div>
  );
}
