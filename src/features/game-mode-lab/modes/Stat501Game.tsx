"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { DuelHud } from "../components/DuelHud";
import { EndOverlay, type LabOutcome } from "../components/EndOverlay";
import { FeedbackBanner, useFeedback } from "../components/FeedbackBanner";
import { LabShell } from "../components/LabShell";
import type { LabProps } from "../types";
import { PlayerSearchInput } from "../components/PlayerSearchInput";
import {
  STAT_501_BUST_FLOOR,
  STAT_501_START,
  stat501Categories,
  type Stat501Category,
  type Stat501Player,
} from "../data/stat501";
import { matchesName, thinkDelay } from "../lib/text";
import { useLabTimers } from "../lib/useLabTimers";
import { useTurnLock } from "../lib/useTurnLock";
import { getLabMode } from "../registry";

const mode = getLabMode("stat-501")!;

// Rule notes (simplified vs the brief, for clarity in a 2-minute demo):
// - Landing anywhere in [−10, 0] is a checkout and wins immediately.
// - Landing below −10 is a bust: the score reverts to its pre-throw value and
//   the turn passes. There is no "exactly zero" requirement, so every score
//   always has some legal finish and rounds can't stall.
// - Naming a player outside the category pool shows an error but does NOT
//   consume the turn — the prototype is about stat memory, not pool trivia.

interface LogEntry {
  by: "you" | "opp";
  player: string;
  stat: number;
  result: "scored" | "bust" | "checkout";
}

export function Stat501Game({ backHref }: LabProps) {
  const [category, setCategory] = useState<Stat501Category | null>(null);

  return (
    <LabShell mode={mode} backHref={backHref}>
      {category ? (
        <Round key={category.id} category={category} backHref={backHref} onExit={() => setCategory(null)} />
      ) : (
        <CategoryPicker onPick={setCategory} />
      )}
    </LabShell>
  );
}

function CategoryPicker({ onPick }: { onPick: (c: Stat501Category) => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-3">
      <p className="mb-1 text-center text-sm text-brand-slate-light">
        Pick a stat category — both players count down from {STAT_501_START}:
      </p>
      {stat501Categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onPick(category)}
          className="rounded-2xl border border-transparent bg-surface-card p-4 text-left transition-all hover:border-brand-green-bright/40 hover:bg-surface-card-tint active:scale-[0.98]"
        >
          <div className="text-sm font-bold text-white">{category.title}</div>
          <div className="mt-0.5 text-xs text-brand-slate-light">
            Name players — their {category.statLabel} count down your total
          </div>
        </button>
      ))}
    </div>
  );
}

/** The rival's pick: pressure early, precision late, occasional misjudgement. */
function pickOpponentPlayer(remaining: Stat501Player[], score: number): Stat501Player {
  const safe = remaining.filter((p) => score - p.stat >= STAT_501_BUST_FLOOR);
  if (safe.length === 0) {
    // Forced bust — take the smallest overshoot.
    return [...remaining].sort((a, b) => a.stat - b.stat)[0];
  }
  if (score > 220) {
    return [...safe].sort((a, b) => b.stat - a.stat)[0];
  }
  // Aim close to a finish; 25% of the time misjudge to the 2nd-best option.
  const ranked = [...safe].sort(
    (a, b) => Math.abs(score - a.stat) - Math.abs(score - b.stat),
  );
  return Math.random() < 0.25 && ranked.length > 1 ? ranked[1] : ranked[0];
}

