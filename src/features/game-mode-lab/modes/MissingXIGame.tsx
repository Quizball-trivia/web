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
import { missingXiMatches, type XiMatch, type XiSlot } from "../data/missingXi";
import { matchesName, thinkDelay } from "../lib/text";
import { useLabTimers } from "../lib/useLabTimers";
import { useTurnLock } from "../lib/useTurnLock";
import { getLabMode } from "../registry";

const mode = getLabMode("missing-xi")!;

type Claims = Record<string, "you" | "opp">; // key = slot id

/** "Rodrigo De Paul" → "De Paul", "Lionel Messi" → "Messi". */
function shortName(name: string): string {
  const tokens = name.split(" ");
  return tokens.length > 2 ? tokens.slice(-2).join(" ") : tokens[tokens.length - 1];
}

export function MissingXIGame({ backHref }: LabProps) {
  const [match, setMatch] = useState<XiMatch | null>(null);

  return (
    <LabShell mode={mode} backHref={backHref}>
      {match ? (
        <Round key={match.id} match={match} backHref={backHref} onExit={() => setMatch(null)} />
      ) : (
        <MatchPicker onPick={setMatch} />
      )}
    </LabShell>
  );
}

function MatchPicker({ onPick }: { onPick: (m: XiMatch) => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-3">
      <p className="mb-1 text-center text-sm text-brand-slate-light">
        Pick a legendary XI to reconstruct:
      </p>
      {missingXiMatches.map((match) => (
        <button
          key={match.id}
          type="button"
          onClick={() => onPick(match)}
          className="rounded-2xl border border-transparent bg-surface-card p-4 text-left transition-all hover:border-brand-green-light/40 hover:bg-surface-card-tint active:scale-[0.98]"
        >
          <div className="text-sm font-bold text-white">{match.teamName}</div>
          <div className="mt-0.5 text-xs text-brand-slate-light">{match.matchLabel}</div>
          <div className="mt-1 text-[11px] font-semibold text-brand-green-light">{match.formation}</div>
        </button>
      ))}
    </div>
  );
}

