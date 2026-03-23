"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

import { Slider } from "@/components/ui/slider";
import { QuitGameDialog } from "./QuitGameDialog";
import {
  Clock,
  ArrowRight,
  X,
  Split,
  Lightbulb,
  RefreshCw,
  Trophy,
  XOctagon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MoneyDropSession } from "@/lib/domain/dailyChallenge";

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
    <div className="w-8 h-5 lg:w-10 lg:h-6 bg-gradient-to-br from-[#58CC02] to-[#46A302] rounded-sm border border-[#3A8502] shadow-sm flex items-center justify-center">
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
  const btnBase =
    "flex items-center justify-center gap-1 md:gap-1.5 lg:gap-2 px-3 py-2 md:px-4 md:py-2.5 lg:px-5 lg:py-3 rounded-xl font-bold text-xs md:text-sm lg:text-sm text-white transition-all active:translate-y-[1px] active:border-b-2";
  const btnActive = "bg-[#243B44] border-b-[3px] border-b-[#1B2F36] hover:bg-[#2C4A55]";
  const btnUsed = "bg-[#243B44]/50 border-b-[3px] border-b-[#1B2F36]/50 opacity-40";

  return (
    <div className="flex gap-2">
      <button onClick={onFiftyFifty} disabled={fiftyFiftyUsed || disabled} className={cn(btnBase, fiftyFiftyUsed ? btnUsed : btnActive)}>
        <Split className="size-3.5 lg:size-4" />
        <span className={cn(fiftyFiftyUsed && "line-through")}>50/50</span>
      </button>
      <button onClick={onClue} disabled={clueUsed || clueDisabled || disabled} className={cn(btnBase, clueUsed || clueDisabled ? btnUsed : btnActive)}>
        <Lightbulb className="size-3.5 lg:size-4" />
        <span className={cn(clueUsed && "line-through")}>Clue</span>
      </button>
      <button
        onClick={onChangeQuestion}
        disabled={changeQuestionUsed || changeQuestionDisabled || disabled}
        className={cn(btnBase, changeQuestionUsed || changeQuestionDisabled ? btnUsed : btnActive)}
      >
        <RefreshCw className="size-3.5 lg:size-4" />
        <span className={cn(changeQuestionUsed && "line-through")}>Skip</span>
      </button>
    </div>
  );
}

/* ── Main Component ── */

