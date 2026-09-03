"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DuelHud } from "../components/DuelHud";
import { EndOverlay, type LabOutcome } from "../components/EndOverlay";
import { FeedbackBanner, useFeedback } from "../components/FeedbackBanner";
import { LabShell } from "../components/LabShell";
import type { LabProps } from "../types";
import {
  bingoCategories,
  bingoLines,
  bingoOpponentScript,
  bingoQueue,
} from "../data/bingo";
import { thinkDelay } from "../lib/text";
import { useLabTimers } from "../lib/useLabTimers";
import { useTurnLock } from "../lib/useTurnLock";
import { getLabMode } from "../registry";

const mode = getLabMode("bingo-battle")!;

function findLine(filled: boolean[]): number[] | null {
  return bingoLines.find((line) => line.every((i) => filled[i])) ?? null;
}

export function BingoBattleGame({ backHref }: LabProps) {
  const { schedule, clearAll } = useLabTimers();
  const { acquire, release } = useTurnLock();
  const [queueIdx, setQueueIdx] = useState(0);
  const [board, setBoard] = useState<Array<string | null>>(Array(9).fill(null));
  const [oppBoard, setOppBoard] = useState<boolean[]>(Array(9).fill(false));
  const [oppTurnIdx, setOppTurnIdx] = useState(0);
  const [phase, setPhase] = useState<"you" | "opp">("you");
  const { feedback, flash, clearFeedback } = useFeedback();
  const [shakeSquare, setShakeSquare] = useState<number | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [outcome, setOutcome] = useState<LabOutcome | null>(null);

  const player = bingoQueue[queueIdx] ?? null;


  const finish = (result: LabOutcome, line: number[] | null = null) => {
    clearAll();
    release();
    setWinningLine(line);
    setOutcome(result);
  };

  const advanceAfterYou = (boardNow: Array<string | null>) => {
    const line = findLine(boardNow.map((cell) => cell !== null));
    if (line) return finish("win", line);

    setPhase("opp");
    schedule(() => {
      const move = oppTurnIdx < bingoOpponentScript.length ? bingoOpponentScript[oppTurnIdx] : null;
      setOppTurnIdx((i) => i + 1);
      let oppNow = oppBoard;
      if (move !== null && !oppBoard[move]) {
        oppNow = oppBoard.map((v, i) => (i === move ? true : v));
        setOppBoard(oppNow);
      }
      if (findLine(oppNow)) return finish("lose");

      const nextIdx = queueIdx + 1;
      if (nextIdx >= bingoQueue.length) {
        // Nobody completed a line — most filled squares wins.
        const you = boardNow.filter(Boolean).length;
        const opp = oppNow.filter(Boolean).length;
        return finish(you > opp ? "win" : you < opp ? "lose" : "draw");
      }
      setQueueIdx(nextIdx);
      release();
      setPhase("you");
    }, thinkDelay());
  };

  const handlePlace = (square: number) => {
    if (!player || phase !== "you" || outcome || board[square] || !acquire()) return;
    if (!player.eligible.includes(square)) {
      setShakeSquare(square);
      schedule(() => setShakeSquare(null), 450);
      flash("wrong", `${player.name} doesn't qualify for “${bingoCategories[square]}”. Try another square.`);
      release(); // wrong square doesn't consume the turn
      return;
    }
    const next = board.map((cell, i) => (i === square ? player.name : cell));
    setBoard(next);
    flash("correct", `${player.name} → ${bingoCategories[square]}`);
    advanceAfterYou(next);
  };

  const handleSkip = () => {
    if (!player || phase !== "you" || outcome || !acquire()) return;
    flash("info", `Skipped ${player.name}.`);
    advanceAfterYou(board);
  };

  const reset = () => {
    clearAll();
    release();
    setQueueIdx(0);
    setBoard(Array(9).fill(null));
    setOppBoard(Array(9).fill(false));
    setOppTurnIdx(0);
    setPhase("you");
    clearFeedback();
    setShakeSquare(null);
    setWinningLine(null);
    setOutcome(null);
  };

  const yourFilled = board.filter(Boolean).length;
  const oppFilled = oppBoard.filter(Boolean).length;

  return (
    <LabShell mode={mode} backHref={backHref}>
      <DuelHud
        accent={mode.accent}
        turn={phase}
        oppThinking={phase === "opp" && !outcome}
        youValue={`${yourFilled}/9 squares`}
        oppValue={<OppMiniBoard filled={oppBoard} />}
        centerLabel={
          <span className="text-[11px] font-bold text-brand-slate-light">
            {Math.min(queueIdx + 1, bingoQueue.length)}/{bingoQueue.length}
          </span>
        }
      />

      {/* Current player card */}
      <motion.div
        key={queueIdx}
        initial={{ opacity: 0, y: -10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="mb-3 rounded-2xl border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-center"
      >
        <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-orange">
          Place this player
        </div>
        <div className="text-xl font-extrabold text-white">{player?.name ?? "—"}</div>
      </motion.div>

      {/* Your board */}
      <div className="mx-auto mb-3 grid w-full max-w-sm grid-cols-3 gap-1.5">
        {bingoCategories.map((category, i) => {
          const filledBy = board[i];
          const inWinningLine = winningLine?.includes(i) ?? false;
          return (
            <motion.button
              key={category}
              type="button"
              animate={shakeSquare === i ? { x: [0, -6, 6, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
              disabled={!!filledBy || phase !== "you" || !!outcome}
              onClick={() => handlePlace(i)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border p-1.5 text-center transition-colors",
                filledBy
                  ? inWinningLine
                    ? "border-brand-orange bg-brand-orange/30"
                    : "border-brand-orange/40 bg-brand-orange/15"
                  : "border-border bg-surface-card hover:bg-surface-card-tint",
              )}
            >
              <span className="text-[10px] font-semibold leading-tight text-brand-slate-light">
                {category}
              </span>
              {filledBy ? (
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-[11px] font-extrabold leading-tight text-white"
                >
                  {filledBy}
                </motion.span>
              ) : null}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-auto space-y-2">
        <FeedbackBanner feedback={feedback} />
        <Button
          variant="outline"
          className="w-full"
          onClick={handleSkip}
          disabled={phase !== "you" || !!outcome}
        >
          <SkipForward className="size-4" /> No square fits — skip
        </Button>
      </div>

      {outcome ? (
        <EndOverlay
          outcome={outcome}
          heading={outcome === "win" ? "BINGO!" : undefined}
          subline={
            outcome === "win"
              ? "You completed a line first."
              : outcome === "lose"
                ? "The rival completed a line first."
                : "Nobody lined up — dead even."
          }
          stats={[{ label: "Squares filled", you: yourFilled, opp: oppFilled }]}
          onPlayAgain={reset}
          backHref={backHref}
        />
      ) : null}
    </LabShell>
  );
}

function OppMiniBoard({ filled }: { filled: boolean[] }) {
  return (
    <span className="inline-grid grid-cols-3 gap-0.5 align-middle" aria-label="Rival card progress">
      {filled.map((isFilled, i) => (
        <span
          key={i}
          className={cn(
            "size-2 rounded-[3px]",
            isFilled ? "bg-brand-red-soft" : "bg-surface-card-tint",
          )}
        />
      ))}
    </span>
  );
}
