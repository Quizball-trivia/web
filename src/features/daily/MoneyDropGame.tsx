"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

import { Slider } from "@/components/ui/slider";
import { QuitGameDialog } from "./QuitGameDialog";
import { DailyChallengeHeader } from "./components/DailyChallengeHeader";
import {
  ArrowRight,
  Split,
  Lightbulb,
  RefreshCw,
  Trophy,
  XOctagon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MoneyDropSession } from "@/lib/domain/dailyChallenge";
import { useLocale } from "@/contexts/LocaleContext";
import { trackLifelineUsed } from "@/lib/analytics/game-events";
import { playSfx } from "@/lib/sounds/gameSounds";

interface MoneyDropGameProps {
  session: MoneyDropSession;
  onBack: () => void;
  onComplete: (finalMoney: number) => void;
}

const OPTION_COLORS = [
  { bg: "bg-emerald-500", light: "bg-emerald-500/15", text: "text-emerald-400", sliderRange: "[&_[data-slot=slider-range]]:bg-emerald-500", sliderThumb: "[&_[data-slot=slider-thumb]]:border-emerald-500" },
  { bg: "bg-blue-500", light: "bg-blue-500/15", text: "text-blue-400", sliderRange: "[&_[data-slot=slider-range]]:bg-blue-500", sliderThumb: "[&_[data-slot=slider-thumb]]:border-blue-500" },
  { bg: "bg-yellow-500", light: "bg-yellow-500/15", text: "text-yellow-400", sliderRange: "[&_[data-slot=slider-range]]:bg-yellow-500", sliderThumb: "[&_[data-slot=slider-thumb]]:border-yellow-500" },
  { bg: "bg-purple-500", light: "bg-purple-500/15", text: "text-purple-400", sliderRange: "[&_[data-slot=slider-range]]:bg-purple-500", sliderThumb: "[&_[data-slot=slider-thumb]]:border-purple-500" },
];

/* ── Shared card row (letter badge + option text) ── */
const OptionRow = ({ index, option, color, textClass = "text-white" }: { index: number; option: string; color: typeof OPTION_COLORS[0]; textClass?: string }) => (
  <div className="flex items-center gap-2.5 md:gap-3 lg:gap-4 min-w-0">
    <div className={cn("flex size-8 md:size-9 lg:size-11 shrink-0 items-center justify-center rounded-lg md:rounded-xl text-sm lg:text-base font-black", color.light, color.text)}>
      {String.fromCharCode(65 + index)}
    </div>
    <span className={cn("text-sm md:text-base lg:text-lg font-bold truncate", textClass)} title={option}>{option}</span>
  </div>
);

/* ── Dollar Bill Sub-components (unchanged animation) ── */

function DollarBill() {
  return (
    <div className="w-8 h-5 lg:w-10 lg:h-6 bg-gradient-to-br from-brand-green-light to-brand-green rounded-sm border border-brand-green-deep shadow-sm flex items-center justify-center">
      <span className="text-white text-xs lg:text-sm font-bold">$</span>
    </div>
  );
}

function BillStack({ amount }: { amount: number }) {
  const dollarCount = Math.min(Math.ceil(amount / 100), 10);

  // Generate stable rotations using a seeded approach based on index
  const rotations = useMemo(() => {
    return Array.from({ length: dollarCount }, (_, i) => {
      // Deterministic pseudo-random rotation based on index
      const seed = (i * 7 + 3) % 10;
      return (seed - 5) * 0.5; // Range: -2.5 to 2.5 degrees
    });
  }, [dollarCount]);

  if (dollarCount === 0) return null;
  return (
    <div className="flex items-end pointer-events-none">
      {[...Array(dollarCount)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0, y: -20 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            rotate: rotations[i],
          }}
          transition={{
            duration: 0.3,
            delay: i * 0.05,
            type: "spring",
            stiffness: 300,
          }}
          className="relative"
          style={{
            marginLeft: i > 0 ? "-8px" : "0",
            zIndex: dollarCount - i,
          }}
        >
          <DollarBill />
        </motion.div>
      ))}
    </div>
  );
}

