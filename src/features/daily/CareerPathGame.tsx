"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { CareerPathSession } from "@/lib/domain/dailyChallenge";
import { getDailyChallengeCopy } from "@/lib/i18n/dailyChallenge";
import { findAcceptedAnswer } from "./daily-challenge.utils";
import { QuitGameDialog } from "./QuitGameDialog";

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

interface CareerPathGameProps {
  session: CareerPathSession;
  onBack: () => void;
  onComplete: (score: number) => void;
}

export function CareerPathGame({
  session,
  onBack,
  onComplete,
}: CareerPathGameProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(session.secondsPerQuestion);
  const [answer, setAnswer] = useState("");
  const [resolved, setResolved] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [lastWasCorrect, setLastWasCorrect] = useState(false);
  const copy = getDailyChallengeCopy();

  const currentQuestion = session.questions[currentQuestionIndex];

  const advance = useCallback(() => {
    if (currentQuestionIndex >= session.questions.length - 1) {
      onComplete(correctCount);
      return;
    }

    setCurrentQuestionIndex((previous) => previous + 1);
    setTimeLeft(session.secondsPerQuestion);
    setAnswer("");
    setResolved(false);
    setLastWasCorrect(false);
  }, [correctCount, currentQuestionIndex, onComplete, session.questions.length, session.secondsPerQuestion]);

  const submitAnswer = useCallback(() => {
    if (resolved || !currentQuestion) {
      return;
    }

    const matchedAnswer = findAcceptedAnswer(answer, currentQuestion.acceptedAnswers);
    const isCorrect = matchedAnswer !== null;

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
    }, 1400);

    return () => window.clearTimeout(timeout);
  }, [advance, resolved]);

  if (!currentQuestion) {
    return null;
  }

  const displayTimer = timeLeft >= 10 ? `${timeLeft}` : `0${timeLeft}`;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#131F24] text-white">
      {/* Header pills */}
      <div className="px-4 pt-4">
        <div className="mx-auto max-w-3xl flex items-stretch gap-2.5">
          <button
            onClick={() => setShowQuitDialog(true)}
            className="flex items-center justify-center rounded-[16px] bg-brand-blue px-4 text-white h-[40px] sm:h-[52px]"
            style={poppins}
          >
            ✕
          </button>
          <div
            className="flex flex-1 items-center justify-center rounded-[16px] bg-brand-blue px-5 text-white h-[40px] sm:h-[52px]"
            style={{ ...poppins, fontSize: 'clamp(14px, 2.2vw, 26px)' }}
          >
            QUESTION {currentQuestionIndex + 1}/{session.questionCount}
          </div>
          <div
            className="flex w-[64px] items-center justify-center rounded-[16px] bg-brand-blue text-white h-[40px] sm:h-[52px] sm:w-[92px] tabular-nums"
            style={{ ...poppins, fontSize: 'clamp(14px, 2.2vw, 26px)' }}
          >
            {displayTimer}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-4">
        {/* Question card */}
        <div
          className="rounded-[24px] bg-surface-page px-5 py-5 text-white sm:px-6 sm:py-6"
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(15px, 1.9vw, 26px)',
          }}
        >
          <p className="leading-snug">{currentQuestion.prompt}</p>
        </div>

        {/* Club path chips */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {currentQuestion.clubs.map((club, index) => (
            <div key={`${club}-${index}`} className="flex items-center gap-2">
              <span
                className="rounded-[12px] px-4 py-2.5"
                style={{
                  ...poppins,
                  fontSize: 'clamp(12px, 1.5vw, 18px)',
                  border: '2px solid #FFE500',
                  boxShadow: '0 0 6.334px 1.32px rgba(255,229,0,0.15)',
                }}
              >
                {club}
              </span>
              {index < currentQuestion.clubs.length - 1 && (
                <span className="text-lg text-white/35" style={poppins}>→</span>
              )}
            </div>
          ))}
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
            placeholder={copy.typePlayerName}
            className="h-[48px] sm:h-[56px] rounded-[16px] bg-surface-page text-white text-center placeholder:text-white/35"
            style={{ ...poppins, fontSize: 'clamp(14px, 1.7vw, 22px)', fontWeight: 500, border: '2px solid rgba(255,255,255,0.1)' }}
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
            className="mt-3 flex items-center justify-center gap-2 rounded-[16px] px-4 py-3"
            style={{
              ...poppins,
              fontSize: 'clamp(13px, 1.7vw, 20px)',
              backgroundColor: lastWasCorrect ? 'rgba(56,182,14,0.15)' : 'rgba(251,49,1,0.15)',
              border: lastWasCorrect ? '2px solid rgba(56,182,14,0.5)' : '2px solid rgba(251,49,1,0.5)',
              color: lastWasCorrect ? '#58CC02' : '#FB3101',
            }}
          >
            {lastWasCorrect ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
            <span>
              {lastWasCorrect ? copy.correct : `${copy.answerPrefix}: ${currentQuestion.displayAnswer}`}
            </span>
          </div>
        )}

        {/* Score */}
        <div className="mt-4 flex items-center justify-between text-sm" style={poppins}>
          <span className="text-white/55">Score</span>
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
