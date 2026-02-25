"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from 'motion/react';

import {
  Clock,
  CheckCircle2,
  XCircle,
  Coins,
  X,
  Flame,
  ArrowLeft,
} from "lucide-react";
import { QuitGameDialog } from "./QuitGameDialog";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: "easy" | "medium" | "hard";
}

interface TrueFalseGameProps {
  onBack: () => void;
  onComplete: (coinsEarned: number) => void;
}

// Mock questions for testing
const MOCK_QUESTIONS: Question[] = [
  {
    id: "tf-1",
    question: "Lionel Messi has won more Ballon d'Or awards than Cristiano Ronaldo.",
    options: ["True", "False"],
    correctAnswer: 0,
    category: "Awards",
    difficulty: "easy",
  },
  {
    id: "tf-2",
    question: "The FIFA World Cup has been held every 4 years without interruption since 1930.",
    options: ["True", "False"],
    correctAnswer: 1,
    category: "World Cup",
    difficulty: "medium",
  },
  {
    id: "tf-3",
    question: "Manchester United has won more Premier League titles than Liverpool.",
    options: ["True", "False"],
    correctAnswer: 0,
    category: "Premier League",
    difficulty: "easy",
  },
  {
    id: "tf-4",
    question: "Pelé scored over 1000 career goals.",
    options: ["True", "False"],
    correctAnswer: 0,
    category: "Legends",
    difficulty: "medium",
  },
  {
    id: "tf-5",
    question: "The Champions League was originally called the European Cup.",
    options: ["True", "False"],
    correctAnswer: 0,
    category: "History",
    difficulty: "easy",
  },
  {
    id: "tf-6",
    question: "Germany has won more World Cups than Brazil.",
    options: ["True", "False"],
    correctAnswer: 1,
    category: "World Cup",
    difficulty: "easy",
  },
  {
    id: "tf-7",
    question: "The offside rule was introduced in the 1990s.",
    options: ["True", "False"],
    correctAnswer: 1,
    category: "Rules",
    difficulty: "medium",
  },
  {
    id: "tf-8",
    question: "Barcelona and Real Madrid share the same city.",
    options: ["True", "False"],
    correctAnswer: 1,
    category: "Clubs",
    difficulty: "easy",
  },
  {
    id: "tf-9",
    question: "VAR (Video Assistant Referee) was first used at a World Cup in 2018.",
    options: ["True", "False"],
    correctAnswer: 0,
    category: "Technology",
    difficulty: "medium",
  },
  {
    id: "tf-10",
    question: "The English Premier League has 22 teams.",
    options: ["True", "False"],
    correctAnswer: 1,
    category: "Premier League",
    difficulty: "easy",
  },
];

