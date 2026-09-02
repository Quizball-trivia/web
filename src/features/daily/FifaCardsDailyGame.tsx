"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Flag, Lightbulb } from "lucide-react";
import { DailyChallengeHeader } from "./components/DailyChallengeHeader";
import { QuitGameDialog } from "./QuitGameDialog";
import { useResultSplash } from "./components/useResultSplash";
import { ResultSplash } from "./components/ResultSplash";
import { FutCard, type FutCardData } from "@/features/mini-games/components/FutCard";
import { EditionSpinner, type SpinTarget } from "@/features/mini-games/components/EditionSpinner";
import { useMiniT } from "@/features/mini-games/lib/i18n";
import { matchesName } from "@/features/mini-games/lib/matching";
import { IDENTITY_CLUES, type IdentityClue } from "@/features/mini-games/lib/guessCardConstants";
import type { DailyChallengeCardOutcome, FifaCardsSession, FifaCardsSessionCard } from "@/lib/domain/dailyChallenge";
import { FIFA_EDITIONS, type FifaEdition } from "@/features/mini-games/data/guessFifaCard";

type Status = "spin" | "clue" | "result";

interface FifaCardsDailyGameProps {
  session: FifaCardsSession;
  onBack: () => void;
  onComplete: (score: number, nextPath?: string, outcomes?: DailyChallengeCardOutcome[]) => void;
}

/**
 * The free clue is fixed for the day (card id + its position in today's set),
 * so a reload can't reroll it but a card that comes round again months later
 * may open a different clue.
 */
