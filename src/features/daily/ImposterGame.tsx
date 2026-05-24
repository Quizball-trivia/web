"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import type { ImposterSession } from "@/lib/domain/dailyChallenge";
import { getDailyChallengeCopy } from "@/lib/i18n/dailyChallenge";
import { QuitGameDialog } from "./QuitGameDialog";
import { DailyChallengeHeader } from "./components/DailyChallengeHeader";

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

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
    <div className="fixed inset-0 z-40 flex flex-col bg-[#131F24] text-white">
      <DailyChallengeHeader
        onQuit={() => setShowQuitDialog(true)}
        currentIndex={currentQuestionIndex}
        total={session.questionCount}
        timeLeft={timeLeft}
      />

      {/* Content */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4 overflow-y-auto">
        {/* Question card */}
        <div
          className="flex flex-col rounded-[24px] bg-surface-page px-5 py-5 text-white sm:px-6 sm:py-6"
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(15px, 1.9vw, 26px)',
            minHeight: 'clamp(80px, 12vw, 140px)',
          }}
        >
          <p className="leading-snug">{currentQuestion.prompt}</p>
          <p className="mt-2 text-white/50" style={{ fontSize: 'clamp(11px, 1.3vw, 16px)', fontWeight: 500 }}>
            {copy.imposterInstruction}
          </p>
        </div>

        {/* Options — 2 column grid, yellow border like ranked MC */}
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {currentQuestion.options.map((option) => {
            const isSelected = selectedOptionIds.includes(option.id);
            const isCorrect = currentQuestion.correctOptionIds.includes(option.id);
            const isRevealCorrect = resolved && isCorrect;
            const isRevealWrong = resolved && isSelected && !isCorrect;

            return (
              <button
                key={option.id}
                type="button"
                disabled={resolved}
                onClick={() => toggleOption(option.id)}
                className="relative flex items-center justify-center overflow-hidden rounded-[16px] px-3 transition-shadow duration-150 h-[60px] sm:h-[78px] md:h-[94px]"
                style={{
                  ...poppins,
                  fontSize: 'clamp(13px, 1.7vw, 22px)',
                  textTransform: 'uppercase',
                  color: isRevealWrong ? '#FB3101' : '#FFFFFF',
                  backgroundColor: isRevealCorrect ? '#38B60E' : 'transparent',
                  border: isRevealCorrect
                    ? 'none'
                    : isRevealWrong
                      ? '2px solid #FB3101'
                      : isSelected
                        ? '2px solid #1CB0F6'
                        : '2px solid #FFE500',
                  boxShadow: isRevealCorrect
                    ? '0 1.76px 6.334px 1.32px rgba(56,182,14,0.25)'
                    : isRevealWrong
                      ? '0 1.76px 6.334px 1.32px rgba(251,49,1,0.25)'
                      : isSelected
                        ? '0 0 6.334px 1.32px rgba(28,176,246,0.25)'
                        : '0 0 6.334px 1.32px rgba(255,229,0,0.25)',
                  cursor: resolved ? 'default' : 'pointer',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-center leading-tight">{option.text}</span>
                  {(isSelected || isRevealCorrect) && (
                    <CheckCircle2 className="size-5 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Submit + score */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-white/55" style={poppins}>
            {copy.score}: <span className="text-white">{correctCount}</span>
          </p>
          <button
            type="button"
            disabled={resolved}
            onClick={handleResolve}
            className="flex items-center justify-center rounded-[16px] px-6 h-[40px] sm:h-[48px] transition-shadow duration-150"
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
            {copy.submitSelection}
          </button>
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
