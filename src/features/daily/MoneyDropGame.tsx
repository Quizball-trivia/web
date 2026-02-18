"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";

import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  ArrowRight,
  X,
  DollarSign,
  Split,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  clue: string;
}

interface MoneyDropGameProps {
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
  <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
    <div className={cn("flex size-8 md:size-9 shrink-0 items-center justify-center rounded-lg md:rounded-xl text-sm font-black", color.light, color.text)}>
      {String.fromCharCode(65 + index)}
    </div>
    <span className={cn("text-sm md:text-base font-bold truncate", textClass)} title={option}>{option}</span>
  </div>
);

// Mock questions for testing
const MOCK_QUESTIONS: Question[] = [
  {
    id: "md-1",
    question: "Which player has won the most Ballon d'Or awards?",
    options: ["Cristiano Ronaldo", "Lionel Messi", "Michel Platini", "Johan Cruyff"],
    correctAnswer: 1,
    difficulty: "easy",
    category: "Awards",
    clue: "This Argentine forward has won 8 Ballon d'Or awards",
  },
  {
    id: "md-2",
    question: "In which year did England win the FIFA World Cup?",
    options: ["1962", "1966", "1970", "1974"],
    correctAnswer: 1,
    difficulty: "medium",
    category: "World Cup",
    clue: "The tournament was hosted in England",
  },
  {
    id: "md-3",
    question: "Which club has won the most Champions League/European Cup titles?",
    options: ["AC Milan", "Barcelona", "Real Madrid", "Bayern Munich"],
    correctAnswer: 2,
    difficulty: "easy",
    category: "Champions League",
    clue: "The Spanish giants have won 15 titles",
  },
  {
    id: "md-4",
    question: "Who is the all-time top scorer in Premier League history?",
    options: ["Wayne Rooney", "Thierry Henry", "Alan Shearer", "Harry Kane"],
    correctAnswer: 2,
    difficulty: "medium",
    category: "Premier League",
    clue: "Newcastle United legend with 260 goals",
  },
  {
    id: "md-5",
    question: "Which country has won the most FIFA World Cups?",
    options: ["Germany", "Italy", "Argentina", "Brazil"],
    correctAnswer: 3,
    difficulty: "easy",
    category: "World Cup",
    clue: "The Seleção have won 5 World Cups",
  },
];

/* ── Dollar Bill Sub-components (unchanged animation) ── */

function DollarBill() {
  return (
    <div className="w-8 h-5 bg-gradient-to-br from-green-500 to-green-600 rounded-sm border border-green-700 shadow-sm flex items-center justify-center">
      <span className="text-white text-xs font-bold">$</span>
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
  changeQuestionUsed,
  onFiftyFifty,
  onClue,
  onChangeQuestion,
  disabled = false,
}: {
  fiftyFiftyUsed: boolean;
  clueUsed: boolean;
  changeQuestionUsed: boolean;
  onFiftyFifty: () => void;
  onClue: () => void;
  onChangeQuestion: () => void;
  disabled?: boolean;
}) {
  const btnBase =
    "flex items-center justify-center gap-1 md:gap-1.5 px-3 py-2 md:px-4 md:py-2.5 rounded-xl font-bold text-xs md:text-sm text-white transition-all active:translate-y-[1px] active:border-b-2";
  const btnActive = "bg-[#243B44] border-b-[3px] border-b-[#1B2F36] hover:bg-[#2C4A55]";
  const btnUsed = "bg-[#243B44]/50 border-b-[3px] border-b-[#1B2F36]/50 opacity-40";

  return (
    <div className="flex gap-2">
      <button onClick={onFiftyFifty} disabled={fiftyFiftyUsed || disabled} className={cn(btnBase, fiftyFiftyUsed ? btnUsed : btnActive)}>
        <Split className="size-3.5" />
        <span className={cn(fiftyFiftyUsed && "line-through")}>50/50</span>
      </button>
      <button onClick={onClue} disabled={clueUsed || disabled} className={cn(btnBase, clueUsed ? btnUsed : btnActive)}>
        <Lightbulb className="size-3.5" />
        <span className={cn(clueUsed && "line-through")}>Clue</span>
      </button>
      <button onClick={onChangeQuestion} disabled={changeQuestionUsed || disabled} className={cn(btnBase, changeQuestionUsed ? btnUsed : btnActive)}>
        <RefreshCw className="size-3.5" />
        <span className={cn(changeQuestionUsed && "line-through")}>Skip</span>
      </button>
    </div>
  );
}

/* ── Main Component ── */

