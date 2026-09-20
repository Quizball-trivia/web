"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Flag, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EndOverlay, type LabOutcome } from "../components/EndOverlay";
import { FeedbackBanner, useFeedback } from "../components/FeedbackBanner";
import { LabShell } from "../components/LabShell";
import type { LabProps } from "../types";
import {
  OWN_GOAL_TEAM_BLUE,
  OWN_GOAL_TEAM_RED,
  ownGoalBoards,
  type OwnGoalBoard,
  type OwnGoalCard,
  type OwnGoalClue,
  type OwnGoalHint,
} from "../data/ownGoal";
import { thinkDelay } from "../lib/text";
import { useLabTimers } from "../lib/useLabTimers";
import { getLabMode } from "../registry";

const mode = getLabMode("own-goal")!;

const YOUR_TOTAL = 7;
const RIVAL_TOTAL = 7;

// Overheard rival-huddle lines (in real Codenames you hear the other team argue).
const RIVAL_CHATTER = [
  "Too risky. Way too risky.",
  "It has to be that one, trust me.",
  "Don't overthink it — trust the clue.",
  "Wait… what if that's the trap?",
  "I'm sure. Ninety percent sure.",
  "We can't afford a miss here.",
  "No no no, not that one.",
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function OwnGoalGame({ backHref }: LabProps) {
  const [board, setBoard] = useState<OwnGoalBoard | null>(null);

  return (
    <LabShell mode={mode} backHref={backHref}>
      {board ? (
        <Round key={board.id} board={board} backHref={backHref} onExit={() => setBoard(null)} />
      ) : (
        <BoardPicker onPick={setBoard} />
      )}
    </LabShell>
  );
}

function BoardPicker({ onPick }: { onPick: (b: OwnGoalBoard) => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-3">
      {/* 4v4 team framing — the real mode is 2v2–4v4 with a human Scout. */}
      <div className="mb-1 rounded-2xl bg-surface-card-deeper p-3 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-slate-light">
          4v4 team match
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-2 text-xs font-bold">
          <span className="rounded-lg bg-brand-blue/20 px-2.5 py-1 text-brand-cyan">
            {OWN_GOAL_TEAM_BLUE.join(" · ")}
          </span>
          <span className="text-brand-slate">vs</span>
          <span className="rounded-lg bg-brand-red-soft/15 px-2.5 py-1 text-brand-red-soft">
            {OWN_GOAL_TEAM_RED.join(" · ")}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-brand-slate-light">
          Your AI Scout gives the clues. Your teammates chime in. You make the calls.
        </p>
      </div>
      <p className="text-center text-sm text-brand-slate-light">Pick a board:</p>
      {/* board buttons below; attribution for the photo cards: */}
      {ownGoalBoards.map((board) => (
        <button
          key={board.id}
          type="button"
          onClick={() => onPick(board)}
          className="rounded-2xl border border-transparent bg-surface-card p-4 text-left transition-all hover:border-brand-red/40 hover:bg-surface-card-tint active:scale-[0.98]"
        >
          <div className="text-sm font-bold text-white">{board.title}</div>
          <div className="mt-0.5 text-xs text-brand-slate-light">{board.subtitle}</div>
        </button>
      ))}
      <p className="text-center text-[10px] text-brand-slate">
        Card photos: Wikimedia Commons (see public/game-mode-lab/cards/CREDITS.md)
      </p>
    </div>
  );
}

function Round({
  board,
  onExit,
  backHref,
}: { board: OwnGoalBoard; onExit: () => void } & LabProps) {
  const { schedule, clearAll } = useLabTimers();
  const { feedback, flash, clearFeedback } = useFeedback();

  const [flips, setFlips] = useState<Record<string, true>>({});
  const [turn, setTurn] = useState<"you" | "opp">("you");
  const [clue, setClue] = useState<OwnGoalClue | null>(board.yourClues[0] ?? null);
  const [guessesLeft, setGuessesLeft] = useState((board.yourClues[0]?.count ?? 1) + 1);
  const [hint, setHint] = useState<OwnGoalHint | null>(null);
  const [rivalClueText, setRivalClueText] = useState<string | null>(null);
  const [rivalThinking, setRivalThinking] = useState(false);
  const [rivalChatter, setRivalChatter] = useState<{ name: string; text: string } | null>(null);
  const [rivalFocus, setRivalFocus] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<LabOutcome | null>(null);
  const [endNote, setEndNote] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, true>>({});

  // Synchronous mirrors — taps and timers must not race the render cycle.
  const flipsRef = useRef<Record<string, true>>({});
  const turnRef = useRef<"you" | "opp">("you");
  const outcomeRef = useRef<LabOutcome | null>(null);
  const guessesRef = useRef((board.yourClues[0]?.count ?? 1) + 1);
  const clueIdxRef = useRef(1); // clue 0 is consumed by the initial state above
  const rivalTurnIdxRef = useRef(0);

  // Schedule the opening clue's teammate whisper once per round.
  useEffect(() => {
    const firstHint = board.yourClues[0]?.hint;
    if (!firstHint) return;
    schedule(() => {
      if (turnRef.current === "you" && !outcomeRef.current && !flipsRef.current[firstHint.cardId]) setHint(firstHint);
    }, 2200);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per round
  }, []);

  const cardById = (id: string) => board.cards.find((c) => c.id === id);
  const countOwned = (owner: OwnGoalCard["owner"]) =>
    board.cards.filter((c) => c.owner === owner && flipsRef.current[c.id]).length;

  const finish = (result: LabOutcome, note: string) => {
    clearAll();
    outcomeRef.current = result;
    setRivalThinking(false);
    setEndNote(note);
    setOutcome(result);
  };

  /** Flip a card and apply Codenames ownership rules. Returns the owner. */
  const applyFlip = (card: OwnGoalCard, by: "you" | "opp") => {
    flipsRef.current = { ...flipsRef.current, [card.id]: true };
    setFlips(flipsRef.current);

    if (card.owner === "owngoal") {
      // Scripted rival turns never pick it, so only the user can hit it.
      finish("lose", `☠️ ${card.revealNote}`);
      return card.owner;
    }
    if (card.owner === "you") {
      flash(by === "you" ? "correct" : "info", by === "you" ? card.revealNote : `Rival flipped YOUR card — ${card.revealNote}`);
      if (countOwned("you") >= YOUR_TOTAL) finish("win", "Board cleared — your team's 7 cards are all up.");
    } else if (card.owner === "rival") {
      flash(by === "you" ? "wrong" : "info", by === "you" ? card.revealNote : `Rival claims: ${card.label}.`);
      if (countOwned("rival") >= RIVAL_TOTAL) finish("lose", "The rival team cleared their 7 cards first.");
    } else {
      flash("info", card.revealNote);
    }
    return card.owner;
  };

  const nextYourClue = (): OwnGoalClue => {
    const scripted = board.yourClues[clueIdxRef.current];
    if (scripted) return scripted;
    // Scripts dry: the Scout points at one remaining card at a time.
    const remaining = board.cards.find((c) => c.owner === "you" && !flipsRef.current[c.id]);
    return { text: remaining?.fallbackClue ?? "Trust your gut — 1", count: 1 };
  };

  const startYourTurn = () => {
    if (outcomeRef.current) return;
    turnRef.current = "you";
    setTurn("you");
    setRivalClueText(null);
    setRivalChatter(null);
    setRivalFocus(null);
    const next = nextYourClue();
    clueIdxRef.current += 1;
    setClue(next);
    guessesRef.current = next.count + 1; // Codenames overshoot: count + 1 guesses
    setGuessesLeft(next.count + 1);
    setHint(null);
    if (next.hint && !flipsRef.current[next.hint.cardId]) {
      const pending = next.hint;
      schedule(() => {
        if (turnRef.current === "you" && !outcomeRef.current && !flipsRef.current[pending.cardId]) setHint(pending);
      }, 2200);
    }
  };

  // Rival turn choreography: huddle → overheard chatter → clue → per-card
  // deliberation (hover, sometimes a fake-out toward a wrong card) → flip.
  const startRivalTurn = () => {
    if (outcomeRef.current) return;
    turnRef.current = "opp";
    setTurn("opp");
    setHint(null);
    setRivalThinking(true);

    const scripted = board.rivalTurns[rivalTurnIdxRef.current];
    rivalTurnIdxRef.current += 1;
    const fallbackPick = board.cards.find((c) => c.owner === "rival" && !flipsRef.current[c.id]);
    const rivalTurn = scripted ?? {
      clueText: "Gut — 1",
      count: 1,
      picks: fallbackPick ? [fallbackPick.id] : [],
    };
    const picks = rivalTurn.picks.filter((id) => !flipsRef.current[id]);
    const [speakerA, speakerB] = [...OWN_GOAL_TEAM_RED].sort(() => Math.random() - 0.5);

    const flipAt = (i: number) => {
      if (outcomeRef.current) return;
      const card = i < picks.length ? cardById(picks[i]) : undefined;
      if (!card || flipsRef.current[card.id]) {
        setRivalFocus(null);
        return schedule(startYourTurn, 900);
      }
      const commit = () => {
        if (outcomeRef.current) return;
        setRivalFocus(card.id);
        schedule(() => {
          if (outcomeRef.current) return;
          setRivalFocus(null);
          const owner = applyFlip(card, "opp");
          if (outcomeRef.current) return;
          if (owner === "rival") {
            schedule(() => flipAt(i + 1), thinkDelay(900, 1500));
          } else {
            setRivalChatter({ name: speakerB, text: "Ah no. NO. Who said that one?!" });
            schedule(startYourTurn, 2000); // miss (neutral or your card) ends their turn
          }
        }, thinkDelay(800, 1300));
      };
      // ~40% of picks: linger on a wrong card first (even the Own Goal — they
      // always back off it), then drift to the real choice.
      const decoys = board.cards.filter((c) => !flipsRef.current[c.id] && c.id !== card.id);
      if (Math.random() < 0.4 && decoys.length > 0) {
        const decoy = pickRandom(decoys);
        setRivalFocus(decoy.id);
        schedule(() => {
          if (outcomeRef.current) return;
          if (decoy.owner === "owngoal") {
            setRivalChatter({ name: speakerA, text: "Are you insane?! Step away from that one." });
          }
          commit();
        }, thinkDelay(800, 1400));
      } else {
        commit();
      }
    };

    // Huddle beats: two overheard lines, then the clue drops.
    schedule(() => {
      if (outcomeRef.current) return;
      setRivalChatter({ name: speakerA, text: pickRandom(RIVAL_CHATTER) });
      schedule(() => {
        if (outcomeRef.current) return;
        const firstPick = picks[0] ? cardById(picks[0]) : undefined;
        setRivalChatter(
          firstPick && Math.random() < 0.6
            ? { name: speakerB, text: `What about “${firstPick.label}”?` }
            : { name: speakerB, text: pickRandom(RIVAL_CHATTER) },
        );
        schedule(() => {
          if (outcomeRef.current) return;
          setRivalChatter(null);
          setRivalThinking(false);
          setRivalClueText(rivalTurn.clueText);
          schedule(() => flipAt(0), thinkDelay(1000, 1600));
        }, thinkDelay(1300, 2000));
      }, thinkDelay(1300, 2100));
    }, thinkDelay(900, 1500));
  };

  const handleTap = (card: OwnGoalCard) => {
    if (turnRef.current !== "you" || outcomeRef.current || flipsRef.current[card.id]) return;
    const owner = applyFlip(card, "you");
    if (outcomeRef.current) return;
    guessesRef.current -= 1;
    setGuessesLeft(guessesRef.current);
    if (owner !== "you" || guessesRef.current <= 0) {
      turnRef.current = "opp"; // sync-block further taps before the timer fires
      startRivalTurn();
    }
  };

  const handleEndTurn = () => {
    if (turnRef.current !== "you" || outcomeRef.current) return;
    turnRef.current = "opp"; // sync-block further taps, mirroring handleTap
    startRivalTurn();
  };

  const reset = () => {
    clearAll();
    clearFeedback();
    flipsRef.current = {};
    setFlips({});
    outcomeRef.current = null;
    setOutcome(null);
    setEndNote(null);
    clueIdxRef.current = 1; // clue 0 goes straight back into play below
    rivalTurnIdxRef.current = 0;
    setRivalClueText(null);
    setRivalThinking(false);
    setRivalChatter(null);
    setRivalFocus(null);
    setHint(null);
    turnRef.current = "you";
    setTurn("you");
    const first = board.yourClues[0] ?? null;
    setClue(first);
    guessesRef.current = (first?.count ?? 1) + 1;
    setGuessesLeft((first?.count ?? 1) + 1);
    // Re-run the first clue's hint scheduling.
    if (first?.hint) {
      const pending = first.hint;
      schedule(() => {
        if (turnRef.current === "you" && !outcomeRef.current && !flipsRef.current[pending.cardId]) setHint(pending);
      }, 2200);
    }
  };

  const youClaimed = board.cards.filter((c) => c.owner === "you" && flips[c.id]).length;
  const rivalClaimed = board.cards.filter((c) => c.owner === "rival" && flips[c.id]).length;

  return (
    <div className="flex flex-1 flex-col">
      {/* Team scoreboard */}
      <div className="mb-3 flex items-stretch gap-2">
        <TeamPanel
          names={OWN_GOAL_TEAM_BLUE}
          claimed={youClaimed}
          total={YOUR_TOTAL}
          active={turn === "you"}
          color="blue"
        />
        <TeamPanel
          names={OWN_GOAL_TEAM_RED}
          claimed={rivalClaimed}
          total={RIVAL_TOTAL}
          active={turn === "opp"}
          color="red"
          thinking={rivalThinking}
        />
      </div>

      {/* Clue banner */}
      <div
        className={cn(
          "mb-3 rounded-2xl border px-4 py-3 text-center",
          turn === "you" ? "border-brand-blue/40 bg-brand-blue/10" : "border-brand-red-soft/40 bg-brand-red-soft/10",
        )}
      >
        {turn === "you" && clue ? (
          <>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-cyan">
              Your Scout&apos;s clue
            </div>
            <div className="text-lg font-extrabold text-white">{clue.text}</div>
            <div className="text-[11px] font-semibold text-brand-slate-light">
              {guessesLeft} guess{guessesLeft === 1 ? "" : "es"} left (clue + 1 bonus)
            </div>
          </>
        ) : (
          <>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-red-soft">
              Rival Scout
            </div>
            <div className="text-lg font-extrabold text-white">
              {rivalThinking ? "Huddling…" : rivalClueText ?? "…"}
            </div>
          </>
        )}
      </div>

      {/* Teammate whisper (blue) / overheard rival huddle (red) */}
      <div className="mb-2 min-h-9">
        <AnimatePresence mode="wait">
          {hint && turn === "you" ? (
            <motion.div
              key={`hint-${hint.cardId}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-xl bg-surface-card px-3 py-2 text-xs text-white"
            >
              <MessageCircle className="size-3.5 shrink-0 text-brand-cyan" />
              <span>
                <span className="font-bold text-brand-cyan">{hint.teammate}:</span> {hint.text}
              </span>
            </motion.div>
          ) : rivalChatter && turn === "opp" ? (
            <motion.div
              key={`chatter-${rivalChatter.name}-${rivalChatter.text}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-xl bg-surface-card px-3 py-2 text-xs italic text-brand-slate-light"
            >
              <MessageCircle className="size-3.5 shrink-0 text-brand-red-soft" />
              <span>
                <span className="font-bold not-italic text-brand-red-soft">{rivalChatter.name}:</span>{" "}
                “{rivalChatter.text}”
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* The board — real photo cards (Wikimedia Commons), emoji fallback. */}
      <div className="mb-3 grid grid-cols-4 gap-1.5 sm:grid-cols-5">
        {board.cards.map((card) => {
          const isFlipped = !!flips[card.id];
          const isRivalFocus = rivalFocus === card.id && !isFlipped;
          return (
            <motion.button
              key={card.id}
              type="button"
              disabled={isFlipped || turn !== "you" || !!outcome}
              onClick={() => handleTap(card)}
              whileTap={{ scale: 0.93 }}
              animate={{ scale: isRivalFocus ? 1.06 : 1 }}
              className={cn(
                "overflow-hidden rounded-xl border text-center transition-colors",
                !isFlipped && !isRivalFocus && "border-border bg-surface-card hover:border-white/30",
                isRivalFocus && "z-10 border-brand-red-soft ring-2 ring-brand-red-soft/50",
                isFlipped && card.owner === "you" && "border-brand-blue",
                isFlipped && card.owner === "rival" && "border-brand-red-soft",
                isFlipped && card.owner === "neutral" && "border-border opacity-55",
                isFlipped && card.owner === "owngoal" && "border-brand-red",
              )}
            >
              <div className="relative aspect-square w-full bg-surface-card-deeper">
                {brokenImages[card.id] ? (
                  <span className="flex h-full items-center justify-center text-3xl">{card.emoji}</span>
                ) : (
                  <Image
                    src={`/game-mode-lab/cards/${card.id}.jpg`}
                    alt={card.label}
                    fill
                    sizes="(max-width: 640px) 25vw, 20vw"
                    className={cn("object-cover", isFlipped && card.owner === "neutral" && "grayscale")}
                    onError={() =>
                      setBrokenImages((prev) => ({ ...prev, [card.id]: true }))
                    }
                  />
                )}
                {isFlipped ? (
                  <div
                    className={cn(
                      "absolute inset-0 flex items-center justify-center",
                      card.owner === "you" && "bg-brand-blue/50",
                      card.owner === "rival" && "bg-brand-red-soft/50",
                      card.owner === "neutral" && "bg-black/45",
                      card.owner === "owngoal" && "bg-brand-red/60",
                    )}
                  >
                    <span className="text-2xl drop-shadow">
                      {card.owner === "owngoal" ? "☠️" : card.owner === "neutral" ? "—" : card.owner === "you" ? "🔵" : "🔴"}
                    </span>
                  </div>
                ) : null}
              </div>
              <div
                className={cn(
                  "px-1 py-1 text-[10px] font-bold leading-tight text-white",
                  isFlipped && card.owner === "owngoal" ? "bg-brand-red/40" : "bg-surface-card",
                )}
              >
                {isFlipped && card.owner === "owngoal" ? "OWN GOAL!" : card.label}
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-auto space-y-2">
        <FeedbackBanner feedback={feedback} />
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleEndTurn}
            disabled={turn !== "you" || !!outcome}
          >
            <Flag className="size-4" /> End turn — bank it
          </Button>
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onExit}
            className="text-xs font-semibold text-brand-slate-light hover:text-white"
          >
            Switch board
          </button>
        </div>
      </div>

      {outcome ? (
        <EndOverlay
          outcome={outcome}
          heading={endNote?.startsWith("☠️") ? "OWN GOAL!" : undefined}
          subline={endNote ?? undefined}
          stats={[{ label: "Cards claimed", you: `${youClaimed}/7`, opp: `${rivalClaimed}/7` }]}
          onPlayAgain={reset}
          backHref={backHref}
        />
      ) : null}
    </div>
  );
}

function TeamPanel({
  names,
  claimed,
  total,
  active,
  color,
  thinking = false,
}: {
  names: string[];
  claimed: number;
  total: number;
  active: boolean;
  color: "blue" | "red";
  thinking?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex-1 rounded-2xl border bg-surface-card px-3 py-2",
        active ? (color === "blue" ? "border-brand-blue/60" : "border-brand-red-soft/60") : "border-transparent",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {names.map((name) => (
            <span
              key={name}
              title={name}
              className={cn(
                "flex size-6 items-center justify-center rounded-full border-2 border-surface-card text-[10px] font-bold text-white",
                color === "blue" ? "bg-brand-blue" : "bg-brand-red-soft",
              )}
            >
              {name[0]}
            </span>
          ))}
        </div>
        <div className="text-right">
          <div className="text-sm font-extrabold text-white">
            {claimed}/{total}
          </div>
          {thinking ? (
            <div className="text-[9px] font-semibold text-brand-slate-light">thinking…</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
