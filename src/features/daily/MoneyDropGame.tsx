"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Split,
  Lightbulb,
  RefreshCw,
} from "lucide-react";

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

// Inline HelpButtons component
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
  return (
    <div className="flex gap-2 justify-center flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={onFiftyFifty}
        disabled={fiftyFiftyUsed || disabled}
        className="flex-1 min-w-[90px] relative"
      >
        <Split className="size-4 mr-1.5" />
        <span>50/50</span>
        {fiftyFiftyUsed && (
          <Badge className="absolute -top-2 -right-2 h-5 px-1.5 text-xs bg-muted text-muted-foreground">
            Used
          </Badge>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onClue}
        disabled={clueUsed || disabled}
        className="flex-1 min-w-[90px] relative"
      >
        <Lightbulb className="size-4 mr-1.5" />
        <span>Clue</span>
        {clueUsed && (
          <Badge className="absolute -top-2 -right-2 h-5 px-1.5 text-xs bg-muted text-muted-foreground">
            Used
          </Badge>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onChangeQuestion}
        disabled={changeQuestionUsed || disabled}
        className="flex-1 min-w-[90px] relative"
      >
        <RefreshCw className="size-4 mr-1.5" />
        <span>Skip</span>
        {changeQuestionUsed && (
          <Badge className="absolute -top-2 -right-2 h-5 px-1.5 text-xs bg-muted text-muted-foreground">
            Used
          </Badge>
        )}
      </Button>
    </div>
  );
}

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
    toHide.forEach((idx) => {
      newBets[idx] = 0;
    });
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

  const formatMoney = (amount: number) => {
    return `${amount.toLocaleString()} coins`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "hard":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowQuitDialog(true)}
                className="flex items-center justify-center size-9 rounded-xl hover:bg-destructive/10 transition-colors text-destructive"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="text-2xl">💰</div>
                <h1 className="text-xl font-bold">Money Drop</h1>
              </div>
            </div>

            {!showResult && !isAnimating && (
              <motion.div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-colors ${
                  timeLeft <= 3
                    ? "bg-red-500/20 border-red-500 text-red-600 dark:text-red-400"
                    : timeLeft <= 5
                      ? "bg-yellow-500/20 border-yellow-500 text-yellow-600 dark:text-yellow-400"
                      : "bg-primary/20 border-primary text-primary"
                }`}
                animate={timeLeft <= 3 ? { scale: [1, 1.1, 1] } : {}}
                transition={{
                  duration: 0.5,
                  repeat: timeLeft <= 3 ? Infinity : 0,
                }}
              >
                <Clock className="size-4" />
                <span className="text-sm font-mono tabular-nums">{timeLeft}s</span>
              </motion.div>
            )}

            <div className="flex items-center gap-2">
              <DollarSign className="size-5 text-green-500" />
              <div>
                <div className="text-xs text-muted-foreground">Balance</div>
                <div className="text-lg font-bold">{formatMoney(currentMoney)}</div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              {currentQuestionIndex + 1}/{questions.length}
            </div>
          </div>

          <Progress
            value={((currentQuestionIndex + 1) / questions.length) * 100}
            className="h-1.5 mt-3"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Question */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <div className="flex gap-1.5">
                <Badge
                  variant="outline"
                  className={`${getDifficultyColor(currentQuestion.difficulty)} text-xs`}
                >
                  {currentQuestion.difficulty}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {currentQuestion.category}
                </Badge>
              </div>
            </div>
            <CardTitle className="text-base leading-relaxed">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Help Buttons */}
        <div className="space-y-3">
          <HelpButtons
            fiftyFiftyUsed={fiftyFiftyUsed}
            clueUsed={clueUsed}
            changeQuestionUsed={changeQuestionUsed}
            onFiftyFifty={handleFiftyFifty}
            onClue={handleClue}
            onChangeQuestion={handleChangeQuestion}
            disabled={showResult || isAnimating || hasConfirmed}
          />

          {showClue && !showResult && !isAnimating && (
            <Card className="p-3 bg-yellow-500/10 border-yellow-500/30">
              <div className="flex items-start gap-2">
                <div className="shrink-0 text-yellow-600 dark:text-yellow-400">💡</div>
                <div className="text-sm">
                  <div className="text-yellow-700 dark:text-yellow-300 font-medium mb-1">
                    Clue:
                  </div>
                  <div className="text-muted-foreground">{currentQuestion.clue}</div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Betting Interface */}
        {!showResult && !isAnimating ? (
          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Place Your Bets</div>
              <div
                className={`text-sm ${remaining === 0 ? "text-green-600 font-medium" : "text-muted-foreground"}`}
              >
                Remaining: {formatMoney(remaining)}
              </div>
            </div>

            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isHidden = hiddenAnswers.includes(index);
                const betAmount = bets[index];

                if (isHidden) {
                  return (
                    <Card key={index} className="relative overflow-visible opacity-40">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            Hidden by 50/50
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <Card
                    key={index}
                    className={`relative overflow-visible ${hasConfirmed ? "opacity-60" : ""}`}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="text-sm truncate">{option}</span>
                        </div>
                        <div className="text-sm font-medium shrink-0 ml-2">
                          {formatMoney(betAmount)}
                        </div>
                      </div>
                      <Slider
                        value={[betAmount]}
                        onValueChange={(value) => handleBetChange(index, value)}
                        max={currentMoney}
                        step={10}
                        disabled={hasConfirmed}
                        className="w-full"
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {!isFullyAllocated && !hasConfirmed && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <AlertCircle className="size-4 text-yellow-600 shrink-0" />
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  You must allocate all your money before confirming
                </p>
              </div>
            )}

            {!hasConfirmed && (
              <Button
                onClick={handleConfirmBets}
                size="lg"
                className="w-full"
                disabled={!isFullyAllocated}
              >
                Confirm Bets
              </Button>
            )}
          </div>
        ) : isAnimating ? (
          <div className="space-y-3 flex-1">
            <div className="text-center text-sm text-muted-foreground mb-4">
              Revealing the answer...
            </div>
            {currentQuestion.options.map((option, index) => {
              const isCorrect = index === currentQuestion.correctAnswer;
              const betAmount = bets[index];
              const hasDropped = droppedAnswers.includes(index);

              return (
                <Card
                  key={index}
                  className={`relative ${
                    isCorrect
                      ? "border-2 border-green-500 bg-green-500/20"
                      : hasDropped
                        ? "opacity-30"
                        : ""
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                            isCorrect ? "bg-green-500 text-white" : "bg-secondary"
                          }`}
                        >
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="text-sm truncate">{option}</span>
                      </div>
                      {betAmount > 0 && (
                        <div
                          className={`text-sm font-medium ${
                            isCorrect
                              ? "text-green-600 dark:text-green-400"
                              : hasDropped
                                ? "text-red-600 dark:text-red-400"
                                : ""
                          }`}
                        >
                          {hasDropped ? "-" : ""}
                          {formatMoney(betAmount)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4 flex-1">
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isCorrect = index === currentQuestion.correctAnswer;
                const betAmount = bets[index];

                let cardStyle = "bg-secondary";
                if (isCorrect) {
                  cardStyle = "bg-green-500/20 border-2 border-green-500";
                } else if (betAmount > 0) {
                  cardStyle = "bg-red-500/20 border-2 border-red-500";
                }

                return (
                  <Card key={index} className={cardStyle}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                              isCorrect
                                ? "bg-green-500 text-white"
                                : betAmount > 0
                                  ? "bg-red-500 text-white"
                                  : "bg-secondary"
                            }`}
                          >
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="text-sm truncate">{option}</span>
                        </div>
                        <div className="shrink-0 ml-2">
                          {betAmount > 0 && (
                            <div
                              className={`text-sm font-medium ${isCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
                            >
                              {isCorrect ? "+" : "-"}
                              {formatMoney(betAmount)}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card
              className={
                bets[currentQuestion.correctAnswer] > 0
                  ? "bg-green-500/10 border-green-500/20"
                  : "bg-red-500/10 border-red-500/20"
              }
            >
              <CardContent className="pt-4 text-center">
                <div className="space-y-2">
                  {bets[currentQuestion.correctAnswer] > 0 ? (
                    <>
                      <div className="text-2xl">✓</div>
                      <div className="text-sm font-medium">
                        You saved {formatMoney(bets[currentQuestion.correctAnswer])}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Lost{" "}
                        {formatMoney(currentMoney - bets[currentQuestion.correctAnswer])}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl">✗</div>
                      <div className="text-sm font-medium text-red-600 dark:text-red-400">
                        Lost all {formatMoney(currentMoney)}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleNextQuestion} size="lg" className="w-full">
              {bets[currentQuestion.correctAnswer] === 0 ||
              currentQuestionIndex >= questions.length - 1
                ? "View Results"
                : "Next Question"}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Quit Dialog */}
      <AlertDialog open={showQuitDialog} onOpenChange={setShowQuitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quit Money Drop?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to quit? You&apos;ll lose your current balance of{" "}
              {formatMoney(currentMoney)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Playing</AlertDialogCancel>
            <AlertDialogAction
              onClick={onBack}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Quit Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
