"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import {
  ArrowRight,
  Clock,
  Lightbulb,
} from "lucide-react";
import { QuitGameDialog } from "./QuitGameDialog";
import { DailyGameStage } from "./components/DailyGameStage";
import { CluesBoard } from "@/features/possession/components/live-special/CluesBoard";
import { DailyChallengeHeader } from "./components/DailyChallengeHeader";
import type { CluesSession } from "@/lib/domain/dailyChallenge";
import { calculateCluesDisplayPoints } from "@/utils/cluesScoring";
import { useLocale } from "@/contexts/LocaleContext";
import { fuzzyMatchesAnswer } from "@/lib/answerMatching";
import { playSfx } from "@/lib/sounds/gameSounds";

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
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [revealedClues, setRevealedClues] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(secondsPerClueStep);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const handleTimeOut = useCallback(() => {
    if (revealedClues < currentQuestion.clues.length) {
      return;
    }
    setIsCorrect(false);
    setShowResult(true);
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
      playSfx("dailyCorrect");
      setHasSubmitted(true);
      setIsCorrect(true);
      setShowResult(true);

      setScore((prev) => prev + getPoints(revealedClues));

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
        // Final wrong: no clues left to reveal — play the buzzer.
        playSfx("wrongAnswer");
        setHasSubmitted(true);
        setIsCorrect(false);
        setShowResult(true);

        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
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


  if (!currentQuestion) {
    return (
      <div className="fixed inset-0 z-40 bg-surface-deep font-fun flex items-center justify-center">
        <div className="bg-surface-card rounded-xl border-b-4 border-surface-card-deeper p-6">
          <p className="text-center text-brand-slate">
            {t('dailyGames.loadingQuestions')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat font-poppins text-white">
      {/* Header + gameplay as one centred composition (shared daily stage). */}
      <DailyGameStage
        header={
          <DailyChallengeHeader
            onQuit={() => setShowQuitDialog(true)}
            currentIndex={currentQuestionIndex}
            total={questions.length}
            timeLeft={timeRemaining}
            className="px-0 pt-0"
          />
        }
      >
        <div className="w-full space-y-4">
          {/* Same board ranked renders — one component, two drivers. */}
          <CluesBoard
            qIndex={currentQuestionIndex}
            clues={currentQuestion.clues}
            revealedClues={revealedClues}
            resolved={showResult}
            guess={userAnswer}
            onGuessChange={setUserAnswer}
            onSubmit={handleSubmit}
            inputLocked={hasSubmitted && !showResult}
            displayAnswer={currentQuestion.displayAnswer}
            answeredCorrectly={isCorrect}
            earnedPoints={isCorrect ? getPoints(revealedClues) : null}
            footer={
              showResult ? (
                currentQuestionIndex < questions.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="font-poppins flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-brand-green text-white transition-colors hover:bg-brand-green-deep"
                    style={{ fontWeight: 600, fontSize: 16, letterSpacing: '0.06em' }}
                  >
                    {t("dailyGames.nextQuestion")}
                    <ArrowRight className="size-4" />
                  </button>
                ) : (
                  <div className="py-3 text-center text-sm text-brand-slate">
                    {t('dailyGames.loadingResults')}
                  </div>
                )
              ) : null
            }
          />

          {/* Hints */}
          <div className="space-y-1 text-center text-xs text-brand-slate">
            <p className="flex items-center justify-center gap-1"><Clock className="size-3.5 text-brand-cyan" /> {t('dailyGames.cluesPerStepTip', { seconds: secondsPerClueStep })}</p>
            <p className="flex items-center justify-center gap-1"><Lightbulb className="size-3.5 text-brand-orange" /> {t('dailyGames.fewerCluesMorePoints')}</p>
          </div>
        </div>
      </DailyGameStage>

      <QuitGameDialog
        open={showQuitDialog}
        onOpenChange={setShowQuitDialog}
        onQuit={onBack}
      />
    </div>
  );
}
