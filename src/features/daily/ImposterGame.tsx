"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import type { ImposterSession } from "@/lib/domain/dailyChallenge";
import { getDailyChallengeCopy } from "@/lib/i18n/dailyChallenge";
import { playSfx } from "@/lib/sounds/gameSounds";
import { QuitGameDialog } from "./QuitGameDialog";
import { DailyChallengeHeader } from "./components/DailyChallengeHeader";
import { ResultSplash } from "./components/ResultSplash";
import { useResultSplash } from "./components/useResultSplash";
import { DailyChallengeCompleteModal } from "./components/DailyChallengeCompleteModal";

// The imposter reveal sting is ~2s long; delay the reveal to match it.
const IMPOSTER_REVEAL_DELAY_MS = 2000;

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
  const [revealing, setRevealing] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [finished, setFinished] = useState(false);
  const { splashProps, fire } = useResultSplash();
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
      setFinished(true);
      return;
    }

    setCurrentQuestionIndex((previous) => previous + 1);
    setSelectedOptionIds([]);
    setResolved(false);
    setRevealing(false);
    setTimeLeft(session.secondsPerQuestion);
  }, [currentQuestionIndex, session.questions.length, session.secondsPerQuestion]);

  // Lock input and play the 2s reveal sting; the actual result flips after it.
  const handleResolve = useCallback(() => {
    if (resolved || revealing) {
      return;
    }
    setRevealing(true);
    playSfx("imposterReveal");
  }, [resolved, revealing]);

  // After the sting finishes, score and reveal.
  useEffect(() => {
    if (!revealing || resolved) {
      return;
    }
    const timeout = window.setTimeout(() => {
      if (isCorrectSelection) {
        setCorrectCount((previous) => previous + 1);
        // Chime ONLY when the full set is correct, timed to the reveal beat (the
        // answers appear now, after the 2s sting). Imposter already plays its own
        // reveal sting, so the splash stays silent to avoid stacking sounds — and
        // a wrong answer gets no extra buzzer, just the sting.
        playSfx("dailyCorrect");
      }
      // Submit button sits on the right → splash flies in from the right.
      fire(isCorrectSelection ? "correct" : "wrong", "right", { silent: true });
      setResolved(true);
    }, IMPOSTER_REVEAL_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [revealing, resolved, isCorrectSelection, fire]);

  useEffect(() => {
    if (resolved) {
      const timeout = window.setTimeout(() => {
        advance();
      }, 1400);
      return () => window.clearTimeout(timeout);
    }

    // Pause the countdown while the reveal sting is playing.
    if (revealing) {
      return;
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
  }, [advance, handleResolve, resolved, revealing]);

  const toggleOption = (optionId: string) => {
    if (resolved || revealing) {
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
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat text-white">
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
          className="flex flex-col rounded-[24px] border border-white/10 bg-white/5 px-5 py-5 text-white backdrop-blur-sm sm:px-6 sm:py-6"
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
                disabled={resolved || revealing}
                onClick={() => toggleOption(option.id)}
                className="relative flex items-center justify-center overflow-hidden rounded-[16px] px-3 transition-shadow duration-150 h-[60px] sm:h-[78px] md:h-[94px]"
                style={{
                  ...poppins,
                  fontSize: 'clamp(13px, 1.7vw, 22px)',
                  textTransform: 'uppercase',
                  color: isRevealWrong ? '#FB3101' : '#FFFFFF',
                  backgroundColor: isRevealCorrect
                    ? '#38B60E'
                    : isSelected && !resolved
                      ? 'rgba(255,229,0,0.18)'
                      : 'transparent',
                  border: isRevealCorrect
                    ? 'none'
                    : isRevealWrong
                      ? '2px solid #FB3101'
                      : isSelected
                        ? '3px solid #FFE500'
                        : '2px solid rgba(255,229,0,0.4)',
                  boxShadow: isRevealCorrect
                    ? '0 1.76px 6.334px 1.32px rgba(56,182,14,0.25)'
                    : isRevealWrong
                      ? '0 1.76px 6.334px 1.32px rgba(251,49,1,0.25)'
                      : isSelected
                        ? '0 0 12px 2px rgba(255,229,0,0.55)'
                        : '0 0 6.334px 1.32px rgba(255,229,0,0.18)',
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
            disabled={resolved || revealing}
            onClick={handleResolve}
            className="flex items-center justify-center rounded-[16px] px-6 h-[40px] sm:h-[48px] transition-shadow duration-150"
            style={{
              ...poppins,
              fontSize: 'clamp(13px, 1.7vw, 20px)',
              textTransform: 'uppercase',
              backgroundColor: '#38B60E',
              color: '#FFFFFF',
              boxShadow: '0 1.76px 6.334px 1.32px rgba(56,182,14,0.25)',
              cursor: resolved || revealing ? 'default' : 'pointer',
              opacity: resolved || revealing ? 0.5 : 1,
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
