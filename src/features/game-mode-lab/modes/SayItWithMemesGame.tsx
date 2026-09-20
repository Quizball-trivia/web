"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DuelHud } from "../components/DuelHud";
import { EndOverlay, type LabOutcome } from "../components/EndOverlay";
import { FeedbackBanner, useFeedback } from "../components/FeedbackBanner";
import { LabShell } from "../components/LabShell";
import type { LabProps } from "../types";
import { PlayerSearchInput } from "../components/PlayerSearchInput";
import {
  EXPLAIN_PHASE_COUNT,
  GUESS_PHASE_COUNT,
  SIGNAL_POINTS,
  signalBoard,
  signalGuessPool,
  signalRivalScores,
  signalTargets,
  type SignalCard,
} from "../data/sayItWithMemes";
import { matchesName, thinkDelay } from "../lib/text";
import { useLabTimers } from "../lib/useLabTimers";
import { useTurnLock } from "../lib/useTurnLock";
import { getLabMode } from "../registry";

const mode = getLabMode("say-it-with-memes")!;
const TOTAL_ROUNDS = GUESS_PHASE_COUNT + EXPLAIN_PHASE_COUNT;

const cardById = (id: string): SignalCard => signalBoard.find((c) => c.id === id)!;

interface RoundResult {
  won: boolean;
  points: number;
  answer: string;
  note: string;
  rivalPoints: number;
}

