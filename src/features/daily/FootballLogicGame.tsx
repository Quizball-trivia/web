"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Clock } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { FootballLogicSession } from "@/lib/domain/dailyChallenge";
import { getDailyChallengeCopy } from "@/lib/i18n/dailyChallenge";
import { findAcceptedAnswer } from "./daily-challenge.utils";
import { QuitGameDialog } from "./QuitGameDialog";

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
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [advance, resolved]);

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#101820] font-poppins text-white">
      <div className="border-b border-white/10 bg-black/15">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
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

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-6">
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#F38FFF] transition-all"
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

          {currentQuestion.prompt ? (
            <h1 className="mb-6 text-2xl font-semibold leading-tight md:text-3xl">
              {currentQuestion.prompt}
            </h1>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20 p-3">
              <img
                src={currentQuestion.imageAUrl}
                alt="Football logic clue A"
                className="h-64 w-full rounded-[18px] object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20 p-3">
              <img
                src={currentQuestion.imageBUrl}
                alt="Football logic clue B"
                className="h-64 w-full rounded-[18px] object-cover"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 md:flex-row">
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
            <div className="mt-4 space-y-1">
              <p className={`text-sm font-semibold ${lastWasCorrect ? "text-[#58CC02]" : "text-[#FF6B6B]"}`}>
                {lastWasCorrect ? copy.correct : `${copy.answerPrefix}: ${currentQuestion.displayAnswer}`}
              </p>
              {currentQuestion.explanation ? (
                <p className="text-sm text-white/55">{currentQuestion.explanation}</p>
              ) : null}
            </div>
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