function FallingBills({ amount }: { amount: number }) {
  const count = Math.max(1, Math.min(8, Math.floor(amount / 100)));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: `${15 + (i * 70) / count}%`, top: "50%" }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{
            y: [0, 200, 400],
            opacity: [1, 0.8, 0],
            rotate: [0, -15 + i * 8, -30 + i * 12],
          }}
          transition={{ duration: 1.2, delay: i * 0.08, ease: "easeIn" }}
        >
          <DollarBill />
        </motion.div>
      ))}
    </div>
  );
}

/* ── Help Buttons ── */

function HelpButtons({
  fiftyFiftyUsed,
  clueUsed,
  clueDisabled = false,
  changeQuestionUsed,
  changeQuestionDisabled = false,
  onFiftyFifty,
  onClue,
  onChangeQuestion,
  disabled = false,
}: {
  fiftyFiftyUsed: boolean;
  clueUsed: boolean;
  clueDisabled?: boolean;
  changeQuestionUsed: boolean;
  changeQuestionDisabled?: boolean;
  onFiftyFifty: () => void;
  onClue: () => void;
  onChangeQuestion: () => void;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  const btnBase =
    "flex items-center justify-center gap-1 md:gap-1.5 lg:gap-2 px-3 py-2 md:px-4 md:py-2.5 lg:px-5 lg:py-3 rounded-[16px] font-poppins font-semibold text-xs md:text-sm lg:text-sm text-white transition-colors";
  const btnActive = "bg-white/8 hover:bg-white/14";
  const btnUsed = "bg-white/5 opacity-40";

  return (
    <div className="flex gap-2">
      <button onClick={onFiftyFifty} disabled={fiftyFiftyUsed || disabled} className={cn(btnBase, fiftyFiftyUsed ? btnUsed : btnActive)}>
        <Split className="size-3.5 lg:size-4" />
        <span className={cn(fiftyFiftyUsed && "line-through")}>{t('dailyGames.fiftyFifty')}</span>
      </button>
      <button onClick={onClue} disabled={clueUsed || clueDisabled || disabled} className={cn(btnBase, clueUsed || clueDisabled ? btnUsed : btnActive)}>
        <Lightbulb className="size-3.5 lg:size-4" />
        <span className={cn(clueUsed && "line-through")}>{t('dailyGames.clue')}</span>
      </button>
      <button
        onClick={onChangeQuestion}
        disabled={changeQuestionUsed || changeQuestionDisabled || disabled}
        className={cn(btnBase, changeQuestionUsed || changeQuestionDisabled ? btnUsed : btnActive)}
      >
        <RefreshCw className="size-3.5 lg:size-4" />
        <span className={cn(changeQuestionUsed && "line-through")}>{t('dailyGames.skip')}</span>
      </button>
    </div>
  );
}

/* ── Main Component ── */

export function MoneyDropGame({ session, onBack, onComplete }: MoneyDropGameProps) {
  const { t } = useLocale();
  const STARTING_MONEY = session.startingMoney;
  const QUESTION_TIME = session.secondsPerQuestion;

  const questions = session.questions;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentMoney, setCurrentMoney] = useState(STARTING_MONEY);
  const [bets, setBets] = useState<number[]>([0, 0, 0, 0]);
  const [showResult, setShowResult] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [droppedAnswers, setDroppedAnswers] = useState<number[]>([]);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);

  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(false);
  const [clueUsed, setClueUsed] = useState(false);
  const [changeQuestionUsed, setChangeQuestionUsed] = useState(false);
  const [hiddenAnswers, setHiddenAnswers] = useState<number[]>([]);
  const [showClue, setShowClue] = useState(false);
  const timeoutHandledRef = useRef(false);
  const deadlineRef = useRef<number | null>(null);
  const totalAllocatedRef = useRef(0);
  const handleConfirmBetsRef = useRef<(() => void) | null>(null);
  const handleNextQuestionRef = useRef<((options?: { auto?: boolean }) => void) | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  // True when the round was confirmed by the timer running out (not a manual
  // "Confirm Bets" press) — drives auto-advance to the next question.
  const autoAdvanceRef = useRef(false);
  // Holds the pending auto-advance timer so a manual "Next" press can cancel it;
  // otherwise the stale callback fires on the next screen and skips a question.
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex >= questions.length - 1;
  const hasClue = typeof currentQuestion.clue === "string" && currentQuestion.clue.trim().length > 0;
  const totalAllocated = bets.reduce((sum, bet) => sum + bet, 0);
  const remaining = currentMoney - totalAllocated;
  const isFullyAllocated = totalAllocated === currentMoney && currentMoney > 0;

  const handleBetChange = (index: number, value: number[]) => {
    if (showResult || hasConfirmed) return;
    const newBets = [...bets];
    const oldBet = newBets[index];
    const newBet = value[0];
    const difference = newBet - oldBet;
    if (difference > remaining) {
      newBets[index] = oldBet + remaining;
    } else {
      newBets[index] = newBet;
    }
    setBets(newBets);
  };

  const handleConfirmBets = useCallback(() => {
    // Guard against a double manual press, but NOT against the timer-initiated
    // call: the timeout sets timeoutHandledRef before invoking this, and that
    // path must still run (auto-submit). hasConfirmed covers the double-press.
    if (hasConfirmed) return;
    setHasConfirmed(true);
    setIsAnimating(true);
    setShowClue(false);
    const wrongAnswers = currentQuestion.options
      .map((_, index) => index)
      .filter((index) => index !== currentQuestion.correctAnswerIndex && bets[index] > 0);
    wrongAnswers.forEach((answerIndex, i) => {
      setTimeout(() => {
        setDroppedAnswers((prev) => [...prev, answerIndex]);
      }, i * 1000);
    });
    setTimeout(() => {
      setIsAnimating(false);
      setShowResult(true);
      // Survived with money on the correct answer = correct chime; lost it all
      // (nothing left on the right option) = wrong-answer buzzer.
      playSfx(bets[currentQuestion.correctAnswerIndex] > 0 ? "dailyCorrect" : "wrongAnswer");
      // Auto-submitted by the timer → advance to the next question after the
      // result has been on screen ~2.5s, instead of waiting for a manual press.
      if (autoAdvanceRef.current) {
        autoAdvanceRef.current = false;
        autoAdvanceTimeoutRef.current = setTimeout(() => {
          autoAdvanceTimeoutRef.current = null;
          handleNextQuestionRef.current?.({ auto: true });
        }, 2500);
      }
    }, wrongAnswers.length * 1000 + 2000);
  }, [bets, currentQuestion, hasConfirmed]);

  useEffect(() => {
    totalAllocatedRef.current = totalAllocated;
  }, [totalAllocated]);

  // Once all the money is placed, bring the Confirm button fully into view —
  // several users couldn't find it below the fold and didn't realise they could
  // submit. `block: "end"` guarantees the whole button reaches the bottom of the
  // viewport (nearest scrolled too little). Only while still betting.
  useEffect(() => {
    if (!isFullyAllocated || hasConfirmed || showResult) return;
    const id = window.setTimeout(() => {
      confirmButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 200);
    return () => window.clearTimeout(id);
  }, [isFullyAllocated, hasConfirmed, showResult]);

  useEffect(() => {
    handleConfirmBetsRef.current = handleConfirmBets;
  }, [handleConfirmBets]);

  useEffect(() => {
    timeoutHandledRef.current = false;
    deadlineRef.current = Date.now() + QUESTION_TIME * 1000;
    queueMicrotask(() => {
      setTimeLeft(QUESTION_TIME);
    });
  }, [QUESTION_TIME, currentQuestionIndex]);

  useEffect(() => {
    if (showResult || isAnimating || hasConfirmed) return;
    if (deadlineRef.current === null) {
      deadlineRef.current = Date.now() + QUESTION_TIME * 1000;
    }
    const timer = setInterval(() => {
      const remainingSeconds = Math.max(0, Math.ceil((deadlineRef.current! - Date.now()) / 1000));
      setTimeLeft(remainingSeconds);

      if (remainingSeconds > 0 || timeoutHandledRef.current) {
        return;
      }

      timeoutHandledRef.current = true;
      clearInterval(timer);

      // Time's up: auto-submit whatever's allocated (even nothing) and advance
      // to the next question automatically — never strand the player on a result
      // screen waiting for a press, and never end the game just because no bet
      // was placed (that question simply carries $0).
      autoAdvanceRef.current = true;
      handleConfirmBetsRef.current?.();
    }, 250);

    return () => clearInterval(timer);
  }, [
    QUESTION_TIME,
    currentQuestionIndex,
    hasConfirmed,
    isAnimating,
    onComplete,
    showResult,
  ]);

  const handleNextQuestion = (options?: { auto?: boolean }) => {
    // Cancel any pending auto-advance so it can't fire on the next screen after
    // a manual press (which would skip a question or end the run early).
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    // A round only settles money if a bet was CONFIRMED. When the timer runs
    // out with nothing confirmed, the bank carries forward untouched — zeroing
    // it (the old behavior) put players into unplayable 0-coin rounds that
    // still auto-advanced, and most runs ended at 0 that way.
    const correctBet = bets[currentQuestion.correctAnswerIndex];
    const newMoney = hasConfirmed ? correctBet : currentMoney;
    setCurrentMoney(newMoney);
    // Busting on a confirmed bet ends the run immediately, auto or manual —
    // MoneyDrop's core rule. There are no playable rounds with 0 coins.
    const isLast = currentQuestionIndex >= questions.length - 1;
    if (isLast || newMoney === 0) {
      onComplete(newMoney);
      return;
    }
    setCurrentQuestionIndex((prev) => prev + 1);
    setBets([0, 0, 0, 0]);
    setShowResult(false);
    setHasConfirmed(false);
    setIsAnimating(false);
    setDroppedAnswers([]);
    setHiddenAnswers([]);
    setShowClue(false);
    setTimeLeft(QUESTION_TIME);
    timeoutHandledRef.current = false;
  };
  // Keep the ref pointing at the latest handler so the timer's auto-advance
  // (fired from a stale closure) always calls the current logic.
  useEffect(() => {
    handleNextQuestionRef.current = handleNextQuestion;
  });

  // Clear any pending auto-advance timer on unmount so it can't fire after the
  // component is gone.
  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, []);

  const handleFiftyFifty = () => {
    if (fiftyFiftyUsed || showResult || hasConfirmed) return;
    setFiftyFiftyUsed(true);
    trackLifelineUsed(undefined, '5050');
    const wrongAnswers = currentQuestion.options
      .map((_, idx) => idx)
      .filter((idx) => idx !== currentQuestion.correctAnswerIndex);
    const shuffled = wrongAnswers.sort(() => Math.random() - 0.5);
    const toHide = shuffled.slice(0, 2);
    setHiddenAnswers(toHide);
    const newBets = [...bets];
    toHide.forEach((idx) => { newBets[idx] = 0; });
    setBets(newBets);
  };

  const handleClue = () => {
    if (clueUsed || showResult || hasConfirmed) return;
    // Only consume the lifeline when this question actually has clue content.
    if (hasClue) {
      setClueUsed(true);
      trackLifelineUsed(undefined, 'clue');
    }
    setShowClue(true);
  };

  const handleChangeQuestion = () => {
    if (changeQuestionUsed || showResult || hasConfirmed || isLastQuestion) return;
    timeoutHandledRef.current = true;
    deadlineRef.current = null;
    setChangeQuestionUsed(true);
    trackLifelineUsed(undefined, 'skip');
    setCurrentQuestionIndex((prev) => prev + 1);
    setBets([0, 0, 0, 0]);
    setHiddenAnswers([]);
    setShowClue(false);
    setDroppedAnswers([]);
    setShowResult(false);
    setHasConfirmed(false);
    setIsAnimating(false);
    setTimeLeft(QUESTION_TIME);
  };

  const formatMoney = (amount: number) => `${amount.toLocaleString()} coins`;

  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-brand-green-light/15 text-brand-green-light";
      case "medium": return "bg-brand-orange/15 text-brand-orange";
      case "hard": return "bg-brand-red-soft/15 text-brand-red-soft";
      default: return "";
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col font-poppins bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat">

      <DailyChallengeHeader
        onQuit={() => setShowQuitDialog(true)}
        currentIndex={currentQuestionIndex}
        total={questions.length}
        timeLeft={timeLeft}
        hideTimer={showResult || isAnimating}
      />

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full lg:flex lg:flex-col lg:justify-center">
        <div className="max-w-3xl lg:max-w-4xl mx-auto px-3 md:px-4 lg:px-6 py-4 md:py-5 lg:py-6 pb-24 space-y-3 md:space-y-4 lg:space-y-5 w-full">

          {/* Question + help row */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[20px] bg-surface-card/40 backdrop-blur-sm p-4 md:p-6 lg:p-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className={cn("px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full text-xs lg:text-sm font-bold", getDifficultyStyle(currentQuestion.difficulty))}>
                  {currentQuestion.difficulty.toUpperCase()}
                </span>
                <span className="px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full text-xs lg:text-sm font-bold bg-brand-cyan/15 text-brand-cyan">
                  {currentQuestion.category}
                </span>
              </div>
              <HelpButtons
                fiftyFiftyUsed={fiftyFiftyUsed}
                clueUsed={clueUsed}
                clueDisabled={!hasClue}
                changeQuestionUsed={changeQuestionUsed}
                changeQuestionDisabled={isLastQuestion}
                onFiftyFifty={handleFiftyFifty}
                onClue={handleClue}
                onChangeQuestion={handleChangeQuestion}
                disabled={showResult || isAnimating || hasConfirmed}
              />
            </div>
            <p className="text-white text-lg md:text-xl lg:text-2xl font-bold leading-snug">
              {currentQuestion.prompt}
            </p>
          </motion.div>

          {/* Clue card */}
          <AnimatePresence>
            {showClue && !showResult && !isAnimating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-brand-orange/10 border border-brand-orange/30 rounded-xl px-4 py-3 lg:px-5 lg:py-4 flex items-start gap-2 lg:gap-3"
              >
                <Lightbulb className="size-4 shrink-0 text-brand-orange" />
                <p className="text-sm lg:text-base text-brand-slate">
                  <span className="text-brand-orange font-bold">{t('dailyGames.clue')}: </span>
                  {hasClue
                    ? currentQuestion.clue
                    : t('dailyGames.noClueRound')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Betting Interface ── */}
          {!showResult && !isAnimating ? (
            <div className="space-y-3">
              {/* Remaining counter */}
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm lg:text-base font-bold text-brand-slate uppercase tracking-wider">
                  {t("dailyGames.placeYourBets")}
                </span>
                <span className={cn("text-xs md:text-sm lg:text-base font-black tabular-nums", remaining === 0 ? "text-brand-green-light" : "text-brand-orange")}>
                  {remaining === 0 ? t('dailyGames.allIn') : t('dailyGames.remaining', { amount: remaining.toLocaleString() })}
                </span>
              </div>

              {/* 2×2 grid on wider screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                {currentQuestion.options.map((option, index) => {
                  const isHidden = hiddenAnswers.includes(index);
                  const betAmount = bets[index];
                  const color = OPTION_COLORS[index % OPTION_COLORS.length];

                  if (isHidden) {
                    return (
                      <div key={index} className="bg-surface-card/40 backdrop-blur-sm rounded-[20px] px-3 py-3 md:px-4 md:py-4 lg:px-5 lg:py-5 opacity-30">
                        <div className="flex items-center gap-3">
                          <div className={cn("flex size-8 md:size-9 lg:size-11 shrink-0 items-center justify-center rounded-xl text-sm lg:text-base font-black", color.light, color.text)}>
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="text-sm lg:text-base text-white/40 line-through">{option}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={index}
                      className={cn(
                        "relative bg-surface-card/40 backdrop-blur-sm rounded-[20px] px-3 py-3 md:px-4 md:py-4 lg:px-5 lg:py-5 overflow-visible",
                        hasConfirmed && "opacity-60"
                      )}
                    >
                      {/* Top row: badge + option text + bet amount */}
                      <div className="flex items-center justify-between mb-2 md:mb-3 lg:mb-4">
                        <OptionRow index={index} option={option} color={color} />
                        {betAmount > 0 && (
                          <span className="text-sm lg:text-base font-black text-brand-orange tabular-nums shrink-0 ml-2">
                            {betAmount.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Slider */}
                      <Slider
                        value={[betAmount]}
                        onValueChange={(value) => handleBetChange(index, value)}
                        max={currentMoney}
                        step={10}
                        disabled={hasConfirmed}
                        className={cn(
                          "w-full",
                          "[&_[data-slot=slider-track]]:h-2 md:[&_[data-slot=slider-track]]:h-2.5 lg:[&_[data-slot=slider-track]]:h-3 [&_[data-slot=slider-track]]:bg-white/10 [&_[data-slot=slider-track]]:rounded-full",
                          color.sliderRange,
                          "[&_[data-slot=slider-thumb]]:size-5 lg:[&_[data-slot=slider-thumb]]:size-6 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:border-2",
                          color.sliderThumb
                        )}
                      />

                      {/* Bill stack — below slider */}
                      {betAmount > 0 && (
                        <div className="mt-2 flex justify-end pointer-events-none">
                          <BillStack amount={betAmount} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Confirm button */}
              {!hasConfirmed && (
                <button
                  ref={confirmButtonRef}
                  onClick={handleConfirmBets}
                  disabled={!isFullyAllocated}
                  style={
                    isFullyAllocated
                      ? { boxShadow: '0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)' }
                      : undefined
                  }
                  className={cn(
                    "w-full py-3.5 md:py-4 lg:py-5 rounded-[20px] font-poppins font-semibold uppercase tracking-wide text-white text-sm md:text-base lg:text-lg transition-colors",
                    isFullyAllocated
                      ? "bg-brand-green hover:bg-brand-green-deep"
                      : "bg-brand-green/30 opacity-40 cursor-not-allowed"
                  )}
                >
                  {isFullyAllocated ? t('dailyGames.confirmBets') : t('dailyGames.allocateAllCoins', { amount: currentMoney.toLocaleString() })}
                </button>
              )}
            </div>

          ) : isAnimating ? (
            /* ── Animation Phase ── */
            <div className="space-y-3 lg:space-y-4">
              <div className="text-center text-sm lg:text-base text-brand-slate font-bold uppercase tracking-wider mb-2">
                {t('dailyGames.revealingAnswer')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                {currentQuestion.options.map((option, index) => {
                  const isCorrect = index === currentQuestion.correctAnswerIndex;
                  const betAmount = bets[index];
                  const hasDropped = droppedAnswers.includes(index);
                  const color = OPTION_COLORS[index % OPTION_COLORS.length];

                  if (isCorrect) {
                    return (
                      <motion.div
                        key={index}
                        className="bg-brand-green/15 rounded-[20px] border-2 border-brand-green/40 px-3 py-3 md:px-4 md:py-4 lg:px-5 lg:py-5"
                        animate={{
                          boxShadow: ["0 0 0px rgba(88,204,2,0)", "0 0 20px rgba(88,204,2,0.35)", "0 0 0px rgba(88,204,2,0)"],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <div className="flex items-center justify-between">
                          <OptionRow index={index} option={option} color={{ ...color, light: "bg-brand-green-light", text: "text-white" }} textClass="text-brand-green-light" />
                          {betAmount > 0 && (
                            <span className="text-sm lg:text-base font-black text-brand-green-light shrink-0 ml-2">+{formatMoney(betAmount)}</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  }

                  if (hasDropped && betAmount > 0) {
                    return (
                      <motion.div
                        key={index}
                        className="relative overflow-visible bg-brand-red-soft/10 rounded-[20px] border-2 border-brand-red-soft/30 px-3 py-3 md:px-4 md:py-4 lg:px-5 lg:py-5"
                        animate={{ y: [0, 20, 300], opacity: [1, 0.8, 0], rotateX: [0, 5, 15], scale: [1, 0.95, 0.8] }}
                        transition={{ duration: 0.8, ease: "easeIn" }}
                      >
                        <FallingBills amount={betAmount} />
                        <div className="flex items-center justify-between">
                          <OptionRow index={index} option={option} color={{ ...color, light: "bg-brand-red-soft", text: "text-white" }} />
                          <span className="text-sm lg:text-base font-black text-brand-red-soft shrink-0 ml-2">-{formatMoney(betAmount)}</span>
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <div
                      key={index}
                      className={cn(
                        "bg-surface-card/40 backdrop-blur-sm rounded-[20px] px-3 py-3 md:px-4 md:py-4 lg:px-5 lg:py-5",
                        (hasDropped || betAmount === 0) && "opacity-30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <OptionRow index={index} option={option} color={color} />
                        {betAmount > 0 && (
                          <span className="text-sm lg:text-base font-black text-brand-slate shrink-0 ml-2">{formatMoney(betAmount)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          ) : (
            /* ── Result Phase ── */
            <div className="space-y-4 lg:space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                {currentQuestion.options.map((option, index) => {
                  const isCorrect = index === currentQuestion.correctAnswerIndex;
                  const betAmount = bets[index];
                  const color = OPTION_COLORS[index % OPTION_COLORS.length];

                  return (
                    <div
                      key={index}
                      className={cn(
                        "rounded-[20px] border-2 px-3 py-3 md:px-4 md:py-4 lg:px-5 lg:py-5",
                        isCorrect
                          ? "bg-brand-green/15 border-brand-green/40"
                          : betAmount > 0
                            ? "bg-brand-red-soft/10 border-brand-red-soft/30"
                            : "bg-surface-card/40 backdrop-blur-sm border-transparent opacity-40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <OptionRow
                          index={index}
                          option={option}
                          color={isCorrect ? { ...color, light: "bg-brand-green-light", text: "text-white" } : betAmount > 0 ? { ...color, light: "bg-brand-red-soft", text: "text-white" } : color}
                          textClass={isCorrect ? "text-brand-green-light" : betAmount > 0 ? "text-brand-red-soft" : "text-brand-slate"}
                        />
                        {betAmount > 0 && (
                          <span className={cn("text-sm lg:text-base font-black shrink-0 ml-2", isCorrect ? "text-brand-green-light" : "text-brand-red-soft")}>
                            {isCorrect ? "+" : "-"}{formatMoney(betAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Result summary */}
              {bets[currentQuestion.correctAnswerIndex] > 0 ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="bg-brand-green/10 border-2 border-brand-green/30 rounded-[20px] p-5 md:p-6 lg:p-8 text-center"
                >
                  <div className="mb-2"><Trophy className="size-10 lg:size-12 text-brand-green-light mx-auto" /></div>
                  <div className="text-brand-green-light font-black text-base md:text-lg lg:text-xl">
                    {t('dailyGames.youSavedAmount', { amount: formatMoney(bets[currentQuestion.correctAnswerIndex]) })}
                  </div>
                  <div className="text-brand-slate text-sm lg:text-base font-bold mt-1">
                    {t('dailyGames.lostAmount', { amount: formatMoney(currentMoney - bets[currentQuestion.correctAnswerIndex]) })}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="bg-brand-red-soft/10 border-2 border-brand-red-soft/30 rounded-[20px] p-5 md:p-6 lg:p-8 text-center"
                >
                  <div className="mb-2"><XOctagon className="size-10 lg:size-12 text-brand-red-soft mx-auto" /></div>
                  <div className="text-brand-red-soft font-black text-base md:text-lg lg:text-xl">
                    {t('dailyGames.lostAllAmount', { amount: formatMoney(currentMoney) })}
                  </div>
                  <div className="text-brand-slate text-sm lg:text-base font-bold mt-1">
                    {t("dailyGames.betterLuckNextTime")}
                  </div>
                </motion.div>
              )}

              <button
                onClick={() => handleNextQuestion()}
                style={{ boxShadow: '0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)' }}
                className="w-full py-4 lg:py-5 rounded-[20px] bg-brand-green hover:bg-brand-green-deep font-poppins font-semibold uppercase tracking-wide text-white text-base lg:text-lg transition-colors flex items-center justify-center gap-2"
              >
                {bets[currentQuestion.correctAnswerIndex] === 0 || currentQuestionIndex >= questions.length - 1
                  ? t('dailyGames.viewResults')
                  : t('dailyGames.nextQuestion')}
                <ArrowRight className="size-4 lg:size-5" />
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      <QuitGameDialog
        open={showQuitDialog}
        onOpenChange={setShowQuitDialog}
        onQuit={onBack}
        title={t("dailyQuit.quitMoneyDrop")}
        description={`You'll lose your current balance of ${formatMoney(currentMoney)}.`}
      />
    </div>
  );
}
