"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trophy,
  Clock,
} from "lucide-react";

interface Clue {
  type: "text" | "emoji";
  content: string;
}

interface ClueQuestion {
  id: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  clues: Clue[];
  acceptedAnswers: string[];
  displayAnswer: string;
}

interface ClueGameProps {
  onBack: () => void;
  onComplete: (score: number) => void;
}

// Fuzzy matching utilities
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

function fuzzyMatch(input: string, target: string): boolean {
  const normalizedInput = input.toLowerCase().trim();
  const normalizedTarget = target.toLowerCase().trim();

  if (normalizedInput === normalizedTarget) return true;

  const maxDistance = normalizedTarget.length > 6 ? 2 : 1;
  return levenshteinDistance(normalizedInput, normalizedTarget) <= maxDistance;
}

function findBestMatch(
  input: string,
  acceptedAnswers: string[]
): string | null {
  const normalizedInput = input.toLowerCase().trim();

  for (const answer of acceptedAnswers) {
    if (fuzzyMatch(normalizedInput, answer)) {
      return answer;
    }
  }

  return null;
}

// Mock questions for testing
const MOCK_QUESTIONS: ClueQuestion[] = [
  {
    id: "cg-1",
    category: "Players",
    difficulty: "easy",
    clues: [
      { type: "emoji", content: "🇦🇷⚽" },
      { type: "text", content: "Plays for Inter Miami" },
      { type: "text", content: "8 Ballon d'Or awards" },
      { type: "text", content: "Barcelona legend" },
      { type: "text", content: "Won 2022 World Cup" },
    ],
    acceptedAnswers: ["messi", "lionel messi", "leo messi"],
    displayAnswer: "Lionel Messi",
  },
  {
    id: "cg-2",
    category: "Players",
    difficulty: "medium",
    clues: [
      { type: "emoji", content: "🇫🇷⚽🐢" },
      { type: "text", content: "Known for incredible speed" },
      { type: "text", content: "PSG to Real Madrid" },
      { type: "text", content: "World Cup winner at 19" },
      { type: "text", content: "Jersey number 7" },
    ],
    acceptedAnswers: ["mbappe", "kylian mbappe"],
    displayAnswer: "Kylian Mbappé",
  },
  {
    id: "cg-3",
    category: "Clubs",
    difficulty: "easy",
    clues: [
      { type: "emoji", content: "🔴⚪🏟️" },
      { type: "text", content: "North London club" },
      { type: "text", content: "Emirates Stadium" },
      { type: "text", content: "The Gunners" },
      { type: "text", content: "Invincibles 2003-04" },
    ],
    acceptedAnswers: ["arsenal", "arsenal fc"],
    displayAnswer: "Arsenal",
  },
  {
    id: "cg-4",
    category: "Players",
    difficulty: "hard",
    clues: [
      { type: "emoji", content: "🇳🇴⚽💪" },
      { type: "text", content: "Manchester City striker" },
      { type: "text", content: "Son of a Premier League player" },
      { type: "text", content: "36 goals in a single PL season" },
      { type: "text", content: "Treble winner 2022-23" },
    ],
    acceptedAnswers: ["haaland", "erling haaland"],
    displayAnswer: "Erling Haaland",
  },
  {
    id: "cg-5",
    category: "Managers",
    difficulty: "medium",
    clues: [
      { type: "emoji", content: "🇮🇹👔" },
      { type: "text", content: "Won Champions League with 3 clubs" },
      { type: "text", content: "Known for calmness" },
      { type: "text", content: "Real Madrid legend" },
      { type: "text", content: "AC Milan, Chelsea, Real Madrid" },
    ],
    acceptedAnswers: ["ancelotti", "carlo ancelotti"],
    displayAnswer: "Carlo Ancelotti",
  },
];

