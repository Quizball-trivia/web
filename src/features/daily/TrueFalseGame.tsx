"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from 'motion/react';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Coins,
  X,
  Flame,
  ArrowLeft,
} from "lucide-react";

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="flex items-center justify-center size-9 rounded-xl hover:bg-secondary active:scale-95 transition-all"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="text-2xl">✅</div>
                <h1 className="text-xl font-bold">True or False</h1>
              </div>
            </div>

            {!showResult && (
              <motion.div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-colors ${
                  timeLeft <= 2
                    ? "bg-red-500/20 border-red-500 text-red-600 dark:text-red-400"
                    : timeLeft <= 3
                      ? "bg-yellow-500/20 border-yellow-500 text-yellow-600 dark:text-yellow-400"
                      : "bg-primary/20 border-primary text-primary"
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
              <Coins className="size-5 text-yellow-500" />
              <div>
                <div className="text-xs text-muted-foreground">Coins</div>
                <div className="text-lg font-bold">{totalCoins}</div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              {currentQuestionIndex + 1}/10
            </div>
          </div>

          {correctStreak >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-2 mt-3"
            >
              <Flame className="size-4 text-orange-500" />
              <span className="text-sm">
                {currentMultiplier}x Streak! {correctStreak} correct in a row
              </span>
              <Flame className="size-4 text-orange-500" />
            </motion.div>
          )}

          <Progress value={progress} className="h-1.5 mt-3" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        <Card className="flex-1 flex flex-col">
          <CardContent className="pt-6 pb-6 flex-1 flex flex-col">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-xs">
                  Question {currentQuestionIndex + 1}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {currentQuestion.category}
                </Badge>
              </div>
              <h2 className="text-xl font-semibold leading-relaxed text-center">
                {currentQuestion.question}
              </h2>
            </div>

            <AnimatePresence mode="wait">
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`mb-3 p-3 rounded-lg border-2 ${
                    isCorrect
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-red-500/10 border-red-500/30"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="size-5 text-green-600" />
                        <div className="text-center">
                          <div className="text-sm font-medium text-green-700 dark:text-green-400">
                            Correct!
                          </div>
                          <div className="text-xs text-muted-foreground">
                            +{COINS_PER_ANSWER * currentMultiplier} coins
                            {currentMultiplier > 1 &&
                              ` (${currentMultiplier}x)`}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="size-5 text-red-600" />
                        <div className="text-center">
                          <div className="text-sm font-medium text-red-700 dark:text-red-400">
                            {selectedAnswer === null
                              ? "Time's Up!"
                              : "Incorrect"}
                          </div>
                          <div className="text-xs text-muted-foreground">
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
              <Button
                onClick={() => handleAnswer(true)}
                disabled={showResult}
                size="lg"
                className={`h-28 text-xl ${
                  showResult
                    ? selectedAnswer === true
                      ? isCorrect
                        ? "bg-green-600 hover:bg-green-600"
                        : "bg-red-600 hover:bg-red-600"
                      : currentQuestion.correctAnswer === 0
                        ? "bg-green-600/50 hover:bg-green-600/50"
                        : ""
                    : ""
                }`}
                variant={
                  showResult && currentQuestion.correctAnswer === 0
                    ? "default"
                    : "outline"
                }
              >
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="size-10" />
                  <span>TRUE</span>
                </div>
              </Button>

              <Button
                onClick={() => handleAnswer(false)}
                disabled={showResult}
                size="lg"
                className={`h-28 text-xl ${
                  showResult
                    ? selectedAnswer === false
                      ? isCorrect
                        ? "bg-green-600 hover:bg-green-600"
                        : "bg-red-600 hover:bg-red-600"
                      : currentQuestion.correctAnswer === 1
                        ? "bg-green-600/50 hover:bg-green-600/50"
                        : ""
                    : ""
                }`}
                variant={
                  showResult && currentQuestion.correctAnswer === 1
                    ? "default"
                    : "outline"
                }
              >
                <div className="flex flex-col items-center gap-2">
                  <X className="size-10" />
                  <span>FALSE</span>
                </div>
              </Button>
            </div>

            {!showResult && correctStreak < 3 && (
              <div className="text-center text-xs text-muted-foreground mt-3">
                Get 3 correct in a row for 2x coins!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