export function MoneyDropGame({ session, onBack, onComplete }: MoneyDropGameProps) {
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
    if (timeoutHandledRef.current) return;
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
    }, wrongAnswers.length * 1000 + 2000);
  }, [bets, currentQuestion]);

  useEffect(() => {
    totalAllocatedRef.current = totalAllocated;
  }, [totalAllocated]);

  useEffect(() => {
    handleConfirmBetsRef.current = handleConfirmBets;
  }, [handleConfirmBets]);

  useEffect(() => {
    timeoutHandledRef.current = false;
    deadlineRef.current = Date.now() + QUESTION_TIME * 1000;
    setTimeLeft(QUESTION_TIME);
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

      if (totalAllocatedRef.current === 0) {
        onComplete(0);
        return;
      }

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

  const handleNextQuestion = () => {
    const correctBet = bets[currentQuestion.correctAnswerIndex];
    const newMoney = correctBet;
    setCurrentMoney(newMoney);
    if (newMoney === 0 || currentQuestionIndex >= questions.length - 1) {
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

  const handleFiftyFifty = () => {
    if (fiftyFiftyUsed || showResult || hasConfirmed) return;
    setFiftyFiftyUsed(true);
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
    }
    setShowClue(true);
  };

  const handleChangeQuestion = () => {
    if (changeQuestionUsed || showResult || hasConfirmed || isLastQuestion) return;
    timeoutHandledRef.current = true;
    deadlineRef.current = null;
    setChangeQuestionUsed(true);
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
      case "easy": return "bg-[#58CC02]/15 text-[#58CC02]";
      case "medium": return "bg-[#FF9600]/15 text-[#FF9600]";
      case "hard": return "bg-[#FF4B4B]/15 text-[#FF4B4B]";
      default: return "";
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#131F24] flex flex-col font-fun">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-[#1B2F36] border-b-[3px] border-[#131F24]">
        <div className="max-w-3xl lg:max-w-4xl mx-auto px-3 md:px-4 lg:px-6 py-2.5 md:py-3 lg:py-4 flex items-center gap-2.5 md:gap-4">
          {/* Left: close + title */}
          <button
            onClick={() => setShowQuitDialog(true)}
            className="flex items-center justify-center size-8 lg:size-10 rounded-lg hover:bg-red-500/10 transition-colors text-white/50 hover:text-red-400 shrink-0"
          >
            <X className="size-4 lg:size-5" />
          </button>

          {/* Progress bar */}
          <div className="flex-1 flex gap-1">
            {questions.map((_, i) => (
              <div key={i} className="flex-1 h-2 md:h-2.5 lg:h-3 rounded-full overflow-hidden bg-white/10">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    i < currentQuestionIndex ? "bg-[#58CC02]"
                      : i === currentQuestionIndex ? "bg-[#1CB0F6]"
                      : "bg-transparent"
                  )}
                  initial={false}
                  animate={{ width: i <= currentQuestionIndex ? "100%" : "0%" }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            ))}
          </div>

          {/* Timer */}
          {!showResult && !isAnimating && (
            <motion.div
              className={cn(
                "flex items-center gap-1 md:gap-1.5 lg:gap-2 px-2 py-1 md:px-3 md:py-1.5 lg:px-4 lg:py-2 rounded-full font-bold text-xs md:text-sm lg:text-base tabular-nums shrink-0",
                timeLeft <= 3 ? "bg-[#FF4B4B]/20 text-[#FF4B4B]"
                  : timeLeft <= 5 ? "bg-[#FF9600]/20 text-[#FF9600]"
                  : "bg-[#58CC02]/20 text-[#58CC02]"
              )}
              animate={timeLeft <= 3 ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 0.5, repeat: timeLeft <= 3 ? Infinity : 0 }}
            >
              <Clock className="size-3.5 lg:size-4" />
              {timeLeft}s
            </motion.div>
          )}

        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full lg:flex lg:flex-col lg:justify-center">
        <div className="max-w-3xl lg:max-w-4xl mx-auto px-3 md:px-4 lg:px-6 py-4 md:py-5 lg:py-6 pb-24 space-y-3 md:space-y-4 lg:space-y-5 w-full">

          {/* Question + help row */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#131F24] rounded-2xl border-b-[3px] border-b-[#131F24] p-4 md:p-6 lg:p-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className={cn("px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full text-xs lg:text-sm font-bold", getDifficultyStyle(currentQuestion.difficulty))}>
                  {currentQuestion.difficulty.toUpperCase()}
                </span>
                <span className="px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full text-xs lg:text-sm font-bold bg-[#1CB0F6]/15 text-[#1CB0F6]">
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
                className="bg-[#FF9600]/10 border border-[#FF9600]/30 rounded-xl px-4 py-3 lg:px-5 lg:py-4 flex items-start gap-2 lg:gap-3"
              >
                <Lightbulb className="size-4 shrink-0 text-[#FF9600]" />
                <p className="text-sm lg:text-base text-[#56707A]">
                  <span className="text-[#FF9600] font-bold">Clue: </span>
                  {hasClue
                    ? currentQuestion.clue
                    : "No clue for this round. You can use Clue on the next question."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Betting Interface ── */}
          {!showResult && !isAnimating ? (
            <div className="space-y-3">
              {/* Remaining counter */}
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm lg:text-base font-bold text-[#56707A] uppercase tracking-wider">
                  Place Your Bets
                </span>
                <span className={cn("text-xs md:text-sm lg:text-base font-black tabular-nums", remaining === 0 ? "text-[#58CC02]" : "text-[#FF9600]")}>
                  {remaining === 0 ? "All in!" : `${remaining.toLocaleString()} remaining`}
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
                      <div key={index} className="bg-[#1B2F36] rounded-2xl border border-white/5 border-b-4 border-b-[#131F24] px-3 py-3 md:px-4 md:py-4 lg:px-5 lg:py-5 opacity-30">
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
                        "relative bg-[#1B2F36] rounded-2xl border border-white/5 border-b-4 border-b-[#131F24] px-3 py-3 md:px-4 md:py-4 lg:px-5 lg:py-5 overflow-visible",
                        hasConfirmed && "opacity-60"
                      )}
                    >
                      {/* Top row: badge + option text + bet amount */}
                      <div className="flex items-center justify-between mb-2 md:mb-3 lg:mb-4">
                        <OptionRow index={index} option={option} color={color} />
                        {betAmount > 0 && (
                          <span className="text-sm lg:text-base font-black text-[#FF9600] tabular-nums shrink-0 ml-2">
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
                  onClick={handleConfirmBets}
                  disabled={!isFullyAllocated}
                  className={cn(
                    "w-full py-3.5 md:py-4 lg:py-5 rounded-2xl font-black uppercase tracking-wide text-white text-sm md:text-base lg:text-lg transition-all",
                    isFullyAllocated
                      ? "bg-[#58CC02] border-b-4 border-b-[#46A302] hover:bg-[#61D806] active:border-b-2 active:translate-y-[2px]"
                      : "bg-[#58CC02]/40 border-b-4 border-b-[#46A302]/40 opacity-40 cursor-not-allowed"
                  )}
                >
                  {isFullyAllocated ? "Confirm Bets" : `Allocate all ${currentMoney.toLocaleString()} coins`}
                </button>
              )}
            </div>

          ) : isAnimating ? (
            /* ── Animation Phase ── */
            <div className="space-y-3 lg:space-y-4">
              <div className="text-center text-sm lg:text-base text-[#56707A] font-bold uppercase tracking-wider mb-2">
                Revealing the answer...
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
                        className="bg-[#58CC02]/15 rounded-2xl border border-[#58CC02]/40 border-b-4 border-b-[#46A302] px-3 py-3 md:px-4 md:py-4 lg:px-5 lg:py-5"
                        animate={{
                          boxShadow: ["0 0 0px rgba(88,204,2,0)", "0 0 20px rgba(88,204,2,0.35)", "0 0 0px rgba(88,204,2,0)"],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <div className="flex items-center justify-between">
                          <OptionRow index={index} option={option} color={{ ...color, light: "bg-[#58CC02]", text: "text-white" }} textClass="text-[#58CC02]" />
                          {betAmount > 0 && (
                            <span className="text-sm lg:text-base font-black text-[#58CC02] shrink-0 ml-2">+{formatMoney(betAmount)}</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  }

                  if (hasDropped && betAmount > 0) {
                    return (
                      <motion.div
                        key={index}
                        className="relative overflow-visible bg-[#FF4B4B]/10 rounded-2xl border border-[#FF4B4B]/30 border-b-4 border-b-[#CC3C3C] px-3 py-3 md:px-4 md:py-4 lg:px-5 lg:py-5"
                        animate={{ y: [0, 20, 300], opacity: [1, 0.8, 0], rotateX: [0, 5, 15], scale: [1, 0.95, 0.8] }}
                        transition={{ duration: 0.8, ease: "easeIn" }}
                      >
                        <FallingBills amount={betAmount} />
                        <div className="flex items-center justify-between">
                          <OptionRow index={index} option={option} color={{ ...color, light: "bg-[#FF4B4B]", text: "text-white" }} />
                          <span className="text-sm lg:text-base font-black text-[#FF4B4B] shrink-0 ml-2">-{formatMoney(betAmount)}</span>
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <div
                      key={index}
                      className={cn(
                        "bg-[#1B2F36] rounded-2xl border border-white/5 border-b-4 border-b-[#131F24] px-3 py-3 md:px-4 md:py-4 lg:px-5 lg:py-5",
                        (hasDropped || betAmount === 0) && "opacity-30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <OptionRow index={index} option={option} color={color} />
                        {betAmount > 0 && (
                          <span className="text-sm lg:text-base font-black text-[#56707A] shrink-0 ml-2">{formatMoney(betAmount)}</span>
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
                        "rounded-2xl border border-b-4 px-3 py-3 md:px-4 md:py-4 lg:px-5 lg:py-5",
                        isCorrect
                          ? "bg-[#58CC02]/15 border-[#58CC02]/40 border-b-[#46A302]"
                          : betAmount > 0
                            ? "bg-[#FF4B4B]/10 border-[#FF4B4B]/30 border-b-[#CC3C3C]"
                            : "bg-[#1B2F36] border-white/5 border-b-[#131F24] opacity-40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <OptionRow
                          index={index}
                          option={option}
                          color={isCorrect ? { ...color, light: "bg-[#58CC02]", text: "text-white" } : betAmount > 0 ? { ...color, light: "bg-[#FF4B4B]", text: "text-white" } : color}
                          textClass={isCorrect ? "text-[#58CC02]" : betAmount > 0 ? "text-[#FF4B4B]" : "text-[#56707A]"}
                        />
                        {betAmount > 0 && (
                          <span className={cn("text-sm lg:text-base font-black shrink-0 ml-2", isCorrect ? "text-[#58CC02]" : "text-[#FF4B4B]")}>
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
                  className="bg-[#1B2F36] border border-[#58CC02]/30 border-b-4 border-b-[#46A302] rounded-2xl p-5 md:p-6 lg:p-8 text-center"
                >
                  <div className="mb-2"><Trophy className="size-10 lg:size-12 text-[#58CC02] mx-auto" /></div>
                  <div className="text-[#58CC02] font-black text-base md:text-lg lg:text-xl">
                    You saved {formatMoney(bets[currentQuestion.correctAnswerIndex])}!
                  </div>
                  <div className="text-[#56707A] text-sm lg:text-base font-bold mt-1">
                    Lost {formatMoney(currentMoney - bets[currentQuestion.correctAnswerIndex])}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="bg-[#1B2F36] border border-[#FF4B4B]/30 border-b-4 border-b-[#CC3C3C] rounded-2xl p-5 md:p-6 lg:p-8 text-center"
                >
                  <div className="mb-2"><XOctagon className="size-10 lg:size-12 text-[#FF4B4B] mx-auto" /></div>
                  <div className="text-[#FF4B4B] font-black text-base md:text-lg lg:text-xl">
                    Lost all {formatMoney(currentMoney)}
                  </div>
                  <div className="text-[#56707A] text-sm lg:text-base font-bold mt-1">
                    Better luck next time
                  </div>
                </motion.div>
              )}

              <button
                onClick={handleNextQuestion}
                className="w-full py-4 lg:py-5 rounded-2xl bg-[#58CC02] border-b-4 border-b-[#46A302] font-black uppercase tracking-wide text-white text-base lg:text-lg hover:bg-[#61D806] active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
              >
                {bets[currentQuestion.correctAnswerIndex] === 0 || currentQuestionIndex >= questions.length - 1
                  ? "View Results"
                  : "Next Question"}
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
        title="Quit Money Drop?"
        description={`You'll lose your current balance of ${formatMoney(currentMoney)}.`}
      />
    </div>
  );
}
