"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trophy,
  Clock,
  Lightbulb,
  Star,
} from "lucide-react";
import { QuitGameDialog } from "./QuitGameDialog";
import type { CluesSession } from "@/lib/domain/dailyChallenge";

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
  session: CluesSession;
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

const POINTS_BY_CLUE: Record<number, number> = { 1: 200, 2: 150, 3: 100, 4: 50, 5: 25 };
function getPoints(revealedClues: number): number {
  return POINTS_BY_CLUE[revealedClues] ?? 25;
}

export function ClueGame({ session, onBack, onComplete }: ClueGameProps) {
  const secondsPerClueStep = session.secondsPerClueStep;
  const questions = session.questions;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [revealedClues, setRevealedClues] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(secondsPerClueStep);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
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
            return secondsPerClueStep;
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

      setScore((prev) => prev + getPoints(revealedClues));
      setStreak((prev) => prev + 1);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    } else {
      if (revealedClues < currentQuestion.clues.length) {
        setHasSubmitted(true);
        setRevealedClues((prev) => prev + 1);
        setUserAnswer("");
        setTimeRemaining(secondsPerClueStep);
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
      setTimeRemaining(secondsPerClueStep);
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
      <div className="fixed inset-0 z-40 bg-[#131F24] font-fun flex items-center justify-center">
        <div className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] p-6">
          <p className="text-center text-[#56707A]">
            Loading questions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#131F24] font-fun flex flex-col">
      {/* Header */}
      <div className="bg-[#1B2F36] border-b-[3px] border-[#131F24]">
        <div className="max-w-2xl mx-auto px-3 md:px-4 py-2.5 md:py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowQuitDialog(true)}
                className="flex items-center justify-center size-9 rounded-xl hover:bg-[#243B44] active:scale-95 transition-all text-white"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-6 text-[#FF9600]" />
                  <h1 className="text-lg md:text-xl font-black uppercase text-white">Clues Challenge</h1>
                </div>
                <div className="text-xs text-[#56707A] font-bold">
                  Question {currentQuestionIndex + 1}/{questions.length}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Trophy className="size-4 text-[#FFD700]" />
                  <span className="text-sm font-black text-white">{score}</span>
                </div>
                <div className="text-xs text-[#56707A] font-bold">
                  Streak: {streak}
                </div>
              </div>
            </div>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#58CC02] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full p-3 md:p-4 lg:flex lg:flex-col lg:justify-center">
        <div className="max-w-2xl mx-auto space-y-4 w-full">
        <div className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] p-4 md:p-5">
          <div className="text-center mb-4">
            <h3 className="text-sm text-[#56707A] mb-1">
              Guess the {currentQuestion.category}
            </h3>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-[#243B44] text-[#1CB0F6] mb-3">
              {currentQuestion.category}
            </span>
            {!showResult && (
              <div className="flex items-center justify-center gap-2 text-lg">
                <Clock
                  className={`size-5 ${timeRemaining <= 5 ? "text-[#FF4B4B]" : "text-[#1CB0F6]"}`}
                />
                <span
                  className={`font-black ${
                    timeRemaining <= 5 ? "text-[#FF4B4B]" : "text-[#1CB0F6]"
                  }`}
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
                className="p-4 bg-[#243B44] rounded-xl border-b-4 border-[#1B2F36] text-center text-white animate-in fade-in slide-in-from-bottom-2 duration-300"
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
                    index < revealedClues ? "bg-[#1CB0F6]" : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Points Indicator */}
          {!showResult && (
            <div className="text-center text-sm text-[#56707A] mb-4 font-bold flex items-center justify-center gap-1.5">
              <Star className="size-4 text-[#FFD700]" />
              Answer now: {getPoints(revealedClues)} points
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
                className="bg-[#243B44] border-2 border-[#1B2F36] text-white placeholder:text-[#56707A] focus:border-[#1CB0F6] text-center text-lg h-12 rounded-xl"
                autoFocus
                disabled={hasSubmitted}
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleSubmit}
                  className="w-full py-3 rounded-xl font-black text-white bg-[#58CC02] border-b-4 border-b-[#46A302] active:border-b-2 active:translate-y-[2px] transition-all disabled:opacity-50 disabled:active:border-b-4 disabled:active:translate-y-0"
                  disabled={!userAnswer.trim() || hasSubmitted}
                >
                  {hasSubmitted ? "Submitted..." : "Submit"}
                </button>
                <button
                  onClick={handleGiveUp}
                  className="w-full py-3 rounded-xl font-black text-white bg-[#243B44] border-b-4 border-b-[#1B2F36] active:border-b-2 active:translate-y-[2px] transition-all disabled:opacity-50 disabled:active:border-b-4 disabled:active:translate-y-0"
                  disabled={hasSubmitted}
                >
                  Give Up
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl text-center border-b-4 ${
                  isCorrect
                    ? "bg-[#58CC02]/15 border-b-[#46A302]"
                    : "bg-[#FF4B4B]/10 border-b-[#CC3C3C]"
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="size-6 text-[#58CC02]" />
                      <span className="text-[#58CC02] font-bold">
                        Correct!
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-6 text-[#FF4B4B]" />
                      <span className="text-[#FF4B4B] font-bold">
                        {hasSubmitted ? "Incorrect" : "Time's Up!"}
                      </span>
                    </>
                  )}
                </div>
                {isCorrect ? (
                  <div className="text-sm text-[#56707A]">
                    +{getPoints(revealedClues)} points
                  </div>
                ) : (
                  <div>
                    <div className="text-sm text-[#56707A] mb-1">
                      Correct answer:
                    </div>
                    <div className="text-lg font-bold text-white">
                      {currentQuestion.displayAnswer}
                    </div>
                  </div>
                )}
              </div>

              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="w-full py-3 rounded-xl font-black text-white bg-[#58CC02] border-b-4 border-b-[#46A302] active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                >
                  Next Question
                  <ArrowRight className="size-4" />
                </button>
              ) : (
                <div className="text-center text-sm text-[#56707A] py-3">
                  Loading results...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hints */}
        <div className="text-center text-xs text-[#56707A] space-y-1">
          <p className="flex items-center justify-center gap-1"><Clock className="size-3.5 text-[#1CB0F6]" /> {secondsPerClueStep} seconds per clue - answer quickly!</p>
          <p className="flex items-center justify-center gap-1"><Lightbulb className="size-3.5 text-[#FF9600]" /> Fewer clues = more points</p>
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
