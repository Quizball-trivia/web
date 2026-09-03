"use client";

import { cn } from "@/lib/utils";
import type { LabModeId } from "../registry";

/**
 * Small stylised, CSS-only visual for each mode card on the lab home screen.
 * Deliberately equal in size and fidelity across modes (fairness for the
 * fake-door comparison).
 */
export function ModePreview({ modeId }: { modeId: LabModeId }) {
  return (
    <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl bg-surface-card-deeper">
      {PREVIEWS[modeId]}
    </div>
  );
}

const PREVIEWS: Record<LabModeId, React.ReactNode> = {
  "top-10-knockout": (
    <div className="w-3/4 space-y-1.5">
      {[
        { rank: "1", revealed: true, label: "C. Ronaldo" },
        { rank: "2", revealed: true, label: "L. Messi" },
        { rank: "3", revealed: false, label: "" },
      ].map((row) => (
        <div key={row.rank} className="flex items-center gap-1.5">
          <span
            className={cn(
              "flex size-4 items-center justify-center rounded text-[8px] font-bold",
              row.revealed ? "bg-brand-cyan text-white" : "bg-surface-card-tint text-brand-slate",
            )}
          >
            {row.rank}
          </span>
          {row.revealed ? (
            <span className="text-[10px] font-bold text-white">{row.label}</span>
          ) : (
            <span className="h-2 w-16 rounded bg-surface-card-tint" />
          )}
        </div>
      ))}
    </div>
  ),
  "missing-xi": (
    <div className="relative h-20 w-14 rounded border border-white/20 bg-gradient-to-b from-surface-mode-card-hover to-surface-mode-trough-deep">
      {[
        [50, 85],
        [20, 62],
        [50, 66],
        [80, 62],
        [35, 40],
        [65, 40],
        [50, 16],
      ].map(([x, y], i) => (
        <span
          key={i}
          className={cn(
            "absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
            i % 3 === 0 ? "bg-brand-green-light" : "bg-white/40",
          )}
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      ))}
    </div>
  ),
  "ball-knowledge": (
    <div className="text-center">
      <div className="text-xl font-extrabold text-brand-gold">0.8%</div>
      <div className="text-[9px] font-bold text-brand-slate-light">chose this answer</div>
      <div className="mt-1 inline-block rounded bg-brand-gold/20 px-2 py-0.5 text-[9px] font-bold text-brand-gold">
        +96 pts
      </div>
    </div>
  ),
  "bingo-battle": (
    <div className="grid grid-cols-3 gap-1">
      {[true, false, true, false, true, false, false, false, true].map((filled, i) => (
        <span
          key={i}
          className={cn(
            "size-5 rounded",
            filled ? "bg-brand-orange/70" : "bg-surface-card-tint",
          )}
        />
      ))}
    </div>
  ),
  "draft-battle": (
    <div className="flex items-center">
      {["GK", "MID", "ST"].map((pos, i) => (
        <div
          key={pos}
          className={cn(
            "flex h-14 w-11 flex-col items-center justify-center rounded-lg border text-[9px] font-bold",
            i === 1
              ? "z-10 -mx-1 h-16 w-12 border-brand-blue bg-brand-blue/25 text-white"
              : "border-border bg-surface-card-tint text-brand-slate-light",
          )}
        >
          {pos}
        </div>
      ))}
    </div>
  ),
  "connections-race": (
    <div className="grid grid-cols-4 gap-1">
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-4 w-7 rounded",
            i < 4 ? "bg-brand-red-soft/60" : "bg-surface-card-tint",
          )}
        />
      ))}
    </div>
  ),
  "stat-501": (
    <div className="text-center">
      <div className="text-2xl font-extrabold tabular-nums text-brand-green-bright">501</div>
      <div className="text-[9px] font-bold text-brand-slate-light">− Henry (175) → 326</div>
    </div>
  ),
  "own-goal": (
    <div className="grid grid-cols-4 gap-1">
      {["🐐", "🚌", "🐢", "👑", "🧙", "🏆", "🧎", "📠"].map((emoji, i) => (
        <span
          key={i}
          className={cn(
            "flex size-7 items-center justify-center rounded text-sm",
            emoji === "🏆"
              ? "bg-brand-red/40"
              : i % 3 === 0
                ? "bg-brand-blue/30"
                : "bg-surface-card-tint",
          )}
        >
          {emoji}
        </span>
      ))}
    </div>
  ),
  "say-it-with-memes": (
    <div className="flex items-center gap-1.5">
      {["🚌", "➕", "🕶️"].map((emoji, i) => (
        <span
          key={i}
          className={cn(
            "flex size-8 items-center justify-center rounded-lg text-base",
            i === 1 ? "bg-transparent text-brand-slate" : "bg-brand-yellow/20",
          )}
        >
          {emoji}
        </span>
      ))}
      <span className="ml-1 rounded bg-surface-card-tint px-1.5 py-1 text-[9px] font-bold text-brand-yellow">
        = Mourinho?
      </span>
    </div>
  ),
};