export function SayItWithMemesGame({ backHref }: LabProps) {
  const { schedule, clearAll } = useLabTimers();
  const { acquire, release } = useTurnLock();
  const { feedback, flash, clearFeedback } = useFeedback();

  const [round, setRound] = useState(0); // 0..9 across both phases
  const [youTotal, setYouTotal] = useState(0);
  const [rivalTotal, setRivalTotal] = useState(0);
  const [teammateThinking, setTeammateThinking] = useState(false);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, true>>({});

  // Guess-phase state
  const [revealed, setRevealed] = useState(1);
  const [lockedUntilReveal, setLockedUntilReveal] = useState(false);

  // Explain-phase state
  const [selected, setSelected] = useState<string[]>([]);
  const [retriesUsed, setRetriesUsed] = useState(0);

  const isGuessPhase = round < GUESS_PHASE_COUNT;
  const target = isGuessPhase
    ? signalTargets[round]
    : signalTargets[GUESS_PHASE_COUNT + (round - GUESS_PHASE_COUNT)];

  const finishRound = (won: boolean, points: number, note: string) => {
    clearAll();
    release();
    setTeammateThinking(false);
    const rivalPoints = signalRivalScores[round] ?? 0;
    setYouTotal((t) => t + points);
    setRivalTotal((t) => t + rivalPoints);
    setResult({ won, points, answer: target.name, note, rivalPoints });
  };

  // ——— Guess phase ———

  const handleGuess = (input: string) => {
    if (result || gameOver || lockedUntilReveal || !acquire()) return;
    if (matchesName(input, target.name, target.aliases)) {
      const points = SIGNAL_POINTS[revealed - 1] ?? 40;
      finishRound(true, points, `Read from ${revealed} card${revealed === 1 ? "" : "s"}.`);
    } else if (revealed >= target.revealOrder.length) {
      finishRound(false, 0, "The signal ran out of cards.");
    } else {
      setLockedUntilReveal(true);
      flash("wrong", `Not ${input}. Ask Nika for another card to guess again.`);
      release();
    }
  };

  const revealNext = () => {
    // acquire() is synchronous: two clicks in one frame would otherwise both
    // pass the state guards and stack timers, skipping a card and mis-scoring.
    if (result || gameOver || revealed >= target.revealOrder.length || !acquire()) return;
    setTeammateThinking(true);
    schedule(() => {
      setTeammateThinking(false);
      setRevealed((r) => r + 1);
      setLockedUntilReveal(false);
      clearFeedback();
      release();
    }, thinkDelay(700, 1300));
  };

  // ——— Explain phase ———

  const toggleCard = (id: string) => {
    if (result || gameOver || teammateThinking) return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : prev.length < 3 ? [...prev, id] : prev,
    );
  };

  const sendSignal = () => {
    if (result || gameOver || selected.length === 0 || !acquire()) return;
    setTeammateThinking(true);
    const strongHit = selected.some((id) => target.strong.includes(id));
    const hits = selected.filter(
      (id) => target.strong.includes(id) || target.support.includes(id),
    ).length;
    const noise = selected.length - hits;
    const understood = (strongHit || hits >= 2) && noise <= 1;
    const basePoints = SIGNAL_POINTS[selected.length - 1] ?? 40;
    const points = retriesUsed > 0 ? Math.round(basePoints / 2) : basePoints;

    schedule(() => {
      setTeammateThinking(false);
      if (understood) {
        finishRound(true, points, `Nika read it: “${target.name}!”`);
      } else if (retriesUsed === 0) {
        setRetriesUsed(1);
        flash("wrong", `Nika guesses “${target.decoyGuess}”… wrong! Adjust your signal (half points).`);
        release();
      } else {
        const clean = target.revealOrder.map((id) => cardById(id).label).join(" + ");
        finishRound(false, 0, `Nika couldn't read it. A cleaner signal: ${clean}.`);
      }
    }, thinkDelay(1200, 2100));
  };

  // ——— Round/game flow ———

  const nextRound = () => {
    if (round + 1 >= TOTAL_ROUNDS) {
      setGameOver(true);
      return;
    }
    setRound((r) => r + 1);
    setResult(null);
    setRevealed(1);
    setLockedUntilReveal(false);
    setSelected([]);
    setRetriesUsed(0);
    clearFeedback();
  };

  const reset = () => {
    clearAll();
    release();
    clearFeedback();
    setRound(0);
    setYouTotal(0);
    setRivalTotal(0);
    setTeammateThinking(false);
    setResult(null);
    setGameOver(false);
    setRevealed(1);
    setLockedUntilReveal(false);
    setSelected([]);
    setRetriesUsed(0);
  };

  const outcome: LabOutcome = youTotal > rivalTotal ? "win" : youTotal < rivalTotal ? "lose" : "draw";
  const signalCards = isGuessPhase ? target.revealOrder.slice(0, revealed) : selected;
  const pointsOnOffer = isGuessPhase
    ? SIGNAL_POINTS[revealed - 1] ?? 40
    : Math.round((SIGNAL_POINTS[Math.max(selected.length, 1) - 1] ?? 40) / (retriesUsed > 0 ? 2 : 1));

  return (
    <LabShell mode={mode} backHref={backHref}>
      <DuelHud
        accent={mode.accent}
        oppThinking={false}
        youValue={`${youTotal} pts`}
        oppValue={`${rivalTotal} pts`}
        centerLabel={
          <span className="text-[11px] font-bold text-brand-slate-light">
            {Math.min(round + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}
          </span>
        }
      />

      {/* Phase banner */}
      <div className="mb-3 rounded-2xl border border-brand-yellow/40 bg-brand-yellow/10 px-4 py-3 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-yellow">
          {isGuessPhase ? "You guess — Nika signals with cards" : "You signal — Nika guesses"}
        </div>
        <div className="text-base font-extrabold text-white">
          {isGuessPhase ? "Who is Nika saying?" : `Say “${target.name}” with memes`}
        </div>
        <div className="text-[11px] font-semibold text-brand-slate-light">
          {isGuessPhase
            ? `${pointsOnOffer} pts on offer at ${revealed} card${revealed === 1 ? "" : "s"}`
            : `Fewer cards = more points (${pointsOnOffer} pts as selected)`}
        </div>
      </div>

      {/* Signal area */}
      <div className="mb-3 flex min-h-28 items-center justify-center gap-2">
        {signalCards.length === 0 ? (
          <div className="text-xs text-brand-slate-light">
            {teammateThinking ? "Nika is thinking…" : "Pick up to 3 cards below."}
          </div>
        ) : (
          signalCards.map((id) => (
            <SignalTile
              key={id}
              card={cardById(id)}
              large
              broken={!!brokenImages[id]}
              onBroken={() => setBrokenImages((p) => ({ ...p, [id]: true }))}
            />
          ))
        )}
      </div>

      {/* Round result */}
      {result ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "mb-3 rounded-2xl border p-4 text-center",
            result.won ? "border-brand-green/40 bg-brand-green/10" : "border-brand-red-soft/40 bg-brand-red-soft/10",
          )}
        >
          <div className="text-xl font-extrabold text-white">{result.answer}</div>
          <div className="mt-0.5 text-xs text-brand-slate-light">{result.note}</div>
          <div className="mt-1 text-sm font-bold">
            <span className={result.won ? "text-brand-green-light" : "text-brand-red-soft"}>
              +{result.points} pts
            </span>
            <span className="ml-3 text-brand-slate-light">
              Rival team banked <span className="font-extrabold text-brand-red-soft">+{result.rivalPoints}</span>
            </span>
          </div>
          <Button className="mt-3" onClick={nextRound}>
            {round + 1 >= TOTAL_ROUNDS ? "Final score" : "Next round"}
          </Button>
        </motion.div>
      ) : null}

      {/* The full signal vocabulary — always visible. Guess phase: Nika's
          picks glow out of the whole board (what she DIDN'T pick is a clue
          too). Explain phase: tap to build your signal. */}
      {!result ? (
        <div className="mb-3 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
          {signalBoard.map((card) => {
            const isLit = isGuessPhase
              ? signalCards.includes(card.id)
              : selected.includes(card.id);
            return (
              <motion.button
                key={card.id}
                type="button"
                disabled={isGuessPhase}
                onClick={() => toggleCard(card.id)}
                animate={{ scale: isLit ? 1.06 : 1 }}
                className={cn(
                  "overflow-hidden rounded-lg border text-center transition-all",
                  !isGuessPhase && "active:scale-95",
                  isLit
                    ? "z-10 border-brand-yellow ring-2 ring-brand-yellow/60"
                    : "border-border",
                  isGuessPhase && !isLit && "opacity-45",
                )}
              >
                <SignalTile
                  card={card}
                  broken={!!brokenImages[card.id]}
                  onBroken={() => setBrokenImages((p) => ({ ...p, [card.id]: true }))}
                />
              </motion.button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-auto space-y-2">
        <FeedbackBanner feedback={feedback} />
        {!result && isGuessPhase ? (
          <>
            <PlayerSearchInput
              candidates={signalGuessPool}
              onSubmit={handleGuess}
              disabled={lockedUntilReveal || teammateThinking}
              placeholder={lockedUntilReveal ? "Locked — ask for another card" : "Who is it?"}
              submitLabel="Guess"
              accentBgClass={mode.accent.bg}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={revealNext}
              disabled={revealed >= target.revealOrder.length || teammateThinking}
            >
              <Plus className="size-4" />
              Ask for another card
              {revealed < target.revealOrder.length ? (
                <span className="text-xs text-brand-slate-light">
                  (drops to {SIGNAL_POINTS[revealed] ?? 40} pts)
                </span>
              ) : null}
            </Button>
          </>
        ) : null}
        {!result && !isGuessPhase ? (
          <Button
            size="lg"
            className="w-full"
            onClick={sendSignal}
            disabled={selected.length === 0 || teammateThinking}
          >
            {teammateThinking ? (
              "Nika is reading your signal…"
            ) : (
              <>
                <Send className="size-4" /> Send signal ({selected.length}/3 cards)
              </>
            )}
          </Button>
        ) : null}
      </div>

      {gameOver ? (
        <EndOverlay
          outcome={outcome}
          subline="Meme fluency is a skill."
          stats={[{ label: "Team points", you: youTotal, opp: rivalTotal }]}
          onPlayAgain={reset}
          backHref={backHref}
        />
      ) : null}
    </LabShell>
  );
}

function SignalTile({
  card,
  large = false,
  broken,
  onBroken,
}: {
  card: SignalCard;
  large?: boolean;
  broken: boolean;
  onBroken: () => void;
}) {
  return (
    <div className={cn(large && "w-24 overflow-hidden rounded-xl border border-brand-yellow/50")}>
      <div className={cn("relative bg-surface-card-deeper", large ? "aspect-square w-full" : "aspect-square w-full")}>
        {broken ? (
          <span className={cn("flex h-full items-center justify-center", large ? "text-3xl" : "text-xl")}>
            {card.emoji}
          </span>
        ) : (
          <Image
            src={`/game-mode-lab/cards/${card.id}.jpg`}
            alt={card.label}
            fill
            sizes={large ? "96px" : "(max-width: 640px) 25vw, 15vw"}
            className="object-cover"
            onError={onBroken}
          />
        )}
      </div>
      <div className={cn("bg-surface-card px-0.5 py-0.5 font-bold leading-tight text-white", large ? "text-[10px]" : "text-[8px]")}>
        {card.label}
      </div>
    </div>
  );
}
