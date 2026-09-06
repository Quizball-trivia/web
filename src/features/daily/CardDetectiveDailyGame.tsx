"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Coins, Flag } from "lucide-react";
import { DailyChallengeHeader } from "./components/DailyChallengeHeader";
import { QuitGameDialog } from "./QuitGameDialog";
import { useResultSplash } from "./components/useResultSplash";
import { ResultSplash } from "./components/ResultSplash";
import { CardDealReel } from "@/features/fifa-universe/components/CardDealReel";
import { DetectiveCard, freeCluesFor, type ClueCosts, type ClueKey } from "@/features/fifa-universe/components/DetectiveCard";
import { NameInput } from "@/features/fifa-universe/components/ui";
import { useMiniT } from "@/features/mini-games/lib/i18n";
import { matchesName } from "@/features/mini-games/lib/matching";
import type { CardDetectiveSession, DailyChallengeCardOutcome } from "@/lib/domain/dailyChallenge";

type Status = "deal" | "play" | "result";

interface CardDetectiveDailyGameProps {
  session: CardDetectiveSession;
  onBack: () => void;
  onComplete: (score: number, nextPath?: string, outcomes?: DailyChallengeCardOutcome[]) => void;
}

/**
 * Card Detective as a daily challenge: today's cards are dealt one by one from
 * a face-down reel; every slot on the card is a locked clue with a coin price.
 * Name the player with as many coins left as you can — a solve scores the coins
 * left, a wrong name costs coins, giving up scores nothing. Completion goes
 * through the shared daily route (score + per-card outcomes) like FIFA Cards.
 */
