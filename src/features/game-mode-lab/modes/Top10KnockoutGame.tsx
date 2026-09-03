"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DuelHud } from "../components/DuelHud";
import { EndOverlay, type LabOutcome } from "../components/EndOverlay";
import { FeedbackBanner, useFeedback } from "../components/FeedbackBanner";
import { Hearts } from "../components/Hearts";
import { LabShell } from "../components/LabShell";
import { PlayerSearchInput } from "../components/PlayerSearchInput";
import { top10Categories, type Top10Category } from "../data/top10";
import { matchesName, thinkDelay } from "../lib/text";
import { useLabTimers } from "../lib/useLabTimers";
import { useTurnLock } from "../lib/useTurnLock";
import { getLabMode } from "../registry";

const mode = getLabMode("top-10-knockout")!;

type Claims = Record<string, "you" | "opp">; // key = entry name

export function Top10KnockoutGame() {
  const [category, setCategory] = useState<Top10Category | null>(null);

  return (
    <LabShell mode={mode}>
      {category ? (
        <Round key={category.id} category={category} onExit={() => setCategory(null)} />
      ) : (
        <CategoryPicker onPick={setCategory} />
      )}
    </LabShell>
  );
}

function CategoryPicker({ onPick }: { onPick: (c: Top10Category) => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-3">
      <p className="mb-1 text-center text-sm text-brand-slate-light">
        Pick a hidden Top 10 list to battle over:
      </p>
      {top10Categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onPick(category)}
          className={cn(
            "rounded-2xl border border-transparent bg-surface-card p-4 text-left transition-all",
            "hover:border-brand-cyan/40 hover:bg-surface-card-tint active:scale-[0.98]",
          )}
        >
          <div className="text-sm font-bold text-white">{category.title}</div>
          <div className="mt-0.5 text-xs text-brand-slate-light">
            Name players on the list before your rival does
          </div>
        </button>
      ))}
    </div>
  );
}

