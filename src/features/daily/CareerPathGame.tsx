"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Clock } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { CareerPathSession } from "@/lib/domain/dailyChallenge";
import { getDailyChallengeCopy } from "@/lib/i18n/dailyChallenge";
import { findAcceptedAnswer } from "./daily-challenge.utils";
import { QuitGameDialog } from "./QuitGameDialog";

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

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#101820] font-poppins text-white">
      <div className="border-b border-white/10 bg-black/15">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3">
          <button
            onClick={() => setShowQuitDialog(true)}
            className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/45">
              {session.title}
            </p>
            <p className="text-sm font-semibold text-white/80">
              {currentQuestionIndex + 1} / {session.questionCount}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4 text-[#F8D34A]" />
              <span>{timeLeft}s</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-6">
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#1CB0F6] transition-all"
            style={{ width: `${((currentQuestionIndex + 1) / session.questionCount) * 100}%` }}
          />
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#17222A]/90 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/55">
              {currentQuestion.category}
            </span>
            <span className="text-sm font-semibold capitalize text-white/55">
              {currentQuestion.difficulty}
            </span>
          </div>

          <h1 className="mb-6 text-2xl font-semibold leading-tight md:text-3xl">
            {currentQuestion.prompt}
          </h1>

          <div className="mb-8 flex flex-wrap items-center gap-3">
            {currentQuestion.clubs.map((club, index) => (
              <div key={`${club}-${index}`} className="flex items-center gap-3">
                <span className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base font-semibold">
                  {club}
                </span>
                {index < currentQuestion.clubs.length - 1 ? (
                  <span className="text-lg font-semibold text-white/35">→</span>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
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
              className="h-14 rounded-2xl border-white/10 bg-white/[0.04] text-lg text-white placeholder:text-white/35"
            />
            <button
              type="button"
              disabled={resolved}
              onClick={submitAnswer}
              className="rounded-2xl bg-[#38B60E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#43c116] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copy.submit}
            </button>
          </div>

          {resolved ? (
            <p className={`mt-4 text-sm font-semibold ${lastWasCorrect ? "text-[#58CC02]" : "text-[#FF6B6B]"}`}>
              {lastWasCorrect ? copy.correct : `${copy.answerPrefix}: ${currentQuestion.displayAnswer}`}
            </p>
          ) : null}
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
