"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronRight, Flag, Lightbulb } from "lucide-react";
import { DailyChallengeHeader } from "./components/DailyChallengeHeader";
import { DailyChallengeCompleteModal } from "./components/DailyChallengeCompleteModal";
import { QuitGameDialog } from "./QuitGameDialog";
import { useResultSplash } from "./components/useResultSplash";
import { ResultSplash } from "./components/ResultSplash";
import { CardDealReel } from "@/features/fifa-universe/components/CardDealReel";
import { DetectiveCard, freeCluesFor, type ClueCosts, type ClueKey } from "@/features/fifa-universe/components/DetectiveCard";
import { NameInput } from "@/features/fifa-universe/components/ui";
import { useMiniT } from "@/features/mini-games/lib/i18n";
import { matchesName } from "@/features/mini-games/lib/matching";
import type { CardDetectiveSession, DailyChallengeCardOutcome } from "@/lib/domain/dailyChallenge";
import { hintsBought, pointsSaved } from "./cardDetectiveReview";

type Status = "deal" | "play" | "result";

interface CardDetectiveDailyGameProps {
  session: CardDetectiveSession;
  onBack: () => void;
  onComplete: (score: number, nextPath?: string, outcomes?: DailyChallengeCardOutcome[]) => void;
  /** Sample / training round: the completion modal finishes immediately. */
  practice?: boolean;
}

/**
 * Card Detective as a daily challenge: today's cards are dealt one by one from
 * a face-down reel; every slot on the card is a locked clue with a price paid
 * from the card's hint budget (points, reset every card — never the account's
 * coins). A solve scores the budget left, a wrong name costs points, giving up
 * scores nothing. Each resolved card gets a review (the whole card, hints
 * bought, points saved by deduction) before the next one. Completion goes
 * through the shared daily route (score + per-card outcomes) like FIFA Cards.
 */