function Round({
  match,
  onExit,
  backHref,
}: { match: XiMatch; onExit: () => void } & LabProps) {
  const { schedule, clearAll } = useLabTimers();
  const { acquire, release } = useTurnLock();
  const [claims, setClaims] = useState<Claims>({});
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [turn, setTurn] = useState<"you" | "opp">("you");
  const [oppThinking, setOppThinking] = useState(false);
  const [oppMoveIdx, setOppMoveIdx] = useState(0);
  const { feedback, flash, clearFeedback } = useFeedback();
  const [outcome, setOutcome] = useState<LabOutcome | null>(null);

  const candidates = useMemo(
    () => [...match.slots.map((s) => s.name), ...match.decoys].sort(),
    [match],
  );

  const yourClaims = Object.values(claims).filter((c) => c === "you").length;
  const oppClaims = Object.keys(claims).length - yourClaims;


  const maybeFinish = (claimsNow: Claims): boolean => {
    if (Object.keys(claimsNow).length < match.slots.length) return false;
    const you = Object.values(claimsNow).filter((c) => c === "you").length;
    const opp = match.slots.length - you;
    clearAll();
    release();
    setOppThinking(false);
    setOutcome(you > opp ? "win" : you < opp ? "lose" : "draw");
    return true;
  };

  const startOpponentTurn = (claimsNow: Claims) => {
    setTurn("opp");
    setOppThinking(true);
    schedule(() => {
      setOppThinking(false);
      // Consume the script, skipping slots that are already claimed. Once the
      // script runs dry the rival always answers correctly so games terminate.
      let idx = oppMoveIdx;
      const moves = match.opponentMoves;
      while (idx < moves.length && claimsNow[moves[idx].slotId]) idx++;
      let slot: XiSlot | undefined;
      let correct: boolean;
      if (idx < moves.length) {
        slot = match.slots.find((s) => s.id === moves[idx].slotId);
        correct = moves[idx].correct;
        setOppMoveIdx(idx + 1);
      } else {
        slot = match.slots.find((s) => !claimsNow[s.id]);
        correct = true;
      }

      if (slot && correct) {
        const nextClaims: Claims = { ...claimsNow, [slot.id]: "opp" };
        setClaims(nextClaims);
        flash("info", `Rival named the ${slot.position}: ${slot.name}`);
        if (maybeFinish(nextClaims)) return;
      } else if (slot) {
        flash("info", `Rival blanked on the ${slot.position} — your turn!`);
      }
      release();
      setTurn("you");
    }, thinkDelay());
  };

  const handleGuess = (input: string) => {
    if (turn !== "you" || outcome || !selectedSlot || !acquire()) return;
    const slot = match.slots.find((s) => s.id === selectedSlot);
    if (!slot) {
      release();
      return;
    }

    setSelectedSlot(null);
    if (matchesName(input, slot.name, slot.aliases)) {
      const nextClaims: Claims = { ...claims, [slot.id]: "you" };
      setClaims(nextClaims);
      flash("correct", `${slot.name} started at ${slot.position} — shirt claimed!`);
      if (maybeFinish(nextClaims)) return;
    } else {
      flash("wrong", `${input} didn't start at ${slot.position}. Turn passes.`);
    }
    startOpponentTurn(matchesName(input, slot.name, slot.aliases) ? { ...claims, [slot.id]: "you" } : claims);
  };

  const reset = () => {
    clearAll();
    release();
    setClaims({});
    setSelectedSlot(null);
    setTurn("you");
    setOppThinking(false);
    setOppMoveIdx(0);
    clearFeedback();
    setOutcome(null);
  };

  const selected = match.slots.find((s) => s.id === selectedSlot);

  return (
    <div className="flex flex-1 flex-col">
      <DuelHud
        accent={mode.accent}
        turn={turn}
        oppThinking={oppThinking}
        youValue={`${yourClaims} shirts`}
        oppValue={`${oppClaims} shirts`}
        centerLabel={
          <span className="text-[11px] font-bold text-brand-slate-light">
            {Object.keys(claims).length}/11
          </span>
        }
      />

      <div className="mb-2 text-center">
        <div className="text-sm font-bold text-white">{match.teamName}</div>
        <div className="text-xs text-brand-slate-light">
          {match.matchLabel} · {match.formation}
        </div>
      </div>

      {/* The pitch */}
      <div className="relative mx-auto mb-3 aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-surface-mode-card-hover to-surface-mode-trough-deep">
        {/* Markings */}
        <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-white/20" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-0.5 w-full -translate-x-1/2 bg-white/20" />
        <div className="pointer-events-none absolute bottom-3 left-1/2 h-16 w-40 -translate-x-1/2 border-2 border-b-0 border-white/20" />
        <div className="pointer-events-none absolute left-1/2 top-3 h-16 w-40 -translate-x-1/2 border-2 border-t-0 border-white/20" />

        {match.slots.map((slot) => {
          const claimedBy = claims[slot.id];
          const isSelected = selectedSlot === slot.id;
          return (
            <button
              key={slot.id}
              type="button"
              disabled={!!claimedBy || turn !== "you" || !!outcome}
              onClick={() => {
                setSelectedSlot(slot.id);
                clearFeedback();
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            >
              <motion.div
                animate={isSelected ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={isSelected ? { repeat: Infinity, duration: 1.1 } : undefined}
                className={cn(
                  "flex size-11 flex-col items-center justify-center rounded-full border-2 text-white shadow-lg",
                  !claimedBy && !isSelected && "border-white/40 bg-surface-deep/90",
                  isSelected && "border-brand-green-light bg-surface-deep",
                  claimedBy === "you" && "border-brand-blue bg-brand-blue/85",
                  claimedBy === "opp" && "border-brand-red-soft bg-brand-red-soft/85",
                )}
              >
                <span className="text-[9px] font-bold leading-none opacity-80">{slot.position}</span>
                <span className="text-xs font-extrabold leading-tight">{slot.shirtNumber}</span>
              </motion.div>
              <div className="mt-0.5 flex h-4 items-center justify-center">
                {claimedBy ? (
                  <motion.span
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="whitespace-nowrap rounded bg-black/50 px-1 text-[9px] font-bold text-white"
                  >
                    {shortName(slot.name)}
                  </motion.span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-auto space-y-2">
        <FeedbackBanner feedback={feedback} />
        {selected && !outcome ? (
          <PlayerSearchInput
            candidates={candidates}
            onSubmit={handleGuess}
            disabled={turn !== "you"}
            placeholder={`Who started at ${selected.position} (#${selected.shirtNumber})?`}
            accentBgClass={mode.accent.bg}
          />
        ) : (
          <div className="flex h-12 items-center justify-center rounded-xl border border-dashed border-border text-sm text-brand-slate-light">
            {turn === "you" ? "Tap an empty shirt to guess it" : "Rival is picking a shirt…"}
          </div>
        )}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onExit}
            className="text-xs font-semibold text-brand-slate-light hover:text-white"
          >
            Switch match
          </button>
        </div>
      </div>

      {outcome ? (
        <EndOverlay
          outcome={outcome}
          subline={`${match.teamName} — ${match.matchLabel}`}
          stats={[{ label: "Shirts claimed", you: yourClaims, opp: oppClaims }]}
          onPlayAgain={reset}
          backHref={backHref}
        />
      ) : null}
    </div>
  );
}