export function MoneyDropGame({ onBack, onComplete }: MoneyDropGameProps) {
  const STARTING_MONEY = 1000;
  const QUESTION_TIME = 40;

  const [questions] = useState<Question[]>(MOCK_QUESTIONS);
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

  const currentQuestion = questions[currentQuestionIndex];
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
    setHasConfirmed(true);
    setIsAnimating(true);
    setShowClue(false);
    const wrongAnswers = currentQuestion.options
      .map((_, index) => index)
      .filter((index) => index !== currentQuestion.correctAnswer && bets[index] > 0);
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
    if (showResult || isAnimating || hasConfirmed) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (totalAllocated === 0) {
            onComplete(0);
          } else {
            handleConfirmBets();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showResult, isAnimating, hasConfirmed, totalAllocated, handleConfirmBets, onComplete]);

  const handleNextQuestion = () => {
    const correctBet = bets[currentQuestion.correctAnswer];
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
  };

  const handleFiftyFifty = () => {
    if (fiftyFiftyUsed || showResult || hasConfirmed) return;
    setFiftyFiftyUsed(true);
    const wrongAnswers = currentQuestion.options
      .map((_, idx) => idx)
      .filter((idx) => idx !== currentQuestion.correctAnswer);
    const shuffled = wrongAnswers.sort(() => Math.random() - 0.5);
    const toHide = shuffled.slice(0, 2);
    setHiddenAnswers(toHide);
    const newBets = [...bets];
    toHide.forEach((idx) => { newBets[idx] = 0; });
    setBets(newBets);
  };

  const handleClue = () => {
    if (clueUsed || showResult || hasConfirmed) return;
    setClueUsed(true);
    setShowClue(true);
  };

  const handleChangeQuestion = () => {
    if (changeQuestionUsed || showResult || hasConfirmed) return;
    setChangeQuestionUsed(true);
    setBets([0, 0, 0, 0]);
    setHiddenAnswers([]);
    setShowClue(false);
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
    <div className="-m-6 min-h-screen bg-[#0D1B21] flex flex-col font-fun">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-[#1B2F36] border-b-[3px] border-[#0D1B21]">
        <div className="max-w-3xl mx-auto px-3 md:px-4 py-2.5 md:py-3 flex items-center gap-2.5 md:gap-4">
          {/* Left: close + title */}
          <button
            onClick={() => setShowQuitDialog(true)}
            className="flex items-center justify-center size-8 rounded-lg hover:bg-red-500/10 transition-colors text-white/50 hover:text-red-400 shrink-0"
          >
            <X className="size-4" />
          </button>

          {/* Progress bar */}
          <div className="flex-1 flex gap-1">
            {questions.map((_, i) => (
              <div key={i} className="flex-1 h-2 md:h-2.5 rounded-full overflow-hidden bg-white/10">
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
                "flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-full font-bold text-xs md:text-sm tabular-nums shrink-0",
                timeLeft <= 3 ? "bg-[#FF4B4B]/20 text-[#FF4B4B]"
                  : timeLeft <= 5 ? "bg-[#FF9600]/20 text-[#FF9600]"
                  : "bg-[#58CC02]/20 text-[#58CC02]"
              )}
              animate={timeLeft <= 3 ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 0.5, repeat: timeLeft <= 3 ? Infinity : 0 }}
            >
              <Clock className="size-3.5" />
              {timeLeft}s
            </motion.div>
          )}

          {/* Balance */}
          <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
            <DollarSign className="size-3.5 md:size-4 text-[#FF9600]" />
            <span className="text-[#FF9600] font-black text-sm md:text-base tabular-nums">
              {currentMoney.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-3 md:px-4 py-4 md:py-5 pb-24 space-y-3 md:space-y-4">

          {/* Question + help row */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#131F24] rounded-2xl border-b-[3px] border-b-[#0D1B21] p-4 md:p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", getDifficultyStyle(currentQuestion.difficulty))}>
                  {currentQuestion.difficulty.toUpperCase()}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#1CB0F6]/15 text-[#1CB0F6]">
                  {currentQuestion.category}
                </span>
              </div>
              <HelpButtons
                fiftyFiftyUsed={fiftyFiftyUsed}
                clueUsed={clueUsed}
                changeQuestionUsed={changeQuestionUsed}
                onFiftyFifty={handleFiftyFifty}
                onClue={handleClue}
                onChangeQuestion={handleChangeQuestion}
                disabled={showResult || isAnimating || hasConfirmed}
              />
            </div>
            <p className="text-white text-lg md:text-xl font-bold leading-snug">
              {currentQuestion.question}
            </p>
          </motion.div>

          {/* Clue card */}
          <AnimatePresence>
            {showClue && !showResult && !isAnimating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#FF9600]/10 border border-[#FF9600]/30 rounded-xl px-4 py-3 flex items-start gap-2"
              >
                <span className="shrink-0">💡</span>
                <p className="text-sm text-white/60"><span className="text-[#FF9600] font-bold">Clue: </span>{currentQuestion.clue}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Betting Interface ── */}
          {!showResult && !isAnimating ? (
            <div className="space-y-3">
              {/* Remaining counter */}
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm font-bold text-white/40 uppercase tracking-wide">
                  Place Your Bets
                </span>
                <span className={cn("text-xs md:text-sm font-black tabular-nums", remaining === 0 ? "text-[#58CC02]" : "text-[#FF9600]")}>
                  {remaining === 0 ? "All allocated" : `${remaining.toLocaleString()} remaining`}
                </span>
              </div>

              {/* 2×2 grid on wider screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.options.map((option, index) => {
                  const isHidden = hiddenAnswers.includes(index);
                  const betAmount = bets[index];
                  const color = OPTION_COLORS[index % OPTION_COLORS.length];

                  if (isHidden) {
                    return (
                      <div key={index} className="bg-[#1B2F36] rounded-2xl border border-white/5 border-b-4 border-b-[#0D1B21] px-3 py-3 md:px-4 md:py-4 opacity-30">
                        <div className="flex items-center gap-3">
                          <div className={cn("flex size-8 md:size-9 shrink-0 items-center justify-center rounded-xl text-sm font-black", color.light, color.text)}>
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="text-sm text-white/40 line-through">{option}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={index}
                      className={cn(
                        "relative bg-[#1B2F36] rounded-2xl border border-white/5 border-b-4 border-b-[#0D1B21] px-3 py-3 md:px-4 md:py-4 overflow-visible",
                        hasConfirmed && "opacity-60"
                      )}
                    >
                      {/* Top row: badge + option text + bet amount */}
                      <div className="flex items-center justify-between mb-2 md:mb-3">
                        <OptionRow index={index} option={option} color={color} />
                        {betAmount > 0 && (
                          <span className="text-sm font-black text-[#FF9600] tabular-nums shrink-0 ml-2">
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
                          "[&_[data-slot=slider-track]]:h-2 md:[&_[data-slot=slider-track]]:h-2.5 [&_[data-slot=slider-track]]:bg-white/10 [&_[data-slot=slider-track]]:rounded-full",
                          color.sliderRange,
                          "[&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:border-2",
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
                    "w-full py-3.5 md:py-4 rounded-2xl font-black uppercase tracking-wide text-white text-sm md:text-base transition-all",
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
            <div className="space-y-3">
              <div className="text-center text-sm text-white/40 font-bold uppercase tracking-wide mb-2">
                Revealing the answer...
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.options.map((option, index) => {
                  const isCorrect = index === currentQuestion.correctAnswer;
                  const betAmount = bets[index];
                  const hasDropped = droppedAnswers.includes(index);
                  const color = OPTION_COLORS[index % OPTION_COLORS.length];

                  if (isCorrect) {
                    return (
                      <motion.div
                        key={index}
                        className="bg-[#58CC02]/15 rounded-2xl border-2 border-[#58CC02] border-b-4 border-b-[#46A302] px-4 py-4"
                        animate={{
                          boxShadow: ["0 0 0px rgba(88,204,2,0)", "0 0 25px rgba(88,204,2,0.5)", "0 0 0px rgba(88,204,2,0)"],
                          scale: [1, 1.02, 1],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <div className="flex items-center justify-between">
                          <OptionRow index={index} option={option} color={{ ...color, light: "bg-[#58CC02]", text: "text-white" }} textClass="text-emerald-300" />
                          {betAmount > 0 && (
                            <span className="text-sm font-black text-[#58CC02] shrink-0 ml-2">+{formatMoney(betAmount)}</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  }

                  if (hasDropped && betAmount > 0) {
                    return (
                      <motion.div
                        key={index}
                        className="relative overflow-visible bg-[#1B2F36] rounded-2xl border border-white/5 border-b-4 border-b-[#0D1B21] px-4 py-4"
                        animate={{ y: [0, 20, 300], opacity: [1, 0.8, 0], rotateX: [0, 5, 15], scale: [1, 0.95, 0.8] }}
                        transition={{ duration: 0.8, ease: "easeIn" }}
                      >
                        <FallingBills amount={betAmount} />
                        <div className="flex items-center justify-between">
                          <OptionRow index={index} option={option} color={color} />
                          <span className="text-sm font-black text-[#FF4B4B] shrink-0 ml-2">-{formatMoney(betAmount)}</span>
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <div
                      key={index}
                      className={cn(
                        "bg-[#1B2F36] rounded-2xl border border-white/5 border-b-4 border-b-[#0D1B21] px-4 py-4",
                        (hasDropped || betAmount === 0) && "opacity-30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <OptionRow index={index} option={option} color={color} />
                        {betAmount > 0 && (
                          <span className="text-sm font-black text-white/60 shrink-0 ml-2">{formatMoney(betAmount)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          ) : (
            /* ── Result Phase ── */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.options.map((option, index) => {
                  const isCorrect = index === currentQuestion.correctAnswer;
                  const betAmount = bets[index];
                  const color = OPTION_COLORS[index % OPTION_COLORS.length];

                  return (
                    <div
                      key={index}
                      className={cn(
                        "rounded-2xl border-2 border-b-4 px-4 py-4",
                        isCorrect
                          ? "bg-[#58CC02]/15 border-[#58CC02] border-b-[#46A302]"
                          : betAmount > 0
                            ? "bg-[#FF4B4B]/15 border-[#FF4B4B] border-b-[#CC3C3C]"
                            : "bg-[#1B2F36] border-white/5 border-b-[#0D1B21] opacity-40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <OptionRow
                          index={index}
                          option={option}
                          color={isCorrect ? { ...color, light: "bg-[#58CC02]", text: "text-white" } : betAmount > 0 ? { ...color, light: "bg-[#FF4B4B]", text: "text-white" } : color}
                          textClass={isCorrect ? "text-emerald-300" : betAmount > 0 ? "text-red-300" : "text-white/40"}
                        />
                        {betAmount > 0 && (
                          <span className={cn("text-sm font-black shrink-0 ml-2", isCorrect ? "text-[#58CC02]" : "text-[#FF4B4B]")}>
                            {isCorrect ? "+" : "-"}{formatMoney(betAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Result summary */}
              {bets[currentQuestion.correctAnswer] > 0 ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="bg-[#58CC02]/10 border-2 border-[#58CC02]/30 rounded-2xl p-6 text-center"
                >
                  <div className="text-3xl mb-1">✅</div>
                  <div className="text-white font-black text-base md:text-lg">
                    You saved {formatMoney(bets[currentQuestion.correctAnswer])}
                  </div>
                  <div className="text-white/40 text-sm font-semibold mt-0.5">
                    Lost {formatMoney(currentMoney - bets[currentQuestion.correctAnswer])}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="bg-[#FF4B4B]/10 border-2 border-[#FF4B4B]/30 rounded-2xl p-6 text-center"
                >
                  <div className="text-3xl mb-1">💀</div>
                  <div className="text-[#FF4B4B] font-black text-base md:text-lg">
                    Lost all {formatMoney(currentMoney)}
                  </div>
                </motion.div>
              )}

              <button
                onClick={handleNextQuestion}
                className="w-full py-4 rounded-2xl bg-[#58CC02] border-b-4 border-b-[#46A302] font-black uppercase tracking-wide text-white text-base hover:bg-[#61D806] active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
              >
                {bets[currentQuestion.correctAnswer] === 0 || currentQuestionIndex >= questions.length - 1
                  ? "View Results"
                  : "Next Question"}
                <ArrowRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Quit Dialog ── */}
      <AlertDialog open={showQuitDialog} onOpenChange={setShowQuitDialog}>
        <AlertDialogContent className="max-w-xs bg-[#1B2F36] border-0 rounded-3xl p-6 font-fun text-center">
          <AlertDialogTitle className="text-lg font-black text-white">
            Quit Money Drop?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/50 text-sm font-semibold">
            You&apos;ll lose your current balance of {formatMoney(currentMoney)}.
          </AlertDialogDescription>
          <div className="flex flex-col gap-2 mt-3">
            <button
              onClick={() => setShowQuitDialog(false)}
              className="w-full py-2.5 rounded-xl bg-[#58CC02] border-b-[3px] border-b-[#46A302] text-white font-black text-sm hover:bg-[#61D806] active:border-b-[2px] active:translate-y-[1px] transition-all"
            >
              Keep Playing
            </button>
            <button
              onClick={onBack}
              className="w-full py-2.5 rounded-xl bg-transparent border-2 border-[#FF4B4B]/40 text-[#FF4B4B] font-black text-sm hover:bg-[#FF4B4B]/10 active:translate-y-[1px] transition-all"
            >
              Quit Game
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
