"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";

import type { ImposterSession } from "@/lib/domain/dailyChallenge";
import { getDailyChallengeCopy } from "@/lib/i18n/dailyChallenge";
import { QuitGameDialog } from "./QuitGameDialog";

interface ImposterGameProps {
  session: ImposterSession;
  onBack: () => void;
  onComplete: (score: number) => void;
}

export function ImposterGame({
  session,
  onBack,
  onComplete,
}: ImposterGameProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(session.secondsPerQuestion);
  const [resolved, setResolved] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const copy = getDailyChallengeCopy();

  const currentQuestion = session.questions[currentQuestionIndex];
  const correctOptionIds = useMemo(
    () => [...currentQuestion.correctOptionIds].sort(),
    [currentQuestion.correctOptionIds]
  );

  const isCorrectSelection = useMemo(() => {
    const normalizedSelection = [...selectedOptionIds].sort();
    return (
      normalizedSelection.length === correctOptionIds.length
      && normalizedSelection.every((optionId, index) => optionId === correctOptionIds[index])
    );
  }, [correctOptionIds, selectedOptionIds]);

  const advance = useCallback(() => {
    if (currentQuestionIndex >= session.questions.length - 1) {
      onComplete(correctCount);
      return;
    }

    setCurrentQuestionIndex((previous) => previous + 1);
    setSelectedOptionIds([]);
    setResolved(false);
    setTimeLeft(session.secondsPerQuestion);
  }, [correctCount, currentQuestionIndex, onComplete, session.questions.length, session.secondsPerQuestion]);

  const handleResolve = useCallback(() => {
    if (resolved) {
      return;
    }

    if (isCorrectSelection) {
      setCorrectCount((previous) => previous + 1);
    }
    setResolved(true);
  }, [isCorrectSelection, resolved]);

  useEffect(() => {
    if (resolved) {
      const timeout = window.setTimeout(() => {
        advance();
      }, 1400);
      return () => window.clearTimeout(timeout);
    }

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          window.setTimeout(() => handleResolve(), 0);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [advance, handleResolve, resolved]);

  const toggleOption = (optionId: string) => {
    if (resolved) {
      return;
    }

    setSelectedOptionIds((previous) =>
      previous.includes(optionId)
        ? previous.filter((value) => value !== optionId)
        : [...previous, optionId]
    );
  };

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-page-deep font-poppins text-white">
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
              <Clock className="size-4 text-brand-yellow-soft" />
              <span>{timeLeft}s</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-6">
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-brand-cyan transition-all"
            style={{ width: `${((currentQuestionIndex + 1) / session.questionCount) * 100}%` }}
          />
        </div>

        <div className="rounded-[28px] border border-white/10 bg-surface-input/90 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/55">
              {currentQuestion.category}
            </span>
            <span className="text-sm font-semibold capitalize text-white/55">
              {currentQuestion.difficulty}
            </span>
          </div>

          <h1 className="mb-2 text-2xl font-semibold leading-tight md:text-3xl">
            {currentQuestion.prompt}
          </h1>
          <p className="mb-8 text-sm text-white/55">
            {copy.imposterInstruction}
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedOptionIds.includes(option.id);
              const isCorrect = currentQuestion.correctOptionIds.includes(option.id);

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={resolved}
                  onClick={() => toggleOption(option.id)}
                  className={[
                    "rounded-[20px] border px-4 py-4 text-left transition",
                    resolved && isCorrect
                      ? "border-brand-green-light bg-brand-green-light/15"
                      : resolved && isSelected && !isCorrect
                        ? "border-brand-red-light bg-brand-red-light/15"
                        : isSelected
                          ? "border-brand-cyan bg-brand-cyan/15"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-lg font-semibold">{option.text}</span>
                    <span
                      className={[
                        "flex size-6 items-center justify-center rounded-full border text-xs",
                        isSelected || (resolved && isCorrect)
                          ? "border-white/20 bg-white/15 text-white"
                          : "border-white/15 text-transparent",
                      ].join(" ")}
                    >
                      <CheckCircle2 className="size-4" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <p className="text-sm text-white/55">
              {copy.score}: <span className="font-semibold text-white">{correctCount}</span>
            </p>
            <button
              type="button"
              disabled={resolved}
              onClick={handleResolve}
              className="rounded-2xl bg-brand-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-green disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copy.submitSelection}
            </button>
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