export function ClueGame({ onBack, onComplete }: ClueGameProps) {
  const [questions] = useState<ClueQuestion[]>(MOCK_QUESTIONS);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [revealedClues, setRevealedClues] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const progress =
    questions.length > 0
      ? ((currentQuestionIndex + 1) / questions.length) * 100
      : 0;

  const handleTimeOut = useCallback(() => {
    if (revealedClues < currentQuestion.clues.length) {
      return;
    }
    setIsCorrect(false);
    setShowResult(true);
    setStreak(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [currentQuestion.clues.length, revealedClues]);

  useEffect(() => {
    if (showResult && currentQuestionIndex === questions.length - 1) {
      const timeout = setTimeout(() => {
        onComplete(score);
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [showResult, currentQuestionIndex, questions.length, score, onComplete]);

  useEffect(() => {
    if (showResult || hasSubmitted) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (revealedClues < currentQuestion.clues.length) {
            setRevealedClues((r) => r + 1);
            setHasSubmitted(false);
            return 15;
          } else {
            handleTimeOut();
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [revealedClues, showResult, hasSubmitted, currentQuestion.clues.length, handleTimeOut]);

  const handleSubmit = () => {
    if (!userAnswer.trim() || hasSubmitted) return;

    const bestMatch = findBestMatch(userAnswer, currentQuestion.acceptedAnswers);
    const correct = bestMatch !== null;

    if (correct) {
      setHasSubmitted(true);
      setIsCorrect(true);
      setShowResult(true);

      let points = 200;
      if (revealedClues === 2) points = 150;
      if (revealedClues === 3) points = 100;
      if (revealedClues === 4) points = 50;
      if (revealedClues === 5) points = 25;

      setScore((prev) => prev + points);
      setStreak((prev) => {
        const newStreak = prev + 1;
        return newStreak;
      });

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    } else {
      if (revealedClues < currentQuestion.clues.length) {
        setHasSubmitted(true);
        setRevealedClues((prev) => prev + 1);
        setUserAnswer("");
        setTimeRemaining(15);
        setTimeout(() => {
          setHasSubmitted(false);
        }, 100);
      } else {
        setHasSubmitted(true);
        setIsCorrect(false);
        setShowResult(true);
        setStreak(0);

        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    }
  };

  const handleGiveUp = () => {
    if (showResult || hasSubmitted) return;

    setHasSubmitted(true);
    setIsCorrect(false);
    setShowResult(true);
    setStreak(0);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setRevealedClues(1);
      setUserAnswer("");
      setShowResult(false);
      setIsCorrect(false);
      setTimeRemaining(15);
      setHasSubmitted(false);
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !showResult && !hasSubmitted) {
      handleSubmit();
    } else if (e.key === "Enter" && showResult) {
      handleNext();
    }
  };

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Loading questions...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="flex items-center justify-center size-9 rounded-xl hover:bg-secondary active:scale-95 transition-all"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl">💡</div>
                  <h1 className="text-xl font-bold">Clues Challenge</h1>
                </div>
                <div className="text-xs text-muted-foreground">
                  Question {currentQuestionIndex + 1}/{questions.length}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Trophy className="size-4 text-yellow-500" />
                  <span className="text-sm font-bold">{score}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Streak: {streak}
                </div>
              </div>
            </div>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6 pb-6">
            <div className="text-center mb-4">
              <h3 className="text-sm text-muted-foreground mb-1">
                Guess the {currentQuestion.category}
              </h3>
              <Badge variant="outline" className="mb-3">
                {currentQuestion.category}
              </Badge>
              {!showResult && (
                <div className="flex items-center justify-center gap-2 text-lg">
                  <Clock
                    className={`size-5 ${timeRemaining <= 5 ? "text-red-500" : "text-primary"}`}
                  />
                  <span
                    className={
                      timeRemaining <= 5 ? "text-red-500" : "text-primary"
                    }
                  >
                    {timeRemaining}s
                  </span>
                </div>
              )}
            </div>

            {/* Clues */}
            <div className="space-y-3 mb-6">
              {currentQuestion.clues.slice(0, revealedClues).map((clue, index) => (
                <div
                  key={index}
                  className="p-4 bg-secondary rounded-lg text-center animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  {clue.type === "emoji" ? (
                    <div className="text-4xl">{clue.content}</div>
                  ) : (
                    <div className="text-base">{clue.content}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Clue Progress */}
            {!showResult && (
              <div className="flex items-center justify-center gap-2 mb-4">
                {currentQuestion.clues.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-12 rounded-full transition-colors ${
                      index < revealedClues ? "bg-primary" : "bg-secondary"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Points Indicator */}
            {!showResult && (
              <div className="text-center text-sm text-muted-foreground mb-4">
                {revealedClues === 1 && "⭐ Answer now: 200 points"}
                {revealedClues === 2 && "⭐ Answer now: 150 points"}
                {revealedClues === 3 && "⭐ Answer now: 100 points"}
                {revealedClues === 4 && "⭐ Answer now: 50 points"}
                {revealedClues === 5 && "⭐ Answer now: 25 points"}
              </div>
            )}

            {/* Answer Input */}
            {!showResult ? (
              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="Type your answer..."
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-center text-lg h-12"
                  autoFocus
                  disabled={hasSubmitted}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleSubmit}
                    className="w-full"
                    size="lg"
                    disabled={!userAnswer.trim() || hasSubmitted}
                  >
                    {hasSubmitted ? "Submitted..." : "Submit"}
                  </Button>
                  <Button
                    onClick={handleGiveUp}
                    variant="outline"
                    className="w-full"
                    size="lg"
                    disabled={hasSubmitted}
                  >
                    Give Up
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-lg text-center ${
                    isCorrect
                      ? "bg-green-500/10 border-2 border-green-500/30"
                      : "bg-red-500/10 border-2 border-red-500/30"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="size-6 text-green-600" />
                        <span className="text-green-700 dark:text-green-400 font-medium">
                          Correct!
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="size-6 text-red-600" />
                        <span className="text-red-700 dark:text-red-400 font-medium">
                          {hasSubmitted ? "Incorrect" : "Time's Up!"}
                        </span>
                      </>
                    )}
                  </div>
                  {isCorrect ? (
                    <div className="text-sm text-muted-foreground">
                      +
                      {revealedClues === 1
                        ? 200
                        : revealedClues === 2
                          ? 150
                          : revealedClues === 3
                            ? 100
                            : revealedClues === 4
                              ? 50
                              : 25}{" "}
                      points
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">
                        Correct answer:
                      </div>
                      <div className="text-lg font-medium">
                        {currentQuestion.displayAnswer}
                      </div>
                    </div>
                  )}
                </div>

                {currentQuestionIndex < questions.length - 1 ? (
                  <Button onClick={handleNext} className="w-full" size="lg">
                    Next Question
                    <ArrowRight className="size-4 ml-2" />
                  </Button>
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-3">
                    Loading results...
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hints */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>⏱️ 15 seconds per clue - answer quickly!</p>
          <p>💡 Fewer clues = more points</p>
        </div>
      </div>
    </div>
  );
}
