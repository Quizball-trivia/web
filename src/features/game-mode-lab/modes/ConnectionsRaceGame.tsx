"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DuelHud } from "../components/DuelHud";
import { EndOverlay, type LabOutcome } from "../components/EndOverlay";
import { FeedbackBanner, useFeedback } from "../components/FeedbackBanner";
import { LabShell } from "../components/LabShell";
import { connectionsPuzzles, type ConnectionsPuzzle } from "../data/connections";
import { useLabTimers } from "../lib/useLabTimers";
import { getLabMode } from "../registry";

const mode = getLabMode("connections-race")!;

interface SolvedGroup {
  groupIdx: number;
  by: "you" | "opp";
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function ConnectionsRaceGame() {
  const [attempt, setAttempt] = useState(0);
  const puzzle = useMemo(
    () => connectionsPuzzles[Math.floor(Math.random() * connectionsPuzzles.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- new puzzle per attempt
    [attempt],
  );

  return (
    <LabShell mode={mode}>
      <Round key={attempt} puzzle={puzzle} onPlayAgain={() => setAttempt((a) => a + 1)} />
    </LabShell>
  );
}

function Round({ puzzle, onPlayAgain }: { puzzle: ConnectionsPuzzle; onPlayAgain: () => void }) {
  const { schedule } = useLabTimers();
  const [deck] = useState(() => shuffle(puzzle.groups.flatMap((g) => g.players)));
  const [selected, setSelected] = useState<string[]>([]);
  const [solved, setSolved] = useState<SolvedGroup[]>([]);
  const { feedback, flash } = useFeedback();
  const [shaking, setShaking] = useState(false);
  const [outcome, setOutcome] = useState<LabOutcome | null>(null);
  const solvedRef = useRef<SolvedGroup[]>([]);
  solvedRef.current = solved;


  // Schedule the rival's solves once per round.
  useEffect(() => {
    puzzle.opponentSolveAtSeconds.forEach((seconds) => {
      schedule(() => {
        const solvedNow = solvedRef.current;
        if (solvedNow.length >= puzzle.groups.length) return;
        const target = puzzle.opponentGroupOrder.find(
          (groupIdx) => !solvedNow.some((s) => s.groupIdx === groupIdx),
        );
        if (target === undefined) return;
        setSolved((prev) =>
          prev.some((s) => s.groupIdx === target) ? prev : [...prev, { groupIdx: target, by: "opp" }],
        );
        setSelected([]);
        flash("info", `Rival locked a group: “${puzzle.groups[target].title}”`);
      }, seconds * 1000);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per round
  }, []);

  // End the race when all four groups are claimed.
  useEffect(() => {
    if (solved.length < puzzle.groups.length || outcome) return;
    const you = solved.filter((s) => s.by === "you").length;
    const opp = solved.length - you;
    const timer = window.setTimeout(
      () => setOutcome(you > opp ? "win" : you < opp ? "lose" : "draw"),
      900,
    );
    return () => window.clearTimeout(timer);
  }, [solved, outcome, puzzle.groups.length]);

  const solvedPlayers = useMemo(
    () => new Set(solved.flatMap((s) => puzzle.groups[s.groupIdx].players)),
    [solved, puzzle],
  );
  const remaining = deck.filter((p) => !solvedPlayers.has(p));

  const toggle = (player: string) => {
    if (outcome) return;
    setSelected((prev) =>
      prev.includes(player)
        ? prev.filter((p) => p !== player)
        : prev.length < 4
          ? [...prev, player]
          : prev,
    );
  };

  const submit = () => {
    if (selected.length !== 4 || outcome) return;
    const selectedSet = new Set(selected);
    const matchIdx = puzzle.groups.findIndex(
      (group, i) =>
        !solved.some((s) => s.groupIdx === i) &&
        group.players.every((p) => selectedSet.has(p)),
    );

    if (matchIdx >= 0) {
      // Functional + dedupe: a double-click submit must not add the group twice.
      setSolved((prev) =>
        prev.some((s) => s.groupIdx === matchIdx) ? prev : [...prev, { groupIdx: matchIdx, by: "you" }],
      );
      setSelected([]);
      flash("correct", `“${puzzle.groups[matchIdx].title}” — group locked!`);
      return;
    }

    const bestOverlap = Math.max(
      ...puzzle.groups
        .filter((_, i) => !solved.some((s) => s.groupIdx === i))
        .map((group) => group.players.filter((p) => selectedSet.has(p)).length),
    );
    setShaking(true);
    schedule(() => setShaking(false), 450);
    flash("wrong", bestOverlap === 3 ? "One away!" : "Not a group. Try again.");
    setSelected([]);
  };

  const you = solved.filter((s) => s.by === "you").length;
  const opp = solved.length - you;

  return (
    <div className="flex flex-1 flex-col">
      <DuelHud
        accent={mode.accent}
        youValue={`${you} groups`}
        oppValue={`${opp} groups`}
        centerLabel={
          <span className="text-[11px] font-bold text-brand-slate-light">
            {solved.length}/4
          </span>
        }
      />

      <p className="mb-3 text-center text-xs text-brand-slate-light">
        Find groups of 4 with a hidden connection — before your rival claims them.
      </p>

      {/* Solved groups */}
      <div className="mb-2 space-y-1.5">
        <AnimatePresence initial={false}>
          {solved.map((entry) => {
            const group = puzzle.groups[entry.groupIdx];
            return (
              <motion.div
                key={entry.groupIdx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "rounded-xl border px-3 py-2 text-center",
                  entry.by === "you"
                    ? "border-brand-blue/50 bg-brand-blue/15"
                    : "border-brand-red-soft/50 bg-brand-red-soft/15",
                )}
              >
                <div
                  className={cn(
                    "text-[11px] font-bold uppercase tracking-wide",
                    entry.by === "you" ? "text-brand-cyan" : "text-brand-red-soft",
                  )}
                >
                  {group.title} · {entry.by === "you" ? "You" : "Rival"}
                </div>
                <div className="text-xs font-semibold text-white">{group.players.join(" · ")}</div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Remaining cards */}
      <motion.div
        animate={shaking ? { x: [0, -7, 7, -5, 5, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="mb-3 grid grid-cols-4 gap-1.5"
      >
        {remaining.map((player) => {
          const isSelected = selected.includes(player);
          return (
            <button
              key={player}
              type="button"
              onClick={() => toggle(player)}
              className={cn(
                "flex min-h-14 items-center justify-center rounded-xl border p-1 text-center text-[11px] font-bold leading-tight transition-all active:scale-95",
                isSelected
                  ? "border-brand-blue bg-brand-blue/25 text-white"
                  : "border-border bg-surface-card text-white hover:bg-surface-card-tint",
              )}
            >
              {player}
            </button>
          );
        })}
      </motion.div>

      <div className="mt-auto space-y-2">
        <FeedbackBanner feedback={feedback} />
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setSelected([])}
            disabled={selected.length === 0 || !!outcome}
          >
            Clear
          </Button>
          <Button
            className="flex-[2]"
            onClick={submit}
            disabled={selected.length !== 4 || !!outcome}
          >
            Submit connection ({selected.length}/4)
          </Button>
        </div>
      </div>

      {outcome ? (
        <EndOverlay
          outcome={outcome}
          subline={
            outcome === "win"
              ? "You out-connected the rival."
              : outcome === "lose"
                ? "The rival found more groups."
                : "Two groups each — dead heat."
          }
          stats={[{ label: "Groups solved", you, opp }]}
          onPlayAgain={onPlayAgain}
        />
      ) : null}
    </div>
  );
}
