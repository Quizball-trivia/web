"use client";

import { useCallback, useEffect, useState } from "react";

import { DailyAnswerInput } from "./components/DailyAnswerInput";
import type { CareerPathSession } from "@/lib/domain/dailyChallenge";
import { getDailyChallengeCopy } from "@/lib/i18n/dailyChallenge";
import { fuzzyMatchesAnswer } from "@/lib/answerMatching";
import { ArrowRight } from "lucide-react";
import { CareerChip } from "@/features/weekend-league/gauntlet/RoundViews";
import { QuitGameDialog } from "./QuitGameDialog";
import { DailyGameStage } from "./components/DailyGameStage";
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
  onComplete: (score: number, nextPath?: string) => void;
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
  // English names for crest lookup (the generated API type lags the backend field;
  // regen is not possible in this repo, so widen locally).
  const clubMatchNames = (currentQuestion as { clubMatchNames?: string[] } | undefined)?.clubMatchNames;

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

    const isCorrect = fuzzyMatchesAnswer(answer, currentQuestion.acceptedAnswers);

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
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat text-white">
      {/* Header + gameplay as one centred composition (shared daily stage). */}
      <DailyGameStage
        header={
          <DailyChallengeHeader
            onQuit={() => setShowQuitDialog(true)}
            currentIndex={currentQuestionIndex}
            total={session.questionCount}
            timeLeft={timeLeft}
            className="px-0 pt-0"
          />
        }
      >
        <div className="w-full">
        {/* Club path chips — the question itself (no separate prompt card). */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {currentQuestion.clubs.map((club, index) => (
            <div key={`${club}-${index}`} className="flex items-center gap-2.5">
              <CareerChip item={{ label: club, matchName: clubMatchNames?.[index] ?? club }} />
              {index < currentQuestion.clubs.length - 1 && (
                <ArrowRight className="size-4 shrink-0 text-brand-yellow" />
              )}
            </div>
          ))}
        </div>

        <DailyAnswerInput
          value={answer}
          onChange={setAnswer}
          onSubmit={submitAnswer}
          placeholder={copy.typePlayerName}
          submitLabel={copy.submit}
          disabled={resolved}
        />

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
      </DailyGameStage>

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
        onDone={(nextPath) => onComplete(correctCount, nextPath)}
      />
    </div>
  );
}
