"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Frown, Handshake, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type LabOutcome = "win" | "lose" | "draw";

interface EndOverlayProps {
  outcome: LabOutcome;
  /** Optional heading override; defaults per outcome. */
  heading?: string;
  subline?: string;
  /** Summary rows, e.g. [{ label: "Groups solved", you: "3", opp: "1" }]. */
  stats?: Array<{ label: string; you: React.ReactNode; opp: React.ReactNode }>;
  onPlayAgain: () => void;
}

const OUTCOME_STYLES: Record<
  LabOutcome,
  { heading: string; icon: typeof Trophy; iconClass: string; headingClass: string }
> = {
  win: { heading: "Victory!", icon: Trophy, iconClass: "text-brand-gold", headingClass: "text-brand-green-light" },
  lose: { heading: "Defeat", icon: Frown, iconClass: "text-brand-red-soft", headingClass: "text-brand-red-soft" },
  draw: { heading: "Draw", icon: Handshake, iconClass: "text-brand-cyan", headingClass: "text-brand-cyan" },
};

/** Full-screen end-of-game overlay with Play Again / Back to lab actions. */
export function EndOverlay({ outcome, heading, subline, stats, onPlayAgain }: EndOverlayProps) {
  const style = OUTCOME_STYLES[outcome];
  const Icon = style.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-page/90 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="w-full max-w-sm rounded-3xl border border-border bg-surface-deep p-6 text-center font-poppins text-white shadow-2xl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 14 }}
          className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-surface-card"
        >
          <Icon className={cn("size-8", style.iconClass)} />
        </motion.div>
        <h2 className={cn("text-2xl font-extrabold", style.headingClass)}>
          {heading ?? style.heading}
        </h2>
        {subline ? <p className="mt-1 text-sm text-brand-slate-light">{subline}</p> : null}

        {stats && stats.length > 0 ? (
          <div className="mt-4 space-y-1.5 rounded-2xl bg-surface-card p-3 text-sm">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-brand-slate-light">
              <span className="w-16 text-left">You</span>
              <span />
              <span className="w-16 text-right">Rival</span>
            </div>
            {stats.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-2">
                <span className="w-16 text-left font-bold">{row.you}</span>
                <span className="min-w-0 truncate text-xs text-brand-slate-light">{row.label}</span>
                <span className="w-16 text-right font-bold">{row.opp}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <Button size="lg" onClick={onPlayAgain}>
            <RotateCcw className="size-4" /> Play Again
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/game-mode-lab">Back to Game Mode Lab</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