function Round({
  category,
  onExit,
  backHref,
}: { category: Stat501Category; onExit: () => void } & LabProps) {
  const { schedule, clearAll } = useLabTimers();
  const { acquire, release } = useTurnLock();
  const [youScore, setYouScore] = useState(STAT_501_START);
  const [oppScore, setOppScore] = useState(STAT_501_START);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [log, setLog] = useState<LogEntry[]>([]);
  const [turn, setTurn] = useState<"you" | "opp">("you");
  const [oppThinking, setOppThinking] = useState(false);
  const { feedback, flash, clearFeedback } = useFeedback();
  const [outcome, setOutcome] = useState<LabOutcome | null>(null);

  const candidates = useMemo(
    () => category.players.filter((p) => !used.has(p.name)).map((p) => p.name).sort(),
    [category, used],
  );


  // Turns strictly alternate, so the oppScore captured when the user throws is
  // always current by the time this timer fires.
  const startOpponentTurn = (usedNow: Set<string>) => {
    setTurn("opp");
    setOppThinking(true);
    schedule(() => {
      setOppThinking(false);
      const remaining = category.players.filter((p) => !usedNow.has(p.name));
      const pick = pickOpponentPlayer(remaining, oppScore);
      setUsed((prev) => new Set(prev).add(pick.name));
      const next = oppScore - pick.stat;

      if (next <= 0 && next >= STAT_501_BUST_FLOOR) {
        setOppScore(next);
        setLog((l) => [{ by: "opp", player: pick.name, stat: pick.stat, result: "checkout" }, ...l]);
        clearAll();
        setOutcome("lose");
        return;
      }
      if (next < STAT_501_BUST_FLOOR) {
        setLog((l) => [{ by: "opp", player: pick.name, stat: pick.stat, result: "bust" }, ...l]);
        flash("info", `Rival busts with ${pick.name} (${pick.stat}) — score restored.`);
      } else {
        setOppScore(next);
        setLog((l) => [{ by: "opp", player: pick.name, stat: pick.stat, result: "scored" }, ...l]);
      }
      release();
      setTurn("you");
    }, thinkDelay(1100, 2000));
  };

  const handlePick = (input: string) => {
    if (turn !== "you" || outcome || !acquire()) return;
    const player = category.players.find((p) => matchesName(input, p.name, p.aliases));
    if (!player) {
      flash("wrong", `${input} isn't in this category's pool — try someone else.`);
      release(); // invalid names don't consume the turn
      return;
    }
    if (used.has(player.name)) {
      flash("wrong", `${player.name} has already been used.`);
      release();
      return;
    }

    const nextUsed = new Set(used).add(player.name);
    setUsed(nextUsed);
    const next = youScore - player.stat;

    if (next <= 0 && next >= STAT_501_BUST_FLOOR) {
      setYouScore(next);
      setLog((l) => [{ by: "you", player: player.name, stat: player.stat, result: "checkout" }, ...l]);
      clearAll();
      release();
      setOutcome("win");
      return;
    }
    if (next < STAT_501_BUST_FLOOR) {
      setLog((l) => [{ by: "you", player: player.name, stat: player.stat, result: "bust" }, ...l]);
      flash("wrong", `Bust! ${player.name} has ${player.stat} ${category.statLabel} — score restored.`);
      startOpponentTurn(nextUsed);
      return;
    }
    setYouScore(next);
    setLog((l) => [{ by: "you", player: player.name, stat: player.stat, result: "scored" }, ...l]);
    flash("correct", `${player.name} — ${player.stat} ${category.statLabel}. ${next} to go.`);
    startOpponentTurn(nextUsed);
  };

  const reset = () => {
    clearAll();
    release();
    setYouScore(STAT_501_START);
    setOppScore(STAT_501_START);
    setUsed(new Set());
    setLog([]);
    setTurn("you");
    setOppThinking(false);
    clearFeedback();
    setOutcome(null);
  };

  const inFinishZone = youScore <= 120;

  return (
    <div className="flex flex-1 flex-col">
      <DuelHud
        accent={mode.accent}
        turn={turn}
        oppThinking={oppThinking}
        youValue={<ScoreNumber score={youScore} />}
        oppValue={<ScoreNumber score={oppScore} />}
      />

      <div className="mb-3 rounded-2xl border border-brand-green-bright/30 bg-brand-green-bright/10 px-4 py-3 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-green-bright">
          {category.title}
        </div>
        <div className="text-sm font-bold text-white">
          {inFinishZone
            ? `Finish zone: any player with ${Math.max(youScore, 0)}–${youScore - STAT_501_BUST_FLOOR} ${category.statLabel} wins it`
            : `Name a player — their ${category.statLabel} come off your total`}
        </div>
      </div>

      {/* Throw log */}
      <div className="mb-3 min-h-24 space-y-1">
        {log.slice(0, 4).map((entry, i) => (
          <motion.div
            key={`${entry.by}-${entry.player}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-semibold",
              i === 0 ? "bg-surface-card" : "bg-surface-card-deeper",
              entry.result === "bust" && "text-brand-red-soft",
              entry.result === "checkout" && "text-brand-green-light",
              entry.result === "scored" && "text-white",
            )}
          >
            <span
              className={cn(
                "mr-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold",
                entry.by === "you" ? "bg-brand-blue/30 text-brand-cyan" : "bg-brand-red-soft/20 text-brand-red-soft",
              )}
            >
              {entry.by === "you" ? "YOU" : "RIVAL"}
            </span>
            <span className="min-w-0 flex-1 truncate">{entry.player}</span>
            <span className="ml-2 shrink-0">
              −{entry.stat}
              {entry.result === "bust" ? " · BUST" : entry.result === "checkout" ? " · GAME!" : ""}
            </span>
          </motion.div>
        ))}
        {log.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border text-xs text-brand-slate-light">
            Your throw. Big names take big chunks off 501.
          </div>
        ) : null}
      </div>

      <div className="mt-auto space-y-2">
        <FeedbackBanner feedback={feedback} />
        <PlayerSearchInput
          candidates={candidates}
          onSubmit={handlePick}
          disabled={turn !== "you" || !!outcome}
          placeholder={turn === "you" ? "Name a footballer…" : "Rival is throwing…"}
          submitLabel="Throw"
          accentBgClass={mode.accent.bg}
        />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onExit}
            className="text-xs font-semibold text-brand-slate-light hover:text-white"
          >
            Switch category
          </button>
        </div>
      </div>

      {outcome ? (
        <EndOverlay
          outcome={outcome}
          heading={outcome === "win" ? "Checkout!" : "Rival checks out"}
          subline={category.title}
          stats={[
            { label: "Final score", you: youScore, opp: oppScore },
            {
              label: "Throws",
              you: log.filter((l) => l.by === "you").length,
              opp: log.filter((l) => l.by === "opp").length,
            },
          ]}
          onPlayAgain={reset}
          backHref={backHref}
        />
      ) : null}
    </div>
  );
}

function ScoreNumber({ score }: { score: number }) {
  return (
    <motion.span
      key={score}
      initial={{ scale: 1.3, color: "#85E000" }}
      animate={{ scale: 1, color: "#FFFFFF" }}
      className="inline-block text-xl font-extrabold tabular-nums"
    >
      {score}
    </motion.span>
  );
}