export function CardDetectiveDailyGame({ session, onBack, onComplete, practice = false }: CardDetectiveDailyGameProps) {
  // The finished run: coins banked, cards solved, and the per-card outcomes the page persists.
  const [final, setFinal] = useState<{ coins: number; solved: number; saved: number; outcomes: DailyChallengeCardOutcome[] } | null>(null);
  // The resolved card's review: hints bought and points kept by not buying the rest.
  const [review, setReview] = useState<{ bought: number; saved: number } | null>(null);
  const savedRef = useRef(0);
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

  const card = cards[index] ?? null;

  const beginCard = useCallback((cardId: string) => {
    setBoard({ coins: session.startCoins, open: freeCluesFor(cardId) });
    setSolved(false);
    setWrong(null);
    setReview(null);
    setStatus("deal");
  }, [session.startCoins]);

  const finishRound = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    const outcomes = outcomesRef.current;
    const coins = outcomes.reduce((sum, o) => sum + (o.solved ? (o.coinsLeft ?? 0) : 0), 0);
    setFinal({ coins, solved: outcomes.filter((o) => o.solved).length, saved: savedRef.current, outcomes });
  }, []);

  // An empty set can't be played — complete immediately so the player isn't stuck.
  useEffect(() => {
    if (total === 0 && !completedRef.current) {
      completedRef.current = true;
      onComplete(0, undefined, []);
    }
  }, [onComplete, total]);

  const nextCard = useCallback(() => {
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
      const saved = pointsSaved(costs, card.id, open, didSolve, coins);
      savedRef.current += saved;
      setStatus("result");
      setSolved(didSolve);
      setReview({ bought: hintsBought(card.id, open), saved });
      setScore((s) => s + points);
      outcomesRef.current = [
        ...outcomesRef.current,
        // Only purchased clues count; the free starters are part of every card.
        { cardId: card.id, solved: didSolve, cluesRevealed: Math.max(0, open.size - freeCluesFor(card.id).size), coinsLeft: coins },
      ];
      if (didSolve) fire("correct", "right", { points, forcePoints: true });
      // The review stays until the player moves on: no auto-advance.
      else fire("wrong", "right");
    },
    [card, coins, costs, fire, open, status],
  );

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
        // The card's hint budget, in points with its own icon: never the coin icon or colour of the account balance.
        rightSlot={
          <span data-card-detective-budget role="img" aria-label={t("Hint budget: {n} pts", { n: coins })} title={t("Hint budget")} className="flex items-center gap-1.5">
            <Lightbulb aria-hidden className="size-4 text-sky-300 sm:size-5" />
            <span className={coins <= 20 ? "text-brand-red" : "text-white"}>{coins}</span>
          </span>
        }
        // Same width as the card column below (max-w-md with px-4 on both).
        className="mx-auto w-full max-w-md"
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full max-w-md flex-col px-4 pb-5">
          <AnimatePresence mode="wait">
            {status === "deal" || !card ? (
              <motion.div key={`deal-${index}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="flex flex-1 flex-col justify-center">
                {card && <CardDealReel cardNumber={index} hint={t("Buy clues on the card, name the player, keep your points")} onDone={() => setStatus((s) => (s === "deal" ? "play" : s))} />}
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
                {status === "play" && (
                  <p data-card-detective-budget-note className="mt-1 flex items-center gap-1.5 font-poppins text-[10px] font-semibold text-white/45">
                    <Lightbulb aria-hidden className="size-3 shrink-0 text-sky-300" />
                    {t("Hint budget resets every card · separate from your coins")}
                  </p>
                )}
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
                  priceUnit="points"
                />

                <div className="mt-4">
                  {status === "play" ? (
                    <div className="space-y-2.5">
                      <NameInput onSubmit={guess} autoFocus={false} />
                      <div className="flex items-center justify-between">
                        <span className="font-poppins text-[11px] font-black uppercase tracking-wider" style={{ color: wrong ? "#FB3101" : "rgba(255,255,255,0.4)" }}>
                          {wrong ? t("Not {name} · −{n} pts", { name: wrong, n: session.wrongGuessCost }) : t("Correct now = {n} pts", { n: coins })}
                        </span>
                        <button type="button" onClick={() => resolveCard(false)} className="inline-flex items-center gap-1 font-poppins text-[11px] font-black uppercase tracking-wider text-white/45 underline-offset-2 hover:underline">
                          <Flag className="size-3.5" /> {t("Give up")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <motion.div
                      data-card-detective-review={solved ? "solved" : "missed"}
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: reduceMotion ? 0 : 0.25, type: "spring", stiffness: 260, damping: 24 }}
                      className="rounded-2xl bg-white/[0.06] px-4 py-3 text-center font-poppins"
                    >
                      <p className="text-lg font-black leading-tight text-white">{card.name}</p>
                      <p className="mt-0.5 text-sm font-semibold text-white/70">{solved ? t("Nice — +{p}", { p: coins }) : t("No points on a surrendered card")}</p>
                      {review && (
                        <div className="mt-3 flex items-stretch justify-center gap-2 text-[11px] font-black uppercase tracking-wider">
                          <span className="flex flex-1 items-center justify-center rounded-xl bg-black/20 px-2 py-2 text-white/70">
                            {review.bought === 0 ? t("No hints bought") : t("Hints bought: {n}", { n: review.bought })}
                          </span>
                          {solved && review.saved > 0 && (
                            <motion.span
                              data-card-detective-saved={review.saved}
                              initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: reduceMotion ? 0 : 0.5, type: "spring", stiffness: 320, damping: 16 }}
                              className="flex flex-1 items-center justify-center rounded-xl bg-brand-green/20 px-2 py-2 text-brand-green-light"
                            >
                              {t("+{n} pts saved by skipping hints", { n: review.saved })}
                            </motion.span>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        data-card-detective-next
                        // The review replaces the name input: keep keyboard focus on the way forward.
                        autoFocus
                        onClick={nextCard}
                        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-1 rounded-full bg-brand-green text-sm font-black uppercase tracking-wide text-black hover:brightness-110"
                      >
                        {index + 1 >= total ? t("See results") : t("Next card")} <ChevronRight aria-hidden className="size-4" />
                      </button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ResultSplash {...splashProps} />
      <QuitGameDialog open={showQuit} onOpenChange={setShowQuit} onQuit={onBack} />

      <DailyChallengeCompleteModal
        practice={practice}
        open={final !== null}
        title={session.title}
        correct={final?.solved ?? 0}
        total={total}
        // The score is hint-budget points, not the account coins it later converts into.
        scoreLabel={t("Points")}
        challengeType={session.challengeType}
        scoreValue={t("{n} pts", { n: (final?.coins ?? 0).toLocaleString() })}
        friendAction={final ? (
          <div data-card-detective-saved-total className="rounded-[18px] bg-black/18 px-5 py-4 font-poppins">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{t("Points saved through deduction")}</p>
            <p className="mt-1 text-3xl font-black leading-none text-brand-green-light">+{final.saved.toLocaleString()}</p>
            <p className="mt-1 text-xs font-medium text-white/60">{t("Across {n} solved cards", { n: final.solved })}</p>
          </div>
        ) : undefined}
        onDone={(nextPath) => onComplete(final?.coins ?? 0, nextPath, final?.outcomes ?? [])}
      />
    </div>
  );
}
