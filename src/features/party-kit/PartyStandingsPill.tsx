"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronUp, Crown } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";
import { getRankStyle, PARTY_SUCCESS_FLIGHT_MS, type RankPalette } from "@/features/party/realtime/partyQuizScreen.helpers";
import type { PartyStandingViewModel } from "@/features/party/realtime/partyQuizScreen.types";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;
const avatarOf = (p: PartyStandingViewModel) => p.avatarCustomization ?? { base: p.avatarUrl ?? undefined };
/** The docked bar's height (with its fade): content scroll margins read it so nothing hides under the bar. */
const DOCK_HEIGHT = "6.5rem";

/**
 * Phone standings for 2–6 player party games ("me vs leader"): one bar with my place, my score and how far I am from
 * first, the leader on the right; tapping it opens everyone in a sheet. Hidden from `lg:` up (the standings sidebar).
 * The avatars carry the score-flight anchors (`data-party-score-anchor`, placement "mobile-bottom"), so flights land on
 * me (and on the leader); players not shown get their points without a flight.
 */
export function PartyStandingsPill({ standings, palette = "medals", flyingTo = [] }: {
  standings: PartyStandingViewModel[]; palette?: RankPalette;
  /** userIds of score flights in the air: the avatar they aim at stays until they land. */
  flyingTo?: readonly string[];
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLButtonElement>(null);
  // Scroll margins elsewhere (answer lists scrolled into view) keep clear of the bar while it is shown.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--party-dock-height", DOCK_HEIGHT);
    return () => { root.style.removeProperty("--party-dock-height"); };
  }, []);
  // The sheet is hidden from lg up (the sidebar takes over): close it so no invisible modal keeps blocking the page.
  useEffect(() => {
    const wide = window.matchMedia?.("(min-width: 1024px)");
    if (!wide) return;
    const onChange = (e: MediaQueryListEvent) => { if (e.matches) setOpen(false); };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, []);
  const me = standings.find((p) => p.isSelf) ?? standings[0];
  // Who sits on the right ("leader", or nobody when I lead) changes only after the score flights in the air have
  // landed on the avatars they were aimed at.
  const current = me ? (me.rank === 1 ? "me" : standings[0]?.userId ?? null) : null;
  const [shown, setShown] = useState(current);
  const shownIsTarget = shown !== null && shown !== "me" && flyingTo.includes(shown);
  useEffect(() => {
    // Re-runs when that avatar's last flight lands (shownIsTarget turns false), then waits a full flight again in
    // case another one is about to take off.
    if (current === shown || shownIsTarget) return;
    const id = window.setTimeout(() => setShown(current), PARTY_SUCCESS_FLIGHT_MS + 150);
    return () => window.clearTimeout(id);
  }, [current, shown, shownIsTarget]);
  if (standings.length === 0 || !me) return null;
  // Leading = first place (shared in room games); equal points at a lower rank is not leading.
  const leading = me.rank === 1;
  const showLeader = shown !== "me";
  const leader = (shown !== "me" && standings.find((p) => p.userId === shown)) || standings.find((p) => !p.isSelf) || standings[0];
  // The gap follows the current first place; only the avatar on the right waits for the flights.
  const gap = Math.max(0, (standings[0]?.totalPoints ?? 0) - me.totalPoints);
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-surface-page-alt via-surface-page-alt/95 to-transparent px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-6 lg:hidden">
      <StandingsSheet standings={standings} palette={palette} open={open} onOpenChange={setOpen} returnFocusTo={barRef} />
      <button ref={barRef} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label={t("partyResults.seeAllStandings")}
        className="flex w-full items-center gap-2 rounded-2xl border-2 border-white/15 bg-surface-page px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
        <RankPill rank={me.rank} palette={palette} className="h-8 min-w-8 px-1 text-sm" />
        <span data-party-score-anchor={me.userId} data-party-score-anchor-placement="mobile-bottom">
          <AvatarDisplay customization={avatarOf(me)} size="xs" className="size-8" />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-base font-black tabular-nums text-white" style={poppins}>{me.totalPoints} <Delta p={me} className="text-xs" /></span>
          <span className="text-[11px] font-bold text-white/60">{leading ? t("partyResults.leading") : t("partyResults.behindLeader", { gap: String(gap) })}</span>
        </span>
        {showLeader && (
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <Crown className="size-4 text-brand-gold" aria-hidden />
            <span data-party-score-anchor={leader.userId} data-party-score-anchor-placement="mobile-bottom">
              <AvatarDisplay customization={avatarOf(leader)} size="xs" className="size-7" />
            </span>
            <span className="text-sm font-black tabular-nums text-white" style={poppins}>{leader.totalPoints}</span>
          </span>
        )}
        <ChevronUp className={cn("size-4 shrink-0 text-white/50", !showLeader && "ml-auto")} aria-hidden />
      </button>
    </div>
  );
}