export function TrueFalseGame({ onBack, onComplete }: TrueFalseGameProps) {
  const QUESTION_TIME = 10;
  const COINS_PER_ANSWER = 10;

  const [questions] = useState<Question[]>(MOCK_QUESTIONS);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [totalCoins, setTotalCoins] = useState(0);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [showQuitDialog, setShowQuitDialog] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const getMultiplier = (streak: number): number => {
    if (streak < 3) return 1;
    return Math.floor(streak / 3) + 1;
  };

  const handleAnswer = useCallback((answer: boolean | null) => {
    if (showResult) return;

    setSelectedAnswer(answer);

    const correctAnswer = currentQuestion.correctAnswer === 0;
    const correct = answer === correctAnswer;

    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);

      const multiplier = getMultiplier(newStreak);
      setCurrentMultiplier(multiplier);

      const coinsEarned = COINS_PER_ANSWER * multiplier;
      setTotalCoins((prev) => prev + coinsEarned);
    } else {
      setCorrectStreak(0);
      setCurrentMultiplier(1);
    }

    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setTimeLeft(QUESTION_TIME);
        setShowResult(false);
        setSelectedAnswer(null);
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        const finalCoins = correct
          ? totalCoins + COINS_PER_ANSWER * getMultiplier(correctStreak + 1)
          : totalCoins;
        setTimeout(() => onComplete(finalCoins), 500);
      }
    }, 1500);
  }, [
    showResult,
    currentQuestion,
    correctStreak,
    currentQuestionIndex,
    questions.length,
    totalCoins,
    onComplete,
  ]);

  useEffect(() => {
    if (showResult) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimeout(() => handleAnswer(null), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showResult, handleAnswer]);

  return (
    <div className="fixed inset-0 z-40 bg-[#131F24] font-fun flex flex-col">
      {/* Header */}
      <div className="bg-[#1B2F36] border-b-[3px] border-[#131F24]">
        <div className="max-w-2xl mx-auto px-3 md:px-4 py-2.5 md:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowQuitDialog(true)}
                className="flex items-center justify-center size-9 rounded-xl hover:bg-[#243B44] active:scale-95 transition-all text-white"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-6 text-[#58CC02]" />
                <h1 className="text-lg md:text-xl font-black uppercase text-white">True or False</h1>
              </div>
            </div>

            {!showResult && (
              <motion.div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 font-bold transition-colors ${
                  timeLeft <= 2
                    ? "bg-[#FF4B4B]/20 border-[#FF4B4B] text-[#FF4B4B]"
                    : timeLeft <= 3
                      ? "bg-[#FF9600]/20 border-[#FF9600] text-[#FF9600]"
                      : "bg-[#1CB0F6]/20 border-[#1CB0F6] text-[#1CB0F6]"
                }`}
                animate={
                  timeLeft <= 2
                    ? {
                        scale: [1, 1.1, 1],
                      }
                    : {}
                }
                transition={{
                  duration: 0.5,
                  repeat: timeLeft <= 2 ? Infinity : 0,
                }}
              >
                <Clock className="size-4" />
                <span className="text-sm font-mono tabular-nums">
                  {timeLeft}s
                </span>
              </motion.div>
            )}

            <div className="flex items-center gap-2">
              <Coins className="size-5 text-[#FFD700]" />
              <div>
                <div className="text-xs text-[#56707A]">Coins</div>
                <div className="text-lg font-black text-white">{totalCoins}</div>
              </div>
            </div>

            <div className="text-sm text-[#56707A] font-bold">
              {currentQuestionIndex + 1}/10
            </div>
          </div>

          {correctStreak >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 bg-[#FF9600]/15 border border-[#FF9600]/30 rounded-xl p-2 mt-3"
            >
              <Flame className="size-4 text-[#FF9600]" />
              <span className="text-sm text-white font-bold">
                {currentMultiplier}x Streak! {correctStreak} correct in a row
              </span>
              <Flame className="size-4 text-[#FF9600]" />
            </motion.div>
          )}

          <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-[#58CC02] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full p-3 md:p-4 lg:flex lg:flex-col lg:justify-center">
        <div className="max-w-2xl mx-auto space-y-4 w-full">
        <div className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] p-4 md:p-5 flex flex-col">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-[#243B44] text-[#1CB0F6]">
                Question {currentQuestionIndex + 1}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-[#243B44] text-white">
                {currentQuestion.category}
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold leading-relaxed text-center text-white">
              {currentQuestion.question}
            </h2>
          </div>

          <AnimatePresence mode="wait">
            {showResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`mb-3 p-3 rounded-xl border-b-4 ${
                  isCorrect
                    ? "bg-[#58CC02]/15 border-b-[#46A302]"
                    : "bg-[#FF4B4B]/10 border-b-[#CC3C3C]"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="size-5 text-[#58CC02]" />
                      <div className="text-center">
                        <div className="text-sm font-bold text-[#58CC02]">
                          Correct!
                        </div>
                        <div className="text-xs text-[#56707A]">
                          +{COINS_PER_ANSWER * currentMultiplier} coins
                          {currentMultiplier > 1 &&
                            ` (${currentMultiplier}x)`}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-5 text-[#FF4B4B]" />
                      <div className="text-center">
                        <div className="text-sm font-bold text-[#FF4B4B]">
                          {selectedAnswer === null
                            ? "Time's Up!"
                            : "Incorrect"}
                        </div>
                        <div className="text-xs text-[#56707A]">
                          Streak reset
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-4 flex-1">
            <button
              onClick={() => handleAnswer(true)}
              disabled={showResult}
              className={`h-28 rounded-xl text-xl font-black uppercase text-white transition-all flex items-center justify-center ${
                showResult
                  ? selectedAnswer === true
                    ? isCorrect
                      ? "bg-[#58CC02] border-b-4 border-b-[#46A302]"
                      : "bg-[#FF4B4B] border-b-4 border-b-[#CC3C3C]"
                    : currentQuestion.correctAnswer === 0
                      ? "bg-[#58CC02]/50 border-b-4 border-b-[#46A302]/50"
                      : "bg-[#243B44] border-b-4 border-b-[#1B2F36]"
                  : "bg-[#58CC02] border-b-4 border-b-[#46A302] active:border-b-2 active:translate-y-[2px]"
              } disabled:opacity-60`}
            >
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="size-10" />
                <span>TRUE</span>
              </div>
            </button>

            <button
              onClick={() => handleAnswer(false)}
              disabled={showResult}
              className={`h-28 rounded-xl text-xl font-black uppercase text-white transition-all flex items-center justify-center ${
                showResult
                  ? selectedAnswer === false
                    ? isCorrect
                      ? "bg-[#58CC02] border-b-4 border-b-[#46A302]"
                      : "bg-[#FF4B4B] border-b-4 border-b-[#CC3C3C]"
                    : currentQuestion.correctAnswer === 1
                      ? "bg-[#58CC02]/50 border-b-4 border-b-[#46A302]/50"
                      : "bg-[#243B44] border-b-4 border-b-[#1B2F36]"
                  : "bg-[#FF4B4B] border-b-4 border-b-[#CC3C3C] active:border-b-2 active:translate-y-[2px]"
              } disabled:opacity-60`}
            >
              <div className="flex flex-col items-center gap-2">
                <X className="size-10" />
                <span>FALSE</span>
              </div>
            </button>
          </div>

          {!showResult && correctStreak < 3 && (
            <div className="text-center text-xs text-[#56707A] mt-3">
              Get 3 correct in a row for 2x coins!
            </div>
          )}
        </div>
        </div>
        </div>
      </div>

      <QuitGameDialog
        open={showQuitDialog}
        onOpenChange={setShowQuitDialog}
        onQuit={onBack}
      />
    </div>
  );
}
