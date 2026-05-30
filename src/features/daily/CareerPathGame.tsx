"use client";

import { useCallback, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import type { CareerPathSession } from "@/lib/domain/dailyChallenge";
import { getDailyChallengeCopy } from "@/lib/i18n/dailyChallenge";
import { findAcceptedAnswer } from "./daily-challenge.utils";
import { QuitGameDialog } from "./QuitGameDialog";
import { DailyChallengeHeader } from "./components/DailyChallengeHeader";
import { ResultSplash } from "./components/ResultSplash";
import { useResultSplash } from "./components/useResultSplash";
import { DailyChallengeCompleteModal } from "./components/DailyChallengeCompleteModal";

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
  const [finished, setFinished] = useState(false);
  const { splashProps, fire } = useResultSplash();
  const copy = getDailyChallengeCopy();

  const currentQuestion = session.questions[currentQuestionIndex];

  const advance = useCallback(() => {
    if (currentQuestionIndex >= session.questions.length - 1) {
      setFinished(true);
      return;
    }

    setCurrentQuestionIndex((previous) => previous + 1);
    setTimeLeft(session.secondsPerQuestion);
    setAnswer("");
    setResolved(false);
  }, [currentQuestionIndex, session.questions.length, session.secondsPerQuestion]);

  const submitAnswer = useCallback(() => {
    if (resolved || !currentQuestion) {
      return;
    }

    const matchedAnswer = findAcceptedAnswer(answer, currentQuestion.acceptedAnswers);
    const isCorrect = matchedAnswer !== null;

    if (isCorrect) {
      setCorrectCount((previous) => previous + 1);
    }

    // Submit button sits on the right → splash flies in from the right.
    fire(isCorrect ? "correct" : "wrong", "right");
    setResolved(true);
  }, [answer, currentQuestion, resolved, fire]);

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

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-page-alt bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat text-white">
      <DailyChallengeHeader
        onQuit={() => setShowQuitDialog(true)}
        currentIndex={currentQuestionIndex}
        total={session.questionCount}
        timeLeft={timeLeft}
      />

      {/* Content */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-4">
        {/* Club path chips — the question itself (no separate prompt card). */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {currentQuestion.clubs.map((club, index) => (
            <div key={`${club}-${index}`} className="flex items-center gap-2.5">
              <span
                className="rounded-[14px] px-5 py-3.5"
                style={{
                  ...poppins,
                  fontSize: 'clamp(16px, 2.2vw, 26px)',
                  fontWeight: 700,
                  border: '2px solid #FFE500',
                  boxShadow: '0 0 6.334px 1.32px rgba(255,229,0,0.15)',
                }}
              >
                {club}
              </span>
              {index < currentQuestion.clubs.length - 1 && (
                <span className="text-2xl text-white/35" style={poppins}>→</span>
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

        {/* Reveal the answer on a wrong/timeout result (correct uses the splash). */}
        {resolved && (
          <p className="mt-3 text-center text-white/55" style={{ ...poppins, fontSize: 'clamp(12px, 1.4vw, 16px)' }}>
            {`${copy.answerPrefix}: ${currentQuestion.displayAnswer}`}
          </p>
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

      <ResultSplash {...splashProps} />

      <DailyChallengeCompleteModal
        open={finished}
        title={session.title}
        correct={correctCount}
        total={session.questionCount}
        onDone={() => onComplete(correctCount)}
      />
    </div>
  );
}