export function CardDetectiveDailyGame({ session, onBack, onComplete }: CardDetectiveDailyGameProps) {
  const t = useMiniT();
  const reduceMotion = useReducedMotion();
  const cards = session.cards;
  const total = cards.length;
  const costs: ClueCosts = session.clueCosts;

  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>("deal");
  // Coins and opened clues live in one state so a purchase is atomic — two taps
  // on the same lock during its exit animation can never charge twice.
  const [board, setBoard] = useState<{ coins: number; open: Set<ClueKey> }>(() => ({ coins: session.startCoins, open: freeCluesFor(cards[0]?.id ?? "") }));
  const { coins, open } = board;
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [showQuit, setShowQuit] = useState(false);

  const { splashProps, fire } = useResultSplash();
  const outcomesRef = useRef<DailyChallengeCardOutcome[]>([]);
  // A lock animating out keeps its old click handler; the ref lets that stale
  // closure see the current phase so nothing can be bought after a resolve.
  const statusRef = useRef<Status>("deal");
  useEffect(() => { statusRef.current = status; }, [status]);
  const completedRef = useRef(false);
  const advanceRef = useRef<number | null>(null);

  const card = cards[index] ?? null;

  const clearAdvance = () => {
    if (advanceRef.current) {
      window.clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }
  };

  const beginCard = useCallback((cardId: string) => {
    setBoard({ coins: session.startCoins, open: freeCluesFor(cardId) });
    setSolved(false);
    setWrong(null);
    setStatus("deal");
  }, [session.startCoins]);

  const finishRound = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    const outcomes = outcomesRef.current;
    const total = outcomes.reduce((sum, o) => sum + (o.solved ? (o.coinsLeft ?? 0) : 0), 0);
    onComplete(total, undefined, outcomes);
  }, [onComplete]);

  // An empty set can't be played — complete immediately so the player isn't stuck.
  useEffect(() => {
    if (total === 0) finishRound();
  }, [finishRound, total]);

  const nextCard = useCallback(() => {
    clearAdvance();
    if (index + 1 >= total) {
      finishRound();
      return;
    }
    setIndex(index + 1);
    beginCard(cards[index + 1].id);
  }, [beginCard, cards, finishRound, index, total]);

  const resolveCard = useCallback(
    (didSolve: boolean) => {
      if (!card || status !== "play") return;
      const points = didSolve ? coins : 0;
      setStatus("result");
      setSolved(didSolve);
      setScore((s) => s + points);
      outcomesRef.current = [
        ...outcomesRef.current,
        // Only purchased clues count; the free starters are part of every card.
        { cardId: card.id, solved: didSolve, cluesRevealed: Math.max(0, open.size - freeCluesFor(card.id).size), coinsLeft: coins },
      ];
      if (didSolve) fire("correct", "right", { points, forcePoints: true });
      else fire("wrong", "right");
      clearAdvance();
      advanceRef.current = window.setTimeout(nextCard, didSolve ? 1600 : 2400);
    },
    [card, coins, fire, nextCard, open.size, status],
  );

  useEffect(() => () => clearAdvance(), []);

  const reveal = (k: ClueKey) => {
    if (statusRef.current !== "play") return;
    setBoard((prev) => (prev.open.has(k) || prev.coins < costs[k] ? prev : { coins: prev.coins - costs[k], open: new Set(prev.open).add(k) }));
  };

  const guess = (value: string) => {
    if (!card || status !== "play") return;
    if (matchesName(value, card.acceptedAnswers).ok) {
      resolveCard(true);
      return;
    }
    setWrong(value);
    setBoard((prev) => ({ ...prev, coins: Math.max(0, prev.coins - session.wrongGuessCost) }));
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat font-poppins text-white">
      <DailyChallengeHeader
        onQuit={() => setShowQuit(true)}
        currentIndex={index}
        total={total}
        hideTimer
        centerLabel={t("Card {n}/{total}", { n: Math.min(index + 1, total), total })}
        rightSlot={
          <>
            <Coins aria-hidden className="size-4 text-brand-yellow sm:size-5" />
            <span className={coins <= 20 ? "text-brand-red" : "text-brand-yellow"}>{coins}</span>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full max-w-md flex-col px-4 pb-5">
          <AnimatePresence mode="wait">
            {status === "deal" || !card ? (
              <motion.div key={`deal-${index}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="flex flex-1 flex-col justify-center">
                {card && <CardDealReel cardNumber={index} onDone={() => setStatus((s) => (s === "deal" ? "play" : s))} />}
              </motion.div>
            ) : (
              <motion.div
                key={`card-${index}`}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, rotateY: 90, scale: 0.9 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
                style={{ transformPerspective: 900 }}
              >
                <div className="mb-2 mt-1 flex items-center justify-between font-poppins text-[11px] font-black uppercase tracking-wider text-white/55">
                  <span>{status === "play" ? t("Tap a lock to buy that clue") : solved ? t("Solved") : t("Revealed")}</span>
                  <span className="text-brand-yellow">{t("Today {n} pts", { n: score })}</span>
                </div>
                <DetectiveCard
                  card={card}
                  costs={costs}
                  open={open}
                  coins={coins}
                  over={status === "result"}
                  solved={solved}
                  onReveal={reveal}
                />

                <div className="mt-4">
                  {status === "play" ? (
                    <div className="space-y-2.5">
                      <NameInput onSubmit={guess} autoFocus={false} />
                      <div className="flex items-center justify-between">
                        <span className="font-poppins text-[11px] font-black uppercase tracking-wider" style={{ color: wrong ? "#FB3101" : "rgba(255,255,255,0.4)" }}>
                          {wrong ? t("Not {name} · −{n} coins", { name: wrong, n: session.wrongGuessCost }) : t("Correct now = {n} pts", { n: coins })}
                        </span>
                        <button type="button" onClick={() => resolveCard(false)} className="inline-flex items-center gap-1 font-poppins text-[11px] font-black uppercase tracking-wider text-white/45 underline-offset-2 hover:underline">
                          <Flag className="size-3.5" /> {t("Give up")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center font-poppins text-sm font-semibold text-white/70">
                      {solved ? t("Nice — +{p}", { p: coins }) : t("It was {name}", { name: card.name })}
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
