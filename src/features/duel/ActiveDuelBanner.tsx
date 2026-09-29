"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Swords } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import type { Locale } from "@/lib/i18n/locale";
import { useActiveDuelStore } from "@/stores/activeDuel.store";
import { ensureGuestPrincipal, useRealtimePrincipal } from "@/lib/realtime/realtime-principal";
import { useAuthStore } from "@/stores/auth.store";
import { duelCopy } from "./duel.copy";

/** Anywhere on the site, a player with a live duel (a closed tab, a detour) gets one tap back to it. */
export function ActiveDuelBanner({ className }: { className?: string }) {
  const principal = useRealtimePrincipal();
  const owner = principal.userId;
  // current() applies the owner and the age cap, so a pointer older than any possible duel never renders.
  const active = useActiveDuelStore((state) => (state.active ? state.current(owner) : null));
  const hydrate = useActiveDuelStore((state) => state.hydrate);
  const remembers = useActiveDuelStore((state) => state.remembers);
  const authStatus = useAuthStore((state) => state.status);
  const pathname = usePathname();
  const { locale } = useLocale();
  useEffect(() => { hydrate(owner); }, [hydrate, owner]);
  // Guests only resolve their identity on game and room pages; with a remembered duel it is resolved here too.
  useEffect(() => {
    if (owner || authStatus !== "anonymous" || !remembers()) return;
    void ensureGuestPrincipal(locale);
  }, [owner, authStatus, remembers, locale]);
  if (!active || pathname === `/duelo/${active.matchId}`) return null;
  const copy = duelCopy(locale as Locale);
  return (
    <div className={className}>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-sky-300/60 bg-sky-300/10 px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-300/20 text-sky-200"><Swords className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{copy.activeDuel.title}</p>
          <p className="truncate text-xs text-white/65">{copy.games[active.game]}</p>
        </div>
        <Link href={`/duelo/${active.matchId}`} className="shrink-0 rounded-full bg-sky-300 px-4 py-2 text-xs font-black uppercase text-black hover:bg-sky-200">
          {copy.activeDuel.back}
        </Link>
      </div>
    </div>
  );
}
