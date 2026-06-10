"use client";

/* eslint-disable @next/next/no-img-element -- Football Logic clue images are CMS-provided runtime URLs. */

import { optimizedRemoteImageProps } from "@/lib/images/remoteImage";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { FootballLogicSession } from "@/lib/domain/dailyChallenge";
import { getDailyChallengeCopy } from "@/lib/i18n/dailyChallenge";
import { fuzzyMatchesAnswer } from "@/lib/answerMatching";
import { playSfx } from "@/lib/sounds/gameSounds";
import { QuitGameDialog } from "./QuitGameDialog";
import { DailyChallengeHeader } from "./components/DailyChallengeHeader";

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

interface FootballLogicGameProps {
  session: FootballLogicSession;
  onBack: () => void;
  onComplete: (score: number) => void;
}

export function FootballLogicGame({
  session,
  onBack,
  onComplete,
}: FootballLogicGameProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(session.secondsPerQuestion);
  const [resolved, setResolved] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastWasCorrect, setLastWasCorrect] = useState(false);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const copy = getDailyChallengeCopy();

  const currentQuestion = session.questions[currentQuestionIndex];

  const advance = useCallback(() => {
    if (currentQuestionIndex >= session.questions.length - 1) {
      onComplete(correctCount);
      return;
    }

    setCurrentQuestionIndex((previous) => previous + 1);
    setAnswer("");
    setTimeLeft(session.secondsPerQuestion);
    setResolved(false);
    setLastWasCorrect(false);
  }, [correctCount, currentQuestionIndex, onComplete, session.questions.length, session.secondsPerQuestion]);

  const submitAnswer = useCallback(() => {
    if (resolved || !currentQuestion) {
      return;
    }

    const isCorrect = fuzzyMatchesAnswer(answer, currentQuestion.acceptedAnswers);

    playSfx(isCorrect ? "dailyCorrect" : "wrongAnswer");
    if (isCorrect) {
      setCorrectCount((previous) => previous + 1);
    }

    setLastWasCorrect(isCorrect);
    setResolved(true);
  }, [answer, currentQuestion, resolved]);

  useEffect(() => {
    if (resolved || !currentQuestion) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          window.setTimeout(() => submitAnswer(), 0);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentQuestion, resolved, submitAnswer]);

  useEffect(() => {
    if (!resolved) {
      return;
    }

    const timeout = window.setTimeout(() => {
      advance();
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [advance, resolved]);

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat text-white">
      <DailyChallengeHeader
        onQuit={() => setShowQuitDialog(true)}
        currentIndex={currentQuestionIndex}
        total={session.questionCount}
        timeLeft={timeLeft}
      />

      {/* Content */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-4 overflow-y-auto">
        {/* Question card */}
        {currentQuestion.prompt && (
          <div
            className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-5 text-white backdrop-blur-sm sm:px-6 sm:py-6"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(15px, 1.9vw, 26px)',
            }}
          >
            <p className="leading-snug">{currentQuestion.prompt}</p>
          </div>
        )}

        {/* Image clues — yellow bordered cards */}
        <div className="mt-3 grid gap-2.5 md:grid-cols-2">
          <div
            className="overflow-hidden rounded-[16px] p-2"
            style={{
              border: '2px solid rgba(255,229,0,0.3)',
              boxShadow: '0 0 6.334px 1.32px rgba(255,229,0,0.1)',
            }}
          >
            <img
              {...optimizedRemoteImageProps(currentQuestion.imageAUrl, 448)}
              alt="Football logic clue A"
              className="h-56 w-full rounded-[12px] object-cover"
            />
          </div>
          <div
            className="overflow-hidden rounded-[16px] p-2"
            style={{
              border: '2px solid rgba(255,229,0,0.3)',
              boxShadow: '0 0 6.334px 1.32px rgba(255,229,0,0.1)',
            }}
          >
            <img
              {...optimizedRemoteImageProps(currentQuestion.imageBUrl, 448)}
              alt="Football logic clue B"
              className="h-56 w-full rounded-[12px] object-cover"
            />
          </div>
        </div>

        {/* Input + submit */}
        <div className="mt-4 flex flex-col gap-2.5 md:flex-row">
          <Input
            value={answer}
            disabled={resolved}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitAnswer();
              }
            }}
            placeholder={copy.typeYourAnswer}
            className="h-[48px] sm:h-[56px] rounded-[16px] bg-surface-card-tint border-2 border-surface-card text-white text-center placeholder:text-brand-slate focus:border-brand-cyan focus-visible:border-brand-cyan focus-visible:ring-brand-cyan/50 flex-1"
            style={{ ...poppins, fontSize: 'clamp(16px, 1.7vw, 22px)', fontWeight: 500 }}
            autoFocus
          />
          <button
            type="button"
            disabled={resolved}
            onClick={submitAnswer}
            className="flex items-center justify-center rounded-[16px] px-6 h-[48px] sm:h-[56px] transition-shadow duration-150"
            style={{
              ...poppins,
              fontSize: 'clamp(13px, 1.7vw, 20px)',
              textTransform: 'uppercase',
              backgroundColor: '#38B60E',
              color: '#FFFFFF',
              boxShadow: '0 1.76px 6.334px 1.32px rgba(56,182,14,0.25)',
              cursor: resolved ? 'default' : 'pointer',
              opacity: resolved ? 0.5 : 1,
            }}
          >
            {copy.submit}
          </button>
        </div>

        {/* Result feedback */}
        {resolved && (
          <div
            className="mt-3 rounded-[16px] px-4 py-3"
            style={{
              backgroundColor: lastWasCorrect ? 'rgba(56,182,14,0.15)' : 'rgba(251,49,1,0.15)',
              border: lastWasCorrect ? '2px solid rgba(56,182,14,0.5)' : '2px solid rgba(251,49,1,0.5)',
            }}
          >
            <div className="flex items-center justify-center gap-2" style={{ ...poppins, fontSize: 'clamp(13px, 1.7vw, 20px)', color: lastWasCorrect ? '#58CC02' : '#FB3101' }}>
              {lastWasCorrect ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
              <span>
                {lastWasCorrect ? copy.correct : `${copy.answerPrefix}: ${currentQuestion.displayAnswer}`}
              </span>
            </div>
            {currentQuestion.explanation && (
              <p className="mt-1 text-center text-sm text-white/55" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {currentQuestion.explanation}
              </p>
            )}
          </div>
        )}

        {/* Score */}
        <div className="mt-4 flex items-center justify-between text-sm" style={poppins}>
          <span className="text-white/55">{copy.score}</span>
          <span className="text-white">{correctCount}</span>
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
