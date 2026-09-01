"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Flag, Lightbulb } from "lucide-react";
import { DailyChallengeHeader } from "./components/DailyChallengeHeader";
import { QuitGameDialog } from "./QuitGameDialog";
import { useResultSplash } from "./components/useResultSplash";
import { ResultSplash } from "./components/ResultSplash";
import { GuessCardDailyResult } from "./GuessCardDailyResult";
import { coinsForScore, saveGuessCardDailyRecord, type GuessCardDailyRecord } from "./guessCardDaily";
import { FutCard } from "@/features/mini-games/components/FutCard";
import { EditionSpinner, type SpinTarget } from "@/features/mini-games/components/EditionSpinner";
import { useMiniT } from "@/features/mini-games/lib/i18n";
import { matchesName } from "@/features/mini-games/lib/matching";
import { POINTS_PER_SOLVE, ROUND_SIZE, rand, IDENTITY_CLUES, type IdentityClue, type RoundResult, type GuessableCard } from "@/features/mini-games/lib/guessCard";
import type { FifaCard } from "@/features/mini-games/data/guessFifaCard";
import { DAILY_CARD_SET } from "./dailyCardSet";

type Status = "spin" | "clue" | "result";

/** The daily plays a fixed, CMS-authorable set of cards (mock for now). */
const DAILY_TOTAL = Math.min(ROUND_SIZE, DAILY_CARD_SET.length);

/**
 * "Guess the Card" as a daily challenge: 10 cards, each drawn by a spin, all
 * clues shown up front (no timer) — name the player or give up. Uses the daily
 * chrome (header, quit dialog, result splash) and finishes with a coin reward.
 */
export function GuessTheCardDailyGame({
  onExit,
  onFinished,
}: {
  onExit: () => void;
  onFinished?: (record: GuessCardDailyRecord) => void;
}) {
  const t = useMiniT();
  const [card, setCard] = useState<GuessableCard | null>(null);
  const [targetEdition, setTargetEdition] = useState<SpinTarget>("FC26");
  const [spinKey, setSpinKey] = useState(0);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>("spin");
  const [shownClue, setShownClue] = useState<IdentityClue>("nation");
  const [manualReveals, setManualReveals] = useState<IdentityClue[]>([]);
  const [outcome, setOutcome] = useState<{ solved: boolean; points: number; wrong: boolean } | null>(null);
  const [input, setInput] = useState("");
  const [showQuit, setShowQuit] = useState(false);
  const [finalRecord, setFinalRecord] = useState<GuessCardDailyRecord | null>(null);

  const { splashProps, fire } = useResultSplash();

  const pendingRef = useRef<GuessableCard | null>(null);
  const roundRef = useRef<GuessableCard[]>(DAILY_CARD_SET); // the fixed 10, shuffled on mount
  const resultsRef = useRef<RoundResult[]>([]);
  const statusRef = useRef(status);
  const indexRef = useRef(index);
  const cardRef = useRef(card);
  const advanceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { cardRef.current = card; }, [card]);

  const clearAdvance = () => {
    if (advanceRef.current) { window.clearTimeout(advanceRef.current); advanceRef.current = null; }
  };

  // Draw the i-th card from the fixed daily set; the reel lands on its edition
  // (or ICONS). The card stays hidden until the spin lands.
  const beginCard = useCallback((i: number) => {
    const drawn = roundRef.current[i] ?? null;
    pendingRef.current = drawn;
    const isIcon = !!drawn && "playStyle" in drawn && !!drawn.playStyle;
    const target: SpinTarget = isIcon ? "ICONS" : ((drawn as FifaCard | null)?.edition ?? "FC26");
    setShownClue(rand(IDENTITY_CLUES)); // one clue shown, the other two hidden
    setManualReveals([]);
    setOutcome(null);
    setInput("");
    setStatus("spin");
    setTargetEdition(target);
    setSpinKey((k) => k + 1);
  }, []);

  const startedRef = useRef(false);
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (startedRef.current) return;
      startedRef.current = true;
      // shuffle the fixed 10 once per round (client-side, so no SSR mismatch)
      const shuffled = [...DAILY_CARD_SET];
      for (let j = shuffled.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
      }
      roundRef.current = shuffled;
      beginCard(0);
    }, 0);
    return () => window.clearTimeout(id);
  }, [beginCard]);

  const finishRound = useCallback(() => {
    const results = resultsRef.current;
    const score = results.reduce((s, r) => s + r.points, 0);
    const solved = results.filter((r) => r.solved).length;
    const rec = saveGuessCardDailyRecord({ score, coins: coinsForScore(score), solved, total: DAILY_TOTAL });
    setFinalRecord(rec);
    onFinished?.(rec);
  }, [onFinished]);

  const nextCard = useCallback(() => {
    clearAdvance();
    const ni = indexRef.current + 1;
    if (ni >= DAILY_TOTAL) {
      finishRound();
      return;
    }
    setIndex(ni);
    beginCard(ni);
  }, [beginCard, finishRound]);

  const resolveCard = useCallback(
    (solved: boolean, wrong = false) => {
      const c = cardRef.current;
      const pts = solved ? POINTS_PER_SOLVE : 0;
      setStatus("result");
      setOutcome({ solved, points: pts, wrong });
      if (c) resultsRef.current = [...resultsRef.current, { card: c, points: pts, solved }];
      if (solved) fire("correct", "right", { points: pts, forcePoints: true });
      else if (wrong) fire("wrong", "right");
      clearAdvance();
      advanceRef.current = window.setTimeout(nextCard, solved ? 1500 : 2200);
    },
    [nextCard, fire],
  );

  const onSpinDone = useCallback(() => {
    setCard(pendingRef.current);
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
    const ok = matchesName(input, card.accepted).ok;
    resolveCard(ok, !ok);
  };
  const giveUp = () => { if (status === "clue") resolveCard(false, false); };

  // One clue reveal per card — unlock whichever hidden clue you prefer.
  const revealClue = (clue: IdentityClue) => {
    if (status !== "clue" || manualReveals.length >= 1) return;
    if (clue === shownClue) return;
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
        total={DAILY_TOTAL}
        hideTimer
        centerLabel={t("Card {n}/{total}", { n: Math.min(index + 1, DAILY_TOTAL), total: DAILY_TOTAL })}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full max-w-md flex-col px-4 pb-5">
          <AnimatePresence mode="wait">
            {status === "spin" || !card ? (
              <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="flex flex-1 flex-col justify-center">
                {spinKey > 0 && <EditionSpinner key={spinKey} target={targetEdition} onDone={onSpinDone} />}
              </motion.div>
            ) : (
              <motion.div key="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <div className="mt-3">
                  <FutCard
                    card={card}
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
                          autoComplete="off"
                          spellCheck={false}
                          className="font-poppins h-14 w-full rounded-[14px] border-none bg-brand-blue px-5 pr-14 text-center text-base uppercase text-white outline-none placeholder:text-white/50 placeholder:normal-case placeholder:tracking-normal focus:outline-none"
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
      <QuitGameDialog open={showQuit} onOpenChange={setShowQuit} onQuit={onExit} />
      {finalRecord && <GuessCardDailyResult record={finalRecord} onDone={onExit} />}
    </div>
  );
}