/** Everyone, as a modal sheet over the lower part of the screen (focus trapped, Escape closes, focus returns). */
function StandingsSheet({ standings, palette, open, onOpenChange, returnFocusTo }: {
  standings: PartyStandingViewModel[]; palette: RankPalette; open: boolean; onOpenChange: (open: boolean) => void;
  /** The bar that opened it (outside the dialog root, so Radix cannot find it on its own). */
  returnFocusTo: React.RefObject<HTMLButtonElement | null>;
}) {
  const { t } = useLocale();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/50 lg:hidden" />
        <DialogPrimitive.Content aria-describedby={undefined} onCloseAutoFocus={(e) => { e.preventDefault(); returnFocusTo.current?.focus(); }}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[70dvh] overflow-y-auto rounded-t-3xl bg-surface-page px-3 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-2 text-white focus:outline-none lg:hidden">
          {/* A full-width 44 px touch target; the thin handle is only drawn inside it. */}
          <DialogPrimitive.Close className="-mt-1 mb-1 flex h-11 w-full items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" aria-label={t("partyResults.hideStandings")}>
            <span aria-hidden className="block h-1.5 w-12 rounded-full bg-white/25" />
          </DialogPrimitive.Close>
          <DialogPrimitive.Title className="mb-1 px-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/60" style={poppins}>{t("partyResults.standings")}</DialogPrimitive.Title>
          <div className="space-y-1">
            {standings.map((p) => {
              const style = getRankStyle(p.rank, palette);
              return (
                <motion.div layout key={p.userId}
                  className={cn("flex items-center gap-2 rounded-xl px-2 py-2", p.isSelf && style.tint, p.isSelf && "ring-1 ring-white/15", p.status === "dropped" && "opacity-50 grayscale")}>
                  <RankPill rank={p.rank} palette={palette} className="h-7 min-w-7 text-xs" />
                  <AvatarDisplay customization={avatarOf(p)} size="xs" className="size-8" />
                  <span className="min-w-0 flex-1 break-words text-sm font-bold leading-tight text-white [overflow-wrap:anywhere]">
                    {p.username}
                    {p.status === "dropped" && (
                      <span className="ml-1.5 inline-block rounded-full bg-white/10 px-1.5 py-0.5 align-middle text-[9px] font-black uppercase tracking-[0.08em] text-white/70">
                        {p.statusLabel ?? t("partyResults.dropped")}
                      </span>
                    )}
                  </span>
                  <Delta p={p} className="text-xs" />
                  <span className="text-sm font-black tabular-nums text-white" style={poppins}>{p.totalPoints}</span>
                </motion.div>
              );
            })}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function RankPill({ rank, palette, className }: { rank: number; palette: RankPalette; className?: string }) {
  return <span className={cn("flex items-center justify-center rounded-md font-black tabular-nums text-white", getRankStyle(rank, palette).pillBg, className)} style={poppins}>{rank}</span>;
}

function Delta({ p, className }: { p: PartyStandingViewModel; className?: string }) {
  return (
    <AnimatePresence>
      {p.roundDelta != null && p.roundDelta > 0 && (
        <motion.span key={`${p.userId}-${p.totalPoints}`} initial={{ opacity: 0, y: 4, scale: 0.7 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
          className={cn("font-black text-brand-green-light", className)} style={poppins}>+{p.roundDelta}</motion.span>
      )}
    </AnimatePresence>
  );
}
