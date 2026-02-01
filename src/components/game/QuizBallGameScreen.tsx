"use client";

import { useState, useEffect, useCallback } from "react";
import { Question } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { X, Clock, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MinimalPlayerScores } from "@/components/game/MinimalPlayerScores";

const getRandom = () => Math.random();

interface QuizBallGameScreenProps {
  questions: Question[];
  category: string;
  categoryIcon: string;
  categories?: { id: string; name: string; icon: string }[]; // For ranked mode with 2 categories
  playerAvatar: string;
  playerUsername: string;
  opponentAvatar: string;
  opponentUsername: string;
  onGameEnd: (score: number, opponentScore: number, correctAnswers: number, playerAnswers: (number | null)[]) => void;
  onQuit: () => void;
}

export function QuizBallGameScreen({
  questions,
  category,
  categoryIcon,
  categories,
  playerAvatar,
  playerUsername,
  opponentAvatar,
  opponentUsername,
  onGameEnd,
  onQuit,
}: QuizBallGameScreenProps) {
  const TIME_PER_QUESTION = 6;

  const [currentQuestionIndex, setCurrentQuestionIndex] =
    useState(0);
  const [timeRemaining, setTimeRemaining] = useState(
    TIME_PER_QUESTION,
  );
  const [selectedAnswer, setSelectedAnswer] = useState<
    number | null
  >(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [playerAnswers, setPlayerAnswers] = useState<(number | null)[]>([]);

  const currentQuestion = questions[currentQuestionIndex];
  const isCorrect =
    selectedAnswer === currentQuestion?.correctAnswer;
  const progress =
    ((currentQuestionIndex + 1) / questions.length) * 100;
  const timerPercentage =
    (timeRemaining / TIME_PER_QUESTION) * 100;

  const handleTimeUp = useCallback(() => {
    if (isAnswered) return;
    setIsAnswered(true);
    setEarnedPoints(0);

    // Simulate opponent answer (sometimes correct, sometimes wrong)
    const opponentAnswered = getRandom() > 0.3;
    if (opponentAnswered) {
      const opponentSpeed = getRandom();
      const opponentPoints = Math.floor(
        500 + opponentSpeed * 500,
      );
      setOpponentScore((prev) => prev + opponentPoints);
    }

    setShowResult(true);
  }, [isAnswered]);

  const handleAnswer = (answerIndex: number) => {
    if (isAnswered) return;

    setSelectedAnswer(answerIndex);
    setIsAnswered(true);

    const correct =
      answerIndex === currentQuestion.correctAnswer;

    if (correct) {
      // Calculate points based on speed (faster = more points)
      const speedBonus = timeRemaining / TIME_PER_QUESTION;
      const points = Math.floor(500 + speedBonus * 500);
      setEarnedPoints(points);
      setPlayerScore((prev) => prev + points);
      setCorrectAnswers((prev) => prev + 1);
    } else {
      setEarnedPoints(0);
    }

    // Simulate opponent answer
    const opponentCorrect = getRandom() > 0.4;
    if (opponentCorrect) {
      const opponentSpeed = getRandom();
      const opponentPoints = Math.floor(
        500 + opponentSpeed * 500,
      );
      setOpponentScore((prev) => prev + opponentPoints);
    }

    setShowResult(true);
  };

  const handleNext = useCallback(() => {
    // Add current answer to the list
    const updatedAnswers = [...playerAnswers, selectedAnswer];
    
    if (currentQuestionIndex < questions.length - 1) {
      setPlayerAnswers(updatedAnswers);
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimeRemaining(TIME_PER_QUESTION);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setShowResult(false);
      setEarnedPoints(0);
    } else {
      // Game is complete - pass the final answers array
      onGameEnd(playerScore, opponentScore, correctAnswers, updatedAnswers);
    }
  }, [
    playerAnswers,
    selectedAnswer,
    currentQuestionIndex,
    questions.length,
    TIME_PER_QUESTION,
    onGameEnd,
    playerScore,
    opponentScore,
    correctAnswers,
  ]);

  // Timer countdown
  useEffect(() => {
    if (isAnswered || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0.1) {
          handleTimeUp();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [timeRemaining, isAnswered, handleTimeUp]);

  // Auto-advance to next question after showing result
  useEffect(() => {
    if (showResult) {
      const timer = setTimeout(() => {
        handleNext();
      }, 2000); // Wait 2 seconds before auto-advancing

      return () => clearTimeout(timer);
    }
  }, [showResult, handleNext]);

  if (!currentQuestion) return null;

  // Get the current category for this question (if in ranked mode with 2 categories)
  const getCurrentCategoryInfo = () => {
    if (categories && categories.length === 2) {
      // Alternate between the two categories
      const categoryIndex = currentQuestionIndex % 2;
      return {
        name: categories[categoryIndex].name,
        icon: categories[categoryIndex].icon,
      };
    }
    return {
      name: category,
      icon: categoryIcon,
    };
  };

  const currentCategoryInfo = getCurrentCategoryInfo();

  return (
    <div className="min-h-screen flex flex-col p-4 space-y-3">
      {/* Header */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <button
            onClick={onQuit}
            className="flex items-center justify-center size-9 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
            aria-label="Quit game"
          >
            <X className="size-5" />
          </button>

          <div className="flex items-center gap-1.5">
            <div className="text-lg">{currentCategoryInfo.icon}</div>
            <div className="text-sm">{currentCategoryInfo.name}</div>
          </div>

          <div className="text-sm text-muted-foreground">
            {currentQuestionIndex + 1}/{questions.length}
          </div>
        </div>

        {/* Player Scores */}
        <MinimalPlayerScores
          playerAvatar={playerAvatar}
          playerUsername={playerUsername}
          playerScore={playerScore}
          opponentAvatar={opponentAvatar}
          opponentUsername={opponentUsername}
          opponentScore={opponentScore}
        />

        {/* Timer */}
        {!isAnswered && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Clock
                  className={`size-4 ${timerPercentage < 25 ? "text-destructive" : "text-primary"}`}
                />
                <span
                  className={
                    timerPercentage < 25
                      ? "text-destructive"
                      : ""
                  }
                >
                  {timeRemaining.toFixed(1)}s
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Zap className="size-3.5" />
                <span className="text-xs">
                  Faster = More Points
                </span>
              </div>
            </div>
            <Progress
              value={timerPercentage}
              className={`h-1.5 ${timerPercentage < 25 ? "[&>div]:bg-destructive" : ""}`}
            />
          </div>
        )}

        {/* Progress */}
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Question */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2 text-xs">
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <span>{currentCategoryInfo.icon}</span>
              <span>{currentCategoryInfo.name}</span>
            </Badge>
            <Badge variant="outline" className="text-xs">
              {currentQuestion.difficulty}
            </Badge>
          </div>
          <p className="text-sm leading-relaxed">
            {currentQuestion.question}
          </p>
        </CardContent>
      </Card>

      {/* Answer Options */}
      <div className="space-y-2.5 flex-1">
        <AnimatePresence mode="wait">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectAnswer =
              index === currentQuestion.correctAnswer;
            const showCorrect = isAnswered && isCorrectAnswer;
            const showIncorrect =
              isAnswered && isSelected && !isCorrect;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Button
                  variant="outline"
                  className={`w-full h-auto min-h-[3rem] px-4 py-3 justify-start text-left ${
                    showCorrect
                      ? "bg-green-500/20 border-green-500 hover:bg-green-500/20"
                      : showIncorrect
                        ? "bg-red-500/20 border-red-500 hover:bg-red-500/20"
                        : isAnswered
                          ? "opacity-50"
                          : "hover:border-primary/50"
                  }`}
                  onClick={() => handleAnswer(index)}
                  disabled={isAnswered}
                >
                  <div className="flex items-center gap-2.5 w-full">
                    <div
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
                        showCorrect
                          ? "bg-green-500 text-white"
                          : showIncorrect
                            ? "bg-red-500 text-white"
                            : "bg-secondary"
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="text-sm flex-1">
                      {option}
                    </span>
                    {showCorrect && (
                      <span className="text-xs text-green-600 shrink-0">
                        ✓
                      </span>
                    )}
                    {showIncorrect && (
                      <span className="text-xs text-red-600 shrink-0">
                        ✗
                      </span>
                    )}
                  </div>
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Result Display */}
        {showResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-2.5"
          >
            <Card
              className={
                isCorrect ? "bg-green-500/10" : "bg-red-500/10"
              }
            >
              <CardContent className="pt-3 pb-3">
                <div className="text-center">
                  {isCorrect ? (
                    <>
                      <div className="text-2xl mb-1">🎉</div>
                      <div className="text-sm mb-1">
                        Correct!
                      </div>
                      <div className="flex items-center justify-center gap-1.5 text-green-600">
                        <Zap className="size-4" />
                        <span className="text-lg">
                          +{earnedPoints}
                        </span>
                      </div>
                    </>
                  ) : selectedAnswer !== null ? (
                    <>
                      <div className="text-2xl mb-1">❌</div>
                      <div className="text-sm text-muted-foreground">
                        Incorrect - The answer was{" "}
                        {String.fromCharCode(
                          65 + currentQuestion.correctAnswer,
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl mb-1">⏰</div>
                      <div className="text-sm text-muted-foreground">
                        Time&apos;s up! The answer was{" "}
                        {String.fromCharCode(
                          65 + currentQuestion.correctAnswer,
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="text-center text-xs text-muted-foreground">
              {currentQuestionIndex < questions.length - 1
                ? "Next question in 2s..."
                : "Loading results..."}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
