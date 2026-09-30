"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Bomb, Check, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DuelCopy } from "./duel.copy";
import type { BuscaminasDuelView, Seat } from "./duel.views";
import { SEAT_LABEL, SEAT_RING } from "./duel.seats";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

export function BuscaminasDuelBoard({ view, mySeat, names, copy, finished, onPick }: {
  view: BuscaminasDuelView; mySeat: Seat; names: [string, string]; copy: DuelCopy; finished: boolean; onPick: (cardId: string) => void;
}) {
  const myTurn = !finished && view.phase === "turn" && view.turn === mySeat;
  // Only a result of THIS round explains the board; a match that ended mid-round (forfeit, idle) has none.
  const last = view.results.length > view.round ? view.results[view.round] : undefined;
  const rival = names[mySeat === 0 ? 1 : 0];
  const status = view.phase === "turn" && !finished
    ? (myTurn ? `${copy.yourTurn} · ${copy.bm.pick}` : copy.theirTurn(names[view.turn]))
    : last?.outcome === "mine" && last.by !== null
      ? (last.by === mySeat ? copy.bm.youMine(rival, Math.max(...last.points)) : copy.bm.rivalMine(names[last.by], Math.max(...last.points)))
      : last ? copy.bm.cleared(last.points[0]) : null;

  return (
    <div className="flex flex-col">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wide text-white/60" style={poppins}>
          <span>{copy.round(view.round + 1, view.totalRounds)}</span>
          <span className="rounded-full bg-brand-yellow px-2 py-0.5 text-black">{copy.points(view.points)}</span>
        </div>
        <p className="mt-1.5 text-lg font-black leading-tight" style={poppins}>{view.prompt}</p>
        <p className="mt-1 text-xs text-white/55">{copy.bm.found(view.found, view.needed)}</p>
      </div>

      {status && (
        <div className={cn("mt-3 rounded-xl px-3 py-2 text-center text-sm font-bold", view.phase !== "turn"
          ? "bg-white/[0.06] text-white/85"
          : myTurn ? "bg-brand-green/20 text-white" : "bg-white/[0.06] text-white/60")}>
          {status}
        </div>
      )}

      <div className="mt-3 grid grid-cols-4 gap-2">
        {view.cards.map((card, index) => (
          <DuelCard key={`${view.round}-${card.id}`} card={card} index={index} mySeat={mySeat} copy={copy}
            enabled={myTurn && !card.pick} onPick={() => onPick(card.id)} />
        ))}
      </div>
    </div>
  );
}

function DuelCard({ card, index, mySeat, copy, enabled, onPick }: {
  card: BuscaminasDuelView["cards"][number]; index: number; mySeat: Seat; copy: DuelCopy; enabled: boolean; onPick: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const mine = card.fits === false;
  const picked = card.pick !== null;
  const revealedOnly = !picked && card.fits !== null;
  const initials = card.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2);
  const seatRing = card.pick ? SEAT_RING[card.pick.seat === mySeat ? "me" : "rival"] : "";
  return (
    <motion.button
      type="button"
      onClick={() => { if (enabled) onPick(); }}
      aria-disabled={!enabled}
      aria-label={`${card.name}${mine && picked ? ` — ${copy.bm.impostor}` : picked ? " ✓" : ""}`}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={mine && picked ? { opacity: 1, scale: 1, x: [0, -5, 5, -4, 4, 0] } : { opacity: 1, scale: 1, x: 0 }}
      transition={mine && picked ? { duration: 0.4 } : { delay: index * 0.015, duration: 0.18 }}
      whileTap={enabled ? { scale: 0.95 } : undefined}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border-2 bg-surface-page-deep text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
        mine && picked ? "border-brand-red-soft shadow-[0_0_14px_rgba(255,75,75,0.45)]"
          : picked ? seatRing
          : revealedOnly && mine ? "border-brand-red-soft/60 opacity-80"
          : revealedOnly ? "border-dashed border-brand-green/60 opacity-70"
          : enabled ? "border-white/15 hover:border-white/40" : "border-white/10",
      )}
    >
      <div className="relative aspect-[4/5] w-full bg-white/[0.04]">
        {failed ? (
          <div className="flex size-full items-center justify-center text-lg font-black text-white/40" style={poppins}>{initials}</div>
        ) : (
          <Image src={card.img} alt="" fill unoptimized sizes="96px" draggable={false} onError={() => setFailed(true)} className={cn("object-cover", mine && "saturate-50")} />
        )}
        {mine && picked && <div className="absolute inset-0 bg-brand-red-soft/35" />}
        {(picked || (revealedOnly && mine)) && (
          <span className={cn("absolute right-1 top-1 flex size-5 items-center justify-center rounded-full", mine ? "bg-brand-red-soft text-white" : "bg-brand-green text-white")}>
            {mine ? <Bomb className="size-3" strokeWidth={2.5} /> : <Check className="size-3.5" strokeWidth={3.5} />}
          </span>
        )}
        {card.pick?.auto && (
          <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[8px] font-black uppercase text-white/85">
            <Shuffle className="size-2.5" />{copy.bm.random}
          </span>
        )}
      </div>
      <span className={cn("flex min-h-[26px] items-center justify-center px-1 py-0.5 text-center font-black uppercase leading-[1.1] [overflow-wrap:anywhere]",
        card.name.length > 11 ? "text-[9px]" : "text-[10px]",
        mine && picked ? "text-brand-red-soft" : card.pick ? SEAT_LABEL[card.pick.seat === mySeat ? "me" : "rival"] : "text-white")} style={poppins}>
        {card.name}
      </span>
    </motion.button>
  );
}
