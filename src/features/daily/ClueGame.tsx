"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Clock,
  Lightbulb,
  Star,
} from "lucide-react";
import { QuitGameDialog } from "./QuitGameDialog";
import { DailyChallengeHeader } from "./components/DailyChallengeHeader";
import type { CluesSession } from "@/lib/domain/dailyChallenge";
import { calculateCluesDisplayPoints } from "@/utils/cluesScoring";
import { useLocale } from "@/contexts/LocaleContext";
import { fuzzyMatchesAnswer } from "@/lib/answerMatching";

interface ClueGameProps {
  session: CluesSession;
  onBack: () => void;
  onComplete: (score: number) => void;
}

function findBestMatch(
  input: string,
  acceptedAnswers: string[]
): string | null {
  for (const answer of acceptedAnswers) {
    if (fuzzyMatchesAnswer(input, [answer])) {
      return answer;
    }
  }

  return null;
}

function getPoints(revealedClues: number): number {
  return calculateCluesDisplayPoints(revealedClues);
}

export function ClueGame({ session, onBack, onComplete }: ClueGameProps) {
  const { t } = useLocale();
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
  }, [secondsPerClueStep, revealedClues, showResult, hasSubmitted, currentQuestion.clues.length, handleTimeOut]);

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
      <div className="fixed inset-0 z-40 bg-surface-deep font-fun flex items-center justify-center">
        <div className="bg-surface-card rounded-xl border-b-4 border-surface-card-deeper p-6">
          <p className="text-center text-brand-slate">
            Loading questions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-surface-deep font-poppins flex flex-col text-white">
      <DailyChallengeHeader
        onQuit={() => setShowQuitDialog(true)}
        currentIndex={currentQuestionIndex}
        total={questions.length}
        timeLeft={timeRemaining}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full p-3 md:p-4 lg:flex lg:flex-col lg:justify-center">
        <div className="max-w-2xl mx-auto space-y-4 w-full">
        <div className="bg-surface-card rounded-xl border-b-4 border-surface-card-deeper p-4 md:p-5">
          <div className="text-center mb-4">
            <h3 className="text-sm text-brand-slate mb-1">
              Guess the {currentQuestion.category}
            </h3>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-surface-card-tint text-brand-cyan mb-3">
              {currentQuestion.category}
            </span>
            {!showResult && (
              <div className="flex items-center justify-center gap-2 text-lg">
                <Clock
                  className={`size-5 ${timeRemaining <= 5 ? "text-brand-red-soft" : "text-brand-cyan"}`}
                />
                <span
                  className={`font-black ${
                    timeRemaining <= 5 ? "text-brand-red-soft" : "text-brand-cyan"
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
                className="p-4 bg-surface-card-tint rounded-xl border-b-4 border-surface-card text-center text-white animate-in fade-in slide-in-from-bottom-2 duration-300"
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
                    index < revealedClues ? "bg-brand-cyan" : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Points Indicator */}
          {!showResult && (
            <div className="text-center text-sm text-brand-slate mb-4 font-bold flex items-center justify-center gap-1.5">
              <Star className="size-4 text-brand-gold" />
              Answer now: {getPoints(revealedClues)} points
            </div>
          )}

          {/* Answer Input */}
          {!showResult ? (
            <div className="space-y-3">
              <Input
                type="text"
                placeholder={t("dailyGames.typeYourAnswerPlaceholder")}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-surface-card-tint border-2 border-surface-card text-white placeholder:text-brand-slate focus:border-brand-cyan text-center text-lg h-12 rounded-xl"
                autoFocus
                disabled={hasSubmitted}
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleSubmit}
                  className="w-full py-3 rounded-xl font-black text-white bg-brand-green-light border-b-4 border-b-[#46A302] active:border-b-2 active:translate-y-[2px] transition-all disabled:opacity-50 disabled:active:border-b-4 disabled:active:translate-y-0"
                  disabled={!userAnswer.trim() || hasSubmitted}
                >
                  {hasSubmitted ? "Submitted..." : "Submit"}
                </button>
                <button
                  onClick={handleGiveUp}
                  className="w-full py-3 rounded-xl font-black text-white bg-surface-card-tint border-b-4 border-b-[#1B2F36] active:border-b-2 active:translate-y-[2px] transition-all disabled:opacity-50 disabled:active:border-b-4 disabled:active:translate-y-0"
                  disabled={hasSubmitted}
                >
                  {t("dailyGames.giveUp")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl text-center border-b-4 ${
                  isCorrect
                    ? "bg-brand-green-light/15 border-b-[#46A302]"
                    : "bg-brand-red-soft/10 border-b-[#CC3C3C]"
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="size-6 text-brand-green-light" />
                      <span className="text-brand-green-light font-bold">
                        Correct!
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-6 text-brand-red-soft" />
                      <span className="text-brand-red-soft font-bold">
                        {hasSubmitted ? "Incorrect" : "Time's Up!"}
                      </span>
                    </>
                  )}
                </div>
                {isCorrect ? (
                  <div className="text-sm text-brand-slate">
                    +{getPoints(revealedClues)} points
                  </div>
                ) : (
                  <div>
                    <div className="text-sm text-brand-slate mb-1">
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
                  className="w-full py-3 rounded-xl font-black text-white bg-brand-green-light border-b-4 border-b-[#46A302] active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                >
                  {t("dailyGames.nextQuestion")}
                  <ArrowRight className="size-4" />
                </button>
              ) : (
                <div className="text-center text-sm text-brand-slate py-3">
                  Loading results...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hints */}
        <div className="text-center text-xs text-brand-slate space-y-1">
          <p className="flex items-center justify-center gap-1"><Clock className="size-3.5 text-brand-cyan" /> {secondsPerClueStep} seconds per clue - answer quickly!</p>
          <p className="flex items-center justify-center gap-1"><Lightbulb className="size-3.5 text-brand-orange" /> Fewer clues = more points</p>
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
