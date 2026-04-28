"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock, XCircle } from "lucide-react";

import type { TrueFalseSession } from "@/lib/domain/dailyChallenge";
import { getDailyChallengeCopy } from "@/lib/i18n/dailyChallenge";
import { QuitGameDialog } from "./QuitGameDialog";

interface TrueFalseGameProps {
  session: TrueFalseSession;
  onBack: () => void;
  onComplete: (score: number) => void;
}

export function TrueFalseGame({
  session,
  onBack,
  onComplete,
}: TrueFalseGameProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(session.secondsPerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const copy = getDailyChallengeCopy();

  const currentQuestion = session.questions[currentQuestionIndex];
  const isAnswerCorrect = useMemo(
    () =>
      selectedAnswer !== null && currentQuestion
        ? selectedAnswer === currentQuestion.correctAnswer
        : false,
    [currentQuestion, selectedAnswer]
  );
  const resultTone = showResult
    ? selectedAnswer === null
      ? "timeout"
      : isAnswerCorrect
        ? "correct"
        : "wrong"
    : null;

  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex >= session.questions.length - 1) {
      onComplete(correctCount);
      return;
    }

    setCurrentQuestionIndex((previous) => previous + 1);
    setSelectedAnswer(null);
    setShowResult(false);
    setTimeLeft(session.secondsPerQuestion);
  }, [
    correctCount,
    currentQuestionIndex,
    onComplete,
    session.questions.length,
    session.secondsPerQuestion,
  ]);

  const handleAnswer = useCallback(
    (answer: boolean | null) => {
      if (!currentQuestion || showResult) {
        return;
      }

      setSelectedAnswer(answer);
      if (answer !== null && answer === currentQuestion.correctAnswer) {
        setCorrectCount((previous) => previous + 1);
      }
      setShowResult(true);
    },
    [currentQuestion, showResult]
  );

  useEffect(() => {
    if (showResult || !currentQuestion) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          window.setTimeout(() => handleAnswer(null), 0);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentQuestion, handleAnswer, showResult]);

  useEffect(() => {
    if (!showResult) {
      return;
    }

    const timeout = window.setTimeout(() => {
      goToNextQuestion();
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [goToNextQuestion, showResult]);

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#101820] font-poppins text-white">
      <div className="border-b border-white/10 bg-black/15">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
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

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-6">
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#58CC02] transition-all"
            style={{ width: `${((currentQuestionIndex + 1) / session.questionCount) * 100}%` }}
          />
        </div>

        <div
          className={[
            "rounded-[28px] border bg-[#17222A]/90 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] transition",
            resultTone === "correct"
              ? "border-[#58CC02]/70 shadow-[0_24px_70px_rgba(88,204,2,0.18)]"
              : resultTone === "wrong"
                ? "border-[#FF6B6B]/70 shadow-[0_24px_70px_rgba(255,107,107,0.16)]"
                : resultTone === "timeout"
                  ? "border-[#F8D34A]/60"
                  : "border-white/10",
          ].join(" ")}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/55">
              {currentQuestion.category}
            </span>
            <span className="text-sm font-semibold capitalize text-white/55">
              {currentQuestion.difficulty}
            </span>
          </div>

          <h1 className="mb-8 text-2xl font-semibold leading-tight md:text-3xl">
            {currentQuestion.prompt}
          </h1>

          {showResult ? (
            <div
              className={[
                "mb-5 flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-sm font-semibold",
                resultTone === "correct"
                  ? "border-[#58CC02]/60 bg-[#58CC02]/15 text-[#8BF15B]"
                  : resultTone === "wrong"
                    ? "border-[#FF6B6B]/60 bg-[#FF6B6B]/15 text-[#FF8A8A]"
                    : "border-[#F8D34A]/50 bg-[#F8D34A]/12 text-[#F8D34A]",
              ].join(" ")}
            >
              <span>
                {resultTone === "correct"
                  ? "Correct"
                  : resultTone === "wrong"
                    ? "Wrong"
                    : "Time's up"}
              </span>
              <span className="text-white/70">
                Answer: {currentQuestion.correctAnswer ? currentQuestion.trueLabel : currentQuestion.falseLabel}
              </span>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { value: true, label: currentQuestion.trueLabel },
              { value: false, label: currentQuestion.falseLabel },
            ].map((option) => {
              const isSelected = selectedAnswer === option.value;
              const shouldShowCorrect = showResult && option.value === currentQuestion.correctAnswer;
              const shouldShowWrong = showResult && isSelected && option.value !== currentQuestion.correctAnswer;

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  disabled={showResult}
                  onClick={() => handleAnswer(option.value)}
                  className={[
                    "rounded-[24px] border px-5 py-6 text-left text-xl font-semibold transition",
                    shouldShowCorrect
                      ? "border-[#58CC02] bg-[#58CC02] text-black shadow-[0_14px_35px_rgba(88,204,2,0.28)]"
                      : shouldShowWrong
                        ? "border-[#FF6B6B] bg-[#FF6B6B] text-black shadow-[0_14px_35px_rgba(255,107,107,0.22)]"
                        : isSelected
                          ? "border-[#1CB0F6] bg-[#1CB0F6]/15 text-white"
                          : showResult
                            ? "border-white/10 bg-white/[0.02] text-white/35"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span>{option.label}</span>
                    {showResult && shouldShowCorrect ? (
                      <CheckCircle2 className="size-7 text-black" />
                    ) : null}
                    {showResult && shouldShowWrong ? (
                      <XCircle className="size-7 text-black" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between text-sm text-white/55">
          <span>{copy.correctAnswers}</span>
          <span className="font-semibold text-white">{correctCount}</span>
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
