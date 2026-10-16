"use client";

import { motion, useReducedMotion } from "motion/react";
import { DuelAvatar } from "@/features/duel/DuelAvatar";
import { poppins } from "@/features/wordgames/ui";
import type { AvatarCustomization } from "@/types/game";
import { cn } from "@/lib/utils";
import type { TenableList, TenableSlot } from "./tenable.view";

const ROW_PX = 44;

/**
 * The tower: ten slots, #1 on top. A found answer climbs from the foot of the tower into its slot; you are brand green,
 * everyone else brand blue (with the finder's face in rooms); slots revealed unfound at the end are dashed.
 */
export function TenableTower({ list, slots, mySeat = 0, fresh, finder, hiddenLabel, asOfLabel, compact = false, dense = false }: {
  list: TenableList; slots: readonly TenableSlot[]; mySeat?: number;
  /** Rank that was just found: it climbs. */
  fresh: number | null;
  /** Face of the seat that found a slot (rooms only). */
  finder?: (seat: number) => AvatarCustomization | null;
  hiddenLabel: string; asOfLabel: (d: string) => string; compact?: boolean;
  /** Rooms on phones: shorter rows, so the tower and the answer box fit above the standings bar. */
  dense?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <section className={cn("rounded-3xl border border-white/10 bg-black/20", compact ? "p-2" : "p-2.5")} aria-label={list.title}>
      <header className={cn("px-2 text-center", compact ? "pb-2" : "pb-2.5 pt-1")}>
        <p className={cn("font-black uppercase tracking-[0.18em] text-brand-green-light", compact ? "text-[10px]" : "text-[11px]")}>{hiddenLabel}</p>
        <h2 className={cn("font-black leading-tight text-white", compact ? "mt-0.5 text-[15px]" : "mt-1 text-lg")} style={poppins}>{list.title}</h2>
        {list.note && <p className="mt-0.5 text-[11px] font-semibold text-white/70">{list.note}</p>}
        {list.asOf && <p className="mt-0.5 text-[11px] font-semibold text-white/50">{asOfLabel(list.asOf)}</p>}
      </header>
      <ol className={cn("relative", compact ? "space-y-1" : "space-y-1.5")}>
        {slots.map((slot) => {
          const shown = slot.name !== null;
          const mine = shown && !slot.missed && slot.by === mySeat;
          const theirs = shown && !slot.missed && slot.by !== null && slot.by !== mySeat;
          const face = theirs && finder ? finder(slot.by!) : null;
          const climbing = fresh === slot.rank && !reduced;
          return (
            <li key={slot.rank} data-tenable-slot={slot.rank} data-tenable-state={slot.missed ? "missed" : shown ? "found" : "hidden"}
              className={cn(
                "relative flex items-center gap-2.5 rounded-2xl px-2 transition-colors",
                dense ? "h-8 lg:h-9" : compact ? "h-9" : "h-11",
                !shown && "bg-white/[0.05]",
                mine && "bg-brand-green/20 ring-1 ring-brand-green",
                theirs && "bg-brand-blue/30 ring-1 ring-brand-blue",
                slot.missed && "border border-dashed border-white/25",
              )}>
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-black tabular-nums",
                mine ? "bg-brand-green text-black" : theirs ? "bg-brand-blue text-white" : "bg-white/10 text-white/60")} style={poppins}>
                {slot.rank}
              </span>
              {shown ? (
                <motion.span key={slot.name} className={cn("relative flex min-w-0 flex-1 items-center gap-2", climbing && "z-10")}
                  initial={climbing ? { y: (11 - slot.rank) * ROW_PX, scale: 1.08, opacity: 0.4 } : false}
                  animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 210, damping: 24 }}>
                  <span className={cn("min-w-0 flex-1 truncate text-sm font-bold", slot.missed ? "text-white/60" : "text-white")}>{slot.name}</span>
                  {slot.detail && <span className={cn("shrink-0 text-xs font-semibold tabular-nums", slot.missed ? "text-white/40" : "text-white/70")}>{slot.detail}</span>}
                  {face && <DuelAvatar customization={face} size="xs" className="shrink-0" />}
                </motion.span>
              ) : (
                <span className="flex-1 text-sm tracking-[0.3em] text-white/25" aria-hidden>• • •</span>
              )}
              {climbing && (
                <motion.span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-brand-yellow"
                  initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1, 0] }} transition={{ duration: 1.2, times: [0, 0.35, 0.5, 1] }} />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Lives as hearts, solid while they last (brand yellow: no red tiles). */
export function Lives({ lives, max, label, small = false }: { lives: number; max: number; label: string; small?: boolean }) {
  return (
    <span className="flex items-center gap-1" role="img" aria-label={label}>
      {Array.from({ length: max }, (_, i) => (
        <motion.svg key={`${i}-${i < lives}`} viewBox="0 0 24 24" className={cn(small ? "size-3.5" : "size-5", i < lives ? "fill-brand-yellow" : "fill-white/15")}
          initial={i === lives ? { scale: 1.5 } : false} animate={{ scale: 1 }} aria-hidden>
          <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3.1 4.5 6.9 4.5c2.1 0 3.6 1.1 5.1 2.9 1.5-1.8 3-2.9 5.1-2.9 3.8 0 6 3.9 4.5 7.3C19.5 16.4 12 21 12 21z" />
        </motion.svg>
      ))}
    </span>
  );
}

/** The share card's tower: one square per slot, top to bottom. */
export const towerEmoji = (slots: readonly TenableSlot[]) => slots.map((s) => (s.name !== null && !s.missed ? "🟩" : "⬛")).join("");