function freeClueFor(card: FifaCardsSessionCard, position: number): IdentityClue {
  let h = position;
  for (const ch of card.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return IDENTITY_CLUES[h % IDENTITY_CLUES.length];
}

/** The spinner only knows the editions we ship; anything else lands on the newest. */
function spinTargetFor(edition: string): SpinTarget {
  return (FIFA_EDITIONS as string[]).includes(edition) ? (edition as FifaEdition) : "FC26";
}

function toFutCard(card: FifaCardsSessionCard): FutCardData {
  return {
    id: card.id,
    editionLabel: card.editionLabel,
    name: card.name,
    overall: card.overall,
    position: card.position,
    nation: card.nation,
    nationCode: card.nationCode,
    league: card.league,
    club: card.club,
    stats: card.stats,
    faceUrl: card.faceUrl,
  };
}

/**
 * FIFA Cards as a daily challenge: the server's cards for today, each drawn by
 * a spin — name the player or give up, one clue unlock per card. Completion goes
 * through the shared daily route (score + per-card outcomes), which pays coins
 * and XP and shows the reward on the hub like every other daily.
 */
export function FifaCardsDailyGame({ session, onBack, onComplete }: FifaCardsDailyGameProps) {
  const t = useMiniT();
  const cards = session.cards;
  const total = cards.length;
  const pointsPerSolve = session.pointsPerSolve;

  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>("spin");
  const [cardShown, setCardShown] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const [manualReveals, setManualReveals] = useState<IdentityClue[]>([]);
  const [outcome, setOutcome] = useState<{ solved: boolean; points: number; wrong: boolean } | null>(null);
  const [input, setInput] = useState("");
  const [showQuit, setShowQuit] = useState(false);

  const { splashProps, fire } = useResultSplash();
  const outcomesRef = useRef<DailyChallengeCardOutcome[]>([]);
  const completedRef = useRef(false);
  const advanceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const card = cards[index] ?? null;
  const shownClue = useMemo(() => (card ? freeClueFor(card, index) : "nation"), [card, index]);
  const targetEdition = spinTargetFor(card?.edition ?? "FC26");

  const clearAdvance = () => {
    if (advanceRef.current) {
      window.clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }
  };

  const beginCard = useCallback(() => {
    setManualReveals([]);
    setOutcome(null);
    setInput("");
    setStatus("spin");
    setCardShown(false);
    setSpinKey((k) => k + 1);
  }, []);

  // Kick off the first spin after mount (client-only so nothing animates during SSR).
  useEffect(() => {
    const id = window.setTimeout(beginCard, 0);
    return () => window.clearTimeout(id);
  }, [beginCard]);

  const finishRound = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    const outcomes = outcomesRef.current;
    const score = outcomes.filter((o) => o.solved).length * pointsPerSolve;
    onComplete(score, undefined, outcomes);
  }, [onComplete, pointsPerSolve]);

  const nextCard = useCallback(() => {
    clearAdvance();
    if (index + 1 >= total) {
      finishRound();
      return;
    }
    setIndex(index + 1);
    beginCard();
  }, [beginCard, finishRound, index, total]);

  const resolveCard = useCallback(
    (solved: boolean, wrong = false) => {
      if (!card || status !== "clue") return;
      const points = solved ? pointsPerSolve : 0;
      setStatus("result");
      setOutcome({ solved, points, wrong });
      outcomesRef.current = [
        ...outcomesRef.current,
        { cardId: card.id, solved, cluesRevealed: 1 + manualReveals.length },
      ];
      if (solved) fire("correct", "right", { points, forcePoints: true });
      else if (wrong) fire("wrong", "right");
      clearAdvance();
      advanceRef.current = window.setTimeout(nextCard, solved ? 1500 : 2200);
    },
    [card, fire, manualReveals.length, nextCard, pointsPerSolve, status],
  );

  const onSpinDone = useCallback(() => {
    setCardShown(true);
    setStatus((s) => (s === "spin" ? "clue" : s));
  }, []);

  useEffect(() => {
    if (status === "clue") {
      const id = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [status, index]);

  useEffect(() => () => clearAdvance(), []);

  // One try: a wrong guess reveals the answer and moves on.
  const submit = () => {
    if (status !== "clue" || !card || !input.trim()) return;
    const ok = matchesName(input, card.acceptedAnswers).ok;
    resolveCard(ok, !ok);
  };
  const giveUp = () => {
    if (status === "clue") resolveCard(false, false);
  };

  // One clue reveal per card — unlock whichever hidden clue you prefer.
  const revealClue = (clue: IdentityClue) => {
    if (status !== "clue" || manualReveals.length >= 1 || clue === shownClue) return;
    setManualReveals([clue]);
  };

  const revealedClues = {
    nation: status === "result" || shownClue === "nation" || manualReveals.includes("nation"),
    league: status === "result" || shownClue === "league" || manualReveals.includes("league"),
    club: status === "result" || shownClue === "club" || manualReveals.includes("club"),
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat font-poppins text-white">
      <DailyChallengeHeader
        onQuit={() => setShowQuit(true)}
        currentIndex={index}
        total={total}
        hideTimer
        centerLabel={t("Card {n}/{total}", { n: Math.min(index + 1, total), total })}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full max-w-md flex-col px-4 pb-5">
          <AnimatePresence mode="wait">
            {status === "spin" || !card || !cardShown ? (
              <motion.div key={`spin-${index}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="flex flex-1 flex-col justify-center">
                {spinKey > 0 && <EditionSpinner key={spinKey} target={targetEdition} onDone={onSpinDone} />}
              </motion.div>
            ) : (
              <motion.div key={`card-${index}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <div className="mt-3">
                  <FutCard
                    card={toFutCard(card)}
                    revealed={revealedClues}
                    revealName={status === "result"}
                    highlight={status === "result" ? (outcome?.solved ? "correct" : "reveal") : null}
                    revealable={status === "clue" && manualReveals.length < 1}
                    onRevealClue={revealClue}
                  />
                </div>

                <div className="mt-4">
                  {status === "clue" ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-center gap-2">
                        <Lightbulb className={`size-6 shrink-0 ${manualReveals.length < 1 ? "text-brand-yellow" : "text-white/25"}`} />
                        <span className="font-poppins text-[14px] font-bold text-white/80">
                          {manualReveals.length < 1 ? t("Tap a lock to reveal a clue") : t("Clue revealed")}
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && submit()}
                          placeholder={t("Name the player…")}
                          aria-label={t("Name the player…")}
                          autoComplete="off"
                          spellCheck={false}
                          className="font-poppins h-14 w-full rounded-[14px] border-none bg-brand-blue px-5 pr-14 text-center text-base uppercase text-white outline-none placeholder:text-white/50 placeholder:normal-case placeholder:tracking-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
                          style={{ fontWeight: 600, boxShadow: "0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)" }}
                        />
                        <button type="button" onClick={submit} disabled={!input.trim()} aria-label={t("Go")} className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 disabled:opacity-40">
                          <Send className="size-4" />
                        </button>
                      </div>
                      <button type="button" onClick={giveUp} className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-white/[0.06] font-poppins text-sm font-black uppercase tracking-wide text-white/65 transition-colors hover:bg-white/10">
                        <Flag className="size-4" /> {t("Give up")}
                      </button>
                    </div>
                  ) : (
                    <p className="text-center font-poppins text-sm font-semibold text-white/70">
                      {outcome?.solved ? t("Nice — +{p}", { p: outcome.points }) : t("It was {name}", { name: card.name })}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ResultSplash {...splashProps} />
      <QuitGameDialog open={showQuit} onOpenChange={setShowQuit} onQuit={onBack} />
    </div>
  );
}