function Round({ category, onExit }: { category: Top10Category; onExit: () => void }) {
  const { schedule, clearAll } = useLabTimers();
  const { acquire, release } = useTurnLock();
  const [claims, setClaims] = useState<Claims>({});
  const [livesYou, setLivesYou] = useState(3);
  const [livesOpp, setLivesOpp] = useState(3);
  const [turn, setTurn] = useState<"you" | "opp">("you");
  const [oppThinking, setOppThinking] = useState(false);
  const { feedback, flash, clearFeedback } = useFeedback();
  const [oppMoveIdx, setOppMoveIdx] = useState(0);
  const [outcome, setOutcome] = useState<LabOutcome | null>(null);

  const candidates = useMemo(
    () => [...category.entries.map((e) => e.name), ...category.decoys].sort(),
    [category],
  );

  const revealedCount = Object.keys(claims).length;
  const yourReveals = Object.values(claims).filter((c) => c === "you").length;
  const oppReveals = revealedCount - yourReveals;


  const finish = (result: LabOutcome) => {
    clearAll();
    release();
    setOppThinking(false);
    setOutcome(result);
  };

  /** End-of-list tiebreak: most reveals wins; ties fall back to lives left. */
  const finishByReveals = (claimsNow: Claims, livesY: number, livesO: number) => {
    const you = Object.values(claimsNow).filter((c) => c === "you").length;
    const opp = Object.values(claimsNow).length - you;
    if (you !== opp) return finish(you > opp ? "win" : "lose");
    if (livesY !== livesO) return finish(livesY > livesO ? "win" : "lose");
    finish("draw");
  };

  const startOpponentTurn = (claimsNow: Claims, livesY: number, livesO: number) => {
    setTurn("opp");
    setOppThinking(true);
    schedule(() => {
      setOppThinking(false);
      // Consume the script: skip correct answers that are already revealed.
      let idx = oppMoveIdx;
      const moves = category.opponentMoves;
      while (idx < moves.length && moves[idx].correct && claimsNow[moves[idx].answer]) idx++;
      const move = idx < moves.length ? moves[idx] : null;
      setOppMoveIdx(idx + 1);

      if (move && move.correct) {
        const nextClaims: Claims = { ...claimsNow, [move.answer]: "opp" };
        setClaims(nextClaims);
        const entry = category.entries.find((e) => e.name === move.answer);
        flash("info", `Rival got #${entry?.rank}: ${move.answer}`);
        if (Object.keys(nextClaims).length >= category.entries.length) {
          return finishByReveals(nextClaims, livesY, livesO);
        }
      } else {
        const nextLives = livesO - 1;
        setLivesOpp(nextLives);
        flash("info", move ? `Rival guessed ${move.answer} — not on the list!` : "Rival blanked — lost a life!");
        if (nextLives <= 0) return finish("win");
      }
      release();
      setTurn("you");
    }, thinkDelay());
  };

  const handleGuess = (input: string) => {
    if (turn !== "you" || outcome || !acquire()) return;
    const entry = category.entries.find((e) => matchesName(input, e.name, e.aliases));

    if (entry && !claims[entry.name]) {
      const nextClaims: Claims = { ...claims, [entry.name]: "you" };
      setClaims(nextClaims);
      flash("correct", `#${entry.rank} — ${entry.name} (${entry.detail})`);
      if (Object.keys(nextClaims).length >= category.entries.length) {
        return finishByReveals(nextClaims, livesYou, livesOpp);
      }
      startOpponentTurn(nextClaims, livesYou, livesOpp);
    } else {
      const nextLives = livesYou - 1;
      setLivesYou(nextLives);
      flash(
        "wrong",
        entry ? `${entry.name} was already revealed — lose a life!` : `${input} isn't on the list — lose a life!`,
      );
      if (nextLives <= 0) return finish("lose");
      startOpponentTurn(claims, nextLives, livesOpp);
    }
  };

  const reset = () => {
    clearAll();
    release();
    setClaims({});
    setLivesYou(3);
    setLivesOpp(3);
    setTurn("you");
    setOppThinking(false);
    clearFeedback();
    setOppMoveIdx(0);
    setOutcome(null);
  };

  return (
    <div className="flex flex-1 flex-col">
      <DuelHud
        accent={mode.accent}
        turn={turn}
        oppThinking={oppThinking}
        youValue={<Hearts lives={livesYou} />}
        oppValue={<Hearts lives={livesOpp} />}
        centerLabel={
          <span className="text-[11px] font-bold text-brand-slate-light">
            {revealedCount}/{category.entries.length}
          </span>
        }
      />

      <div className="mb-3 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-cyan">
          Hidden list
        </div>
        <div className="text-sm font-bold text-white">{category.title}</div>
      </div>

      <ul className="mb-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {category.entries.map((entry) => {
          const claimedBy = claims[entry.name];
          return (
            <li
              key={entry.rank}
              className={cn(
                "flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm",
                claimedBy ? "bg-surface-card" : "bg-surface-card-deeper",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                  claimedBy === "you" && "bg-brand-blue text-white",
                  claimedBy === "opp" && "bg-brand-red-soft text-white",
                  !claimedBy && "bg-surface-card-tint text-brand-slate-light",
                )}
              >
                {entry.rank}
              </span>
              {claimedBy ? (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="min-w-0 flex-1 truncate font-semibold text-white"
                >
                  {entry.name}
                  <span className="ml-1.5 text-xs font-normal text-brand-slate-light">
                    {entry.detail}
                  </span>
                </motion.span>
              ) : (
                <span className="flex-1 tracking-widest text-brand-slate/60">— — —</span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-auto space-y-2">
        <FeedbackBanner feedback={feedback} />
        <PlayerSearchInput
          candidates={candidates}
          onSubmit={handleGuess}
          disabled={turn !== "you" || !!outcome}
          placeholder={turn === "you" ? "Who's on the list?" : "Rival's turn…"}
          accentBgClass={mode.accent.bg}
        />
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={onExit} className="text-brand-slate-light">
            Switch list
          </Button>
        </div>
      </div>

      {outcome ? (
        <EndOverlay
          outcome={outcome}
          subline={category.title}
          stats={[
            { label: "Players revealed", you: yourReveals, opp: oppReveals },
            { label: "Lives left", you: livesYou, opp: livesOpp },
          ]}
          onPlayAgain={reset}
        />
      ) : null}
    </div>
  );
}
