"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import type { TrueFalseSession } from "@/lib/domain/dailyChallenge";
import { shuffleArray } from "@/lib/utils";
import { getDailyChallengeCopy } from "@/lib/i18n/dailyChallenge";
import { useLocale } from "@/contexts/LocaleContext";
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
  const [finished, setFinished] = useState(false);
  const { splashProps, fire } = useResultSplash();
  const copy = getDailyChallengeCopy();
  const { t } = useLocale();

  const currentQuestion = session.questions[currentQuestionIndex];
  const answerOptions = useMemo(
    () =>
      currentQuestion
        ? shuffleArray([
            { value: true, label: currentQuestion.trueLabel },
            { value: false, label: currentQuestion.falseLabel },
          ])
        : [],
    [currentQuestion]
  );
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
      setFinished(true);
      return;
    }

    setCurrentQuestionIndex((previous) => previous + 1);
    setSelectedAnswer(null);
    setShowResult(false);
    setTimeLeft(session.secondsPerQuestion);
  }, [
    currentQuestionIndex,
    session.questions.length,
    session.secondsPerQuestion,
  ]);

  const handleAnswer = useCallback(
    (answer: boolean | null) => {
      if (!currentQuestion || showResult) {
        return;
      }

      setSelectedAnswer(answer);
      // The correct button's column decides which side the splash flies from.
      // Options are shuffled, so derive the side from the rendered position.
      const correctIndex = answerOptions.findIndex(
        (option) => option.value === currentQuestion.correctAnswer
      );
      const from: "left" | "right" = correctIndex === 0 ? "left" : "right";
      if (answer !== null && answer === currentQuestion.correctAnswer) {
        setCorrectCount((previous) => previous + 1);
        fire("correct", from);
      } else {
        fire("wrong", from);
      }
      setShowResult(true);
    },
    [currentQuestion, showResult, fire, answerOptions]
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
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat text-white">
      <DailyChallengeHeader
        onQuit={() => setShowQuitDialog(true)}
        currentIndex={currentQuestionIndex}
        total={session.questionCount}
        timeLeft={timeLeft}
      />

      {/* Content */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-4">
        {/* Question card */}
        <div
          className="flex items-center rounded-[24px] border border-white/10 bg-white/5 px-5 py-5 text-white backdrop-blur-sm sm:px-6 sm:py-6"
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(15px, 1.9vw, 26px)',
            minHeight: 'clamp(108px, 15vw, 176px)',
          }}
        >
          <p className="leading-snug">{currentQuestion.prompt}</p>
        </div>

        {/* Timeout-only inline note (correct/wrong use the fly-in splash). */}
        {showResult && resultTone === "timeout" && (
          <div
            className="mt-3 flex items-center justify-between gap-4 rounded-[16px] px-4 py-3"
            style={{
              ...poppins,
              fontSize: 'clamp(13px, 1.7vw, 20px)',
              backgroundColor: 'rgba(255,150,0,0.15)',
              border: '2px solid rgba(255,150,0,0.5)',
              color: '#FF9600',
            }}
          >
            <span>{t('dailyGames.timesUp')}</span>
            <span className="text-white/70" style={{ fontSize: 'clamp(11px, 1.4vw, 16px)' }}>
              {t('dailyGames.answerColon', { answer: currentQuestion.correctAnswer ? currentQuestion.trueLabel : currentQuestion.falseLabel })}
            </span>
          </div>
        )}

        {/* Answer buttons — 2 column grid matching ranked style */}
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {answerOptions.map((option) => {
            const isSelected = selectedAnswer === option.value;
            const shouldShowCorrect = showResult && option.value === currentQuestion.correctAnswer;
            const shouldShowWrong = showResult && isSelected && option.value !== currentQuestion.correctAnswer;

            return (
              <button
                key={String(option.value)}
                type="button"
                disabled={showResult}
                onClick={() => handleAnswer(option.value)}
                className="relative flex items-center justify-center overflow-hidden rounded-[16px] px-3 transition-shadow duration-150 h-[60px] sm:h-[78px] md:h-[94px]"
                style={{
                  ...poppins,
                  fontSize: 'clamp(14px, 2vw, 28px)',
                  textTransform: 'uppercase',
                  color: shouldShowWrong ? '#FB3101' : '#FFFFFF',
                  backgroundColor: shouldShowCorrect ? '#38B60E' : 'transparent',
                  border: shouldShowCorrect
                    ? 'none'
                    : shouldShowWrong
                      ? '2px solid #FB3101'
                      : '2px solid #FFE500',
                  boxShadow: shouldShowCorrect
                    ? '0 1.76px 6.334px 1.32px rgba(56,182,14,0.25)'
                    : shouldShowWrong
                      ? '0 1.76px 6.334px 1.32px rgba(251,49,1,0.25)'
                      : '0 0 6.334px 1.32px rgba(255,229,0,0.25)',
                  cursor: showResult ? 'default' : 'pointer',
                }}
              >
                <div className="flex items-center gap-3">
                  <span>{option.label}</span>
                  {showResult && shouldShowCorrect && <CheckCircle2 className="size-6" />}
                  {showResult && shouldShowWrong && <XCircle className="size-6" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Score */}
        <div className="mt-4 flex items-center justify-between text-sm" style={poppins}>
          <span className="text-white/55">{copy.correctAnswers}</span>
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
